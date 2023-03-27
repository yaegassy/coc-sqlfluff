import {
  commands,
  ExtensionContext,
  OutputChannel,
  Range,
  TextDocument,
  TextEdit,
  Uri,
  window,
  workspace,
} from 'coc.nvim';

import cp from 'child_process';
import path from 'path';

import { fullDocumentRange } from '../common';
import { SUPPORT_LANGUAGES } from '../constant';
import { getSqlfluffPath } from '../tool';

export async function register(context: ExtensionContext, outputChannel: OutputChannel) {
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
}

export async function doFormat(
  context: ExtensionContext,
  outputChannel: OutputChannel,
  document: TextDocument,
  range?: Range
): Promise<string> {
  if (!SUPPORT_LANGUAGES.includes(document.languageId)) {
    throw '"sqlfluff fix" cannot run, not supported language';
  }

  const extensionConfig = workspace.getConfiguration('sqlfluff');

  const sqlfluffPath = getSqlfluffPath(context);
  if (!sqlfluffPath) {
    throw 'Unable to find the sqlfluff command.';
  }

  const fileName = Uri.parse(document.uri).fsPath;
  const originalText = document.getText(range);

  const args: string[] = [];
  const opts = { cwd: path.dirname(fileName) };

  args.push('fix');
  args.push('--force');

  const dialect = extensionConfig.get<string>('dialect', 'ansi');
  if (dialect) {
    args.push('--dialect', dialect);
  }

  args.push('-');

  // ---- Output the command to be executed to channel log. ----
  outputChannel.appendLine(`${'#'.repeat(10)} sqlfluff fix\n`);
  outputChannel.appendLine(`Cwd: ${opts.cwd}`);
  outputChannel.appendLine(`File: ${fileName}`);
  outputChannel.appendLine(`Run: ${sqlfluffPath} ${args.join(' ')}`);

  return new Promise((resolve) => {
    let newText = '';
    const cps = cp.spawn(sqlfluffPath, args, opts);

    cps.on('error', (err: Error) => {
      outputChannel.appendLine(`\n==== ERROR ===\n`);
      outputChannel.appendLine(`${err}`);
      return;
    });

    if (cps.pid) {
      cps.stdin.write(originalText);
      cps.stdin.end();

      cps.stderr.on('data', (data: Buffer) => {
        outputChannel.appendLine(`\n==== STDERR ===\n`);
        outputChannel.appendLine(`${data}`);

        let existsAllowedWarning = false;
        if (data.toString().match(/Unfixable violations detected/)) {
          existsAllowedWarning = true;
          if (!extensionConfig.get<boolean>('formatIgnoreStderrAlert')) {
            window.showWarningMessage(`sqlfluff: ${JSON.stringify(data.toString().trim())}`);
          }
        }

        if (!existsAllowedWarning) {
          // rollback
          resolve(originalText);
        }
      });

      cps.stdout.on('data', (data: Buffer) => {
        outputChannel.appendLine(`\n==== STDOUT (data) ===\n`);
        outputChannel.appendLine(`${data}`);

        // **MEMO**:
        // Bug in sqlfluff? WARNING messege is also output to "stdout".
        // I think it should be output to "stderr", Reported to sqlfluff issue.
        // ----
        // Temporary patch
        if (data.toString().startsWith('WARNING')) {
          // rollback
          resolve(originalText);
        }

        newText = newText + data.toString();
      });

      cps.stdout.on('close', () => {
        outputChannel.appendLine(`\n==== STDOUT (close) ===\n`);
        outputChannel.appendLine(`${newText}`);
        // auto-fixed
        resolve(newText);
      });
    }
  });
}
