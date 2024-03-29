import { ExtensionContext, window } from 'coc.nvim';

import path from 'path';

import child_process from 'child_process';
import rimraf from 'rimraf';
import util from 'util';

import { SQLFLUFF_VERSION } from './constant';

const exec = util.promisify(child_process.exec);

export async function sqlfluffInstall(pythonCommand: string, context: ExtensionContext): Promise<void> {
  const pathVenv = path.join(context.storagePath, 'sqlfluff', 'venv');

  let pathVenvPython = path.join(context.storagePath, 'sqlfluff', 'venv', 'bin', 'python');
  if (process.platform === 'win32') {
    pathVenvPython = path.join(context.storagePath, 'sqlfluff', 'venv', 'Scripts', 'python');
  }

  const statusItem = window.createStatusBarItem(0, { progress: true });
  statusItem.text = `Install sqlfluff...`;
  statusItem.show();

  const installCmd =
    `"${pythonCommand}" -m venv ${pathVenv} && ` +
    `${pathVenvPython} -m pip install -U pip sqlfluff==${SQLFLUFF_VERSION}`;

  rimraf.sync(pathVenv);
  try {
    window.showInformationMessage(`Install sqlfluff...`);
    await exec(installCmd);
    statusItem.hide();
    window.showInformationMessage(`sqlfluff: installed!`);
  } catch (error) {
    statusItem.hide();
    window.showErrorMessage(`sqlfluff: install failed. | ${error}`);
    throw new Error();
  }
}

export async function installWrapper(pythonCommand: string, context: ExtensionContext) {
  const msg = 'Install/Upgrade "sqlfluff"?';
  const ret = await window.showPrompt(msg);
  if (ret) {
    try {
      await sqlfluffInstall(pythonCommand, context);
    } catch (e) {
      return;
    }
  } else {
    return;
  }
}
