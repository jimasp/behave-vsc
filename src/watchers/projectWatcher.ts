import * as vscode from 'vscode';
import { services } from "../services";
import { xRayLog, LogType } from '../common/logger';
import { TestData } from '../parsers/testFile';
import { deleteStepsAndStepMappingsForStepsFile } from '../parsers/stepMappings';
import { isStepsFile } from '../common/helpers';
import { BEHAVE_CONFIG_FILES_PRECEDENCE } from '../behaveLogic';



export class ProjectWatcher {

  #watcherEvents: vscode.Disposable[] = [];
  #watcher: vscode.FileSystemWatcher | undefined = undefined;

  constructor(projUri: vscode.Uri, ctrl: vscode.TestController, testData: TestData) {
    const projectPattern = new vscode.RelativePattern(projUri, `**`);
    this.#watcher = vscode.workspace.createFileSystemWatcher(projectPattern);
    this.#watcherEvents = this._setWatcherEventHandlers(this.#watcher, projUri, ctrl, testData);
  }

  public dispose() {
    xRayLog("junitWatcher: disposing");
    this.#watcherEvents.forEach(e => e.dispose());
    this.#watcher?.dispose();
  }


  _setWatcherEventHandlers(watcher: vscode.FileSystemWatcher, projUri: vscode.Uri, ctrl: vscode.TestController,
    testData: TestData): vscode.Disposable[] {

    const projSettings = services.config.projectSettings[projUri.path];
    const events: vscode.Disposable[] = [];

    events.push(watcher.onDidCreate(async (uri) => {
      // onDidCreate fires on either new file/folder creation OR rename (inc. git actions)
      // (bear in mind that an entire folder tree can copied in one go)    
      try {
        if (!await shouldHandleIt(uri))
          return;
        const lcPath = uri.path.toLowerCase();
        const isFolder = (await vscode.workspace.fs.stat(uri)).type === vscode.FileType.Directory;
        if (isFolder || /(environment|_environment)\.py$/.test(lcPath)) {
          // reparse the entire project        
          services.config.reloadSettings(projSettings.uri);
          services.parser.parseFilesForProject(projUri, testData, ctrl, "OnDidCreate", false);
          return;
        }

        reparseTheFile(uri);
      }
      catch (e: unknown) {
        // unawaited entry point (event handler) - show error
        services.logger.showError(e, projUri);
      }

    }));

    events.push(watcher.onDidChange(async (uri) => {
      // onDidChange fires on file save ONLY (inc. git actions)    
      try {
        if (!await shouldHandleIt(uri))
          return;
        reparseTheFile(uri);
      }
      catch (e: unknown) {
        // unawaited entry point (event handler) - show error
        services.logger.showError(e, projUri);
      }
    }));

    events.push(watcher.onDidDelete(async (uri) => {
      // onDidDelete fires on either file/folder delete OR move/rename (inc. git actions)
      // (bear in mind that an entire folder tree can renamed/moved in one go)        
      try {
        if (!await shouldHandleIt(uri))
          return;
        if (uri.scheme !== "file")
          return;

        if (isStepsFile(uri)) {
          deleteStepsAndStepMappingsForStepsFile(uri);
          return;
        }

        // notes: 
        // (a) deleting/renaming a folder does not raise events for descendent files and folders.
        // (b) any of these events would ideally start a full reparse of the project:
        //    - deletion of a feature file (need to rebuild test tree, possibly inc. parent folder tree nodes), or
        //    - deletion of a folder inside a steps/feature folder, or
        //    - deletion of the steps/feature folder itself 
        // (c) we cannot properly determine if this is a file or folder deletion as:
        //     - it has been deleted so we can't stat it, and 
        //     - "." is valid in folder names so we can't really determine by looking at the path.      
        // so we'll do a best guess via deletedPathWasProbablyAFile, i.e. if the path is not a feature file, and the 
        // last part of the path contains ".", then for efficiency we'll *assume* it's a file and not a folder and do nothing.
        // (in cases where this assumption is wrong, then the user will have to refresh the test explorer manually)
        if (deletedPathWasProbablyAFile(uri.path) && !uri.path.endsWith(".feature"))
          return;

        // deleted feature file (or folder), reparse the entire project
        services.config.reloadSettings(projUri);
        services.parser.parseFilesForProject(projUri, testData, ctrl, "OnDidDelete", false);
      }
      catch (e: unknown) {
        // unawaited entry point (event handler) - show error
        services.logger.showError(e, projUri);
      }
    }));


    function deletedPathWasProbablyAFile(path: string) {
      const parts = path.split('/');
      const lastPart = parts[parts.length - 1];
      return lastPart.includes('.');
    }


    const shouldHandleIt = async (uri: vscode.Uri): Promise<boolean> => {
      // multiple watchers are not needed, because for a given project, all the files and folders we are 
      // interested in are in the same project root, so we'll just have one watcher 
      // for the project root and use this handleIt function as a filter.
      // THIS FUNCTION SHOULD RETURN FAST (i.e. early exits where possible) as it is called for every project file/folder change

      if (uri.path.endsWith(".tmp")) // vscode file history file (and we also use .tmp in our integration tests for behave.ini backup)
        return false;

      for (const configFile of BEHAVE_CONFIG_FILES_PRECEDENCE) {
        const configPath = `${projSettings.workingDirUri.path}/${configFile}`;
        if (uri.path.startsWith(configPath)) {
          if (services.config.isIntegrationTestRun)
            return false; // don't reload when integration tests change the behave.ini file
          xRayLog(`behave config file change detected: ${uri.path} - reloading settings and reparsing project`, projUri);
          services.config.reloadSettings(projUri);
          services.parser.parseFilesForProject(projUri, testData, ctrl, "behaveConfigChange", false);
          return false; // just handled it
        }
      }

      // if it's not a behave config file change then we're only interested in steps/feature folders or their descendants
      const relFolderPaths = projSettings.projRelativeFeatureFolders.concat(projSettings.projRelativeStepsFolders);
      if (!relFolderPaths.some(relPath => uri.path.startsWith(`${projUri.path}/${relPath}`)))
        return false;

      if (uri.path.endsWith(".feature") || uri.path.endsWith(".py"))
        return true;

      // if we've got this far, then we know the path is inside a steps/feature folder    
      // but not a .feature or steps (.py) file, so now we're only interested in folder changes
      try {
        const stat = await vscode.workspace.fs.stat(uri);
        if (stat.type !== vscode.FileType.Directory)
          return false;
      }
      catch (e: unknown) {
        // deleted - could have been a file or folder, so we can't filter it out
      }

      return true;
    }


    const reparseTheFile = async (uri: vscode.Uri) => {
      if (uri.scheme !== "file")
        return;
      xRayLog(`reparsing file: ${uri.fsPath}`, projUri, LogType.info);
      services.parser.reparseFile(uri, testData, ctrl, "watcher event > reparseTheFile");
    }

    return events;
  }

}

