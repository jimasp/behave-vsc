import * as vscode from 'vscode';
import { performance } from 'perf_hooks';
import { services } from "../common/services";
import { ProjectSettings, CustomRunner, RunProfile } from "../config/settings";
import { Scenario, TestData, TestFile } from '../parsers/testFile';
import { runOrDebugAllFeaturesInOneInstance, runOrDebugFeatures, runOrDebugFeatureWithSelectedScenarios } from './runOrDebug';
import {
  countTestItems, getTestItems, getContentFromFilesystem, uriId,
  getUrisOfWkspFoldersWithFeatures, getProjectSettingsForFile
} from '../common/helpers';
import { QueueItem } from '../extension';
import { xRayLog, LogType } from '../common/logger';
import { getJunitProjRunDirUri, JunitWatcher } from '../watchers/junitWatcher';
import { getProjQueueJunitFileMap, QueueItemMapEntry } from '../parsers/junitParser';



export function testRunHandler(testData: TestData, ctrl: vscode.TestController, junitWatcher: JunitWatcher,
  removeTempDirectoryCancelSource: vscode.CancellationTokenSource) {

  return async (debug: boolean, request: vscode.TestRunRequest, runProfile: RunProfile): Promise<QueueItem[] | undefined> => {

    try {
      xRayLog(`testRunHandler: invoked`);

      if (!isValidTagsParameters(runProfile.tagsParameters)) {
        services.logger.showWarn(`Invalid tag expression: ${runProfile.tagsParameters}`);
        return;
      }

      // the test tree is built as a background process which is called from a few places
      // (and it will be slow during vscode startup due to contention), 
      // so we DON'T want to await it except on user request (refresh click),
      // BUT at the same time, we also don't want to allow test runs when the tests items are out of date vs the file system
      const ready = await services.parser.featureParseComplete(1000, "testRunHandler");
      if (!ready) {
        const msg = "Cannot run tests while feature files are being parsed, please try again.";
        xRayLog(msg, undefined, LogType.warn);
        vscode.window.showWarningMessage(msg, "OK");
        if (services.config.isIntegrationTestRun)
          throw msg;
        return;
      }

      // stop the temp directory removal function if it is still running
      removeTempDirectoryCancelSource.cancel();

      const run = ctrl.createTestRun(request, runProfile.name, false);

      xRayLog(`testRunHandler: starting run ${run.name}`);

      try {
        const queue: QueueItem[] = [];
        const tests = request.include ?? convertToTestItemArray(ctrl.items);
        xRayLog(`testRunHandler: tests length = ${tests.length}`);
        await queueSelectedTestItems(ctrl, run, request, queue, tests, testData);
        xRayLog(`testRunHandler: queue length = ${queue.length}`);
        await runTestQueue(ctrl, run, request, testData, debug, queue, junitWatcher, runProfile);
        return queue;
      }
      catch (e: unknown) {
        // entry point (handler) - show error
        services.logger.showError(e);
      }
      finally {
        run.end();
      }

      xRayLog(`testRunHandler: completed run ${run.name}`);

    }
    catch (e: unknown) {
      // entry point (handler) - show error
      services.logger.showError(e);
    }

  }
}


async function queueSelectedTestItems(ctrl: vscode.TestController, run: vscode.TestRun, request: vscode.TestRunRequest, queue: QueueItem[],
  tests: Iterable<vscode.TestItem>, testData: TestData) {

  for (const test of tests) {

    // find = don't add tests in nested folder nodes more than once
    if (request.exclude?.includes(test) || queue.find(x => x.test.id === test.id))
      continue;

    const data = testData.get(test);

    if (data instanceof Scenario) {
      run.enqueued(test);
      queue.push({ test, scenario: data });
    }
    else {
      if (data instanceof TestFile && !data.didResolve) {
        const projSettings = await getProjectSettingsForFile(test.uri);
        const content = await getContentFromFilesystem(test.uri);
        await data.createScenarioTestItemsFromFeatureFileContent(projSettings, content, testData, ctrl, test, "queueSelectedTestItems");
      }

      await queueSelectedTestItems(ctrl, run, request, queue, convertToTestItemArray(test.children), testData);
    }

  }

}


