import * as vscode from 'vscode';
import { BEHAVE_CONFIG_FILES, isFeatureFile, isStepsFile } from '../common';
import { config } from "../configuration";
import { diagLog, DiagLogType } from '../logger';
import { FileParser } from '../parsers/fileParser';
import { TestData } from '../parsers/testFile';
import { deleteStepsAndStepMappingsForStepsFile } from '../parsers/stepMappings';



export function startWatchingProject(projUri: vscode.Uri, ctrl: vscode.TestController, testData: TestData,
  parser: FileParser): vscode.FileSystemWatcher[] {

  const projSettings = config.projectSettings[projUri.path];

  const reparseTheFile = async (uri: vscode.Uri) => {
    if (uri.scheme !== "file")
      return;

    diagLog(`reparsing file: ${uri.fsPath}`, projUri, DiagLogType.info);
    parser.reparseFile(uri, undefined, projSettings, testData, ctrl);
  }


  const setEventHandlers = (watcher: vscode.FileSystemWatcher) => {

    // fires on either new file/folder creation OR rename (inc. git actions)
    // (bear in mind that an entire folder tree can copied in one go)
    watcher.onDidCreate(async (uri) => {
      try {
        const lcPath = uri.path.toLowerCase();
        const isFolder = (await vscode.workspace.fs.stat(uri)).type === vscode.FileType.Directory;
        if (isFolder || /(environment|_environment)\.py$/.test(lcPath)) {
          config.reloadSettings(projSettings.uri);
          parser.parseFilesForProject(projUri, testData, ctrl, "OnDidCreate", false);
          return;
        }

        reparseTheFile(uri);
      }
      catch (e: unknown) {
        // entry point function (handler) - show error
        config.logger.showError(e, projUri);
      }

    });

    // fires on file save ONLY (inc. git actions)
    watcher.onDidChange(async (uri) => {
      try {
        reparseTheFile(uri);
      }
      catch (e: unknown) {
        // entry point function (handler) - show error
        config.logger.showError(e, projUri);
      }
    });

    // fires on either file/folder delete OR move/rename (inc. git actions)
    // (bear in mind that an entire folder tree can renamed/moved in one go)    
    watcher.onDidDelete(async (uri) => {
      if (uri.scheme !== "file")
        return;

      try {
        const lcPath = uri.path.toLowerCase();
        if (isStepsFile(uri)) {
          deleteStepsAndStepMappingsForStepsFile(uri);
          return;
        }

        // we want folders in our pattern to be watched as e.g. renaming a folder does not raise events for child 
        // files, but we cannot determine if this is a file or folder deletion as:
        //   (a) it has been deleted so we can't stat it, and 
        //   (b) "." is valid in folder names so we can't determine by looking at the path
        // but we can ignore specific file extensions or paths we know we don't care about
        if (lcPath.endsWith(".tmp")) // .tmp = vscode file history file
          return;

        // deletion of a feature file (need to rebuild test tree, possibly inc. parent folder nodes), 
        // or deletion of a folder inside a steps/feature folder (or the steps/feature folder itself), 
        // any of these require a full reparse of the project
        config.reloadSettings(projUri);
        parser.parseFilesForProject(projUri, testData, ctrl, "OnDidDelete", false);
      }
      catch (e: unknown) {
        // entry point function (handler) - show error
        config.logger.showError(e, projUri);
      }
    });

  }

  const watchers: vscode.FileSystemWatcher[] = [];

  // watch for feature file changes anywhere because although one feature file must exist somewhere for 
  // the extension to be acivated we cannot use that as a watch path, because after startup stuff can 
  // be moved around, e.g. a features folder could be renamed, or another top-level features folder could 
  // be created that did not exist on start up etc. and we can't predict the folder name/structure they will be created in.
  // this watcher will trigger events as required to rediscover feature files (these events will also cause 
  // steps files paths to be recalculated, e.g. see configurationChangedHandler)
  const featureFilePattern = new vscode.RelativePattern(projUri, `**/*.feature`);
  const featuresFileWatcher = vscode.workspace.createFileSystemWatcher(featureFilePattern);
  setEventHandlers(featuresFileWatcher);
  watchers.push(featuresFileWatcher);

  for (const relFeaturesPath of projSettings.relativeFeatureFolders) {
    // watch for FOLDER changes in features folders, e.g. ./features or ./features/mysubfolder
    const featureStepsFolderPattern = new vscode.RelativePattern(projUri, `${relFeaturesPath}/**`);
    const featuresStepsFolderWatcher = vscode.workspace.createFileSystemWatcher(featureStepsFolderPattern);
    setEventHandlers(featuresStepsFolderWatcher);
    watchers.push(featuresStepsFolderWatcher);
  }

  for (const relStepsPath of projSettings.relativeStepsFolders) {
    // watch for non-features-child steps files, e.g. ./steps or ./lib/mysteplib
    // (** pattern to watch for FOLDER changes AND steps (.py) files)
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
    parser.parseFilesForProject(projUri, testData, ctrl, "behaveConfigChange", false);
  }

  return watchers;
}