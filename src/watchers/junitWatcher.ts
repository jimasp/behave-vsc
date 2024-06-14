
import * as vscode from 'vscode';
import * as fs from 'fs';
import { uriId } from '../common/helpers';
import { services } from '../common/services';
import { xRayLog, LogType } from '../common/logger';
import { QueueItemMapEntry, parseJunitFileAndUpdateTestResults, updateTestResultsForUnreadableJunitFile } from "../parsers/junitParser";
import { performance } from 'perf_hooks';


export function getJunitDirUri(): vscode.Uri {
  return vscode.Uri.joinPath(services.config.extensionTempDirUri, "junit");
}

export function getJunitProjRunDirUri(projTestRun: vscode.TestRun): vscode.Uri {
  if (!projTestRun.name)
    throw new Error("run.name is undefined");
  return vscode.Uri.joinPath(getJunitDirUri(), projTestRun.name);
}


class Run {
  constructor(
    public readonly projTestRun: vscode.TestRun,
    public readonly debug: boolean,
    public queue: QueueItemMapEntry[] = [],
  ) { }
}


export class JunitWatcher {

  static #instance: JunitWatcher | null = null;

  readonly #DETECT_FILE = "bvsc.detect.me.xml";
  readonly #watcherEvents: vscode.Disposable[] = [];
  readonly #foldersWaitingForWatcher = new Set<string>();

  #currentRuns: Run[] = [];
  #watcher: vscode.FileSystemWatcher | undefined = undefined;


  public dispose() {
    xRayLog("junitWatcher: disposing");
    this.#watcherEvents.forEach(e => e.dispose());
    this.#watcher?.dispose();
    if (services.config.isIntegrationTestRun) {
      xRayLog("Integration test run complete.\n");
      xRayLog('NOTE: if next line says "canceled" (sic) or "Channel has been closed" AND you did not stop the run, then check for ' +
        'any previous errors that stopped the run early.')
    }
  }


  startWatchingJunitFolder() {
    // called on startup ONLY, watches the root junit directory
    try {
      if (JunitWatcher.#instance)
        throw new Error("there should only ever be one junitWatcher per extension instance");
      JunitWatcher.#instance = this;

      // (do NOT await this)
      this.#startJunitFolderWatch();

      return JunitWatcher.#instance;
    }
    catch (e: unknown) {
      // unawaited async function (handler) - show error
      services.logger.logError(e);
    }
  }


  async startWatchingRun(projTestRun: vscode.TestRun, debug: boolean, queueItemMap: QueueItemMapEntry[]) {
    // method called when a test run/debug session is starting.
    // add the run and wait for the watcher to be ready

    this.#currentRuns.push(new Run(projTestRun, debug, queueItemMap));
    xRayLog(`junitWatcher: run ${projTestRun.name} added to currentRuns list`);
    const junitProjRunDirUri = getJunitProjRunDirUri(projTestRun);
    await vscode.workspace.fs.createDirectory(junitProjRunDirUri);
    await this.#waitForWatcher(projTestRun);
  }


  async stopWatchingRun(run: vscode.TestRun) {
    // method called when a test run/debug session is ending

    let stoppedRun: Run | undefined;

    try {

      stoppedRun = this.#currentRuns.find(cr => cr.projTestRun.name === run.name);
      if (!stoppedRun)
        throw new Error(`junitWatcher: runEnded() could not find a current run with name "${run.name}"`);

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
        throw new Error(`No test results were updated by _updateResult for ${run.name}.If you did not hit run stop or debug stop, ` +
          `then either there was a previous error(see log), or the file system watcher is not raising events.`);
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
            await this.#updateResult(qim.junitFileUri, "runEnded");
            return;
          }
          if (!stoppedRun.debug && !stoppedRun.projTestRun.token.isCancellationRequested) {
            // junit file does not exist, so if the run was not stopped, and it's not a debug run, then there was an 
            // error executing behave - so set the test result to error.
            // (unfortunately, in the case of a debug run, if the run was not cancelled via the run tests stop button, 
            // then we don't know if the run reached its end or debug stop was clicked 
            // because the vscode onDidTerminateDebugSession event doesn't tell us, so we just have to assume debug stop 
            // was clicked and that is why the junit file was not written. any error will still display to 
            // the user in the debug console if they open it.)
            updateTestResultsForUnreadableJunitFile(qim.projSettings, stoppedRun.projTestRun, [qim.queueItem], qim.junitFileUri);
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
      this.#currentRuns = this.#currentRuns.filter(x => x.projTestRun !== run);
      xRayLog(`junitWatcher: run ${run.name} removed from currentRuns list`);
    }
  }


  async #startJunitFolderWatch() {
    try {
      const junitDirUri = getJunitDirUri();
      const pattern = new vscode.RelativePattern(junitDirUri, '**/*.xml');
      this.#watcher = vscode.workspace.createFileSystemWatcher(pattern, false, false, true);
      this.#watcherEvents.push(this.#watcher.onDidCreate((uri) => this.#updateResult(uri, "onDidCreate")));
      this.#watcherEvents.push(this.#watcher.onDidChange((uri) => this.#updateResult(uri, "onDidChange")));
      xRayLog(`junitWatcher: watcher pattern is ${vscode.Uri.joinPath(pattern.baseUri, pattern.pattern).fsPath}`);

      // we want a generous timeout here, because the filesystemwatcher can take a while to "wake up" on extension 
      // start up. (a user will not wait for that long, as it is not checked until startWatchingRun)
      // (awaiting here just to catch any error so we don't need to add another error handler in waitForFolderWatch)
      await this.#waitForFolderWatch(junitDirUri, 10000);
    }
    catch (e: unknown) {
      // unawaited async function - show error
      services.logger.logError(e);
    }
  }


