import * as vscode from 'vscode';

export enum OS {
  WINDOWS = 1,
  LINUX = 2
}

const windowsDefaultShell = 'powershell.exe';
const linuxDefaultShell = '/bin/bash';


export function getShell(os: OS) {
  const integratedShell = vscode.workspace.getConfiguration('terminal.integrated.shell');

  if (os === OS.WINDOWS) {
    const windowsShell = integratedShell?.get<string>('windows');
    if (windowsShell) {
      return windowsShell;
    }
    return windowsDefaultShell;
  }

  if (os === OS.LINUX) {
    const linuxShell = integratedShell?.get<string>('linux');
    if (linuxShell) {
      return linuxShell;
    }
    return linuxDefaultShell;
  }
}
