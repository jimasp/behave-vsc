import * as vscode from 'vscode';
import { BEHAVE_CONFIG_FILES, basename, isFeatureFile, isStepsFile } from '../common';
import { config } from "../configuration";
import { diagLog, DiagLogType } from '../logger';
import { FileParser } from '../parsers/fileParser';
import { TestData } from '../parsers/testFile';


export function startWatchingProject(projUri: vscode.Uri, ctrl: vscode.TestController, testData: TestData,
  parser: FileParser): vscode.FileSystemWatcher[] {

  const projSettings = config.projectSettings[projUri.path];

  const updater = async (uri: vscode.Uri) => {
    if (uri.scheme !== "file")
      return;
    console.log(`updater: ${uri.fsPath}`);
    parser.reparseFile(uri, undefined, projSettings, testData, ctrl);
  }


  const setEventHandlers = (watcher: vscode.FileSystemWatcher, excludeExtension?: string) => {

    // fires on either new file/folder creation OR rename (inc. git actions)
    watcher.onDidCreate(uri => {
      try {
        const lcPath = uri.path.toLowerCase();
        if (excludeExtension && lcPath.endsWith(excludeExtension))
          return;

        if (lcPath.endsWith("/steps") || lcPath.endsWith("environment.py")) {
          config.reloadSettings(projSettings.uri);
          parser.parseFilesForWorkspace(projUri, testData, ctrl, "OnDidCreate", false);
          return;
        }
        updater(uri);
      }
      catch (e: unknown) {
        // entry point function (handler) - show error
        config.logger.showError(e, projUri);
      }

    });

    // fires on file save (inc. git actions)
    watcher.onDidChange(uri => {
      try {
        const lcPath = uri.path.toLowerCase();
        if (excludeExtension && lcPath.endsWith(excludeExtension))
          return;

        updater(uri);
      }
      catch (e: unknown) {
        // entry point function (handler) - show error
        config.logger.showError(e, projUri);
      }
    });

    // fires on either file/folder delete OR rename (inc. git actions)
    watcher.onDidDelete(uri => {
      if (uri.scheme !== "file")
        return;

      try {
        const lcPath = uri.path.toLowerCase();
        if (excludeExtension && lcPath.endsWith(excludeExtension))
          return;

        // we want folders in our pattern to be watched as e.g. renaming a folder does not raise events for child 
        // files, but we cannot determine if this is a file or folder deletion as:
        //   (a) it has been deleted so we can't stat it, and 
        //   (b) "." is valid in folder names so we can't determine by looking at the path
        // but we can ignore specific file extensions or paths we know we don't care about
        if (lcPath.endsWith(".tmp")) // .tmp = vscode file history file
          return;

        // log for extension developers in case we need to add another file type above
        if (basename(uri).includes(".") && !isFeatureFile(uri) && !isStepsFile(uri)) {
          diagLog(`detected deletion of unanticipated file type, uri: ${uri}`, projUri, DiagLogType.warn);
        }

        if (lcPath.endsWith("/steps") || lcPath.endsWith("environment.py"))
          config.reloadSettings(projUri);

        parser.parseFilesForWorkspace(projUri, testData, ctrl, "OnDidDelete", false);
      }
      catch (e: unknown) {
        // entry point function (handler) - show error
        config.logger.showError(e, projUri);
      }
    });

  }

  const watchers: vscode.FileSystemWatcher[] = [];

  // watch for feature file changes anywhere because they may not exist when 
  // we start up and we can't predict the folder name/structure they will be created in
  const featureFilePattern = new vscode.RelativePattern(projUri, `**/*.feature`);
  const featuresFileWatcher = vscode.workspace.createFileSystemWatcher(featureFilePattern);
  watchers.push(featuresFileWatcher);
  setEventHandlers(featuresFileWatcher);

  for (const relFeaturesPath of projSettings.relativeFeatureFolders) {
    // watch for features-child steps files, e.g. features/steps or myfeatures/subfolder/steps
    // (** pattern because we want watch our for FOLDER changes, as well as changes to .py files)
    const featureStepsFolderPattern = new vscode.RelativePattern(projUri, `${relFeaturesPath}/**`);
    const featuresStepsFolderWatcher = vscode.workspace.createFileSystemWatcher(featureStepsFolderPattern);
    watchers.push(featuresStepsFolderWatcher);
    setEventHandlers(featuresStepsFolderWatcher, ".feature"); // exclude feature files (already watched by featuresFileWatcher)
  }

  for (const relStepsPath of projSettings.relativeStepsFoldersOutsideFeatureFolders) {
    // watch for non-features-child steps files, e.g. ./steps or lib/mysteplib
    // (** pattern because we want watch our for FOLDER changes, as well as changes to .py files)
    const otherStepsFolderPattern = new vscode.RelativePattern(projUri, `${relStepsPath}/**`);
    const otherStepsFolderWatcher = vscode.workspace.createFileSystemWatcher(otherStepsFolderPattern);
    setEventHandlers(otherStepsFolderWatcher);
    watchers.push(otherStepsFolderWatcher);
  }

  for (const configFile of BEHAVE_CONFIG_FILES) {
    // watch for behave config file changes
    const configFilePattern = new vscode.RelativePattern(projUri, `${configFile}`);
    const configFileWatcher = vscode.workspace.createFileSystemWatcher(configFilePattern);
    configFileWatcher.onDidCreate(behaveConfigChange);
    configFileWatcher.onDidChange(behaveConfigChange);
    configFileWatcher.onDidDelete(behaveConfigChange);
    watchers.push(configFileWatcher);
  }

  function behaveConfigChange() {
    config.reloadSettings(projUri);
    parser.parseFilesForWorkspace(projUri, testData, ctrl, "behaveConfigChange", false);
  }

  return watchers;
}