import * as vscode from 'vscode';
import { xRayLog } from '../common/logger';
import { getParentProjectUri } from '../common/helpers';


export class NonProjectFolderWatcher {

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
    xRayLog("projectWatcher: disposing");
    this.#watcherEvents.forEach(e => e.dispose());
    this.#watcher.dispose();
  }

  public static create(folderUri: vscode.Uri, featureFileCreatedHandler: (uri: vscode.Uri) => void): NonProjectFolderWatcher {

    // a "project" is a workspace folder with a .feature file in it
    // this watcher checks for non-project folders becoming projects by watching for new .feature files being created

    const pattern = new vscode.RelativePattern(folderUri, "**/*.feature");
    const watcher = vscode.workspace.createFileSystemWatcher(pattern);
    const watcherEvents: vscode.Disposable[] = [];
    watcherEvents.push(watcher.onDidCreate(async (uri) => featureFileCreatedHandler(getParentProjectUri(uri))));
    return new NonProjectFolderWatcher(watcher, watcherEvents);
  }

}