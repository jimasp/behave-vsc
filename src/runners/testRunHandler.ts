import * as vscode from 'vscode';
import { performance } from 'perf_hooks';
import { config } from "../configuration";
import { WorkspaceSettings } from "../settings";
import { RunItemType, RunItem, TestData, TestFile } from '../parsers/testFile';
import { runOrDebugAllFeaturesInOneInstance, runOrDebugFeatures, runOrDebugFeatureWithSelectedScenarios } from './runOrDebug';
import {
  countTestItems, getAllTestItems, getContentFromFilesystem, uriId,
  getUrisOfWkspFoldersWithFeatures, getWorkspaceSettingsForFile, rndNumeric
} from '../common';
import { QueueItem } from '../extension';
import { FileParser } from '../parsers/fileParser';
import { diagLog, DiagLogType } from '../logger';
import { getJunitWkspRunDirUri, JunitWatcher } from '../watchers/junitWatcher';
import { getWkspQueueJunitFileMap, QueueItemMapEntry } from '../parsers/junitParser';

export class WkspRun {
  constructor(
    public readonly wkspSettings: WorkspaceSettings,
    public readonly run: vscode.TestRun,
    public readonly request: vscode.TestRunRequest,
    public readonly debug: boolean,
    public readonly ctrl: vscode.TestController,
    public readonly testData: TestData,
    public readonly sortedQueue: QueueItem[],
    public readonly pythonExec: string,
    public readonly allTestsForThisWkspIncluded: boolean,
    public readonly junitRunDirUri: vscode.Uri
  ) { }
}


export function testRunHandler(testData: TestData, ctrl: vscode.TestController, parser: FileParser, junitWatcher: JunitWatcher,
  removeTempDirectoryCancelSource: vscode.CancellationTokenSource) {

  return async (debug: boolean, request: vscode.TestRunRequest) => {

    diagLog(`testRunHandler: invoked`);

    // the test tree is built as a background process which is called from a few places
    // (and it will be slow during vscode startup due to contention), 
    // so we DON'T want to await it except on user request (refresh click),
    // BUT at the same time, we also don't want to allow test runs when the tests items are out of date vs the file system
    const ready = await parser.featureParseComplete(1000, "testRunHandler");
    if (!ready) {
      const msg = "Cannot run tests while feature files are being parsed, please try again.";
      diagLog(msg, undefined, DiagLogType.warn);
      vscode.window.showWarningMessage(msg);
      if (config.integrationTestRun)
        throw msg;
      return;
    }

    // stop the temp directory removal function if it is still running
    removeTempDirectoryCancelSource.cancel();

    const run = ctrl.createTestRun(request, rndNumeric(), false);

    diagLog(`testRunHandler: starting run ${run.name}`);

    try {
      const queue: QueueItem[] = [];
      await queueSelectedTestItems(ctrl, run, request, queue, request.include ?? convertToTestItemArray(ctrl.items), testData);
      await runTestQueue(ctrl, run, request, testData, debug, queue, junitWatcher);
      return queue;
    }
    catch (e: unknown) {
      // entry point (handler) - show error
      config.logger.showError(e, undefined);
    }
    finally {
      run.end();
    }

    diagLog(`testRunHandler: completed run ${run.name}`);
  };

}


async function queueSelectedTestItems(ctrl: vscode.TestController, run: vscode.TestRun, request: vscode.TestRunRequest, queue: QueueItem[],
  tests: Iterable<vscode.TestItem>, testData: TestData) {

  for (const test of tests) {

    if (request.exclude?.includes(test)) {
      continue;
    }

    const data = testData.get(test);

    if (data instanceof RunItem) {
      run.enqueued(test);
      queue.push({ test: test, runItem: data });
    }
    else {
      if (data instanceof TestFile && !data.didResolve) {
        const wkspSettings = getWorkspaceSettingsForFile(test.uri);
        const content = await getContentFromFilesystem(test.uri);
        await data.createScenarioTestItemsFromFeatureFileContent(wkspSettings, content, testData, ctrl, test, "queueSelectedItems");
      }

      await queueSelectedTestItems(ctrl, run, request, queue, convertToTestItemArray(test.children), testData);
    }

  }

}


