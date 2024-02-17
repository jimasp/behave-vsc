/* eslint-disable @typescript-eslint/no-explicit-any */
import * as vscode from 'vscode';
import * as path from 'path';
import { TestWorkspaceConfig } from '../testWorkspaceConfig';
import { getTestItems, uriId } from '../../../../common/helpers';
import { services } from '../../../../common/services';
import { checkExtensionIsReady, getExpectedEnvVarsString, getTestProjectUri } from "./helpers";
import { Expectations, TestResult } from "../common";
import { assertExpectedResults, assertLogExists, standardisePath } from "./assertions";
import { IntegrationTestAPI } from '../../../../extension';
import { logStore } from '../../../runner';



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
      title: '2 features selected, should execute cmd with 2 features',
      selection: [
        'example-projects/project A/behave tests/some tests/nested1/nested2/nested3/nested3.1.feature',
        'example-projects/project A/behave tests/some tests/nested1/nested2/nested3/nested3.2.feature'
      ],
      expectedFeatureRegEx: 'behave tests/some tests/nested1/nested2/nested3/nested3.1.feature$|behave tests/some tests/nested1/nested2/nested3/nested3.2.feature$',
      expectedScenarioRegEx: "",
    },
    {
      title: 'single feature, all scenarios selected, should execute cmd with feature',
      selection: [
        'example-projects/project A/behave tests/some tests/nested1/nested2/nested3/nested3.1.feature/success',
        'example-projects/project A/behave tests/some tests/nested1/nested2/nested3/nested3.1.feature/failure'
      ],
      expectedFeatureRegEx: 'behave tests/some tests/nested1/nested2/nested3/nested3.1.feature$',
      expectedScenarioRegEx: "",
    },
    {
      title: 'single folder selected, should execute cmd with folder',
      selection: ['example-projects/project A/behave tests/some tests/nested1/nested2'],
      expectedFeatureRegEx: 'behave tests/some tests/nested1/nested2/',
      expectedScenarioRegEx: "",
    },
    {
      title: 'only feature in folder, should execute cmd with folder',
      selection: ['example-projects/project A/behave tests/some tests/nested1/nested2/nested3a/nested3a.feature'],
      expectedFeatureRegEx: 'behave tests/some tests/nested1/nested2/nested3a/',
      expectedScenarioRegEx: "",
    },
    {
      title: '3 folders (parent "nested2" is not run because it does not include parent folder feature children), should execute cmd with 3 folders',
      selection: [
        'example-projects/project A/behave tests/some tests/nested1/nested2/nested3',
        'example-projects/project A/behave tests/some tests/nested1/nested2/nested3a',
        'example-projects/project A/behave tests/some tests/nested1/nested2/nested3b',
      ],
      expectedFeatureRegEx: 'behave tests/some tests/nested1/nested2/nested3/|behave tests/some tests/nested1/nested2/nested3a/|behave tests/some tests/nested1/nested2/nested3b/',
      expectedScenarioRegEx: "",
    },
    {
      title: '2 scenarios that are the sole scenario in the feature and a single feature selected from a folder, should execute cmd with 3 folders',
      selection: [
        'example-projects/project A/behave tests/some tests/nested1/nested2/nested3b/nested3b.feature/failure',
        'example-projects/project A/behave tests/some tests/nested1/nested2/nested3a/nested3a.feature/success',
        'example-projects/project A/behave tests/some tests/nested1/nested2/nested3'
      ],
      expectedFeatureRegEx: 'behave tests/some tests/nested1/nested2/nested3/|behave tests/some tests/nested1/nested2/nested3a/|behave tests/some tests/nested1/nested2/nested3b/',
      expectedScenarioRegEx: "",
    },
    {
      title: 'all folders and features in parent folder, should execute cmd with parent folder',
      selection: [
        'example-projects/project A/behave tests/some tests/nested1/nested2/nested3',
        'example-projects/project A/behave tests/some tests/nested1/nested2/nested3a/nested3a.feature/success',
        'example-projects/project A/behave tests/some tests/nested1/nested2/nested3b/nested3b.feature/failure',
        'example-projects/project A/behave tests/some tests/nested1/nested2/nested2.1.feature',
        'example-projects/project A/behave tests/some tests/nested1/nested2/nested2.2.feature',
        'example-projects/project A/behave tests/some tests/nested1/nested2/nested2.3.feature'
      ],
      expectedFeatureRegEx: 'behave tests/some tests/nested1/nested2/',
      expectedScenarioRegEx: "",
    },
    {
      title: '2 folders and a 1 feature which is the only feature in a folder, should execute cmd with 3 folders',
      selection: [
        'example-projects/project A/behave tests/some tests/nested1/nested2/nested3',
        'example-projects/project A/behave tests/some tests/nested1/nested2/nested3a',
        'example-projects/project A/behave tests/some tests/nested1/nested2/nested3b/nested3b.feature',
      ],
      expectedFeatureRegEx: 'behave tests/some tests/nested1/nested2/nested3/|behave tests/some tests/nested1/nested2/nested3a/|behave tests/some tests/nested1/nested2/nested3b/',
      expectedScenarioRegEx: "",
    },
    {
      title: 'all folders and features in parent folder selected but using a single feature/scenario selected from a folder with one feature/scenario, should execute cmd with parent folder',
      selection: [
        'example-projects/project A/behave tests/some tests/nested1/nested2/nested3b/nested3b.feature/failure',
        'example-projects/project A/behave tests/some tests/nested1/nested2/nested3a/nested3a.feature/success',
        'example-projects/project A/behave tests/some tests/nested1/nested2/nested3',
        'example-projects/project A/behave tests/some tests/nested1/nested2/nested2.1.feature',
        'example-projects/project A/behave tests/some tests/nested1/nested2/nested2.2.feature',
        'example-projects/project A/behave tests/some tests/nested1/nested2/nested2.3.feature'
      ],
      expectedFeatureRegEx: 'behave tests/some tests/nested1/nested2/',
      expectedScenarioRegEx: "",
    },
    {
      title: 'all scenarios from a folder selected should execute cmd with that folder',
      selection: [
        'example-projects/project A/behave tests/some tests/nested1/nested2/nested3/nested3.3.feature/skipped-by-feature',
        'example-projects/project A/behave tests/some tests/nested1/nested2/nested3/nested3.2.feature/skipped',
        'example-projects/project A/behave tests/some tests/nested1/nested2/nested3/nested3.2.feature/failure',
        'example-projects/project A/behave tests/some tests/nested1/nested2/nested3/nested3.1.feature/failure',
        'example-projects/project A/behave tests/some tests/nested1/nested2/nested3/nested3.1.feature/success'
      ],
      expectedFeatureRegEx: 'behave tests/some tests/nested1/nested2/nested3/',
      expectedScenarioRegEx: "",
    },
    {
      title: 'all scenarios from a folder selected should execute cmd with that folder',
      selection: [
        'example-projects/project A/behave tests/some tests/nested1/nested2/nested3/nested3.3.feature/skipped-by-feature',
        'example-projects/project A/behave tests/some tests/nested1/nested2/nested3/nested3.2.feature/skipped',
        'example-projects/project A/behave tests/some tests/nested1/nested2/nested3/nested3.2.feature/failure',
        'example-projects/project A/behave tests/some tests/nested1/nested2/nested3/nested3.1.feature/failure',
        'example-projects/project A/behave tests/some tests/nested1/nested2/nested3/nested3.1.feature/success',
        'example-projects/project A/behave tests/some tests/nested1/nested2/nested3a/nested3a.feature/success',
        'example-projects/project A/behave tests/some tests/nested1/nested2/nested3b/nested3b.feature/failure',
        'example-projects/project A/behave tests/some tests/nested1/nested2/nested2.1.feature/success',
        'example-projects/project A/behave tests/some tests/nested1/nested2/nested2.2.feature/failure',
        'example-projects/project A/behave tests/some tests/nested1/nested2/nested2.3.feature/skipped-by-feature',
        'example-projects/project A/behave tests/some tests/nested1/nested1.1.feature/success',
        'example-projects/project A/behave tests/some tests/nested1/nested1.1.feature/failure',
        'example-projects/project A/behave tests/some tests/nested1/nested1.2.feature/failure',
        'example-projects/project A/behave tests/some tests/nested1/nested1.2.feature/skipped',
        'example-projects/project A/behave tests/some tests/nested1/nested1.3.feature/skipped-by-feature'
      ],
      expectedFeatureRegEx: 'behave tests/some tests/nested1/',
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
  logStore.clearProjLogs(projUri);

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
  const expResults = expectedResults.filter(x => params.selection.some(r => x.test_id && x.test_id.startsWith(standardisePath(r) ?? "undef")));

  assertExpectedResults(projName, results, expResults, testExtConfig, undefined, params.title);
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
  assertLogExists(projUri, expectCmdOrderedIncludes, params.title);

}


interface Params {
  title: string;
  selection: string[];
  expectedFeatureRegEx: string;
  expectedScenarioRegEx: string;
}

