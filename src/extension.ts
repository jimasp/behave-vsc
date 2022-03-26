/* eslint-disable @typescript-eslint/ban-ts-comment */
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore: '"vscode"' has no exported member 'StatementCoverage'
import * as vscode from 'vscode';
import config from "./configuration";
import { Scenario, testData, TestFile } from './testTree';
import { runBehaveAll } from './runOrDebug';
import { getFeatureNameFromFile } from './featureParser';
import { parseStepsFile, StepDetail, Steps } from './stepsParser';
import { debugStopped, resetDebugStop } from './debugScenario';
import { getContentFromFilesystem, logActivate, logRunDiagOutput } from './helpers';
import { gotoStepHandler } from './gotoStepHandler';


const steps: Steps = new Map<string, StepDetail>();
export const getSteps = () => steps;

export interface QueueItem { test: vscode.TestItem; scenario: Scenario }


class TreeBuilder {

  async readyForRun(timeout: number) {
    const interval = 100;

    const check = (resolve: (value: boolean) => void) => {
      if (this._featuresLoaded) {
        resolve(true);
      }
      else {
        timeout -= interval;
        if (timeout < interval)
          resolve(false);
        setTimeout(() => check(resolve), interval);
      }
    }

    return new Promise<boolean>(check);
  }

  private _featuresLoaded = false;
  // this should only be awaited on user request, i.e. when called by the refreshHandler
  async buildTree(ctrl: vscode.TestController, reparseFeatures = false) {
    const start = Date.now();

    this._featuresLoaded = false;
    await findFeatureFiles(ctrl, reparseFeatures);
    this._featuresLoaded = true;
    findStepsFiles();

    console.log(
      `buildTree took ${Date.now() - start}ms. ` +
      `(ignore if there are active breakpoints. slower during contention, like vscode startup. ` +
      `click test refresh button without active breakpoints for a more representative time.)`
    );
  }

}

const treeBuilder = new TreeBuilder();