async function runTestQueue(ctrl: vscode.TestController, run: vscode.TestRun, request: vscode.TestRunRequest,
  testData: TestData, debug: boolean, queue: QueueItem[], junitWatcher: JunitWatcher) {

  diagLog(`runTestQueue: started for run ${run.name}`);

  if (queue.length === 0)
    throw "empty queue - nothing to do";

  const wkspRunPromises: Promise<void>[] = [];
  const winSettings = config.globalSettings;
  const allWkspsQueueMap: QueueItemMapEntry[] = [];
  const wskpsWithFeaturesSettings = getUrisOfWkspFoldersWithFeatures().map(wkspUri => config.workspaceSettings[wkspUri.path]);

  for (const wkspSettings of wskpsWithFeaturesSettings) {
    const idMatch = uriId(wkspSettings.featuresUri);
    const wkspQueue = queue.filter(item => item.test.id.includes(idMatch));
    const wkspQueueMap = getWkspQueueJunitFileMap(wkspSettings, run, wkspQueue);
    allWkspsQueueMap.push(...wkspQueueMap);
  }

  const wkspNames = wskpsWithFeaturesSettings.map(x => x.name);


  // WAIT for the junit watcher to be ready
  await junitWatcher.startWatchingRun(run, debug, wkspNames, allWkspsQueueMap);

  // run each workspace queue  
  for (const wkspSettings of wskpsWithFeaturesSettings) {

    if (run.token.isCancellationRequested)
      break;

    const wkspQueue = allWkspsQueueMap.filter(x => x.wkspSettings.id == wkspSettings.id).map(q => q.queueItem);
    if (wkspQueue.length === 0)
      continue;

    if (!debug)
      config.logger.clear(wkspSettings.uri);

    // run workspaces sequentially
    if (!winSettings.multiRootRunWorkspacesInParallel || debug) {
      await runWorkspaceQueue(wkspSettings, ctrl, run, request, testData, debug, wkspQueue);
      continue;
    }

    // run workspaces in parallel
    wkspRunPromises.push(runWorkspaceQueue(wkspSettings, ctrl, run, request, testData, debug, wkspQueue));
  }

  await Promise.all(wkspRunPromises);
  await junitWatcher.stopWatchingRun(run);

  diagLog(`runTestQueue: completed for run ${run.name}`);
}


async function runWorkspaceQueue(wkspSettings: WorkspaceSettings, ctrl: vscode.TestController, run: vscode.TestRun,
  request: vscode.TestRunRequest, testData: TestData, debug: boolean, wkspQueue: QueueItem[]) {

  let wr: WkspRun | undefined = undefined;

  diagLog(`runWorkspaceQueue: started for run ${run.name}`, wkspSettings.uri);

  try {

    const allTestsForThisWkspIncluded = allTestsForThisWkspAreIncluded(request, wkspSettings, ctrl, testData);
    const pythonExec = await config.getPythonExecutable(wkspSettings.uri, wkspSettings.name);
    const sortedQueue = wkspQueue.sort((a, b) => a.test.id.localeCompare(b.test.id));
    const junitWkspRunDirUri = getJunitWkspRunDirUri(run, wkspSettings.name);

    wr = new WkspRun(
      wkspSettings, run, request, debug, ctrl, testData, sortedQueue, pythonExec,
      allTestsForThisWkspIncluded, junitWkspRunDirUri
    )

    const start = performance.now();
    logWkspRunStarted(wr);
    await doRunType(wr);
    logWkspRunComplete(wr, start);

  }
  catch (e: unknown) {
    wr?.run.end();
    // unawaited async function (if multiRootRunWorkspacesInParallel) - show error
    config.logger.showError(e, wkspSettings.uri, run);
  }

  diagLog(`runWorkspaceQueue: completed for run ${run.name}`, wkspSettings.uri);
}


