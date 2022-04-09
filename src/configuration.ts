import * as path from 'path';
import * as os from 'os';
import * as vscode from 'vscode';
import * as fs from 'fs';
import { logUserSettings } from './helpers';

const EXTENSION_NAME = "behave-vsc";
const EXTENSION_FULL_NAME = "jimasp.behave-vsc";
const EXTENSION_FRIENDLY_NAME = "Behave VSC";
const MSPY_EXT = "ms-python.python";


const getWorkspaceFolder = () => {
  const wsf = vscode.workspace.workspaceFolders;
  if (wsf && wsf?.length > 0)
    return wsf[0];
  throw new Error("Could not resolve workspace folder");
}

export interface ExtensionConfiguration {
  readonly extensionName: string;
  readonly extensionFullName: string;
  readonly extensionFriendlyName: string;
  readonly debugOutputFilePath: string;
  readonly logger: Logger;
  readonly userSettings: UserSettings;
  readonly workspaceFolder: vscode.WorkspaceFolder;
  readonly workspaceFolderPath: string;
  reloadUserSettings(testConfig: vscode.WorkspaceConfiguration | undefined): void;
  getPythonExec(): Promise<string>;
}


class Configuration implements ExtensionConfiguration {
  public readonly extensionName = EXTENSION_NAME;
  public readonly extensionFullName = EXTENSION_FULL_NAME;
  public readonly extensionFriendlyName = EXTENSION_FRIENDLY_NAME;
  public readonly debugOutputFilePath = path.join(os.tmpdir(), EXTENSION_NAME);
  public readonly logger: Logger = new Logger();
  private static _userSettings: UserSettings | undefined = undefined;

  private static _configuration?: Configuration;

  private constructor() {
    Configuration._configuration = this;
    console.log("Configuration singleton constructed (this should only fire once except for test runs)");
  }

  static get configuration() {
    if (Configuration._configuration)
      return Configuration._configuration;

    Configuration._configuration = new Configuration();
    return Configuration._configuration;
  }

  // called by onDidChangeConfiguration
  public reloadUserSettings(testConfig: vscode.WorkspaceConfiguration | undefined = undefined) {
    if (!testConfig)
      Configuration._userSettings = new UserSettings(vscode.workspace.getConfiguration(EXTENSION_NAME), this.logger);
    else
      Configuration._userSettings = new UserSettings(testConfig, this.logger);

    this.logger.clear();
    this.logger.logInfo("Settings change detected.")
    logUserSettings();
  }

  public get userSettings() {
    return Configuration._userSettings
      ? Configuration._userSettings
      : Configuration._userSettings = new UserSettings(vscode.workspace.getConfiguration(EXTENSION_NAME), this.logger);
  }

  // WE ONLY SUPPORT A SINGLE WORKSPACE FOLDER ATM
  public get workspaceFolder(): vscode.WorkspaceFolder {
    return getWorkspaceFolder();
  }

  public get workspaceFolderPath(): string {
    return this.workspaceFolder.uri.fsPath;
  }


  // note - this can be changed dynamically by the user, so don't store the result
  public getPythonExec = async (): Promise<string> => {
    return await getPythonExecutable(this.logger, this.workspaceFolder.uri);
  }
}


class Logger {

  private outputChannel: vscode.OutputChannel = vscode.window.createOutputChannel(EXTENSION_FRIENDLY_NAME);
  public run: vscode.TestRun | undefined = undefined;

  show = () => {
    this.outputChannel.show();
  }

  clear = () => {
    console.clear();
    this.outputChannel.clear();
  }

  logInfo = (text: string) => {
    console.log(text);
    this.outputChannel.appendLine(text);
    if (this.run)
      this.run?.appendOutput(text);
  }

  logError = (msgOrError: unknown, prependMsg = "") => {

    let text = (msgOrError instanceof Error ? (msgOrError.stack ? msgOrError.stack : msgOrError.message) : msgOrError as string);
    if (prependMsg)
      text = `${prependMsg}\n${text}`;

    console.error(text);
    const ocHighlight = "\x1b \x1b \x1b \x1b \x1b \x1b \x1b";
    this.outputChannel.appendLine(ocHighlight);
    this.outputChannel.appendLine(text);
    this.outputChannel.appendLine(ocHighlight);
    this.outputChannel.show(true);
    vscode.debug.activeDebugConsole.appendLine(text);
    if (this.run)
      this.run?.appendOutput(text);
  }
}


