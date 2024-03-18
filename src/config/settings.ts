import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import {
  getProjectUris,
  getWorkspaceFolder,
  normaliseUserSuppliedRelativePath,
  uriId,
  findFeatureFolders,
  getActualWorkspaceSetting,
  getOptimisedFeatureParsingPaths,
  getExcludedPathPatterns,
  pathExistsSync
} from '../common/helpers';
import { xRayLog } from '../common/logger';
import { performance } from 'perf_hooks';
import { getBehaveConfigPaths } from './behaveConfig';
import { services } from '../common/services';
import { getBaseDirPath } from '../behaveLogic';



export class InstanceSettings {
  // class for package.json scope:"window" settings 
  // these apply to the whole vscode instance, but may be set in settings.json OR *.code-workspace 
  // (in a multi-root workspace they will be read from *.code-workspace, and greyed-out and disabled in settings.json)
  public readonly runMultiRootProjectsInParallel: boolean;
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

  }
}

export class ProjectSettings {
  // class for package.json scope:"resource" settings in settings.json
  // these apply to a specific workspace root folder

  // user-settable:
  public readonly env: EnvSetting = {};
  public readonly justMyCode: boolean;
  public readonly runParallel: boolean;
  public readonly importedSteps: ImportedSteps;
  public readonly userRunProfiles: RunProfile[];
  // calculated:
  public readonly id: string; // project id (unique)
  public readonly name: string; // project name taken from folder (not necessarily unique in multi-root)
  public readonly uri: vscode.Uri; // project directory in uri form
  public readonly excludedPathPatterns: { [key: string]: boolean; } = {}; // paths specifically excluded from watching/parsing
  public readonly projRelativeBehaveWorkingDirPath: string = ""; // "behaveWorkingDirectory" in settings.json
  public readonly behaveWorkingDirUri: vscode.Uri; // optional working directory (projRelativeBehaveWorkingDirPath in absolute uri form)
  // calculated after real work in create():
  public rawBehaveConfigPaths: string[] = []; // behave.ini config paths in their original form
  public baseDirPath = ""; // behave-working-dir-relative-path to the parent directory of the "steps" folder/environment.py file 
  public projRelativeFeatureFolders: string[] = []; // all folders containing .feature files (parse locations)
  public projRelativeStepsFolders: string[] = []; // all folders containing steps files (parse locations)  
  // integration test only:
  public readonly integrationTestRunUseCpExec;


  public static async create(projUri: vscode.Uri, projConfig: vscode.WorkspaceConfiguration, winSettings: InstanceSettings):
    Promise<ProjectSettings> {

    // lightweight construction and settings.json validation
    const ps = new ProjectSettings(projUri, projConfig);

    // now do "real work" on filesystem to get path properties
    const paths = await getPaths(ps);
    if (!paths) {
      // most likely behave config "paths" is misconfigured, 
      // (in which case an appropriate warning should have been shown by getRelativeBaseDirPath)
      return ps;
    }

    // update properties after real work
    ps.rawBehaveConfigPaths = paths.rawBehaveConfigPaths;
    ps.baseDirPath = paths.baseDirPath;
    ps.projRelativeFeatureFolders = paths.projRelFeatureFolders;
    ps.projRelativeStepsFolders = paths.projRelStepsFolders;

    // pass projRelBehaveConfigPaths separately, because is not a public property of ProjectSettings
    logSettings(winSettings, ps, paths.projRelBehaveConfigPaths);

    return ps;
  }


