/* eslint-disable @typescript-eslint/no-explicit-any */
import * as vscode from 'vscode';
import { RunProfilesSetting } from "../../../../config/settings";
import { TestWorkspaceConfig, TestWorkspaceConfigWithProjUri } from '../testWorkspaceConfig';
import { getTestItems, uriId } from '../../../../common/helpers';
import { services } from '../../../../services';
import { checkExtensionIsReady, getExpectedEnvVarsString, getExpectedTagsString, getTestProjectUri } from "./helpers";
import { Expectations, RunOptions, TestResult } from "../common";
import { ScenarioResult, assertLogExists, assertTestResultMatchesExpectedResult, standardisePath } from "./assertions";
import assert = require('assert');
import { QueueItem } from '../../../../extension';
import { logStore } from '../../../runner';
import { getPipedScenarioNames } from '../../../../runners/helpers';
import { Scenario } from '../../../../parsers/testFile';
import path = require('path');


// SIMULATES A USER CLICKING THE RUN/DEBUG BUTTON ON SCENARIOS IN EACH FEATURE IN THE TEST EXPLORER
// i.e. for any feature that contains multiple scenarios, we run every scenario except the first one,
// this allows us to test the piped scenarios and regex pattern matching 
export async function runPipedScenariosOnly(projName: string, isDebugRun: boolean,
  testExtConfig: TestWorkspaceConfig, runOptions: RunOptions, expectations: Expectations, execFriendlyCmd = false): Promise<void> {

  // ARRANGE

  const projUri = getTestProjectUri(projName);
  logStore.clearProjLogs(projUri);
  const projId = uriId(projUri);
  const api = await checkExtensionIsReady();
  const consoleName = `runFeaturesScenariosSubset ${projName}`;

  if (execFriendlyCmd)
    services.config.integrationTestRunType = "cpExec";

  console.log(`${consoleName}: calling configurationChangedHandler`);
  await api.configurationChangedHandler(undefined, new TestWorkspaceConfigWithProjUri(testExtConfig, projUri));
  const allProjItems = getTestItems(projId, api.ctrl.items);
  const expectedResults = expectations.getExpectedResultsFunc(projUri, services.config);

  const featureTests = allProjItems.filter((item) => {
    return item.id.endsWith(".feature");
  });

  let runProfile = undefined;
  if (runOptions.selectedRunProfile)
    runProfile = (testExtConfig.get("runProfiles") as RunProfilesSetting)[runOptions.selectedRunProfile];


  console.log(`${consoleName}: calling runHandler to run each scenario...`);
  const requestItems: vscode.TestItem[] = [];
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
    }


    // ACT
    const request = new vscode.TestRunRequest(requestItems);
    const results = await api.runHandler(isDebugRun, request, runProfile);

    // ASSERT
    assertRunPipedScenariosResults(featureTest, results, expectedResults, testExtConfig);
    assertRunPipedScenariosFriendlyCmds(projUri, projName, featureTest, isDebugRun, expectedResults, testExtConfig, runOptions);

    // clear requestItems for next loop iteration
    requestItems.length = 0;
  }
}


export function assertRunPipedScenariosResults(featureTestItem: vscode.TestItem, results: QueueItem[] | undefined,
  expectedResults: TestResult[], testExtConfig: TestWorkspaceConfig) {

  assert(results && results.length !== 0, "runHandler returned an empty queue, check for previous errors in the debug console");

  results.forEach(result => {
    const scenResult = ScenarioResult(result);
    assert(JSON.stringify(result.test.range).includes("line"), 'JSON.stringify(result.test.range).includes("line")');
    assertTestResultMatchesExpectedResult(expectedResults, scenResult, testExtConfig);
  });

  // (keep this assert below results.forEach, as individual match asserts are more useful to fail out first)
  assert(results.length === featureTestItem.children.size - 1, `results.length === featureTestItem.children.size - 1, ${featureTestItem.id}`);
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
  for (const scen of expSiblingExceptFirst) {
    queueItems.push({
      test: featureTest,
      scenario: new Scenario(
        path.basename(scen.scenario_featureFileRelativePath),
        scen.scenario_featureFileRelativePath,
        scen.scenario_featureName,
        scen.scenario_scenarioName,
        0,
        scen.scenario_isOutline
      )
    });
  }

  const pipedScenarioNames = getPipedScenarioNames(queueItems, true);

  const expectCmdIncludes = [
    `cd `,
    `example-projects`,
    `${projName}"\n`,
    `${envVarsString}`,
    `python`,
    ` -m behave ${tagsString}-i "${expSiblings[0].scenario_featureFileRelativePath}$" `,
    `-n "${pipedScenarioNames}" --show-skipped --junit --junit-directory "`,
    `${projName}"`
  ];
  assertLogExists(projUri, expectCmdIncludes);

}
