import * as jsoncParser from 'jsonc-parser';
import { promisify } from "util";
import { readFile, exists } from "fs";
import { IWTSettings } from './interfaces';

export async function getSettingsContents(settingsPath: string): Promise<IWTSettings> {
  const pathExists = await promisify(exists)(settingsPath);
  if (!pathExists) {
    throw Error('Expected settings file does not exist: ' + settingsPath);
  }

  const rawString = (await promisify(readFile)(settingsPath))?.toString();
  if (!rawString) {
    throw Error('Could not read settings file');
  }

  return jsoncParser.parse(rawString) as IWTSettings;
}
