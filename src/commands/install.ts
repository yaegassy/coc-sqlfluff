import { commands, ExtensionContext } from 'coc.nvim';
import { installWrapper } from '../installer';

export async function register(pythonCommand: string, context: ExtensionContext) {
  context.subscriptions.push(
    commands.registerCommand('sqlfluff.install', async () => {
      await installWrapper(pythonCommand, context);
    })
  );
}
