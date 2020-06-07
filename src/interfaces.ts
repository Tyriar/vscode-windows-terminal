export type Channel = 'stable' | 'preview';

export interface IWTInstallation {
  executablePath: string;
  settingsPath: string;
}


export interface IWTProfileList {
  list: IWTProfile[];
}

export interface IWTSettings {
  defaultProfile: string;
  // The old format seems to be an array and was changes to allow shared config
  profiles: IWTProfile[] | IWTProfileList;
}

export interface IWTProfile {
  commandline?: string;
  source?: string;
  guid: string;
  hidden: boolean;
  name: string;
}
