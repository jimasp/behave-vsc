import * as vscode from 'vscode';
import { services } from "../common/services";
import { xRayLog, LogType } from '../common/logger';
import { TestData } from '../parsers/testFile';
import { deleteStepsAndStepMappingsForStepsFile } from '../parsers/stepMappings';
import { isStepsFile, urisMatch } from '../common/helpers';
import { BEHAVE_CONFIG_FILES_PRECEDENCE } from '../behaveLogic';
import { ProjectSettings } from '../config/settings';


export class ProjectWatcher {

  #projectWatchers: FolderWatcher[] = [];

  private constructor(projectWatchers: FolderWatcher[]) {
    this.#projectWatchers = projectWatchers;
  }

  public dispose() {
    this.#projectWatchers.forEach(pw => pw.dispose());
  }

  public static create(ps: ProjectSettings, ctrl: vscode.TestController, testData: TestData,
    featuresOrStepsFolderRenameHandler: () => void): ProjectWatcher {

    // we don't want to watch the whole project as that would create loads of file watcher handles,
    // so we'll just watch the known features and steps folders
    const paths = ps.projRelativeFeatureFolders.concat(ps.projRelativeStepsFolders);
    const folderWatchers = paths.map(projRelPath => FolderWatcher.create(ps, projRelPath, ctrl, testData, featuresOrStepsFolderRenameHandler));
    return new ProjectWatcher(folderWatchers);
  }
}


class FolderWatcher {

  #watcherEvents: vscode.Disposable[] = [];
  #watcher: vscode.FileSystemWatcher;

  private constructor(
    watcher: vscode.FileSystemWatcher,
    watcherEvents: vscode.Disposable[]
  ) {
    this.#watcher = watcher;
    this.#watcherEvents = watcherEvents;
  }

  public dispose() {
    xRayLog("ProjectWatcher: disposing");
    this.#watcherEvents.forEach(e => e.dispose());
    this.#watcher.dispose();
  }


  public static create(ps: ProjectSettings, projRelPath: string, ctrl: vscode.TestController, testData: TestData,
    featuresOrStepsFolderRenamedHandler: () => void): FolderWatcher {

    const pattern = new vscode.RelativePattern(ps.uri, projRelPath + "/**");
    const watcher = vscode.workspace.createFileSystemWatcher(pattern);
    const watcherEvents = FolderWatcher.#setWatcherEventHandlers(watcher, ps.uri, ctrl, testData, featuresOrStepsFolderRenamedHandler);

    // add extra handler for the features folders or steps folder themselves being deleted
    // (the projectWatcher can't do this itself because its optimised to only watch inside the 
    // features/steps folders, not the entire project)

    watcherEvents.push(vscode.workspace.onDidDeleteFiles(async (e) => {
      const fullPath = vscode.Uri.joinPath(ps.uri, projRelPath);
      e.files.forEach(async (file) => {
        if (urisMatch(file, fullPath)) {
          featuresOrStepsFolderRenamedHandler();
          return;
        }
      });
    }));


    return new FolderWatcher(watcher, watcherEvents);
  }

