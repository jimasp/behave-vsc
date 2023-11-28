import * as vscode from 'vscode';
import { Configuration } from "../../configuration";
import { ProjParseCounts } from "../../parsers/fileParser";
import { TestResult, applyTestConfiguration } from "../suite-helpers/expectedResults.helpers";

export function getExpectedCounts(projUri: vscode.Uri, config: Configuration): ProjParseCounts {
  const testCount = getExpectedResults(projUri, config).length;
  return {
    tests: { nodeCount: 12, testCount: testCount },
    featureFilesExceptEmptyOrCommentedOut: 3, stepFilesExceptEmptyOrCommentedOut: 3,
    stepFileStepsExceptCommentedOut: 13, featureFileStepsExceptCommentedOut: 28, stepMappings: 28
  };
}

export const getExpectedResults = (projUri: vscode.Uri, config: Configuration): TestResult[] => {

  const expectedResults: TestResult[] = [
    new TestResult({
      scenario_featureFileRelativePath: '{{featurePath}}/basic_no_skip.feature',
      scenario_featureName: 'Basic',
      scenario_getLabel: 'run a successful test',
      scenario_isOutline: false,
      scenario_result: 'passed',
      scenario_scenarioName: 'run a successful test',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../sibling steps folder 1/{{featurePath}}/basic_no_skip.feature/run a successful test',
      test_label: 'run a successful test',
      test_parent: '.../sibling steps folder 1/{{featurePath}}/basic_no_skip.feature',
      test_uri: '.../sibling steps folder 1/{{featurePath}}/basic_no_skip.feature'
    }),

    new TestResult({
      scenario_featureFileRelativePath: '{{featurePath}}/basic_no_skip.feature',
      scenario_featureName: 'Basic',
      scenario_getLabel: 'run a failing test',
      scenario_isOutline: false,
      scenario_result: 'failed',
      scenario_scenarioName: 'run a failing test',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../sibling steps folder 1/{{featurePath}}/basic_no_skip.feature/run a failing test',
      test_label: 'run a failing test',
      test_parent: '.../sibling steps folder 1/{{featurePath}}/basic_no_skip.feature',
      test_uri: '.../sibling steps folder 1/{{featurePath}}/basic_no_skip.feature'
    }),

    new TestResult({
      scenario_featureName: 'Mixed outline',
      scenario_featureFileRelativePath: '{{featurePath}}/outline_mixed_no_skip.feature',
      scenario_getLabel: 'Blenders Success <thing>',
      scenario_isOutline: true,
      scenario_result: 'passed',
      scenario_scenarioName: 'Blenders Success <thing>',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../sibling steps folder 1/{{featurePath}}/outline_mixed_no_skip.feature/Blenders Success <thing>',
      test_label: 'Blenders Success <thing>',
      test_parent: '.../sibling steps folder 1/{{featurePath}}/outline_mixed_no_skip.feature',
      test_uri: '.../sibling steps folder 1/{{featurePath}}/outline_mixed_no_skip.feature'
    }),

    new TestResult({
      scenario_featureName: 'Mixed outline',
      scenario_featureFileRelativePath: '{{featurePath}}/outline_mixed_no_skip.feature',
      scenario_getLabel: 'Blenders Fail <thing>',
      scenario_isOutline: true,
      scenario_result: 'failed',
      scenario_scenarioName: 'Blenders Fail <thing>',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../sibling steps folder 1/{{featurePath}}/outline_mixed_no_skip.feature/Blenders Fail <thing>',
      test_label: 'Blenders Fail <thing>',
      test_parent: '.../sibling steps folder 1/{{featurePath}}/outline_mixed_no_skip.feature',
      test_uri: '.../sibling steps folder 1/{{featurePath}}/outline_mixed_no_skip.feature'
    }),

    new TestResult({
      scenario_featureFileRelativePath: 'behave tests/some tests/outline_mixed_no_skip.feature',
      scenario_featureName: 'Mixed outline',
      scenario_getLabel: 'Blenders Success paramless',
      scenario_isOutline: true,
      scenario_result: 'passed',
      scenario_scenarioName: 'Blenders Success paramless',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../sibling steps folder 1/{{featurePath}}/outline_mixed_no_skip.feature/Blenders Success paramless',
      test_label: 'Blenders Success paramless',
      test_parent: '.../sibling steps folder 1/{{featurePath}}/outline_mixed_no_skip.feature',
      test_uri: '.../sibling steps folder 1/{{featurePath}}/outline_mixed_no_skip.feature'
    }),

    new TestResult({
      scenario_featureName: 'Mixed outline',
      scenario_featureFileRelativePath: '{{featurePath}}/outline_mixed_no_skip.feature',
      scenario_getLabel: 'Blenders Fail paramless',
      scenario_isOutline: true,
      scenario_result: 'failed',
      scenario_scenarioName: 'Blenders Fail paramless',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../sibling steps folder 1/{{featurePath}}/outline_mixed_no_skip.feature/Blenders Fail paramless',
      test_label: 'Blenders Fail paramless',
      test_parent: '.../sibling steps folder 1/{{featurePath}}/outline_mixed_no_skip.feature',
      test_uri: '.../sibling steps folder 1/{{featurePath}}/outline_mixed_no_skip.feature'
    }),

    new TestResult({
      scenario_featureName: 'Mixed outline',
      scenario_featureFileRelativePath: '{{featurePath}}/outline_mixed_no_skip.feature',
      scenario_getLabel: 'Blenders Success "<thing>"',
      scenario_isOutline: true,
      scenario_result: 'passed',
      scenario_scenarioName: 'Blenders Success "<thing>"',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../sibling steps folder 1/{{featurePath}}/outline_mixed_no_skip.feature/Blenders Success "<thing>"',
      test_label: 'Blenders Success "<thing>"',
      test_parent: '.../sibling steps folder 1/{{featurePath}}/outline_mixed_no_skip.feature',
      test_uri: '.../sibling steps folder 1/{{featurePath}}/outline_mixed_no_skip.feature'
    }),

    new TestResult({
      scenario_featureName: 'Table feature',
      scenario_featureFileRelativePath: '{{featurePath}}/table.feature',
      scenario_getLabel: 'Use a table (success)',
      scenario_isOutline: false,
      scenario_result: 'passed',
      scenario_scenarioName: 'Use a table (success)',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../sibling steps folder 1/{{featurePath}}/table.feature/Use a table (success)',
      test_label: 'Use a table (success)',
      test_parent: '.../sibling steps folder 1/{{featurePath}}/table.feature',
      test_uri: '.../sibling steps folder 1/{{featurePath}}/table.feature'
    }),

    new TestResult({
      scenario_featureName: 'Table feature',
      scenario_featureFileRelativePath: '{{featurePath}}/table.feature',
      scenario_getLabel: 'Use a table (fail)',
      scenario_isOutline: false,
      scenario_result: 'failed',
      scenario_scenarioName: 'Use a table (fail)',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../sibling steps folder 1/{{featurePath}}/table.feature/Use a table (fail)',
      test_label: 'Use a table (fail)',
      test_parent: '.../sibling steps folder 1/{{featurePath}}/table.feature',
      test_uri: '.../sibling steps folder 1/{{featurePath}}/table.feature'
    }),


  ];


  const projSettings = config.projectSettings[projUri.path];
  return applyTestConfiguration(projSettings, expectedResults);
}


