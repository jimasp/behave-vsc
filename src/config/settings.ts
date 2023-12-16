import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import {
  getUrisOfWkspFoldersWithFeatures,
  getWorkspaceFolder,
  normaliseUserSuppliedRelativePath,
  uriId,
  getLongestCommonPaths,
  findFilesSync,
  getStepsDir,
  getActualWorkspaceSetting
} from '../common/helpers';
import { Logger, diagLog } from '../common/logger';
import { performance } from 'perf_hooks';
import { services } from '../diService';


export type EnvSetting = { [key: string]: string };

export type RunProfilesSetting = { [key: string]: RunProfile };
export class RunProfile {
  env?: { [key: string]: string } = {};
  tagExpression? = "";

  constructor(
    env: { [key: string]: string } = {},
    tagExpression = ""
  ) {
    this.env = env;
    this.tagExpression = tagExpression;
  }
}

export type ImportedStepsSetting = { [key: string]: string };
export type StepImport = {
  relativePath: string;
  stepFilesRx: string;
}
export type ImportedSteps = StepImport[];




export class InstanceSettings {
  // class for package.json scope:"window" settings 
  // these apply to the whole vscode instance, but may be set in settings.json OR *.code-workspace 
  // (in a multi-root workspace they will be read from *.code-workspace, and greyed-out and disabled in settings.json)
  public readonly runMultiRootProjectsInParallel: boolean;
  public readonly runProfiles: RunProfilesSetting | undefined;
  public readonly xRay: boolean;

