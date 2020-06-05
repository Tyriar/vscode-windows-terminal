import * as vscode from 'vscode';
import { getSettingsContents } from './settings';
import { spawn } from 'child_process';
import { convertWslPathToWindows } from './wsl';
import { stat } from 'fs';
import { promisify } from 'util';
import { dirname } from 'path';
import { detectInstallation } from './installation';
import { IWTProfile, IWTInstallation } from './interfaces';

let installation: IWTInstallation;

export async function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(vscode.commands.registerCommand('windows-terminal.open', () => openWithDefaultProfile()));
  context.subscriptions.push(vscode.commands.registerCommand('windows-terminal.openWithProfile', () => openWithProfile()));
  context.subscriptions.push(vscode.commands.registerCommand('windows-terminal.openWithProfileExplorer', e => openWithProfile(e)));
  context.subscriptions.push(vscode.commands.registerCommand('windows-terminal.openActiveFilesFolder', () => openActiveFilesFolderWithDefaultProfile()));
  context.subscriptions.push(vscode.commands.registerCommand('windows-terminal.openActiveFilesFolderWithProfile', e => openActiveFilesFolderWithProfile()));

  installation = await detectInstallation();
  vscode.workspace.onDidChangeConfiguration(async e => {
    if (e.affectsConfiguration('windowsTerminal')) {
      installation = await detectInstallation();
    }
  });
}

export function deactivate() { }

async function openWindowsTerminal(profile: IWTProfile, uri?: vscode.Uri) {
  const args = ['-p', profile.name];

  // If there is no URI, set it to the first workspace folder
  if (!uri) {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (workspaceFolders) {
      uri = workspaceFolders[0]?.uri;
    }
  }

  // If there is a URI, convert it from WSL if required and get the dirname
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
}

async function openWithDefaultProfile() {
  openWindowsTerminal(await getDefaultProfile(installation));
}

async function openWithProfile(uri?: vscode.Uri) {
  try {
    const profile = await chooseProfile(installation);
    if (!profile) {
      return;
    }
    await openWindowsTerminal(profile, uri);
  } catch (ex) {
    return vscode.window.showErrorMessage(`Could not launch Windows Terminal:\n\n${ex.message}`);
  }
}

async function openActiveFilesFolderWithDefaultProfile(profile?: IWTProfile) {
  const uri = vscode.window.activeTextEditor?.document.uri;
  if (!uri) {
    return vscode.window.showErrorMessage(`There is no active file to open`);
  }
  if (!profile) {
    profile = await getDefaultProfile(installation);
  }
  openWindowsTerminal(profile, uri);
}

async function openActiveFilesFolderWithProfile() {
  try {
    const profile = await chooseProfile(installation);
    if (!profile) {
      return;
    }
    await openActiveFilesFolderWithDefaultProfile(profile);
  } catch (ex) {
    return vscode.window.showErrorMessage(`Could not launch Windows Terminal:\n\n${ex.message}`);
  }
}

async function getDefaultProfile(installation: IWTInstallation): Promise<IWTProfile> {
  const settings = await getSettingsContents(installation.settingsPath);
  const defaultProfile = settings.profiles.list.find(p => p.guid === settings.defaultProfile);
  if (!defaultProfile) {
    throw new Error('Could not detect default profile');
  }
  return defaultProfile;
}

async function chooseProfile(installation: IWTInstallation): Promise<IWTProfile | undefined> {
  const settings = await getSettingsContents(installation.settingsPath);
  let defaultIndex = -1;
  const quickPickItems: (vscode.QuickPickItem & { profile: IWTProfile })[] = settings.profiles.list.map((profile, i) => {
    const isDefault = profile.guid === settings.defaultProfile;
    if (isDefault) {
      defaultIndex = i;
    }
    return {
      label: profile.name,
      description: (profile.commandline || profile.source || '') + (isDefault ? ' (Default)' : ''),
      profile
    };
  });
  if (defaultIndex !== -1) {
    const defaultItem = quickPickItems.splice(defaultIndex, 1)[0];
    quickPickItems.unshift(defaultItem);
  }

  const item = await vscode.window.showQuickPick(quickPickItems);
  return item?.profile;
}

async function isFile(path: string): Promise<boolean> {
  const result = await promisify(stat)(path);
  return !result.isDirectory();
}
