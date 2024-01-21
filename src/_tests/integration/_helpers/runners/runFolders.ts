/* eslint-disable @typescript-eslint/no-explicit-any */
import * as vscode from 'vscode';
import { RunProfilesSetting } from "../../../../config/settings";
import { TestWorkspaceConfig, TestWorkspaceConfigWithProjUri } from '../testWorkspaceConfig';
import { uriId } from '../../../../common/helpers';
import { services } from '../../../../services';
import { checkExtensionIsReady, createFakeProjRun, getExpectedEnvVarsString, getExpectedTagsString, getTestProjectUri } from "./helpers";
import { Expectations, RunOptions, TestResult } from "../common";
import { assertExpectedResults, assertLogExists } from "./assertions";
import { logStore } from '../../../runner';
import { projDirRelativePathToWorkDirRelativePath } from '../../../../runners/helpers';



// SIMULATES: A USER CLICKING THE RUN/DEBUG BUTTON ON EACH FOLDER LEVEL IN THE TEST EXPLORER
// PURPOSE: test that the correct (i.e. child or nested folder child) features are run for each folder
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
    services.config.integrationTestRunType = "cpExec";

  console.log(`${consoleName}: calling configurationChangedHandler`);
  await api.configurationChangedHandler(undefined, new TestWorkspaceConfigWithProjUri(testExtConfig, projUri));
  //const allProjItems = getTestItems(projId, api.ctrl.items);
  const expectedResults = expectations.getExpectedResultsFunc(projUri, services.config);

  const folderItems = getFolderItems(api.ctrl.items, projId);

  for (const folder of folderItems) {

    // ACT

    console.log(`${consoleName}: calling runHandler to run piped features...`);
    const request = new vscode.TestRunRequest([folder.item]);
    const results = await api.runHandler(isDebugRun, request, runProfile);

    // // ASSERT  

    const scenarioDescendents = folder.descendents.filter(x => !x.id.endsWith(".feature"));
    const expectedTestRunSize = scenarioDescendents.length;
    assertExpectedResults(results, expectedResults, testExtConfig, expectedTestRunSize);
    assertRunPipedFeaturesFriendlyCmd(folder.item, projUri, projName, isDebugRun, expectedResults, testExtConfig, runOptions);
  }
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
    }
  });
  return folderItems;
}


function assertRunPipedFeaturesFriendlyCmd(folder: vscode.TestItem, projUri: vscode.Uri, projName: string,
  isDebugRun: boolean, expectedResults: TestResult[], testExtConfig: TestWorkspaceConfig, runOptions: RunOptions) {

  // friendlyCmds are not logged for debug runs (and we don't want to assert friendlyCmds twice over anyway)
  if (isDebugRun)
    return;

  const tagsString = getExpectedTagsString(testExtConfig, runOptions);
  const envVarsString = getExpectedEnvVarsString(testExtConfig, runOptions);
  const workingFolder = testExtConfig.get("relativeWorkingDir") as string;
  const pr = createFakeProjRun(testExtConfig);

  const relFolderPath = folder.id.replace(uriId(projUri) + "/", "") + "/";
  if (!relFolderPath)
    throw new Error(`folder.uri.path is undefined for ${folder.id}`);
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
