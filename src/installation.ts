import * as vscode from 'vscode';
import { join } from 'path';
import { Channel, IWTInstallation } from './interfaces';
import { promisify } from 'util';
import { exists } from 'fs';

export function getExecutablePath(channel: Channel): string {
  return join(`${getLocalAppDataDir()}/Microsoft/WindowsApps/${getChannelAppId(channel)}/wt.exe`);
}

export function getSettingsPath(channel: Channel): string {
  return join(`${getLocalAppDataDir()}/Packages/${getChannelAppId(channel)}/LocalState/settings.json`);
}

function getLocalAppDataDir(): string {
  const localAppDataDir = process.env.LOCALAPPDATA;
  if (!localAppDataDir) {
    throw Error('Environment variable LOCALAPPDATA is not set');
  }
  return localAppDataDir;
}

function getChannelAppId(channel: Channel): string {
  if (channel === 'preview') {
    return 'Microsoft.WindowsTerminalPreview_8wekyb3d8bbwe';
  }
  return 'Microsoft.WindowsTerminal_8wekyb3d8bbwe';
}

export async function detectInstallation(): Promise<IWTInstallation | undefined> {
  const config = vscode.workspace.getConfiguration('windowsTerminal');
  const channelConfig = config.get<Channel | 'auto'>('channel') || 'auto';

  let channel: Channel;
  if (channelConfig === 'auto') {
    const pathExists = await promisify(exists)(getExecutablePath('stable'));
    channel = 'stable';
    if (!pathExists) {
      // Switch to preview only if it exists, we want the stable store page to open if not
      const previewExists = await promisify(exists)(getExecutablePath('preview'));
      if (previewExists) {
        channel = 'preview';
      }
    }
  } else {
    channel = channelConfig;
  }

  const installation: IWTInstallation = {
    executablePath: getExecutablePath(channel),
    settingsPath: getSettingsPath(channel)
  };

  const exeExists = await promisify(exists)(installation.executablePath);
  if (!exeExists) {
    const selection = await vscode.window.showErrorMessage('Could not detect Windows Terminal installation', 'Open Microsoft Store');
    if (selection === 'Open Microsoft Store') {
      const url = channel === 'stable'
        ? 'https://www.microsoft.com/en-us/p/windows-terminal/9n0dx20hk701'
        : 'https://www.microsoft.com/en-us/p/windows-terminal-preview/9n8g5rfz9xk3';
      await vscode.env.openExternal(vscode.Uri.parse(url));
    }
    return undefined;
  }

  return installation;
}
