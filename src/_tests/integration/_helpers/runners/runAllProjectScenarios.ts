/* eslint-disable @typescript-eslint/no-explicit-any */
import * as vscode from 'vscode';
import { RunProfilesSetting } from "../../../../config/settings";
import { TestWorkspaceConfig, TestWorkspaceConfigWithProjUri } from '../testWorkspaceConfig';
import {
  getTestItems,
  getScenarioTests, uriId,
} from '../../../../common/helpers';
import { Expectations, RunOptions } from './projectRunner';
import { services } from '../../../../services';
import { checkExtensionIsReady, getTestProjectUri } from "./helpers";
import { assertScenarioResult } from "./assertions";


// SIMULATES A USER CLICKING THE RUN/DEBUG BUTTON ON EACH SCENARIO IN THE TEST EXPLORER
export async function runAllProjectScenariosIndividuallyAndAssertTheResults(projName: string, isDebugRun: boolean,
  testExtConfig: TestWorkspaceConfig, runOptions: RunOptions, expectations: Expectations): Promise<void> {

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
    const results = await api.runHandler(isDebugRun, request, runProfile);

    if (!results || results.length !== 1) {
      debugger; // eslint-disable-line no-debugger
      throw new Error(`${consoleName}: runHandler returned an empty queue, check for previous errors in the debug console`);
    }

    // // ASSERT RESULTS    
    const expectedResults = expectations.getExpectedResultsFunc(projUri, services.config);
    assertScenarioResult(results, expectedResults, testExtConfig);
  }
}





