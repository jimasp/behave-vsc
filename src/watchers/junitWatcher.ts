import * as vscode from 'vscode';
import * as fs from 'fs';
import { uriId } from '../common/helpers';
import { services } from '../services';
import { xRayLog, LogType } from '../common/logger';
import { QueueItemMapEntry, parseJunitFileAndUpdateTestResults, updateTestResultsForUnreadableJunitFile } from "../parsers/junitParser";
import { performance } from 'perf_hooks';



export function getJunitDirUri(): vscode.Uri {
  return vscode.Uri.joinPath(services.config.extensionTempFilesUri, "junit");
}


export function getJunitProjRunDirUri(run: vscode.TestRun, projName: string): vscode.Uri {
  return vscode.Uri.joinPath(getJunitRunDirUri(run), projName);
}


function getJunitRunDirUri(run: vscode.TestRun): vscode.Uri {
  if (!run.name)
    throw "run.name is undefined";
  return vscode.Uri.joinPath(getJunitDirUri(), run.name);
}


class Run {
  // NOTE: runs are not necessarily one-at-a-time but also staggered, for example a
  // user can click to start one workspace/feature/scenario, then then click to run another
  // (staggered workspace runs are simulated/tested by "Integration Tests: multiroot workspace")
  constructor(
    public readonly run: vscode.TestRun,
    public readonly debug: boolean,
    public queue: QueueItemMapEntry[] = [],
  ) { }
}


let watcher: vscode.FileSystemWatcher | undefined = undefined;
const DETECT_FILE = "bvsc.detect.me.xml";


export class JunitWatcher {

  private _currentRuns: Run[] = [];
  private _foldersWaitingForWatcher = new Set<string>();
  private _watcherEvents: vscode.Disposable[] = [];
  private _firstRun = true;


  public dispose() {
    xRayLog("junitWatcher: disposing");
    this._watcherEvents.forEach(e => e.dispose());
    watcher?.dispose();
    if (services.config.isIntegrationTestRun) {
      xRayLog("Integration test run complete.\n");
      xRayLog('NOTE: if next line says "canceled" AND you did not stop the run, then check for previous errors in the log.');
    }
  }


  // do not make this method async, it is called from activate()
  startWatchingJunitFolder() {

    if (watcher) // simple singleton check
      throw "there should only ever be one junitWatcher per extension instance";

    const junitDirectoryUri = getJunitDirUri();
    const pattern = new vscode.RelativePattern(junitDirectoryUri, '**/*.xml');
    watcher = vscode.workspace.createFileSystemWatcher(pattern, false, false, true);
    this._watcherEvents.push(watcher.onDidCreate((uri) => this._updateResult(uri, "onDidCreate")));
    this._watcherEvents.push(watcher.onDidChange((uri) => this._updateResult(uri, "onDidChange")));
    xRayLog(`junitWatcher: watcher pattern is ${vscode.Uri.joinPath(pattern.baseUri, pattern.pattern).fsPath}`);

    // we want a generous timeout here, because the filesystemwatcher can take a while to "wake up" on extension 
    // start up. (a user will not wait for that long, as it is not checked until startWatchingRun)
    this._waitForFolderWatch(junitDirectoryUri, 10000);
  }


  async startWatchingRun(run: vscode.TestRun, debug: boolean, projNamesInRun: string[], queueItemMap: QueueItemMapEntry[]) {
    // method called when a test run/debug session is starting.

    // add the run and wait for the watcher to be ready
    this._currentRuns.push(new Run(run, debug, queueItemMap));
    xRayLog(`junitWatcher: run ${run.name} added to currentRuns list`);

    if (!this._firstRun) {
      await vscode.workspace.fs.createDirectory(getJunitRunDirUri(run));
      for (const projName of projNamesInRun) {
        const junitProjRunDirUri = getJunitProjRunDirUri(run, projName);
        await vscode.workspace.fs.createDirectory(junitProjRunDirUri);
      }
      return;
    }

    this._firstRun = false;
    await this._waitForWatcher(run, projNamesInRun);
  }


