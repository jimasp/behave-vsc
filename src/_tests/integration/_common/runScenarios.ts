/* eslint-disable @typescript-eslint/no-explicit-any */
import * as vscode from 'vscode';
import { TestWorkspaceConfig } from './testWorkspaceConfig';
import { getTestItems, uriId } from '../../../common/helpers';
import { services } from '../../../common/services';
import { buildExpectedFriendlyCmdOrderedIncludes, checkExtensionIsReady, getRunProfile, getTestProjectUri, replaceBehaveIni, restoreBehaveIni } from "./helpers";
import { Expectations, RunOptions, TestBehaveIni, TestResult } from "./types";
import { assertExpectedResults, assertLogExists, standardisePath } from "./assertions";
import { QueueItem } from '../../../extension';
import { logStore } from '../../runner';
import { Scenario } from '../../../parsers/testFile';
import path = require('path');



// SIMULATES: A USER SELECTING A SUBSET OF SCENARIOS IN EVERY FEATURE IN THE TEST EXPLORER THEN CLICKING THE RUN/DEBUG BUTTON.
// i.e. for any feature that contains multiple scenarios, we run every scenario except the first one,
// PURPOSE: to test the piped scenarios regex pattern works with behave
// NOTE: this should act much the same whether runParallel is set or not, because either way, each feature will be 
// run individually if only a subset of scenarios are selected due to the way the behave commands are constructed.
export async function runScenarios(projName: string, isDebugRun: boolean, testExtConfig: TestWorkspaceConfig, behaveIni: TestBehaveIni,
  runOptions: RunOptions, expectations: Expectations, execFriendlyCmd = false): Promise<void> {

  // ARRANGE

  const api = await checkExtensionIsReady();
  const consoleName = `runScenarios ${projName}`;
  const projUri = getTestProjectUri(projName);
  const workDirUri = vscode.Uri.joinPath(projUri, testExtConfig.get("behaveWorkingDirectory"));
  logStore.clearProjLogs(projUri);
  const projId = uriId(projUri);


  if (execFriendlyCmd)
    testExtConfig.integrationTestRunUseCpExec = true;

  const runProfile = getRunProfile(testExtConfig, runOptions.selectedRunProfile);

  // note that we cannot inject behave.ini like our test workspace config, because behave will always read it from disk
  await replaceBehaveIni(consoleName, workDirUri, behaveIni.content);

  try {

    console.log(`${consoleName}: calling configurationChangedHandler`);
    await api.configurationChangedHandler(false, undefined, testExtConfig, projUri);
    const allProjTestItems = getTestItems(projId, api.getProjMapEntry(projUri).ctrl.items);
    const expectedResults = expectations.getExpectedResultsFunc(projUri, services.config);

    const featureTests = allProjTestItems.filter((item) => {
      return item.id.endsWith(".feature");
    });

    console.log(`${consoleName}: calling runHandler to run piped scenarios...`);
    const requestItems: vscode.TestItem[] = [];
    const featureTestsInRequest: vscode.TestItem[] = [];
    for (const featureTest of featureTests) {
      // we're only interested in features with more than 1 scenario in this function
      if (featureTest.children.size < 2)
        continue;
      featureTestsInRequest.push(featureTest);

      let i = 0;
      const scenarios = [...featureTest.children].sort((a, b) => a[0].localeCompare(b[0]));
      for (const scenarioTest of scenarios) {
        // skip the first scenario, so that we get a piped list of scenario 
        // names (a feature with a single scenario would just run the whole feature)
        if (i++ === 0)
          continue;
        requestItems.push(scenarioTest[1]);
      }
    }


    // ACT

    const request = new vscode.TestRunRequest(requestItems);
    const results = await api.getProjMapEntry(projUri).runHandler(isDebugRun, request, runProfile);

    // ASSERT  

    assertExpectedResults(projName, results, expectedResults, testExtConfig, execFriendlyCmd, requestItems.length);
    if (!isDebugRun) {
      for (const featureTest of featureTestsInRequest) {
        assertExpectedFriendlyCmd(request, projUri, projName, featureTest, expectedResults, testExtConfig, runOptions);
      }
    }

  }
  finally {
    await restoreBehaveIni(consoleName, workDirUri);
  }
}


function assertExpectedFriendlyCmd(request: vscode.TestRunRequest, projUri: vscode.Uri,
  projName: string, featureTest: vscode.TestItem, expectedResults: TestResult[],
  testExtConfig: TestWorkspaceConfig, runOptions: RunOptions) {

  // use expectedResults (not RequestItems) to validate cmd
  const stdPath = standardisePath(featureTest.id);
  const expSiblings = expectedResults.filter(er2 => er2.test_parent === stdPath)
    .sort((a, b) => a.scenario_scenarioName.localeCompare(b.scenario_scenarioName));
  const expSiblingExceptFirst = expSiblings.slice(1);
  const queueItems: QueueItem[] = [];
  for (const expResult of expSiblingExceptFirst) {
    queueItems.push({
      test: featureTest,
      scenario: new Scenario(
        path.basename(expResult.scenario_featureFileRelativePath),
        expResult.scenario_featureFileRelativePath,
        expResult.scenario_featureName,
        expResult.scenario_scenarioName,
        0,
        expResult.scenario_isOutline
      )
    });
  }

  const expectCmdOrderedIncludes = buildExpectedFriendlyCmdOrderedIncludes(testExtConfig, runOptions, request, projName, queueItems, true);
  assertLogExists(projUri, expectCmdOrderedIncludes);
}
