import { ExtensionConfiguration } from '../configuration';
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


export function applyTestConfiguration(debug: boolean, config: ExtensionConfiguration, expectedResults: TestResult[]) {
  const runMoreInfo = moreInfo(false);
  const debugMoreInfo = moreInfo(true);

  expectedResults = applyFeaturesPath(expectedResults, config);
  expectedResults = applyDebugTextReplacements(expectedResults, debug, runMoreInfo, debugMoreInfo);
  expectedResults = applyFastSkipTextReplacements(expectedResults, debug, config);

  return expectedResults;
}


function applyFeaturesPath(expectedResults: TestResult[], config: ExtensionConfiguration) {
  expectedResults.forEach((expectedResult, index, returnResults) => {
    const json = JSON.stringify(expectedResult).replaceAll("{{featurePath}}", config.userSettings.featuresPath);
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

function applyFastSkipTextReplacements(expectedResults: TestResult[], debug: boolean, config: ExtensionConfiguration) {

  const fastSkipEnabled = config.userSettings.fastSkipList && !debug && !config.userSettings.runAllAsOne;

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
