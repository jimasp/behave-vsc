import * as vscode from 'vscode';
import * as fs from 'fs';
import { getActualWorkspaceSetting, getUrisOfWkspFoldersWithFeatures, WkspError } from './common';
import { EXTENSION_NAME } from './Configuration';
import { diagLog, Logger } from './Logger';


export class WindowSettings {
  // class for package.json "window" settings 
  // these apply to the whole vscode instance, but may be set in settings.json or *.code-workspace 
  // (in a multi-root workspace they will be read from *.code-workspace, and greyed-out and disabled in settings.json)
  public readonly alwaysShowOutput: boolean;
  public readonly multiRootRunWorkspacesInParallel: boolean;
  public readonly showConfigurationWarnings: boolean;
  public readonly logDiagnostics: boolean;
  public readonly errors: string[] = [];

  constructor(winConfig: vscode.WorkspaceConfiguration) {

    // note: undefined should never happen (or packages.json is wrong) as get will return a default value for packages.json settings
    const alwaysShowOutputCfg: boolean | undefined = winConfig.get("alwaysShowOutput");
    if (alwaysShowOutputCfg === undefined)
      throw "alwaysShowOutput is undefined";
    const multiRootRunWorkspacesInParallelCfg: boolean | undefined = winConfig.get("multiRootRunWorkspacesInParallel");
    if (multiRootRunWorkspacesInParallelCfg === undefined)
      throw "multiRootRunWorkspacesInParallel is undefined";
    const showConfigurationWarningsCfg: boolean | undefined = winConfig.get("showConfigurationWarnings");
    if (showConfigurationWarningsCfg === undefined)
      throw "showConfigurationWarnings is undefined";
    const logDiagnosticsCfg: boolean | undefined = winConfig.get("logDiagnostics");
    if (logDiagnosticsCfg === undefined)
      throw "logDiagnostics is undefined";

    this.alwaysShowOutput = alwaysShowOutputCfg;
    this.multiRootRunWorkspacesInParallel = multiRootRunWorkspacesInParallelCfg;
    this.showConfigurationWarnings = showConfigurationWarningsCfg;
    this.logDiagnostics = logDiagnosticsCfg;
  }
}

export class WorkspaceSettings {
  // class for package.json "resource" settings in settings.json
  // these apply to a single workspace 

  // user-settable
  public readonly envVarList: { [name: string]: string; } = {};
  public readonly fastSkipList: string[] = [];
  public readonly justMyCode: boolean;
  public readonly runAllAsOne: boolean;
  public readonly runParallel: boolean;
  public readonly workspaceRelativeFeaturesPath: string;
  // convenience properties
  public readonly uri: vscode.Uri;
  public readonly name: string;
  public readonly featuresUri: vscode.Uri;
  // internal
  private readonly _errors: string[] = [];


