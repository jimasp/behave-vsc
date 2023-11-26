import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import {
  getUrisOfWkspFoldersWithFeatures,
  getWorkspaceFolder,
  normaliseUserSuppliedRelativePath,
  uriId,
  projError,
  findLongestCommonPaths,
  findFilesSync,
  BEHAVE_CONFIG_FILES,
  getStepsDir
} from './common';
import { Logger, diagLog } from './logger';
import { performance } from 'perf_hooks';



export class RunProfile {
  envVarOverrides?: { [key: string]: string } = {};
  tagExpression?= "";

  constructor(
    envVarOverrides: { [key: string]: string } = {},
    tagExpression = ""
  ) {
    this.envVarOverrides = envVarOverrides;
    this.tagExpression = tagExpression;
  }
}
export type RunProfilesSetting = { [key: string]: RunProfile };

export type StepLibrary = {
  relativePath: string;
  stepFilesRx: string;
}

export type StepLibrariesSetting = StepLibrary[];




export class InstanceSettings {
  // class for package.json scope:"window" settings 
  // these apply to the whole vscode instance, but may be set in settings.json OR *.code-workspace 
  // (in a multi-root workspace they will be read from *.code-workspace, and greyed-out and disabled in settings.json)
  public readonly multiRootProjectsRunInParallel: boolean;
  public readonly runProfiles: RunProfilesSetting | undefined;
  public readonly xRay: boolean;

  constructor(winConfig: vscode.WorkspaceConfiguration) {

    // note: undefined should never happen (or packages.json is wrong) as get will return a default value for packages.json settings

    // deprecated setting
    const multiRootRunWorkspacesInParallelCfg: boolean | undefined = winConfig.get("multiRootRunWorkspacesInParallel");
    if (multiRootRunWorkspacesInParallelCfg === undefined)
      throw "multiRootRunWorkspacesInParallel is undefined";
    // ------------------

    const multiRootProjectsRunInParallelCfg: boolean | undefined = winConfig.get("multiRootProjectsRunInParallel");
    if (multiRootProjectsRunInParallelCfg === undefined)
      throw "multiRootProjectsRunInParallel is undefined";

    if (!multiRootRunWorkspacesInParallelCfg || !multiRootProjectsRunInParallelCfg)
      this.multiRootProjectsRunInParallel = false;
    else
      this.multiRootProjectsRunInParallel = true;

    const xRayCfg: boolean | undefined = winConfig.get("xRay");
    if (xRayCfg === undefined)
      throw "xRay is undefined";
    this.xRay = xRayCfg;

    try {
      const runProfilesCfg: RunProfilesSetting | undefined = winConfig.get("runProfiles");
      if (runProfilesCfg === undefined)
        throw "runProfiles is undefined";
      this.runProfiles = runProfilesCfg;
    }
    catch {
      vscode.window.showWarningMessage('Invalid "behave-vsc.runProfiles" setting was ignored.', "OK");
    }

  }
}

export class ProjectSettings {
  // class for package.json scope:"resource" settings in settings.json
  // these apply to a specific workspace root folder

  // user-settable
  public readonly envVarOverrides: { [name: string]: string } = {};
  public readonly justMyCode: boolean;
  public readonly runParallel: boolean;
  public readonly stepLibraries: StepLibrariesSetting = [];
  // calculated
  public readonly id: string;
  public readonly uri: vscode.Uri;
  public readonly name: string;
  public readonly relativeBaseDirPath: string = "";
  public readonly relativeConfigPaths: string[] = [];
  public readonly relativeFeatureFolders: string[] = [];
  public readonly relativeStepsFolders: string[] = [];
  // internal
  private readonly _fatalErrors: string[] = [];


