import * as vscode from 'vscode';
import { performance } from 'perf_hooks';
import { config } from "../config/configuration";
import { RunProfile, ProjectSettings } from "../config/settings";
import { Scenario, TestData, TestFile } from '../parsers/testFile';
import { runOrDebugAllFeaturesInOneInstance, runOrDebugFeatures, runOrDebugFeatureWithSelectedScenarios } from './runOrDebug';
import {
  countTestItems, getTestItems, getContentFromFilesystem, uriId,
  getUrisOfWkspFoldersWithFeatures, getProjectSettingsForFile, rndNumeric
} from '../common/helpers';
import { QueueItem } from '../extension';
import { FileParser } from '../parsers/fileParser';
import { diagLog, DiagLogType } from '../common/logger';
import { getJunitProjRunDirUri, JunitWatcher } from '../watchers/junitWatcher';
import { getProjQueueJunitFileMap, QueueItemMapEntry } from '../parsers/junitParser';

export class ProjRun {
  constructor(
    public readonly projSettings: ProjectSettings,
    public readonly run: vscode.TestRun,
    public readonly request: vscode.TestRunRequest,
    public readonly debug: boolean,
    public readonly ctrl: vscode.TestController,
    public readonly testData: TestData,
    public readonly sortedQueue: QueueItem[],
    public readonly pythonExec: string,
    public readonly allTestsForThisProjIncluded: boolean,
    public readonly includedFeatures: vscode.TestItem[],
    public readonly junitRunDirUri: vscode.Uri,
    public readonly tagExpression: string,
    public readonly env: { [key: string]: string; }
  ) { }
}


