import {
  commands,
  Disposable,
  DocumentSelector,
  ExtensionContext,
  languages,
  TextEdit,
  window,
  workspace,
  WorkspaceConfiguration,
} from 'coc.nvim';

import fs from 'fs';
import path from 'path';

import which from 'which';

import { sqlfluffInstall } from './installer';
import { LintEngine } from './lint';
import SqlfluffFormattingEditProvider, { doFormat, fullDocumentRange } from './format';
import { SqlfluffCodeActionProvider } from './action';

let formatterHandler: undefined | Disposable;

function disposeHandlers(): void {
  if (formatterHandler) {
    formatterHandler.dispose();
  }
  formatterHandler = undefined;
}

export async function activate(context: ExtensionContext): Promise<void> {
  const { subscriptions } = context;

  const extensionConfig = workspace.getConfiguration('sqlfluff');
  const isEnable = extensionConfig.enable;
  if (!isEnable) return;

  const extensionStoragePath = context.storagePath;
  if (!fs.existsSync(extensionStoragePath)) {
    fs.mkdirSync(extensionStoragePath);
  }

  const outputChannel = window.createOutputChannel('sqlfluff');

  const pythonCommand = getPythonPath(extensionConfig);

  subscriptions.push(
    commands.registerCommand('sqlfluff.install', async () => {
      await installWrapper(pythonCommand, context);
    })
  );

  // MEMO: Priority to detect sqlfluff
  //
  // 1. sqlfluff.commandPath setting
  // 2. PATH environment (e.g. system global PATH or venv, etc ...)
  // 3. extension venv (buit-in)
  let sqlfluffPath = extensionConfig.get('commandPath', '');
  if (!sqlfluffPath) {
    const whichSqlfluff = whichCmd('sqlfluff');
    if (whichSqlfluff) {
      sqlfluffPath = whichSqlfluff;
    } else if (
      fs.existsSync(path.join(context.storagePath, 'sqlfluff', 'venv', 'Scripts', 'sqlfluff.exe')) ||
      fs.existsSync(path.join(context.storagePath, 'sqlfluff', 'venv', 'bin', 'sqlfluff'))
    ) {
      if (process.platform === 'win32') {
        sqlfluffPath = path.join(context.storagePath, 'sqlfluff', 'venv', 'Scripts', 'sqlfluff.exe');
      } else {
        sqlfluffPath = path.join(context.storagePath, 'sqlfluff', 'venv', 'bin', 'sqlfluff');
      }
    }
  }

  // Install "sqlfluff" if it does not exist.
  if (!sqlfluffPath) {
    if (pythonCommand) {
      await installWrapper(pythonCommand, context);
    } else {
      window.showErrorMessage('python3/python command not found');
    }

    if (
      fs.existsSync(path.join(context.storagePath, 'sqlfluff', 'venv', 'Scripts', 'sqlfluff.exe')) ||
      fs.existsSync(path.join(context.storagePath, 'sqlfluff', 'venv', 'bin', 'sqlfluff'))
    ) {
      if (process.platform === 'win32') {
        sqlfluffPath = path.join(context.storagePath, 'sqlfluff', 'venv', 'Scripts', 'sqlfluff.exe');
      } else {
        sqlfluffPath = path.join(context.storagePath, 'sqlfluff', 'venv', 'bin', 'sqlfluff');
      }
    }
  }

  // If "sqlfluff" does not exist completely, terminate the process.
  // ----
  // If you cancel the installation.
  if (!sqlfluffPath) {
    setTimeout(() => {
      window.showErrorMessage('Exit, because "sqlfluff" does not exist.');
    }, 500);
    return;
  }

  const engine = new LintEngine(sqlfluffPath, outputChannel);

  const onOpen = extensionConfig.get<boolean>('lintOnOpen');
  if (onOpen) {
    workspace.documents.map(async (doc) => {
      await engine.lint(doc.textDocument);
    });

    workspace.onDidOpenTextDocument(
      async (e) => {
        await engine.lint(e);
      },
      null,
      subscriptions
    );
  }

  const onChange = extensionConfig.get<boolean>('lintOnChange');
  if (onChange) {
    workspace.onDidChangeTextDocument(
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      async (_e) => {
        const doc = await workspace.document;
        await engine.lint(doc.textDocument);
      },
      null,
      subscriptions
    );
  }

  const onSave = extensionConfig.get<boolean>('lintOnSave');
  if (onSave) {
    workspace.onDidSaveTextDocument(
      async (e) => {
        await engine.lint(e);
      },
      null,
      subscriptions
    );
  }

  const editProvider = new SqlfluffFormattingEditProvider(context, outputChannel);
  const priority = 1;
  const languageSelector: DocumentSelector = [
    { language: 'sql', scheme: 'file' },
    { language: 'jinja-sql', scheme: 'file' },
  ];

  function registerFormatter(): void {
    disposeHandlers();

    formatterHandler = languages.registerDocumentFormatProvider(languageSelector, editProvider, priority);
  }

  const isFormatEnable = extensionConfig.get<boolean>('formatEnable');
  if (isFormatEnable) {
    registerFormatter();
  }

  context.subscriptions.push(
    commands.registerCommand('sqlfluff.fix', async () => {
      const doc = await workspace.document;

      const code = await doFormat(context, outputChannel, doc.textDocument, undefined);
      const edits = [TextEdit.replace(fullDocumentRange(doc.textDocument), code)];
      if (edits) {
        await doc.applyEdits(edits);
      }
    })
  );

  const actionProvider = new SqlfluffCodeActionProvider(outputChannel);
  context.subscriptions.push(languages.registerCodeActionProvider(languageSelector, actionProvider, 'sqlfluff'));
}

async function installWrapper(pythonCommand: string, context: ExtensionContext) {
  const msg = 'Install/Upgrade "sqlfluff"?';
  context.workspaceState;

  let ret = 0;
  ret = await window.showQuickpick(['Yes', 'Cancel'], msg);
  if (ret === 0) {
    try {
      await sqlfluffInstall(pythonCommand, context);
    } catch (e) {
      return;
    }
  } else {
    return;
  }
}

function whichCmd(cmd: string): string {
  try {
    return which.sync(cmd);
  } catch (error) {
    return '';
  }
}

function getPythonPath(config: WorkspaceConfiguration): string {
  let pythonPath = config.get<string>('builtin.pythonPath', '');
  if (pythonPath) {
    return pythonPath;
  }

  try {
    which.sync('python3');
    pythonPath = 'python3';
    return pythonPath;
  } catch (e) {
    // noop
  }

  try {
    which.sync('python');
    pythonPath = 'python';
    return pythonPath;
  } catch (e) {
    // noop
  }

  return pythonPath;
}
