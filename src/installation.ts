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

export async function detectInstallation(): Promise<IWTInstallation> {
  const config = vscode.workspace.getConfiguration('windowsTerminal');
  const channelConfig = config.get<Channel | 'auto'>('channel');
  if (channelConfig === undefined) {
    throw new Error('Could not detect installation');
  }

  let channel: Channel;
  if (channelConfig === 'auto') {
    const pathExists = await promisify(exists)(getExecutablePath('stable'));
    // return pathExists ? 'stable' : 'preview';
    channel = pathExists ? 'stable' : 'preview';
  } else {
    channel = channelConfig;
  }

  return {
    executablePath: getExecutablePath(channel),
    settingsPath: getSettingsPath(channel)
  };
}
