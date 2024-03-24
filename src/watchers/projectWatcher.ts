import * as vscode from 'vscode';
import { services } from "../common/services";
import { xRayLog, LogType } from '../common/logger';
import { TestData } from '../parsers/testFile';
import { deleteStepsAndStepMappingsForStepsFile } from '../parsers/stepMappings';
import { isExcludedPath, isStepsFile, pathExists } from '../common/helpers';
import { BEHAVE_CONFIG_FILES_PRECEDENCE } from '../behaveLogic';



export class ProjectWatcher {

  #watcherEvents: vscode.Disposable[] = [];
  #watcher: vscode.FileSystemWatcher | undefined = undefined;

  private constructor(
    watcher: vscode.FileSystemWatcher,
    watcherEvents: vscode.Disposable[]
  ) {
    this.#watcher = watcher;
    this.#watcherEvents = watcherEvents;
  }

  public dispose() {
    xRayLog("junitWatcher: disposing");
    this.#watcherEvents.forEach(e => e.dispose());
    this.#watcher?.dispose();
  }

  public static create(projUri: vscode.Uri, ctrl: vscode.TestController, testData: TestData): ProjectWatcher {
    const projectPattern = new vscode.RelativePattern(projUri, `**`);
    const watcher = vscode.workspace.createFileSystemWatcher(projectPattern);
    const watcherEvents = ProjectWatcher.setWatcherEventHandlers(watcher, projUri, ctrl, testData);
    const projectWatcher = new ProjectWatcher(watcher, watcherEvents);
    return projectWatcher;
  }

  static setWatcherEventHandlers(watcher: vscode.FileSystemWatcher, projUri: vscode.Uri, ctrl: vscode.TestController,
    testData: TestData): vscode.Disposable[] {

    const events: vscode.Disposable[] = [];

    events.push(watcher.onDidCreate(async (uri) => {
      // onDidCreate fires on either new file/folder creation OR rename (inc. git actions)
      // (bear in mind that an entire folder tree can copied in one go)    
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

        if (await isStepsFile(uri)) {
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
        // in cases where this assumption is wrong, then the user will have to refresh the test explorer manually.
        // (".py" is handled above via isStepsFile)
        if (deletedPathWasProbablyAFile(uri.path) && !uri.path.endsWith(".feature"))
          return;

        // deleted feature/steps file (or folder), reparse the entire project to rebuild the test tree
        //await services.config.reloadSettings(projUri);
        // no need to await the parse
        services.parser.parseFilesForProject(projUri, ctrl, testData, "OnDidDelete", false);
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
      // we'll have one watcher per project root and use this handleIt function as a filter.
      // *** THIS FUNCTION SHOULD RETURN FAST *** (i.e. early exits where possible) as 
      // it is called for EVERY project file/folder change

      // get the latest project settings (this project watcher has a lifetime as long as the extension)
      const projSettings = await services.config.getProjectSettings(projUri);

      if (isExcludedPath(projSettings.excludedPathPatterns, uri.path)) {
        return false;
      }

      if (uri.path.endsWith(".tmp")) // vscode file history file 
        return false;

      for (const configFile of BEHAVE_CONFIG_FILES_PRECEDENCE) {
        const configPath = `${projSettings.behaveWorkingDirUri.path}/${configFile}`;
        if (uri.path.startsWith(configPath)) {
          if (services.config.isIntegrationTestRun)
            return false; // don't reload when integration tests change the behave.ini file
          xRayLog(`behave config file change detected: ${uri.path} - reloading settings and reparsing project`, projUri);
          await services.config.reloadSettings(projUri);
          services.parser.parseFilesForProject(projUri, ctrl, testData, "shouldHandleIt - configFile", false);
          return false;
        }
      }

      // (*_environment = a stage environment file like stage1_environment.py etc.)
      if (/(.*\/(steps$|environment\.py$|_environment\.py$))/.test(uri.path.toLowerCase())) {
        // environment.py affects the baseDir, so reload settings and reparse
        await services.config.reloadSettings(projUri);
        services.parser.parseFilesForProject(projUri, ctrl, testData, "shouldHandleIt - environment", false);
        return false;
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
      services.parser.reparseFile(uri, testData, "watcher event > reparseTheFile");
    }

    return events;
  }

}