  constructor(winConfig: vscode.WorkspaceConfiguration) {

    // note: for all settings, get() should never return undefined (unless packages.json is wrong),
    // as get() will always return a default value for any packages.json setting.
    // (if we want the actual settings.json setting (not default) then use getActualWorkspaceSetting.)

    const runMultiRootProjectsInParallelCfg: boolean | undefined = winConfig.get("runMultiRootProjectsInParallel");
    if (runMultiRootProjectsInParallelCfg === undefined)
      throw "runMultiRootProjectsInParallel is undefined";
    this.runMultiRootProjectsInParallel = runMultiRootProjectsInParallelCfg;

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
  public readonly env: EnvSetting = {};
  public readonly justMyCode: boolean;
  public readonly runParallel: boolean;
  public readonly importedSteps: ImportedSteps = [];
  // calculated
  public readonly id: string;
  public readonly uri: vscode.Uri;
  public readonly name: string;
  public readonly relativeBaseDirPath: string = "";
  public readonly relativeConfigPaths: string[] = [];
  public readonly relativeFeatureFolders: string[] = [];
  public readonly relativeStepsFolders: string[] = [];


  constructor(projUri: vscode.Uri, projConfig: vscode.WorkspaceConfiguration, winSettings: InstanceSettings, logger: Logger) {

    this.uri = projUri;
    this.id = uriId(projUri);
    const wsFolder = getWorkspaceFolder(projUri);
    this.name = wsFolder.name;

    // note: for all settings, get() should never return undefined (unless packages.json is wrong),
    // as get() will always return a default value for any packages.json setting.
    // (if we want the actual settings.json setting (not default) then use getActualWorkspaceSetting.)    

    const justMyCodeCfg: boolean | undefined = projConfig.get("justMyCode");
    if (justMyCodeCfg === undefined)
      throw "justMyCode is undefined";
    this.justMyCode = justMyCodeCfg;

    const runParallelCfg: boolean | undefined = projConfig.get("runParallel");
    if (runParallelCfg === undefined)
      throw "runParallel is undefined";
    this.runParallel = runParallelCfg;

    try {
      const envCfg: { [name: string]: string } | undefined = projConfig.get("env");
      if (envCfg === undefined)
        throw "behave-vsc.env is undefined";
      this.env = envCfg;
    }
    catch {
      vscode.window.showWarningMessage('Invalid "behave-vsc.env" setting was ignored.', "OK");
    }

    try {
      // DEPRECATED, so only used if env is not set in settings.json
      const envActual = getActualWorkspaceSetting(projConfig, "env");
      if (envActual === undefined) {
        const envCfg: { [name: string]: string } | undefined = projConfig.get("envVarOverrides");
        if (envCfg === undefined)
          throw "behave-vsc.envVarOverrides is undefined";
        this.env = envCfg;
      }
    }
    catch {
      vscode.window.showWarningMessage('Invalid "behave-vsc.envVarOverrides" setting was ignored.', "OK");
    }

    const importedStepsCfg: ImportedStepsSetting | undefined = projConfig.get("importedSteps");
    if (importedStepsCfg === undefined)
      throw "importedSteps is undefined";
    this.importedSteps = convertImportedStepsToArray(projUri, importedStepsCfg, logger);



    const projRelPaths = getProjectRelativePaths(projUri, this.name, this.importedSteps, logger);
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
    vscode.commands.executeCommand('setContext', 'bvsc_StepLibsActive', this.importedSteps.length > 0);

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
    const userSettableProjSettings = ["env", "justMyCode", "runParallel", "importedSteps"];
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
      logger.logInfoAllProjects(`\nInstance settings:\n${JSON.stringify(windowSettingsDic, null, 2)}`);

    logger.logInfo(`\nProject settings:\n${JSON.stringify(resourceSettingsDic, null, 2)}`, this.uri);
  }

}

function convertImportedStepsToArray(projUri: vscode.Uri, importedStepsCfg: ImportedStepsSetting, logger: Logger): ImportedSteps {
  try {

    const importedSteps: ImportedSteps = [];
    const stepImps = new Map(Object.entries(importedStepsCfg));
    for (const stepLibrary of stepImps) {
      const tKey = stepLibrary[0].trim().replace(/\\/g, "/");
      const tValue = stepLibrary[1].trim().replace(/\\/g, "/");
      if (tKey === "") {
        logger.showWarn("behave-vsc.importedSteps key (i.e. the project relative path) cannot be an empty string", projUri);
        continue;
      }
      if (tValue === "") {
        logger.showWarn("behave-vsc.importedSteps value (i.e. the sub-path regex) cannot be an empty string", projUri);
        continue;
      }
      if (importedSteps.find(l => l.relativePath === tKey)) {
        logger.showWarn(`behave-vsc.importedSteps key ${stepLibrary[0]} is a duplicate and will be ignored`, projUri);
        continue;
      }

      importedSteps.push({ relativePath: tKey, stepFilesRx: tValue });
    }

    return importedSteps;
  }
  catch {
    vscode.window.showWarningMessage('Invalid "behave-vsc.importedSteps" setting was ignored.', "OK");
    return [];
  }

}




function getProjectRelativePaths(projUri: vscode.Uri, projName: string, importedSteps: ImportedSteps, logger: Logger) {
  const relativeConfigPaths = services.behaveConfig.getProjectRelativeBehaveConfigPaths(projUri, logger);

  // base dir is a concept borrowed from behave's source code
  // NOTE: relativeBaseDirPath is used to calculate junit filenames (see getJunitFeatureName in junitParser.ts)   
  // and it is also used to determine the steps folder (below)
  const relativeBaseDirPath = getRelativeBaseDirPath(projUri, projName, relativeConfigPaths, logger);
  if (relativeBaseDirPath === null) {
    // e.g. an empty workspace folder
    return;
  }

  const relativeStepsFolders: string[] = [];
  relativeStepsFolders.push(
    ...getStepLibraryStepPaths(projUri, importedSteps, logger));

  // *** NOTE *** - the order of the relativeStepsFolders determines which step folder step is used as the match for 
  // stepReferences if multiple matches are found across step folders. i.e. THE LAST ONE WINS, so we'll 
  // push our main steps directory in last so it comes last in a loop of relativeStepsFolders and so gets set as the match.
  // (also note the line in parseStepsFileContent that says "replacing duplicate step file step")
  const baseDirUri = vscode.Uri.joinPath(projUri, relativeBaseDirPath);
  const stepsFolder = getStepsDir(baseDirUri.fsPath);
  if (stepsFolder) {
    if (relativeStepsFolders.includes(stepsFolder))
      logger.showWarn(`stepsLibraries path "${stepsFolder}" is a known (redundant) steps path`, projUri);
    else
      relativeStepsFolders.push(stepsFolder);
  }

  // determine relativeFeatureFolders BEFORE we add relativeBaseDirPath to relativeConfigPaths
  const relativeFeatureFolders = getProjectRelativeFeatureFolders(projUri, relativeConfigPaths);

  if (relativeConfigPaths.length === 0)
    relativeConfigPaths.push(relativeBaseDirPath);

  return {
    relativeConfigPaths,
    relativeBaseDirPath,
    relativeFeatureFolders,
    relativeStepsFolders
  };
}


function getRelativeBaseDirPath(projUri: vscode.Uri, projName: string, relativeBehaveConfigPaths: string[],
  logger: Logger): string | null {
  // NOTE: THIS FUNCTION MUST HAVE SIMILAR LOGIC TO THE 
  // BEHAVE SOURCE CODE FUNCTION "setup_paths()".
  // IF THAT FUNCTION LOGIC CHANGES IN BEHAVE, THEN IT IS LIKELY THIS FUNCTION WILL ALSO HAVE TO CHANGE.  
  // THIS IS BECAUSE THE BASE DIR IS USED TO CALCULATE (PREDICT) THE JUNIT FILENAME THAT BEHAVE WILL USE.
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
        `Using behave configuration path "${configRelBaseDir}"`, projUri);
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
  let longestCommonPaths = getLongestCommonPaths(relFeatureFolders);
  longestCommonPaths = longestCommonPaths.filter(p => p !== "");

  // default to watching for features path
  if (longestCommonPaths.length === 0)
    longestCommonPaths.push("features");

  diagLog(`PERF: _getProjectRelativeFeaturePaths took ${performance.now() - start} ms for ${projUri.path}`);

  return longestCommonPaths;
}



function getStepLibraryStepPaths(projUri: vscode.Uri, requestedimportedSteps: ImportedSteps, logger: Logger): string[] {

  const stepLibraryPaths: string[] = [];

  for (const stepLibrary of requestedimportedSteps) {
    const relativePath = normaliseUserSuppliedRelativePath(stepLibrary.relativePath);

    if (!relativePath) {
      // the path is required as it is used to set the watcher path
      logger.showWarn('imported steps path specified in "behave-vsc.importedSteps" cannot be an empty ' +
        'string and will be ignored', projUri);
      continue;
    }

    const folderUri = vscode.Uri.joinPath(projUri, relativePath);
    if (!fs.existsSync(folderUri.fsPath)) {
      logger.showWarn(`imported steps path "${folderUri.fsPath}" specified in "behave-vsc.importedSteps" not found ` +
        `and will be ignored`, projUri);
    }
    else {
      stepLibraryPaths.push(relativePath);
    }
  }

  return stepLibraryPaths;
}