  constructor(wkspUri: vscode.Uri, wkspConfig: vscode.WorkspaceConfiguration, winSettings: WindowSettings, logger: Logger) {

    this.uri = wkspUri;
    let fatal = false;
    const wsFolder = vscode.workspace.getWorkspaceFolder(wkspUri);
    if (!wsFolder)
      throw new Error("No workspace folder found for uri " + wkspUri.path);
    this.name = wsFolder.name;

    // note: undefined should never happen (or packages.json is wrong) as get will return a default value for packages.json settings
    const envVarListCfg: string | undefined = wkspConfig.get("envVarList");
    if (envVarListCfg === undefined)
      throw "envVarList is undefined";
    const fastSkipListCfg: string | undefined = wkspConfig.get("fastSkipList");
    if (fastSkipListCfg === undefined)
      throw "fastSkipList is undefined";
    const featuresPathCfg: string | undefined = wkspConfig.get("featuresPath");
    if (featuresPathCfg === undefined)
      throw "featuresPath is undefined";
    const justMyCodeCfg: boolean | undefined = wkspConfig.get("justMyCode");
    if (justMyCodeCfg === undefined)
      throw "justMyCode is undefined";
    const runParallelCfg: boolean | undefined = wkspConfig.get("runParallel");
    if (runParallelCfg === undefined)
      throw "runParallel is undefined";


    this.justMyCode = justMyCodeCfg;
    this.runParallel = runParallelCfg;

    const runAllAsOneCfg: boolean | undefined = getActualWorkspaceSetting(wkspConfig, "runAllAsOne");
    if (this.runParallel && runAllAsOneCfg === undefined)
      this.runAllAsOne = false;
    else
      this.runAllAsOne = runAllAsOneCfg === undefined ? true : runAllAsOneCfg;


    this.workspaceRelativeFeaturesPath = featuresPathCfg.trim().replace(/^\\|^\//, "").replace(/\\$|\/$/, "");
    this.featuresUri = vscode.Uri.joinPath(wkspUri, this.workspaceRelativeFeaturesPath);
    if (!fs.existsSync(this.featuresUri.fsPath)) {
      // note - this error should never happen or some logic/hooks are wrong (or the user has actually deleted/moved the features path since loading).
      // the existence of the path should always be checked by getUrisOfWkspFoldersWithFeatures(true)
      // before we get here (i.e. called elsewhere when workspace folders/settings are changed etc.)    
      this._errors.push(`FATAL ERROR: features path ${this.featuresUri.fsPath} not found.`);
      fatal = true;
    }

    if (fastSkipListCfg) {
      if (!fastSkipListCfg.includes("@") || fastSkipListCfg.length < 2) {
        this._errors.push("Invalid FastSkipList setting ignored.");
      }
      else {
        try {
          const skipList = fastSkipListCfg.replace(/\s*,\s*/g, ",").trim().split(",");
          let invalid = false;
          skipList.forEach(s => {
            s = s.trim();
            if (s !== "" && !s.startsWith("@"))
              invalid = true;
          });
          if (invalid)
            this._errors.push("Invalid FastSkipList setting ignored.");
          else
            this.fastSkipList = skipList.filter(s => s !== "");
        }
        catch {
          this._errors.push("Invalid FastSkipList setting ignored.");
        }
      }
    }

    if (envVarListCfg) {
      if (!envVarListCfg.includes(":") || !envVarListCfg.includes("'") || envVarListCfg.length < 7) {
        this._errors.push("Invalid EnvVarList setting ignored.");
      }
      else {
        try {
          const re = /(?:\s*,?)(?:\s*')(.*?)(?:'\s*)(?::\s*')(.*?)(?:'\s*)/g;
          const escape = "#^@";
          const escaped = envVarListCfg.replace(/\\'/g, escape);

          let matches;
          while ((matches = re.exec(escaped))) {
            if (matches.length !== 3)
              throw null;
            const name = matches[1].trim();
            if (name.length === 0) {
              throw null;
            }
            const value = matches[2].replace(escape, "'");
            diagLog(`${name}='${value}'`);
            this.envVarList[name] = value;
          }

        }
        catch {
          this._errors.push("Invalid EnvVarList setting ignored.");
        }
      }
    }

    this.logUserSettings(logger, fatal, winSettings);
  }


  logUserSettings(logger: Logger, fatal: boolean, winSettings: WindowSettings) {

    let nonUserSettable: string[] = [];

    // build output dict of user-settable properties for window settings
    nonUserSettable = [];
    const winSettingsDic: { [name: string]: string; } = {};
    const winEntries = Object.entries(winSettings).sort()
    winEntries.forEach(([key, value]) => {
      if (!key.startsWith("_") && !nonUserSettable.includes(key)) {
        winSettingsDic[key] = value;
      }
    });

    const wkspUris = getUrisOfWkspFoldersWithFeatures();
    if (wkspUris.length > 0 && this.uri === wkspUris[0])
      logger.logInfoAllWksps(`\nglobal (window) settings:\n${JSON.stringify(winSettingsDic, null, 2)}`);

    // build output dict of user-settable properties for workspace settings 
    nonUserSettable = ["name", "uri", "featuresUri"];
    const wkspSettingsDic: { [name: string]: string; } = {};
    const wkspEntries = Object.entries(this).sort();
    wkspEntries.forEach(([key, value]) => {
      if (!key.startsWith("_") && !nonUserSettable.includes(key)) {
        const name = key === "workspaceRelativeFeaturesPath" ? "featuresPath" : key;
        wkspSettingsDic[name] = value;
      }
    });

    logger.logInfo(`\n${this.name} (resource) settings:\n${JSON.stringify(wkspSettingsDic, null, 2)}`, this.uri);
    logger.logInfo(`fullFeaturesPath: ${this.featuresUri.fsPath}`, this.uri);

    if (winSettings.showConfigurationWarnings) {

      let warned = false;
      logger.logInfo("\n", this.uri);

      if (this.runParallel && this.runAllAsOne) {
        warned = true;
        logger.logWarn("WARNING: runParallel is overridden by runAllAsOne when you run all tests at once.", this.uri);
      }

      if (this.fastSkipList.length > 0 && this.runAllAsOne) {
        warned = true;
        logger.logWarn("WARNING: fastSkipList has no effect when you run all tests at once and runAllAsOne is enabled (or when debugging).", this.uri);
      }

      if (!this.runParallel && !this.runAllAsOne) {
        warned = true;
        logger.logWarn("WARNING: runParallel and runAllAsOne are both disabled. This will give the slowest performance.", this.uri);
      }

      if (warned)
        logger.logInfo(`(You can turn off configuration warnings via the extension setting ${EXTENSION_NAME}.showConfigurationWarnings.)`, this.uri);
    }

    if (winSettings.errors.length > 0)
      logger.logError(new WkspError(winSettings.errors.join("\n"), this.uri));

    if (this._errors.length > 0)
      logger.logError(new WkspError(this._errors.join("\n"), this.uri));

    // shouldn't get here for featurePath problems, see comment for featuresPath fatal error above
    if (fatal)
      throw new WkspError(`Fatal error due to invalid workspace setting in workspace "${this.name}", cannot continue. See previous error for more details.`, this.uri);

  }

}

