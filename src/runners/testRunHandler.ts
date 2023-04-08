import * as vscode from 'vscode';
import { performance } from 'perf_hooks';
import { config } from "../configuration";
import { WorkspaceSettings } from "../settings";
import { ItemType, QueueableItem, TestData, FeatureFileItem } from '../parsers/testFile';
import { runOrDebugAllFeaturesInOneInstance, runOrDebugFeatures, runOrDebugFeatureWithSelectedChildren as runOrDebugFeatureWithSelectedChildren } from './runOrDebug';
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
    public readonly queue: QueueItem[],
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


async function queueSelectedTestItems(ctrl: vscode.TestController, run: vscode.TestRun,
  request: vscode.TestRunRequest, queue: QueueItem[], allTests: Iterable<vscode.TestItem>, testData: TestData) {

  for (const test of allTests) {

    if (request.exclude?.includes(test))
      continue;

    const data = testData.get(test);

    if (data instanceof QueueableItem) {
      run.enqueued(test);
      queue.push({ test: test, runItem: data });
      diagLog(`queueSelectedTestItems: queued ${test.id}`);
    }

    if (data instanceof FeatureFileItem && !data.didResolve) {
      const wkspSettings = getWorkspaceSettingsForFile(test.uri);
      const content = await getContentFromFilesystem(test.uri);
      await data.createChildTestItemsFromFeatureFileContent(wkspSettings, content, testData, ctrl, test, "queueSelectedItems");
    }

    await queueSelectedTestItems(ctrl, run, request, queue, convertToTestItemArray(test.children), testData);
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
    const junitWkspRunDirUri = getJunitWkspRunDirUri(run, wkspSettings.name);

    wr = new WkspRun(
      wkspSettings, run, request, debug, ctrl, testData, wkspQueue, pythonExec,
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
    await runFeatures(wr, true);
    return;
  }

  if (wr.allTestsForThisWkspIncluded) {
    wr.queue.forEach(wkspQueueItem => wr.run.started(wkspQueueItem.test));
    await runAllFeatures(wr);
    return;
  }

  await runFeatures(wr, false);
}


async function runAllFeatures(wr: WkspRun) {
  diagLog(`runAllFeatures`, wr.wkspSettings.uri);
  await runOrDebugAllFeaturesInOneInstance(wr);
}


async function runFeatures(wr: WkspRun, parallel: boolean) {

  if (wr.debug && parallel)
    throw new Error("runFeatures should not be called with parallel=true and debug=true");

  diagLog(`runFeatures`, wr.wkspSettings.uri);

  const features: vscode.TestItem[] = [];
  const alreadyProcessedFeatureIds: string[] = [];
  const asyncRunPromises: Promise<void>[] = [];

  for (const wkspQueueItem of wr.queue) {

    if (wr.run.token.isCancellationRequested)
      break;

    wr.run.started(wkspQueueItem.test);

    const parentFeature = getParentFeature(wkspQueueItem);

    if (features.includes(parentFeature))
      continue;

    const runEntireFeature = entireFeatureIncluded(wr, parentFeature);
    if (runEntireFeature) {
      // if (runTogetherFeatures.includes(runEntireFeature)) TODO 
      //   continue;
      features.push(parentFeature);

      if (parallel) {
        const promise = runOrDebugFeatures(wr, true, [wkspQueueItem.test.uri as vscode.Uri]);
        asyncRunPromises.push(promise);
        continue;
      }

      continue;
    }

    const featureId = getFeatureIdIfFeatureNotAlreadyProcessed(alreadyProcessedFeatureIds, parentFeature);
    if (!featureId)
      continue;

    let selectedChildren = wr.queue.filter(qi => qi.test.id.includes(featureId));
    // remove children of parents that are already included themselves
    selectedChildren.forEach(c => c.test.children.forEach(gc => selectedChildren = selectedChildren.filter(x => x.test.id !== gc.id)));

    const promise = runOrDebugFeatureWithSelectedChildren(wr, false, selectedChildren);
    if (parallel) {
      asyncRunPromises.push(promise);
      continue;
    }
    else {
      await promise;
    }
  }

  if (parallel) {
    await Promise.all(asyncRunPromises);
    return;
  }

  if (features.length == 0)
    return;

  const uris = new Set(features.filter(f => f.uri).filter(f => f.uri).map(f => f.uri as vscode.Uri));
  await runOrDebugFeatures(wr, false, [...uris]);
}


// async function runFeaturesParallel(wr: WkspRun) {

//   if (wr.debug)
//     throw new Error("runParallel should not be called with debug=true");

//   diagLog(`runFeaturesParallel`, wr.wkspSettings.uri);

//   const featuresAlreadyRun: vscode.TestItem[] = [];
//   const alreadyProcessedFeatureIds: string[] = [];
//   const asyncRunPromises: Promise<void>[] = [];

//   for (const wkspQueueItem of wr.queue) {

//     if (wr.run.token.isCancellationRequested)
//       break;

//     if (!wkspQueueItem.test.parent)
//       throw `test.parent of ${wkspQueueItem.test.id} is undefined`;

//     if (featuresAlreadyRun.includes(wkspQueueItem.test.parent))
//       continue;

//     const runEntireFeature = getParentFeatureIfEntireFeatureIncluded(wr, wkspQueueItem);
//     if (runEntireFeature) {
//       // if (featuresAlreadyRun.includes(runEntireFeature.id)) TODO
//       //   continue;
//       featuresAlreadyRun.push(runEntireFeature);

//       const promise = runOrDebugFeatures(wr, true, [wkspQueueItem.test.uri as vscode.Uri]);
//       wr.run.started(wkspQueueItem.test);
//       asyncRunPromises.push(promise);
//       continue;
//     }

//     const featureId = getFeatureIdIfFeatureNotAlreadyProcessed(alreadyProcessedFeatureIds, wkspQueueItem);
//     if (!featureId)
//       continue;

//     const selectedChildren = wr.queue.filter(qi => qi.test.id.includes(featureId));
//     selectedChildren.forEach(qi => wr.run.started(qi.test));
//     const promise = runOrDebugFeatureWithSelectedChildren(wr, false, selectedChildren);
//     asyncRunPromises.push(promise);
//   }

//   await Promise.all(asyncRunPromises);
// }


function allTestsForThisWkspAreIncluded(request: vscode.TestRunRequest, wkspSettings: WorkspaceSettings,
  ctrl: vscode.TestController, testData: TestData): boolean {

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


function getFeatureIdIfFeatureNotAlreadyProcessed(alreadyProcessedFeatureIds: string[], feature: vscode.TestItem): string | undefined {
  if (alreadyProcessedFeatureIds.includes(feature.id))
    return;
  alreadyProcessedFeatureIds.push(feature.id);
  return feature.id;
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


// TODO remove commented out code

// function getChildScenariosForParentFeature(scenarioQueueItem: QueueItem, testData: TestData) {
//   const parentFeature = scenarioQueueItem.test.parent;
//   if (!parentFeature)
//     throw `parent feature not found for scenario ${scenarioQueueItem.runItem.scenarioName}}`;
//   return getChildScenariosForFeature(parentFeature, testData);
// }


// function getChildScenariosForFeature(feature: vscode.TestItem, testData: TestData) {
//   const childScenarios: QueueItem[] = [];
//   feature.children.forEach(c => {
//     const runItem = testData.get(c) as RunItem;
//     if (!runItem)
//       throw "missing test data for " + c.id;
//     childScenarios.push({ test: c, runItem: runItem });
//   });
//   return childScenarios;
// }


// function getParentFeatureIfEntireFeatureIncluded(wr: WkspRun, wkspQueueItem: QueueItem) {
//   return wr.allTestsForThisWkspIncluded
//     ? wkspQueueItem.test.parent
//     : getParentFeatureIfAllChildrenInQueue(wr, wkspQueueItem);
// }

function getParentFeature(wkspQueueItem: QueueItem): vscode.TestItem {

  let feature: vscode.TestItem | undefined;

  switch (wkspQueueItem.runItem.itemType) {
    case ItemType.ExampleTable:
      feature = wkspQueueItem.test.parent?.parent;
      break;
    case ItemType.ExampleRow:
      feature = wkspQueueItem.test.parent?.parent?.parent;
      break;
    default:
      feature = wkspQueueItem.test.parent;
  }

  if (!feature)
    throw `parent or feature not found for scenario ${wkspQueueItem.runItem.label}`;

  return feature;
}


function entireFeatureIncluded(wr: WkspRun, feature: vscode.TestItem): boolean {

  function array(collection: vscode.TestItemCollection) {
    // convert testitemcollection to array to enable early return in for loop
    const items: vscode.TestItem[] = [];
    collection.forEach(item => items.push(item));
    return items;
  }

  if (wr.request.include?.includes(feature))
    return true;

  // return false if any feature descendents are not in the queue
  for (const scenario of array(feature.children)) {
    if (!wr.queue?.find(x => x.test.id === scenario.id)) {
      if (scenario.children.size === 0)
        return false;
      for (const exampleTable of array(scenario.children)) {
        if (!wr.queue?.find(x => x.test.id === exampleTable.id)) {
          if (exampleTable.children.size === 0)
            return false;
          for (const exampleRow of array(exampleTable.children)) {
            if (!wr.queue?.find(x => x.test.id === exampleRow.id))
              return false;
          }
        }
      }
    }
  }

  return true;
}


function convertToTestItemArray(collection: vscode.TestItemCollection): vscode.TestItem[] {
  const items: vscode.TestItem[] = [];
  collection.forEach((item: vscode.TestItem) => items.push(item));
  return items;
}
