import { WorkspaceFolderSettings } from "../../settings";

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
  scenario_result: string | undefined;
  constructor(testResult: ITestResult) {
    Object.assign(this, testResult);
  }
}


export function applyTestConfiguration(wkspSettings: WorkspaceFolderSettings, expectedResults: TestResult[]) {
  expectedResults.forEach((expectedResult, index, returnResults) => {
    const json = JSON.stringify(expectedResult).replaceAll("{{featurePath}}", wkspSettings.relativeFeaturePaths);
    returnResults[index] = JSON.parse(json);
  });

  return expectedResults;
}


