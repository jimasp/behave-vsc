/* eslint-disable @typescript-eslint/no-explicit-any */
import * as vscode from 'vscode';
import { RunProfilesSetting } from "../../../../config/settings";
import { TestWorkspaceConfig, TestWorkspaceConfigWithProjUri } from '../testWorkspaceConfig';
import {
  getTestItems,
  getScenarioTests, uriId,
} from '../../../../common/helpers';
import { Expectations, RunOptions } from '../common';
import { services } from '../../../../services';
import { checkExtensionIsReady, getTestProjectUri } from "./helpers";
import { assertScenarioResult } from "./assertions";


// SIMULATES A USER CLICKING THE RUN/DEBUG BUTTON ON EACH SCENARIO IN THE TEST EXPLORER
export async function runAllProjectScenariosIndividuallyAndAssertTheResults(projName: string, isDebugRun: boolean,
  testExtConfig: TestWorkspaceConfig, runOptions: RunOptions, expectations: Expectations): Promise<void> {

  // ARRANGE
  const projUri = getTestProjectUri(projName);
  const projId = uriId(projUri);
  const api = await checkExtensionIsReady();
  const consoleName = `runScenarios ${projName}`;

  console.log(`${consoleName}: calling configurationChangedHandler`);
  await api.configurationChangedHandler(undefined, new TestWorkspaceConfigWithProjUri(testExtConfig, projUri));
  const allProjItems = getTestItems(projId, api.ctrl.items);
  const includedTests = getScenarioTests(api.testData, allProjItems);

  let runProfile = undefined;
  if (runOptions.selectedRunProfile)
    runProfile = (testExtConfig.get("runProfiles") as RunProfilesSetting)[runOptions.selectedRunProfile];

  console.log(`${consoleName}: calling runHandler to run each scenario...`);
  for (const test of includedTests) {
    const request = new vscode.TestRunRequest([test]);

    // ACT    
    const results = await api.runHandler(isDebugRun, request, runProfile);

    // ASSERT
    const expectedResults = expectations.getExpectedResultsFunc(projUri, services.config);
    assertScenarioResult(results, expectedResults, testExtConfig);
  }
}





