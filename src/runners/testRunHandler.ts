import * as vscode from 'vscode';
import { performance } from 'perf_hooks';
import { services } from "../common/services";
import { ProjectSettings, CustomRunner, RunProfile } from "../config/settings";
import { Scenario, TestData, TestFile } from '../parsers/testFile';
import { runOrDebugAllFeaturesInOneInstance, runOrDebugFeatures, runOrDebugFeatureWithSelectedScenarios } from './runOrDebug';
import { countTestItems, getTestItems, getContentFromFilesystem, uriId, getTimeString } from '../common/helpers';
import { QueueItem } from '../extension';
import { xRayLog, LogType } from '../common/logger';
import { getJunitProjRunDirUri, JunitWatcher } from '../watchers/junitWatcher';
import { getProjQueueJunitFileMap } from '../parsers/junitParser';

const sequence: number[] = [];

export function testRunHandler(ctrl: vscode.TestController, testData: TestData, junitWatcher: JunitWatcher) {

  return async (debug: boolean, request: vscode.TestRunRequest, runProfile: RunProfile): Promise<QueueItem[] | undefined> => {
    // create finally vars
    let seqNo = -1;
    let projTestRun: vscode.TestRun | undefined = undefined;

    try {

      // wait for this project's turn if required (i.e. run projects sequentially if required)
      if (debug || !services.config.instanceSettings.runMultiRootProjectsInParallel) {
        seqNo = sequence.length === 0 ? 0 : Math.max(...sequence) + 1;
        sequence.push(seqNo);
        while (Math.min(...sequence) !== seqNo) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      const projUri = runProfile.projUri;
      const ps = await services.config.getProjectSettings(projUri);
      xRayLog(`testRunHandler: invoked for project "${ps.name}"`);

      if (!isValidTagsParameters(runProfile.tagsParameters)) {
        services.logger.showWarn(`Invalid tag expression: ${runProfile.tagsParameters}`);
        return;
      }

      // the test tree is built as a background process which is called from a few places
      // (and it will be slow during vscode startup due to contention), 
      // so we DON'T want to await it except maybe on user request (refresh click),
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

      const runName = ps.name + " " + getTimeString();
      projTestRun = ctrl.createTestRun(request, runName, false);

      const queue: QueueItem[] = [];
      const tests = request.include ?? convertToTestItemArray(ctrl.items);
      xRayLog(`testRunHandler: tests length = ${tests.length}`);
      await queueSelectedProjTestItems(ps, ctrl, projTestRun, request, queue, tests, testData);

      if (queue.length === 0) {
        if (services.config.isIntegrationTestRun)
          debugger; // eslint-disable-line no-debugger
        projTestRun.appendOutput("Test run aborted. No matching tests found.");
        throw new Error("empty queue - nothing to do");
      }

      xRayLog(`testRunHandler: queue length = ${queue.length}`);
      xRayLog(`testRunHandler: starting run ${projTestRun.name}`);
      await runProjTestQueue(ps, ctrl, projTestRun, request, testData, debug, queue, junitWatcher, runProfile);
      return queue;

    }
    catch (e: unknown) {
      // entry point (handler) - show error
      services.logger.showError(e);
    }
    finally {
      if (projTestRun) {
        xRayLog(`testRunHandler: completed run ${projTestRun.name}`);
        projTestRun.end();
      }
      sequence.splice(sequence.indexOf(seqNo), 1);
    }
  }
}



async function queueSelectedProjTestItems(ps: ProjectSettings, ctrl: vscode.TestController, run: vscode.TestRun,
  request: vscode.TestRunRequest, queue: QueueItem[], tests: Iterable<vscode.TestItem>, testData: TestData) {

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
        const content = await getContentFromFilesystem(test.uri);
        await data.createScenarioTestItemsFromFeatureFileContent(ps, content, testData, ctrl, test, "queueSelectedTestItems");
      }

      await queueSelectedProjTestItems(ps, ctrl, run, request, queue, convertToTestItemArray(test.children), testData);
    }

  }

}