  async stopWatchingRun(run: vscode.TestRun) {
    // method called when a test run/debug session is ending

    let stoppedRun: Run | undefined;

    try {

      stoppedRun = this._currentRuns.find(cr => cr.run.name === run.name);
      if (!stoppedRun)
        throw `junitWatcher: runEnded() could not find a current run with name "${run.name}"`

      // get a refreshed notUpdated list
      const notUpdated = () => stoppedRun?.queue.filter(q => !q.updated) ?? [];

      // behave only just ended, give the file system watcher a small grace period to catch up.
      // note that run stop/debug stop buttons always wait the full grace period for updates from junit files that will never be written
      // so setting the grace period too high will make the buttons sluggish. also if the watcher is not working then setting the grace too 
      // high will cause the test updates and run end to be slowed down. 
      // so keep the grace period low (<=500ms) for a good user experience.
      const poll = 50;
      const grace = services.config.isIntegrationTestRun ? 2000 : 400; // give more time if an integration test to avoid throwing false positives       
      for (let ms = 0; ms < grace; ms += poll) {
        await new Promise(r => setTimeout(r, poll));
        if (notUpdated().length === 0)
          return;
      }

      const notUpdatedAfterGrace = notUpdated();
      if (services.config.exampleProject && notUpdatedAfterGrace.length === stoppedRun.queue.length &&
        fs.existsSync(notUpdatedAfterGrace[0].junitFileUri.fsPath)) {
        debugger; // eslint-disable-line no-debugger          
        throw `No test results were updated by _updateResult for ${run.name}. If you did not hit run stop or debug stop, ` +
        `then either there was a previous error (see log), or the file system watcher is not raising events.`;
      }

      if (notUpdatedAfterGrace.length === 0)
        return;

      // force any updates that the filesystemwatcher did not trigger yet, before we remove the run from the list
      xRayLog(`junitWatcher: run ${run.name} ending, checking for existence of ${notUpdatedAfterGrace.length} junit ` +
        `files for outstanding test updates, and updating test results when a file is found`);
      const start = performance.now();

      const updates: Promise<void>[] = [];
      for (const qim of notUpdatedAfterGrace) {
        updates.push((async () => {
          if (fs.existsSync(qim.junitFileUri.fsPath)) {
            await this._updateResult(qim.junitFileUri, "runEnded");
          }
          else if (!stoppedRun.run.token.isCancellationRequested && !stoppedRun.debug) {
            // junit file does not exist, so if the run was not stopped, and it's not a debug run, then there was an 
            // error executing behave - so set the test result to error.
            // (unfortunately, in the case of a debug run, we don't know if the run reached its end or debug stop was clicked 
            // because the vscode onDidTerminateDebugSession event doesn't tell us, so we just have to assume debug stop 
            // was clicked and that is why the junit file was not written. any error will still display to 
            // the user in the debug console if they open it.)
            updateTestResultsForUnreadableJunitFile(qim.projSettings, stoppedRun.run, [qim.queueItem], qim.junitFileUri);
          }
        })());
      }
      await Promise.all(updates);

      const waited = performance.now() - start;
      xRayLog(`junitWatcher: run ${run.name} ending, updating tests results took ${waited}ms`);

    }
    finally {
      // all updates done, remove the run from the list
      // (the run will end after this method returns, and you cannot update tests on a run that has ended)
      this._currentRuns = this._currentRuns.filter(x => x.run !== run);
      xRayLog(`junitWatcher: run ${run.name} removed from currentRuns list`);
    }
  }


  async _waitForWatcher(run: vscode.TestRun, projNamesInRun: string[]) {
    // this method protects against starting a run before the watcher is ready (or times out)

    if (!watcher)
      throw "junitWatcher: watcher is undefined";

    const junitDirUri = getJunitDirUri();
    while (this._foldersWaitingForWatcher.has(uriId(junitDirUri))) {
      await new Promise(r => setTimeout(r, 100));
    }

    const junitRunDirUri = getJunitRunDirUri(run);
    if (!await this._waitForFolderWatch(junitRunDirUri, 3000))
      return;

    const waits: Promise<boolean>[] = [];
    for (const projName of projNamesInRun) {
      const junitProjRunDirUri = getJunitProjRunDirUri(run, projName);
      waits.push(this._waitForFolderWatch(junitProjRunDirUri, 2000));
    }
    await Promise.all(waits);

  }


