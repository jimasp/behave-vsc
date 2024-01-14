/* eslint-disable @typescript-eslint/no-explicit-any */
import * as vscode from 'vscode';
import * as assert from 'assert';
import { RunProfilesSetting } from "../../../../config/settings";
import { TestWorkspaceConfig, TestWorkspaceConfigWithProjUri } from '../testWorkspaceConfig';
import {
  getTestItems,
  getScenarioTests, uriId,
} from '../../../../common/helpers';
import { Expectations, RunOptions } from './projectRunner';
import { services } from '../../../../services';
import {
  checkExtensionIsReady, getTestProjectUri, setLock, restoreBehaveIni, replaceBehaveIni,
} from "./helpers";
import {
  assertWorkspaceSettingsAsExpected,
  assertAllFeatureFileStepsHaveAStepFileStepMatch,
  assertAllStepFileStepsHaveAtLeastOneFeatureReference,
  assertAllResults
} from "./assertions";


// SIMULATES A USER CLICKING THE RUN/DEBUG ALL BUTTON IN THE TEST EXPLORER 
// (this function is also re-entrant from multiroot suite - which simulates a user quickly clicking the test explorer 
// run button on each project node in the workspace when runMultiRootProjectsInParallel=true)
// In the real world, a user can kick off one project and then another and then another, 
// (i.e. staggered) - they do not have to wait for the first to complete. 
// (More likely they will just click run all, but testing staggered will be enough to cover both anyway.)
//
// When the file multiroot suite/index.ts is run (which will test staggered/parallel project runs) this
// function will run in parallel with ITSELF (but as per the promises in that file, only one at a time for 
// a given project: so for example projects A/B/Simple can run in parallel, but not e.g. A/A).
//
// Because this function is re-entrant, locks are used to ensure that parsing is only happening 
// for one project at a time, as reloading configuration causes the extension to kick off reparses for all projects. 
// (Under normal (non-test) running, you can't kick off a behave test run while reparsing is in progress.)
export async function runAllProjectAndAssertTheResults(projName: string, isDebugRun: boolean, testExtConfig: TestWorkspaceConfig,
  behaveIniContent: string, runOptions: RunOptions, expectations: Expectations): Promise<void> {

  const projUri = getTestProjectUri(projName);
  const workDirUri = vscode.Uri.joinPath(projUri, testExtConfig.get("relativeWorkingDir"));
  const projId = uriId(projUri);
  const api = await checkExtensionIsReady();
  const consoleName = `runAll ${projName}`;

  try {

    // SET LOCK:
    // we can't run runHandler while parsing is active, so we lock here until two things have happened for the given project:
    // 1. all (re)parses have completed, and 
    // 2. the runHandler has been started.
    // once that has happened, we will release the lock for the next project.
    // NOTE: any config change causes a reparse, so behave.ini and test config changes must also be inside 
    // this lock (as well as parseFilesForProject and runHandler)
    await setLock(consoleName, "acquire");

    // we do this BEFORE we call configurationChangedHandler() to load our test config,
    // because replacing the behave.ini file will itself trigger configurationChangedHandler() which 
    // would then reload settings.json from disk and replace the test config we are about to load
    if (behaveIniContent) {
      await replaceBehaveIni(projName, projUri, workDirUri, behaveIniContent);
      console.log(`${consoleName}: replaceBehaveIni completed`);
    }

    // NOTE: configuration settings are intially loaded from disk (settings.json and *.code-workspace) by extension.ts activate(),
    // and we cannot intercept this because activate() runs as soon as the extension host loads, but we can change 
    // it afterwards - we do this here by calling configurationChangedHandler() with our own test config.
    // The configuration will be actually be loaded once, then reloaded 1-3 times:
    // 1. on the initial load (activate) of the extension,
    // 2. if behave ini is replaced on disk above,
    // 3. here to insert our test config.
    // 4. if behave ini is restored in the finally block (i.e. if 2 happened)
    console.log(`${consoleName}: calling configurationChangedHandler`);
    await api.configurationChangedHandler(undefined, new TestWorkspaceConfigWithProjUri(testExtConfig, projUri));
    assertWorkspaceSettingsAsExpected(projUri, projName, testExtConfig, services.config, expectations);


    // parse to get check counts (checked later, but we want to do this inside the lock)
    const actualCounts = await services.parser.parseFilesForProject(projUri, api.testData, api.ctrl,
      "runAllTestsAndAssertTheResults", false);
    assert(actualCounts, "actualCounts was undefined");

    const allProjItems = getTestItems(projId, api.ctrl.items);
    console.log(`${consoleName}: workspace nodes:${allProjItems.length}`);
    assert(allProjItems.length > 0, "allProjItems.length was 0");
    const matchingItems = allProjItems.filter(item => api.testData.get(item) !== undefined);
    assert(matchingItems.length > 0, "matchingItems.length was 0");
    const hasMultiRootWkspNode = allProjItems.find(item => item.id === uriId(projUri)) !== undefined;

    // sanity check included tests length matches expected length
    const includedTests = getScenarioTests(api.testData, allProjItems);
    assert(includedTests.length > 0, "includedTests.length was 0");
    const expectedResults = expectations.getExpectedResultsFunc(projUri, services.config);
    if (includedTests.length !== expectedResults.length)
      debugger; // eslint-disable-line no-debugger
    console.log(`${consoleName}: test includes = ${includedTests.length}, tests expected = ${expectedResults.length}`);
    // included tests (scenarios) and expected tests lengths should be equal, but 
    // we allow greater than because there is a more helpful assert later (assertTestResultMatchesExpectedResult) if new
    // tests have recently been added	
    assert(includedTests.length >= expectedResults.length, consoleName + ", (see counts above)");
    console.log(`${consoleName}: initialised`);

    // check all steps can be matched
    await assertAllFeatureFileStepsHaveAStepFileStepMatch(projUri, api);
    await assertAllStepFileStepsHaveAtLeastOneFeatureReference(projUri, api);

    // run behave tests - we kick the runHandler off inside the lock to ensure that featureParseComplete() check
    // will complete inside the runHandler, i.e. so no other parsing gets kicked off until the parse is complete.
    // we do NOT want to await the runHandler as we want to release the lock for parallel run execution for multi-root
    console.log(`${consoleName}: calling runHandler to run tests...`);
    const request = new vscode.TestRunRequest(includedTests);
    let runProfile = undefined;
    if (runOptions.selectedRunProfile)
      runProfile = (testExtConfig.get("runProfiles") as RunProfilesSetting)[runOptions.selectedRunProfile];
    // do NOT await (see comment above)
    const resultsPromise = api.runHandler(isDebugRun, request, runProfile);

    // RELEASE LOCK: 
    // give run handler a chance to call the featureParseComplete() check, then 
    // release the lock so (different) projects can run in parallel
    await (new Promise(t => setTimeout(t, 50)));
    await setLock(consoleName, "release");



    if (isDebugRun) {
      // timeout hack to show test ui during debug testing so we can see progress		
      await new Promise(t => setTimeout(t, 1000));
      await vscode.commands.executeCommand("workbench.view.testing.focus");
    }


    // WAIT FOR TESTRUNHANDLER TO COMPLETE, I.E. GET RESULTS
    const results = await resultsPromise;
    console.log(`${consoleName}: runHandler completed`);


    if (!results || results.length === 0) {
      debugger; // eslint-disable-line no-debugger
      throw new Error(`${consoleName}: runHandler returned an empty queue, check for previous errors in the debug console`);
    }

    // ASSERT RESULTS    
    assertAllResults(results, expectedResults, testExtConfig, projUri, projName, expectations, hasMultiRootWkspNode, actualCounts);

  }
  finally {
    if (behaveIniContent)
      await restoreBehaveIni(projName, projUri, workDirUri);
  }
}





