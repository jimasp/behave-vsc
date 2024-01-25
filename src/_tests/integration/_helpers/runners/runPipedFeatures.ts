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
import { getFeaturePathsRegEx } from '../../../../runners/helpers';



// SIMULATES: A USER CLICKING SELECTING A SUBSET OF FEATURES IN THE TEST EXPLORER THEN CLICKING THE RUN/DEBUG BUTTON.
// PURPOSE: to test that the piped features regex pattern works with behave.
export async function runPipedFeatures(projName: string, isDebugRun: boolean,
  testExtConfig: TestWorkspaceConfig, runOptions: RunOptions, expectations: Expectations, execFriendlyCmd = false): Promise<void> {

  // sanity check
  if (testExtConfig.runParallel) {
    throw new Error("runPipedFeatures is pointless with runParallel=true, because it won't pipe features, it will run them " +
      "individually, and running features individually is already tested by runProject.ts");
  }

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
    services.config.integrationTestRunUseCpExec[projId] = true;

  console.log(`${consoleName}: calling configurationChangedHandler`);
  await api.configurationChangedHandler(undefined, new TestWorkspaceConfigWithProjUri(testExtConfig, projUri));
  const allProjTestItems = getTestItems(projId, api.ctrl.items);
  const expectedResults = expectations.getExpectedResultsFunc(projUri, services.config);

  // skip one feature so we don't run the whole project
  const skipFeature = allProjTestItems.find(item => item.id.endsWith(".feature"));
  if (!skipFeature)
    throw new Error("firstFeature not found");

  const skippedFeatureId = skipFeature.id;
  const skippedFeatureRelPath = standardisePath(skipFeature.id, true);
  if (!skippedFeatureRelPath)
    throw new Error("skippedFeatureRelPath was undefined");

  const requestItems: vscode.TestItem[] = [];
  for (const item of allProjTestItems) {
    if (item.id.endsWith(".feature") && item.id !== skippedFeatureId)
      requestItems.push(item);
  }


  // ACT

  console.log(`${consoleName}: calling runHandler to run piped features...`);
  const request = new vscode.TestRunRequest(requestItems);
  const results = await api.runHandler(isDebugRun, request, runProfile);

  // ASSERT  

  const expectedTestRunSize = requestItems.map(x => x.children.size).reduce((a, b) => a + b, 0);
  assertExpectedResults(results, expectedResults, testExtConfig, expectedTestRunSize);
  if (!isDebugRun)
    assertExpectedFriendlyCmd(request, skippedFeatureRelPath, projUri, projName, expectedResults, testExtConfig, runOptions);

}


function assertExpectedFriendlyCmd(request: vscode.TestRunRequest, skippedFeatureRelPath: string,
  projUri: vscode.Uri, projName: string, expectedResults: TestResult[],
  testExtConfig: TestWorkspaceConfig, runOptions: RunOptions) {

  const tagsString = getExpectedTagsString(testExtConfig, runOptions);
  const envVarsString = getExpectedEnvVarsString(testExtConfig, runOptions);
  const workingFolder = testExtConfig.get("relativeWorkingDir") as string;

  const filteredExpectedResults = expectedResults.filter(x => !skippedFeatureRelPath.endsWith(x.scenario_featureFileRelativePath));

  const queueItems: QueueItem[] = [];
  for (const expResult of filteredExpectedResults) {
    const qi = {
      test: undefined,
      scenario: { featureFileProjectRelativePath: expResult.scenario_featureFileRelativePath }
    } as unknown as QueueItem;
    queueItems.push(qi);
  }

  const pr = createFakeProjRun(testExtConfig, request);
  const pipedFeaturePathsRx = getFeaturePathsRegEx(pr, queueItems);

  const expectCmdOrderedIncludes = [
    `cd `,
    `example-projects`,
    `${projName}"`,
    `${workingFolder}`,
    `${envVarsString}`,
    `python`,
    ` -m behave ${tagsString}-i "${pipedFeaturePathsRx}" `,
    ` --show-skipped --junit --junit-directory "`,
    `${projName}"`
  ];
  assertLogExists(projUri, expectCmdOrderedIncludes);

}