  constructor(projUri: vscode.Uri, projConfig: vscode.WorkspaceConfiguration, winSettings: InstanceSettings, logger: Logger) {

    this.uri = projUri;
    this.id = uriId(projUri);
    const wsFolder = getWorkspaceFolder(projUri);
    this.name = wsFolder.name;

    // note: undefined should never happen (or packages.json is wrong) as get will return a default value for packages.json settings
    const featuresPathCfg: string | undefined = projConfig.get("featuresPath");
    if (featuresPathCfg === undefined)
      throw "featuresPath is undefined";
    const justMyCodeCfg: boolean | undefined = projConfig.get("justMyCode");
    if (justMyCodeCfg === undefined)
      throw "justMyCode is undefined";
    const runParallelCfg: boolean | undefined = projConfig.get("runParallel");
    if (runParallelCfg === undefined)
      throw "runParallel is undefined";

    try {
      const envVarOverridesCfg: { [name: string]: string } | undefined = projConfig.get("envVarOverrides");
      if (envVarOverridesCfg === undefined)
        throw "envVarOverrides is undefined";
      this.envVarOverrides = envVarOverridesCfg;
    }
    catch {
      vscode.window.showWarningMessage('Invalid "behave-vsc.envVarOverrides" setting was ignored.', "OK");
    }

    try {
      const stepLibrariesCfg: StepLibrariesSetting | undefined = projConfig.get("stepLibraries");
      if (stepLibrariesCfg === undefined)
        throw "stepLibraries is undefined";
      for (const stepLibrary of stepLibrariesCfg) {
        const stepLib = stepLibrary;
        stepLib.relativePath = stepLibrary.relativePath.replace(/\\/g, "/");
        stepLib.stepFilesRx = stepLibrary.stepFilesRx.replace(/\\/g, "/");
      }

      this.stepLibraries = stepLibrariesCfg;
    }
    catch {
      vscode.window.showWarningMessage('Invalid "behave-vsc.stepLibraries" setting was ignored.', "OK");
    }

    this.justMyCode = justMyCodeCfg;
    this.runParallel = runParallelCfg;

    const projRelPaths = getProjectRelativePaths(projUri, this.name, this.stepLibraries, logger);
    if (!projRelPaths) {
      // most likely behave config "paths" is misconfigured, 
      // (in which case an appropriate warning should have been shown by getRelativeBaseDirPath)
      return;
    }

    this.relativeBaseDirPath = projRelPaths.relativeBaseDirPath;
    this.relativeConfigPaths = projRelPaths.relativeConfigPaths;
    this.relativeFeatureFolders = projRelPaths.relativeFeatureFolders;
    this.relativeStepsFolders = projRelPaths.relativeStepsFolders;

    // setContext vars are used in package.json
    vscode.commands.executeCommand('setContext', 'bvsc_StepLibsActive', this.stepLibraries.length > 0);

    this._logSettings(logger, winSettings);
  }


  private _logSettings(logger: Logger, winSettings: InstanceSettings) {

    // build sorted output dict of window settings
    const nonUserSettableWinSettings: string[] = [];
    const windowSettingsDic: { [name: string]: string; } = {};
    const winEntries = Object.entries(winSettings).sort()
    winEntries.forEach(([key, value]) => {
      if (!key.startsWith("_") && !nonUserSettableWinSettings.includes(key)) {
        windowSettingsDic[key] = value;
      }
    });

    // build sorted output dict of resource settings
    const userSettableProjSettings = ["envVarOverrides", "justMyCode", "runParallel", "stepLibraries"];
    let projEntries = Object.entries(this).sort();
    projEntries = projEntries.filter(([key]) => userSettableProjSettings.includes(key));
    projEntries = projEntries.sort();
    const resourceSettingsDic: { [name: string]: object; } = {};
    const userEntries: { [name: string]: object; } = {};
    projEntries.map(([key, value]) => userEntries[key] = value);
    resourceSettingsDic["user:"] = userEntries;
    resourceSettingsDic["auto:"] = {
      "featureFolders": this.relativeFeatureFolders,
      "stepsFolders": this.relativeStepsFolders
    }

    // output settings, and any warnings or errors for settings

    const projUris = getUrisOfWkspFoldersWithFeatures();
    if (projUris.length > 0 && this.uri === projUris[0])
      logger.logInfoAllProjects(`\ninstance settings:\n${JSON.stringify(windowSettingsDic, null, 2)}`);

    logger.logInfo(`\n${this.name} project settings:\n${JSON.stringify(resourceSettingsDic, null, 2)}`, this.uri);

    if (this._fatalErrors.length > 0) {
      throw new projError(`\nFATAL ERROR due to invalid setting in "${this.name}/.vscode/settings.json". Extension cannot continue. ` +
        `${this._fatalErrors.join("\n")}\n` +
        `NOTE: fatal errors may require you to restart vscode after correcting the problem.) `, this.uri);
    }

  }

}


