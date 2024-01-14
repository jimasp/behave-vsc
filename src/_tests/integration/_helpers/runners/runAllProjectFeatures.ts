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
import { assertFeatureResult } from "./assertions";


// SIMULATES A USER CLICKING THE RUN/DEBUG BUTTON ON EACH FEATURE IN THE TEST EXPLORER
export async function runAllProjectFeaturesIndividuallyAndAssertTheResults(projName: string, isDebugRun: boolean,
  testExtConfig: TestWorkspaceConfig, runOptions: RunOptions, expectations: Expectations): Promise<void> {

  const projUri = getTestProjectUri(projName);
  const projId = uriId(projUri);
  const api = await checkExtensionIsReady();
  const consoleName = `runFeatures ${projName}`;

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
  for (const featureTest of featureTests) {
    const request = new vscode.TestRunRequest([featureTest]);
    const results = await api.runHandler(isDebugRun, request, runProfile);

    if (!results || results.length !== featureTest.children.size) {
      debugger; // eslint-disable-line no-debugger
      throw new Error(`${consoleName}: runHandler returned an empty queue, check for previous errors in the debug console`);
    }

    // ASSERT RESULT
    assertFeatureResult(featureTest, results, expectedResults, testExtConfig);
  }
}





