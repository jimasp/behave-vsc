import os from 'os';
import fs from 'fs';
import path from 'path';
import vscode from 'vscode';
import {
  getWorkspaceFolder,
  normaliseUserSuppliedRelativePath,
  uriId,
  findFeatureFoldersInWorkingDir,
  getActualWorkspaceSetting,
  getOptimisedFeatureParsingPaths,
  getExcludedPathPatterns,
  pathExistsSync,
  getProjectUris,
  projectContainsRelativePath,
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
  public readonly shell: Shell;

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

    // hardcoded, just leaves open the possibility of supporting user-choice of shell in future 
    // (but that would need extra tests)
    this.shell = os.platform() === "win32" ? Shell.powershell : Shell.posix;
  }
}

export class ProjectSettings {
  // class for package.json scope:"resource" settings in settings.json
  // these apply to a specific workspace root folder

  // user-settable:
  public readonly env: EnvSetting = {};
  public readonly args: string[] = [];
  public readonly justMyCode: boolean;
  public readonly runParallel: boolean;
  public readonly importedSteps: ImportedSteps;
  public readonly userRunProfiles: RunProfile[];
  // calculated:
  public readonly id: string; // project id (unique)
  public readonly name: string; // project name taken from folder (not necessarily unique in multi-root)
  public readonly uri: vscode.Uri; // project directory in uri form
  public readonly excludedPathPatterns: string[]; // paths specifically excluded from watching/parsing
  public readonly projRelativeBehaveWorkingDirPath: string = "."; // "behaveWorkingDirectory" if set in settings.json, otherwise "."
  public readonly behaveWorkingDirUri: vscode.Uri; // optional working directory (projRelativeBehaveWorkingDirPath in absolute uri form)
  // calculated after real work in create():
  public isValid = true; // set to false if the project paths are invalid  
  public rawBehaveConfigPaths: string[] = []; // behave.ini config paths in their original form
  public baseDirPath = "features"; // behave-working-dir-relative-path to the parent directory of the "steps" folder/environment.py file 
  public projRelativeFeatureFolders: string[] = []; // all folders containing .feature files (parse locations)
  public projRelativeStepsFolders: string[] = []; // all folders containing steps files (parse locations)  
  // integration test only:
  public readonly integrationTestRunUseCpExec: boolean;


  public static async create(projUri: vscode.Uri, projConfig: vscode.WorkspaceConfiguration, winSettings: InstanceSettings):
    Promise<ProjectSettings> {
    const start = performance.now();

    // lightweight construction and settings.json validation
    const ps = new ProjectSettings(projUri, projConfig);

    // now do "real work" on filesystem to get path properties
    const paths = await getPaths(ps);

    // if paths is not set, then most likely behave config "paths" is misconfigured, 
    // (in which case an appropriate warning should have been shown by getRelativeBaseDirPath)
    if (!paths)
      return ps;

    // update properties after real work
    ps.rawBehaveConfigPaths = paths.rawBehaveConfigPaths;
    ps.baseDirPath = paths.baseDirPath;
    ps.projRelativeFeatureFolders = paths.projRelFeatureFolders;
    ps.projRelativeStepsFolders = paths.projRelStepsFolders;

    // (pass projRelBehaveConfigPaths separately to the logger, because is not a public property of ProjectSettings)
    await logSettings(winSettings, ps, paths.projRelBehaveConfigPaths);

    xRayLog(`PERF: ProjectSettings.create took ${performance.now() - start} ms for ${ps.id}`);
    return ps;
  }


