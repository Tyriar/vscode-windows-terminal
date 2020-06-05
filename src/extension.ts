import * as vscode from 'vscode';
import { getSettingsContents } from './settings';
import { spawn } from 'child_process';
import { convertWslPathToWindows } from './wsl';
import { stat } from 'fs';
import { promisify } from 'util';
import { dirname } from 'path';
import { detectInstallation } from './installation';
import { IWTProfile } from './interfaces';

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(vscode.commands.registerCommand('vscode-windows-terminal.openWithProfile', e => openWithProfile(e)));
}

export function deactivate() { }

async function openWithProfile(uri?: vscode.Uri) {
  try {
    const installation = await detectInstallation();
    const settings = await getSettingsContents(installation.settingsPath);
    const quickPickItems: (vscode.QuickPickItem & { profile: IWTProfile })[] = settings.profiles.list.map(profile => {
      const isDefault = profile.guid === settings.defaultProfile;
      return {
        label: profile.name,
        description: (profile.commandline || profile.source || '') + (isDefault ? ' (Default)' : ''),
        profile
      };
    });

    const item = await vscode.window.showQuickPick(quickPickItems);
    if (!item) {
      return;
    }

    const args = ['-p', item.profile.name];
    if (uri) {
      let cwd = uri.fsPath;
      if (uri.authority) {
        if (uri.authority.startsWith('wsl+')) {
          const distro = uri.authority.split('+')[1];
          cwd = await convertWslPathToWindows(uri.path, distro);
        } else {
          throw new Error(`Unsupported authority "${uri.authority}`);
        }
      }
      if (await isFile(cwd)) {
        cwd = dirname(cwd);
      }
      args.push('-d', cwd);
    }

    spawn(installation.executablePath, args, { detached: true });
  } catch (ex) {
    return vscode.window.showErrorMessage(`Could not launch Windows Terminal:\n\n${ex.message}`);
  }
}

async function isFile(path: string): Promise<boolean> {
  const result = await promisify(stat)(path);
  return !result.isDirectory();
}
