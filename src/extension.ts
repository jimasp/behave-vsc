/* eslint-disable @typescript-eslint/ban-ts-comment */
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore: '"vscode"' has no exported member 'StatementCoverage'
import * as vscode from 'vscode';
import config, { ExtensionConfiguration } from "./configuration";
import { Scenario, testData, TestFile } from './testTree';
import { runBehaveAll } from './runOrDebug';
import { getFeatureNameFromFile } from './featureParser';
import { parseStepsFile, StepDetail, Steps } from './stepsParser';
import { getContentFromFilesystem, isFeatureFile, isStepsFile, logActivate, logRunDiagOutput } from './helpers';
import { gotoStepHandler } from './gotoStepHandler';


let stopDebugRun = false;
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
  private _featuresLoaded = false;
  private _cancelTokenSource: vscode.CancellationTokenSource | null = null;

  async readyForRun(timeout: number) {
    const interval = 100;

    const check = (resolve: (value: boolean) => void) => {
      if (this._featuresLoaded) {
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


  private _parseFeatureFiles = async (controller: vscode.TestController, cancelToken: vscode.CancellationToken,
    reparse: boolean, caller: string): Promise<number> => {

    let processed = 0;
    controller.items.forEach(item => controller.items.delete(item.id));
    const pattern = new vscode.RelativePattern(config.userSettings.fullFeaturesPath, "**/*.feature");
    const featureFiles = await vscode.workspace.findFiles(pattern, undefined, undefined, cancelToken);

    for (const uri of featureFiles) {
      if (cancelToken.isCancellationRequested) {
        break;
      }
      await updateTestItemFromFeatureFile(controller, uri, reparse, caller);
      processed++;
    }

    if (cancelToken.isCancellationRequested) {
      // either findFiles or loop will have exited early, log it either way
      console.log(`${caller} cancelled - _parseFeatureFiles stopped`);
    }

    return processed;
  }

  private _parseStepsFiles = async (cancelToken: vscode.CancellationToken, caller: string): Promise<number> => {

    let processed = 0;
    steps.clear();
    const pattern = new vscode.RelativePattern(config.userSettings.fullFeaturesPath, "**/steps/**/*.py");
    const stepFiles = await vscode.workspace.findFiles(pattern, undefined, undefined, cancelToken);


    for (const uri of stepFiles) {
      if (cancelToken.isCancellationRequested) {
        break;
      }
      await updateStepsFromStepsFile(uri, caller);
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


  // NOTE - this is background task - it should only be awaited on user request, i.e. when called by the refreshHandler
  async buildTree(ctrl: vscode.TestController, intiator: string, reparseFeatures = false) {
    this._featuresLoaded = false;
    this._calls++;
    const callName = `buildTree ${this._calls}`;

    try {

      console.log(`\n===== ${callName}: started, initiated by:${intiator}, reparse:${reparseFeatures} =====`);

      // this function is usually not awaited, and therefore re-entrant, so cancel any existing buildTree call
      if (this._cancelTokenSource) {
        this._cancelTokenSource.cancel();
        while (this._cancelTokenSource) {
          await new Promise(t => setTimeout(t, 20));
        }
      }

      this._cancelTokenSource = new vscode.CancellationTokenSource();

      const start = Date.now();
      const featureFileCount = await this._parseFeatureFiles(ctrl, this._cancelTokenSource.token, reparseFeatures, callName);
      const featTime = Date.now() - start;
      if (!this._cancelTokenSource.token.isCancellationRequested) {
        this._featuresLoaded = true;
        console.log(`${callName}: features loaded`);
      }

      const stepsStart = Date.now();
      const stepFileCount = await this._parseStepsFiles(this._cancelTokenSource.token, callName);
      const stepsTime = Date.now() - stepsStart;
      if (!this._cancelTokenSource.token.isCancellationRequested) {
        console.log(`${callName}: steps loaded`);
      }

      if (this._cancelTokenSource.token.isCancellationRequested) {
        console.log(`${callName}: cancellation complete`);
      }
      else {
        console.log(`${callName}: complete`);
        this._logTimesToConsole(ctrl.items, featTime, stepsTime, featureFileCount, stepFileCount, reparseFeatures);
      }

      this._cancelTokenSource.dispose();
      this._cancelTokenSource = null;

    }
    catch (e: unknown) {
      config.logger.logError(e);
    }
  }
}

const treeBuilder = new TreeBuilder();


export async function activate(context: vscode.ExtensionContext): Promise<IntegrationTestInterface | undefined> {

  try {

    logActivate(context);

    const ctrl = vscode.tests.createTestController(`${config.extensionName}.TestController`, 'Feature Tests');
    // the function contained in push() will execute immediately, as well as registering it for disposal on extension deactivation
    // i.e. startWatchingWorkspace will execute immediately, as will registerCommand, but gotoStepHandler will not (as it is a parameter)
    // push disposables (registerCommand is a disposable so that your command will no longer be active when the extension is deactivated)
    context.subscriptions.push(ctrl);
    context.subscriptions.push(startWatchingWorkspace(ctrl));
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

        logRunDiagOutput(debug);
        const queue: QueueItem[] = [];
        const run = ctrl.createTestRun(request, config.extensionFullName, false);
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
                await data.updateFromDisk(ctrl, test, "queueSelectedItems");
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

          console.log("\n=== starting test run ===\n");

          if (queue.length === 0) {
            const err = "empty queue - nothing to do";
            config.logger.logError(err);
            throw err;
          }

          const allTestsIncluded = (!request.include || request.include.length == 0) && (!request.exclude || request.exclude.length == 0);

          if (!debug && allTestsIncluded && config.userSettings.runAllAsOne) {

            await runBehaveAll(context, run, queue, cancellation);

            for (const qi of queue) {
              updateRun(qi.test, coveredLines, run);
            }

            return;
          }


          const asyncPromises: Promise<void>[] = [];
          stopDebugRun = false;

          for (const qi of queue) {
            run.appendOutput(`Running ${qi.test.id}\r\n`);
            if (stopDebugRun || cancellation.isCancellationRequested) {
              updateRun(qi.test, coveredLines, run);
            }
            else {

              run.started(qi.test);

              if (!config.userSettings.runParallel || debug) {
                await qi.scenario.runOrDebug(context, debug, run, qi, cancellation);
                updateRun(qi.test, coveredLines, run);
              }
              else {
                // async run (parallel)
                const promise = qi.scenario.runOrDebug(context, false, run, qi, cancellation).then(() => {
                  updateRun(qi.test, coveredLines, run)
                });
                asyncPromises.push(promise);
              }
            }
          }

          await Promise.all(asyncPromises);
          console.log("\n=== test run complete ===\n");
        };


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
          await data.updateFromDisk(ctrl, item, "resolveHandler");
        }
      }
      catch (e: unknown) {
        config.logger.logError(e);
      }
    };

    ctrl.refreshHandler = async () => {
      try {
        await treeBuilder.buildTree(ctrl, "refreshHandler", true);
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
            // console.log(m);

            if (m.body?.reason === "exited" && m.body?.threadId) {
              // thread exit
              threadExit = true;
              return;
            }

            if (m.event === "exited") {
              if (!threadExit) {
                // exit, but not a thread exit, so we need to set flag to 
                // stop the run, (most likely debug was stopped by user)
                stopDebugRun = true;
              }
            }
          },
        };
      }
    }));


    context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(async (e) => {
      try {
        if (e.affectsConfiguration(config.extensionName)) {
          config.reloadUserSettings();
          treeBuilder.buildTree(ctrl, "OnDidChangeConfiguration", true); // full reparse - user may have changed e.g. fastSkipList
        }
      }
      catch (e: unknown) {
        config.logger.logError(e);
      }
    }));


    const updateNodeForDocument = async (e: vscode.TextDocument) => {
      const item = await getOrCreateTestItemFromFeatureFile(ctrl, e.uri, "updateNodeForDocument");
      if (item)
        item.testFile.updateFromContents(e.uri.path, ctrl, e.getText(), item.testItem, "updateNodeForDocument");
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



async function getOrCreateTestItemFromFeatureFile(controller: vscode.TestController, uri: vscode.Uri, caller: string)
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
  const featIdxPath = "/" + config.userSettings.featuresPath + "/";
  const featuresFolderIndex = uri.path.lastIndexOf(featIdxPath) + featIdxPath.length;
  const sfp = uri.path.substring(featuresFolderIndex);
  if (sfp.indexOf("/") !== -1) {
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



async function updateStepsFromStepsFile(uri: vscode.Uri, caller: string) {

  if (!isStepsFile(uri))
    throw new Error(`${uri.path} is not a python file`);

  await parseStepsFile(uri, steps, caller);
}

async function updateTestItemFromFeatureFile(controller: vscode.TestController, uri: vscode.Uri, parse: boolean, caller: string) {

  if (!isFeatureFile(uri))
    throw new Error(`${caller}: ${uri.path} is not a feature file`);

  const item = await getOrCreateTestItemFromFeatureFile(controller, uri, caller);
  if (!parse) {
    console.log(`${caller}: feature parse not set, skipping parse of ${uri.path}`);
  }
  else {
    if (item) {
      console.log(`${caller}: parsing ${uri.path}`);
      await item.testFile.updateFromDisk(controller, item.testItem, caller);
    }
    else {
      console.log(`${caller}: no scenarios found in ${uri.path}`);
    }
  }
}

function startWatchingWorkspace(ctrl: vscode.TestController) {

  // NOTE - not just .feature and .py files, but also watch FOLDER changes inside the features folder
  const pattern = new vscode.RelativePattern(config.userSettings.fullFeaturesPath, "**");
  const watcher = vscode.workspace.createFileSystemWatcher(pattern);

  const updater = (uri: vscode.Uri) => {
    try {

      if (isStepsFile(uri)) {
        updateStepsFromStepsFile(uri, "updater");
        return;
      }

      if (isFeatureFile(uri)) {
        updateTestItemFromFeatureFile(ctrl, uri, true, "updater");
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
      treeBuilder.buildTree(ctrl, "OnDidDelete", true);
    }
    catch (e: unknown) {
      config.logger.logError(e);
    }
  });



  treeBuilder.buildTree(ctrl, "startWatchingWorkspace", true);

  return watcher;
}


