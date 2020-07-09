import * as vscode from 'vscode';
import * as path from 'path';
import * as jsoncParser from 'jsonc-parser';
import { promisify } from 'util';
import { readFile, exists } from 'fs';
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

const readLocalFile = promisify(readFile);
export async function getVscodeQuality(): Promise<String> {
  const jsonPath = path.join(vscode.env.appRoot, 'product.json');
  const raw = await readLocalFile(jsonPath, 'utf8');
  const json = JSON.parse(raw);
  return json.quality;
}