export async function activate(context: vscode.ExtensionContext) {

  try {

    logActivate(context);

    const ctrl = vscode.tests.createTestController(`${config.extensionName}.TestController`, 'Feature Tests');
    // func in push() will execute immediately, as well as registering it for disposal on extension deactivate
    context.subscriptions.push(ctrl);
    context.subscriptions.push(startWatchingWorkspace(ctrl));
    context.subscriptions.push(vscode.commands.registerCommand("behave-vsc.gotoStep", gotoStepHandler));

    const runHandler = async (debug: boolean, request: vscode.TestRunRequest, cancellation: vscode.CancellationToken) => {

      // the test tree is built as a background process which is called from a few places
      // (and it will be slow on vscode startup due to contention), so we 
      // don't want to await it except on user request (refresh click),
      // but at the same time, we also don't to allow test runs when the tests items are out of date vs the file system
      const ready = await treeBuilder.readyForRun(1000);
      if (!ready) {
        const msg = "cannot run tests while test items are still updating, please try again";
        console.log(msg);
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
                await data.updateFromDisk(ctrl, test);
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
          resetDebugStop();

          for (const qi of queue) {
            run.appendOutput(`Running ${qi.test.id}\r\n`);
            if (debugStopped() || cancellation.isCancellationRequested) {
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
          await data.updateFromDisk(ctrl, item);
        }
      }
      catch (e: unknown) {
        config.logger.logError(e);
      }
    };

    ctrl.refreshHandler = async () => {
      try {
        await treeBuilder.buildTree(ctrl, true);
      }
      catch (e: unknown) {
        config.logger.logError(e);
      }
    };


    context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(async (e) => {
      try {
        if (e.affectsConfiguration(config.extensionName)) {
          config.reloadUserSettings();
          treeBuilder.buildTree(ctrl, false); // user may have e.g. changed featuresPath
        }
      }
      catch (e: unknown) {
        config.logger.logError(e);
      }
    }));


    const updateNodeForDocument = async (e: vscode.TextDocument) => {
      const item = await getOrCreateTestItemFromFeatureFile(ctrl, e.uri);
      if (item)
        item.testFile.updateFromContents(ctrl, e.getText(), item.testItem);
    }

    // for any open .feature documents on startup
    const docs = vscode.workspace.textDocuments.filter(d => d.uri.scheme === "file" && d.uri.path.toLowerCase().endsWith(".feature"));
    for (const doc of docs) {
      await updateNodeForDocument(doc);
    }

    return { runHandler: runHandler, config: config }; // support extensiontest.ts

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



async function getOrCreateTestItemFromFeatureFile(controller: vscode.TestController, uri: vscode.Uri)
  : Promise<{ testItem: vscode.TestItem, testFile: TestFile } | undefined> {

  if (uri.scheme !== "file" || !uri.path.toLowerCase().endsWith(".feature"))
    throw Error(`${uri.path} is not a feature file`);

  const existing = controller.items.get(uri.toString());
  if (existing) {
    return { testItem: existing, testFile: testData.get(existing) as TestFile };
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

  return { testItem: testItem, testFile: testFile };
}

function gatherTestItems(collection: vscode.TestItemCollection) {
  const items: vscode.TestItem[] = [];
  collection.forEach((item: vscode.TestItem) => items.push(item));
  return items;
}



async function findFeatureFiles(controller: vscode.TestController, reparse?: boolean) {
  controller.items.forEach(item => controller.items.delete(item.id));
  const pattern = new vscode.RelativePattern(config.workspaceFolder, `**/${config.userSettings.featuresPath}/**/*.feature`);
  const featureFiles = await vscode.workspace.findFiles(pattern);

  for (const uri of featureFiles) {
    await updateTestItemFromFeatureFile(controller, uri, reparse);
  }
}

async function findStepsFiles() {
  steps.clear();
  const pattern = new vscode.RelativePattern(config.workspaceFolder, `**/${config.userSettings.featuresPath}/**/steps/**/*.py`);
  const stepFiles = await vscode.workspace.findFiles(pattern);

  for (const uri of stepFiles) {
    await updateStepsFromStepsFile(uri);
  }
}

async function updateStepsFromStepsFile(uri: vscode.Uri) {

  if (uri.scheme !== "file" || !uri.path.toLowerCase().endsWith(".py"))
    throw Error(`${uri.path} is not a python file`);

  await parseStepsFile(uri, steps);
  return;
}

async function updateTestItemFromFeatureFile(controller: vscode.TestController, uri: vscode.Uri, reparse?: boolean) {

  if (uri.scheme !== "file" || !uri.path.toLowerCase().endsWith(".feature"))
    throw Error(`${uri.path} is not a feature file`);

  const item = await getOrCreateTestItemFromFeatureFile(controller, uri);
  if (item && reparse) {
    await item.testFile.updateFromDisk(controller, item.testItem);
  }
  return;
}

function startWatchingWorkspace(ctrl: vscode.TestController) {

  // not just *.feature and /steps/* files, but also support folder changes inside the features folder
  const pattern = new vscode.RelativePattern(config.workspaceFolder, `**/${config.userSettings.featuresPath}/**`);
  const watcher = vscode.workspace.createFileSystemWatcher(pattern);

  const updater = (uri: vscode.Uri) => {

    if (uri.scheme !== "file")
      return;

    try {
      if (uri.path.toLowerCase().indexOf("/steps/") !== -1) {
        updateStepsFromStepsFile(uri);
      }
      else {
        updateTestItemFromFeatureFile(ctrl, uri, true);
      }
    }
    catch (e: unknown) {
      config.logger.logError(e);
    }
  }


  // fires on file/folder creation (inc. git branch switch)
  watcher.onDidCreate(uri => {
    updater(uri);
  });

  // fires on file/folder rename (inc. git branch switch) AND when file is open in editor on startup 
  watcher.onDidChange(uri => {
    updater(uri);
  });

  // fires on file/folder delete AND rename (inc. git branch switch)
  watcher.onDidDelete((uri) => {

    if (uri.scheme !== "file")
      return;

    try {
      treeBuilder.buildTree(ctrl, true);
    }
    catch (e: unknown) {
      config.logger.logError(e);
    }
  });


  treeBuilder.buildTree(ctrl, true);

  return watcher;
}


