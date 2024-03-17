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



// SIMULATES: A USER CLICKING SELECTING A SUBSET OF FEATURES FROM EACH FOLDER IN THE TEST EXPLORER 
// THEN CLICKING THE RUN/DEBUG BUTTON.
// PURPOSE: to test that the piped features regex pattern cmd works with behave.
export async function runPipedFeatures(projName: string, isDebugRun: boolean, testExtConfig: TestWorkspaceConfig, behaveIni: TestBehaveIni,
  runOptions: RunOptions, expectations: Expectations, execFriendlyCmd = false): Promise<void> {

  // sanity check
  if (testExtConfig.runParallel) {
    throw new Error("runPipedFeatures is pointless with runParallel=true, because it won't pipe features, it will run them " +
      "individually, and running features individually is already tested by runProject.ts");
  }

  // ARRANGE

  const consoleName = `runPipedFeatures ${projName}`;
  const projUri = getTestProjectUri(projName);
  const workDirUri = vscode.Uri.joinPath(projUri, testExtConfig.get("behaveWorkingDirectory"));
  logStore.clearProjLogs(projUri);
  const projId = uriId(projUri);
  const api = await checkExtensionIsReady();

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
    const results = await api.getProjMapEntry(projUri).runHandler(isDebugRun, request, runProfile);

    // ASSERT  

    const expectedTestRunSize = requestItems.map(x => x.children.size).reduce((a, b) => a + b, 0);
    assertExpectedResults(projName, results, expectedResults, testExtConfig, execFriendlyCmd, expectedTestRunSize);

    if (!isDebugRun) {
      const expResults = expectedResults.filter(x => requestItems.find(r => x.test_id?.startsWith(standardisePath(r.id) ?? "undef")));
      assertExpectedFriendlyCmd(request, projUri, projName, expResults, testExtConfig, runOptions);
    }
  }
  finally {
    await restoreBehaveIni(consoleName, workDirUri);
  }

}


function assertExpectedFriendlyCmd(request: vscode.TestRunRequest, projUri: vscode.Uri, projName: string,
  expectedResults: TestResult[], testExtConfig: TestWorkspaceConfig, runOptions: RunOptions) {

  // (use our expected results, not the request)
  const queueItems: QueueItem[] = [];
  for (const expResult of expectedResults) {
    const qi = {
      test: {},
      scenario: { featureFileProjectRelativePath: expResult.scenario_featureFileRelativePath }
    } as unknown as QueueItem;
    queueItems.push(qi);
  }

  const expectCmdOrderedIncludes = buildExpectedFriendlyCmdOrderedIncludes(testExtConfig, runOptions, request, projName, queueItems);
  assertLogExists(projUri, expectCmdOrderedIncludes);
}



