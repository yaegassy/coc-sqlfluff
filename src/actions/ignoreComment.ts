import {
  CodeAction,
  CodeActionContext,
  CodeActionProvider,
  ExtensionContext,
  languages,
  OutputChannel,
  Range,
  TextDocument,
  TextEdit,
  workspace,
} from 'coc.nvim';

import { documentSelector } from '../constant';

export function register(context: ExtensionContext, outputChannel: OutputChannel) {
  context.subscriptions.push(
    languages.registerCodeActionProvider(
      documentSelector,
      new IgnoreCommentCodeActionProvider(outputChannel),
      'sqlfluff'
    )
  );
}

export class IgnoreCommentCodeActionProvider implements CodeActionProvider {
  private readonly source = 'sqlfluff';
  private diagnosticCollection = languages.createDiagnosticCollection(this.source);
  private outputChannel: OutputChannel;

  constructor(outputChannel: OutputChannel) {
    this.outputChannel = outputChannel;
  }

  public async provideCodeActions(document: TextDocument, range: Range, context: CodeActionContext) {
    const doc = workspace.getDocument(document.uri);
    const wholeRange = Range.create(0, 0, doc.lineCount, 0);
    let whole = false;
    if (
      range.start.line === wholeRange.start.line &&
      range.start.character === wholeRange.start.character &&
      range.end.line === wholeRange.end.line &&
      range.end.character === wholeRange.end.character
    ) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      whole = true;
    }
    const codeActions: CodeAction[] = [];

    /** Ignoring Errors for current line */
    if (this.lineRange(range) && context.diagnostics.length > 0) {
      const line = doc.getline(range.start.line);
      this.outputChannel.append(line);
      if (line && line.length && !line.startsWith('--')) {
        const edit = TextEdit.replace(range, `${line} -- noqa${range.start.line + 1 === range.end.line ? '\n' : ''}`);
        codeActions.push({
          title: 'Ignoring Errors for current line (-- noqa)',
          edit: {
            changes: {
              [doc.uri]: [edit],
            },
          },
        });

        const disableAllEdit = TextEdit.replace(
          range,
          `${line} -- noqa: disable=all${range.start.line + 1 === range.end.line ? '\n' : ''}`
        );
        codeActions.push({
          title: 'Ignoring Errors for current line (-- noqa: disable=all)',
          edit: {
            changes: {
              [doc.uri]: [disableAllEdit],
            },
          },
        });

        const enableAllEdit = TextEdit.replace(
          range,
          `${line} -- noqa: enable=all${range.start.line + 1 === range.end.line ? '\n' : ''}`
        );

        codeActions.push({
          title: 'Ignoring Errors for current line (-- noqa: enable=all)',
          edit: {
            changes: {
              [doc.uri]: [enableAllEdit],
            },
          },
        });
      }
    }

    return codeActions;
  }

  private lineRange(r: Range): boolean {
    return (
      (r.start.line + 1 === r.end.line && r.start.character === 0 && r.end.character === 0) ||
      (r.start.line === r.end.line && r.start.character === 0)
    );
  }
}