  private constructor(projUri: vscode.Uri, projConfig: vscode.WorkspaceConfiguration) {
    xRayLog("constructing ProjectSettings");

    this.id = uriId(projUri);
    this.name = getWorkspaceFolder(projUri).name;
    this.uri = projUri;
    this.behaveWorkingDirUri = projUri; // default
    this.integrationTestRunUseCpExec = projConfig.get("integrationTestRunUseCpExec") || false;
    this.excludedPathPatterns = getExcludedPathPatterns(projConfig);

    // For all settings read from settings.json (derived from package.json), projConfig.get() should never return
    // undefined (unless package.json is wrong), as get() will always return a default value for any packages.json setting.
    // Separately, in cases where we want the actual settings.json setting (not default) then use getActualWorkspaceSetting().

    const justMyCodeCfg: boolean | undefined = projConfig.get("justMyCode");
    if (justMyCodeCfg === undefined)
      throw new Error("justMyCode is undefined");
    this.justMyCode = justMyCodeCfg;

    const runParallelCfg: boolean | undefined = projConfig.get("runParallel");
    if (runParallelCfg === undefined)
      throw new Error("runParallel is undefined");
    this.runParallel = runParallelCfg;

    this.userRunProfiles = getValidUserRunProfiles(projConfig);

    try {
      const envCfg: { [name: string]: string } | undefined = projConfig.get("env");
      if (envCfg === undefined)
        throw new Error("behave-vsc.env is undefined");
      this.env = envCfg;
    }
    catch {
      services.logger.showWarn('Invalid "behave-vsc.env" setting was ignored.', projUri);
    }


    try {
      // DEPRECATED, so only used if env is not set in settings.json
      // get the new setting first, and if it's not set then get the old setting
      const envActual = getActualWorkspaceSetting(projConfig, "env");
      if (envActual === undefined) {
        const envCfg: { [name: string]: string } | undefined = projConfig.get("envVarOverrides");
        if (envCfg === undefined)
          throw new Error("behave-vsc.envVarOverrides is undefined");
        this.env = envCfg;
      }
    }
    catch {
      services.logger.showWarn('Invalid "behave-vsc.envVarOverrides" setting was ignored.', projUri);
    }

    const behaveWorkingDirectoryCfg: string | undefined = projConfig.get("behaveWorkingDirectory");
    if (behaveWorkingDirectoryCfg === undefined)
      throw new Error("behaveWorkingDirectory is undefined");
    const workingDirUri = vscode.Uri.joinPath(projUri, behaveWorkingDirectoryCfg);
    if (!fs.existsSync(workingDirUri.fsPath)) {
      services.logger.showWarn(`Invalid "behave-vsc.behaveWorkingDirectory" setting: "${behaveWorkingDirectoryCfg}" ` +
        "does not exist and will be ignored.", projUri);
    }
    else {
      this.behaveWorkingDirUri = workingDirUri;
      this.projRelativeBehaveWorkingDirPath = behaveWorkingDirectoryCfg;
    }


    const importedStepsCfg: ImportedStepsSetting | undefined = projConfig.get("importedSteps");
    if (importedStepsCfg === undefined)
      throw new Error("importedSteps is undefined");
    this.importedSteps = getValidImportedSteps(projUri, importedStepsCfg);
    // setContext vars are used in package.json
    vscode.commands.executeCommand('setContext', 'bvsc_StepLibsActive', this.importedSteps.length > 0);

  }

}


function getValidUserRunProfiles(projConfig: vscode.WorkspaceConfiguration): RunProfile[] {

  let runProfiles: RunProfile[] = [];

  const runProfilesCfg: RunProfilesSetting | undefined = projConfig.get("runProfiles");
  if (runProfilesCfg === undefined)
    throw new Error("runProfiles is undefined");

  try {
    let validRunProfiles = true;
    for (const profile of runProfilesCfg) {
      const script = profile.customRunner?.scriptFile;
      if (script) {
        if (!script.endsWith(".py")) {
          vscode.window.showWarningMessage('Invalid runProfiles setting: "customRunner.scriptFile" must end in ".py".', "OK");
          validRunProfiles = false;
        }
        if (script.includes("/") || script.includes("\\")) {
          vscode.window.showWarningMessage('Invalid runProfiles setting: "customRunner.scriptFile" cannot contain a path, only a filename.', "OK");
          validRunProfiles = false;
        }
      }
    }
    if (validRunProfiles) {
      // call the RunProfile constructor for each run profile
      runProfiles = runProfilesCfg.map(cfg => new RunProfile(cfg.name, cfg.tagsParameters, cfg.env, cfg.customRunner));
    }
  }
  catch {
    vscode.window.showWarningMessage('Invalid "behave-vsc.runProfiles" setting was ignored.', "OK");
  }

  return runProfiles;
}