async function runTestQueue(ctrl: vscode.TestController, run: vscode.TestRun, request: vscode.TestRunRequest,
  testData: TestData, debug: boolean, queue: QueueItem[], junitWatcher: JunitWatcher, runProfile: RunProfile) {

  xRayLog(`runTestQueue: started for run ${run.name}`);

  if (queue.length === 0)
    throw new Error("empty queue - nothing to do");

  const runId = new Date().toISOString().replace(/:/g, "-").replace(/\..+/, "");
  const projRunPromises: Promise<void>[] = [];
  const winSettings = services.config.instanceSettings;
  const allProjectsQueueMap: QueueItemMapEntry[] = [];
  const allProjectsSettings = await Promise.all(getUrisOfWkspFoldersWithFeatures().map(async (projUri) =>
    await services.config.getProjectSettings(projUri.path)
  ));

  for (const projSettings of allProjectsSettings) {
    const idMatch = uriId(projSettings.uri);
    const projQueue = queue.filter(item => item.test.id.includes(idMatch));
    const projQueueMap = getProjQueueJunitFileMap(projSettings, run, runId, projQueue);
    allProjectsQueueMap.push(...projQueueMap);
  }

  const projNames = allProjectsSettings.map(x => x.name);


  // WAIT for the junit watcher to be ready
  if (!runProfile.customRunner || runProfile.customRunner.waitForJUnitResults)
    await junitWatcher.startWatchingRun(run, runId, debug, projNames, allProjectsQueueMap);

  // run each project queue  
  for (const projSettings of allProjectsSettings) {

    if (run.token.isCancellationRequested)
      break;

    const projQueue = allProjectsQueueMap.filter(x => x.projSettings.id == projSettings.id).map(q => q.queueItem);
    if (projQueue.length === 0)
      continue;

    if (!debug)
      services.logger.clear(projSettings.uri);

    // run projects sequentially
    if (!winSettings.runMultiRootProjectsInParallel || debug) {
      await runProjectQueue(projSettings, ctrl, run, runId, request, testData, debug, projQueue, runProfile);
      continue;
    }

    // run projects in parallel
    projRunPromises.push(runProjectQueue(projSettings, ctrl, run, runId, request, testData, debug, projQueue, runProfile));
  }

  // wait for all project runs to complete
  await Promise.all(projRunPromises);

  // stop the junitwatcher
  if (!runProfile.customRunner || runProfile.customRunner.waitForJUnitResults)
    await junitWatcher.stopWatchingRun(run);

  xRayLog(`runTestQueue: completed for run ${run.name}`);
}


async function runProjectQueue(ps: ProjectSettings, ctrl: vscode.TestController, run: vscode.TestRun, runId: string,
  request: vscode.TestRunRequest, testData: TestData, debug: boolean, projQueue: QueueItem[], runProfile: RunProfile) {

  let pr: ProjRun | undefined = undefined;

  xRayLog(`runWorkspaceQueue: started for run ${run.name}`, ps.uri);

  try {

    const allTestsForThisProjIncluded = allTestsForThisProjAreIncluded(request, ps, ctrl, testData);
    const projIncludedFeatures = getIncludedFeaturesForProj(ps.uri, request);
    const pythonExec = await services.config.getPythonExecutable(ps.uri, ps.name);
    projQueue.sort((a, b) => a.test.id.localeCompare(b.test.id));
    const junitProjRunDirUri = getJunitProjRunDirUri(run, runId, ps.name);

    // note that runProfile.env will (and should) override 
    // any pr.projSettings.env global setting with the same key
    const allenv = { ...ps.env, ...runProfile.env };

    pr = new ProjRun(
      ps, run, request, debug, ctrl, testData, projQueue, pythonExec,
      allTestsForThisProjIncluded, projIncludedFeatures, junitProjRunDirUri,
      allenv,
      runProfile.tagsParameters ?? "",
      runProfile.customRunner
    )

    if (pr.customRunner && !pr.customRunner.waitForJUnitResults)
      pr.run.appendOutput("customRunner.waitForJUnitResults=false");

    const start = performance.now();
    logProjRunStarted(pr);
    await doRunType(pr);
    logProjRunComplete(pr, start);

    if (pr.customRunner && !pr.customRunner.waitForJUnitResults) {
      projQueue.forEach(x => { run.skipped(x.test); x.scenario.result = "skipped"; });
      pr.run.appendOutput("customRunner completed");
      pr.run.end();
    }

  }
  catch (e: unknown) {
    pr?.run.end();
    // unawaited async function (if runMultiRootProjectsInParallel) - show error
    services.logger.showError(e, ps.uri, run);
  }

  xRayLog(`runWorkspaceQueue: completed for run ${run.name}`, ps.uri);
}


