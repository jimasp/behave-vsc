import vscode from 'vscode';
import { xRayLog } from '../common/logger';


export class NonProjectWatcher {

  #watcherEvents: vscode.Disposable[] = [];
  #watcher: vscode.FileSystemWatcher;

  private constructor(watcher: vscode.FileSystemWatcher) {
    this.#watcher = watcher;
  }

  public dispose() {
    xRayLog("NonProjectWatcher: disposing");
    this.#watcherEvents.forEach(e => e.dispose());
    this.#watcher.dispose();
  }

  public static create(folderUri: vscode.Uri, promoteToProjectHandler: (uri: vscode.Uri,
    nonProjectWatcher: NonProjectWatcher) => void): NonProjectWatcher {

    // a "project" is a workspace folder with a .feature file in it
    // this watcher enables non-project folders to be promoted to projects by watching for new .feature files being created

    const pattern = new vscode.RelativePattern(folderUri, "**/*.feature");
    const watcher = vscode.workspace.createFileSystemWatcher(pattern);
    const watcherEvents: vscode.Disposable[] = [];
    const nonProjectWatcher = new NonProjectWatcher(watcher);

    watcherEvents.push(watcher.onDidCreate(() => promoteToProjectHandler(folderUri, nonProjectWatcher)));

    nonProjectWatcher.#watcherEvents = watcherEvents;
    return nonProjectWatcher;
  }

}