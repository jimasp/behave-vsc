import * as vscode from 'vscode';

interface ITestResult {
  test_id:string|undefined;
  test_uri:string|undefined;
  test_parent:string|undefined;	
  test_children:string|undefined;
  test_description:string|undefined;
  test_error:string|undefined;
  test_label:string;
  scenario_isOutline:boolean;
  scenario_getLabel:string;
  scenario_featureName:string;
  scenario_featureFilePath:string|undefined;
  scenario_scenarioName:string;
  scenario_fastSkip:boolean;
  scenario_result:string|undefined;
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
  scenario_featureName!:string;
  scenario_featureFilePath!:string;
  scenario_scenarioName!: string;
  scenario_fastSkip!: boolean;
  scenario_result: string | undefined;	
  constructor (testResult: ITestResult) {
    Object.assign(this, testResult);
  }
}

export function applyFastSkip(testConfig: vscode.WorkspaceConfiguration, expectedResults: TestResult[]) {
  
  const fastSkipEnabled = testConfig.get("runAllAsOne") === false && testConfig.get("fastSkipList") !== undefined;

  // these could be "passed" or "Traceback..." etc. as appropriate to the test, 
  // but if fastskip is enabled, they should always be "skipped"
  if (fastSkipEnabled) {
    expectedResults.forEach(expectedResult => {
      if (expectedResult.scenario_fastSkip)
        expectedResult.scenario_result = "skipped";
    });
  }

  return expectedResults;
}