function getProjectRelativeBehaveConfigPaths(projUri: vscode.Uri, logger: Logger): string[] {
  let paths: string[] | null = null;

  // BEHAVE_CONFIG_FILES array has the same order of precedence as in the behave 
  // source code function "config_filenames()",
  // however we don't need to reverse() it like behave because we are only 
  // interested in the "paths" setting (not all cumulative 
  // settings), i.e. we can just break on the first file with a "paths" setting.
  let matchedConfigFile;
  for (const configFile of BEHAVE_CONFIG_FILES) {
    const configFilePath = path.join(projUri.fsPath, configFile);
    if (fs.existsSync(configFilePath)) {
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

  if (!paths) {
    logger.logInfo(`Behave config file "${matchedConfigFile}", paths: ${paths}`, projUri);
    return [];
  }

  const relPaths: string[] = [];
  for (const path of paths) {
    // paths setting may be relative or absolute
    const relPath = vscode.workspace.asRelativePath(path);
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
  // we have to follow behave's own paths behaviour here
  // (see "read_configuration" in behave's source code)
  //
  // example ini file #1 - becomes ["features"]
  //  [behave]
  // paths = ./features
  //
  // example ini file # - becomes ["/home/me/project/features"] (will be converted to a relative path up the call stack)
  //  [behave]
  // paths=/home/me/project/features
  //
  // example ini file #2 - becomes ["features", "features2"]
  //  [behave]
  // paths  =features
  //     features2
  // stdout_capture= true
  //
  // example ini file #3 - becomes [".", "../features"]
  // [behave]
  // paths =
  //   ../features
  //
  // example ini file #4 - ignored due to space in "[behave ]"
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
      if (trimmed === "") {
        paths = ["."];
        continue;
      }
      paths = [normalisePath(trimmed)];
      continue;
    }

    if (line.length > 0)
      paths?.push(normalisePath(line));
  }

  return paths;
}



function getProjectRelativePaths(projUri: vscode.Uri, projName: string, stepLibraries: StepLibrariesSetting, logger: Logger) {
  const relativeConfigPaths = getProjectRelativeBehaveConfigPaths(projUri, logger);

  // base dir is a concept borrowed from behave's source code
  // note that it is used to calculate junit filenames (see getJunitFeatureName in junitParser.ts)        
  const relativeBaseDirPath = getRelativeBaseDirPath(projUri, projName, relativeConfigPaths, logger);
  if (relativeBaseDirPath === null) {
    // e.g. an empty workspace folder
    return;
  }

  if (relativeConfigPaths.length === 0)
    relativeConfigPaths.push(relativeBaseDirPath);

  const baseDirUri = vscode.Uri.joinPath(projUri, relativeBaseDirPath);

  const relativeFeatureFolders = getProjectRelativeFeatureFolders(projUri, relativeConfigPaths);

  const relativeStepsFolders: string[] = [];
  relativeStepsFolders.push(
    ...getStepLibraryStepPaths(projUri, stepLibraries, relativeStepsFolders, logger));

  // NOTE - the order of the relativeStepsFolders determines which step folder step is used as the match for 
  // stepReferences if multiple matches are found across step folders. i.e. the last one wins, so we'll 
  // push our main steps directory in last so it comes last in a loop of relativeStepsFolders and so gets set as the match.
  // (also note the line in parseStepsFileContent on the line that says "replacing duplicate step file step")
  const stepsFolder = getStepsDir(baseDirUri.fsPath);
  if (stepsFolder)
    relativeStepsFolders.push(stepsFolder);

  return {
    relativeConfigPaths,
    relativeBaseDirPath,
    relativeFeatureFolders,
    relativeStepsFolders
  };
}


function getRelativeBaseDirPath(projUri: vscode.Uri, projName: string, relativeBehaveConfigPaths: string[],
  logger: Logger): string | null {
  // NOTE: this function MUST have basically the same logic as the 
  // behave source code function "setup_paths()".
  // if that function changes in behave, then it is likely this will also have to change.  
  let configRelBaseDir;

  // this function will determine the baseDir
  // where baseDir = the directory that contains the "steps" folder / environment.py file

  if (relativeBehaveConfigPaths.length > 0)
    configRelBaseDir = relativeBehaveConfigPaths[0];
  else
    configRelBaseDir = "features";

  const project_root_dir = path.dirname(projUri.fsPath);
  let new_base_dir = path.join(projUri.fsPath, configRelBaseDir);
  const steps_dir = "steps";
  const environment_file = "environment.py";

  // eslint-disable-next-line no-constant-condition
  while (true) {
    if (fs.existsSync(path.join(new_base_dir, steps_dir)))
      break;
    if (fs.existsSync(path.join(new_base_dir, environment_file)))
      break;
    if (new_base_dir === project_root_dir)
      break;

    new_base_dir = path.dirname(new_base_dir);
  }

  if (new_base_dir === project_root_dir) {
    if (relativeBehaveConfigPaths.length === 0) {
      logger.showWarn(`Could not find "${steps_dir}" directory for project "${projName}". ` +
        'Please specify a "paths" setting in your behave configuration file for this project.', projUri);
    }
    else {
      logger.showWarn(`Could not find "${steps_dir}" directory for project "${projName}". ` +
        `Using behave configuration path "${configRelBaseDir}".`, projUri);
    }
    return null;
  }

  return path.relative(projUri.fsPath, new_base_dir);
}


function getProjectRelativeFeatureFolders(projUri: vscode.Uri, relativeConfigPaths: string[]): string[] {

  // if paths specifically set, and not set to root path, skip gathering feature paths
  if (relativeConfigPaths.length > 0 && !relativeConfigPaths.includes("."))
    return relativeConfigPaths;

  const start = performance.now();
  const featureFolders = findFilesSync(projUri, undefined, ".feature").map(f => path.dirname(f.fsPath));
  const relFeatureFolders = featureFolders.map(folder => path.relative(projUri.fsPath, folder));

  /* 
  we want the longest common .feature paths, such that this structure:
    my_project
    └── tests
        ├── pytest
        │    └── unittest.py    
        ├── features
        │   ├── a.feature
        │   └── web
        │       └── a.feature
        └── features2
            └── a.feature
 
  will return:
    "tests/features"
    "tests/features2"
  */
  const longestCommonPaths = findLongestCommonPaths(relFeatureFolders);

  // default to watching for features path
  if (longestCommonPaths.length === 0)
    longestCommonPaths.push("features");

  diagLog(`PERF: _getProjectRelativeFeaturePaths took ${performance.now() - start} ms for ${projUri.path}`);

  return longestCommonPaths;
}



function getStepLibraryStepPaths(projUri: vscode.Uri, requestedStepLibraries: StepLibrariesSetting,
  relativeStepsFoldersOutsideFeatureFolders: string[], logger: Logger): string[] {

  const stepLibraryPaths: string[] = [];

  for (const stepLibrary of requestedStepLibraries) {
    const relativePath = normaliseUserSuppliedRelativePath(stepLibrary.relativePath);
    const stepFilesRx = stepLibrary.stepFilesRx;

    if (!relativePath) {
      // the path is required as it is used to set the watcher path
      logger.showWarn('step library path specified in "behave-vsc.stepLibraries" cannot be an empty ' +
        'string and will be ignored', projUri);
      continue;
    }

    // add some basic, imperfect checks to try and ensure we don't end up with 2+ watchers on the same folder
    const rxPath = relativePath + "/" + stepFilesRx;
    const lowerRelativePath = relativePath.toLowerCase();
    let rxMatch = false;
    for (const relStepSearchPath of relativeStepsFoldersOutsideFeatureFolders) {
      if (RegExp(rxPath).test(relStepSearchPath)) {
        rxMatch = true;
        break;
      }
    }
    if (rxMatch
      || relativeStepsFoldersOutsideFeatureFolders.includes(relativePath)
      // check standard paths even if they are not currently in use    
      || lowerRelativePath === "features" || lowerRelativePath === "steps" || lowerRelativePath === "features/steps") {
      logger.showWarn(`step library path "${relativePath}" specified in "behave-vsc.stepLibraries" will be ignored ` +
        "because it is a known steps path).", projUri);
      continue;
    }

    const folderUri = vscode.Uri.joinPath(projUri, relativePath);
    if (!fs.existsSync(folderUri.fsPath)) {
      logger.showWarn(`step library path "${folderUri.fsPath}" specified in "behave-vsc.stepLibraries" not found ` +
        `and will be ignored`, projUri);
    }
    else {
      stepLibraryPaths.push(relativePath);
    }
  }

  return stepLibraryPaths;
}
