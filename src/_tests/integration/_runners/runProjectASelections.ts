/* eslint-disable @typescript-eslint/no-explicit-any */
import * as vscode from 'vscode';
import * as path from 'path';
import { TestWorkspaceConfig } from '../_helpers/testWorkspaceConfig';
import { getTestItems, uriId } from '../../../common/helpers';
import { services } from '../../../common/services';
import { checkExtensionIsReady, getExpectedEnvVarsString, getTestProjectUri, replaceBehaveIni, restoreBehaveIni } from "./helpers";
import { Expectations, TestBehaveIni, TestResult } from "../_helpers/common";
import { assertExpectedResults, assertLogExists, standardisePath } from "./assertions";
import { IntegrationTestAPI } from '../../../extension';
import { logStore } from '../../runner';



// SIMULATES: A USER CLICKING SELECTING VARIOUS LEVELS OF FOLDERS, FEATURES AND SCENARIOS IN THE TEST EXPLORER,
// THEN CLICKING THE RUN/DEBUG BUTTON.
// PURPOSE: more specific project A tests checking that the various regex patterns produced are:
// (a) correct for the given selection, and 
// (b) work with behave.
// This is different from the other tests of this type because the expected log output is pre-determined in Params rather than 
// created using the helper functions in the code under test, (i.e. it ALSO checks the produced regexs are correct, not just 
// that they work with behave and produce the expected results.)
export async function runProjectASelections(testExtConfig: TestWorkspaceConfig, behaveIni: TestBehaveIni,
  expectations: Expectations): Promise<void> {

  // sanity check
  if (testExtConfig.runParallel) {
    throw new Error("runPipedFeatures is pointless with runParallel=true, because it won't pipe features, it will run them " +
      "individually, and running features individually is already tested by runProject.ts");
  }

  const projName = "project A";
  const consoleName = `runProjectASelections ${projName}`;
  const projUri = getTestProjectUri(projName);
  const workDirUri = vscode.Uri.joinPath(projUri, testExtConfig.get("behaveWorkingDirectory"));
  const projId = uriId(projUri);
  const api = await checkExtensionIsReady();

  testExtConfig.integrationTestRunUseCpExec = true;

  // note that we cannot inject behave.ini like our test workspace config, because behave will always read it from disk
  await replaceBehaveIni(consoleName, workDirUri, behaveIni.content);

  try {
    console.log(`${consoleName}: calling configurationChangedHandler`);
    await api.configurationChangedHandler(false, undefined, testExtConfig, projUri);
    const expectedResults = expectations.getExpectedResultsFunc(projUri, services.config);
    const allTestItems = getTestItems(projId, api.ctrl.items);

    for (const params of parameterisedTests) {
      await runSelection(params, consoleName, projUri, api, allTestItems, expectedResults, projName, testExtConfig);
    }
  }
  finally {
    await restoreBehaveIni(consoleName, workDirUri);
  }

}


async function runSelection(params: Params, consoleName: string, projUri: vscode.Uri,
  api: IntegrationTestAPI, allTestItems: vscode.TestItem[], expectedResults: TestResult[], projName: string,
  testExtConfig: TestWorkspaceConfig) {

  // ARRANGE

  const requestItems: vscode.TestItem[] = [];
  logStore.clearProjLogs(projUri);

  const selectedTestIds = params.selection.map(id => {
    if (!id.includes(".feature")) {
      // folder
      const absPath = path.join(__dirname, "../../../..", id).replace("/out/", "/");
      return uriId(vscode.Uri.file(absPath));
    }

    // feature or scenario
    const split = id.split(".feature");
    const featurePath = split[0] + ".feature";
    const slashScenarioName = split[1];
    const absPath = path.join(__dirname, "../../../..", featurePath).replace("/out/", "/");
    return uriId(vscode.Uri.file(absPath)) + slashScenarioName;
  });

  requestItems.push(...allTestItems.filter(item => selectedTestIds.includes(item.id)));

  const expResults = expectedResults.filter(expResult => {
    const expId = expResult.test_id;
    if (!expId)
      return false;
    let res = false;
    for (const sel of params.selection) {
      const stdPath = standardisePath(sel) ?? "undef";
      if (sel.includes(".feature/")) {
        if (expId === stdPath)
          res = true;
      }
      else if (expId.startsWith(stdPath)) {
        res = true;
      }
    }
    return res;
  });

  // ACT AND ASSERT

  await actAndAssert(params, consoleName, requestItems, api, expResults, projName, testExtConfig, projUri);
}


