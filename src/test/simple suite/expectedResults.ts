import * as vscode from 'vscode';
import { Configuration } from "../../configuration";
import { WkspParseCounts } from "../../fileParser";
import { TestResult, applyTestConfiguration } from "../suite-shared/expectedResults.helpers";

export function getExpectedCounts(debug: boolean, wkspUri: vscode.Uri, config: Configuration): WkspParseCounts {
  const testCount = getExpectedResults(debug, wkspUri, config).length;
  return {
    tests: { nodeCount: 4, testCount: testCount },
    featureFilesExcludingEmptyOrCommentedOut: 1, stepFiles: 1,
    stepFileSteps: 6, featureFileSteps: 7, stepMappings: 7
  };
}

export const getExpectedResults = (debug: boolean, wkspUri: vscode.Uri, config: Configuration): TestResult[] => {

  const expectedResults: TestResult[] = [
    new TestResult({
      scenario_fastSkipTag: false,
      scenario_featureFileRelativePath: '{{featurePath}}/basic.feature',
      scenario_featureName: 'Simple',
      scenario_getLabel: 'run a successful test',
      scenario_isOutline: false,
      scenario_result: 'passed',
      scenario_scenarioName: 'run a successful test',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../simple/{{featurePath}}/simple.feature/run a successful test',
      test_label: 'run a successful test',
      test_parent: '.../simple/{{featurePath}}/simple.feature',
      test_uri: '.../simple/{{featurePath}}/simple.feature'
    }),

    new TestResult({
      scenario_fastSkipTag: false,
      scenario_featureFileRelativePath: '{{featurePath}}/simple.feature',
      scenario_featureName: 'Simple',
      scenario_getLabel: 'run a failing test',
      scenario_isOutline: false,
      scenario_result: 'Failing step: When we implement a failing test ... failed\nTraceback (most recent call last):\n  File -snip- assert successful_or_failing == "successful"\nAssertionError',
      scenario_scenarioName: 'run a failing test',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../simple/{{featurePath}}/simple.feature/run a failing test',
      test_label: 'run a failing test',
      test_parent: '.../simple/{{featurePath}}/simple.feature',
      test_uri: '.../simple/{{featurePath}}/simple.feature'
    }),

    new TestResult({
      scenario_fastSkipTag: false,
      scenario_featureFileRelativePath: '{{featurePath}}/simple.feature',
      scenario_featureName: 'Simple',
      scenario_getLabel: 'run a skipped test',
      scenario_isOutline: false,
      scenario_result: 'skipped',
      scenario_scenarioName: 'run a skipped test',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../simple/{{featurePath}}/simple.feature/run a skipped test',
      test_label: 'run a skipped test',
      test_parent: '.../simple/{{featurePath}}/simple.feature',
      test_uri: '.../simple/{{featurePath}}/simple.feature'
    }),

  ];


  const wkspSettings = config.workspaceSettings[wkspUri.path];
  return applyTestConfiguration(debug, wkspSettings, expectedResults);
}


