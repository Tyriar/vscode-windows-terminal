export type Channel = 'stable' | 'preview';

export interface IWTInstallation {
  executablePath: string;
  settingsPath: string;
}

export interface IWTSettings {
  defaultProfile: string;
  profiles: {
    list: IWTProfile[];
  };
}

export interface IWTProfile {
  commandline?: string;
  source?: string;
  guid: string;
  hidden: boolean;
  name: string;
}
