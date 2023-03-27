import {
  Disposable,
  DocumentFormattingEditProvider,
  ExtensionContext,
  languages,
  OutputChannel,
  Range,
  TextDocument,
  TextEdit,
  workspace,
} from 'coc.nvim';

import { doFormat } from './commands/fix';
import { fullDocumentRange } from './common';
import { documentSelector } from './constant';

let formatterHandler: undefined | Disposable;

function disposeHandlers(): void {
  if (formatterHandler) {
    formatterHandler.dispose();
  }
  formatterHandler = undefined;
}

export function register(context: ExtensionContext, outputChannel: OutputChannel) {
  const editProvider = new SqlfluffFormattingEditProvider(context, outputChannel);
  const priority = 1;

  function registerFormatter(): void {
    disposeHandlers();

    formatterHandler = languages.registerDocumentFormatProvider(documentSelector, editProvider, priority);
  }

  const isFormatEnable = workspace.getConfiguration('sqlfluff').get<boolean>('formatEnable');
  if (isFormatEnable) {
    registerFormatter();
  }
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