export function testRunHandler(testData: TestData, ctrl: vscode.TestController, parser: FileParser, junitWatcher: JunitWatcher,
  removeTempDirectoryCancelSource: vscode.CancellationTokenSource) {

  return async (debug: boolean, request: vscode.TestRunRequest, runProfile: RunProfile = new RunProfile()) => {

    diagLog(`testRunHandler: invoked`);

    // the test tree is built as a background process which is called from a few places
    // (and it will be slow during vscode startup due to contention), 
    // so we DON'T want to await it except on user request (refresh click),
    // BUT at the same time, we also don't want to allow test runs when the tests items are out of date vs the file system
    const ready = await parser.featureParseComplete(1000, "testRunHandler");
    if (!ready) {
      const msg = "Cannot run tests while feature files are being parsed, please try again.";
      diagLog(msg, undefined, DiagLogType.warn);
      vscode.window.showWarningMessage(msg, "OK");
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
      await runTestQueue(ctrl, run, request, testData, debug, queue, junitWatcher, runProfile);
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

    if (data instanceof Scenario) {
      run.enqueued(test);
      queue.push({ test, scenario: data });
    }
    else {
      if (data instanceof TestFile && !data.didResolve) {
        const projSettings = getProjectSettingsForFile(test.uri);
        const content = await getContentFromFilesystem(test.uri);
        await data.createScenarioTestItemsFromFeatureFileContent(projSettings, content, testData, ctrl, test, "queueSelectedItems");
      }

      await queueSelectedTestItems(ctrl, run, request, queue, convertToTestItemArray(test.children), testData);
    }

  }

}


async function runTestQueue(ctrl: vscode.TestController, run: vscode.TestRun, request: vscode.TestRunRequest,
  testData: TestData, debug: boolean, queue: QueueItem[], junitWatcher: JunitWatcher, runProfile: RunProfile) {

  diagLog(`runTestQueue: started for run ${run.name}`);

  if (queue.length === 0)
    throw "empty queue - nothing to do";

  const projRunPromises: Promise<void>[] = [];
  const winSettings = config.instanceSettings;
  const allProjectsQueueMap: QueueItemMapEntry[] = [];
  const allProjectsSettings = getUrisOfWkspFoldersWithFeatures().map(projUri => config.projectSettings[projUri.path]);

  for (const projSettings of allProjectsSettings) {
    const idMatch = uriId(projSettings.uri);
    const projQueue = queue.filter(item => item.test.id.includes(idMatch));
    const projQueueMap = getProjQueueJunitFileMap(projSettings, run, projQueue);
    allProjectsQueueMap.push(...projQueueMap);
  }

  const projNames = allProjectsSettings.map(x => x.name);


  // WAIT for the junit watcher to be ready
  await junitWatcher.startWatchingRun(run, debug, projNames, allProjectsQueueMap);

  // run each workspace queue  
  for (const projSettings of allProjectsSettings) {

    if (run.token.isCancellationRequested)
      break;

    const projQueue = allProjectsQueueMap.filter(x => x.projSettings.id == projSettings.id).map(q => q.queueItem);
    if (projQueue.length === 0)
      continue;

    if (!debug)
      config.logger.clear(projSettings.uri);

    // run workspaces sequentially
    if (!winSettings.runMultiRootProjectsInParallel || debug) {
      await runProjectQueue(projSettings, ctrl, run, request, testData, debug, projQueue, runProfile);
      continue;
    }

    // run workspaces in parallel
    projRunPromises.push(runProjectQueue(projSettings, ctrl, run, request, testData, debug, projQueue, runProfile));
  }

  await Promise.all(projRunPromises);
  await junitWatcher.stopWatchingRun(run);

  diagLog(`runTestQueue: completed for run ${run.name}`);
}


async function runProjectQueue(projSettings: ProjectSettings, ctrl: vscode.TestController, run: vscode.TestRun,
  request: vscode.TestRunRequest, testData: TestData, debug: boolean, projQueue: QueueItem[], runProfile: RunProfile) {

  let wr: ProjRun | undefined = undefined;

  diagLog(`runWorkspaceQueue: started for run ${run.name}`, projSettings.uri);

  try {

    const allTestsForThisProjIncluded = allTestsForThisProjAreIncluded(request, projSettings, ctrl, testData);
    const projIncludedFeatures = getIncludedFeaturesForProj(projSettings.uri, request);
    const pythonExec = await config.getPythonExecutable(projSettings.uri, projSettings.name);
    const sortedQueue = projQueue.sort((a, b) => a.test.id.localeCompare(b.test.id));
    const junitProjRunDirUri = getJunitProjRunDirUri(run, projSettings.name);

    // note that runProfile.env will (and should) override 
    // any wr.projSettings.env global setting with the same key
    const allenv = { ...projSettings.env, ...runProfile.env };

    wr = new ProjRun(
      projSettings, run, request, debug, ctrl, testData, sortedQueue, pythonExec,
      allTestsForThisProjIncluded, projIncludedFeatures, junitProjRunDirUri,
      runProfile.tagExpression ?? "", allenv
    )

    const start = performance.now();
    logProjRunStarted(wr);
    await doRunType(wr);
    logProjRunComplete(wr, start);

  }
  catch (e: unknown) {
    wr?.run.end();
    // unawaited async function (if runMultiRootProjectsInParallel) - show error
    config.logger.showError(e, projSettings.uri, run);
  }

  diagLog(`runWorkspaceQueue: completed for run ${run.name}`, projSettings.uri);
}


async function doRunType(wr: ProjRun) {

  if (wr.projSettings.runParallel && !wr.debug) {
    await runFeaturesParallel(wr);
    return;
  }

  if (wr.allTestsForThisProjIncluded) {
    wr.sortedQueue.forEach(projQueueItem => wr.run.started(projQueueItem.test));
    await runAllFeatures(wr);
    return;
  }

  await runFeaturesTogether(wr);
}


async function runAllFeatures(wr: ProjRun) {
  diagLog(`runAllFeatures`, wr.projSettings.uri);
  await runOrDebugAllFeaturesInOneInstance(wr);
}


async function runFeaturesTogether(wr: ProjRun) {

  diagLog(`runFeaturesTogether`, wr.projSettings.uri);

  const runTogetherFeatures: vscode.TestItem[] = [];
  const alreadyProcessedFeatureIds: string[] = [];

  for (const projQueueItem of wr.sortedQueue) {

    if (wr.run.token.isCancellationRequested)
      break;

    const runEntireFeature = wr.allTestsForThisProjIncluded
      ? projQueueItem.test.parent
      : parentFeatureOrAllSiblingsIncluded(wr, projQueueItem);

    if (runEntireFeature) {
      if (runTogetherFeatures.includes(runEntireFeature))
        continue;
      runTogetherFeatures.push(runEntireFeature);
      continue;
    }

    const featureId = getFeatureIdIfFeatureNotAlreadyProcessed(alreadyProcessedFeatureIds, projQueueItem);
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


async function runFeaturesParallel(wr: ProjRun) {

  if (wr.debug)
    throw new Error("runParallel should not be called with debug=true");

  diagLog(`runFeaturesParallel`, wr.projSettings.uri);

  const featuresRun: string[] = [];
  const asyncRunPromises: Promise<void>[] = [];
  const alreadyProcessedFeatureIds: string[] = [];

  for (const projQueueItem of wr.sortedQueue) {

    if (wr.run.token.isCancellationRequested)
      break;

    const runEntireFeature = wr.allTestsForThisProjIncluded
      ? projQueueItem.test.parent
      : parentFeatureOrAllSiblingsIncluded(wr, projQueueItem);

    if (runEntireFeature) {
      if (featuresRun.includes(runEntireFeature.id))
        continue;
      featuresRun.push(runEntireFeature.id);

      const childScenarios: QueueItem[] = getChildScenariosForParentFeature(wr, projQueueItem);
      childScenarios.forEach(x => wr.run.started(x.test));
      const promise = runOrDebugFeatures(wr, true, childScenarios);
      asyncRunPromises.push(promise);
      continue;
    }

    const featureId = getFeatureIdIfFeatureNotAlreadyProcessed(alreadyProcessedFeatureIds, projQueueItem);
    if (!featureId)
      continue;

    const selectedScenarios = wr.sortedQueue.filter(qi => qi.test.id.includes(featureId));
    selectedScenarios.forEach(qi => wr.run.started(qi.test));
    const promise = runOrDebugFeatureWithSelectedScenarios(wr, false, selectedScenarios);
    asyncRunPromises.push(promise);
  }

  await Promise.all(asyncRunPromises);
}


function allTestsForThisProjAreIncluded(request: vscode.TestRunRequest, projSettings: ProjectSettings,
  ctrl: vscode.TestController, testData: TestData) {

  let allTestsForThisProjIncluded = (!request.include || request.include.length == 0)
    && (!request.exclude || request.exclude.length == 0);

  if (!allTestsForThisProjIncluded) {
    const projGrandParentItemIncluded = request.include?.filter(item => item.id === projSettings.id).length === 1;

    if (projGrandParentItemIncluded)
      allTestsForThisProjIncluded = true;
    else {
      const allProjItems = getTestItems(projSettings.id, ctrl.items);
      const projTestCount = countTestItems(testData, allProjItems).testCount;
      allTestsForThisProjIncluded = request.include?.length === projTestCount;
    }
  }
  return allTestsForThisProjIncluded;
}


function getFeatureIdIfFeatureNotAlreadyProcessed(alreadyProcessedFeatureIds: string[], projQueueItem: QueueItem) {
  const featureId = projQueueItem.test.parent?.id;
  if (!featureId)
    throw new Error("test.parent.id is undefined");

  if (alreadyProcessedFeatureIds.includes(featureId))
    return;

  alreadyProcessedFeatureIds.push(featureId);
  return featureId;
}


function logProjRunStarted(wr: ProjRun) {
  if (!wr.debug) {
    config.logger.logInfo(`--- ${wr.projSettings.name} tests started for run ${wr.run.name} @${new Date().toISOString()} ---\n`,
      wr.projSettings.uri, wr.run);
  }
}


function logProjRunComplete(wr: ProjRun, start: number) {
  const end = performance.now();
  if (!wr.debug) {
    config.logger.logInfo(`\n--- ${wr.projSettings.name} tests completed for run ${wr.run.name} ` +
      `@${new Date().toISOString()} (${(end - start) / 1000} secs)---`,
      wr.projSettings.uri, wr.run);
  }
  wr.run.appendOutput('\r\n');
  wr.run.appendOutput('-----------------------------------------------------------\r\n');
  wr.run.appendOutput('#### See "Behave VSC" output window for Behave output ####\r\n');
  wr.run.appendOutput('-----------------------------------------------------------\r\n');
  wr.run.appendOutput('\r\n');
}



function getIncludedFeaturesForProj(projUri: vscode.Uri, req: vscode.TestRunRequest | undefined,
  child: vscode.TestItem | undefined = undefined): vscode.TestItem[] {

  const items: vscode.TestItem[] = [];

  if (child) {
    if (child.uri)
      return uriId(child.uri).startsWith(uriId(projUri)) && child.id.toLowerCase().endsWith(".feature") ? [child] : [];
    // no uri = it's a folder
    child.children.forEach(child => items.push(...getIncludedFeaturesForProj(projUri, undefined, child)));
    return items;
  }

  if (!req)
    throw "req or child must be supplied";

  req.include?.forEach(inc => items.push(...getIncludedFeaturesForProj(projUri, undefined, inc)));
  return items;
}


function getChildScenariosForParentFeature(wr: ProjRun, scenarioQueueItem: QueueItem) {
  const parentFeature = scenarioQueueItem.test.parent;
  if (!parentFeature)
    throw `parent feature not found for scenario ${scenarioQueueItem.scenario.scenarioName}}`;
  return getChildScenariosForFeature(wr, parentFeature);
}


function getChildScenariosForFeature(wr: ProjRun, feature: vscode.TestItem) {
  const childScenarios: QueueItem[] = [];
  feature.children.forEach(c => {
    const child = wr.sortedQueue.find(x => x.test.id === c.id);
    if (child)
      childScenarios.push(child);
  });
  return childScenarios;
}


function parentFeatureOrAllSiblingsIncluded(wr: ProjRun, projQueueItem: QueueItem): vscode.TestItem | undefined {
  const parent = projQueueItem.test.parent;
  if (!parent)
    throw `parent not found for scenario ${projQueueItem.scenario.scenarioName}`;

  const includedParent = wr.includedFeatures?.find(x => x.id === parent.id);
  if (includedParent)
    return includedParent;

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
