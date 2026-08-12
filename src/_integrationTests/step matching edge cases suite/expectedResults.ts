import * as vscode from 'vscode';
import { Configuration } from "../../configuration";
import { WkspParseCounts } from "../../parsers/fileParser";
import { TestResult, applyTestConfiguration } from "../suite-shared/expectedResults.helpers";

export function getExpectedCounts(wkspUri: vscode.Uri, config: Configuration): WkspParseCounts {
  const testCount = getExpectedResults(wkspUri, config).length;
  return {
    tests: { nodeCount: 7, testCount: testCount },
    featureFilesExceptEmptyOrCommentedOut: 1, stepFilesExceptEmptyOrCommentedOut: 6,
    stepFileStepsExceptCommentedOut: 7, featureFileStepsExceptCommentedOut: 7, stepMappings: 7
  };
}

export const getExpectedResults = (wkspUri: vscode.Uri, config: Configuration): TestResult[] => {

  const expectedResults: TestResult[] = [
    new TestResult({
      scenario_featureFileRelativePath: '{{featurePath}}/edge_cases.feature',
      scenario_featureName: 'Step matching edge cases',
      scenario_getLabel: 'multi-line decorator with a trailing comment on its closing paren',
      scenario_isOutline: false,
      scenario_result: 'passed',
      scenario_scenarioName: 'multi-line decorator with a trailing comment on its closing paren',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../step matching edge cases/{{featurePath}}/edge_cases.feature/multi-line decorator with a trailing comment on its closing paren',
      test_label: 'multi-line decorator with a trailing comment on its closing paren',
      test_parent: '.../step matching edge cases/{{featurePath}}/edge_cases.feature',
      test_uri: '.../step matching edge cases/{{featurePath}}/edge_cases.feature'
    }),

    new TestResult({
      scenario_featureFileRelativePath: '{{featurePath}}/edge_cases.feature',
      scenario_featureName: 'Step matching edge cases',
      scenario_getLabel: 'mixed quote implicit string concatenation',
      scenario_isOutline: false,
      scenario_result: 'passed',
      scenario_scenarioName: 'mixed quote implicit string concatenation',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../step matching edge cases/{{featurePath}}/edge_cases.feature/mixed quote implicit string concatenation',
      test_label: 'mixed quote implicit string concatenation',
      test_parent: '.../step matching edge cases/{{featurePath}}/edge_cases.feature',
      test_uri: '.../step matching edge cases/{{featurePath}}/edge_cases.feature'
    }),

    new TestResult({
      scenario_featureFileRelativePath: '{{featurePath}}/edge_cases.feature',
      scenario_featureName: 'Step matching edge cases',
      scenario_getLabel: 'trailing colon on the step definition itself',
      scenario_isOutline: false,
      scenario_result: 'passed',
      scenario_scenarioName: 'trailing colon on the step definition itself',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../step matching edge cases/{{featurePath}}/edge_cases.feature/trailing colon on the step definition itself',
      test_label: 'trailing colon on the step definition itself',
      test_parent: '.../step matching edge cases/{{featurePath}}/edge_cases.feature',
      test_uri: '.../step matching edge cases/{{featurePath}}/edge_cases.feature'
    }),

    new TestResult({
      scenario_featureFileRelativePath: '{{featurePath}}/edge_cases.feature',
      scenario_featureName: 'Step matching edge cases',
      scenario_getLabel: 'scenario outline placeholder matches a fixed word in the step definition',
      scenario_isOutline: true,
      scenario_result: 'passed',
      scenario_scenarioName: 'scenario outline placeholder matches a fixed word in the step definition',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../step matching edge cases/{{featurePath}}/edge_cases.feature/scenario outline placeholder matches a fixed word in the step definition',
      test_label: 'scenario outline placeholder matches a fixed word in the step definition',
      test_parent: '.../step matching edge cases/{{featurePath}}/edge_cases.feature',
      test_uri: '.../step matching edge cases/{{featurePath}}/edge_cases.feature'
    }),

    new TestResult({
      scenario_featureFileRelativePath: '{{featurePath}}/edge_cases.feature',
      scenario_featureName: 'Step matching edge cases',
      scenario_getLabel: 'docstring containing an and-prefixed line',
      scenario_isOutline: false,
      scenario_result: 'passed',
      scenario_scenarioName: 'docstring containing an and-prefixed line',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../step matching edge cases/{{featurePath}}/edge_cases.feature/docstring containing an and-prefixed line',
      test_label: 'docstring containing an and-prefixed line',
      test_parent: '.../step matching edge cases/{{featurePath}}/edge_cases.feature',
      test_uri: '.../step matching edge cases/{{featurePath}}/edge_cases.feature'
    }),

    new TestResult({
      scenario_featureFileRelativePath: '{{featurePath}}/edge_cases.feature',
      scenario_featureName: 'Step matching edge cases',
      scenario_getLabel: 'multi-line decorator whose literal ends in a quoted parameter',
      scenario_isOutline: false,
      scenario_result: 'passed',
      scenario_scenarioName: 'multi-line decorator whose literal ends in a quoted parameter',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../step matching edge cases/{{featurePath}}/edge_cases.feature/multi-line decorator whose literal ends in a quoted parameter',
      test_label: 'multi-line decorator whose literal ends in a quoted parameter',
      test_parent: '.../step matching edge cases/{{featurePath}}/edge_cases.feature',
      test_uri: '.../step matching edge cases/{{featurePath}}/edge_cases.feature'
    }),

  ];

  const wkspSettings = config.workspaceSettings[wkspUri.path];
  return applyTestConfiguration(wkspSettings, expectedResults);
}
