import { ExtensionContext, workspace } from 'coc.nvim';

import child_process from 'child_process';
import fs from 'fs';
import path from 'path';
import util from 'util';

import semver from 'semver';
import which from 'which';

const exec = util.promisify(child_process.exec);

export function getPythonPath(): string {
  let pythonPath = workspace.getConfiguration('sqlfluff').get<string>('builtin.pythonPath', '');

  if (pythonPath) {
    return pythonPath;
  }

  pythonPath = which.sync('python3', { nothrow: true }) || '';
  if (pythonPath) {
    pythonPath = fs.realpathSync(pythonPath);
    return pythonPath;
  }

  pythonPath = which.sync('python', { nothrow: true }) || '';
  if (pythonPath) {
    pythonPath = fs.realpathSync(pythonPath);
    return pythonPath;
  }

  return pythonPath;
}

export async function getToolVersion(command: string): Promise<string | undefined> {
  const versionCmd = `${command} --version`;
  let cmdRes = '';
  try {
    await exec(versionCmd).then((value) => {
      cmdRes = value.stdout.trim();
    });

    if (semver.valid(semver.coerce(cmdRes))) {
      const version = semver.coerce(cmdRes)?.version;
      return version;
    }
  } catch (error) {
    return undefined;
  }
}

export function getSqlfluffPath(context: ExtensionContext) {
  // MEMO: Priority to detect sqlfluff
  //
  // 1. sqlfluff.commandPath setting
  // 2. PATH environment (e.g. system global PATH or venv, etc ...)
  // 3. extension venv (buit-in)

  // 1
  let sqlfluffPath = workspace.getConfiguration('sqlfluff').get('commandPath', '');
  if (!sqlfluffPath) {
    // 2
    sqlfluffPath = which.sync('sqlfluff', { nothrow: true }) || '';
    if (!sqlfluffPath) {
      if (
        fs.existsSync(path.join(context.storagePath, 'sqlfluff', 'venv', 'Scripts', 'sqlfluff.exe')) ||
        fs.existsSync(path.join(context.storagePath, 'sqlfluff', 'venv', 'bin', 'sqlfluff'))
      ) {
        // 3
        if (process.platform === 'win32') {
          sqlfluffPath = path.join(context.storagePath, 'sqlfluff', 'venv', 'Scripts', 'sqlfluff.exe');
        } else {
          sqlfluffPath = path.join(context.storagePath, 'sqlfluff', 'venv', 'bin', 'sqlfluff');
        }
      }
    }
  }

  return sqlfluffPath;
}