async function doRunType(wr: WkspRun) {

  if (wr.wkspSettings.runParallel && !wr.debug) {
    await runFeaturesParallel(wr);
    return;
  }

  if (wr.allTestsForThisWkspIncluded) {
    wr.sortedQueue.forEach(wkspQueueItem => wr.run.started(wkspQueueItem.test));
    await runAllFeatures(wr);
    return;
  }

  await runFeaturesTogether(wr);
}


async function runAllFeatures(wr: WkspRun) {
  diagLog(`runAllFeatures`, wr.wkspSettings.uri);
  await runOrDebugAllFeaturesInOneInstance(wr);
}


async function runFeaturesTogether(wr: WkspRun) {

  diagLog(`runFeaturesTogether`, wr.wkspSettings.uri);

  const runTogetherFeatures: vscode.TestItem[] = [];
  const alreadyProcessedFeatureIds: string[] = [];

  for (const wkspQueueItem of wr.sortedQueue) {

    if (wr.run.token.isCancellationRequested)
      break;

    const runEntireFeature = wr.allTestsForThisWkspIncluded
      ? wkspQueueItem.test.parent
      : allSiblingsIncluded(wr, wkspQueueItem);

    if (runEntireFeature) {
      if (runTogetherFeatures.includes(runEntireFeature))
        continue;
      runTogetherFeatures.push(runEntireFeature);
      continue;
    }

    const featureId = getFeatureIdIfFeatureNotAlreadyProcessed(alreadyProcessedFeatureIds, wkspQueueItem);
    if (!featureId)
      continue;

    const selectedScenarios = wr.sortedQueue.filter(qi => qi.test.id.includes(featureId));
    selectedScenarios.forEach(qi => wr.run.started(qi.test));
    await runOrDebugFeatureWithSelectedScenarios(wr, false, selectedScenarios);
  }

  if (runTogetherFeatures.length > 0) {
    const allChildScenarios: QueueItem[] = [];
    runTogetherFeatures.forEach(feature => allChildScenarios.push(...getChildScenariosForFeature(wr, feature)));
    allChildScenarios.forEach(x => wr.run.started(x.test));

    await runOrDebugFeatures(wr, false, allChildScenarios);
  }
}


async function runFeaturesParallel(wr: WkspRun) {

  if (wr.debug)
    throw new Error("runParallel should not be called with debug=true");

  diagLog(`runFeaturesParallel`, wr.wkspSettings.uri);

  const featuresRun: string[] = [];
  const asyncRunPromises: Promise<void>[] = [];
  const alreadyProcessedFeatureIds: string[] = [];

  for (const wkspQueueItem of wr.sortedQueue) {

    if (wr.run.token.isCancellationRequested)
      break;

    const runEntireFeature = wr.allTestsForThisWkspIncluded
      ? wkspQueueItem.test.parent
      : allSiblingsIncluded(wr, wkspQueueItem);

    if (runEntireFeature) {
      if (featuresRun.includes(runEntireFeature.id))
        continue;
      featuresRun.push(runEntireFeature.id);

      const childScenarios: QueueItem[] = getChildScenariosForParentFeature(wr, wkspQueueItem);
      childScenarios.forEach(x => wr.run.started(x.test));
      const promise = runOrDebugFeatures(wr, true, childScenarios);
      asyncRunPromises.push(promise);
      continue;
    }

    const featureId = getFeatureIdIfFeatureNotAlreadyProcessed(alreadyProcessedFeatureIds, wkspQueueItem);
    if (!featureId)
      continue;

    const selectedScenarios = wr.sortedQueue.filter(qi => qi.test.id.includes(featureId));
    selectedScenarios.forEach(qi => wr.run.started(qi.test));
    const promise = runOrDebugFeatureWithSelectedScenarios(wr, false, selectedScenarios);
    asyncRunPromises.push(promise);
  }

  await Promise.all(asyncRunPromises);
}


