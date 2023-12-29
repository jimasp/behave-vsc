import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { BEHAVE_CONFIG_FILES } from "../common/helpers";
import { Logger } from '../common/logger';


export function getProjectRelativeBehaveConfigPaths(projUri: vscode.Uri, logger: Logger): string[] {
  let paths: string[] | null = null;

  // BEHAVE_CONFIG_FILES ARRAY HAS THE SAME ORDER OF PRECEDENCE AS IN THE BEHAVE 
  // SOURCE CODE FUNCTION "config_filenames()",
  // however we DON'T need to reverse() it like behave because we are only 
  // interested in the "paths" setting (not all cumulative settings), 
  // i.e. we can just break on the first file in the order that has a "paths" setting.
  let matchedConfigFile;
  let lastExistingConfigFile;
  for (const configFile of BEHAVE_CONFIG_FILES) {
    const configFilePath = path.join(projUri.fsPath, configFile);
    if (fs.existsSync(configFilePath)) {
      lastExistingConfigFile = configFile;
      // TODO: for behave 1.2.7 we will also need to support pyproject.toml      
      if (configFile === "pyproject.toml")
        continue;
      paths = getBehavePathsFromIni(configFilePath);
      if (paths) {
        matchedConfigFile = configFile;
        break;
      }
    }
  }

  if (!lastExistingConfigFile) {
    logger.logInfo(`No Behave config file found, using default paths.`, projUri);
    return [];
  }

  if (!paths) {
    logger.logInfo(`Behave config file "${lastExistingConfigFile}" did not set paths, using default paths.`, projUri);
    return [];
  }

  const relPaths: string[] = [];
  for (const path of paths) {
    // behave config paths setting may be relative or absolute, so standardise to relative
    const relPath = vscode.workspace.asRelativePath(path, false);
    if (!fs.existsSync(vscode.Uri.joinPath(projUri, relPath).fsPath))
      logger.showWarn(`Ignoring invalid path "${path}" in config file ${matchedConfigFile}.`, projUri);
    else
      relPaths.push(relPath);
  }

  const outPaths = relPaths.map(p => `"${p}"`).join(", ");
  logger.logInfo(`Behave config file "${matchedConfigFile}" sets relative paths: ${outPaths}`, projUri);
  return relPaths;
}


function getBehavePathsFromIni(filePath: string): string[] | null {

  // WE HAVE TO FOLLOW BEHAVE'S OWN PATHS BEHAVIOUR HERE
  // (see "read_configuration" in behave's source code)
  //
  // example ini file #1 - becomes []
  // [behave]
  // paths =
  //
  // example #2 - becomes ["features"]
  //  [behave]
  // paths = ./features
  //
  // example #3 - becomes ["/home/me/project/features"] (will be converted to a relative path up the call stack)
  //  [behave]
  // paths=/home/me/project/features
  //
  // example #4 - becomes ["features", "features2"]
  //  [behave]
  // paths  =features
  //     features2
  // stdout_capture= true
  //
  // example #5 - ignored due to space in "[behave ]"
  //  [behave ]
  // paths  =features
  //

  const normalisePath = (p: string) => {
    if (p.startsWith("./"))
      return p.slice(2);
    return p.replaceAll("/./", "/");
  }

  const data = fs.readFileSync(filePath, 'utf-8');
  const lines = data.split('\n');
  let currentSection = '';
  let paths: string[] | null = null;

  for (let line of lines) {
    line = line.trim();
    if (line.startsWith('#') || line.startsWith(';'))
      continue;

    if (line.startsWith('[') && line.endsWith(']')) {
      // behave's config parser will only match "[behave]", 
      // e.g. it won't match "[behave ]", so we will do the same
      const newSection = line.slice(1, -1);
      if (newSection === "")
        continue;
      if (newSection !== "behave" && currentSection === "behave")
        break;
      currentSection = newSection;
      continue;
    }

    if (currentSection !== "behave")
      continue;

    if (line.includes('=')) {
      const [key, value] = line.split('=');
      if (key.trim() !== "paths")
        continue;
      const trimmed = value.trim();
      if (trimmed === "")
        continue;
      paths = [normalisePath(trimmed)];
      continue;
    }

    if (line.length > 0)
      paths?.push(normalisePath(line));
  }

  return paths;
}

