/* eslint-disable @typescript-eslint/no-explicit-any */
import * as vscode from 'vscode';
import { RunProfilesSetting } from "../../../../config/settings";
import { TestWorkspaceConfig, TestWorkspaceConfigWithProjUri } from '../testWorkspaceConfig';
import { getTestItems, uriId } from '../../../../common/helpers';
import { services } from '../../../../services';
import { checkExtensionIsReady, getTestProjectUri } from "./helpers";
import { Expectations, RunOptions } from "../common";
import { assertFeatureResult, assertFeatureSubsetResult } from "./assertions";


// SIMULATES A USER CLICKING THE RUN/DEBUG BUTTON ON A SUBSET OF SCENARIOS IN EACH FEATURE IN THE TEST EXPLORER
// this tests piped scenario names and regex pattern matching for a subset of scenarios in each feature
export async function runAllProjectFeaturesScenarioSubsetsAndAssertTheResults(projName: string, isDebugRun: boolean,
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
  const requestItems: vscode.TestItem[] = [];
  for (const featureTest of featureTests) {
    // we're only interested in features with more than 1 scenario in this function
    if (featureTest.children.size < 2)
      continue;

    let i = 0;
    for (const scenarioTest of featureTest.children) {
      // skip the first one, so that we get a piped list of scenario names (vs running whole feature)
      if (i++ === 0)
        continue;
      requestItems.push(scenarioTest[1]);
    }

    const request = new vscode.TestRunRequest(requestItems);
    const results = await api.runHandler(isDebugRun, request, runProfile);

    // ASSERT RESULT
    assertFeatureSubsetResult(featureTest, results, expectedResults, testExtConfig);
  }
}





