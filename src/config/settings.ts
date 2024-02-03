import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import {
  getUrisOfWkspFoldersWithFeatures,
  getWorkspaceFolder,
  normaliseUserSuppliedRelativePath,
  uriId,
  findFilesSync,
  getStepsDir,
  getActualWorkspaceSetting,
  getOptimisedFeatureParsingPaths
} from '../common/helpers';
import { xRayLog } from '../common/logger';
import { performance } from 'perf_hooks';
import { getBehaveConfigPaths } from './behaveConfig';
import { services } from '../common/services';
import { getRelativeBaseDirPath } from '../behaveLogic';



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

  constructor(wsConfig: vscode.WorkspaceConfiguration) {
    xRayLog("constructing InstanceSettings");

    // note: for all settings, wsConfig.get() should never return undefined (unless packages.json is wrong),
    // as winConfig.get() will always return a default value for any packages.json setting.
    // (if we want the actual settings.json setting (not default) then use getActualWorkspaceSetting.)

    const runMultiRootProjectsInParallelCfg: boolean | undefined = wsConfig.get("runMultiRootProjectsInParallel");
    if (runMultiRootProjectsInParallelCfg === undefined)
      throw new Error("runMultiRootProjectsInParallel is undefined");
    this.runMultiRootProjectsInParallel = runMultiRootProjectsInParallelCfg;

    const xRayCfg: boolean | undefined = wsConfig.get("xRay");
    if (xRayCfg === undefined)
      throw new Error("xRay is undefined");
    this.xRay = xRayCfg;

    try {
      const runProfilesCfg: RunProfilesSetting | undefined = wsConfig.get("runProfiles");
      if (runProfilesCfg === undefined)
        throw new Error("runProfiles is undefined");
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
  public readonly projRelativeWorkingDirPath: string = ""; // "relativeWorkingDir" in settings.json
  // calculated
  public readonly id: string; // project id (unique)
  public readonly name: string; // project name taken from folder (not necessarily unique in multi-root)
  public readonly uri: vscode.Uri; // project directory in uri form
  public readonly workingDirUri: vscode.Uri; // optional working directory (projRelativeWorkingDirPath in absolute uri form)
  public readonly rawBehaveConfigPaths: string[] = []; // behave.ini config paths in original form
  public readonly projRelativeBaseDirPath: string = ""; // directory that contains "steps" folder/environment.py file
  public readonly projRelativeFeatureFolders: string[] = []; // all folders containing .feature files (parse locations)
  public readonly projRelativeStepsFolders: string[] = []; // all folders containing steps files (parse locations)
  // integration test only
  public readonly integrationTestRunUseCpExec;


  constructor(projUri: vscode.Uri, projConfig: vscode.WorkspaceConfiguration, winSettings: InstanceSettings) {
    xRayLog("constructing ProjectSettings");

    this.id = uriId(projUri);
    this.name = getWorkspaceFolder(projUri).name;
    this.uri = projUri;
    this.workingDirUri = projUri; // default
    this.integrationTestRunUseCpExec = projConfig.get("integrationTestRunUseCpExec") || false;

    // For all settings read from settings.json (derived from package.json), projConfig.get() should never return
    // undefined (unless package.json is wrong), as get() will always return a default value for any packages.json setting.
    // Separately, in cases where we want the actual settings.json setting (not default) then use 
    // getActualWorkspaceSetting(), i.e. to determine if the user has set something vs it just being a default value.   

    const justMyCodeCfg: boolean | undefined = projConfig.get("justMyCode");
    if (justMyCodeCfg === undefined)
      throw new Error("justMyCode is undefined");
    this.justMyCode = justMyCodeCfg;

    const runParallelCfg: boolean | undefined = projConfig.get("runParallel");
    if (runParallelCfg === undefined)
      throw new Error("runParallel is undefined");
    this.runParallel = runParallelCfg;

    try {
      const envCfg: { [name: string]: string } | undefined = projConfig.get("env");
      if (envCfg === undefined)
        throw new Error("behave-vsc.env is undefined");
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
          throw new Error("behave-vsc.envVarOverrides is undefined");
        this.env = envCfg;
      }
    }
    catch {
      vscode.window.showWarningMessage('Invalid "behave-vsc.envVarOverrides" setting was ignored.', "OK");
    }

    const relWorkingDirCfg: string | undefined = projConfig.get("relativeWorkingDir");
    if (relWorkingDirCfg === undefined)
      throw new Error("relativeWorkingDir is undefined");
    const workingDirUri = vscode.Uri.joinPath(projUri, relWorkingDirCfg);
    if (!fs.existsSync(workingDirUri.fsPath)) {
      vscode.window.showWarningMessage(`Invalid "behave-vsc.relativeWorkingDir" setting: "${relWorkingDirCfg}" ` +
        "does not exist and will be ignored.", "OK");
    }
    else {
      this.workingDirUri = workingDirUri;
      this.projRelativeWorkingDirPath = relWorkingDirCfg;
    }


    const importedStepsCfg: ImportedStepsSetting | undefined = projConfig.get("importedSteps");
    if (importedStepsCfg === undefined)
      throw new Error("importedSteps is undefined");
    this.importedSteps = convertImportedStepsToArray(projUri, importedStepsCfg);


    const projRelPaths = getPaths(projUri, this.workingDirUri, this.importedSteps, this.name, this.projRelativeWorkingDirPath);
    if (!projRelPaths) {
      // most likely behave config "paths" is misconfigured, 
      // (in which case an appropriate warning should have been shown by getRelativeBaseDirPath)
      return;
    }

    this.rawBehaveConfigPaths = projRelPaths.rawBehaveConfigPaths;
    this.projRelativeBaseDirPath = projRelPaths.projRelBaseDirPath;
    this.projRelativeFeatureFolders = projRelPaths.projRelFeatureFolders;
    this.projRelativeStepsFolders = projRelPaths.projRelStepsFolders;

    // setContext vars are used in package.json
    vscode.commands.executeCommand('setContext', 'bvsc_StepLibsActive', this.importedSteps.length > 0);

    this._logSettings(winSettings);
  }


  private _logSettings(winSettings: InstanceSettings) {

    // build sorted output dict of window settings
    const windowSettingsDic: { [name: string]: string; } = {};
    const winEntries = Object.entries(winSettings).sort(([a], [b]) => a.localeCompare(b));
    winEntries.forEach(([key, value]) => {
      if (!key.startsWith("_")) {
        windowSettingsDic[key] = value;
      }
    });

    // build sorted output dict of resource settings
    const userSettableProjSettings = ["env", "justMyCode", "runParallel", "importedSteps"];
    let projEntries = Object.entries(this);
    projEntries = projEntries.filter(([key]) => userSettableProjSettings.includes(key));
    projEntries = projEntries.sort(([a], [b]) => a.localeCompare(b));
    const resourceSettingsDic: { [name: string]: object; } = {};
    const userEntries: { [name: string]: object; } = {};
    projEntries.forEach(([key, value]) => userEntries[key] = value);
    resourceSettingsDic["user:"] = userEntries;
    resourceSettingsDic["auto:"] = {
      "featureFolders": this.projRelativeFeatureFolders,
      "stepsFolders": this.projRelativeStepsFolders
    }

    // output settings, and any warnings or errors for settings

    const projUris = getUrisOfWkspFoldersWithFeatures();
    if (projUris.length > 0 && this.uri === projUris[0])
      services.logger.logInfoAllProjects(`\nInstance settings:\n${JSON.stringify(windowSettingsDic, null, 2)}`);

    services.logger.logInfo(`\nProject settings:\n${JSON.stringify(resourceSettingsDic, null, 2)}`, this.uri);
  }

}

