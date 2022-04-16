/* eslint-disable @typescript-eslint/ban-ts-comment */
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore: '"vscode"' has no exported member 'StatementCoverage'
import * as vscode from 'vscode';
import config, { ExtensionConfiguration, EXTENSION_FULL_NAME, EXTENSION_NAME, WorkspaceSettings } from "./configuration";
import { Scenario, testData, TestFile } from './testTree';
import { runBehaveAll } from './runOrDebug';
import {
  getContentFromFilesystem, getWorkspaceFolder, getWorkspaceFolderUris, getWorkspaceSettingsForFile, isFeatureFile, isStepsFile, logExtensionVersion
} from './helpers';
import { getFeatureNameFromFile } from './featureParser';
import { parseStepsFile, StepDetail, Steps } from './stepsParser';
import { gotoStepHandler } from './gotoStepHandler';


let debugCancelSource = new vscode.CancellationTokenSource();
const steps: Steps = new Map<string, StepDetail>();
export const getSteps = () => steps;
export interface QueueItem { test: vscode.TestItem; scenario: Scenario }


export type IntegrationTestInterface = {
  runHandler: (debug: boolean, request: vscode.TestRunRequest, cancellation: vscode.CancellationToken) => Promise<QueueItem[] | undefined>,
  config: ExtensionConfiguration,
  ctrl: vscode.TestController,
  treeBuilder: TreeBuilder,
  getSteps: () => Steps
};


class TreeBuilder {

  private _calls = 0;
  private _featuresLoadedForAllWorkspaces = false;
  private _featuresLoadedForWorkspace: { [key: string]: boolean } = {};
  private _cancelTokenSources: { [wkspUriPath: string]: vscode.CancellationTokenSource } = {};

  async readyForRun(timeout: number) {
    const interval = 100;

    const check = (resolve: (value: boolean) => void) => {
      if (this._featuresLoadedForAllWorkspaces) {
        resolve(true);
      }
      else {
        timeout -= interval;
        console.log("timeout:" + timeout);
        if (timeout < interval)
          resolve(false);
        setTimeout(() => check(resolve), interval);
      }
    }

    return new Promise<boolean>(check);
  }

  private _parseFeatureFiles = async (wkspSettings: WorkspaceSettings, controller: vscode.TestController, cancelToken: vscode.CancellationToken,
    reparse: boolean, caller: string): Promise<number> => {

    let processed = 0;
    controller.items.forEach(item => controller.items.delete(item.id));
    const pattern = new vscode.RelativePattern(wkspSettings.fullFeaturesPath, "**/*.feature");
    const featureFiles = await vscode.workspace.findFiles(pattern, undefined, undefined, cancelToken);

    for (const uri of featureFiles) {
      if (cancelToken.isCancellationRequested) {
        break;
      }
      await updateTestItemFromFeatureFile(wkspSettings, controller, uri, reparse, caller);
      processed++;
    }

    if (cancelToken.isCancellationRequested) {
      // either findFiles or loop will have exited early, log it either way
      console.log(`${caller} cancelled - _parseFeatureFiles stopped`);
    }

    return processed;
  }

  private _parseStepsFiles = async (wkspSettings: WorkspaceSettings, cancelToken: vscode.CancellationToken, caller: string): Promise<number> => {

    let processed = 0;
    steps.clear();
    const pattern = new vscode.RelativePattern(wkspSettings.fullFeaturesPath, "**/steps/**/*.py");
    const stepFiles = await vscode.workspace.findFiles(pattern, undefined, undefined, cancelToken);


    for (const uri of stepFiles) {
      if (cancelToken.isCancellationRequested) {
        break;
      }
      await updateStepsFromStepsFile(wkspSettings.workspaceUri, uri, caller);
      processed++;
    }

    if (cancelToken.isCancellationRequested) {
      // either findFiles or loop will have exited early, log it either way
      console.log(`${caller} cancelled - _parseStepFiles stopped`);
    }

    return processed;
  }

