import { ExtensionContext, window, workspace } from 'coc.nvim';

import fs from 'fs';

import { installWrapper } from './installer';
import { getPythonPath, getSqlfluffPath, getToolVersion } from './tool';

import * as ignoreCommentCodeActionFeature from './actions/ignoreComment';
import * as showWebDocumentationCodeActionFeature from './actions/showWebDocumentation';
import * as fixCommandFeature from './commands/fix';
import * as formatCommandFeature from './commands/format';
import * as installCommandFeature from './commands/install';
import * as showOutputCommandFeature from './commands/showOutput';
import * as documentFormattingEditFeature from './documentFormattingEdit';
import * as lintingFeature from './lint';

export async function activate(context: ExtensionContext): Promise<void> {
  if (!workspace.getConfiguration('sqlfluff').get('enable')) return;

  const extensionStoragePath = context.storagePath;
  if (!fs.existsSync(extensionStoragePath)) {
    fs.mkdirSync(extensionStoragePath);
  }

  const outputChannel = window.createOutputChannel('sqlfluff');
  showOutputCommandFeature.register(context, outputChannel);

  const pythonCommand = getPythonPath();
  installCommandFeature.register(pythonCommand, context);

  let sqlfluffPath = getSqlfluffPath(context);

  // Install "sqlfluff" if it does not exist.
  if (!sqlfluffPath) {
    if (pythonCommand) {
      await installWrapper(pythonCommand, context);
    } else {
      window.showErrorMessage('python3/python command not found');
    }

    sqlfluffPath = getSqlfluffPath(context);
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

  const sqlfluffVersion = await getToolVersion(sqlfluffPath);

  lintingFeature.register(context, outputChannel, sqlfluffPath);
  documentFormattingEditFeature.register(context, outputChannel);
  fixCommandFeature.register(context, outputChannel);
  formatCommandFeature.register(context, outputChannel, sqlfluffVersion);
  ignoreCommentCodeActionFeature.register(context, outputChannel);
  showWebDocumentationCodeActionFeature.register(context, outputChannel);
}