function getValidImportedSteps(projUri: vscode.Uri, importedStepsCfg: ImportedStepsSetting): ImportedSteps {
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
      const keyFsPath = vscode.Uri.joinPath(projUri, tKey).fsPath;
      if (!pathExistsSync(keyFsPath)) {
        services.logger.showWarn(`behave-vsc.importedSteps path "${keyFsPath}" not found and will be ignored`, projUri);
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


async function getPaths(ps: ProjectSettings) {

  const { rawBehaveConfigPaths, behaveWrkDirRelBehaveConfigPaths, projRelBehaveConfigPaths } = getBehaveConfigPaths(ps);

  // base dir is a concept borrowed from behave's source code
  // NOTE: projRelBaseDirPath is used to calculate junit filenames (see getJunitFeatureName)
  const baseDirPath = await getBaseDirPath(ps, behaveWrkDirRelBehaveConfigPaths);
  if (baseDirPath === null)
    return;

  const stepsFolder = path.join(ps.projRelativeBehaveWorkingDirPath, baseDirPath, "steps");
  const projRelStepsFolders = getStepLibraryStepPaths(ps);

  // NOTE: the order of the relativeStepsFolders determines which step folder step is used as the match for 
  // stepReferences if multiple matches are found across step folders. i.e. THE LAST ONE WINS, so we'll 
  // push our main steps directory in last so it comes last in a loop of relativeStepsFolders and so gets set as the match.
  // (also note the line in parseStepsFileContent that says "replacing duplicate step file step")
  if (stepsFolder) {
    if (projRelStepsFolders.includes(stepsFolder))
      services.logger.showWarn(`stepsLibraries path "${stepsFolder}" is a known (redundant) steps path`, ps.uri);
    else
      projRelStepsFolders.push(stepsFolder);
  }

  const projRelFeatureFolders = await getProjectRelativeFeatureFolders(ps, projRelBehaveConfigPaths);

  return {
    rawBehaveConfigPaths,
    baseDirPath,
    projRelBehaveConfigPaths,
    projRelFeatureFolders,
    projRelStepsFolders
  }

}


async function getProjectRelativeFeatureFolders(ps: ProjectSettings, projRelativeBehaveConfigPaths: string[]): Promise<string[]> {
  const start = performance.now();

  // if paths specifically set in behave.ini, AND one of the relative paths is not the working dir root,
  // then SKIP gathering feature paths and just use the supplied paths
  if (projRelativeBehaveConfigPaths.length > 0 && !projRelativeBehaveConfigPaths.includes(ps.projRelativeBehaveWorkingDirPath)) {
    const optimisedPaths = getOptimisedFeatureParsingPaths(projRelativeBehaveConfigPaths);
    return optimisedPaths;
  }

  // no behave config paths set (or working dir is one of them) so we'll gather feature paths from disk
  const foldersContainingFeatureFiles = await findFeatureFolders(ps, ps.behaveWorkingDirUri.fsPath);

  let relFeatureFolders = foldersContainingFeatureFiles.map(folder => path.relative(ps.uri.fsPath, folder));

  // add the config paths even if there are no feature files in those paths (yet)
  // (they don't have to exist yet as the watcher uses the project root)
  relFeatureFolders = [...new Set(relFeatureFolders.concat(projRelativeBehaveConfigPaths))];

  // optimise to longest common search paths for parsing search paths
  // note that if "" is included in relFeatureFolders, then we maintain it 
  // as a distinct case (see _parseFeatureFiles)
  const relFeaturePaths = getOptimisedFeatureParsingPaths(relFeatureFolders);

  // if no relFeaturePaths, then default to watching for features path
  if (relFeaturePaths.length === 0)
    relFeaturePaths.push("features");

  xRayLog(`PERF: getProjectRelativeFeatureFolders took ${performance.now() - start} ms for ${ps.behaveWorkingDirUri.path}`);

  return relFeaturePaths;
}


function getStepLibraryStepPaths(ps: ProjectSettings): string[] {

  const stepLibraryPaths: string[] = [];

  for (const stepLibrary of ps.importedSteps) {
    const relativePath = normaliseUserSuppliedRelativePath(stepLibrary.relativePath);

    if (!relativePath) {
      // the path is required as it is used to set the watcher path
      services.logger.showWarn('imported steps path specified in "behave-vsc.importedSteps" cannot be an empty ' +
        'string and will be ignored', ps.uri);
      continue;
    }

    const folderUri = vscode.Uri.joinPath(ps.uri, relativePath);
    if (!fs.existsSync(folderUri.fsPath)) {
      services.logger.showWarn(`imported steps path "${folderUri.fsPath}" specified in "behave-vsc.importedSteps" not found ` +
        `and will be ignored`, ps.uri);
    }
    else {
      stepLibraryPaths.push(relativePath);
    }
  }

  return stepLibraryPaths;
}


function logSettings(winSettings: InstanceSettings, ps: ProjectSettings, projRelBehaveConfigPaths: string[]) {

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
  let projEntries = Object.entries(ps);
  projEntries = projEntries.filter(([key]) => userSettableProjSettings.includes(key));
  projEntries.push(["behaveWorkingDirectory", ps.projRelativeBehaveWorkingDirPath]);
  projEntries = projEntries.sort(([a], [b]) => a.localeCompare(b));
  const resourceSettingsDic: { [name: string]: object; } = {};
  const userEntries: { [name: string]: object; } = {};
  projEntries.forEach(([key, value]) => userEntries[key] = value);
  resourceSettingsDic["user:"] = userEntries;
  resourceSettingsDic["auto:"] = {
    "projectRelativeBehaveConfigPaths": projRelBehaveConfigPaths,
    "projectRelativeBehaveBaseDir": ps.baseDirPath,
    "projectRelativeFeatureFolders": ps.projRelativeFeatureFolders,
    "projectRelativeStepsFolders": ps.projRelativeStepsFolders
  }

  // output settings, and any warnings or errors for settings

  const projUris = getProjectUris();
  if (projUris.length > 0 && ps.uri === projUris[0])
    services.logger.logInfoAllProjects(`\nInstance settings:\n${JSON.stringify(windowSettingsDic, null, 2)}`);

  services.logger.logInfo(`\nProject settings:\n${JSON.stringify(resourceSettingsDic, null, 2)}`, ps.uri);
}


export type EnvSetting = { [key: string]: string };

export type StepImport = {
  relativePath: string;
  stepFilesRx: string;
}
export type ImportedSteps = StepImport[];
export type ImportedStepsSetting = { [key: string]: string };

export class CustomRunner {
  public readonly scriptFile: string;
  public readonly args?: string[];
  public readonly waitForJUnitFiles?: boolean;

  constructor(
    script: string,
    args?: string[],
    waitForJUnitFiles?: boolean
  ) {
    this.scriptFile = script;
    this.args = args ?? [];
    this.waitForJUnitFiles = waitForJUnitFiles ?? true;
  }
}

export class RunProfile {
  public readonly name: string;
  public readonly tagsParameters?: string;
  public readonly env?: EnvSetting;
  public readonly customRunner?: CustomRunner

  constructor(
    name: string,
    tagsParameters?: string,
    env?: EnvSetting,
    customRunner?: CustomRunner
  ) {
    this.name = name;
    // remove any extra spaces, e.g. "--tags= @foo,  @bar  --tags = foo2" => "--tags=@foo,@bar -tags=foo2"
    this.tagsParameters = (tagsParameters ?? "").replace(/\s/g, "").replace(/(--tags)/g, ' $1').trim();
    this.env = env ?? {};
    this.customRunner = customRunner;
  }
}

export type RunProfilesSetting = RunProfile[];



