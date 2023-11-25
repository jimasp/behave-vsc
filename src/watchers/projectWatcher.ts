import * as vscode from 'vscode';
import { BEHAVE_CONFIG_FILES, isStepsFile } from '../common';
import { config } from "../configuration";
import { diagLog, DiagLogType } from '../logger';
import { FileParser } from '../parsers/fileParser';
import { TestData } from '../parsers/testFile';
import { deleteStepsAndStepMappingsForStepsFile } from '../parsers/stepMappings';



export function startWatchingProject(projUri: vscode.Uri, ctrl: vscode.TestController, testData: TestData,
  parser: FileParser): vscode.FileSystemWatcher {

  const projectPattern = new vscode.RelativePattern(projUri, `**`);
  const projectWatcher = vscode.workspace.createFileSystemWatcher(projectPattern);
  setWatcherEventHandlers(projectWatcher, projUri, ctrl, testData, parser);
  return projectWatcher;
}


const setWatcherEventHandlers = (watcher: vscode.FileSystemWatcher, projUri: vscode.Uri, ctrl: vscode.TestController, testData: TestData,
  parser: FileParser) => {

  const projSettings = config.projectSettings[projUri.path];

  watcher.onDidCreate(async (uri) => {
    // onDidCreate fires on either new file/folder creation OR rename (inc. git actions)
    // (bear in mind that an entire folder tree can copied in one go)    
    try {
      if (!await handleIt(uri))
        return;
      const lcPath = uri.path.toLowerCase();
      const isFolder = (await vscode.workspace.fs.stat(uri)).type === vscode.FileType.Directory;
      if (isFolder || /(environment|_environment)\.py$/.test(lcPath)) {
        // reparse the entire project        
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

  watcher.onDidChange(async (uri) => {
    // onDidChange fires on file save ONLY (inc. git actions)    
    try {
      if (!await handleIt(uri))
        return;
      reparseTheFile(uri);
    }
    catch (e: unknown) {
      // entry point function (handler) - show error
      config.logger.showError(e, projUri);
    }
  });

  watcher.onDidDelete(async (uri) => {
    // onDidDelete fires on either file/folder delete OR move/rename (inc. git actions)
    // (bear in mind that an entire folder tree can renamed/moved in one go)        
    try {
      if (!await handleIt(uri))
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

      // reparse the entire project
      config.reloadSettings(projUri);
      parser.parseFilesForProject(projUri, testData, ctrl, "OnDidDelete", false);
    }
    catch (e: unknown) {
      // entry point function (handler) - show error
      config.logger.showError(e, projUri);
    }
  });


  function deletedPathWasProbablyAFile(path: string) {
    const parts = path.split('/');
    const lastPart = parts[parts.length - 1];
    return lastPart.includes('.');
  }


  const handleIt = async (uri: vscode.Uri): Promise<boolean> => {
    // multiple watchers are expensive, and for a given project, all the files and folders we are 
    // interested in are in the same project root, so we'll just have one watcher 
    // for the project root and use this handleIt function as a filter.

    if (uri.path.endsWith(".feature"))
      return true;

    if (uri.path.endsWith(".tmp")) // vscode file history file
      return false;

    for (const configFile of BEHAVE_CONFIG_FILES) {
      const configPath = `${projUri.path}/${configFile}`;
      if (uri.path.startsWith(configPath)) {
        // reparse the entire project        
        config.reloadSettings(projUri);
        parser.parseFilesForProject(projUri, testData, ctrl, "behaveConfigChange", false);
        return false; // already handled
      }
    }

    // at this point we're only interested in steps/feature folders or their descendants
    const relFolderPaths = projSettings.relativeFeatureFolders.concat(projSettings.relativeStepsFolders);
    if (!relFolderPaths.some(relPath => uri.path.startsWith(`${projUri.path}/${relPath}`)))
      return false;

    // .py file in a steps folder (inc. feature/steps)
    if (uri.path.endsWith(".py"))
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
    diagLog(`reparsing file: ${uri.fsPath}`, projUri, DiagLogType.info);
    parser.reparseFile(uri, undefined, projSettings, testData, ctrl);
  }

}