  async #waitForWatcher(projTestRun: vscode.TestRun) {
    // this method protects against starting a run before the watcher is ready (or times out)

    if (!this.#watcher)
      throw new Error("junitWatcher: watcher is undefined");

    const junitDirUri = getJunitDirUri();
    while (this.#foldersWaitingForWatcher.has(uriId(junitDirUri))) {
      await new Promise(r => setTimeout(r, 100));
    }

    const junitProjRunDirUri = getJunitProjRunDirUri(projTestRun);
    await this.#waitForFolderWatch(junitProjRunDirUri, 2000);
  }


  async #waitForFolderWatch(folderUri: vscode.Uri, timeout: number): Promise<boolean> {
    // create detection files, and WAIT a short time for the watcher to detect one (or timeout so run does not get stuck).
    // if it does timeout, i.e. the filesystemwatcher is not working, then the run will still work but some or all of the test 
    // results will not be updated in real time, i.e. not until the run ends, giving a poor user experience.

    const fileUris: vscode.Uri[] = [];

    try {

      this.#foldersWaitingForWatcher.add(uriId(folderUri));
      let detected = false;

      const poll = 100;
      for (let ms = 0; ms < timeout; ms += poll) {
        detected = !this.#foldersWaitingForWatcher.has(uriId(folderUri));
        if (detected)
          break;
        const fileUri = vscode.Uri.joinPath(folderUri, `${ms}.${this.#DETECT_FILE}`);
        await vscode.workspace.fs.writeFile(fileUri, Buffer.from("<detect_me/>"));
        fileUris.push(fileUri);
        xRayLog("junitWatcher: writing " + fileUri.fsPath);
        await new Promise(r => setTimeout(r, poll));
      }

      if (detected)
        return true;

      const msg = `junitWatcher: Waiting for path ${folderUri.fsPath} to be watched - timed out. ` +
        `Some or all test results may not be updated until the run has ended. ` +
        `(This is ok if: (i) it is occurring when tests are being run immediately after vscode instance startup, ` +
        `and (ii) it should only occur once per vscode instance.)`;
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
      this.#foldersWaitingForWatcher.delete(uriId(folderUri));
    }

  }


  async #updateResult(uri: vscode.Uri, caller: string) {
    // re-entrant updater method

    if (uri.fsPath.endsWith(this.#DETECT_FILE)) {
      const parentFolderId = uriId(vscode.Uri.file(uri.path.substring(0, uri.path.lastIndexOf('/'))));
      if (this.#foldersWaitingForWatcher.has(parentFolderId)) {
        this.#foldersWaitingForWatcher.delete(parentFolderId);
        xRayLog(`junitWatcher: _updateResult() watcher successfully detected file ${uri.fsPath}`);
      }
      return;
    }

    let matchedRun: Run | undefined;

    try {

      const queueItemMapJunitUriMatches = this.#currentRuns.map(cr => {
        const filter = cr.queue.filter(m => uriId(m.junitFileUri) === uriId(uri));
        if (filter.length > 0) {
          if (matchedRun && cr !== matchedRun)
            throw new Error(`junitWatcher: _updateResult(${caller}) called for file ${uri.fsPath}, but it matched multiple runs`);
          matchedRun = cr;
        }
        return filter;
      }).flat();

      // no match = run has been removed by stopWatchingRun (which will have already updated the tests for this file)
      if (!matchedRun)
        return;

      // one junit file is created per feature, so update all tests belonging to this feature
      const queueItemsMatchingJunitUri = queueItemMapJunitUriMatches.map(m => m.queueItem);
      const projSettings = queueItemMapJunitUriMatches[0].projSettings;
      await parseJunitFileAndUpdateTestResults(projSettings, matchedRun.projTestRun, matchedRun.debug, uri, queueItemsMatchingJunitUri);
      for (const match of queueItemMapJunitUriMatches) {
        xRayLog(`junitWatcher: run ${matchedRun.projTestRun.name} - updateResult(${caller}) updated the result for ${match.queueItem.test.id}`);
        match.updated = true;
      }

    }
    catch (e: unknown) {
      const err = new Error(`junitWatcher error:${e as string}, caller:${caller}, file:${uri.fsPath}, run:${matchedRun?.projTestRun.name}`);
      matchedRun?.projTestRun.end();
      // entry point function (handler) - show error
      services.logger.logError(err);
    }

  }


}