  static #setWatcherEventHandlers(watcher: vscode.FileSystemWatcher, projUri: vscode.Uri, ctrl: vscode.TestController,
    testData: TestData, featuresOrStepsFolderRenamedHandler: () => void): vscode.Disposable[] {

    const events: vscode.Disposable[] = [];


    // onDidDelete fires on: file/folder delete/move/rename
    // (bear in mind that an entire folder tree can renamed/moved in one go)            
    events.push(watcher.onDidDelete(async (uri) => reparseAsNeeded(uri, true)));

    // onDidCreate fires on: file/folder create/copy/move/rename
    // (bear in mind that an entire folder tree can copied/renamed/moved in one go)    
    events.push(watcher.onDidCreate(async (uri) => reparseAsNeeded(uri, false)));

    // onDidChange fires on: file content change only
    events.push(watcher.onDidChange(async (uri) => reparseAsNeeded(uri, false)));


    const reparseAsNeeded = async (uri: vscode.Uri, isDelete: boolean): Promise<void> => {

      // NOTE: ORDER OF IF STATEMENTS IS IMPORTANT IN SOME CASES, AS A 
      // SUBSEQUENT IF MAY FORM PART OF THE ELIMINATION LOGIC OF A PREVIOUS IF (VIA RETURN STATEMENT)
      // (see comments that state "at this point" below)

      try {
        if (uri.scheme !== "file")
          return;

        if (uri.path.endsWith(".tmp")) // vscode file history file 
          return;

        // get the latest project settings (this project watcher has a lifetime as long as the extension)
        const ps = await services.config.getProjectSettings(projUri);

        for (const configFile of BEHAVE_CONFIG_FILES_PRECEDENCE) {
          const configPath = `${ps.behaveWorkingDirUri.path}/${configFile}`;
          if (uri.path.startsWith(configPath)) {
            if (services.config.isIntegrationTestRun)
              return; // don't reload when integration tests change the behave.ini file
            xRayLog(`behave config file change detected: ${uri.path} - reloading settings and reparsing project`, projUri);
            await services.config.reloadSettings(projUri);
            services.parser.parseFilesForProject(projUri, ctrl, testData, "reparseAsNeeded - configFile", false);
            return;
          }
        }

        // if steps folder itself (not descendents), or environment.py, or e.g. stage1_environment.py
        if (/(.*\/(steps$|environment\.py$|_environment\.py$))/.test(uri.path.toLowerCase())) {
          // steps/environment.py affects the baseDir, so reload settings and reparse project
          await services.config.reloadSettings(projUri);
          services.parser.parseFilesForProject(projUri, ctrl, testData, "reparseAsNeeded - steps/environment", false);
          return;
        }

        // if uri is the features/steps folder itself (not descendents) then reload settings and reparse project
        const projRelPath = uri.path.substring(ps.uri.path.length + 1);
        if (ps.projRelativeFeatureFolders.some(f => f === projRelPath) ||
          ps.projRelativeStepsFolders.some(f => f === projRelPath) ||
          ps.projRelativeBehaveWorkingDirPath === projRelPath) {
          featuresOrStepsFolderRenamedHandler();
          return;
        }

        // at this point, we've dealt with special case files and folders, now act on deletes
        if (isDelete) {
          if (await isStepsFile(uri)) {
            deleteStepsAndStepMappingsForStepsFile(uri);
            return;
          }

          // notes: 
          // (a) deleting/renaming a folder does not raise events for descendent files and folders.
          // (b) any of these events would ideally start a full reparse of the project:
          //    - deletion of a feature file (need to rebuild test tree, possibly inc. parent folder tree nodes), or
          //    - deletion of a folder inside a steps/feature folder
          // (c) we cannot properly determine if this is a file or folder deletion as:
          //     - it has been deleted so we can't stat it, and 
          //     - "." is valid in folder names so we can't really determine by looking at the path.      
          // so we'll do a best guess via deletedPathWasProbablyAFile, i.e. if the path is not a feature file, and the 
          // last part of the path contains ".", then for efficiency we'll *assume* it's a file and not a folder and do nothing.
          // in cases where this assumption is wrong, then the user will have to refresh the test explorer manually.
          // (".py" is handled above via isStepsFile)
          if (deletedPathWasProbablyAFile(uri.path) && !uri.path.endsWith(".feature"))
            return;

          // deleted feature file (or folder), reparse the entire project to rebuild the test tree
          await services.config.reloadSettings(projUri);
          services.parser.parseFilesForProject(projUri, ctrl, testData, "reparseAsNeeded", false);

          return;
        }

        // at this point, it's not a special case and it's not a delete, so if its a steps/feature file, then just reparse the file
        if (uri.path.endsWith(".py") || uri.path.endsWith(".feature")) {
          reparseTheFile(uri);
          return;
        }

        // at this point, we know the path is inside a steps/feature folder but is not a .feature or steps (.py) file, 
        // so now we're only interested in folder changes.
        // we also know this is not a delete event at this point, so we know we can stat.
        const stat = await vscode.workspace.fs.stat(uri);
        console.log(stat.type);
        if (stat.type !== vscode.FileType.Directory)
          return;

        // There's been a folder change inside project steps/feature folders - reparse everything in this project to rebuild the test tree.
        // await services.config.reloadSettings(projUri);
        services.parser.parseFilesForProject(projUri, ctrl, testData, "reparseAsNeeded", false);
      }
      catch (e: unknown) {
        // caller is an unawaited entry point (event handler) without its own error handler (to avoid duplication) - show error
        services.logger.logError(e, projUri);
      }
    }


    function deletedPathWasProbablyAFile(path: string) {
      const parts = path.split('/');
      const lastPart = parts[parts.length - 1];
      return lastPart.includes('.');
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