async function runProjTestQueue(ps: ProjectSettings, ctrl: vscode.TestController, run: vscode.TestRun, request: vscode.TestRunRequest,
  testData: TestData, debug: boolean, queue: QueueItem[], junitWatcher: JunitWatcher, runProfile: RunProfile) {

  xRayLog(`runTestQueue: started for run ${run.name}`);

  const projQueue = queue.filter(item => item.test.id.includes(ps.id));
  const projQueueMap = getProjQueueJunitFileMap(ps, run, projQueue);

  if (!debug)
    services.logger.clear(ps.uri);

  if (projQueueMap.map(q => q.queueItem).length === 0)
    return;

  const waitForJUnitFiles = !runProfile.customRunner || runProfile.customRunner.waitForJUnitFiles;
  if (!waitForJUnitFiles) {
    projQueueMap.map(q => q.queueItem).forEach(x => { run.skipped(x.test); x.scenario.result = undefined; });
  }
  else {
    // startWatchingRun will try to wait for the junit watcher to be ready (detecting files) on the run folder before starting the run  
    await junitWatcher.startWatchingRun(ps, run, debug, projQueueMap);
  }

  if (run.token.isCancellationRequested)
    return;

  await runProjectQueue(ps, ctrl, run, request, testData, debug, projQueue, runProfile);

  // stop the junitwatcher for this run folder
  if (waitForJUnitFiles)
    await junitWatcher.stopWatchingRun(run);

  xRayLog(`runTestQueue: completed for run ${run.name}`);
}


async function runProjectQueue(ps: ProjectSettings, ctrl: vscode.TestController, run: vscode.TestRun,
  request: vscode.TestRunRequest, testData: TestData, debug: boolean, projQueue: QueueItem[], runProfile: RunProfile) {

  let pr: ProjRun | undefined = undefined;

  xRayLog(`runWorkspaceQueue: started for run ${run.name}`, ps.uri);

  try {

    const allTestsForThisProjIncluded = allTestsForThisProjAreIncluded(request, ps, ctrl, testData);
    const projIncludedFeatures = getIncludedFeaturesForProj(ps.uri, request);
    const pythonExec = await services.config.getPythonExecutable(ps.uri, ps.name);
    projQueue.sort((a, b) => a.test.id.localeCompare(b.test.id));
    const junitProjRunDirUri = getJunitProjRunDirUri(ps, run);

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

    const start = performance.now();
    logProjRunStarted(pr);
    await doRunType(pr);
    logProjRunComplete(pr, start);

  }
  catch (e: unknown) {
    pr?.projTestRun.end();
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
    pr.sortedQueue.forEach(projQueueItem => pr.projTestRun.started(projQueueItem.test));
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

    if (pr.projTestRun.token.isCancellationRequested)
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
    selectedScenarios.forEach(qi => pr.projTestRun.started(qi.test));
    await runOrDebugFeatureWithSelectedScenarios(pr, selectedScenarios);
  }

  if (runTogetherFeatures.length > 0) {
    const allChildScenarios: QueueItem[] = [];
    runTogetherFeatures.forEach(feature => allChildScenarios.push(...getChildScenariosForFeature(pr, feature)));
    allChildScenarios.forEach(x => pr.projTestRun.started(x.test));

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

    if (pr.projTestRun.token.isCancellationRequested)
      break;

    const runEntireFeature = pr.allTestsForThisProjIncluded
      ? projQueueItem.test.parent
      : parentFeatureOrAllSiblingsIncluded(pr, projQueueItem);

    if (runEntireFeature) {
      if (featuresRun.includes(runEntireFeature.id))
        continue;
      featuresRun.push(runEntireFeature.id);

      const childScenarios: QueueItem[] = getChildScenariosForParentFeature(pr, projQueueItem);
      childScenarios.forEach(x => pr.projTestRun.started(x.test));
      const promise = runOrDebugFeatures(pr, childScenarios);
      asyncRunPromises.push(promise);
      continue;
    }

    const featureId = getFeatureIdIfFeatureNotAlreadyProcessed(alreadyProcessedFeatureIds, projQueueItem);
    if (!featureId)
      continue;

    const selectedScenarios = pr.sortedQueue.filter(qi => qi.test.id.includes(featureId));
    selectedScenarios.forEach(qi => pr.projTestRun.started(qi.test));
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
    services.logger.logInfo(`--- Starting ${pr.projSettings.name} tests for run "${pr.projTestRun.name}" ---\n`,
      pr.projSettings.uri, pr.projTestRun);
  }
}


function logProjRunComplete(pr: ProjRun, start: number) {
  const end = performance.now();
  if (!pr.debug) {
    services.logger.logInfo(`\n--- Completed ${pr.projSettings.name} tests for run "${pr.projTestRun.name}" ` +
      `(took ${((end - start) / 1000).toFixed(4)} secs)---`,
      pr.projSettings.uri, pr.projTestRun);
  }
  pr.projTestRun.appendOutput('\r\n');
  pr.projTestRun.appendOutput('-----------------------------------------------------------\r\n');
  pr.projTestRun.appendOutput('#### See "Behave VSC" output window for Behave output ####\r\n');
  pr.projTestRun.appendOutput('-----------------------------------------------------------\r\n');
  pr.projTestRun.appendOutput('\r\n');
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
    public readonly projTestRun: vscode.TestRun,
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


