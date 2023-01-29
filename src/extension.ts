import * as vscode from 'vscode';
import * as path from 'path';
import { getSettingsContents, getVscodeQuality } from './settings';
import { spawn } from 'child_process';
import { convertWslPathToWindows } from './wsl';
import { runDockerCommand } from './docker';
import { stat } from 'fs';
import { promisify } from 'util';
import { detectInstallation } from './installation';
import { IWTProfile, IWTInstallation } from './interfaces';
import { resolveSSHHostName } from './ssh';
import { shellScript, OS } from './shells';

let installation: IWTInstallation | undefined;

export async function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(vscode.commands.registerCommand('windows-terminal.open', () => open()));
  context.subscriptions.push(vscode.commands.registerCommand('windows-terminal.openInQuakeMode', () => open(true)));
  context.subscriptions.push(vscode.commands.registerCommand('windows-terminal.openExplorer', e => open(false, e)));
  context.subscriptions.push(vscode.commands.registerCommand('windows-terminal.openExplorerInQuakeMode', e => open(true, e)));
  context.subscriptions.push(vscode.commands.registerCommand('windows-terminal.openWithProfile', () => openWithProfile()));
  context.subscriptions.push(vscode.commands.registerCommand('windows-terminal.openWithProfileInQuakeMode', () => openWithProfile(true)));
  context.subscriptions.push(vscode.commands.registerCommand('windows-terminal.openWithProfileExplorer', e => openWithProfile(false, e)));
  context.subscriptions.push(vscode.commands.registerCommand('windows-terminal.openWithProfileExplorerInQuakeMode', e => openWithProfile(true, e)));
  context.subscriptions.push(vscode.commands.registerCommand('windows-terminal.openActiveFilesFolder', () => openActiveFilesFolderWithDefaultProfile()));
  context.subscriptions.push(vscode.commands.registerCommand('windows-terminal.openActiveFilesFolderInQuakeMode', () => openActiveFilesFolderWithDefaultProfile(true)));
  context.subscriptions.push(vscode.commands.registerCommand('windows-terminal.openActiveFilesFolderWithProfile', e => openActiveFilesFolderWithProfile()));
  context.subscriptions.push(vscode.commands.registerCommand('windows-terminal.openActiveFilesFolderWithProfileInQuakeMode', e => openActiveFilesFolderWithProfile(true)));

  // commands for changing settings
  context.subscriptions.push(vscode.commands.registerCommand('windows-terminal.showQuakeModeEntries', e => showQuakeModeEntries(true)));
  context.subscriptions.push(vscode.commands.registerCommand('windows-terminal.hideQuakeModeEntries', e => showQuakeModeEntries(false)));
  context.subscriptions.push(vscode.commands.registerCommand('windows-terminal.enableQuakeModeByDefault', e => enableQuakeModeByDefault(true)));
  context.subscriptions.push(vscode.commands.registerCommand('windows-terminal.disableQuakeModeByDefault', e => enableQuakeModeByDefault(false)));

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

async function openWindowsTerminal(profile: IWTProfile, uri?: vscode.Uri, openInQuakeModeForce: boolean = false) {
  const config = vscode.workspace.getConfiguration('windowsTerminal');
  const reuseWindow = config.get<boolean>('reuseExistingWindow');
  const openInQuakeModeAlways = config.get<boolean>('quakeMode.openInQuakeModeAlways');

  await refreshInstallation();
  if (!installation) {
    return;
  }

  const args = ['-p', profile.name];
  if (openInQuakeModeAlways || openInQuakeModeForce) {
    args.splice(0, 0, '-w', '_quake');
  } else if (reuseWindow) {
    args.splice(0, 0, '-w', '0');
  }

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
      const isWindows = !!uri.path.match(/^\/[a-zA-Z]:\/.*$/);
      const remoteMachine = await resolveSSHHostName(host);
      if (isWindows) {
        // remove first /
        const uriWindows = uri.path.substring(1, uri.path.length);
        args.push('ssh', remoteMachine, `powershell -NoExit -Command cd ${uriWindows}\\; ${shellScript(OS.WINDOWS)}`);
      } else {
        args.push('ssh', '-t', remoteMachine, `cd ${uri.path} && ${shellScript(OS.UNIXLIKE)}`);
      }
    } else if (uri.authority.startsWith('dev-container+')) {
      // The authority after the '+' is a hex-encoded string for the base path of the project on the host
      const hexString = uri.authority.split('+')[1];
      const hexValues = new Array(hexString.length / 2);
      for (let i = 0; i < hexValues.length; i++) {
        const current = hexString.slice(2 * i, 2 * i + 2);
        hexValues[i] = parseInt(current, 16);
      }
      const hostPath = String.fromCharCode(...hexValues);

      // devcontainers are labelled based on stable/insider version, so find that to add to the filter
      const quality = await getVscodeQuality();
      const containerID = await runDockerCommand(`ps --filter label=vsch.local.folder=${hostPath} --filter "label=vsch.quality=${quality}" --format "{{.ID}}" --no-trunc`);
      if (containerID === '') {
        return;
      }

      const containerFolder = path.dirname(uri.path);
      args.push('docker', 'exec', '-it', '--workdir', containerFolder, containerID, 'bash');
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
        cwd = path.dirname(cwd);
      }
      args.push('-d', cwd);
    }
  }

  spawn(installation.executablePath, args, { detached: true });
}

async function open(quakeMode: boolean = false, uri?: vscode.Uri) {
  await refreshInstallation();
  if (!installation) {
    return;
  }
  openWindowsTerminal(await getDefaultProfile(installation), uri, quakeMode);
}

async function openWithProfile(quakeMode: boolean = false, uri?: vscode.Uri) {
  await refreshInstallation();
  if (!installation) {
    return;
  }
  try {
    const profile = await chooseProfile(installation, !!uri);
    if (!profile) {
      return;
    }
    await openWindowsTerminal(profile, uri, quakeMode);
  } catch (ex: any) {
    return vscode.window.showErrorMessage(`Could not launch Windows Terminal:\n\n${ex.message}`);
  }
}

async function openActiveFilesFolderWithDefaultProfile(quakeMode: boolean = false, profile?: IWTProfile) {
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
  openWindowsTerminal(profile, uri, quakeMode);
}

async function openActiveFilesFolderWithProfile(quakeMode: boolean = false) {
  await refreshInstallation();
  if (!installation) {
    return;
  }
  try {
    const profile = await chooseProfile(installation, true);
    if (!profile) {
      return;
    }
    await openActiveFilesFolderWithDefaultProfile(quakeMode, profile);
  } catch (ex: any) {
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

  const quickPickItems: Array<vscode.QuickPickItem & { profile: IWTProfile }> = profileList
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

async function showQuakeModeEntries(value: boolean) {
  const config = vscode.workspace.getConfiguration('windowsTerminal');
  await config.update('quakeMode.showQuakeModeEntries', value, true);
}

async function enableQuakeModeByDefault(value: boolean) {
  const config = vscode.workspace.getConfiguration('windowsTerminal');
  await config.update('quakeMode.openInQuakeModeAlways', value, true);
}
