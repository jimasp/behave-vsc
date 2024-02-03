/* eslint-disable @typescript-eslint/no-explicit-any */
import * as vscode from 'vscode';
import * as assert from 'assert';
import { RunProfilesSetting } from "../../../../config/settings";
import { TestWorkspaceConfig, TestWorkspaceConfigWithProjUri } from '../testWorkspaceConfig';
import { getTestItems, getScenarioTests, uriId } from '../../../../common/helpers';
import { Expectations, RunOptions, TestBehaveIni, TestResult } from '../common';
import { services } from '../../../../common/services';
import { checkExtensionIsReady, getTestProjectUri, setLock, restoreBehaveIni, replaceBehaveIni, ACQUIRE, RELEASE, getExpectedTagsString, getExpectedEnvVarsString, createFakeProjRun } from "./helpers";
import {
  assertWorkspaceSettingsAsExpected,
  assertAllFeatureFileStepsHaveAStepFileStepMatch,
  assertAllStepFileStepsHaveAtLeastOneFeatureReference,
  assertLogExists,
  assertExpectedCounts,
  assertExpectedResults
} from "./assertions";
import { logStore } from '../../../runner';
import { getFeaturePathsRegEx } from '../../../../runners/helpers';
import { QueueItem } from '../../../../extension';



// SIMULATES: A USER CLICKING THE RUN/DEBUG ALL BUTTON IN THE TEST EXPLORER.
// PURPOSE: tests that behave runs all tests when run/debug all is clicked.
// Also provides additional assertions about stepnavigation objects, project settings, etc.
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
// (More likely they will just click run all, but testing staggered will be enough to cover both anyway.)
//
// When the file multiroot suite/index.ts is run (which will test staggered/parallel project runs) this
// function will run in parallel with ITSELF (but as per the promises in that file, only one at a time for 
// a given project: so for example projects A/B/Simple can run in parallel, but not e.g. A/A).
//
// Because this function is re-entrant, locks are used to ensure that parsing is only happening 
// for one project at a time, as reloading configuration causes the extension to kick off reparses for all projects. 
// (Under normal (non-test) running, you can't kick off a behave test run while reparsing is in progress.)
export async function runProject(projName: string, isDebugRun: boolean, testExtConfig: TestWorkspaceConfig,
  behaveIni: TestBehaveIni, runOptions: RunOptions, expectations: Expectations, execFriendlyCmd = false): Promise<void> {

  const projUri = getTestProjectUri(projName);
  logStore.clearProjLogs(projUri);
  const workDirUri = vscode.Uri.joinPath(projUri, testExtConfig.get("relativeWorkingDir"));
  let behaveIniReplaced = false;


  // ARRANGE

  const projId = uriId(projUri);
  const api = await checkExtensionIsReady();
  const consoleName = `runProject ${projName}`;

  let runProfile = undefined;
  if (runOptions.selectedRunProfile)
    runProfile = (testExtConfig.get("runProfiles") as RunProfilesSetting)[runOptions.selectedRunProfile];



  try {

    // ==================== START LOCK SECTION ====================

    // we can't run runHandler while parsing is active, so we lock here until two things have happened for the given project:
    // 1. all (re)parses have completed, and 
    // 2. the runHandler has been started.
    // once that has happened, we will release the lock for the next project.
    // NOTE: any config change causes a reparse, so behave.ini and test config changes must also be inside 
    // this lock (as well as parseFilesForProject and runHandler)
    await setLock(consoleName, ACQUIRE);


    // if execFriendlyCmd=true, then in runBehaveInsance() in the code under test, we will use
    // use cp.exec to run the friendlyCmd (otherwise we use cp.spawn with args)
    // (outside of integration tests, cp.spawn is always used)
    if (execFriendlyCmd)
      testExtConfig.integrationTestRunUseCpExec = true;

    // replace behave.ini if required
    behaveIniReplaced = await replaceBehaveIni(consoleName, projUri, workDirUri, behaveIni.content);
    console.log(`${consoleName}: replaceBehaveIni completed`);

    // NOTE: configuration settings are intially loaded from disk (settings.json and *.code-workspace) by extension.ts activate(),
    // and we cannot intercept that because activate() runs as soon as the extension host loads, but we can change 
    // it afterwards. rather than replaing the settings.json on disk, we call configurationChangedHandler() with our own test config.
    // So the configuration will be actually be loaded twice:
    // 1. on the initial load (activate) of the extension,
    // 2. here where we inject our test config.
    // (note that we don't need to do this separately for our behave.ini replacement as that will also get reloaded by firing this handler.)
    console.log(`${consoleName}: calling configurationChangedHandler`);
    await api.configurationChangedHandler(undefined, new TestWorkspaceConfigWithProjUri(testExtConfig, projUri));
    assertWorkspaceSettingsAsExpected(projUri, projName, behaveIni, testExtConfig, services.config, expectations);


    // ACT 1

    // parse to get check counts (checked later, but we want to do this inside the lock)
    const actualCounts = await services.parser.parseFilesForProject(projUri, api.testData, api.ctrl,
      "runAllProjectAndAssertTheResults", false);
    assert(actualCounts, "actualCounts was undefined");

    const allProjTestItems = getTestItems(projId, api.ctrl.items);
    console.log(`${consoleName}: workspace nodes:${allProjTestItems.length}`);
    const hasMultiRootWkspNode = allProjTestItems.find(item => item.id === uriId(projUri)) !== undefined;

    // sanity check included tests length matches expected length
    const includedTests = getScenarioTests(api.testData, allProjTestItems);
    const expectedResults = expectations.getExpectedResultsFunc(projUri, services.config);

    // ASSERT 1 (pre-run asserts)
    await assertAllFeatureFileStepsHaveAStepFileStepMatch(projUri, api);
    await assertAllStepFileStepsHaveAtLeastOneFeatureReference(projUri, api);
    assertExpectedCounts(projUri, projName, services.config, expectations.getExpectedCountsFunc, actualCounts, hasMultiRootWkspNode);

    // run behave tests - we kick the runHandler off inside the lock to ensure that featureParseComplete() check
    // will complete inside the runHandler, i.e. so no other parsing gets kicked off until the parse is complete.
    // we do NOT want to await the runHandler as we want to release the lock for parallel run execution for multi-root
    console.log(`${consoleName}: calling runHandler to run project tests...`);
    const request = new vscode.TestRunRequest(includedTests);


    // ACT 2

    // kick off the run, do NOT await (see comment above)
    const resultsPromise = api.runHandler(isDebugRun, request, runProfile);


    // release lock: 
    // give run handler a chance to call the featureParseComplete() check, then 
    // release the lock so (different) projects can run in parallel
    await (new Promise(t => setTimeout(t, 50)));
    await setLock(consoleName, RELEASE);

    // ==================== END LOCK SECTION ====================  



    if (isDebugRun) {
      // timeout hack to show test ui during debug testing so we can see progress		
      await new Promise(t => setTimeout(t, 1000));
      await vscode.commands.executeCommand("workbench.view.testing.focus");
    }

    const results = await resultsPromise;
    console.log(`${consoleName}: runHandler completed`);


    // ASSERT 2 (post-run asserts)

    assertExpectedResults(projName, results, expectedResults, testExtConfig);
    if (!isDebugRun)
      assertExpectedFriendlyCmds(request, projUri, projName, expectedResults, testExtConfig, runOptions);
  }
  finally {
    if (behaveIniReplaced)
      await restoreBehaveIni(consoleName, projUri, workDirUri);
  }
}


