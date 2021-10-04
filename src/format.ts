import {
  DocumentFormattingEditProvider,
  ExtensionContext,
  OutputChannel,
  Range,
  TextDocument,
  TextEdit,
  Uri,
  workspace,
} from 'coc.nvim';

import cp from 'child_process';
import fs from 'fs';
import path from 'path';

import { SUPPORT_LANGUAGES } from './constant';

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

  let toolPath = extensionConfig.get('sqlfluff.commandPath', '');
  if (!toolPath) {
    if (
      fs.existsSync(path.join(context.storagePath, 'sqlfluff', 'venv', 'Scripts', 'sqlfluff.exe')) ||
      fs.existsSync(path.join(context.storagePath, 'sqlfluff', 'venv', 'bin', 'sqlfluff'))
    ) {
      if (process.platform === 'win32') {
        toolPath = path.join(context.storagePath, 'sqlfluff', 'venv', 'Scripts', 'sqlfluff.exe');
      } else {
        toolPath = path.join(context.storagePath, 'sqlfluff', 'venv', 'bin', 'sqlfluff');
      }
    } else {
      throw 'Unable to find the sqlfluff command.';
    }
  }

  const fileName = Uri.parse(document.uri).fsPath;
  const originalText = document.getText(range);

  const args: string[] = [];
  const opts = { cwd: path.dirname(fileName) };

  args.push('fix');
  args.push('--force');
  args.push('-');

  // ---- Output the command to be executed to channel log. ----
  outputChannel.appendLine(`${'#'.repeat(10)} sqlfluff fix\n`);
  outputChannel.appendLine(`Cwd: ${opts.cwd}`);
  outputChannel.appendLine(`File: ${fileName}`);
  outputChannel.appendLine(`Run: ${toolPath} ${args.join(' ')}`);

  return new Promise((resolve) => {
    let newText = '';
    const cps = cp.spawn(toolPath, args, opts);

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

        // rollback
        resolve(originalText);
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

export function fullDocumentRange(document: TextDocument): Range {
  const lastLineId = document.lineCount - 1;
  const doc = workspace.getDocument(document.uri);

  return Range.create({ character: 0, line: 0 }, { character: doc.getline(lastLineId).length, line: lastLineId });
}

class SqlfluffFormattingEditProvider implements DocumentFormattingEditProvider {
  public _context: ExtensionContext;
  public _outputChannel: OutputChannel;

  constructor(context: ExtensionContext, outputChannel: OutputChannel) {
    this._context = context;
    this._outputChannel = outputChannel;
  }

  public provideDocumentFormattingEdits(document: TextDocument): Promise<TextEdit[]> {
    return this._provideEdits(document, undefined);
  }

  private async _provideEdits(document: TextDocument, range?: Range): Promise<TextEdit[]> {
    const code = await doFormat(this._context, this._outputChannel, document, range);
    if (!range) {
      range = fullDocumentRange(document);
    }
    return [TextEdit.replace(range, code)];
  }
}

export default SqlfluffFormattingEditProvider;