function convertImportedStepsToArray(projUri: vscode.Uri, importedStepsCfg: ImportedStepsSetting): ImportedSteps {
  try {

    const importedSteps: ImportedSteps = [];
    const stepImps = new Map(Object.entries(importedStepsCfg));
    for (const stepLibrary of stepImps) {
      const tKey = stepLibrary[0].trim().replace(/\\/g, "/");
      const tValue = stepLibrary[1].trim().replace(/\\/g, "/");
      if (tKey === "") {
        services.logger.showWarn("behave-vsc.importedSteps key (i.e. the project relative path) cannot be an empty string", projUri);
        continue;
      }
      if (tValue === "") {
        services.logger.showWarn("behave-vsc.importedSteps value (i.e. the sub-path regex) cannot be an empty string", projUri);
        continue;
      }
      if (importedSteps.find(l => l.relativePath === tKey)) {
        services.logger.showWarn(`behave-vsc.importedSteps key ${stepLibrary[0]} is a duplicate and will be ignored`, projUri);
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




function getPaths(projUri: vscode.Uri, workUri: vscode.Uri, importedSteps: ImportedSteps, projName: string,
  projRelativeWorkingDirPath: string) {

  const { rawBehaveConfigPaths, projRelBehaveConfigPaths } = getBehaveConfigPaths(projUri, workUri, projRelativeWorkingDirPath);

  // base dir is a concept borrowed from behave's source code
  // NOTE: relativeBaseDirPath is used to calculate junit filenames (see getJunitFeatureName in junitParser.ts)   
  // and it is also used to determine the steps folder (below)
  const projRelBaseDirPath = getRelativeBaseDirPath(projUri, projName, projRelativeWorkingDirPath, projRelBehaveConfigPaths);
  if (projRelBaseDirPath === null) {
    // e.g. an empty workspace folder
    return;
  }

  const projRelStepsFolders: string[] = [];
  projRelStepsFolders.push(
    ...getStepLibraryStepPaths(projUri, importedSteps));

  // *** NOTE *** - the order of the relativeStepsFolders determines which step folder step is used as the match for 
  // stepReferences if multiple matches are found across step folders. i.e. THE LAST ONE WINS, so we'll 
  // push our main steps directory in last so it comes last in a loop of relativeStepsFolders and so gets set as the match.
  // (also note the line in parseStepsFileContent that says "replacing duplicate step file step")
  const baseDirUri = vscode.Uri.joinPath(projUri, projRelBaseDirPath);
  const stepsFolder = getStepsDir(baseDirUri.fsPath);
  if (stepsFolder) {
    if (projRelStepsFolders.includes(stepsFolder))
      services.logger.showWarn(`stepsLibraries path "${stepsFolder}" is a known (redundant) steps path`, projUri);
    else
      projRelStepsFolders.push(stepsFolder);
  }

  const projRelFeatureFolders = getProjectRelativeFeatureFolders(projUri, projRelBehaveConfigPaths);

  return {
    // for consistency, these are all project-relative
    rawBehaveConfigPaths,
    projRelBehaveConfigPaths,
    projRelBaseDirPath,
    projRelFeatureFolders,
    projRelStepsFolders
  }

}





function getProjectRelativeFeatureFolders(projUri: vscode.Uri, relativeConfigPaths: string[]): string[] {
  const start = performance.now();

  // if paths specifically set in behave.ini, skip gathering feature paths and use those
  if (relativeConfigPaths.length > 0 && !relativeConfigPaths.includes(""))
    return relativeConfigPaths;

  const featureFiles = findFilesSync(projUri, undefined, ".feature");
  const foldersContainingFeatureFiles = [...new Set(featureFiles.map(f => path.dirname(f.fsPath)))];

  // behave would ignore a feature file in the root if not set in the behave config paths, and so must we,
  // i.e. we only include the project root if it's requested in the behave config paths,
  // (and if that were the case it would have been intercepted by the early exit on "" at the start of this function)
  if (!relativeConfigPaths.includes("")) {
    const projectRootIndex = foldersContainingFeatureFiles.findIndex(fld => fld === projUri.fsPath);
    if (projectRootIndex !== -1)
      foldersContainingFeatureFiles.splice(projectRootIndex, 1);
  }

  const relFeatureFolders = foldersContainingFeatureFiles.map(folder => path.relative(projUri.fsPath, folder));

  // optimise to longest common search paths for parsing search paths
  // note that if "" is included in relativeFolders, then we maintain it as a distinct case 
  // (see _parseFeatureFiles in fileParser.ts)
  const relFeaturePaths = getOptimisedFeatureParsingPaths(relFeatureFolders);

  // if no relFeaturePaths, then default to watching for features path
  if (relFeaturePaths.length === 0)
    relFeaturePaths.push("features");

  xRayLog(`PERF: _getProjectRelativeFeaturePaths took ${performance.now() - start} ms for ${projUri.path}`);

  return relFeaturePaths;
}



function getStepLibraryStepPaths(projUri: vscode.Uri, requestedimportedSteps: ImportedSteps): string[] {

  const stepLibraryPaths: string[] = [];

  for (const stepLibrary of requestedimportedSteps) {
    const relativePath = normaliseUserSuppliedRelativePath(stepLibrary.relativePath);

    if (!relativePath) {
      // the path is required as it is used to set the watcher path
      services.logger.showWarn('imported steps path specified in "behave-vsc.importedSteps" cannot be an empty ' +
        'string and will be ignored', projUri);
      continue;
    }

    const folderUri = vscode.Uri.joinPath(projUri, relativePath);
    if (!fs.existsSync(folderUri.fsPath)) {
      services.logger.showWarn(`imported steps path "${folderUri.fsPath}" specified in "behave-vsc.importedSteps" not found ` +
        `and will be ignored`, projUri);
    }
    else {
      stepLibraryPaths.push(relativePath);
    }
  }

  return stepLibraryPaths;
}
