import {
  TextDocument,
  CodeAction,
  CodeActionContext,
  CodeActionProvider,
  languages,
  OutputChannel,
  Range,
  TextEdit,
  workspace,
} from 'coc.nvim';

export class SqlfluffCodeActionProvider implements CodeActionProvider {
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
    if (range.start.line === range.end.line && range.start.character === 0 && context.diagnostics.length > 0) {
      const line = doc.getline(range.start.line);
      if (line && !line.startsWith('--') && line.length === range.end.character) {
        const edit = TextEdit.replace(range, line + ' -- noqa');
        codeActions.push({
          title: 'Ignoring Errors for current line (-- noqa)',
          edit: {
            changes: {
              [doc.uri]: [edit],
            },
          },
        });

        const disableAllEdit = TextEdit.replace(range, line + ' -- noqa: disable=all');
        codeActions.push({
          title: 'Ignoring Errors for current line (-- noqa: disable=all)',
          edit: {
            changes: {
              [doc.uri]: [disableAllEdit],
            },
          },
        });

        const enableAllEdit = TextEdit.replace(range, line + ' -- noqa: enable=all');
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
}
