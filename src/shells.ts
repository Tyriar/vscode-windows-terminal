import * as vscode from 'vscode';

// eslint-disable-next-line @typescript-eslint/naming-convention
type systems = 'windows' | 'linux' | 'osx' | 'linuxbase';

// Default shells in vscode
const defaultShells = {
  windows: 'powershell.exe',
  linux: '$SHELL',
  osx: '$SHELL'
};

function getShell(os: Exclude<systems, 'linuxbase'>) {

  const integratedShell = vscode.workspace.getConfiguration('terminal.integrated.shell');

  const shell = integratedShell?.get<string>(os);
  if (shell) {
    return shell;
  }

  return defaultShells[os];
}

export function shellScript(os: Exclude<systems, 'osx'>) {
  if (os === 'windows') {
    return `${getShell('windows')}`;
  }

  if (os === 'linux') {
    return `${getShell('linux')} || exec $SHELL -l`;
  }

  if (os === 'linuxbase') {
    return `if [[ "$(uname -s)" = "Darwin" ]]\\; then ${getShell('osx')}\\; else ${getShell('linux')}\\; fi || exec $SHELL -l`;
  }

  return '';
}