  private constructor(projUri: vscode.Uri, projConfig: vscode.WorkspaceConfiguration) {
    const start = performance.now();
    xRayLog("constructing ProjectSettings");


    this.id = uriId(projUri);
    this.name = getWorkspaceFolder(projUri).name;
    this.uri = projUri;
    this.behaveWorkingDirUri = projUri; // default
    this.integrationTestRunUseCpExec = projConfig.get("integrationTestRunUseCpExec") || false;
    this.excludedPathPatterns = getExcludedPathPatterns(projUri);

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

    try {
      const envCfg: { [name: string]: string } | undefined = projConfig.get("env");
      if (envCfg === undefined)
        throw new Error("behave-vsc.env is undefined");
      this.env = envCfg;
    }
    catch {
      services.logger.logWarning('Invalid "behave-vsc.env" setting was ignored.', projUri);
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
      services.logger.logWarning('Invalid "behave-vsc.envVarOverrides" setting was ignored.', projUri);
    }


    try {
      const argsCfg: string[] | undefined = projConfig.get("args");
      if (argsCfg === undefined)
        throw new Error("behave-vsc.args is undefined");
      this.args = argsCfg;
    }
    catch {
      services.logger.logWarning('Invalid "behave-vsc.args" setting was ignored.', projUri);
    }

    let behaveWorkingDirectoryCfg: string | undefined = projConfig.get("behaveWorkingDirectory");
    if (behaveWorkingDirectoryCfg === undefined)
      throw new Error("behaveWorkingDirectory is undefined");
    behaveWorkingDirectoryCfg = behaveWorkingDirectoryCfg === "" ? "." : behaveWorkingDirectoryCfg.trim();
    if (!projectContainsRelativePath(projUri, behaveWorkingDirectoryCfg)) {
      services.logger.logWarning('"behave-vsc.behaveWorkingDirectory" setting ' +
        '"${behaveWorkingDirectoryCfg}" is not inside the project and will be ignored', projUri);
      behaveWorkingDirectoryCfg = ".";
    }
    const workingDirUri = vscode.Uri.joinPath(projUri, behaveWorkingDirectoryCfg);
    if (!fs.existsSync(workingDirUri.fsPath)) {
      services.logger.logWarning(`Invalid "behave-vsc.behaveWorkingDirectory" setting: "${behaveWorkingDirectoryCfg}" ` +
        "does not exist and will be ignored.", projUri);
    }
    else {
      this.behaveWorkingDirUri = workingDirUri;
      this.projRelativeBehaveWorkingDirPath = behaveWorkingDirectoryCfg;
    }

    this.userRunProfiles = getValidUserRunProfiles(projUri, this.behaveWorkingDirUri, projConfig);

    const importedStepsCfg: ImportedStepsSetting | undefined = projConfig.get("importedSteps");
    if (importedStepsCfg === undefined)
      throw new Error("importedSteps is undefined");
    this.importedSteps = getValidImportedSteps(projUri, importedStepsCfg);
    // setContext vars are used in package.json
    vscode.commands.executeCommand('setContext', 'bvsc_StepLibsActive', this.importedSteps.length > 0);

    xRayLog(`constructing ProjectSettings took ${performance.now() - start} ms for ${this.id}`);
  }

}


function getValidUserRunProfiles(projUri: vscode.Uri, behaveWorkingDirUri: vscode.Uri,
  projConfig: vscode.WorkspaceConfiguration): RunProfile[] {

  const runProfiles: RunProfile[] = [];

  const runProfilesCfg: RunProfilesSetting | undefined = projConfig.get("runProfiles");
  if (runProfilesCfg === undefined)
    throw new Error("runProfiles is undefined");

  try {
    for (const profile of runProfilesCfg) {
      const customRunner = profile.customRunner;
      if (!profile.name) {
        services.logger.logWarning(`Invalid runProfiles setting ignored: "name" is required.`, projUri);
        continue;
      }
      if (runProfiles.find(p => p.name === profile.name && projUri === p.projUri)) {
        services.logger.logWarning(`Invalid runProfiles setting "${profile.name}" ignored: ` +
          `duplicate run profile name for this project.`, projUri);
        continue;
      }
      if (customRunner) {
        if (customRunner.waitForJUnitFiles === undefined) {
          services.logger.logWarning(`Invalid runProfiles setting "${profile.name}" ignored: ` +
            `"customRunner.waitForJUnitFiles" is required.`, projUri);
          continue;
        }
        let script = customRunner.scriptFile;
        if (!script) {
          services.logger.logWarning(`Invalid runProfiles setting "${profile.name}" ignored: ` +
            `"customRunner.scriptFile" is required.`, projUri);
          continue;
        }
        script = script.trim();
        if (script.includes(" ")) {
          services.logger.logWarning(`Invalid runProfiles setting "${profile.name}" ignored: ` +
            `"customRunner.scriptFile" must not contain a space.`, projUri);
          continue;
        }
        if (!script.endsWith(".py")) {
          services.logger.logWarning(`Invalid runProfiles setting "${profile.name}" ignored: ` +
            `"customRunner.scriptFile" must end in ".py".`, projUri);
          continue;
        }
        if (script.includes("/") || script.includes("\\")) {
          services.logger.logWarning(`Invalid runProfiles setting "${profile.name}" ignored: ` +
            `"customRunner.scriptFile" cannot contain a path, only a filename.`, projUri);
          continue;
        }
        const fullPath = vscode.Uri.joinPath(behaveWorkingDirUri, script).fsPath;
        if (!pathExistsSync(fullPath)) {
          services.logger.logWarning(`Invalid runProfiles setting "${profile.name}" ignored: ` +
            `"customRunner.scriptFile" path "${fullPath}" does not exist.`, projUri);
          continue;
        }
      }

      // if we got this far then this run profile is valid, create via the RunProfile constructor
      runProfiles.push(new RunProfile(profile.name, projUri, profile.promptForTags, profile.env, profile.args, profile.customRunner));
    }
  }
  catch {
    services.logger.logWarning('Invalid "behave-vsc.runProfiles" setting was ignored.', projUri);
  }

  return runProfiles;
}