async function actAndAssert(params: Params, consoleName: string, requestItems: vscode.TestItem[], api: IntegrationTestAPI,
  expectedResults: TestResult[], projName: string, testExtConfig: TestWorkspaceConfig, projUri: vscode.Uri) {

  // ACT

  console.log(`${consoleName}: calling runHandler to run piped features...`);
  const request = new vscode.TestRunRequest(requestItems);
  const runProfile = undefined;
  const results = await api.runHandler(false, request, runProfile);

  // ASSERT  

  assertExpectedResults(projName, results, expectedResults, testExtConfig, true, undefined, params.title);
  assertExpectedFriendlyCmd(params, projUri, projName, testExtConfig);
}


function assertExpectedFriendlyCmd(params: Params, projUri: vscode.Uri, projName: string,
  testExtConfig: TestWorkspaceConfig) {

  const envVarsString = getExpectedEnvVarsString(testExtConfig);
  const workingFolder = testExtConfig.get("behaveWorkingDirectory") as string;

  let expScenarioRegExWithOptionChar = "";
  if (params.expectedScenarioRegEx !== "")
    expScenarioRegExWithOptionChar = `-n "${params.expectedScenarioRegEx}"`;

  const expectCmdOrderedIncludes = [
    `cd `,
    `example-projects`,
    `${projName}`,
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

const parameterisedTests: Params[] = [
  {
    title: '1 scenario, should execute cmd with 1 scenario',
    selection: ['example-projects/project A/behave tests/some tests/group1_features/basic.feature/run a successful test'],
    expectedFeatureRegEx: 'behave tests/some tests/group1_features/basic.feature$',
    expectedScenarioRegEx: '^run a successful test\\$',
  },
  {
    title: '2 scenarios, should execute cmd with 2 scenarios',
    selection: [
      'example-projects/project A/behave tests/some tests/group1_features/basic.feature/run a successful test',
      'example-projects/project A/behave tests/some tests/group1_features/basic.feature/run a failing test'
    ],
    expectedFeatureRegEx: 'behave tests/some tests/group1_features/basic.feature$',
    expectedScenarioRegEx: '^run a failing test\\$|^run a successful test\\$',
  },
  {
    title: '1 feature, should execute cmd with 1 feature',
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
    title: 'all features selected in top-level folder, should execute cmd with features (because nested folders are not selected)',
    selection: [
      'example-projects/project A/behave tests/some tests/nested1/nested1.1.feature',
      'example-projects/project A/behave tests/some tests/nested1/nested1.2.feature',
      'example-projects/project A/behave tests/some tests/nested1/nested1.3.feature',
    ],
    expectedFeatureRegEx: 'behave tests/some tests/nested1/nested1.1.feature$|behave tests/some tests/nested1/nested1.2.feature$|behave tests/some tests/nested1/nested1.3.feature$',
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
  {
    title: 'special chars 1',
    selection: ['example-projects/project A/behave tests/some tests/special_characters.feature/run a successful rx scenario = "'],
    expectedFeatureRegEx: 'behave tests/some tests/special_characters.feature$',
    expectedScenarioRegEx: '^run a successful rx scenario = \\"\\$',
  },
  {
    title: 'special chars 2',
    selection: ["example-projects/project A/behave tests/some tests/special_characters.feature/run a successful rx scenario = '"],
    expectedFeatureRegEx: 'behave tests/some tests/special_characters.feature$',
    expectedScenarioRegEx: "^run a successful rx scenario = '\\$",
  },
  {
    title: 'special chars 3',
    selection: ['example-projects/project A/behave tests/some tests/special_characters.feature/run a successful rx scenario = `'],
    expectedFeatureRegEx: 'behave tests/some tests/special_characters.feature$',
    expectedScenarioRegEx: "^run a successful rx scenario = \\`\\$",
  },
  {
    title: 'special chars 4',
    selection: ['example-projects/project A/behave tests/some tests/special_characters.feature/run a successful rx scenario = \\'],
    expectedFeatureRegEx: 'behave tests/some tests/special_characters.feature$',
    expectedScenarioRegEx: "^run a successful rx scenario = \\\\\\\\\\$",
  },

];
