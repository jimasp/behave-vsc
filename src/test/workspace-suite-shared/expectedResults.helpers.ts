import { WorkspaceSettings } from "../../WorkspaceSettings";
import { moreInfo } from '../../junitParser';

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


export function applyTestConfiguration(debug: boolean, wkspSettings: WorkspaceSettings, expectedResults: TestResult[]) {
  const runMoreInfo = moreInfo(false);
  const debugMoreInfo = moreInfo(true);

  expectedResults = applyFeaturesPath(expectedResults, wkspSettings);
  expectedResults = applyDebugTextReplacements(expectedResults, debug, runMoreInfo, debugMoreInfo);
  expectedResults = applyFastSkipReplacements(expectedResults, debug, wkspSettings);

  return expectedResults;
}


function applyFeaturesPath(expectedResults: TestResult[], wkspSettings: WorkspaceSettings) {
  expectedResults.forEach((expectedResult, index, returnResults) => {
    const json = JSON.stringify(expectedResult).replaceAll("{{featurePath}}", wkspSettings.featuresPath);
    returnResults[index] = JSON.parse(json);
  });

  return expectedResults;
}


function applyDebugTextReplacements(expectedResults: TestResult[], debug: boolean, runMoreInfo: string, debugMoreInfo: string) {

  if (!debug)
    return expectedResults;

  expectedResults.forEach(expectedResult => {
    const idx = expectedResult.scenario_result?.indexOf(runMoreInfo);
    if (idx !== -1)
      expectedResult.scenario_result = expectedResult.scenario_result?.substring(0, idx) + debugMoreInfo;
  });

  return expectedResults;
}

function applyFastSkipReplacements(expectedResults: TestResult[], debug: boolean, wkspSettings: WorkspaceSettings) {

  const fastSkipSet = wkspSettings.fastSkipList.length > 0;
  const fastSkipActive = fastSkipSet && !debug && !wkspSettings.runAllAsOne;

  if (!fastSkipSet) {
    expectedResults.forEach(expectedResult => {
      expectedResult.scenario_fastSkip = false;
    });
    return expectedResults;
  }

  // these could be "passed" or "Traceback..." etc. as appropriate to the test, 
  // but if fastskip is enabled, they should always be "skipped"
  if (fastSkipActive) {
    expectedResults.forEach(expectedResult => {
      if (expectedResult.scenario_fastSkip)
        expectedResult.scenario_result = "skipped";
    });
  }

  return expectedResults;
}
