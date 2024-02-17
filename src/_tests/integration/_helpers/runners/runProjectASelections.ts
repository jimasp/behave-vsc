/* eslint-disable @typescript-eslint/no-explicit-any */
import * as vscode from 'vscode';
import * as path from 'path';
import { TestWorkspaceConfig } from '../testWorkspaceConfig';
import { getTestItems, uriId } from '../../../../common/helpers';
import { services } from '../../../../common/services';
import { checkExtensionIsReady, createFakeProjRun, getExpectedEnvVarsString, getExpectedTagsString, getTestProjectUri } from "./helpers";
import { Expectations, RunOptions, TestResult } from "../common";
import { assertExpectedResults, assertLogExists, standardisePath } from "./assertions";
import { IntegrationTestAPI, QueueItem } from '../../../../extension';
import { logStore } from '../../../runner';
import { getOptimisedFeaturePathsRegEx } from '../../../../runners/helpers';



// SIMULATES: A USER CLICKING SELECTING VARIOUS LEVELS OF FOLDERS, FEATURES AND SCENARIOS IN THE TEST EXPLORER,
// THEN CLICKING THE RUN/DEBUG BUTTON.
// PURPOSE: more specific project A tests checking that the various regex patterns produced work with behave.
export async function runProjectASelections(
  testExtConfig: TestWorkspaceConfig, expectations: Expectations): Promise<void> {

  // sanity check
  if (testExtConfig.runParallel) {
    throw new Error("runPipedFeatures is pointless with runParallel=true, because it won't pipe features, it will run them " +
      "individually, and running features individually is already tested by runProject.ts");
  }

  const projName = "project A";
  const projUri = getTestProjectUri(projName);
  logStore.clearProjLogs(projUri);
  const projId = uriId(projUri);
  const api = await checkExtensionIsReady();
  const consoleName = `runProjectASelections`;

  testExtConfig.integrationTestRunUseCpExec = true;

  console.log(`${consoleName}: calling configurationChangedHandler`);
  await api.configurationChangedHandler(false, undefined, testExtConfig, projUri);
  const expectedResults = expectations.getExpectedResultsFunc(projUri, services.config);
  const allTestItems = getTestItems(projId, api.ctrl.items);

  const parameters: Params[] = [
    {
      title: '1 feature, should return 1 feature',
      selection: ['example-projects/project A/behave tests/some tests/nested1/nested2/nested3/nested3.1.feature'],
      expectedFeatureRegEx: 'behave tests/some tests/nested1/nested2/nested3/nested3.1.feature$',
      expectedScenarioRegEx: '',
    },
    {
      title: '2 features selected, should use cmd with 2 features',
      selection: [
        'example-projects/project A/behave tests/some tests/nested1/nested2/nested3/nested3.1.feature',
        'example-projects/project A/behave tests/some tests/nested1/nested2/nested3/nested3.2.feature'
      ],
      expectedFeatureRegEx: 'behave tests/some tests/nested1/nested2/nested3/nested3.1.feature$|behave tests/some tests/nested1/nested2/nested3/nested3.2.feature$',
      expectedScenarioRegEx: "",
    },
    {
      title: 'single feature, all scenarios selected, should use cmd with feature',
      selection: [
        'example-projects/project A/behave tests/some tests/nested1/nested2/nested3/nested3.1.feature/success',
        'example-projects/project A/behave tests/some tests/nested1/nested2/nested3/nested3.1.feature/failure'
      ],
      expectedFeatureRegEx: 'behave tests/some tests/nested1/nested2/nested3/nested3.1.feature$|behave tests/some tests/nested1/nested2/nested3/nested3.2.feature$',
      expectedScenarioRegEx: "",
    },
    {
      title: 'single folder selected, should use cmd with folder',
      selection: ['example-projects/project A/behave tests/some tests/nested1/nested2'],
      expectedFeatureRegEx: 'behave tests/some tests/nested1/nested2/',
      expectedScenarioRegEx: "",
    },
  ];

  for (const params of parameters) {
    await runSelection(params, consoleName, projUri, api, allTestItems, expectedResults, projName, testExtConfig);
  }
}


async function runSelection(params: Params, consoleName: string, projUri: vscode.Uri,
  api: IntegrationTestAPI, allTestItems: vscode.TestItem[], expectedResults: TestResult[], projName: string,
  testExtConfig: TestWorkspaceConfig) {

  // ARRANGE

  const requestItems: vscode.TestItem[] = [];


  const absPaths = params.selection.map(x => path.join(__dirname, "../../../..", x).replace("/out/", "/"));
  for (const ap of absPaths) {
    const id = uriId(vscode.Uri.file(ap));
    requestItems.push(...allTestItems.filter(item => item.id === id));
  }

  // ACT AND ASSERT

  await actAndAssert(params, consoleName, requestItems, api, expectedResults, projName, testExtConfig, projUri);
}


async function actAndAssert(params: Params, consoleName: string, requestItems: vscode.TestItem[], api: IntegrationTestAPI,
  expectedResults: TestResult[], projName: string, testExtConfig: TestWorkspaceConfig, projUri: vscode.Uri) {

  // ACT

  console.log(`${consoleName}: calling runHandler to run piped features...`);
  const request = new vscode.TestRunRequest(requestItems);
  const runProfile = undefined;
  const results = await api.runHandler(false, request, runProfile);

  // ASSERT  
  const expectedTestRunSize = requestItems.map(x => x.children.size).reduce((a, b) => a + b, 0);
  const expResults = expectedResults.filter(x => params.selection.some(r => x.test_id && x.test_id.startsWith(standardisePath(r) ?? "undef")));

  assertExpectedResults(projName, results, expResults, testExtConfig, expectedTestRunSize);
  assertExpectedFriendlyCmd(params, projUri, projName, testExtConfig);
}


function assertExpectedFriendlyCmd(params: Params, projUri: vscode.Uri, projName: string,
  testExtConfig: TestWorkspaceConfig) {

  const envVarsString = getExpectedEnvVarsString(testExtConfig);
  const workingFolder = testExtConfig.get("behaveWorkingDirectory") as string;

  let expScenarioRegExWithOptionChar = "";
  if (params.expectedScenarioRegEx !== "")
    expScenarioRegExWithOptionChar = `-n ${params.expectedScenarioRegEx}`;

  const expectCmdOrderedIncludes = [
    `cd `,
    `example-projects`,
    `${projName}"`,
    `${workingFolder}`,
    `${envVarsString}`,
    `python`,
    ` -m behave -i "${params.expectedFeatureRegEx}" ${expScenarioRegExWithOptionChar}`,
    ` --show-skipped --junit --junit-directory "`,
    `${projName}"`
  ];
  assertLogExists(projUri, expectCmdOrderedIncludes);

}


interface Params {
  title: string;
  selection: string[];
  expectedFeatureRegEx: string;
  expectedScenarioRegEx: string;
}