function getValidImportedSteps(projUri: vscode.Uri, importedStepsCfg: ImportedStepsSetting): ImportedSteps {
  try {

    const importedSteps: ImportedSteps = [];
    const stepImps = new Map(Object.entries(importedStepsCfg));
    for (const stepLibrary of stepImps) {
      const tKey = normaliseUserSuppliedRelativePath(stepLibrary[0].trim());
      const tValue = normaliseUserSuppliedRelativePath(stepLibrary[1].trim());
      if (tKey === "") {
        services.logger.logWarning("behave-vsc.importedSteps key (i.e. the project relative path) cannot be an empty string", projUri);
        continue;
      }
      if (tValue === "") {
        services.logger.logWarning("behave-vsc.importedSteps value (i.e. the sub-path regex) cannot be an empty string", projUri);
        continue;
      }
      if (importedSteps.find(l => l.relativePath === tKey)) {
        services.logger.logWarning(`behave-vsc.importedSteps key ${stepLibrary[0]} is a duplicate and will be ignored`, projUri);
        continue;
      }
      const keyFsPath = vscode.Uri.joinPath(projUri, tKey).fsPath;
      if (!pathExistsSync(keyFsPath)) {
        services.logger.logWarning(`behave-vsc.importedSteps path "${keyFsPath}" not found and will be ignored`, projUri);
        continue;
      }

      importedSteps.push({ relativePath: tKey, stepFilesRx: tValue });
    }

    return importedSteps;
  }
  catch {
    services.logger.logWarning('Invalid "behave-vsc.importedSteps" setting was ignored.', projUri);
    return [];
  }

}


async function getPaths(ps: ProjectSettings): Promise<GetPaths | undefined> {

  const start = performance.now();

  const { rawBehaveConfigPaths, behaveWrkDirRelBehaveConfigPaths, projRelBehaveConfigPaths } = getBehaveConfigPaths(ps);

  // NOTE: base dir (parent dir of the steps folder) is a concept borrowed from behave's source code
  // this is IMPORTANT because baseDirPath is used to determine the expected junit filenames that behave will produce (see getJunitFeatureName)
  const baseDirPath = await getBaseDirPath(ps, behaveWrkDirRelBehaveConfigPaths);
  if (baseDirPath === null) {
    // if baseDirPath is null, then we can't proceed, so
    // set default paths for the projectWatcher to use so that if/when a user 
    // adds these folders to a new project they won't need to manually refresh
    ps.projRelativeFeatureFolders = [
      path.posix.join(ps.projRelativeBehaveWorkingDirPath, "features")
    ];
    ps.projRelativeStepsFolders = [
      path.posix.join(ps.projRelativeBehaveWorkingDirPath, "steps"),
      path.posix.join(ps.projRelativeBehaveWorkingDirPath, "features/steps")
    ];
    ps.isValid = false; // invalid project
    return;
  }

  const projRelFeatureFolders = await getProjectRelativeFeatureFolders(ps, projRelBehaveConfigPaths);

  const stepsFolder = path.posix.join(ps.projRelativeBehaveWorkingDirPath, baseDirPath, "steps");
  const projRelStepsFolders = getStepLibraryStepPaths(ps);

  // NOTE: the order of the relativeStepsFolders determines which step folder step is used as the match for 
  // stepReferences if multiple matches are found across step folders. i.e. THE LAST ONE WINS, so we'll 
  // push our main steps directory in last so it comes last in a loop of relativeStepsFolders and so gets set as the match.
  // (also note the line in parseStepsFileContent that says "replacing duplicate step file step")
  if (stepsFolder) {
    if (projRelStepsFolders.includes(stepsFolder))
      services.logger.logWarning(`stepsLibraries path "${stepsFolder}" is a known (redundant) steps path`, ps.uri);
    else
      projRelStepsFolders.push(stepsFolder);
  }

  xRayLog(`PERF: getPaths took ${performance.now() - start} ms for ${ps.id}`);

  return {
    rawBehaveConfigPaths,
    baseDirPath,
    projRelBehaveConfigPaths,
    projRelFeatureFolders,
    projRelStepsFolders
  }

}


