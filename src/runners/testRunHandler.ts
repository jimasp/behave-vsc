import * as vscode from 'vscode';
import { config } from "../common/configuration";
import { WorkspaceSettings } from "../common/settings";
import { FeatureDescendentNode, TestData, FeatureNode } from '../parsers/featureBuilder';
import { runOrDebugAllFeaturesInOneInstance, runOrDebugFeatures, runOrDebugFeatureWithSelectedChildren as runOrDebugFeatureWithSelectedChildren } from './runOrDebug';
import {
  countTestNodes, getContentFromFilesystem,
  getUrisOfWkspFoldersWithFeatures, rndNumeric, getTestItemArray
} from '../common/helpers';
import { QueueItem } from '../extension';
import { FileParser, FolderNode } from '../parsers/fileParser';
import { diagLog, DiagLogType } from '../common/logger';
import { getJunitWkspRunDirUri, JunitWatcher } from '../watchers/junitWatcher';
import { getWkspQueueJunitFileMap } from '../parsers/junitParser';

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

    try {
      return await runTests(ctrl, request, testData, debug, junitWatcher);
    }
    catch (e: unknown) {
      // entry point (handler) - show error
      config.logger.showError(e, undefined);
    }

  };

}


async function runTests(ctrl: vscode.TestController, request: vscode.TestRunRequest,
  testData: TestData, debug: boolean, junitWatcher: JunitWatcher) {

  const allQueueItems: QueueItem[] = [];
  const wkspRunPromises: Promise<vscode.TestRun>[] = [];
  const winSettings = config.globalSettings;
  const wskpsWithFeaturesSettings = getUrisOfWkspFoldersWithFeatures().map(wkspUri => config.workspaceSettings[wkspUri.path]);
  const runs: vscode.TestRun[] = [];



  try {

    // run each workspace queue  
    for (const wkspSettings of wskpsWithFeaturesSettings) {

      const wkspQueue: QueueItem[] = [];
      await queueSelectedTestItemsForWorkspace(wkspSettings, ctrl, request, wkspQueue,
        request.include ?? getTestItemArray(ctrl.items), testData);
      allQueueItems.push(...wkspQueue);

      if (wkspQueue.length === 0)
        continue;

      const runName = wkspSettings.name + "_" + rndNumeric();
      const run = ctrl.createTestRun(request, runName, false);
      wkspQueue.forEach(q => run.enqueued(q.test));
      const wkspQueueMap = getWkspQueueJunitFileMap(wkspSettings, run, wkspQueue);

      // WAIT for the junit watcher to be ready    
      await junitWatcher.startWatchingRun(run, debug, wkspSettings.name, wkspQueueMap);

      if (!debug)
        config.logger.clear(wkspSettings.uri);

      // run workspace sequentially
      if (!winSettings.multiRootRunWorkspacesInParallel || debug) {
        await runWorkspaceQueue(wkspSettings, ctrl, run, request, testData, debug, wkspQueue);
        await junitWatcher.stopWatchingRun(run);
        run.end();
        runs.splice(runs.indexOf(run), 1);
        continue;
      }

      // run workspace in parallel 
      runs.push(run);
      wkspRunPromises.push(runWorkspaceQueue(wkspSettings, ctrl, run, request, testData, debug, wkspQueue));
    }

    await Promise.all(wkspRunPromises.map(p =>
      p.then(async (run: vscode.TestRun) => {
        await junitWatcher.stopWatchingRun(run);
        run.end();
        runs.splice(runs.indexOf(run), 1);
      },
        (e: Error) => { throw e; })))
      .catch(e => { throw e; });

    // TODO review how integration tests use this and how it was returned before by testrunhandler
    return allQueueItems;
  }
  finally {
    for (const run of runs) {
      await junitWatcher.stopWatchingRun(run);
      run.end();
    }
  }

}



async function queueSelectedTestItemsForWorkspace(wkspSettings: WorkspaceSettings, ctrl: vscode.TestController,
  request: vscode.TestRunRequest, queue: QueueItem[], allTests: Iterable<vscode.TestItem>, testData: TestData) {

  for (const test of allTests) {

    if (!test.id.startsWith(wkspSettings.id))
      continue;

    if (request.exclude?.includes(test))
      continue;

    const data = testData.get(test);

    if (data instanceof FeatureDescendentNode) {
      queue.push({ test: test, qItem: data });
    }

    if (data instanceof FeatureNode && !data.didResolve) {
      const content = await getContentFromFilesystem(test.uri);
      await data.createChildTestItemsFromFeatureFileContent(wkspSettings, content, testData, ctrl, test, "queueSelectedItems");
    }

    await queueSelectedTestItemsForWorkspace(wkspSettings, ctrl, request, queue, getTestItemArray(test.children), testData);
  }

}


async function runWorkspaceQueue(wkspSettings: WorkspaceSettings, ctrl: vscode.TestController, run: vscode.TestRun,
  request: vscode.TestRunRequest, testData: TestData, debug: boolean, wkspQueue: QueueItem[]): Promise<vscode.TestRun> {

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

    await doRunType(wr);

  }
  catch (e: unknown) {
    wr?.run.end();
    // unawaited async function (if multiRootRunWorkspacesInParallel) - show error
    config.logger.showError(e, wkspSettings.uri);
  }

  diagLog(`runWorkspaceQueue: completed for run ${run.name}`, wkspSettings.uri);

  return run;
}


async function doRunType(wr: WkspRun) {

  if (wr.wkspSettings.runParallel && !wr.debug)
    return await runFeatures(wr, true);

  if (wr.allTestsForThisWkspIncluded)
    return await runAllFeatures(wr);

  await runFeatures(wr, false);
}


