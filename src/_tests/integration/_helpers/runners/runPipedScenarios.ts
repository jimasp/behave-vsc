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


// SIMULATES A USER CLICKING THE RUN/DEBUG BUTTON ON SCENARIOS IN EACH FEATURE IN THE TEST EXPLORER
// i.e. for any feature that contains multiple scenarios, we run every scenario except the first one,
// this allows us to test the piped scenarios and regex pattern matching 
export async function runPipedScenarios(projName: string, isDebugRun: boolean,
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
    services.config.integrationTestRunType = "cpExec";

  console.log(`${consoleName}: calling configurationChangedHandler`);
  await api.configurationChangedHandler(undefined, new TestWorkspaceConfigWithProjUri(testExtConfig, projUri));
  const allProjItems = getTestItems(projId, api.ctrl.items);
  const expectedResults = expectations.getExpectedResultsFunc(projUri, services.config);

  const featureTests = allProjItems.filter((item) => {
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

  assertExpectedResults(results, expectedResults, testExtConfig, requestItems.length);
  for (const featureTest of featureTestsInRequest) {
    assertRunPipedScenariosFriendlyCmds(projUri, projName, featureTest, isDebugRun, expectedResults, testExtConfig, runOptions);
  }

}


function assertRunPipedScenariosFriendlyCmds(projUri: vscode.Uri, projName: string, featureTest: vscode.TestItem,
  isDebugRun: boolean, expectedResults: TestResult[], testExtConfig: TestWorkspaceConfig, runOptions: RunOptions) {

  // friendlyCmds are not logged for debug runs (and we don't want to assert friendlyCmds twice over anyway)
  if (isDebugRun)
    return;

  const tagsString = getExpectedTagsString(testExtConfig, runOptions);
  const envVarsString = getExpectedEnvVarsString(testExtConfig, runOptions);

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

  const pr = createFakeProjRun(testExtConfig);
  const featurePathRx = getFeaturePathsRegEx(pr, queueItems);
  const pipedScenariosRx = getPipedScenarioNamesRegex(queueItems, true);

  const expectCmdOrderedIncludes = [
    `cd `,
    `example-projects`,
    `${projName}"\n`,
    `${envVarsString}`,
    `python`,
    ` -m behave ${tagsString}-i "${featurePathRx}" `,
    `-n "${pipedScenariosRx}" --show-skipped --junit --junit-directory "`,
    `${projName}"`
  ];
  assertLogExists(projUri, expectCmdOrderedIncludes);

}
