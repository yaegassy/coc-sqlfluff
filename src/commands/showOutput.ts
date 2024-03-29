import { commands, ExtensionContext, OutputChannel } from 'coc.nvim';

export async function register(context: ExtensionContext, outputChannel: OutputChannel) {
  context.subscriptions.push(
    commands.registerCommand('sqlfluff.showOutput', () => {
      if (outputChannel) {
        outputChannel.show();
      }
    })
  );
}