async function runAllFeatures(wr: WkspRun) {
  diagLog(`runAllFeatures`, wr.wkspSettings.uri);
  wr.queue.forEach(wkspQueueItem => wr.run.started(wkspQueueItem.test));
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

    const parentFeature = getParentFeature(wkspQueueItem, wr.testData);
    if (features.includes(parentFeature))
      continue;

    // if entire feature is included, add it to the list, or start it now if parallel
    const runEntireFeature = allDescendentsAreInQueue(wr, parentFeature);
    if (runEntireFeature) {
      if (!features.includes(parentFeature))
        features.push(parentFeature);
      if (!parallel)
        continue;
      const promise = runOrDebugFeatures(wr, true, [wkspQueueItem.test.uri as vscode.Uri]);
      asyncRunPromises.push(promise);
      continue;
    }

    // not running entire feature, get the selected scenarios for the item's parent feature and mark feature as processed, then run them
    const featureId = getFeatureIdIfFeatureNotAlreadyProcessed(alreadyProcessedFeatureIds, parentFeature);
    if (!featureId)
      continue;

    const selectedChildren = optimiseSelectedChildren(wr, featureId);
    const promise = runOrDebugFeatureWithSelectedChildren(wr, false, selectedChildren);
    if (parallel) {
      asyncRunPromises.push(promise);
      continue;
    }
    else {
      await promise;
    }
  }

  // run features

  if (parallel) {
    await Promise.all(asyncRunPromises);
    return;
  }

  if (features.length == 0)
    return;

  //const uris = new Set(features.filter(f => f.uri).filter(f => f.uri).map(f => f.uri as vscode.Uri));
  await runOrDebugFeatures(wr, false, [...features.map(f => f.uri as vscode.Uri)]);
}


function allTestsForThisWkspAreIncluded(request: vscode.TestRunRequest, wkspSettings: WorkspaceSettings,
  ctrl: vscode.TestController, testData: TestData): boolean {

  // check if "Feature tests" node clicked or "Run all tests" clicked
  const noIncludesOrExcludes = (!request.include || request.include.length == 0) && (!request.exclude || request.exclude.length == 0);
  if (noIncludesOrExcludes)
    return true;

  // workspace node clicked (e.g. "project A" in multi-root workspace)
  const wkspNodeIncluded = request.include?.filter(item => item.id === wkspSettings.id).length === 1;
  if (wkspNodeIncluded)
    return true;


  // finally check if all features for this workspace are included in the request 
  // (e.g. click one feature in a single workspace without python tests, like example-project/Simple)

  const wkspNodeCounts = countTestNodes(testData, ctrl.items);
  const selectedFeaturesCount = request.include?.filter(item => {
    if (!item.id.includes(wkspSettings.id))
      return false;
    return testData.get(item) instanceof FeatureNode;
  }).length ?? 0;

  let selectedFoldersChildFeaturesCount = 0;
  if (request.include) {
    for (const item of request.include) {
      if (!item.id.includes(wkspSettings.id))
        continue;
      if (!(testData.get(item) instanceof FolderNode))
        continue;
      const childFeatureCount = getTestItemArray(item.children).filter(c => (testData.get(c) instanceof FeatureNode)).length;
      selectedFoldersChildFeaturesCount += childFeatureCount;
    }
  }

  return wkspNodeCounts.features === selectedFeaturesCount + selectedFoldersChildFeaturesCount;
}


function getFeatureIdIfFeatureNotAlreadyProcessed(alreadyProcessedFeatureIds: string[], feature: vscode.TestItem): string | undefined {
  if (alreadyProcessedFeatureIds.includes(feature.id))
    return;
  alreadyProcessedFeatureIds.push(feature.id);
  return feature.id;
}


function getParentFeature(wkspQueueItem: QueueItem, testData: TestData): vscode.TestItem {
  let test = wkspQueueItem.test;
  while (test.parent) {
    const data = testData.get(test.parent);
    if (data instanceof FeatureNode) {
      return test.parent;
    }
    test = test.parent;
  }
  throw `parent or feature not found for ${wkspQueueItem.test.label}`;
}


function allDescendentsAreInQueue(wr: WkspRun, item: vscode.TestItem): boolean {

  if (wr.request.include?.includes(item))
    return true;

  const itemDescendents = getTestItemArray(wr.ctrl.items, wr.wkspSettings.id).filter(i => i.id.startsWith(item.id + "/"));

  return !itemDescendents.some(descendent =>
    !wr.queue?.find(x => x.test.id === descendent.id) && (descendent.children.size === 0 || !allDescendentsAreInQueue(wr, descendent))
  );

}


function optimiseSelectedChildren(wr: WkspRun, featureId: string) {

  let selectedChildren = wr.queue.filter(qi => qi.test.id.includes(featureId));

  // first, add any parents that have all child rows selected (if the table is not already selected)
  for (const c of selectedChildren) {
    if (c.test.parent && !selectedChildren.find(x => x.test.id === c.test.parent?.id) && allDescendentsAreInQueue(wr, c.test.parent))
      selectedChildren.push({ test: c.test.parent, qItem: wr.testData.get(c.test.parent) as FeatureDescendentNode });
  }

  // now remove children of parents that are already included themselves  
  for (const c of selectedChildren) {
    c.test.children.forEach(gc => selectedChildren = selectedChildren.filter(x => x.test.id !== gc.id));
  }

  return selectedChildren;
}

