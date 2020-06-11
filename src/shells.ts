import * as vscode from 'vscode';

export enum OS {
  WINDOWS,
  LINUX,
  MACOS,
  UNIXLIKE
}

enum OSShellKey {
  WINDOWS = 'windows',
  LINUX = 'linux',
  MACOS = 'osx'
}

// Default shells in vscode
const defaultShells = {
  windows: 'powershell.exe',
  linux: '$SHELL',
  osx: '$SHELL',
};

function getShell(os: OSShellKey) {

  const integratedShell = vscode.workspace.getConfiguration('terminal.integrated.shell');

  const shell = integratedShell?.get<string>(os);
  if (shell) {
    return shell;
  }

  return defaultShells[os];
}

export function shellScript(os: OS): string {
  if (os === OS.WINDOWS) {
    const windowsShell = getShell(OSShellKey.WINDOWS);
    return `if( get-command ${windowsShell} 2> \`$null ){${windowsShell}}`;
  }

  if (os === OS.LINUX) {
    const linuxShell = getShell(OSShellKey.LINUX);
    return `( if [[ -x $(command -v ${linuxShell}) ]]\\; then ${linuxShell}\\; else $SHELL\\; fi )`;
  }

  if (os === OS.MACOS) {
    const osxShell = getShell(OSShellKey.MACOS);
    return `( if [[ -x $(command -v ${osxShell}) ]]\\; then ${osxShell}\\; else $SHELL\\; fi )`;
  }

  if (os === OS.UNIXLIKE) {
    const linuxShell = shellScript(OS.LINUX);
    const osxShell = shellScript(OS.MACOS);

    return `if [[ "$(uname -s)" = "Darwin" ]]\\; then ${osxShell}\\; else ${linuxShell}\\; fi`;
  }

  return '';
}
