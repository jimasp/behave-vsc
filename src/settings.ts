import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import {
  BEHAVE_CONFIG_FILES,
  findSubDirectorySync,
  getUrisOfWkspFoldersWithFeatures,
  getWorkspaceFolder, normalise_relative_path, uriId, WkspError
} from './common';
import { config } from './configuration';
import { Logger } from './logger';



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
  // class for package.json "window" settings 
  // these apply to the whole vscode instance, but may be set in settings.json OR *.code-workspace 
  // (in a multi-root workspace they will be read from *.code-workspace, and greyed-out and disabled in settings.json)
  public readonly multiRootRunWorkspacesInParallel: boolean;
  public readonly runProfiles: RunProfilesSetting | undefined;
  public readonly xRay: boolean;

  constructor(winConfig: vscode.WorkspaceConfiguration) {

    // note: undefined should never happen (or packages.json is wrong) as get will return a default value for packages.json settings
    const multiRootRunWorkspacesInParallelCfg: boolean | undefined = winConfig.get("multiRootRunWorkspacesInParallel");
    if (multiRootRunWorkspacesInParallelCfg === undefined)
      throw "multiRootRunWorkspacesInParallel is undefined";
    const xRayCfg: boolean | undefined = winConfig.get("xRay");
    if (xRayCfg === undefined)
      throw "xRay is undefined";

    this.multiRootRunWorkspacesInParallel = multiRootRunWorkspacesInParallelCfg;
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

export class WorkspaceFolderSettings {
  // class for package.json "resource" settings in settings.json
  // these apply to a single workspace folder

  // user-settable
  public readonly envVarOverrides: { [name: string]: string } = {};
  public readonly justMyCode: boolean;
  public readonly runParallel: boolean;
  public readonly workspaceRelativeFeaturesPaths: string[] = [];
  public readonly stepLibraries: StepLibrariesSetting = [];
  // convenience properties
  public readonly id: string;
  public readonly uri: vscode.Uri;
  public readonly name: string;
  public readonly relativeConfigPaths: string[] = [];
  public readonly featuresUris: vscode.Uri[] = [];
  public readonly workspaceRelativeBaseDirPath: string = "error";
  public readonly workspaceRelativeStepsNavigationPaths: string[] = [];
  public readonly stepsFolderIsInFeaturesFolder = false;
  // internal
  private readonly _fatalErrors: string[] = [];


  constructor(wkspUri: vscode.Uri, wkspConfig: vscode.WorkspaceConfiguration, winSettings: InstanceSettings, logger: Logger) {

    this.uri = wkspUri;
    this.id = uriId(wkspUri);
    const wsFolder = getWorkspaceFolder(wkspUri);
    this.name = wsFolder.name;

    // note: undefined should never happen (or packages.json is wrong) as get will return a default value for packages.json settings
    const featuresPathCfg: string | undefined = wkspConfig.get("featuresPath");
    if (featuresPathCfg === undefined)
      throw "featuresPath is undefined";
    const justMyCodeCfg: boolean | undefined = wkspConfig.get("justMyCode");
    if (justMyCodeCfg === undefined)
      throw "justMyCode is undefined";
    const runParallelCfg: boolean | undefined = wkspConfig.get("runParallel");
    if (runParallelCfg === undefined)
      throw "runParallel is undefined";

    let requestedStepLibraries: StepLibrariesSetting = [];
    try {
      const stepLibrariesCfg: StepLibrariesSetting | undefined = wkspConfig.get("stepLibraries");
      if (stepLibrariesCfg === undefined)
        throw "stepLibraries is undefined";
      requestedStepLibraries = stepLibrariesCfg;
    }
    catch {
      vscode.window.showWarningMessage('Invalid "behave-vsc.stepLibraries" setting was ignored.', "OK");
    }

    try {
      const envVarOverridesCfg: { [name: string]: string } | undefined = wkspConfig.get("envVarOverrides");
      if (envVarOverridesCfg === undefined)
        throw "envVarOverrides is undefined";
      this.envVarOverrides = envVarOverridesCfg;
    }
    catch {
      vscode.window.showWarningMessage('Invalid "behave-vsc.envVarOverrides" setting was ignored.', "OK");
    }

    this.justMyCode = justMyCodeCfg;
    this.runParallel = runParallelCfg;


    logger.showWarn(`"behave-vsc.featuresPath" setting is DEPRECATED and ignored. ` +
      "Paths are now read directly from the behave configuration file in your project root.", this.uri);

    this.setFeaturePaths();

    if (this.workspaceRelativeFeaturesPaths.length === 0 || this.workspaceRelativeFeaturesPaths[0] === "")
      this.workspaceRelativeFeaturesPaths = ["features"];

    // baseDir is a concept borrowed from behave's source code and is partly used to calculate 
    // junit filenames (see comment in getJunitFeatureName in junitParser.ts)    
    const baseDirPath = getRelativeBaseDirPath(this, this.workspaceRelativeFeaturesPaths, logger, undefined);
    if (baseDirPath === null) {
      this._fatalErrors.push(`Could not find a valid base directory for this workspace.`);
      this.logSettings(logger, winSettings);
      return;
    }

    this.workspaceRelativeStepsNavigationPaths.push(path.join(baseDirPath, "steps"));
    this.workspaceRelativeBaseDirPath = baseDirPath;

    this.setStepsNavigationPaths(logger, winSettings, this.stepsFolderIsInFeaturesFolder);

    this.setStepLibraries(requestedStepLibraries, logger, wkspUri);

    this.logSettings(logger, winSettings);
  }


  setFeaturePaths() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let config: { [key: string]: any; } | undefined = undefined;
    let section = "behave";
    // match order of preference in behave source "config_filenames()" function
    for (const configFile of BEHAVE_CONFIG_FILES.reverse()) {
      const file = path.join(this.uri.fsPath, configFile);
      if (fs.existsSync(file)) {
        if (configFile === "pyproject.toml")
          section = "tool.behave";
        config = configParser(file)
        break;
      }
    }

    if (config) {
      const configPaths = config[section]?.paths;
      if (configPaths) {
        configPaths.forEach((path: string) => {
          path = path.trim().replace(this.uri.fsPath, "");
          this.workspaceRelativeFeaturesPaths.push(normalise_relative_path(path));
          this.relativeConfigPaths.push(path);
        });
      }
    }
  }

  setStepsNavigationPaths(logger: Logger, winSettings: InstanceSettings, stepsFolderIsInFeaturesFolder: boolean) {
    let stepsSearchRelPath: string;
    for (const featuresPath of this.workspaceRelativeFeaturesPaths) {

      if (featuresPath === ".")
        this._fatalErrors.push(`"." is not a valid "behave-vsc.featuresPath" value. The features folder must be a subfolder.`);

      const featuresUri = vscode.Uri.joinPath(this.uri, featuresPath);
      this.featuresUris.push(featuresUri);

      if (!fs.existsSync(featuresUri.fsPath)) {
        // note - this error should never happen or some logic/hooks are wrong 
        // (or the user has actually deleted/moved the features path since loading)
        // because the existence of the path should always be checked by getUrisOfWkspFoldersWithFeatures(true)
        // before we get here (i.e. called elsewhere when workspace folders/settings are changed etc.)    
        this._fatalErrors.push(`ERROR: features path "${featuresUri.fsPath}" does not exist on disk.`);
        this.logSettings(logger, winSettings);
        return;
      }

      if (!stepsFolderIsInFeaturesFolder)
        stepsFolderIsInFeaturesFolder = findSubDirectorySync(featuresUri.fsPath, "steps") !== null ? true : false;

      if (stepsFolderIsInFeaturesFolder) {
        // watch features folder for (possibly multiple) "steps" subfolders (e.g. like example 
        // project B/features folder which imports grouped/steps and grouped2/steps).
        // NOTE - if features/steps exists, we still need to look for e.g. features/grouped/steps
        // so the stepsSearchRelPath in that case will be "features" NOT "features/steps".
        stepsSearchRelPath = path.relative(this.uri.fsPath, featuresUri.fsPath).replace(/\\/g, "/");
        if (!this.workspaceRelativeStepsNavigationPaths.includes(stepsSearchRelPath))
          this.workspaceRelativeStepsNavigationPaths.push(stepsSearchRelPath);
      }
    }
  }

  setStepLibraries(requestedStepLibraries: StepLibrariesSetting, logger: Logger, wkspUri: vscode.Uri) {
    for (const stepLibrary of requestedStepLibraries) {
      const relativePath = normalise_relative_path(stepLibrary.relativePath);
      const stepFilesRx = stepLibrary.stepFilesRx;

      if (!relativePath) {
        // the path is required as it is used to set the watcher path
        logger.showWarn('step library path specified in "behave-vsc.stepLibraries" cannot be an empty ' +
          'string and will be ignored', this.uri);
        continue;
      }

      // add some basic, imperfect checks to try and ensure we don't end up with 2+ watchers on the same folder
      const rxPath = relativePath + "/" + stepFilesRx;
      const lowerRelativePath = relativePath.toLowerCase();
      let rxMatch = false;
      for (const relStepSearchPath of this.workspaceRelativeStepsNavigationPaths) {
        if (RegExp(rxPath).test(relStepSearchPath)) {
          rxMatch = true;
          break;
        }
      }
      if (rxMatch
        || this.workspaceRelativeStepsNavigationPaths.includes(relativePath)
        // check standard paths even if they are not currently in use    
        || lowerRelativePath === "features" || lowerRelativePath === "steps" || lowerRelativePath === "features/steps") {
        logger.showWarn(`step library path "${relativePath}" specified in "behave-vsc.stepLibraries" will be ignored ` +
          "because it is a known steps path).", this.uri);
        continue;
      }

      const folderUri = vscode.Uri.joinPath(wkspUri, relativePath);
      if (!fs.existsSync(folderUri.fsPath)) {
        logger.showWarn(`step library path "${folderUri.fsPath}" specified in "behave-vsc.stepLibraries" not found ` +
          `and will be ignored`, this.uri);
      }
      else {
        stepLibrary.relativePath = relativePath;
        this.stepLibraries.push(stepLibrary);
      }
    }
  }


  logSettings(logger: Logger, winSettings: InstanceSettings) {

    // build sorted output dict of window settings
    const nonUserSettableWinSettings: string[] = [];
    const winSettingsDic: { [name: string]: string; } = {};
    const winEntries = Object.entries(winSettings).sort()
    winEntries.forEach(([key, value]) => {
      if (!key.startsWith("_") && !nonUserSettableWinSettings.includes(key)) {
        winSettingsDic[key] = value;
      }
    });

    // build sorted output dict of workspace settings
    const nonUserSettableWkspSettings = ["name", "uri", "id", "featuresUri", "baseUri", "workspaceRelativeStepsSearchPath"];
    const rscSettingsDic: { [name: string]: string; } = {};
    let wkspEntries = Object.entries(this).sort();
    wkspEntries.push(["fullFeaturesPaths", this.featuresUris.map(featureUri => featureUri.fsPath)]);
    wkspEntries.push(["junitTempPath", config.extensionTempFilesUri.fsPath]);
    wkspEntries = wkspEntries.filter(([key]) => !key.startsWith("_") && !nonUserSettableWkspSettings.includes(key) && key !== "workspaceRelativeFeaturesPath");
    wkspEntries.push(["featuresPath", this.workspaceRelativeFeaturesPaths]);
    wkspEntries = wkspEntries.sort();
    wkspEntries.forEach(([key, value]) => {
      const name = key === "workspaceRelativeFeaturesPath" ? "featuresPath" : key;
      rscSettingsDic[name] = value;
    });


    // output settings, and any warnings or errors for settings

    const wkspUris = getUrisOfWkspFoldersWithFeatures();
    if (wkspUris.length > 0 && this.uri === wkspUris[0])
      logger.logInfoAllWksps(`\ninstance settings:\n${JSON.stringify(winSettingsDic, null, 2)}`);

    logger.logInfo(`\n${this.name} workspace settings:\n${JSON.stringify(rscSettingsDic, null, 2)}`, this.uri);

    if (this._fatalErrors.length > 0) {
      throw new WkspError(`\nFATAL ERROR due to invalid setting in "${this.name}/.vscode/settings.json". Extension cannot continue. ` +
        `${this._fatalErrors.join("\n")}\n` +
        `NOTE: fatal errors may require you to restart vscode after correcting the problem.) `, this.uri);
    }
  }

}


