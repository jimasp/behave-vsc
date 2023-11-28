import * as vscode from 'vscode';
import { Configuration } from "../../configuration";
import { ProjParseCounts } from "../../parsers/fileParser";
import { TestResult, applyTestConfiguration } from "../suite-helpers/expectedResults.helpers";

export function getExpectedCounts(projUri: vscode.Uri, config: Configuration): ProjParseCounts {
  const testCount = getExpectedResults(projUri, config).length;
  return {
    tests: { nodeCount: 4, testCount: testCount },
    featureFilesExceptEmptyOrCommentedOut: 1, stepFilesExceptEmptyOrCommentedOut: 1,
    stepFileStepsExceptCommentedOut: 6, featureFileStepsExceptCommentedOut: 7, stepMappings: 7
  };
}

export const getExpectedResults = (projUri: vscode.Uri, config: Configuration): TestResult[] => {

  const expectedResults: TestResult[] = [
    new TestResult({
      scenario_featureFileRelativePath: '{{featurePath}}/simple.feature',
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
      scenario_featureFileRelativePath: '{{featurePath}}/simple.feature',
      scenario_featureName: 'Simple',
      scenario_getLabel: 'run a failing test',
      scenario_isOutline: false,
      scenario_result: 'failed',
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


  const projSettings = config.projectSettings[projUri.path];
  return applyTestConfiguration(projSettings, expectedResults);
}