async function doRunType(pr: ProjRun) {

  if (pr.projSettings.runParallel && !pr.debug) {
    await runFeaturesParallel(pr);
    return;
  }

  if (pr.allTestsForThisProjIncluded) {
    pr.sortedQueue.forEach(projQueueItem => pr.run.started(projQueueItem.test));
    await runAllFeatures(pr);
    return;
  }

  await runFeaturesTogether(pr);
}


async function runAllFeatures(pr: ProjRun) {
  xRayLog(`runAllFeatures`, pr.projSettings.uri);
  await runOrDebugAllFeaturesInOneInstance(pr);
}


async function runFeaturesTogether(pr: ProjRun) {

  xRayLog(`runFeaturesTogether`, pr.projSettings.uri);

  const runTogetherFeatures: vscode.TestItem[] = [];
  const alreadyProcessedFeatureIds: string[] = [];

  for (const projQueueItem of pr.sortedQueue) {

    if (pr.run.token.isCancellationRequested)
      break;

    const runEntireFeature = pr.allTestsForThisProjIncluded
      ? projQueueItem.test.parent
      : parentFeatureOrAllSiblingsIncluded(pr, projQueueItem);

    if (runEntireFeature) {
      if (runTogetherFeatures.includes(runEntireFeature))
        continue;
      runTogetherFeatures.push(runEntireFeature);
      continue;
    }

    const featureId = getFeatureIdIfFeatureNotAlreadyProcessed(alreadyProcessedFeatureIds, projQueueItem);
    if (!featureId)
      continue;

    const selectedScenarios = pr.sortedQueue.filter(qi => qi.test.id.includes(featureId));
    selectedScenarios.forEach(qi => pr.run.started(qi.test));
    await runOrDebugFeatureWithSelectedScenarios(pr, selectedScenarios);
  }

  if (runTogetherFeatures.length > 0) {
    const allChildScenarios: QueueItem[] = [];
    runTogetherFeatures.forEach(feature => allChildScenarios.push(...getChildScenariosForFeature(pr, feature)));
    allChildScenarios.forEach(x => pr.run.started(x.test));

    await runOrDebugFeatures(pr, allChildScenarios);
  }
}


async function runFeaturesParallel(pr: ProjRun) {

  if (pr.debug)
    throw new Error("runParallel should not be called with debug=true");

  xRayLog(`runFeaturesParallel`, pr.projSettings.uri);

  const featuresRun: string[] = [];
  const asyncRunPromises: Promise<void>[] = [];
  const alreadyProcessedFeatureIds: string[] = [];

  for (const projQueueItem of pr.sortedQueue) {

    if (pr.run.token.isCancellationRequested)
      break;

    const runEntireFeature = pr.allTestsForThisProjIncluded
      ? projQueueItem.test.parent
      : parentFeatureOrAllSiblingsIncluded(pr, projQueueItem);

    if (runEntireFeature) {
      if (featuresRun.includes(runEntireFeature.id))
        continue;
      featuresRun.push(runEntireFeature.id);

      const childScenarios: QueueItem[] = getChildScenariosForParentFeature(pr, projQueueItem);
      childScenarios.forEach(x => pr.run.started(x.test));
      const promise = runOrDebugFeatures(pr, childScenarios);
      asyncRunPromises.push(promise);
      continue;
    }

    const featureId = getFeatureIdIfFeatureNotAlreadyProcessed(alreadyProcessedFeatureIds, projQueueItem);
    if (!featureId)
      continue;

    const selectedScenarios = pr.sortedQueue.filter(qi => qi.test.id.includes(featureId));
    selectedScenarios.forEach(qi => pr.run.started(qi.test));
    const promise = runOrDebugFeatureWithSelectedScenarios(pr, selectedScenarios);
    asyncRunPromises.push(promise);
  }

  await Promise.all(asyncRunPromises);
}


