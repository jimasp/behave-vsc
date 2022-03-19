import * as vscode from 'vscode';
import { moreInfo } from '../outputParser';

interface ITestResult {
  test_id: string | undefined;
  test_uri: string | undefined;
  test_parent: string | undefined;
  test_children: string | undefined;
  test_description: string | undefined;
  test_error: string | undefined;
  test_label: string;
  scenario_isOutline: boolean;
  scenario_getLabel: string;
  scenario_featureName: string;
  scenario_featureFileRelativePath: string | undefined;
  scenario_scenarioName: string;
  scenario_fastSkip: boolean;
  scenario_result: string | undefined;
}


export class TestResult implements ITestResult {
  test_id: string | undefined;
  test_uri: string | undefined;
  test_parent: string | undefined;
  test_children: string | undefined;
  test_description: string | undefined;
  test_error: string | undefined;
  test_label!: string;
  scenario_isOutline!: boolean;
  scenario_getLabel!: string;
  scenario_featureName!: string;
  scenario_featureFileRelativePath!: string;
  scenario_scenarioName!: string;
  scenario_fastSkip!: boolean;
  scenario_result: string | undefined;
  constructor(testResult: ITestResult) {
    Object.assign(this, testResult);
  }
}


export function applyDebugTextReplacements(debug: boolean, expectedResults: TestResult[]) {

  if (!debug)
    return expectedResults;

  const runMoreInfo = moreInfo(false);
  const debugMoreInfo = moreInfo(true);
  expectedResults.forEach(expectedResult => {
    const idx = expectedResult.scenario_result?.indexOf(runMoreInfo);
    if (idx !== -1)
      expectedResult.scenario_result = expectedResult.scenario_result?.substring(0, idx) + debugMoreInfo;
  });

  return expectedResults;
}

export function applyFastSkipTextReplacements(testConfig: vscode.WorkspaceConfiguration, expectedResults: TestResult[]) {

  const fastSkipEnabled = testConfig.get("runAllAsOne") === false && testConfig.get("fastSkipList") !== undefined;

  if (!fastSkipEnabled)
    return expectedResults;

  // these could be "passed" or "Traceback..." etc. as appropriate to the test, 
  // but if fastskip is enabled, they should always be "skipped"
  expectedResults.forEach(expectedResult => {
    if (expectedResult.scenario_fastSkip)
      expectedResult.scenario_result = "skipped";
  });

  return expectedResults;
}
