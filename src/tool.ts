import child_process from 'child_process';
import util from 'util';
import semver from 'semver';

const exec = util.promisify(child_process.exec);

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
