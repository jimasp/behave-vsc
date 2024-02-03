/* eslint-disable @typescript-eslint/no-explicit-any */
import * as vscode from 'vscode';
import { RunProfilesSetting } from "../../../../config/settings";
import { TestWorkspaceConfig, TestWorkspaceConfigWithProjUri } from '../testWorkspaceConfig';
import { getTestItems, uriId } from '../../../../common/helpers';
import { services } from '../../../../services';
import { checkExtensionIsReady, createFakeProjRun, getExpectedEnvVarsString, getExpectedTagsString, getTestProjectUri } from "./helpers";
import { Expectations, RunOptions, TestResult } from "../common";
import { assertExpectedResults, assertLogExists, standardisePath } from "./assertions";
import { QueueItem } from '../../../../extension';
import { logStore } from '../../../runner';
import { getFeaturePathsRegEx, getPipedScenarioNamesRegex } from '../../../../runners/helpers';
import { Scenario } from '../../../../parsers/testFile';
import path = require('path');



// SIMULATES: A USER SELECTING A SUBSET OF SCENARIOS IN EVERY FEATURE IN THE TEST EXPLORER THEN CLICKING THE RUN/DEBUG BUTTON.
// i.e. for any feature that contains multiple scenarios, we run every scenario except the first one,
// PURPOSE: to test the piped scenarios regex pattern works with behave
// NOTE: this should act much the same whether runParallel is set or not, because either way, each feature will be 
// run individually if only a subset of scenarios are selected due to the way the behave commands are constructed.
export async function runScenarios(projName: string, isDebugRun: boolean,
  testExtConfig: TestWorkspaceConfig, runOptions: RunOptions, expectations: Expectations, execFriendlyCmd = false): Promise<void> {

  // ARRANGE

  const projUri = getTestProjectUri(projName);
  logStore.clearProjLogs(projUri);
  const projId = uriId(projUri);
  const api = await checkExtensionIsReady();
  const consoleName = `runFeaturesScenariosSubset ${projName}`;

  let runProfile = undefined;
  if (runOptions.selectedRunProfile)
    runProfile = (testExtConfig.get("runProfiles") as RunProfilesSetting)[runOptions.selectedRunProfile];

  if (execFriendlyCmd)
    testExtConfig.integrationTestRunUseCpExec = true;

  console.log(`${consoleName}: calling configurationChangedHandler`);
  await api.configurationChangedHandler(undefined, new TestWorkspaceConfigWithProjUri(testExtConfig, projUri));
  const allProjTestItems = getTestItems(projId, api.ctrl.items);
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

    let i = 0;
    const scenarios = [...featureTest.children].sort((a, b) => a[0].localeCompare(b[0]));
    for (const scenarioTest of scenarios) {
      // skip the first scenario, so that we get a piped list of scenario 
      // names (a feature with a single scenario would just run the whole feature)
      if (i++ === 0)
        continue;
      requestItems.push(scenarioTest[1]);
      featureTestsInRequest.push(featureTest);
    }
  }


  // ACT

  const request = new vscode.TestRunRequest(requestItems);
  const results = await api.runHandler(isDebugRun, request, runProfile);

  // ASSERT  

  assertExpectedResults(projName, results, expectedResults, testExtConfig, requestItems.length);
  if (!isDebugRun) {
    for (const featureTest of featureTestsInRequest) {
      assertExpectedFriendlyCmd(request, projUri, projName, featureTest, expectedResults, testExtConfig, runOptions);
    }
  }
}


function assertExpectedFriendlyCmd(request: vscode.TestRunRequest, projUri: vscode.Uri,
  projName: string, featureTest: vscode.TestItem, expectedResults: TestResult[],
  testExtConfig: TestWorkspaceConfig, runOptions: RunOptions) {

  const tagsString = getExpectedTagsString(testExtConfig, runOptions);
  const envVarsString = getExpectedEnvVarsString(testExtConfig, runOptions);
  const workingFolder = testExtConfig.get("relativeWorkingDir") as string;

  // while it's tempting to just reuse requestItems from the caller here, 
  // we must use expectedResults to validate (belt and braces)
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

  const pr = createFakeProjRun(testExtConfig, request);
  const featurePathRx = getFeaturePathsRegEx(pr, queueItems);
  const pipedScenariosRx = getPipedScenarioNamesRegex(queueItems, true);

  const expectCmdOrderedIncludes = [
    `cd `,
    `example-projects`,
    `${projName}"`,
    `${workingFolder}`,
    `${envVarsString}`,
    `python`,
    ` -m behave ${tagsString}-i "${featurePathRx}" `,
    `-n "${pipedScenariosRx}" --show-skipped --junit --junit-directory "`,
    `${projName}"`
  ];
  assertLogExists(projUri, expectCmdOrderedIncludes);

}