  private _logTimesToConsole = (testItems: vscode.TestItemCollection,
    featTime: number, stepsTime: number, featureFileCount: number, stepFileCount: number, reparse: boolean) => {

    const countTestItems = (items: vscode.TestItemCollection): number => {
      let count = 0;
      items.forEach((item: vscode.TestItem) => {
        count += item.children.size;
        count += countTestItems(item.children);
      });
      return count;
    }

    const testNodeCount = countTestItems(testItems);

    // show diag times for extension developers
    console.log(
      `buildTree completed with reparse ${reparse}. Processing ${featureFileCount} feature files, ${stepFileCount} step files, ` +
      `producing ${testNodeCount} test tree nodes, and ${steps.size} steps took ${stepsTime + featTime}ms. ` +
      `Breakdown: features ${featTime}ms, steps ${stepsTime}ms.\n` +
      `(Ignore times if there are active breakpoints. Slower during contention like vscode startup or when ` +
      `another test extension is also refreshing. Click test refresh button a few times without active breakpoints and with other test ` +
      `extensions disabled for a more representative time.)` +
      `\n==================`
    );
  }

  // NOTE - this is background task
  // it should only be awaited on user request, i.e. when called by the refreshHandler
  async buildTree(wkspUri: vscode.Uri | undefined, ctrl: vscode.TestController, intiator: string, reparseFeatures: boolean,
    callerCancelToken?: vscode.CancellationToken) {

    callerCancelToken?.onCancellationRequested(() => {
      for (const key in this._cancelTokenSources)
        this._cancelTokenSources[key].cancel();
    });


    if (!wkspUri) {
      const promises: Promise<void>[] = [];
      for (const wkspUri of getWorkspaceFolderUris()) {
        promises.push(this.buildTree(wkspUri, ctrl, intiator, reparseFeatures));
      }
      await Promise.all(promises);
      return;
    }

    this._featuresLoadedForAllWorkspaces = false;
    this._featuresLoadedForWorkspace[wkspUri.fsPath] = false;
    this._calls++;
    const wkspName = getWorkspaceFolder(wkspUri).name;
    const callName = `buildTree ${this._calls} ${wkspName}`;
    const wkspSettings = config.workspaceSettings(wkspUri);
    const wkspPath = wkspUri.path;


    try {

      console.log(`\n===== ${callName}: started, initiated by:${intiator}, reparse:${reparseFeatures} =====`);

      // this function is not generally awaited, and therefore re-entrant, so cancel any existing buildTree call for this workspace
      if (this._cancelTokenSources[wkspPath]) {
        this._cancelTokenSources[wkspPath].cancel();
        while (this._cancelTokenSources[wkspPath]) {
          await new Promise(t => setTimeout(t, 20));
        }
      }


      this._cancelTokenSources[wkspPath] = new vscode.CancellationTokenSource();

      const start = Date.now();
      const featureFileCount = await this._parseFeatureFiles(wkspSettings, ctrl, this._cancelTokenSources[wkspPath].token, reparseFeatures, callName);
      const featTime = Date.now() - start;
      if (!this._cancelTokenSources[wkspPath].token.isCancellationRequested) {
        console.log(`features loaded for workspace ${wkspName}`);
        this._featuresLoadedForWorkspace[wkspPath] = true;
        const stillLoading = getWorkspaceFolderUris().filter(wkspUri => !this._featuresLoadedForWorkspace[wkspUri.path])
        if (stillLoading.length === 0) {
          this._featuresLoadedForAllWorkspaces = true;
          console.log(`${callName}: features loaded for all workspaces`);
        }
      }

      const stepsStart = Date.now();
      const stepFileCount = await this._parseStepsFiles(wkspSettings, this._cancelTokenSources[wkspPath].token, callName);
      const stepsTime = Date.now() - stepsStart;
      if (!this._cancelTokenSources[wkspPath].token.isCancellationRequested) {
        console.log(`${callName}: steps loaded`);
      }

      if (this._cancelTokenSources[wkspPath].token.isCancellationRequested) {
        console.log(`${callName}: cancellation complete`);
      }
      else {
        console.log(`${callName}: complete`);
        if (featureFileCount === 0)
          config.logger.logError(`No feature files found in ${wkspSettings.fullFeaturesPath}`);
        if (stepFileCount === 0)
          config.logger.logError(`No step files found in ${wkspSettings.fullFeaturesPath}/steps`);
        this._logTimesToConsole(ctrl.items, featTime, stepsTime, featureFileCount, stepFileCount, reparseFeatures);
      }

      this._cancelTokenSources[wkspPath].dispose();
      delete this._cancelTokenSources[wkspPath];
    }
    catch (e: unknown) {
      config.logger.logError(e);
    }
  }
}

