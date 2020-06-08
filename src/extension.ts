import * as vscode from 'vscode';
import { getSettingsContents } from './settings';
import { spawn } from 'child_process';
import { convertWslPathToWindows } from './wsl';
import { stat } from 'fs';
import { promisify } from 'util';
import { dirname } from 'path';
import { detectInstallation } from './installation';
import { IWTProfile, IWTInstallation } from './interfaces';
import { resolveSSHHostName } from './ssh';

let installation: IWTInstallation | undefined;

export async function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(vscode.commands.registerCommand('windows-terminal.open', () => open()));
  context.subscriptions.push(vscode.commands.registerCommand('windows-terminal.openExplorer', e => open(e)));
  context.subscriptions.push(vscode.commands.registerCommand('windows-terminal.openWithProfile', () => openWithProfile()));
  context.subscriptions.push(vscode.commands.registerCommand('windows-terminal.openWithProfileExplorer', e => openWithProfile(e)));
  context.subscriptions.push(vscode.commands.registerCommand('windows-terminal.openActiveFilesFolder', () => openActiveFilesFolderWithDefaultProfile()));
  context.subscriptions.push(vscode.commands.registerCommand('windows-terminal.openActiveFilesFolderWithProfile', e => openActiveFilesFolderWithProfile()));

  await refreshInstallation();
  vscode.workspace.onDidChangeConfiguration(async e => {
    if (e.affectsConfiguration('windowsTerminal')) {
      await refreshInstallation(true);
    }
  });
}

export function deactivate() { }

async function refreshInstallation(force: boolean = false) {
  if (installation && !force) {
    return;
  }
  installation = await detectInstallation();
}

async function openWindowsTerminal(profile: IWTProfile, uri?: vscode.Uri) {
  await refreshInstallation();
  if (!installation) {
    return;
  }

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
    if (uri.authority.startsWith('ssh-remote+')) {
      // Handle SSH remotes first
      const host = uri.authority.split('+')[1];
      const isWindows = !!uri.path.match(/^\/[a-z]:\//);
      if (isWindows) {
        // Changing paths on Windows seems tricky
        args.push('ssh', host);
      } else {
        const remoteMachine = await resolveSSHHostName(host);
        args.push('ssh', '-t', remoteMachine, `cd ${uri.path} && exec $SHELL -l`);
      }
    } else {
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
  }

  spawn(installation.executablePath, args, { detached: true });
}

async function open(uri?: vscode.Uri) {
  await refreshInstallation();
  if (!installation) {
    return;
  }
  openWindowsTerminal(await getDefaultProfile(installation), uri);
}

async function openWithProfile(uri?: vscode.Uri) {
  await refreshInstallation();
  if (!installation) {
    return;
  }
  try {
    const profile = await chooseProfile(installation, !!uri);
    if (!profile) {
      return;
    }
    await openWindowsTerminal(profile, uri);
  } catch (ex) {
    return vscode.window.showErrorMessage(`Could not launch Windows Terminal:\n\n${ex.message}`);
  }
}

async function openActiveFilesFolderWithDefaultProfile(profile?: IWTProfile) {
  await refreshInstallation();
  if (!installation) {
    return;
  }
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
  await refreshInstallation();
  if (!installation) {
    return;
  }
  try {
    const profile = await chooseProfile(installation, true);
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
  const profileList = ('list' in settings.profiles ? settings.profiles.list : settings.profiles);
  const defaultProfile = profileList.find(p => p.guid === settings.defaultProfile);
  if (!defaultProfile) {
    throw new Error('Could not detect default profile');
  }
  return defaultProfile;
}

async function chooseProfile(installation: IWTInstallation, hasUri: boolean): Promise<IWTProfile | undefined> {
  const settings = await getSettingsContents(installation.settingsPath);
  let defaultIndex = -1;
  let profileList = ('list' in settings.profiles ? settings.profiles.list : settings.profiles);

  // Filter out any Cloud Shell profile when a URI is used
  if (hasUri) {
    profileList = profileList.filter(p => p.source !== 'Windows.Terminal.Azure');
  }

  const quickPickItems: (vscode.QuickPickItem & { profile: IWTProfile })[] = profileList
    .map((profile, i) => {
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
