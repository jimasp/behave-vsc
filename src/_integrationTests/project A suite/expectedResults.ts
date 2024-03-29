import * as vscode from 'vscode';
import { Configuration } from "../../configuration";
import { WkspParseCounts } from "../../parsers/fileParser";
import { TestResult, applyTestConfiguration } from "../suite-shared/expectedResults.helpers";


export function getExpectedCounts(wkspUri: vscode.Uri, config: Configuration): WkspParseCounts {
  const testCount = getExpectedResults(wkspUri, config).length;
  return {
    tests: { nodeCount: 70, testCount: testCount },
    featureFilesExceptEmptyOrCommentedOut: 24, stepFilesExceptEmptyOrCommentedOut: 5,
    stepFileStepsExceptCommentedOut: 16,
    featureFileStepsExceptCommentedOut: 116, stepMappings: 115 // (1 diff = "When we have a missing step")
  };
}

export function getExpectedResults(wkspUri: vscode.Uri, config: Configuration): TestResult[] {

  const expectedResults: TestResult[] = [
    new TestResult({
      scenario_featureName: 'Basic',
      scenario_featureFileRelativePath: '{{featurePath}}/group1_features/basic.feature',
      scenario_getLabel: 'run a successful test',
      scenario_isOutline: false,
      scenario_result: 'passed',
      scenario_scenarioName: 'run a successful test',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../project A/{{featurePath}}/group1_features/basic.feature/run a successful test',
      test_label: 'run a successful test',
      test_parent: '.../project A/{{featurePath}}/group1_features/basic.feature',
      test_uri: '.../project A/{{featurePath}}/group1_features/basic.feature'
    }),

    new TestResult({
      scenario_featureName: 'Basic',
      scenario_featureFileRelativePath: '{{featurePath}}/group1_features/basic.feature',
      scenario_getLabel: 'run a slow test for async testing',
      scenario_isOutline: false,
      scenario_result: 'passed',
      scenario_scenarioName: 'run a slow test for async testing',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../project A/{{featurePath}}/group1_features/basic.feature/run a slow test for async testing',
      test_label: 'run a slow test for async testing',
      test_parent: '.../project A/{{featurePath}}/group1_features/basic.feature',
      test_uri: '.../project A/{{featurePath}}/group1_features/basic.feature'
    }),

    new TestResult({
      scenario_featureName: 'Basic',
      scenario_featureFileRelativePath: '{{featurePath}}/group1_features/basic.feature',
      scenario_getLabel: 'run another slow test for async testing',
      scenario_isOutline: false,
      scenario_result: 'passed',
      scenario_scenarioName: 'run another slow test for async testing',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../project A/{{featurePath}}/group1_features/basic.feature/run another slow test for async testing',
      test_label: 'run another slow test for async testing',
      test_parent: '.../project A/{{featurePath}}/group1_features/basic.feature',
      test_uri: '.../project A/{{featurePath}}/group1_features/basic.feature'
    }),

    new TestResult({
      scenario_featureName: 'Basic',
      scenario_featureFileRelativePath: '{{featurePath}}/group1_features/basic.feature',
      scenario_getLabel: 'run a failing test',
      scenario_isOutline: false,
      scenario_result: 'failed',
      scenario_scenarioName: 'run a failing test',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../project A/{{featurePath}}/group1_features/basic.feature/run a failing test',
      test_label: 'run a failing test',
      test_parent: '.../project A/{{featurePath}}/group1_features/basic.feature',
      test_uri: '.../project A/{{featurePath}}/group1_features/basic.feature'
    }),

    new TestResult({
      scenario_featureName: 'Basic',
      scenario_featureFileRelativePath: '{{featurePath}}/group1_features/basic.feature',
      scenario_getLabel: 'run another successful test',
      scenario_isOutline: false,
      scenario_result: 'passed',
      scenario_scenarioName: 'run another successful test',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../project A/{{featurePath}}/group1_features/basic.feature/run another successful test',
      test_label: 'run another successful test',
      test_parent: '.../project A/{{featurePath}}/group1_features/basic.feature',
      test_uri: '.../project A/{{featurePath}}/group1_features/basic.feature'
    }),

    new TestResult({
      scenario_featureName: 'Basic',
      scenario_featureFileRelativePath: '{{featurePath}}/group1_features/basic.feature',
      scenario_getLabel: 'run a test with a missing steps',
      scenario_isOutline: false,
      scenario_result: "failed",
      scenario_scenarioName: 'run a test with a missing steps',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../project A/{{featurePath}}/group1_features/basic.feature/run a test with a missing steps',
      test_label: 'run a test with a missing steps',
      test_parent: '.../project A/{{featurePath}}/group1_features/basic.feature',
      test_uri: '.../project A/{{featurePath}}/group1_features/basic.feature'
    }),

    new TestResult({
      scenario_featureName: 'Basic',
      scenario_featureFileRelativePath: '{{featurePath}}/group1_features/basic.feature',
      scenario_getLabel: 'run a skipped test',
      scenario_isOutline: false,
      scenario_result: 'skipped',
      scenario_scenarioName: 'run a skipped test',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../project A/{{featurePath}}/group1_features/basic.feature/run a skipped test',
      test_label: 'run a skipped test',
      test_parent: '.../project A/{{featurePath}}/group1_features/basic.feature',
      test_uri: '.../project A/{{featurePath}}/group1_features/basic.feature'
    }),

    new TestResult({
      scenario_featureFileRelativePath: 'behave tests/some tests/group1_features/basic.feature',
      scenario_featureName: 'Basic',
      scenario_getLabel: 'succeed with a long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long name',
      scenario_isOutline: false,
      scenario_result: 'passed',
      scenario_scenarioName: 'succeed with a long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long name',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../project A/behave tests/some tests/group1_features/basic.feature/succeed with a long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long name',
      test_label: 'succeed with a long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long name',
      test_parent: '.../project A/behave tests/some tests/group1_features/basic.feature',
      test_uri: '.../project A/behave tests/some tests/group1_features/basic.feature'
    }),

    new TestResult({
      scenario_featureFileRelativePath: 'behave tests/some tests/group2_features/skipped.feature',
      scenario_featureName: 'skipped feature',
      scenario_getLabel: 'scenario that will be skipped',
      scenario_isOutline: false,
      scenario_result: 'skipped',
      scenario_scenarioName: 'scenario that will be skipped',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../project A/behave tests/some tests/group2_features/skipped.feature/scenario that will be skipped',
      test_label: 'scenario that will be skipped',
      test_parent: '.../project A/behave tests/some tests/group2_features/skipped.feature',
      test_uri: '.../project A/behave tests/some tests/group2_features/skipped.feature'
    }),

    new TestResult({
      scenario_featureName: 'Containing /[.*+?^${}()|[\\]\\ regex chars',
      scenario_featureFileRelativePath: '{{featurePath}}/group2_features/contains_regexchars.feature',
      scenario_getLabel: 'run a successful scenario containing a characters test /[.*+?^${}()|[\\]\\',
      scenario_isOutline: false,
      scenario_result: 'passed',
      scenario_scenarioName: 'run a successful scenario containing a characters test /[.*+?^${}()|[\\]\\',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../project A/{{featurePath}}/group2_features/contains_regexchars.feature/run a successful scenario containing a characters test /[.*+?^${}()|[\\]\\',
      test_label: 'run a successful scenario containing a characters test /[.*+?^${}()|[\\]\\',
      test_parent: '.../project A/{{featurePath}}/group2_features/contains_regexchars.feature',
      test_uri: '.../project A/{{featurePath}}/group2_features/contains_regexchars.feature'
    }),

    new TestResult({
      scenario_featureName: 'Duplicate',
      scenario_featureFileRelativePath: '{{featurePath}}/group2_features/duplicate.feature',
      scenario_getLabel: 'run a test',
      scenario_isOutline: false,
      scenario_result: 'failed',
      scenario_scenarioName: 'run a test',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../project A/{{featurePath}}/group2_features/duplicate.feature/run a test',
      test_label: 'run a test',
      test_parent: '.../project A/{{featurePath}}/group2_features/duplicate.feature',
      test_uri: '.../project A/{{featurePath}}/group2_features/duplicate.feature'
    }),

    new TestResult({
      scenario_featureName: 'Table feature',
      scenario_featureFileRelativePath: '{{featurePath}}/group1_features/table.feature',
      scenario_getLabel: 'Use a table (success)',
      scenario_isOutline: false,
      scenario_result: 'passed',
      scenario_scenarioName: 'Use a table (success)',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../project A/{{featurePath}}/group1_features/table.feature/Use a table (success)',
      test_label: 'Use a table (success)',
      test_parent: '.../project A/{{featurePath}}/group1_features/table.feature',
      test_uri: '.../project A/{{featurePath}}/group1_features/table.feature'
    }),

    new TestResult({
      scenario_featureName: 'Table feature',
      scenario_featureFileRelativePath: '{{featurePath}}/group1_features/table.feature',
      scenario_getLabel: 'Use a table (fail)',
      scenario_isOutline: false,
      scenario_result: 'failed',
      scenario_scenarioName: 'Use a table (fail)',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../project A/{{featurePath}}/group1_features/table.feature/Use a table (fail)',
      test_label: 'Use a table (fail)',
      test_parent: '.../project A/{{featurePath}}/group1_features/table.feature',
      test_uri: '.../project A/{{featurePath}}/group1_features/table.feature'
    }),

    new TestResult({
      scenario_featureName: 'Text block',
      scenario_featureFileRelativePath: '{{featurePath}}/group1_features/textblock.feature',
      scenario_getLabel: 'run a successful textblock test',
      scenario_isOutline: false,
      scenario_result: 'passed',
      scenario_scenarioName: 'run a successful textblock test',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../project A/{{featurePath}}/group1_features/textblock.feature/run a successful textblock test',
      test_label: 'run a successful textblock test',
      test_parent: '.../project A/{{featurePath}}/group1_features/textblock.feature',
      test_uri: '.../project A/{{featurePath}}/group1_features/textblock.feature'
    }),
    new TestResult({
      scenario_featureName: 'Text block',
      scenario_featureFileRelativePath: '{{featurePath}}/group1_features/textblock.feature',
      scenario_getLabel: 'run a failing textblock test',
      scenario_isOutline: false,
      scenario_result: 'failed',
      scenario_scenarioName: 'run a failing textblock test',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../project A/{{featurePath}}/group1_features/textblock.feature/run a failing textblock test',
      test_label: 'run a failing textblock test',
      test_parent: '.../project A/{{featurePath}}/group1_features/textblock.feature',
      test_uri: '.../project A/{{featurePath}}/group1_features/textblock.feature'
    }),

    new TestResult({
      scenario_featureName: 'Mixed outline',
      scenario_featureFileRelativePath: '{{featurePath}}/group1_features/outline_mixed.feature',
      scenario_getLabel: 'Blenders Success <thing>',
      scenario_isOutline: true,
      scenario_result: 'passed',
      scenario_scenarioName: 'Blenders Success <thing>',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../project A/{{featurePath}}/group1_features/outline_mixed.feature/Blenders Success <thing>',
      test_label: 'Blenders Success <thing>',
      test_parent: '.../project A/{{featurePath}}/group1_features/outline_mixed.feature',
      test_uri: '.../project A/{{featurePath}}/group1_features/outline_mixed.feature'
    }),

    new TestResult({
      scenario_featureName: 'Mixed outline',
      scenario_featureFileRelativePath: '{{featurePath}}/group1_features/outline_mixed.feature',
      scenario_getLabel: 'Blenders Fail <thing>',
      scenario_isOutline: true,
      scenario_result: 'failed',
      scenario_scenarioName: 'Blenders Fail <thing>',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../project A/{{featurePath}}/group1_features/outline_mixed.feature/Blenders Fail <thing>',
      test_label: 'Blenders Fail <thing>',
      test_parent: '.../project A/{{featurePath}}/group1_features/outline_mixed.feature',
      test_uri: '.../project A/{{featurePath}}/group1_features/outline_mixed.feature'
    }),

    new TestResult({
      scenario_featureName: 'Mixed outline',
      scenario_featureFileRelativePath: '{{featurePath}}/group1_features/outline_mixed.feature',
      scenario_getLabel: 'Blenders Skip <thing>',
      scenario_isOutline: true,
      scenario_result: 'skipped',
      scenario_scenarioName: 'Blenders Skip <thing>',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../project A/{{featurePath}}/group1_features/outline_mixed.feature/Blenders Skip <thing>',
      test_label: 'Blenders Skip <thing>',
      test_parent: '.../project A/{{featurePath}}/group1_features/outline_mixed.feature',
      test_uri: '.../project A/{{featurePath}}/group1_features/outline_mixed.feature'
    }),

    new TestResult({
      scenario_featureFileRelativePath: 'behave tests/some tests/group1_features/outline_mixed.feature',
      scenario_featureName: 'Mixed outline',
      scenario_getLabel: 'Blenders Success paramless',
      scenario_isOutline: true,
      scenario_result: 'passed',
      scenario_scenarioName: 'Blenders Success paramless',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../project A/behave tests/some tests/group1_features/outline_mixed.feature/Blenders Success paramless',
      test_label: 'Blenders Success paramless',
      test_parent: '.../project A/behave tests/some tests/group1_features/outline_mixed.feature',
      test_uri: '.../project A/behave tests/some tests/group1_features/outline_mixed.feature'
    }),

    new TestResult({
      scenario_featureName: 'Mixed outline',
      scenario_featureFileRelativePath: '{{featurePath}}/group1_features/outline_mixed.feature',
      scenario_getLabel: 'Blenders Fail paramless',
      scenario_isOutline: true,
      scenario_result: 'failed',
      scenario_scenarioName: 'Blenders Fail paramless',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../project A/{{featurePath}}/group1_features/outline_mixed.feature/Blenders Fail paramless',
      test_label: 'Blenders Fail paramless',
      test_parent: '.../project A/{{featurePath}}/group1_features/outline_mixed.feature',
      test_uri: '.../project A/{{featurePath}}/group1_features/outline_mixed.feature'
    }),

    new TestResult({
      scenario_featureName: 'Mixed outline',
      scenario_featureFileRelativePath: '{{featurePath}}/group1_features/outline_mixed.feature',
      scenario_getLabel: 'Blenders Success "<thing>"',
      scenario_isOutline: true,
      scenario_result: 'passed',
      scenario_scenarioName: 'Blenders Success "<thing>"',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../project A/{{featurePath}}/group1_features/outline_mixed.feature/Blenders Success "<thing>"',
      test_label: 'Blenders Success "<thing>"',
      test_parent: '.../project A/{{featurePath}}/group1_features/outline_mixed.feature',
      test_uri: '.../project A/{{featurePath}}/group1_features/outline_mixed.feature'
    }),

    new TestResult({
      scenario_featureName: 'Duplicate',
      scenario_featureFileRelativePath: '{{featurePath}}/group1_features/duplicate.feature',
      scenario_getLabel: 'run a test',
      scenario_isOutline: false,
      scenario_result: 'failed',
      scenario_scenarioName: 'run a test',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../project A/{{featurePath}}/group1_features/duplicate.feature/run a test',
      test_label: 'run a test',
      test_parent: '.../project A/{{featurePath}}/group1_features/duplicate.feature',
      test_uri: '.../project A/{{featurePath}}/group1_features/duplicate.feature'
    }),

    new TestResult({
      scenario_featureName: 'Outline success',
      scenario_featureFileRelativePath: '{{featurePath}}/group1_features/outline_success.feature',
      scenario_getLabel: 'Blend Success',
      scenario_isOutline: true,
      scenario_result: 'passed',
      scenario_scenarioName: 'Blend Success',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../project A/{{featurePath}}/group1_features/outline_success.feature/Blend Success',
      test_label: 'Blend Success',
      test_parent: '.../project A/{{featurePath}}/group1_features/outline_success.feature',
      test_uri: '.../project A/{{featurePath}}/group1_features/outline_success.feature'
    }),

    new TestResult({
      scenario_featureName: 'Outline success',
      scenario_featureFileRelativePath: '{{featurePath}}/group1_features/outline_success.feature',
      scenario_getLabel: 'Blend Success 2',
      scenario_isOutline: true,
      scenario_result: 'passed',
      scenario_scenarioName: 'Blend Success 2',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../project A/{{featurePath}}/group1_features/outline_success.feature/Blend Success 2',
      test_label: 'Blend Success 2',
      test_parent: '.../project A/{{featurePath}}/group1_features/outline_success.feature',
      test_uri: '.../project A/{{featurePath}}/group1_features/outline_success.feature'
    }),

    new TestResult({
      scenario_featureFileRelativePath: '{{featurePath}}/duplicate.feature',
      scenario_featureName: 'Duplicate',
      scenario_getLabel: 'run a test',
      scenario_isOutline: false,
      scenario_result: 'passed',
      scenario_scenarioName: 'run a test',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../project A/{{featurePath}}/duplicate.feature/run a test',
      test_label: 'run a test',
      test_parent: '.../project A/{{featurePath}}/duplicate.feature',
      test_uri: '.../project A/{{featurePath}}/duplicate.feature',
    }),

    new TestResult({
      scenario_featureFileRelativePath: 'behave tests/some tests/duplicate_fail.feature',
      scenario_featureName: 'Duplicate',
      scenario_getLabel: 'run a test',
      scenario_isOutline: false,
      scenario_result: 'failed',
      scenario_scenarioName: 'run a test',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../project A/behave tests/some tests/duplicate_fail.feature/run a test',
      test_label: 'run a test',
      test_parent: '.../project A/behave tests/some tests/duplicate_fail.feature',
      test_uri: '.../project A/behave tests/some tests/duplicate_fail.feature'
    }),

    new TestResult({
      scenario_featureFileRelativePath: 'behave tests/some tests/group2_features/envvars.feature',
      scenario_featureName: 'EnvVars',
      scenario_getLabel: 'run an successful envvars test',
      scenario_isOutline: false,
      scenario_result: 'passed',
      scenario_scenarioName: 'run an successful envvars test',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../project A/behave tests/some tests/group2_features/envvars.feature/run an successful envvars test',
      test_label: 'run an successful envvars test',
      test_parent: '.../project A/behave tests/some tests/group2_features/envvars.feature',
      test_uri: '.../project A/behave tests/some tests/group2_features/envvars.feature'
    }),

    new TestResult({
      scenario_featureFileRelativePath: 'behave tests/some tests/group2_features/step_exception.feature',
      scenario_featureName: 'Bad step',
      scenario_getLabel: 'step with exception should show failure message',
      scenario_isOutline: false,
      scenario_result: 'failed',
      scenario_scenarioName: 'step with exception should show failure message',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../project A/behave tests/some tests/group2_features/step_exception.feature/step with exception should show failure message',
      test_label: 'step with exception should show failure message',
      test_parent: '.../project A/behave tests/some tests/group2_features/step_exception.feature',
      test_uri: '.../project A/behave tests/some tests/group2_features/step_exception.feature'
    }),


    new TestResult({
      scenario_featureFileRelativePath: 'behave tests/some tests/nested1/nested1.1.feature',
      scenario_featureName: 'Nested 1.1',
      scenario_getLabel: 'success',
      scenario_isOutline: false,
      scenario_result: 'passed',
      scenario_scenarioName: 'success',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../project A/behave tests/some tests/nested1/nested1.1.feature/success',
      test_label: 'success',
      test_parent: '.../project A/behave tests/some tests/nested1/nested1.1.feature',
      test_uri: '.../project A/behave tests/some tests/nested1/nested1.1.feature'
    }),

    new TestResult({
      scenario_featureFileRelativePath: 'behave tests/some tests/nested1/nested1.1.feature',
      scenario_featureName: 'Nested 1.1',
      scenario_getLabel: 'failure',
      scenario_isOutline: false,
      scenario_result: 'failed',
      scenario_scenarioName: 'failure',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../project A/behave tests/some tests/nested1/nested1.1.feature/failure',
      test_label: 'failure',
      test_parent: '.../project A/behave tests/some tests/nested1/nested1.1.feature',
      test_uri: '.../project A/behave tests/some tests/nested1/nested1.1.feature'
    }),

    new TestResult({
      scenario_featureFileRelativePath: 'behave tests/some tests/nested1/nested1.2.feature',
      scenario_featureName: 'Nested 1.2',
      scenario_getLabel: 'failure',
      scenario_isOutline: false,
      scenario_result: 'failed',
      scenario_scenarioName: 'failure',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../project A/behave tests/some tests/nested1/nested1.2.feature/failure',
      test_label: 'failure',
      test_parent: '.../project A/behave tests/some tests/nested1/nested1.2.feature',
      test_uri: '.../project A/behave tests/some tests/nested1/nested1.2.feature'
    }),

    new TestResult({
      scenario_featureFileRelativePath: 'behave tests/some tests/nested1/nested1.2.feature',
      scenario_featureName: 'Nested 1.2',
      scenario_getLabel: 'skipped',
      scenario_isOutline: false,
      scenario_result: 'skipped',
      scenario_scenarioName: 'skipped',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../project A/behave tests/some tests/nested1/nested1.2.feature/skipped',
      test_label: 'skipped',
      test_parent: '.../project A/behave tests/some tests/nested1/nested1.2.feature',
      test_uri: '.../project A/behave tests/some tests/nested1/nested1.2.feature'
    }),

    new TestResult({
      scenario_featureFileRelativePath: 'behave tests/some tests/nested1/nested1.3.feature',
      scenario_featureName: 'Nested 1.3',
      scenario_getLabel: 'skipped by feature',
      scenario_isOutline: false,
      scenario_result: 'skipped',
      scenario_scenarioName: 'skipped by feature',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../project A/behave tests/some tests/nested1/nested1.3.feature/skipped by feature',
      test_label: 'skipped by feature',
      test_parent: '.../project A/behave tests/some tests/nested1/nested1.3.feature',
      test_uri: '.../project A/behave tests/some tests/nested1/nested1.3.feature'
    }),

    new TestResult({
      scenario_featureFileRelativePath: 'behave tests/some tests/nested1/nested2/nested2.1.feature',
      scenario_featureName: 'Nested 2.1',
      scenario_getLabel: 'success',
      scenario_isOutline: false,
      scenario_result: 'passed',
      scenario_scenarioName: 'success',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../project A/behave tests/some tests/nested1/nested2/nested2.1.feature/success',
      test_label: 'success',
      test_parent: '.../project A/behave tests/some tests/nested1/nested2/nested2.1.feature',
      test_uri: '.../project A/behave tests/some tests/nested1/nested2/nested2.1.feature'
    }),

    new TestResult({
      scenario_featureFileRelativePath: 'behave tests/some tests/nested1/nested2/nested2.1.feature',
      scenario_featureName: 'Nested 2.1',
      scenario_getLabel: 'failure',
      scenario_isOutline: false,
      scenario_result: 'failed',
      scenario_scenarioName: 'failure',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../project A/behave tests/some tests/nested1/nested2/nested2.1.feature/failure',
      test_label: 'failure',
      test_parent: '.../project A/behave tests/some tests/nested1/nested2/nested2.1.feature',
      test_uri: '.../project A/behave tests/some tests/nested1/nested2/nested2.1.feature'
    }),

    new TestResult({
      scenario_featureFileRelativePath: 'behave tests/some tests/nested1/nested2/nested2.2.feature',
      scenario_featureName: 'Nested 2.2',
      scenario_getLabel: 'failure',
      scenario_isOutline: false,
      scenario_result: 'failed',
      scenario_scenarioName: 'failure',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../project A/behave tests/some tests/nested1/nested2/nested2.2.feature/failure',
      test_label: 'failure',
      test_parent: '.../project A/behave tests/some tests/nested1/nested2/nested2.2.feature',
      test_uri: '.../project A/behave tests/some tests/nested1/nested2/nested2.2.feature'
    }),

    new TestResult({
      scenario_featureFileRelativePath: 'behave tests/some tests/nested1/nested2/nested2.2.feature',
      scenario_featureName: 'Nested 2.2',
      scenario_getLabel: 'skipped',
      scenario_isOutline: false,
      scenario_result: 'skipped',
      scenario_scenarioName: 'skipped',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../project A/behave tests/some tests/nested1/nested2/nested2.2.feature/skipped',
      test_label: 'skipped',
      test_parent: '.../project A/behave tests/some tests/nested1/nested2/nested2.2.feature',
      test_uri: '.../project A/behave tests/some tests/nested1/nested2/nested2.2.feature'
    }),

    new TestResult({
      scenario_featureFileRelativePath: 'behave tests/some tests/nested1/nested2/nested2.3.feature',
      scenario_featureName: 'Nested 2.3',
      scenario_getLabel: 'skipped by feature',
      scenario_isOutline: false,
      scenario_result: 'skipped',
      scenario_scenarioName: 'skipped by feature',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../project A/behave tests/some tests/nested1/nested2/nested2.3.feature/skipped by feature',
      test_label: 'skipped by feature',
      test_parent: '.../project A/behave tests/some tests/nested1/nested2/nested2.3.feature',
      test_uri: '.../project A/behave tests/some tests/nested1/nested2/nested2.3.feature'
    }),

    new TestResult({
      scenario_featureFileRelativePath: 'behave tests/some tests/nested1/nested2/nested3/nested3.1.feature',
      scenario_featureName: 'Nested 3.1',
      scenario_getLabel: 'success',
      scenario_isOutline: false,
      scenario_result: 'passed',
      scenario_scenarioName: 'success',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../project A/behave tests/some tests/nested1/nested2/nested3/nested3.1.feature/success',
      test_label: 'success',
      test_parent: '.../project A/behave tests/some tests/nested1/nested2/nested3/nested3.1.feature',
      test_uri: '.../project A/behave tests/some tests/nested1/nested2/nested3/nested3.1.feature'
    }),

    new TestResult({
      scenario_featureFileRelativePath: 'behave tests/some tests/nested1/nested2/nested3/nested3.1.feature',
      scenario_featureName: 'Nested 3.1',
      scenario_getLabel: 'failure',
      scenario_isOutline: false,
      scenario_result: 'failed',
      scenario_scenarioName: 'failure',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../project A/behave tests/some tests/nested1/nested2/nested3/nested3.1.feature/failure',
      test_label: 'failure',
      test_parent: '.../project A/behave tests/some tests/nested1/nested2/nested3/nested3.1.feature',
      test_uri: '.../project A/behave tests/some tests/nested1/nested2/nested3/nested3.1.feature'
    }),

    new TestResult({
      scenario_featureFileRelativePath: 'behave tests/some tests/nested1/nested2/nested3/nested3.2.feature',
      scenario_featureName: 'Nested 3.2',
      scenario_getLabel: 'failure',
      scenario_isOutline: false,
      scenario_result: 'failed',
      scenario_scenarioName: 'failure',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../project A/behave tests/some tests/nested1/nested2/nested3/nested3.2.feature/failure',
      test_label: 'failure',
      test_parent: '.../project A/behave tests/some tests/nested1/nested2/nested3/nested3.2.feature',
      test_uri: '.../project A/behave tests/some tests/nested1/nested2/nested3/nested3.2.feature'
    }),

    new TestResult({
      scenario_featureFileRelativePath: 'behave tests/some tests/nested1/nested2/nested3/nested3.2.feature',
      scenario_featureName: 'Nested 3.2',
      scenario_getLabel: 'skipped',
      scenario_isOutline: false,
      scenario_result: 'skipped',
      scenario_scenarioName: 'skipped',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../project A/behave tests/some tests/nested1/nested2/nested3/nested3.2.feature/skipped',
      test_label: 'skipped',
      test_parent: '.../project A/behave tests/some tests/nested1/nested2/nested3/nested3.2.feature',
      test_uri: '.../project A/behave tests/some tests/nested1/nested2/nested3/nested3.2.feature'
    }),

    new TestResult({
      scenario_featureFileRelativePath: 'behave tests/some tests/nested1/nested2/nested3/nested3.3.feature',
      scenario_featureName: 'Nested 3.3',
      scenario_getLabel: 'skipped by feature',
      scenario_isOutline: false,
      scenario_result: 'skipped',
      scenario_scenarioName: 'skipped by feature',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../project A/behave tests/some tests/nested1/nested2/nested3/nested3.3.feature/skipped by feature',
      test_label: 'skipped by feature',
      test_parent: '.../project A/behave tests/some tests/nested1/nested2/nested3/nested3.3.feature',
      test_uri: '.../project A/behave tests/some tests/nested1/nested2/nested3/nested3.3.feature'
    }),

  ];


  const wkspSettings = config.workspaceSettings[wkspUri.path];
  return applyTestConfiguration(wkspSettings, expectedResults);
}