function getRelativeBehaveRunStepsDir(stage: string | undefined): [string, string] {
  let steps_dir = "steps";
  let environment_file = "environment.py";

  if (stage) {
    const prefix = stage + "_";
    steps_dir = prefix + steps_dir;
    environment_file = prefix + environment_file;
  }

  return [steps_dir, environment_file];
}


function getRelativeBaseDirPath(wkspSettings: WorkspaceFolderSettings, relativeFeaturePaths: string[], logger: Logger,
  stage: string | undefined): string | null {

  // this function is derived from "setup_paths()" function in behave source code 

  let base_dir;

  if (relativeFeaturePaths.length > 0)
    base_dir = relativeFeaturePaths[0];
  else
    base_dir = "features";


  const project_parent_dir = path.dirname(wkspSettings.uri.fsPath);
  let new_base_dir = path.join(wkspSettings.uri.fsPath, base_dir);
  const [steps_dir, environment_file] = getRelativeBehaveRunStepsDir(stage);

  console.log(steps_dir);

  // eslint-disable-next-line no-constant-condition
  while (true) {
    if (fs.existsSync(path.join(new_base_dir, steps_dir)))
      break;
    if (fs.existsSync(path.join(new_base_dir, environment_file)))
      break;
    if (new_base_dir === project_parent_dir)
      break;

    new_base_dir = path.dirname(new_base_dir);
  }

  if (new_base_dir === project_parent_dir) {
    if (relativeFeaturePaths.length > 0) {
      logger.showWarn(`Could not find "${steps_dir}" directory. Please specify your "behave-vsc.relativeFeaturePaths".`,
        wkspSettings.uri);
    }
    else {
      logger.showWarn(`Could not find "${steps_dir}" directory in path "${base_dir}"`, wkspSettings.uri);
    }
    return null;
  }

  return path.relative(wkspSettings.uri.fsPath, new_base_dir);
}





// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function configParser(filePath: string): { [key: string]: any; } {

  const data = fs.readFileSync(filePath, 'utf-8');
  const lines = data.split('\n');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const config: { [key: string]: any } = {};
  let currentSection = '';
  let currentValue: string | string[] = '';
  let currentKey = '';

  for (let line of lines) {
    line = line.trim();
    if (line.startsWith('#') || line.startsWith(';'))
      continue;

    if (line.startsWith('[') && line.endsWith(']')) {
      currentSection = line.slice(1, -1);
      config[currentSection] = {};
    }
    else if (line.includes('=')) {
      let [key, value] = line.split('=');
      key = key.trim();
      value = value.trim();
      currentValue = value;
      currentKey = key;
      config[currentSection][key] = value;
    }
    else {
      if (line.length > 0) {
        const arr: string[] = [];
        if (currentValue instanceof Array)
          arr.push(...currentValue);
        else
          arr.push(currentValue);
        arr.push(line);
        currentValue = arr;
        config[currentSection][currentKey] = arr;
      }
    }
  }

  return config;
}

