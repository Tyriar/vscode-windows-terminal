import { join } from "path";
import { promisify } from "util";
import { readFile } from "fs";
import * as jsoncParser from 'jsonc-parser';

export interface IWTSettings {
    defaultProfile: string;
    profiles: {
        list: IWTProfile[];
    }
}

export interface IWTProfile {
    commandline?: string;
    source?: string;
    guid: string;
    hidden: boolean;
    name: string;
}

/**
 * @throws when settings cannot be read.
 */
export async function getWTSettings(): Promise<IWTSettings> {
	const localAppDataDir = process.env.LOCALAPPDATA;
	if (!localAppDataDir) {
		throw Error('Environment variable LOCALAPPDATA is not set');
	}
	const settingsPath = join(`${localAppDataDir}/Packages/Microsoft.WindowsTerminal_8wekyb3d8bbwe/LocalState/settings.json`);
	const rawString = (await promisify(readFile)(settingsPath))?.toString();
	if (!rawString) {
		throw Error('Could not read settings file');
	}
	return jsoncParser.parse(rawString) as IWTSettings;
}