async function getProjectRelativeFeatureFolders(ps: ProjectSettings, projRelativeBehaveConfigPaths: string[]): Promise<string[]> {
  /**
  * Determine the project‑relative feature folder roots to parse/watch.
  *
  * Flow:
  * 1. If behave config specifies one or more project‑relative paths AND none of them
  *    is the behave working directory root (ps.projRelativeBehaveWorkingDirPath, which
  *    defaults to "."), we skip on‑disk discovery and return the optimised version of
  *    those config paths.
  *
  * 2. Otherwise (no config paths, or one of them equals the working dir root) we discover
  *    feature folders on disk via findFeatureFoldersInWorkingDir(ps). That helper returns
  *    working‑dir‑relative folders that currently contain at least one *.feature file
  *    (directly or in a descendant).
  *
  * 3. Each discovered folder is prefixed with the project‑relative working directory path
  *    (path.posix.join(ps.projRelativeBehaveWorkingDirPath, folder)).
  *
  * 4. We merge in all behave config paths (projRelativeBehaveConfigPaths) even if they do
  *    not yet exist or are presently empty, so that the watcher will notice future files.
  *    This merge also happens when the root path is among the config paths.
  *
  * 5. After de‑duplication (Set) we call getOptimisedFeatureParsingPaths() to drop redundant
  *    descendant paths, yielding a minimal set of non‑overlapping root search paths (e.g. keep
  *    "features" and discard "features/api").
  *
  * 6. If optimisation yields no paths (no discovery and no config entries) we default to
  *    ["features"] so that creating a features/ folder later is automatically detected.
  *
  * Returns: array of project‑relative folder root paths for feature discovery & watching.
  * Notes:
  *  - The working directory root is represented as "." (never an empty string).
  *  - No special empty‑string handling is required here (legacy comment removed).
   */
  const start = performance.now();

  // if paths specifically set in behave.ini, AND one of the relative paths is not the working dir root,
  // then SKIP gathering feature paths and just use the supplied paths
  if (projRelativeBehaveConfigPaths.length > 0 && !projRelativeBehaveConfigPaths.includes(ps.projRelativeBehaveWorkingDirPath)) {
    const optimisedPaths = getOptimisedFeatureParsingPaths(projRelativeBehaveConfigPaths);
    return optimisedPaths;
  }

  // no behave config paths set (or working dir is one of them) so we'll gather feature paths from disk
  const foldersContainingFeatureFiles = await findFeatureFoldersInWorkingDir(ps);

  let projRelFeatureFolders = foldersContainingFeatureFiles.map(folder => path.posix.join(ps.projRelativeBehaveWorkingDirPath, folder));

  // add the config paths even if there are no feature files in those paths (yet)
  // (they don't have to exist yet as the watcher uses the project root)
  projRelFeatureFolders = [...new Set(projRelFeatureFolders.concat(projRelativeBehaveConfigPaths))];

  // Optimise: remove redundant descendant paths (keep the minimal non-overlapping roots)
  // (Legacy behaviour about preserving an empty string path is no longer applicable; root is ".".)
  const relFeaturePaths = getOptimisedFeatureParsingPaths(projRelFeatureFolders);

  // if no relFeaturePaths, then default to watching for features path
  if (relFeaturePaths.length === 0)
    relFeaturePaths.push("features");

  xRayLog(`PERF: getProjectRelativeFeatureFolders took ${performance.now() - start} ms for ${ps.behaveWorkingDirUri.path}`);

  return relFeaturePaths;
}


function getStepLibraryStepPaths(ps: ProjectSettings): string[] {

  const stepLibraryPaths: string[] = [];

  for (const stepLibrary of ps.importedSteps) {

    const relativePath = stepLibrary.relativePath;

    if (!relativePath) {
      // the path is required as it is used to set the watcher path
      services.logger.logWarning('imported steps path specified in "behave-vsc.importedSteps" cannot be an empty ' +
        'string and will be ignored', ps.uri);
      continue;
    }

    const folderUri = vscode.Uri.joinPath(ps.uri, relativePath);
    if (!fs.existsSync(folderUri.fsPath)) {
      services.logger.logWarning(`imported steps path "${folderUri.fsPath}" specified in "behave-vsc.importedSteps" not found ` +
        `and will be ignored`, ps.uri);
    }
    else {
      stepLibraryPaths.push(relativePath);
    }
  }

  return stepLibraryPaths;
}


