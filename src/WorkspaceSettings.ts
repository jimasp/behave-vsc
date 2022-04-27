import * as vscode from 'vscode';
import * as fs from 'fs';
import { getWorkspaceFolderUris } from './helpers';
import { Logger } from './Logger';
import { EXTENSION_NAME } from './Configuration';



export class WorkspaceSettings {
  // user-settable
  public envVarList: { [name: string]: string; } = {};
  public showConfigurationWarnings: boolean;
  public fastSkipList: string[] = [];
  public featuresPath = "features";
  public justMyCode: boolean;
  public runAllAsOne: boolean;
  public runParallel: boolean;
  public runWorkspacesInParallel: boolean;
  // other public properties
  public uri: vscode.Uri;
  public name: string;
  public fullFeaturesPath: string;
  // internal
  private _errors: string[] = [];
  private _logger: Logger;

  constructor(wkspUri: vscode.Uri, wsConfig: vscode.WorkspaceConfiguration, logger: Logger) {

    this._logger = logger;
    this.uri = wkspUri;

    const wsFolder = vscode.workspace.getWorkspaceFolder(wkspUri);
    if (!wsFolder)
      throw new Error("No workspace folder found for uri " + wkspUri.path);
    this.name = wsFolder.name;

    const envVarListCfg: string | undefined = wsConfig.get("envVarList");
    const fastSkipListCfg: string | undefined = wsConfig.get("fastSkipList");
    const featuresPathCfg: string | undefined = wsConfig.get("featuresPath");
    const justMyCodeCfg: boolean | undefined = wsConfig.get("justMyCode");
    const runAllAsOneCfg: boolean | undefined = wsConfig.get("runAllAsOne");
    const runParallelCfg: boolean | undefined = wsConfig.get("runParallel");
    const runWorkspacesInParallelCfg: boolean | undefined = wsConfig.get("runWorkspacesInParallel"); // (not a workspace-specific setting)
    const showConfigurationWarningsCfg: boolean | undefined = wsConfig.get("showConfigurationWarnings");

    this.showConfigurationWarnings = showConfigurationWarningsCfg === undefined ? true : showConfigurationWarningsCfg;
    this.justMyCode = justMyCodeCfg === undefined ? true : justMyCodeCfg;
    this.runAllAsOne = runAllAsOneCfg === undefined ? true : runAllAsOneCfg;
    this.runParallel = runParallelCfg === undefined ? false : runParallelCfg;
    this.runWorkspacesInParallel = runWorkspacesInParallelCfg === undefined ? true : runWorkspacesInParallelCfg;

    if (featuresPathCfg)
      this.featuresPath = featuresPathCfg.trim().replace(/\\$|\/$/, "");
    this.fullFeaturesPath = vscode.Uri.joinPath(wkspUri, this.featuresPath).path;
    if (!fs.existsSync(this.fullFeaturesPath))
      this._errors.push(`FATAL ERROR: features path ${this.fullFeaturesPath} not found.`);


    if (fastSkipListCfg) {
      if (!fastSkipListCfg.includes("@") || fastSkipListCfg.length < 2) {
        this._errors.push("Invalid FastSkipList setting ignored.");
      }
      else {
        try {
          const skipList = fastSkipListCfg.replace(/\s*,\s*/g, ",").trim().split(",");
          let invalid = false;
          skipList.forEach(s => {
            s = s.trim(); if (s !== "" && !s.trim().startsWith("@"))
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
            console.log(`${name}='${value}'`);
            this.envVarList[name] = value;
          }

        }
        catch {
          this._errors.push("Invalid EnvVarList setting ignored.");
        }
      }
    }

    this.logUserSettings();
  }

  logUserSettings() {

    const entries = Object.entries(this).sort();

    const dic: { [name: string]: string; } = {};

    entries.forEach(([key, value]) => {
      // remove non-user-settable properties
      if (!key.startsWith("_") && key !== "name" && key !== "runWorkspacesInParallel" && key !== "fullFeaturesPath"
        && key !== "uri" && key !== "fullWorkingDirectoryPath")
        dic[key] = value;
    });

    const wsUris = getWorkspaceFolderUris();
    if (wsUris.length > 0 && this.uri === wsUris[0])
      this._logger.logInfo(`\nMulti-root workspace settings:\n{\n  "runWorkspacesInParallel": ${this.runWorkspacesInParallel}\n}`);

    this._logger.logInfo(`\n${this.name} settings:\n${JSON.stringify(dic, null, 2)}`);
    this._logger.logInfo(`fullFeaturesPath: ${this.fullFeaturesPath}`);

    if (this.showConfigurationWarnings) {
      let warned = false;
      if (this.runParallel && this.runAllAsOne) {
        warned = true;
        this._logger.logWarn("\nWarning: runParallel is overridden by runAllAsOne when you run all tests at once.");
      }

      if (this.fastSkipList.length > 0 && this.runAllAsOne) {
        warned = true;
        this._logger.logWarn("Warning: fastSkipList has no effect when you run all tests at once and runAllAsOne is enabled (or when debugging).");
      }

      if (warned)
        this._logger.logInfo(`(You can turn off configuration warnings via the extension setting ${EXTENSION_NAME}.showConfigurationWarnings.)`);
    }

    if (this._errors && this._errors.length > 0) {
      this._logger.logError(`${this._errors.join("\n")}`);
    }
  }

}
