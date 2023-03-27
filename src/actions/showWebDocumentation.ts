import {
  CodeAction,
  CodeActionContext,
  CodeActionProvider,
  ExtensionContext,
  languages,
  OutputChannel,
  Range,
  TextDocument,
  workspace,
} from 'coc.nvim';

import { documentSelector } from '../constant';

type SqlfluffWebDocuments = {
  code: string | number;
  url: string;
};

export function register(context: ExtensionContext, outputChannel: OutputChannel) {
  context.subscriptions.push(
    languages.registerCodeActionProvider(
      documentSelector,
      new ShowWebDocumentationCodeActionProvider(outputChannel),
      'sqlfluff'
    )
  );
}

class ShowWebDocumentationCodeActionProvider implements CodeActionProvider {
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

    /** Show web documentation for [ruleId] */
    if (this.lineRange(range) && context.diagnostics.length > 0) {
      const line = doc.getline(range.start.line);
      if (line && line.length) {
        let existsSqlfluffDiagnostics = false;

        const sqlfluffWebDocuments: SqlfluffWebDocuments[] = [];
        context.diagnostics.forEach((d) => {
          if (d.source === 'sqlfluff') {
            console.log(JSON.stringify(d, null, 2));
            existsSqlfluffDiagnostics = true;

            if (d.code) {
              const url = `https://docs.sqlfluff.com/en/stable/rules.html#sqlfluff.rules.sphinx.Rule_${d.code}`;
              sqlfluffWebDocuments.push({
                code: d.code,
                url: url,
              });
            }
          }
        });

        if (existsSqlfluffDiagnostics) {
          sqlfluffWebDocuments.forEach((r) => {
            const title = `Show web documentation for ${r.code}`;

            const command = {
              title: '',
              command: 'vscode.open',
              arguments: [r.url],
            };

            const action: CodeAction = {
              title,
              command,
            };

            codeActions.push(action);
          });
        }
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