function allTestsForThisWkspAreIncluded(request: vscode.TestRunRequest, wkspSettings: WorkspaceSettings,
  ctrl: vscode.TestController, testData: TestData) {

  let allTestsForThisWkspIncluded = (!request.include || request.include.length == 0)
    && (!request.exclude || request.exclude.length == 0);

  if (!allTestsForThisWkspIncluded) {
    const wkspGrandParentItemIncluded = request.include?.filter(item => item.id === wkspSettings.id).length === 1;

    if (wkspGrandParentItemIncluded)
      allTestsForThisWkspIncluded = true;
    else {
      const allWkspItems = getAllTestItems(wkspSettings.id, ctrl.items);
      const wkspTestCount = countTestItems(testData, allWkspItems).testCount;
      allTestsForThisWkspIncluded = request.include?.length === wkspTestCount;
    }
  }
  return allTestsForThisWkspIncluded;
}


function getFeatureIdIfFeatureNotAlreadyProcessed(alreadyProcessedFeatureIds: string[], wkspQueueItem: QueueItem) {


  const parent = wkspQueueItem.runItem.runType === RunItemType.ExampleRow
    ? wkspQueueItem.test.parent?.parent?.parent
    : wkspQueueItem.test.parent;

  if (!parent)
    throw new Error("parent is undefined");

  if (alreadyProcessedFeatureIds.includes(parent.id))
    return;

  alreadyProcessedFeatureIds.push(parent.id);
  return parent.id;
}


function logWkspRunStarted(wr: WkspRun) {
  if (!wr.debug) {
    addRunNote(wr.run);
    config.logger.logInfo(`--- ${wr.wkspSettings.name} tests started for run ${wr.run.name} @${new Date().toISOString()} ---\n`,
      wr.wkspSettings.uri, wr.run);
  }
}


function logWkspRunComplete(wr: WkspRun, start: number) {
  const end = performance.now();
  if (!wr.debug) {
    config.logger.logInfo(`\n--- ${wr.wkspSettings.name} tests completed for run ${wr.run.name} ` +
      `@${new Date().toISOString()} (${(end - start) / 1000} secs)---\n`,
      wr.wkspSettings.uri, wr.run);
  }
  addRunNote(wr.run);
}


function addRunNote(run: vscode.TestRun) {
  run.appendOutput('\r\n');
  run.appendOutput('-----------------------------------------------------------\r\n');
  run.appendOutput('#### See "Behave VSC" output window for Behave output ####\r\n');
  run.appendOutput('-----------------------------------------------------------\r\n');
  run.appendOutput('\r\n');
}


function getChildScenariosForParentFeature(wr: WkspRun, scenarioQueueItem: QueueItem) {
  const parentFeature = scenarioQueueItem.test.parent;
  if (!parentFeature)
    throw `parent feature not found for scenario ${scenarioQueueItem.runItem.scenarioName}}`;
  return getChildScenariosForFeature(wr, parentFeature);
}


function getChildScenariosForFeature(wr: WkspRun, feature: vscode.TestItem) {
  const childScenarios: QueueItem[] = [];
  feature.children.forEach(c => {
    const child = wr.sortedQueue.find(x => x.test.id === c.id);
    if (child)
      childScenarios.push(child);
  });
  return childScenarios;
}


function allSiblingsIncluded(wr: WkspRun, wkspQueueItem: QueueItem): vscode.TestItem | undefined {
  let parent = wkspQueueItem.test.parent;
  if (wkspQueueItem.runItem.runType === RunItemType.ExampleRow)
    parent = wkspQueueItem.test.parent?.parent?.parent;

  if (!parent)
    throw `parent not found for scenario ${wkspQueueItem.runItem.getLabel()}`;

  let allSiblingsIncluded = true;
  parent.children.forEach(child => {
    const includedChild = wr.sortedQueue?.find(x => x.test.id === child.id);
    if (!includedChild)
      allSiblingsIncluded = false;
  });

  return allSiblingsIncluded ? parent : undefined;
}


function convertToTestItemArray(collection: vscode.TestItemCollection) {
  const items: vscode.TestItem[] = [];
  collection.forEach((item: vscode.TestItem) => items.push(item));
  return items;
}
