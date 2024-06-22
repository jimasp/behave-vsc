/* eslint-disable @typescript-eslint/no-explicit-any */
import os from 'os';
import vscode from 'vscode';
import { TestWorkspaceConfig } from './testWorkspaceConfig';
import { getTestItems, uriId } from '../../../common/helpers';
import { services } from '../../../common/services';
import {
  JS_OUTPUT_DIR, checkExtensionIsReady, getExpectedEnvVarsString,
  getRunProfile, getTestProjectUri, replaceBehaveIni, setCleanup
} from "./helpers";
import { Expectations, TestBehaveIni, TestResult } from "./types";
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
export async function runSelections(projName: string, testExtConfig: TestWorkspaceConfig, behaveIni: TestBehaveIni,
  expectations: Expectations, selectionList: SelectionListEntry[]): Promise<void> {

  // sanity check
  if (testExtConfig.runParallel) {
    throw new Error("runSelections has not been tested with runParallel=true, " +
      "(runParallel=true won't pipe features, it will run them individually, which may affect assertions).");
  }

  const api = await checkExtensionIsReady();
  const consoleName = `runProjectASelections ${projName}`;
  const projUri = await getTestProjectUri(api, projName);
  const workDirUri = vscode.Uri.joinPath(projUri, testExtConfig.get("behaveWorkingDirectory"));
  const cleanUp = setCleanup(consoleName, workDirUri);
  const projId = uriId(projUri);


  testExtConfig.integrationTestRunUseCpExec = true;

  // note that we cannot inject behave.ini like our test workspace config, because behave will always read it from disk
  replaceBehaveIni(consoleName, workDirUri, behaveIni.content);

  try {
    console.log(`${consoleName}: calling configurationChangedHandler`);
    await api.configurationChangedHandler(false, undefined, testExtConfig, projUri);
    const expectedResults = expectations.getExpectedResultsFunc(projUri, services.config);
    const allTestItems = getTestItems(projId, api.getProjMapEntry(projUri).ctrl.items);


    const selections = selectionList.map(x => {
      const scenRegEx = os.platform() === "win32" ? x.expectedScenarioRegExPwrShl : x.expectedScenarioRegExPosix;
      return new Selection(x.title, x.selection, x.expectedFeatureRegEx, scenRegEx);
    });

    for (const selection of selections) {
      await runSelection(selection, consoleName, projUri, api, allTestItems, expectedResults, projName, testExtConfig);
    }
  }
  finally {
    cleanUp();
  }

}




async function runSelection(params: Selection, consoleName: string, projUri: vscode.Uri,
  api: IntegrationTestAPI, allTestItems: vscode.TestItem[], expectedResults: TestResult[], projName: string,
  testExtConfig: TestWorkspaceConfig) {

  // ARRANGE

  const requestItems: vscode.TestItem[] = [];
  logStore.clearProjLogs(projUri);

  const getAbsPath = (relPath: string) => {
    const dirUri = vscode.Uri.file(__dirname);
    const repPath = vscode.Uri.joinPath(dirUri, "../../../..", relPath).path.replace(JS_OUTPUT_DIR, "/");
    return repPath;
  }

  const selectedTestIds = params.selection.map(id => {
    if (!id.includes(".feature")) {
      // folder
      const absPath = getAbsPath(id);
      return uriId(vscode.Uri.file(absPath));
    }

    // feature or scenario
    const split = id.split(".feature");
    const featurePath = split[0] + ".feature";
    const slashScenarioName = split[1];
    const absPath = getAbsPath(featurePath);
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


async function actAndAssert(params: Selection, consoleName: string, requestItems: vscode.TestItem[], api: IntegrationTestAPI,
  expectedResults: TestResult[], projName: string, testExtConfig: TestWorkspaceConfig, projUri: vscode.Uri) {

  // ACT

  console.log(`${consoleName}: calling runHandler to run piped features...`);
  const request = new vscode.TestRunRequest(requestItems);
  const runProfile = getRunProfile(projUri, testExtConfig, undefined);
  const results = await api.getProjMapEntry(projUri).runHandler!(false, request, runProfile);

  // ASSERT  

  assertExpectedResults(projName, results, expectedResults, testExtConfig, true, undefined, params.title);
  assertExpectedFriendlyCmd(params, projUri, projName, testExtConfig);
}


function assertExpectedFriendlyCmd(params: Selection, projUri: vscode.Uri, projName: string,
  testExtConfig: TestWorkspaceConfig) {

  const envVarsString = getExpectedEnvVarsString(projUri, testExtConfig);
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
    `-m behave -i "${params.expectedFeatureRegEx}" ${expScenarioRegExWithOptionChar}`,
    `--show-skipped --junit --junit-directory`,
    `${projName}"`
  ];

  assertLogExists(projUri, expectCmdOrderedIncludes, params.title);
}


class Selection {
  constructor(
    public readonly title: string,
    public readonly selection: string[],
    public readonly expectedFeatureRegEx: string,
    public readonly expectedScenarioRegEx: string
  ) { }
}


export interface SelectionListEntry {
  title: string;
  selection: string[];
  expectedFeatureRegEx: string,
  expectedScenarioRegExPosix: string;
  expectedScenarioRegExPwrShl: string;
}