  async _waitForFolderWatch(folderUri: vscode.Uri, timeout: number): Promise<boolean> {
    // create detection files, and WAIT for the watcher to detect one.
    // if the watcher does not detect any files within a short time, then timeout so the run does not get stuck. 
    // if it does timeout, i.e. the filesystemwatcher is not working, then the run will still work but some or all of the test 
    // results will not be updated until the run ends, giving a poor user experience.

    const fileUris: vscode.Uri[] = [];

    try {

      this._foldersWaitingForWatcher.add(uriId(folderUri));
      let detected = false;

      const poll = 100;
      for (let ms = 0; ms < timeout; ms += poll) {
        detected = !this._foldersWaitingForWatcher.has(uriId(folderUri));
        if (detected)
          break;
        const fileUri = vscode.Uri.joinPath(folderUri, `${ms}.${DETECT_FILE}`);
        await vscode.workspace.fs.writeFile(fileUri, Buffer.from("<detect_me/>"));
        fileUris.push(fileUri);
        xRayLog("junitWatcher: writing " + fileUri.fsPath);
        await new Promise(r => setTimeout(r, poll));
      }

      if (detected)
        return true;

      const msg = `junitWatcher: waiting for path ${folderUri.fsPath} to be watched - timed out. ` +
        `some or all test results may not be updated until the run has ended.`;
      xRayLog(msg, undefined, LogType.warn);

      if (services.config.exampleProject) {
        debugger; // eslint-disable-line no-debugger
        throw msg;
      }

      return false;
    }
    finally {
      for (const f of fileUris) {
        try {
          await vscode.workspace.fs.delete(f);
        }
        catch (e: unknown) {
          //
        }
      }
      this._foldersWaitingForWatcher.delete(uriId(folderUri));
    }

  }


  async _updateResult(uri: vscode.Uri, caller: string) {
    // re-entrant updater method

    if (uri.fsPath.endsWith(DETECT_FILE)) {
      const parentFolderId = uriId(vscode.Uri.file(uri.path.substring(0, uri.path.lastIndexOf('/'))));
      if (this._foldersWaitingForWatcher.has(parentFolderId)) {
        this._foldersWaitingForWatcher.delete(parentFolderId);
        xRayLog(`junitWatcher: _updateResult() watcher successfully detected file ${uri.fsPath}`);
      }
      return;
    }

    let matchedRun: Run | undefined;

    try {

      const matches = this._currentRuns.map(cr => {
        const filter = cr.queue.filter(m => uriId(m.junitFileUri) === uriId(uri));
        if (filter.length > 0) {
          if (matchedRun && cr !== matchedRun)
            throw `junitWatcher: _updateResult(${caller}) called for file ${uri.fsPath}, but it matched multiple runs`;
          matchedRun = cr;
        }
        return filter;
      }).flat();

      // no match = run has been removed by stopWatchingRun (which will have already updated the tests for this file)
      if (!matchedRun)
        return;

      // one junit file is created per feature, so update all tests belonging to this feature
      const matchedQueueItems = matches.map(m => m.queueItem);
      const projSettings = matches[0].projSettings;
      await parseJunitFileAndUpdateTestResults(projSettings, matchedRun.run, matchedRun.debug, uri, matchedQueueItems);
      for (const match of matches) {
        xRayLog(`junitWatcher: run ${matchedRun.run.name} - updateResult(${caller}) updated the result for ${match.queueItem.test.id}`);
        match.updated = true;
      }

    }
    catch (e: unknown) {
      const err = new Error(`junitWatcher error:${e as string}, caller:${caller}, file:${uri.fsPath}, run:${matchedRun?.run.name}`);
      matchedRun?.run.end();
      // entry point function (handler) - show error
      services.logger.showError(err);
    }

  }


}


