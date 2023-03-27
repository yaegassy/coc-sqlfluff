import {
  Diagnostic,
  DiagnosticCollection,
  DiagnosticSeverity,
  ExtensionContext,
  languages,
  OutputChannel,
  Position,
  Range,
  TextDocument,
  Uri,
  workspace,
} from 'coc.nvim';

import cp from 'child_process';

import { SUPPORT_LANGUAGES } from './constant';

interface SqlfluffDiagnostics {
  filepath: string;
  violations: SqlfluffDiagnosticsViolations[];
}

interface SqlfluffDiagnosticsViolations {
  code: string;
  line_no: number;
  line_pos: number;
  description: string;
}

export async function register(context: ExtensionContext, outputChannel: OutputChannel, sqlfluffPath: string) {
  const engine = new LintEngine(sqlfluffPath, outputChannel);

  const onOpen = workspace.getConfiguration('sqlfluff').get<boolean>('lintOnOpen');
  if (onOpen) {
    workspace.documents.map(async (doc) => {
      await engine.lint(doc.textDocument);
    });

    workspace.onDidOpenTextDocument(
      async (e) => {
        await engine.lint(e);
      },
      null,
      context.subscriptions
    );
  }

  const onChange = workspace.getConfiguration('sqlfluff').get<boolean>('lintOnChange');
  if (onChange) {
    workspace.onDidChangeTextDocument(
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      async (_e) => {
        const doc = await workspace.document;
        await engine.lint(doc.textDocument);
      },
      null,
      context.subscriptions
    );
  }

  const onSave = workspace.getConfiguration('sqlfluff').get<boolean>('lintOnSave');
  if (onSave) {
    workspace.onDidSaveTextDocument(
      async (e) => {
        await engine.lint(e);
      },
      null,
      context.subscriptions
    );
  }
}

export class LintEngine {
  private collection: DiagnosticCollection;
  private cmdPath: string;
  private outputChannel: OutputChannel;

  constructor(cmdPath: string, outputChannel: OutputChannel) {
    this.collection = languages.createDiagnosticCollection('sqlfluff');
    this.cmdPath = cmdPath;
    this.outputChannel = outputChannel;
  }

  public async lint(textDocument: TextDocument): Promise<void> {
    // Guard: Disable linting for unsupported languageId
    if (!SUPPORT_LANGUAGES.includes(textDocument.languageId)) return;

    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;
    const filePath = Uri.parse(textDocument.uri).fsPath;
    const args: string[] = [];
    const cwd = Uri.file(workspace.root).fsPath;
    // Use shell
    const opts = { cwd, shell: true };

    const extensionConfig = workspace.getConfiguration('sqlfluff');

    args.push('lint');
    args.push('--format', 'json');

    const ignoreParsing = extensionConfig.get<boolean>('linter.ignoreParsing', true);
    if (ignoreParsing) {
      args.push('--ignore', 'parsing');
    }

    const dialect = extensionConfig.get<string>('dialect', 'ansi');
    if (dialect) {
      args.push('--dialect', dialect);
    }

    args.push('-');

    this.outputChannel.appendLine(`${'#'.repeat(10)} sqlfluff lint\n`);
    this.outputChannel.appendLine(`Cwd: ${opts.cwd}`);
    this.outputChannel.appendLine(`File: ${filePath}`);
    this.outputChannel.appendLine(`Run: ${self.cmdPath} ${args.join(' ')}`);

    this.collection.clear();

    return new Promise(function (resolve) {
      const cps = cp.spawn(self.cmdPath, args, opts);
      cps.stdin.write(textDocument.getText());
      cps.stdin.end();

      let buffer = '';
      const onDataEvent = (data: Buffer) => {
        buffer += data.toString();
      };

      let sqlfluffDiagnostics: SqlfluffDiagnostics[];
      const onEndEvent = () => {
        self.outputChannel.appendLine(`Res: ${buffer}`);
        try {
          sqlfluffDiagnostics = JSON.parse(buffer);
        } catch (error) {
          self.outputChannel.appendLine(`Failed: JSON.parse failure`);
          return;
        }

        const diagnostics: Diagnostic[] = [];

        if (sqlfluffDiagnostics && sqlfluffDiagnostics.length > 0) {
          for (const d of sqlfluffDiagnostics) {
            for (const v of d.violations) {
              const lineNo = v.line_no === 0 ? v.line_no : v.line_no - 1;
              const linePos = v.line_pos === 0 ? v.line_pos : v.line_pos - 1;
              const startPosition = Position.create(lineNo, linePos);
              const endPosition = Position.create(lineNo, linePos);

              diagnostics.push({
                range: Range.create(startPosition, endPosition),
                severity: DiagnosticSeverity.Error,
                message: v.description,
                code: v.code,
                source: 'sqlfluff',
              });
            }
          }

          self.collection.set(textDocument.uri, diagnostics);
        } else {
          // MEMO: Dealing with cases where the diagnosis is 0 but the signature remains.
          self.collection.set(textDocument.uri, null);
        }
        resolve();
      };

      // If there is an stderr
      cps.stderr.on('data', (error) => {
        self.outputChannel.appendLine(`---- STDERR ----`);
        self.outputChannel.appendLine(`${error}`);
        self.outputChannel.appendLine(`---- /STDERR ----`);
      });

      cps.stdout.on('data', onDataEvent);
      cps.stdout.on('end', onEndEvent);

      resolve();
    });
  }
}