const treeBuilder = new TreeBuilder();


export async function activate(context: vscode.ExtensionContext): Promise<IntegrationTestInterface | undefined> {

  try {

    logExtensionVersion(context);

    const ctrl = vscode.tests.createTestController(`${EXTENSION_FULL_NAME}.TestController`, 'Feature Tests');
    // the function contained in push() will execute immediately, as well as registering it for disposal on extension deactivation
    // i.e. startWatchingWorkspace will execute immediately, as will registerCommand, but gotoStepHandler will not (as it is a parameter)
    // push disposables (registerCommand is a disposable so that your command will no longer be active when the extension is deactivated)
    context.subscriptions.push(ctrl);
    for (const wkspUri of getWorkspaceFolderUris()) {
      context.subscriptions.push(startWatchingWorkspace(wkspUri, ctrl));
    }
    context.subscriptions.push(vscode.commands.registerCommand("behave-vsc.gotoStep", gotoStepHandler));


    const runHandler = async (debug: boolean, request: vscode.TestRunRequest, cancellation: vscode.CancellationToken) => {

      // the test tree is built as a background process which is called from a few places
      // (and it will be slow on vscode startup due to contention), so we don't want to await it except on user request (refresh click),
      // but at the same time, we also don't want to allow test runs when the tests items are out of date vs the file system
      const ready = await treeBuilder.readyForRun(1000);
      if (!ready) {
        const msg = "cannot run tests while test items are still updating, please try again";
        console.warn(msg);
        vscode.window.showWarningMessage(msg);
        return;
      }

      try {

        const queue: QueueItem[] = [];
        const run = ctrl.createTestRun(request, EXTENSION_FULL_NAME, false);
        config.logger.run = run;

        // map of file uris to statements on each line:
        // @ts-ignore: '"vscode"' has no exported member 'StatementCoverage'
        const coveredLines = new Map</* file uri */ string, (vscode.StatementCoverage | undefined)[]>();

        const queueSelectedTestItems = async (tests: Iterable<vscode.TestItem>) => {
          for (const test of tests) {
            if (request.exclude?.includes(test)) {
              continue;
            }

            const data = testData.get(test);

            if (data instanceof Scenario) {
              run.enqueued(test);
              queue.push({ test, scenario: data });
            }
            else {
              if (data instanceof TestFile && !data.didResolve) {
                const wkspSettings = getWorkspaceSettingsForFile(test.uri);
                await data.updateFromDisk(wkspSettings, ctrl, test, "queueSelectedItems");
              }

              await queueSelectedTestItems(gatherTestItems(test.children));
            }

            if (test.uri && !coveredLines.has(test.uri.toString())) {
              try {
                const lines = (await getContentFromFilesystem(test.uri)).split('\n');
                coveredLines.set(
                  test.uri.toString(),
                  lines.map((lineText, lineNo) =>
                    // @ts-ignore: '"vscode"' has no exported member 'StatementCoverage'
                    lineText.trim().length ? new vscode.StatementCoverage(0, new vscode.Position(lineNo, 0)) : undefined
                  )
                );
              } catch {
                // ignored
              }
            }
          }
        };


        const runTestQueue = async (request: vscode.TestRunRequest) => {

          config.logger.clear();
          console.log("\n=== starting test run ===\n");

          if (queue.length === 0) {
            const err = "empty queue - nothing to do";
            config.logger.logError(err);
            throw err;
          }

          const asyncRunPromises: { [wkspUriPath: string]: Promise<void>[] } = {};
          debugCancelSource.dispose();
          debugCancelSource = new vscode.CancellationTokenSource();


          // (loop itself does not need to be async)
          for (const wkspUri of getWorkspaceFolderUris()) {

            asyncRunPromises[wkspUri.path] = [];
            const wkspSettings = config.workspaceSettings(wkspUri);

            const wkspQueue = queue.filter(item => {
              return item.test.uri?.path.startsWith(wkspSettings.fullFeaturesPath);
            });

            if (wkspQueue.length === 0)
              continue;

            config.logger.logInfo("--- starting test run for workspace " + wkspSettings.workspaceFolder.uri.path + " ---\n");

            const allTestsIncluded = (!request.include || request.include.length == 0) && (!request.exclude || request.exclude.length == 0);
            let allWkspTestsIncluded = true;

            if (!allTestsIncluded) {
              const wkspItems: vscode.TestItem[] = [];

              ctrl.items.forEach(item => {
                if (item.uri?.path.startsWith(wkspSettings.fullFeaturesPath))
                  wkspItems.push(item);
              });

              for (const item of wkspItems) {
                if (!request.include?.includes(item)) {
                  allWkspTestsIncluded = false;
                  break;
                }
                if (request.exclude?.includes(item)) {
                  allWkspTestsIncluded = false;
                  break;
                }
              }
            }


            if (!debug && allWkspTestsIncluded && wkspSettings.runAllAsOne) {

              await runBehaveAll(wkspSettings, run, wkspQueue, cancellation);

              for (const qi of wkspQueue) {
                updateRun(qi.test, coveredLines, run);
              }

              continue;
            }


            for (const wskpQueueItem of wkspQueue) {

              run.appendOutput(`Running ${wskpQueueItem.test.id}\r\n`);

              if (debugCancelSource.token.isCancellationRequested || cancellation.isCancellationRequested) {
                updateRun(wskpQueueItem.test, coveredLines, run);
              }
              else {

                run.started(wskpQueueItem.test);

                if (!wkspSettings.runParallel || debug) {
                  await wskpQueueItem.scenario.runOrDebug(wkspSettings, debug, run, wskpQueueItem, debugCancelSource.token);
                  updateRun(wskpQueueItem.test, coveredLines, run);
                }
                else {
                  // async run (parallel)
                  const promise = wskpQueueItem.scenario.runOrDebug(wkspSettings, false, run, wskpQueueItem, cancellation).then(() => {
                    updateRun(wskpQueueItem.test, coveredLines, run)
                  });
                  asyncRunPromises[wkspUri.path].push(promise);
                }
              }
            }

          }


          for (const wkspUriPath in asyncRunPromises) {
            if (asyncRunPromises[wkspUriPath] && asyncRunPromises[wkspUriPath].length > 0) {
              await Promise.all(asyncRunPromises[wkspUriPath]);
              config.logger.logInfo(`\n--- ${wkspUriPath} tests completed ---\n`);
            }
          }

          //await Promise.all(asyncRunPromises);
          config.logger.logInfo("\n=== test run complete ===\n");

        }


        let completed = 0;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const updateRun = (test: vscode.TestItem, coveredLines: Map<string, any[]>, run: vscode.TestRun) => {
          if (!test || !test.range || !test.uri)
            throw "invalid test item";

          const lineNo = test.range.start.line;
          const fileCoverage = coveredLines.get(test.uri.toString());
          if (fileCoverage) {
            fileCoverage[lineNo].executionCount++;
          }

          run.appendOutput(`Completed ${test.id}\r\n`);

          completed++;
          if (completed === queue.length) {
            run.end();
          }
        };

        // @ts-ignore: Property 'coverageProvider' does not exist on type 'TestRun'
        run.coverageProvider = {
          provideFileCoverage() {
            // @ts-ignore: '"vscode"' has no exported member 'FileCoverage'
            const coverage: vscode.FileCoverage[] = [];
            for (const [uri, statements] of coveredLines) {
              coverage.push(
                // @ts-ignore: '"vscode"' has no exported member 'FileCoverage'
                vscode.FileCoverage.fromDetails(
                  vscode.Uri.parse(uri),
                  // @ts-ignore: '"vscode"' has no exported member 'StatementCoverage'
                  statements.filter((s): s is vscode.StatementCoverage => !!s)
                )
              );
            }

            return coverage;
          },
        };

        await queueSelectedTestItems(request.include ?? gatherTestItems(ctrl.items));
        await runTestQueue(request);

        return queue;

      }
      catch (e: unknown) {
        config.logger.logError(e);
      }

    };



    ctrl.createRunProfile('Run Tests',
      vscode.TestRunProfileKind.Run,
      (request: vscode.TestRunRequest, token: vscode.CancellationToken) => {
        runHandler(false, request, token);
      }
      , true);

    ctrl.createRunProfile('Debug Tests',
      vscode.TestRunProfileKind.Debug,
      (request: vscode.TestRunRequest, token: vscode.CancellationToken) => {
        runHandler(true, request, token);
      }
      , true);


    ctrl.resolveHandler = async (item: vscode.TestItem | undefined) => {
      try {
        if (!item)
          return;

        const data = testData.get(item);
        if (data instanceof TestFile) {
          const wkspSettings = getWorkspaceSettingsForFile(item.uri);
          await data.updateFromDisk(wkspSettings, ctrl, item, "resolveHandler");
        }
      }
      catch (e: unknown) {
        config.logger.logError(e);
      }
    };

    ctrl.refreshHandler = async (cancelToken: vscode.CancellationToken) => {
      try {
        await treeBuilder.buildTree(undefined, ctrl, "refreshHandler", true, cancelToken);
      }
      catch (e: unknown) {
        config.logger.logError(e);
      }
    };


    // onDidTerminateDebugSession doesn't provide reason for the stop,
    // so we need to check the reason from the debug adapter protocol
    context.subscriptions.push(vscode.debug.registerDebugAdapterTrackerFactory('*', {
      createDebugAdapterTracker() {
        let threadExit = false;

        return {
          onDidSendMessage: (m) => {
            // https://github.com/microsoft/vscode-debugadapter-node/blob/main/debugProtocol.json
            // console.log(JSON.stringify(m));

            if (m.body?.reason === "exited" && m.body?.threadId) {
              // thread exit
              threadExit = true;
              return;
            }

            if (m.event === "exited") {
              if (!threadExit) {
                // exit, but not a thread exit, so we need to set flag to 
                // stop the run, (most likely debug was stopped by user)
                debugCancelSource.cancel();
              }
            }
          },
        };
      }
    }));


    context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(async (e) => {
      try {
        for (const uri of getWorkspaceFolderUris()) {
          if (e.affectsConfiguration(EXTENSION_NAME, uri)) {
            config.reloadWorkspaceSettings(uri);
            treeBuilder.buildTree(uri, ctrl, "OnDidChangeConfiguration", true); // full reparse - user may have changed e.g. fastSkipList
          }
        }
      }
      catch (e: unknown) {
        config.logger.logError(e);
      }
    }));


    const updateNodeForDocument = async (e: vscode.TextDocument) => {
      const wkspSettings = getWorkspaceSettingsForFile(e.uri);
      const item = await getOrCreateTestItemFromFeatureFile(wkspSettings, ctrl, e.uri, "updateNodeForDocument");
      if (item)
        item.testFile.updateFromContents(wkspSettings, e.uri.path, ctrl, e.getText(), item.testItem, "updateNodeForDocument");
    }

    // for any open .feature documents on startup
    const docs = vscode.workspace.textDocuments.filter(d => d.uri.scheme === "file" && d.uri.path.toLowerCase().endsWith(".feature"));
    for (const doc of docs) {
      await updateNodeForDocument(doc);
    }

    return {
      // support extensiontest.ts (i.e. maintain same instances)
      runHandler: runHandler,
      config: config,
      ctrl: ctrl,
      treeBuilder: treeBuilder,
      getSteps: getSteps
    };

  }
  catch (e: unknown) {
    if (config)
      config.logger.logError(e);
    else {
      // this should never happen
      const text = (e instanceof Error ? (e.stack ? e.stack : e.message) : e as string);
      vscode.window.showErrorMessage(text);
    }
  }

} // end activate()