class UserSettings {
  public envVarList: { [name: string]: string } = {};
  public fastSkipList: string[] = [];
  public featuresPath = "features";
  public fullFeaturesPath: string; // not set by user, derived from featuresPath
  public justMyCode: boolean;
  public runAllAsOne: boolean;
  public runParallel: boolean;
  constructor(wsConfig: vscode.WorkspaceConfiguration, logger: Logger) {

    const envVarListCfg: string | undefined = wsConfig.get("envVarList");
    const fastSkipListCfg: string | undefined = wsConfig.get("fastSkipList");
    const featuresPathCfg: string | undefined = wsConfig.get("featuresPath");
    const justMyCodeCfg: boolean | undefined = wsConfig.get("justMyCode");
    const runAllAsOneCfg: boolean | undefined = wsConfig.get("runAllAsOne");
    const runParallelCfg: boolean | undefined = wsConfig.get("runParallel");

    this.justMyCode = justMyCodeCfg === undefined ? true : justMyCodeCfg;
    this.runAllAsOne = runAllAsOneCfg === undefined ? true : runAllAsOneCfg;
    this.runParallel = runParallelCfg === undefined ? false : runParallelCfg;

    if (featuresPathCfg) {

      const path = featuresPathCfg.trim().replace(/^\/|\/$/g, "");
      const fullPath = vscode.Uri.joinPath(getWorkspaceFolder().uri, path).path;

      // note - we can't use vscode.workspace.fs here because that's an async func and we are in a constructor
      if (fs.existsSync(fullPath)) {
        this.featuresPath = path;
      }
      else {
        logger.logError(`Invalid featuresPath '${featuresPathCfg}' setting ignored.\nMust be a relative path within the workspace.\n` +
          "Defaulting to 'features' path instead.");
      }
    }

    this.fullFeaturesPath = vscode.Uri.joinPath(getWorkspaceFolder().uri, this.featuresPath).path;


    if (fastSkipListCfg) {
      if (fastSkipListCfg.indexOf("@") === -1 || fastSkipListCfg.length < 2) {
        logger.logError("Invalid FastSkipList setting ignored.");
      }
      else {
        try {
          const skipList = fastSkipListCfg.replace(/\s*,\s*/g, ",").trim().split(",");
          let invalid = false;
          skipList.forEach(s => { s = s.trim(); if (s !== "" && !s.trim().startsWith("@")) invalid = true; });
          if (invalid)
            logger.logError("Invalid FastSkipList setting ignored.");
          else
            this.fastSkipList = skipList.filter(s => s !== "");
        }
        catch {
          logger.logError("Invalid FastSkipList setting ignored.");
        }
      }
    }

    if (envVarListCfg) {
      if (envVarListCfg.indexOf(":") === -1 || envVarListCfg.indexOf("'") === -1 || envVarListCfg.length < 7) {
        logger.logError("Invalid EnvVarList setting ignored.");
      }
      else {
        try {
          const escape = "#^@";
          const envList = envVarListCfg.replace(/'\s*:\s*'/g, "':'").replace(/'\s*,\s*'/g, "','").trim();
          envList.split("',").filter(s => s.trim() !== "").map(s => {
            s = s.replace(/\\'/g, escape);
            const e = s.split("':");
            const name = e[0].trim().replace(/'/g, "").replace(escape, "'");
            const value = e[1].trim().replace(/'/g, "").replace(escape, "'");
            console.log(`${name}='${value}'`)
            this.envVarList[name] = value;
          });
        }
        catch {
          logger.logError("Invalid EnvVarList setting ignored.");
        }
      }
    }
  }
}

const getPythonExecutable = async (logger: Logger, scope: vscode.Uri) => {

  const pyext = vscode.extensions.getExtension(MSPY_EXT);


  if (!pyext) {
    const msg = EXTENSION_FRIENDLY_NAME + " could not find required dependency " + MSPY_EXT;
    vscode.window.showErrorMessage(msg);
    logger.logError(msg);
    return undefined;
  }

  if (!pyext.isActive) {
    await pyext?.activate();
    if (!pyext.isActive) {
      const msg = EXTENSION_FRIENDLY_NAME + " could not activate required dependency " + MSPY_EXT;
      vscode.window.showErrorMessage(msg);
      logger.logError(msg);
      return undefined;
    }
  }

  const pythonExec = await pyext?.exports.settings.getExecutionDetails(scope).execCommand[0];
  if (!pythonExec) {
    const msg = EXTENSION_FRIENDLY_NAME + " failed to obtain python executable from " + MSPY_EXT;
    vscode.window.showErrorMessage(msg);
    logger.logError(msg);
    return undefined;
  }

  return pythonExec;
}


export default Configuration.configuration;


