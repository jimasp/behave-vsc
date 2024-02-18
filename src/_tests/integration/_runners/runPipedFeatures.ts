/* eslint-disable @typescript-eslint/no-explicit-any */
import * as vscode from 'vscode';
import { RunProfilesSetting } from "../../../config/settings";
import { TestWorkspaceConfig } from '../_helpers/testWorkspaceConfig';
import { getTestItems, uriId } from '../../../common/helpers';
import { services } from '../../../common/services';
import { checkExtensionIsReady, createFakeProjRun, getExpectedEnvVarsString, getExpectedTagsString, getTestProjectUri } from "./helpers";
import { Expectations, RunOptions, TestResult } from "../_helpers/common";
import { assertExpectedResults, assertLogExists, standardisePath } from "./assertions";
import { QueueItem } from '../../../extension';
import { logStore } from '../../runner';
import { getOptimisedFeaturePathsRegEx } from '../../../runners/helpers';



// SIMULATES: A USER CLICKING SELECTING A SUBSET OF FEATURES FROM EACH FOLDER IN THE TEST EXPLORER 
// THEN CLICKING THE RUN/DEBUG BUTTON.
// PURPOSE: to test that the piped features regex pattern cmd works with behave.
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
    testExtConfig.integrationTestRunUseCpExec = true;

  console.log(`${consoleName}: calling configurationChangedHandler`);
  await api.configurationChangedHandler(false, undefined, testExtConfig, projUri);
  const allProjTestItems = getTestItems(projId, api.ctrl.items);
  const expectedResults = expectations.getExpectedResultsFunc(projUri, services.config);

  // get any features that are not the sole feature in a folder
  // (we don't want to run folders in this test)
  const features = allProjTestItems.filter(item => item.id.endsWith(".feature")) ?? [];
  const foldersIdsProcessed: string[] = [];
  const requestItems: vscode.TestItem[] = [];
  for (const feat of features) {
    if (feat.parent?.id === projId || feat.parent?.id === undefined) {
      requestItems.push(feat);
      continue;
    }
    const featSiblings = feat.parent.children;
    if (featSiblings.size < 2)
      continue;
    if (foldersIdsProcessed.includes(feat.parent.id))
      continue;
    foldersIdsProcessed.push(feat.parent.id);
    let i = 0;
    for (const sib of featSiblings) {
      if (i++ === 0) // skip the first feature so we don't run the whole folder
        continue;
      if (sib[0].endsWith(".feature"))
        requestItems.push(sib[1]);
    }
  }

  // ACT

  console.log(`${consoleName}: calling runHandler to run piped features...`);
  const request = new vscode.TestRunRequest(requestItems);
  const results = await api.runHandler(isDebugRun, request, runProfile);

  // ASSERT  

  const expectedTestRunSize = requestItems.map(x => x.children.size).reduce((a, b) => a + b, 0);
  assertExpectedResults(projName, results, expectedResults, testExtConfig, expectedTestRunSize);

  if (!isDebugRun) {
    const expResults = expectedResults.filter(x => requestItems.find(r => x.test_id?.startsWith(standardisePath(r.id) ?? "undef")));
    assertExpectedFriendlyCmd(request, projUri, projName, expResults, testExtConfig, runOptions);
  }

}


function assertExpectedFriendlyCmd(request: vscode.TestRunRequest, projUri: vscode.Uri, projName: string,
  expectedResults: TestResult[], testExtConfig: TestWorkspaceConfig, runOptions: RunOptions) {

  const tagsString = getExpectedTagsString(testExtConfig, runOptions);
  const envVarsString = getExpectedEnvVarsString(testExtConfig, runOptions);
  const workingFolder = testExtConfig.get("behaveWorkingDirectory") as string;

  // (use our expected results, not the request)
  const queueItems: QueueItem[] = [];
  for (const expResult of expectedResults) {
    const qi = {
      test: {},
      scenario: { featureFileProjectRelativePath: expResult.scenario_featureFileRelativePath }
    } as unknown as QueueItem;
    queueItems.push(qi);
  }

  const pr = createFakeProjRun(testExtConfig, request);
  const pipedFeaturePathsRx = getOptimisedFeaturePathsRegEx(pr, queueItems);

  const expectCmdOrderedIncludes = [
    `cd `,
    `example-projects`,
    `${projName}`,
    `${workingFolder}`,
    `${envVarsString}`,
    `python`,
    ` -m behave ${tagsString}-i "${pipedFeaturePathsRx}" `,
    ` --show-skipped --junit --junit-directory "`,
    `${projName}"`
  ];
  assertLogExists(projUri, expectCmdOrderedIncludes);

}