async function getOrCreateTestItemFromFeatureFile(wkspSettings: WorkspaceSettings, controller: vscode.TestController, uri: vscode.Uri, caller: string)
  : Promise<{ testItem: vscode.TestItem, testFile: TestFile } | undefined> {

  if (!isFeatureFile(uri))
    throw new Error(`${uri.path} is not a feature file`);

  const existing = controller.items.get(uri.toString());
  if (existing) {
    console.log(`${caller}: found existing test item for ${uri.path}`);
    return { testItem: existing, testFile: testData.get(existing) as TestFile || new TestFile() };
  }

  const featureName = await getFeatureNameFromFile(uri);
  if (featureName === null)
    return undefined;

  // support e.g. /group1_features/ parentGroup folder node
  let parentGroup: vscode.TestItem | undefined = undefined
  const featIdxPath = ("/" + wkspSettings.featuresPath + "/").replace("../", "/").replace("//", "");
  const featuresFolderIndex = uri.path.lastIndexOf(featIdxPath) + featIdxPath.length;
  const sfp = uri.path.substring(featuresFolderIndex);
  if (sfp.includes("/")) {
    const groupName = sfp.split("/")[0];
    parentGroup = controller.items.get(groupName);
    if (!parentGroup) {
      parentGroup = controller.createTestItem(groupName, groupName, undefined);
      parentGroup.canResolveChildren = true;
    }
  }

  const testItem = controller.createTestItem(uri.toString(), featureName, uri);
  controller.items.add(testItem);

  if (parentGroup !== undefined) {
    parentGroup.children.add(testItem);
    controller.items.add(parentGroup);
  }

  const testFile = new TestFile();
  testData.set(testItem, testFile);

  testItem.canResolveChildren = true;

  console.log(`${caller}: created test item for ${uri.path}`);
  return { testItem: testItem, testFile: testFile };
}

