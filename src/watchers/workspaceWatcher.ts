import * as vscode from 'vscode';
import { StepsDirIsInsideFeaturesFolder, basename, isFeatureFile, isStepsFile } from '../common';
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
      if (uri.path.endsWith("/steps") || uri.path.endsWith("environment.py")) {
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
        const path = uri.path.toLowerCase();

        // we want folders in our pattern to be watched as e.g. renaming a folder does not raise events for child 
        // files, but we cannot determine if this is a file or folder deletion as:
        //   (a) it has been deleted so we can't stat it, and 
        //   (b) "." is valid in folder names so we can't determine by looking at the path
        // but we can ignore specific file extensions or paths we know we don't care about
        if (path.endsWith(".tmp")) // .tmp = vscode file history file
          return;

        // log for extension developers in case we need to add another file type above
        if (basename(uri).includes(".") && !isFeatureFile(uri) && !isStepsFile(uri)) {
          diagLog(`detected deletion of unanticipated file type, uri: ${uri}`, wkspUri, DiagLogType.warn);
        }

        if (path.endsWith("/steps") || path.endsWith("environment.py"))
          config.reloadSettings(wkspSettings.uri);

        parser.parseFilesForWorkspace(wkspUri, testData, ctrl, "OnDidDelete", false);
      }
      catch (e: unknown) {
        // entry point function (handler) - show error
        config.logger.showError(e, wkspUri);
      }
    });

  }

  // NOTE - ** is because we want to watch our for FOLDER changes, not just .feature and .py files
  const featureFolderPattern = new vscode.RelativePattern(wkspSettings.uri, `${wkspSettings.workspaceRelativeFeaturesPath}/**`);
  const featuresFolderWatcher = vscode.workspace.createFileSystemWatcher(featureFolderPattern);
  const watchers = [featuresFolderWatcher];
  setEventHandlers(featuresFolderWatcher);

  let separateStepsFolderWatcher: vscode.FileSystemWatcher | undefined;
  if (!StepsDirIsInsideFeaturesFolder(wkspSettings)) {
    // steps folder is not in features folder, so need another watcher
    // NOTE - ** is because we want to watch out for FOLDER changes, not just .py file changes
    const stepsFolderPattern = new vscode.RelativePattern(wkspSettings.uri, `${wkspSettings.workspaceRelativeStepsSearchPath}/**`);
    separateStepsFolderWatcher = vscode.workspace.createFileSystemWatcher(stepsFolderPattern);
    setEventHandlers(separateStepsFolderWatcher);
    watchers.push(separateStepsFolderWatcher);
  }

  for (const stepsFolder of wkspSettings.workspaceRelativeStepLibraryPaths) {
    const stepsFolderPattern = new vscode.RelativePattern(wkspSettings.uri, `${stepsFolder}/**`);
    const stepsFolderWatcher = vscode.workspace.createFileSystemWatcher(stepsFolderPattern);
    setEventHandlers(stepsFolderWatcher);
    watchers.push(stepsFolderWatcher);
  }

  return watchers;
}
