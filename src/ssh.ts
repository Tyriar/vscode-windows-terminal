import { readFile, exists } from 'fs';
import * as vscode from 'vscode';
import { promisify } from 'util';
const sshConfig = require('ssh-config');

interface IParam {
  param: string;
  value: string;
  config: IParam[];
}

export async function resolveSSHHostName(host: string): Promise<string> {
  // get path from remote-ssh-extension config file
  const remoteSettingsPath: string | undefined = vscode.workspace
    .getConfiguration('remote.SSH')
    .get('configFile');

  if (!remoteSettingsPath) {
    return host;
  }

  const pathExists = await promisify(exists)(remoteSettingsPath);
  if (!pathExists) {
    throw Error('Expected remote ssh settings file does not exist: ' + remoteSettingsPath);
  }

  const rawString = (await promisify(readFile)(remoteSettingsPath))?.toString();
  if (!rawString) {
    throw Error('Could not read remote ssh settings file');
  }

  // parse content
  const config: IParam[] = sshConfig.parse(rawString);
  const settings = config.find((x) => x.param.toLowerCase() === 'host' && x.value === host);

  let resolvedHost = '';
  if (settings) {
    const hostname = settings.config.find((x) => x.param.toLowerCase() === 'hostname');
    if (hostname && hostname.value) {
      resolvedHost += `${hostname.value}`;
    }
    const user = settings.config.find((x) => x.param.toLowerCase() === 'user');
    if (user && user.value && hostname?.value) {
      resolvedHost = `${user.value}@` + resolvedHost;
    }
  }

  if (resolvedHost === '') {
    resolvedHost = host;
  }

  return resolvedHost;
}