function gatherTestItems(collection: vscode.TestItemCollection) {
  const items: vscode.TestItem[] = [];
  collection.forEach((item: vscode.TestItem) => items.push(item));
  return items;
}



async function updateStepsFromStepsFile(wkspUri: vscode.Uri, uri: vscode.Uri, caller: string) {

  if (!isStepsFile(uri))
    throw new Error(`${uri.path} is not a python file`);

  await parseStepsFile(wkspUri, uri, steps, caller);
}

async function updateTestItemFromFeatureFile(wkspSettings: WorkspaceSettings, controller: vscode.TestController, uri: vscode.Uri,
  parse: boolean, caller: string) {

  if (!isFeatureFile(uri))
    throw new Error(`${caller}: ${uri.path} is not a feature file`);

  const item = await getOrCreateTestItemFromFeatureFile(wkspSettings, controller, uri, caller);
  if (!parse) {
    console.log(`${caller}: feature parse not set, skipping parse of ${uri.path}`);
  }
  else {
    if (item) {
      console.log(`${caller}: parsing ${uri.path}`);
      await item.testFile.updateFromDisk(wkspSettings, controller, item.testItem, caller);
    }
    else {
      console.log(`${caller}: no scenarios found in ${uri.path}`);
    }
  }
}

function startWatchingWorkspace(wkspUri: vscode.Uri, ctrl: vscode.TestController) {

  // NOTE - not just .feature and .py files, but also watch FOLDER changes inside the features folder
  const pattern = new vscode.RelativePattern(config.workspaceSettings(wkspUri).fullFeaturesPath, "**");
  const watcher = vscode.workspace.createFileSystemWatcher(pattern);
  const wkspSettings = getWorkspaceSettingsForFile(wkspUri);

  const updater = (uri: vscode.Uri) => {
    try {

      if (isStepsFile(uri)) {
        updateStepsFromStepsFile(wkspUri, uri, "updater");
        return;
      }

      if (isFeatureFile(uri)) {
        updateTestItemFromFeatureFile(wkspSettings, ctrl, uri, true, "updater");
      }

    }
    catch (e: unknown) {
      config.logger.logError(e);
    }
  }


  // fires on either new file/folder creation OR rename (inc. git actions)
  watcher.onDidCreate(uri => {
    updater(uri)
  });

  // fires on file save (inc. git actions)
  watcher.onDidChange(uri => {
    updater(uri)
  });

  // fires on either file/folder delete OR rename (inc. git actions)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  watcher.onDidDelete(uri => {

    const path = uri.path.toLowerCase();

    // we want folders in our pattern to be watched as e.g. renaming a folder does not raise events for child files    
    // but we cannot determine if this is a file or folder deletion as:
    //   (a) it has been deleted so we can't stat, and 
    //   (b) "." is valid in folder names so we can't determine by looking at the path
    // but we should ignore specific file extensions or paths we know we don't care about
    if (path.endsWith(".tmp")) // .tmp = vscode file history file
      return;

    // log for extension developers in case we need to add another file type above
    if (path.indexOf(".") && !isFeatureFile(uri) && !isStepsFile(uri)) {
      console.warn("detected deletion of unanticipated file type");
    }

    try {
      treeBuilder.buildTree(wkspUri, ctrl, "OnDidDelete", true);
    }
    catch (e: unknown) {
      config.logger.logError(e);
    }
  });



  treeBuilder.buildTree(wkspUri, ctrl, "startWatchingWorkspace", true);

  return watcher;
}