async function logSettings(winSettings: InstanceSettings, ps: ProjectSettings, projRelBehaveConfigPaths: string[]) {

  // build sorted output dict of window settings
  const windowSettingsDic: { [name: string]: string; } = {};
  const winEntries = Object.entries(winSettings).sort(([a], [b]) => a.localeCompare(b));
  winEntries.forEach(([key, value]) => {
    if (key === "shell") {
      //windowSettingsDic[key] = Shell[value]; shell is hardcoded atm
      return;
    }
    if (!key.startsWith("_") && key !== "shell") {
      windowSettingsDic[key] = value;
    }
  });

  // build sorted output dict of resource settings
  const userSettableProjSettings = ["env", "justMyCode", "runParallel", "importedSteps"];
  let projEntries = Object.entries(ps);
  projEntries = projEntries.filter(([key]) => userSettableProjSettings.includes(key));
  projEntries.push(["behaveWorkingDirectory", ps.projRelativeBehaveWorkingDirPath]);
  projEntries.push(["runProfiles", ps.userRunProfiles.map(p => p.name).join(", ")]);
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

  const projUris = await getProjectUris();
  if (projUris.length > 0 && ps.uri === projUris[0])
    services.logger.logInfoAllProjects(`\nInstance settings:\n${JSON.stringify(windowSettingsDic, null, 2)}`);

  services.logger.logInfo(`\nProject settings:\n${JSON.stringify(resourceSettingsDic, null, 2)}`, ps.uri);
}




type GetPaths = {
  rawBehaveConfigPaths: string[];
  baseDirPath: string;
  projRelBehaveConfigPaths: string[];
  projRelFeatureFolders: string[];
  projRelStepsFolders: string[];
}


export type EnvSetting = { [key: string]: string };

export type RunProfileEnvSetting = {
  inherit?: boolean,
  vars: EnvSetting
}

export type RunProfileArgsSetting = {
  inherit?: boolean,
  list: string[]
}

export type StepImport = {
  // key-value pair so that we can append the first part to projRelativeStepsFolders
  // then use the second part for a regex match on a file event to check if its a match  
  relativePath: string;
  stepFilesRx: string;
}
export type ImportedSteps = StepImport[];
export type ImportedStepsSetting = { [key: string]: string };

export class CustomRunner {
  public readonly scriptFile: string;
  public readonly waitForJUnitFiles: boolean;

  constructor(
    script: string,
    waitForJUnitFiles: boolean,
  ) {
    this.scriptFile = script.trim();
    this.waitForJUnitFiles = waitForJUnitFiles;
  }
}

export interface IRunProfile {
  name: string;
  projUri?: vscode.Uri;
  promptForTags?: boolean;
  env?: RunProfileEnvSetting;
  args?: RunProfileArgsSetting;
  customRunner?: CustomRunner;
}

export class RunProfile implements IRunProfile {
  public readonly name: string;
  public readonly projUri: vscode.Uri;
  public readonly promptForTags: boolean;
  public readonly env: RunProfileEnvSetting;
  // note that for args, we must differentiate between undefined (not set by user) and an empty array set by user 
  // (i.e. user may want to override default args to [])
  public readonly args: RunProfileArgsSetting | undefined;
  public readonly customRunner?: CustomRunner

  constructor(
    name: string,
    projUri: vscode.Uri,
    promptForTags?: boolean,
    env?: RunProfileEnvSetting,
    args?: RunProfileArgsSetting,
    customRunner?: CustomRunner,
  ) {
    this.name = name;
    this.promptForTags = promptForTags ?? false;
    this.projUri = projUri;
    this.env = {
      inherit: env?.inherit ?? true,
      vars: env?.vars ?? {}
    };
    this.args = {
      inherit: args?.inherit ?? true,
      list: args?.list ?? []
    };
    // use the customRunner constructor (to apply trim() etc.)
    this.customRunner = customRunner
      ? new CustomRunner(customRunner.scriptFile, customRunner.waitForJUnitFiles)
      : undefined;
  }
}

export type RunProfilesSetting = IRunProfile[];

export enum Shell {
  "posix",
  "powershell"
}
