/* eslint-disable @typescript-eslint/no-explicit-any */
import * as vscode from 'vscode';
import * as assert from 'assert';
import { TestWorkspaceConfig } from './testWorkspaceConfig';
import { getTestItems, getScenarioTests, uriId } from '../../../common/helpers';
import { Expectations, RunOptions, TestBehaveIni, TestResult } from './types';
import { services } from '../../../common/services';
import {
  checkExtensionIsReady, getTestProjectUri, setLock, restoreBehaveIni, replaceBehaveIni, ACQUIRE,
  RELEASE, buildExpectedFriendlyCmdOrderedIncludes, getRunProfile
} from "./helpers";
import {
  assertWorkspaceSettingsAsExpected,
  assertAllFeatureFileStepsHaveAStepFileStepMatch,
  assertAllStepFileStepsHaveAtLeastOneFeatureReference,
  assertLogExists,
  assertExpectedCounts,
  assertExpectedResults
} from "./assertions";
import { logStore } from '../../runner';
import { QueueItem } from '../../../extension';



// SIMULATES: A USER CLICKING THE RUN/DEBUG ALL BUTTON IN THE TEST EXPLORER, AND ALSO PARALLEL PROJECT RUNS FOR MULTIROOT SUITE.
// PURPOSE: tests that behave runs all tests when run/debug all is clicked.
// ALSO: provides additional assertions about stepnavigation objects, project settings, etc. that are not included in other runners.
//
// NOTE THAT:
// 1. if runParallel=true, then this function will run every feature in its own behave 
// instance in parallel, otherwise it will run all features in one behave instance.
// 2. if runMultiRootProjectsInParallel=true (i.e called from from "multiroot suite") then 
// this function becomes re-entrant to run projects in parallel.
//
// When runMultiRootProjectsInParallel=true and this function is called from multiroot 
// suite, this simulates a user quickly clicking the test explorer run button on each 
// project node in the workspace. This is because a user can kick off one project and 
// then another and then another, (i.e. staggered) - they do not have to wait for the first to complete. 
// (More likely they will just click run all, but testing staggered will be enough to cover both options anyway.)
//
// When the file multiroot suite/index.ts is run (which will test staggered/parallel project runs) this
// function will run in parallel with ITSELF (but as per the promises in that file, only one at a time for 
// a given project: so for example projects A/B/Simple can run in parallel, but not e.g. A/A).
//
// Because this function is re-entrant, locks are used to ensure that parsing is only happening 
// for one project at a time, as reloading configuration causes the extension to kick off reparses for all projects. 
// (Under normal (non-test) running, you can't kick off a behave test run while reparsing is in progress.)
export async function runProject(projName: string, isDebugRun: boolean, testExtConfig: TestWorkspaceConfig, behaveIni: TestBehaveIni,
  runOptions: RunOptions, expectations: Expectations, execFriendlyCmd = false, checkFriendlyCmdLogs = true): Promise<void> {

  // ARRANGE

  // get the extension api
  const api = await checkExtensionIsReady();

  const consoleName = `runProject ${projName}`;
  const projUri = await getTestProjectUri(projName);
  const projId = uriId(projUri);
  const workDirUri = vscode.Uri.joinPath(projUri, testExtConfig.get("behaveWorkingDirectory"));
  logStore.clearProjLogs(projUri);


  // if execFriendlyCmd=true, then in runBehaveInstance() in the code under test, we will use
  // use cp.exec to run the friendlyCmd (otherwise we use cp.spawn with args)
  // (outside of integration tests, cp.spawn is always used)
  if (execFriendlyCmd)
    testExtConfig.integrationTestRunUseCpExec = true;

  const runProfile = getRunProfile(testExtConfig, runOptions.selectedRunProfile);

  // note that we cannot inject behave.ini like our test workspace config, because behave will always read it from disk
  // (shouldHandleIt doesn't reload when change the behave.ini file, if isIntegrationTestRun is set so we don't need this in the lock)
  await replaceBehaveIni(consoleName, workDirUri, behaveIni.content);


  try {

    // ==================== START LOCK SECTION ====================

    // we can't run runHandler while parsing is active, so we lock here until two things have happened for the given project:
    // 1. all (re)parses have completed for the project, and 
    // 2. the runHandler has been started.
    // once that has happened, we will release the lock for the next project.
    // NOTE: any config change causes a reparse, so test config changes 
    // must be inside this lock (as well as parseFilesForProject and runHandler)
    await setLock(consoleName, ACQUIRE);
    console.log(`${consoleName}: lock acquired`);
    const start = performance.now();


    // NOTE: configuration settings are intially loaded from disk (settings.json and *.code-workspace) by extension.ts activate(),
    // and we cannot intercept that because activate() runs as soon as the extension host loads, but we can change settings 
    // afterwards. Rather than replacing the settings.json on disk, we can call configurationChangedHandler() with our own test config.
    // So the configuration will be actually be loaded twice:
    // 1. on the initial load (activate) of the extension,
    // 2. here where we inject our test config.
    // (this will also act to manually reload settings after replaceBehaveIni, because behave.ini replacement is 
    // intentionally ignored by projectWatcher while running integration tests to stop unnecessary reparses.)
    console.log(`${consoleName}: calling configurationChangedHandler`);
    await api.configurationChangedHandler(false, undefined, testExtConfig, projUri);
    await assertWorkspaceSettingsAsExpected(projUri, projName, testExtConfig, services.config, expectations);


    // ACT 1

    // call parse directly so we can check counts 
    // (also this means we don't have to check if the parse kicked off by 
    // configurationChangedHandler has completed before we check counts etc.)
    const actualCounts = await services.parser.parseFilesForProject(projUri, api.getProjMapEntry(projUri).ctrl, api.testData,
      "runAllProjectAndAssertTheResults", false);
    assert(actualCounts, "actualCounts was undefined");

    const allProjTestItems = getTestItems(projId, api.getProjMapEntry(projUri).ctrl.items);
    console.log(`${consoleName}: workspace nodes:${allProjTestItems.length}`);
    const hasMultiRootWkspNode = allProjTestItems.find(item => item.id === uriId(projUri)) !== undefined;
    assertExpectedCounts(projUri, projName, services.config, expectations.getExpectedCountsFunc, actualCounts, hasMultiRootWkspNode);

    // sanity check included tests length matches expected length
    const includedTests = getScenarioTests(api.testData, allProjTestItems);
    const expectedResults = expectations.getExpectedResultsFunc(projUri, services.config);

    // ASSERT 1 (pre-run asserts)
    await assertAllFeatureFileStepsHaveAStepFileStepMatch(projUri, api);
    await assertAllStepFileStepsHaveAtLeastOneFeatureReference(projUri, api);


    // run behave tests - we kick the runHandler off inside the lock to ensure that featureParseComplete() check
    // will complete inside the runHandler, i.e. so no other parsing gets kicked off until the parse is complete.
    // we do NOT want to await the runHandler as we want to release the lock for parallel run execution for multi-root
    console.log(`${consoleName}: calling runHandler to run project tests...`);
    const request = new vscode.TestRunRequest(includedTests);


    // ACT 2

    // kick off the run, do NOT await (see comment above)
    const resultsPromise = api.getProjMapEntry(projUri).runHandler(isDebugRun, request, runProfile);


    // release lock: 
    // give run handler a chance to call the featureParseComplete() check, then 
    // release the lock so other multi-root projects can run in parallel with this one
    await (new Promise(t => setTimeout(t, 50)));
    await setLock(consoleName, RELEASE);
    console.log(`${consoleName}: lock released after ${performance.now() - start}ms`);

    // ==================== END LOCK SECTION ====================  



    if (isDebugRun) {
      // timeout hack to show test ui during debug testing so we can see progress		
      await new Promise(t => setTimeout(t, 1000));
      await vscode.commands.executeCommand("workbench.view.testing.focus");
    }

    const results = await resultsPromise;
    console.log(`${consoleName}: runHandler completed`);


    // ASSERT 2 (post-run asserts)

    assertExpectedResults(projName, results, expectedResults, testExtConfig, execFriendlyCmd);
    if (!isDebugRun && checkFriendlyCmdLogs)
      assertExpectedFriendlyCmds(request, projUri, projName, expectedResults, testExtConfig, runOptions);
  }
  finally {
    await restoreBehaveIni(consoleName, workDirUri);
  }
}


function assertExpectedFriendlyCmds(request: vscode.TestRunRequest, projUri: vscode.Uri, projName: string,
  expectedResults: TestResult[], testExtConfig: TestWorkspaceConfig, runOptions: RunOptions) {

  if (!testExtConfig.runParallel) {
    const expectedCmdOrderedIncludes = buildExpectedFriendlyCmdOrderedIncludes(testExtConfig, runOptions, request, projName);
    assertLogExists(projUri, expectedCmdOrderedIncludes);
    return;
  }

  // if we got here, then runParallel is set:
  // runParallel runs each feature separately in its own behave instance  
  expectedResults.forEach(expectedResult => {

    const queueItem = {
      test: undefined,
      scenario: { featureFileProjectRelativePath: expectedResult.scenario_featureFileRelativePath }
    } as unknown as QueueItem;

    const expectedCmdOrderedIncludes = buildExpectedFriendlyCmdOrderedIncludes(testExtConfig, runOptions, request, projName, [queueItem]);
    assertLogExists(projUri, expectedCmdOrderedIncludes);
  });

}