function allTestsForThisProjAreIncluded(request: vscode.TestRunRequest, ps: ProjectSettings,
  ctrl: vscode.TestController, testData: TestData) {

  let allTestsForThisProjIncluded = (!request.include || request.include.length == 0)
    && (!request.exclude || request.exclude.length == 0);

  if (!allTestsForThisProjIncluded) {
    const projGrandParentItemIncluded = request.include?.filter(item => item.id === ps.id).length === 1;

    if (projGrandParentItemIncluded)
      allTestsForThisProjIncluded = true;
    else {
      const allProjItems = getTestItems(ps.id, ctrl.items);
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


function logProjRunStarted(pr: ProjRun) {
  if (!pr.debug) {
    services.logger.logInfo(`--- ${pr.projSettings.name} tests started for run ${pr.run.name} @${new Date().toISOString()} ---\n`,
      pr.projSettings.uri, pr.run);
  }
}


function logProjRunComplete(pr: ProjRun, start: number) {
  const end = performance.now();
  if (!pr.debug) {
    services.logger.logInfo(`\n--- ${pr.projSettings.name} tests completed for run ${pr.run.name} ` +
      `@${new Date().toISOString()} (${(end - start) / 1000} secs)---`,
      pr.projSettings.uri, pr.run);
  }
  pr.run.appendOutput('\r\n');
  pr.run.appendOutput('-----------------------------------------------------------\r\n');
  pr.run.appendOutput('#### See "Behave VSC" output window for Behave output ####\r\n');
  pr.run.appendOutput('-----------------------------------------------------------\r\n');
  pr.run.appendOutput('\r\n');
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
    throw new Error("req or child must be supplied");

  req.include?.forEach(inc => items.push(...getIncludedFeaturesForProj(projUri, undefined, inc)));
  return items;
}


function getChildScenariosForParentFeature(pr: ProjRun, scenarioQueueItem: QueueItem) {
  const parentFeature = scenarioQueueItem.test.parent;
  if (!parentFeature)
    throw new Error(`parent feature not found for scenario ${scenarioQueueItem.scenario.scenarioName}}`);
  return getChildScenariosForFeature(pr, parentFeature);
}


function getChildScenariosForFeature(pr: ProjRun, feature: vscode.TestItem) {
  const childScenarios: QueueItem[] = [];
  feature.children.forEach(c => {
    const child = pr.sortedQueue.find(x => x.test.id === c.id);
    if (child)
      childScenarios.push(child);
  });
  return childScenarios;
}


function parentFeatureOrAllSiblingsIncluded(pr: ProjRun, projQueueItem: QueueItem): vscode.TestItem | undefined {
  const parent = projQueueItem.test.parent;
  if (!parent)
    throw new Error(`parent not found for scenario ${projQueueItem.scenario.scenarioName}`);

  const includedParent = pr.includedFeatures?.find(x => x.id === parent.id);
  if (includedParent)
    return includedParent;

  let allSiblingsIncluded = true;
  parent.children.forEach(child => {
    const includedChild = pr.sortedQueue?.find(x => x.test.id === child.id);
    if (!includedChild)
      allSiblingsIncluded = false;
  });

  return allSiblingsIncluded ? parent : undefined;
}


function convertToTestItemArray(collection: vscode.TestItemCollection): vscode.TestItem[] {
  const items: vscode.TestItem[] = [];
  collection.forEach((item: vscode.TestItem) => items.push(item));
  return items;
}


function isValidTagsParameters(tagsParameters: string | undefined): boolean {
  if (!tagsParameters)
    return true;

  const regex = /--(?!tags\b)\w+/;
  if (regex.test(tagsParameters))
    return false;

  return true;
}


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
    public readonly env: { [key: string]: string; },
    public readonly tagsParameters: string,
    public readonly customRunner?: CustomRunner
  ) { }
}


export interface ITestRunHandler {
  (debug: boolean, request: vscode.TestRunRequest, runProfile: RunProfile): Promise<QueueItem[] | undefined>;
}


