/* eslint-disable @typescript-eslint/no-explicit-any */
import * as vscode from 'vscode';
import { RunProfilesSetting } from "../../../../config/settings";
import { TestWorkspaceConfig, TestWorkspaceConfigWithProjUri } from '../testWorkspaceConfig';
import { uriId } from '../../../../common/helpers';
import { services } from '../../../../services';
import { checkExtensionIsReady, createFakeProjRun, getExpectedEnvVarsString, getExpectedTagsString, getTestProjectUri } from "./helpers";
import { Expectations, RunOptions, TestResult } from "../common";
import { assertExpectedResults, assertLogExists, standardisePath } from "./assertions";
import { logStore } from '../../../runner';
import { getFeaturePathsRegEx, projDirRelativePathToWorkDirRelativePath } from '../../../../runners/helpers';
import { QueueItem } from '../../../../extension';



// SIMULATES: A USER SELECTING EVERY FOLDER FOUND IN THE TEST EXPLORER, INCLUDING NESTED FOLDERS, THEN CLICKING THE RUN/DEBUG BUTTON.
// PURPOSE: test that the correct (i.e. child or nested folder child) features are run for each folder.
export async function runFolders(projName: string, isDebugRun: boolean,
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
    services.config.integrationTestRunUseCpExec[projId] = true;

  console.log(`${consoleName}: calling configurationChangedHandler`);
  await api.configurationChangedHandler(undefined, new TestWorkspaceConfigWithProjUri(testExtConfig, projUri));
  const expectedResults = expectations.getExpectedResultsFunc(projUri, services.config);
  const folderItems = getFolderItems(api.ctrl.items, projId);

  // ACT

  console.log(`${consoleName}: calling runHandler to run folders...`);
  const requestItems = folderItems.map(x => x.item);
  const request = new vscode.TestRunRequest(requestItems);
  const results = await api.runHandler(isDebugRun, request, runProfile);

  // ASSERT


  if (testExtConfig.runParallel) {
    for (const folder of folderItems) {
      const scenarioDescendentsForThisFolder = folder.descendents.filter(x => x.id.includes(".feature/"));
      const expectedTestRunCount = scenarioDescendentsForThisFolder.length;
      assertExpectedResults(results, expectedResults, testExtConfig, expectedTestRunCount);
      if (!isDebugRun)
        assertExpectedFriendlyCmdsForParallel(request, folder.item, projUri, projName, isDebugRun, testExtConfig, runOptions);
    }
  }
  else {
    const scenarios = folderItems.flatMap(folder => folder.descendents.filter(x => x.id.includes(".feature/")));
    const expectedTestRunCount = scenarios.length;
    assertExpectedResults(results, expectedResults, testExtConfig, expectedTestRunCount);
    if (!isDebugRun)
      assertFriendlyCmdsForTogether(request, scenarios, expectedResults, projUri, projName, isDebugRun, testExtConfig, runOptions);
  }

}


function assertExpectedFriendlyCmdsForParallel(request: vscode.TestRunRequest, folder: vscode.TestItem, projUri: vscode.Uri,
  projName: string, testExtConfig: TestWorkspaceConfig, runOptions: RunOptions) {

  const tagsString = getExpectedTagsString(testExtConfig, runOptions);
  const envVarsString = getExpectedEnvVarsString(testExtConfig, runOptions);
  const workingFolder = testExtConfig.get("relativeWorkingDir") as string;
  const pr = createFakeProjRun(testExtConfig, request);

  const relFolderPath = folder.id.replace(uriId(projUri) + "/", "") + "/";
  if (!relFolderPath)
    throw new Error(`relFolderPath is undefined for ${folder.id}`);
  const workDirRelFolderPath = projDirRelativePathToWorkDirRelativePath(pr, relFolderPath);

  const expectCmdOrderedIncludes = [
    `cd `,
    `example-projects`,
    `${projName}"`,
    `${workingFolder}`,
    `${envVarsString}`,
    `python`,
    ` -m behave ${tagsString}-i "${workDirRelFolderPath}" `,
    ` --show-skipped --junit --junit-directory "`,
    `${projName}"`
  ];
  assertLogExists(projUri, expectCmdOrderedIncludes);

}


function assertFriendlyCmdsForTogether(request: vscode.TestRunRequest, scenarios: vscode.TestItem[], expectedResults: TestResult[],
  projUri: vscode.Uri, projName: string, testExtConfig: TestWorkspaceConfig, runOptions: RunOptions) {

  const tagsString = getExpectedTagsString(testExtConfig, runOptions);
  const envVarsString = getExpectedEnvVarsString(testExtConfig, runOptions);
  const workingFolder = testExtConfig.get("relativeWorkingDir") as string;
  const pr = createFakeProjRun(testExtConfig, request);

  const filteredExpectedResults = expectedResults.filter(exp => scenarios.find(r => standardisePath(r.id, true) === exp.test_id));

  const queueItems: QueueItem[] = [];
  for (const expResult of filteredExpectedResults) {
    const qi = {
      test: undefined,
      scenario: { featureFileProjectRelativePath: expResult.scenario_featureFileRelativePath }
    } as unknown as QueueItem;
    queueItems.push(qi);
  }

  const pipedWorkDirRelFolderPaths = getFeaturePathsRegEx(pr, queueItems);

  const expectCmdOrderedIncludes = [
    `cd `,
    `example-projects`,
    `${projName}"`,
    `${workingFolder}`,
    `${envVarsString}`,
    `python`,
    ` -m behave ${tagsString}-i "${pipedWorkDirRelFolderPaths}" `,
    ` --show-skipped --junit --junit-directory "`,
    `${projName}"`
  ];
  assertLogExists(projUri, expectCmdOrderedIncludes);

}


function getFolderItems(items: vscode.TestItemCollection, projId: string) {

  type folderItem = {
    item: vscode.TestItem,
    descendents: vscode.TestItem[];
  }

  const folderItems: folderItem[] = [];

  items.forEach((item) => {
    if (item.id.startsWith(projId) && !item.id.endsWith(".feature")) {
      const descendents: vscode.TestItem[] = [];
      if (item.children) {
        item.children.forEach(child => {
          descendents.push(child);
          const childDescendents = getFolderItems(child.children, projId);
          descendents.push(...childDescendents.map(x => x.item));
        });
      }
      folderItems.push({ item, descendents });
      if (item.children) {
        const childFolderItems = getFolderItems(item.children, projId);
        folderItems.push(...childFolderItems);
      }
    }

  });
  return folderItems;
}
