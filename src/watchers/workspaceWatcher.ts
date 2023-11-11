import * as vscode from 'vscode';
import { BEHAVE_CONFIG_FILES, basename, isFeatureFile, isStepsFile } from '../common';
import { config } from "../configuration";
import { diagLog, DiagLogType } from '../logger';
import { FileParser } from '../parsers/fileParser';
import { TestData } from '../parsers/testFile';


export function startWatchingWorkspace(wkspUri: vscode.Uri, ctrl: vscode.TestController, testData: TestData,
  parser: FileParser): vscode.FileSystemWatcher[] {

  const wkspSettings = config.workspaceSettings[wkspUri.path];

  const updater = async (uri: vscode.Uri) => {
    if (uri.scheme !== "file")
      return;

    try {
      console.log(`updater: ${uri.fsPath}`);
      parser.reparseFile(uri, undefined, wkspSettings, testData, ctrl);
    }
    catch (e: unknown) {
      // entry point function (handler) - show error
      config.logger.showError(e, wkspUri);
    }
  }


  const setEventHandlers = (watcher: vscode.FileSystemWatcher) => {

    // fires on either new file/folder creation OR rename (inc. git actions)
    watcher.onDidCreate(uri => {
      const lcPath = uri.path.toLowerCase();
      if (lcPath.endsWith("/steps") || lcPath.endsWith("environment.py")) {
        config.reloadSettings(wkspSettings.uri);
        parser.parseFilesForWorkspace(wkspUri, testData, ctrl, "OnDidCreate", false);
        return;
      }
      updater(uri);
    });

    // fires on file save (inc. git actions)
    watcher.onDidChange(uri => updater(uri));

    // fires on either file/folder delete OR rename (inc. git actions)
    watcher.onDidDelete(uri => {
      if (uri.scheme !== "file")
        return;

      try {
        const lcPath = uri.path.toLowerCase();

        // we want folders in our pattern to be watched as e.g. renaming a folder does not raise events for child 
        // files, but we cannot determine if this is a file or folder deletion as:
        //   (a) it has been deleted so we can't stat it, and 
        //   (b) "." is valid in folder names so we can't determine by looking at the path
        // but we can ignore specific file extensions or paths we know we don't care about
        if (lcPath.endsWith(".tmp")) // .tmp = vscode file history file
          return;

        // log for extension developers in case we need to add another file type above
        if (basename(uri).includes(".") && !isFeatureFile(uri) && !isStepsFile(uri)) {
          diagLog(`detected deletion of unanticipated file type, uri: ${uri}`, wkspUri, DiagLogType.warn);
        }

        if (lcPath.endsWith("/steps") || lcPath.endsWith("environment.py"))
          config.reloadSettings(wkspSettings.uri);

        parser.parseFilesForWorkspace(wkspUri, testData, ctrl, "OnDidDelete", false);
      }
      catch (e: unknown) {
        // entry point function (handler) - show error
        config.logger.showError(e, wkspUri);
      }
    });

  }

  const watchers: vscode.FileSystemWatcher[] = [];

  // NOTE - for all watchers we use the pattern ** because we want watch our for 
  // FOLDER changes, as well as changes to .feature and .py files
  for (const relFeaturesPath of wkspSettings.projectRelativeFeaturePaths) {
    const featureFolderPattern = new vscode.RelativePattern(wkspSettings.uri, `${relFeaturesPath}/**`);
    const featuresFolderWatcher = vscode.workspace.createFileSystemWatcher(featureFolderPattern);
    watchers.push(featuresFolderWatcher);
    setEventHandlers(featuresFolderWatcher);
  }

  for (const relStepsPath of wkspSettings.projectRelativeAdditionalStepsPaths) {
    const stepsFolderPattern = new vscode.RelativePattern(wkspSettings.uri, `${relStepsPath}/**`);
    const siblingStepsFolderWatcher = vscode.workspace.createFileSystemWatcher(stepsFolderPattern);
    setEventHandlers(siblingStepsFolderWatcher);
    watchers.push(siblingStepsFolderWatcher);
  }


  for (const configFile of BEHAVE_CONFIG_FILES) {
    const configFilePattern = new vscode.RelativePattern(wkspSettings.uri, `${configFile}`);
    const configFileWatcher = vscode.workspace.createFileSystemWatcher(configFilePattern);
    configFileWatcher.onDidCreate(() => config.reloadSettings(wkspSettings.uri));
    configFileWatcher.onDidChange(() => config.reloadSettings(wkspSettings.uri));
    configFileWatcher.onDidDelete(() => config.reloadSettings(wkspSettings.uri));
    watchers.push(configFileWatcher);
  }

  return watchers;
}