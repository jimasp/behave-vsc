import * as vscode from 'vscode';
import { Configuration } from "../../configuration";
import { WkspParseCounts } from "../../parsers/fileParser";
import { TestResult, applyTestConfiguration } from "../suite-shared/expectedResults.helpers";

export function getExpectedCounts(wkspUri: vscode.Uri, config: Configuration): WkspParseCounts {
  const testCount = getExpectedResults(wkspUri, config).length;
  return {
    tests: { nodeCount: 9, testCount: testCount },
    featureFilesExceptEmptyOrCommentedOut: 2, stepFilesExceptEmptyOrCommentedOut: 1,
    stepFileStepsExceptCommentedOut: 6, featureFileStepsExceptCommentedOut: 14, stepMappings: 14
  };
}

export const getExpectedResults = (wkspUri: vscode.Uri, config: Configuration): TestResult[] => {

  const expectedResults: TestResult[] = [
    new TestResult({
      scenario_featureFileRelativePath: '{{featurePath}}/basic.feature',
      scenario_featureName: 'Basic',
      scenario_getLabel: 'run a successful test',
      scenario_isOutline: false,
      scenario_result: 'passed',
      scenario_scenarioName: 'run a successful test',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../sibling steps folder 3/{{featurePath}}/basic.feature/run a successful test',
      test_label: 'run a successful test',
      test_parent: '.../sibling steps folder 3/{{featurePath}}/basic.feature',
      test_uri: '.../sibling steps folder 3/{{featurePath}}/basic.feature'
    }),

    new TestResult({
      scenario_featureFileRelativePath: '{{featurePath}}/basic.feature',
      scenario_featureName: 'Basic',
      scenario_getLabel: 'run a failing test',
      scenario_isOutline: false,
      scenario_result: 'failed',
      scenario_scenarioName: 'run a failing test',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../sibling steps folder 3/{{featurePath}}/basic.feature/run a failing test',
      test_label: 'run a failing test',
      test_parent: '.../sibling steps folder 3/{{featurePath}}/basic.feature',
      test_uri: '.../sibling steps folder 3/{{featurePath}}/basic.feature'
    }),

    new TestResult({
      scenario_featureFileRelativePath: '{{featurePath}}/basic.feature',
      scenario_featureName: 'Basic',
      scenario_getLabel: 'run a skipped test',
      scenario_isOutline: false,
      scenario_result: 'skipped',
      scenario_scenarioName: 'run a skipped test',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../sibling steps folder 3/{{featurePath}}/basic.feature/run a skipped test',
      test_label: 'run a skipped test',
      test_parent: '.../sibling steps folder 3/{{featurePath}}/basic.feature',
      test_uri: '.../sibling steps folder 3/{{featurePath}}/basic.feature'
    }),

    new TestResult({
      scenario_featureName: 'Another',
      scenario_featureFileRelativePath: '{{featurePath}}/more/another.feature',
      scenario_getLabel: 'run a successful test',
      scenario_isOutline: false,
      scenario_result: 'passed',
      scenario_scenarioName: 'run a successful test',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../sibling steps folder 3/{{featurePath}}/more/another.feature/run a successful test',
      test_label: 'run a successful test',
      test_parent: '.../sibling steps folder 3/{{featurePath}}/more/another.feature',
      test_uri: '.../sibling steps folder 3/{{featurePath}}/more/another.feature'
    }),

    new TestResult({
      scenario_featureName: 'Another',
      scenario_featureFileRelativePath: '{{featurePath}}/more/another.feature',
      scenario_getLabel: 'run a failing test',
      scenario_isOutline: false,
      scenario_result: 'failed',
      scenario_scenarioName: 'run a failing test',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../sibling steps folder 3/{{featurePath}}/more/another.feature/run a failing test',
      test_label: 'run a failing test',
      test_parent: '.../sibling steps folder 3/{{featurePath}}/more/another.feature',
      test_uri: '.../sibling steps folder 3/{{featurePath}}/more/another.feature'
    }),

    new TestResult({
      scenario_featureName: 'Another',
      scenario_featureFileRelativePath: '{{featurePath}}/more/another.feature',
      scenario_getLabel: 'run a skipped test',
      scenario_isOutline: false,
      scenario_result: 'skipped',
      scenario_scenarioName: 'run a skipped test',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../sibling steps folder 3/{{featurePath}}/more/another.feature/run a skipped test',
      test_label: 'run a skipped test',
      test_parent: '.../sibling steps folder 3/{{featurePath}}/more/another.feature',
      test_uri: '.../sibling steps folder 3/{{featurePath}}/more/another.feature'
    }),

  ];


  const wkspSettings = config.workspaceSettings[wkspUri.path];
  return applyTestConfiguration(wkspSettings, expectedResults);
}