function assertExpectedFriendlyCmds(request: vscode.TestRunRequest, projUri: vscode.Uri, projName: string,
  expectedResults: TestResult[], testExtConfig: TestWorkspaceConfig, runOptions: RunOptions) {

  const tagsString = getExpectedTagsString(testExtConfig, runOptions);
  const envVarsString = getExpectedEnvVarsString(testExtConfig, runOptions);
  const workingFolder = testExtConfig.get("relativeWorkingDir") as string;

  if (!testExtConfig.runParallel) {

    const expectCmdIncludes = [
      `cd `,
      `example-projects`,
      `${projName}`,
      `${workingFolder}`,
      `${envVarsString}`,
      `python`,
      ` -m behave ${tagsString}--show-skipped --junit --junit-directory "`,
      `${projName}"`
    ];

    assertLogExists(projUri, expectCmdIncludes);
    return;
  }


  const pr = createFakeProjRun(testExtConfig, request);

  // if we got here, then runParallel is set:
  // runParallel runs each feature separately in its own behave instance  
  expectedResults.forEach(expectedResult => {

    const qi = {
      test: undefined,
      scenario: { featureFileProjectRelativePath: expectedResult.scenario_featureFileRelativePath }
    } as unknown as QueueItem;

    const featurePathRx = getFeaturePathsRegEx(pr, [qi]);

    const expectCmdOrderedIncludes = [
      `cd `,
      `example-projects`,
      `${projName}`,
      `${workingFolder}`,
      `${envVarsString}`,
      `python`,
      ` -m behave ${tagsString}-i "${featurePathRx}" --show-skipped --junit --junit-directory "`,
      `${projName}"`
    ];
    assertLogExists(projUri, expectCmdOrderedIncludes);
  });

}
