import * as vscode from 'vscode';
import { Configuration } from "../../configuration";
import { WkspParseCounts } from "../../parsers/fileParser";
import { TestResult, applyTestConfiguration } from "../suite-shared/expectedResults.helpers";

export function getExpectedCounts(wkspUri: vscode.Uri, config: Configuration): WkspParseCounts {
  const testCount = getExpectedResultsForTag1Expression(wkspUri, config).length;
  return {
    tests: { nodeCount: 13, testCount: testCount },
    featureFilesExceptEmptyOrCommentedOut: 1, stepFilesExceptEmptyOrCommentedOut: 1,
    stepFileStepsExceptCommentedOut: 9, featureFileStepsExceptCommentedOut: 41, stepMappings: 41
  };
}



export const getExpectedResultsForNoTagExpression = (wkspUri: vscode.Uri, config: Configuration): TestResult[] => {

  const expectedResults: TestResult[] = [
    new TestResult({
      scenario_featureFileRelativePath: '{{featurePath}}/tags_and_vars.feature',
      scenario_featureName: 'Tags and Vars',
      scenario_getLabel: '@tag1 - success',
      scenario_isOutline: false,
      scenario_result: 'passed',
      scenario_scenarioName: '@tag1 - success',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../run profiles/{{featurePath}}/tags_and_vars.feature/@tag1 - success',
      test_label: '@tag1 - success',
      test_parent: '.../run profiles/{{featurePath}}/tags_and_vars.feature',
      test_uri: '.../run profiles/{{featurePath}}/tags_and_vars.feature'
    }),

    new TestResult({
      scenario_featureFileRelativePath: '{{featurePath}}/tags_and_vars.feature',
      scenario_featureName: 'Tags and Vars',
      scenario_getLabel: '@tag1 - fail',
      scenario_isOutline: false,
      scenario_result: 'failed',
      scenario_scenarioName: '@tag1 - fail',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../run profiles/{{featurePath}}/tags_and_vars.feature/@tag1 - fail',
      test_label: '@tag1 - fail',
      test_parent: '.../run profiles/{{featurePath}}/tags_and_vars.feature',
      test_uri: '.../run profiles/{{featurePath}}/tags_and_vars.feature'
    }),

    new TestResult({
      scenario_featureFileRelativePath: '{{featurePath}}/tags_and_vars.feature',
      scenario_featureName: 'Tags and Vars',
      scenario_getLabel: '@tag1 @skip - skip always',
      scenario_isOutline: false,
      scenario_result: 'skipped',
      scenario_scenarioName: '@tag1 @skip - skip always',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../run profiles/{{featurePath}}/tags_and_vars.feature/@tag1 @skip - skip always',
      test_label: '@tag1 @skip - skip always',
      test_parent: '.../run profiles/{{featurePath}}/tags_and_vars.feature',
      test_uri: '.../run profiles/{{featurePath}}/tags_and_vars.feature'
    }),

    new TestResult({
      scenario_featureFileRelativePath: '{{featurePath}}/tags_and_vars.feature',
      scenario_featureName: 'Tags and Vars',
      scenario_getLabel: '@tag1 - success - envvar checks',
      scenario_isOutline: false,
      scenario_result: 'passed',
      scenario_scenarioName: '@tag1 - success - envvar checks',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../run profiles/{{featurePath}}/tags_and_vars.feature/@tag1 - success - envvar checks',
      test_label: '@tag1 - success - envvar checks',
      test_parent: '.../run profiles/{{featurePath}}/tags_and_vars.feature',
      test_uri: '.../run profiles/{{featurePath}}/tags_and_vars.feature'
    }),

    new TestResult({
      scenario_featureFileRelativePath: '{{featurePath}}/tags_and_vars.feature',
      scenario_featureName: 'Tags and Vars',
      scenario_getLabel: '@tag2 - success',
      scenario_isOutline: false,
      scenario_result: 'passed',
      scenario_scenarioName: '@tag2 - success',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../run profiles/{{featurePath}}/tags_and_vars.feature/@tag2 - success',
      test_label: '@tag2 - success',
      test_parent: '.../run profiles/{{featurePath}}/tags_and_vars.feature',
      test_uri: '.../run profiles/{{featurePath}}/tags_and_vars.feature'
    }),

    new TestResult({
      scenario_featureFileRelativePath: '{{featurePath}}/tags_and_vars.feature',
      scenario_featureName: 'Tags and Vars',
      scenario_getLabel: '@tag2 - fail',
      scenario_isOutline: false,
      scenario_result: 'failed',
      scenario_scenarioName: '@tag2 - fail',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../run profiles/{{featurePath}}/tags_and_vars.feature/@tag2 - fail',
      test_label: '@tag2 - fail',
      test_parent: '.../run profiles/{{featurePath}}/tags_and_vars.feature',
      test_uri: '.../run profiles/{{featurePath}}/tags_and_vars.feature'
    }),

    new TestResult({
      scenario_featureFileRelativePath: '{{featurePath}}/tags_and_vars.feature',
      scenario_featureName: 'Tags and Vars',
      scenario_getLabel: '@tag2 @skip - skip always',
      scenario_isOutline: false,
      scenario_result: 'skipped',
      scenario_scenarioName: '@tag2 @skip - skip always',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../run profiles/{{featurePath}}/tags_and_vars.feature/@tag2 @skip - skip always',
      test_label: '@tag2 @skip - skip always',
      test_parent: '.../run profiles/{{featurePath}}/tags_and_vars.feature',
      test_uri: '.../run profiles/{{featurePath}}/tags_and_vars.feature'
    }),

    new TestResult({
      scenario_featureFileRelativePath: '{{featurePath}}/tags_and_vars.feature',
      scenario_featureName: 'Tags and Vars',
      scenario_getLabel: '@tag2 - success - envvar checks',
      scenario_isOutline: false,
      scenario_result: 'passed',
      scenario_scenarioName: '@tag2 - success - envvar checks',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../run profiles/{{featurePath}}/tags_and_vars.feature/@tag2 - success - envvar checks',
      test_label: '@tag2 - success - envvar checks',
      test_parent: '.../run profiles/{{featurePath}}/tags_and_vars.feature',
      test_uri: '.../run profiles/{{featurePath}}/tags_and_vars.feature'
    }),

    new TestResult({
      scenario_featureFileRelativePath: '{{featurePath}}/tags_and_vars.feature',
      scenario_featureName: 'Tags and Vars',
      scenario_getLabel: 'untagged - success',
      scenario_isOutline: false,
      scenario_result: 'passed',
      scenario_scenarioName: 'untagged - success',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../run profiles/{{featurePath}}/tags_and_vars.feature/untagged - success',
      test_label: 'untagged - success',
      test_parent: '.../run profiles/{{featurePath}}/tags_and_vars.feature',
      test_uri: '.../run profiles/{{featurePath}}/tags_and_vars.feature'
    }),

    new TestResult({
      scenario_featureFileRelativePath: '{{featurePath}}/tags_and_vars.feature',
      scenario_featureName: 'Tags and Vars',
      scenario_getLabel: 'untagged - fail',
      scenario_isOutline: false,
      scenario_result: 'failed',
      scenario_scenarioName: 'untagged - fail',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../run profiles/{{featurePath}}/tags_and_vars.feature/untagged - fail',
      test_label: 'untagged - fail',
      test_parent: '.../run profiles/{{featurePath}}/tags_and_vars.feature',
      test_uri: '.../run profiles/{{featurePath}}/tags_and_vars.feature'
    }),

    new TestResult({
      scenario_featureFileRelativePath: '{{featurePath}}/tags_and_vars.feature',
      scenario_featureName: 'Tags and Vars',
      scenario_getLabel: 'untagged - @skip - skip always',
      scenario_isOutline: false,
      scenario_result: 'skipped',
      scenario_scenarioName: 'untagged - @skip - skip always',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../run profiles/{{featurePath}}/tags_and_vars.feature/untagged - @skip - skip always',
      test_label: 'untagged - @skip - skip always',
      test_parent: '.../run profiles/{{featurePath}}/tags_and_vars.feature',
      test_uri: '.../run profiles/{{featurePath}}/tags_and_vars.feature'
    }),

    new TestResult({
      scenario_featureFileRelativePath: '{{featurePath}}/tags_and_vars.feature',
      scenario_featureName: 'Tags and Vars',
      scenario_getLabel: 'untagged - success - envvar checks',
      scenario_isOutline: false,
      scenario_result: 'passed',
      scenario_scenarioName: 'untagged - success - envvar checks',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../run profiles/{{featurePath}}/tags_and_vars.feature/untagged - success - envvar checks',
      test_label: 'untagged - success - envvar checks',
      test_parent: '.../run profiles/{{featurePath}}/tags_and_vars.feature',
      test_uri: '.../run profiles/{{featurePath}}/tags_and_vars.feature'
    }),

  ];


  const wkspSettings = config.workspaceSettings[wkspUri.path];
  return applyTestConfiguration(wkspSettings, expectedResults);
}


export const getExpectedResultsForTag1Expression = (wkspUri: vscode.Uri, config: Configuration): TestResult[] => {

  const expectedResults: TestResult[] = [
    new TestResult({
      scenario_featureFileRelativePath: '{{featurePath}}/tags_and_vars.feature',
      scenario_featureName: 'Tags and Vars',
      scenario_getLabel: '@tag1 - success',
      scenario_isOutline: false,
      scenario_result: 'passed',
      scenario_scenarioName: '@tag1 - success',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../run profiles/{{featurePath}}/tags_and_vars.feature/@tag1 - success',
      test_label: '@tag1 - success',
      test_parent: '.../run profiles/{{featurePath}}/tags_and_vars.feature',
      test_uri: '.../run profiles/{{featurePath}}/tags_and_vars.feature'
    }),

    new TestResult({
      scenario_featureFileRelativePath: '{{featurePath}}/tags_and_vars.feature',
      scenario_featureName: 'Tags and Vars',
      scenario_getLabel: '@tag1 - fail',
      scenario_isOutline: false,
      scenario_result: 'failed',
      scenario_scenarioName: '@tag1 - fail',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../run profiles/{{featurePath}}/tags_and_vars.feature/@tag1 - fail',
      test_label: '@tag1 - fail',
      test_parent: '.../run profiles/{{featurePath}}/tags_and_vars.feature',
      test_uri: '.../run profiles/{{featurePath}}/tags_and_vars.feature'
    }),

    new TestResult({
      scenario_featureFileRelativePath: '{{featurePath}}/tags_and_vars.feature',
      scenario_featureName: 'Tags and Vars',
      scenario_getLabel: '@tag1 @skip - skip always',
      scenario_isOutline: false,
      scenario_result: 'skipped',
      scenario_scenarioName: '@tag1 @skip - skip always',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../run profiles/{{featurePath}}/tags_and_vars.feature/@tag1 @skip - skip always',
      test_label: '@tag1 @skip - skip always',
      test_parent: '.../run profiles/{{featurePath}}/tags_and_vars.feature',
      test_uri: '.../run profiles/{{featurePath}}/tags_and_vars.feature'
    }),

    new TestResult({
      scenario_featureFileRelativePath: '{{featurePath}}/tags_and_vars.feature',
      scenario_featureName: 'Tags and Vars',
      scenario_getLabel: '@tag1 - success - envvar checks',
      scenario_isOutline: false,
      scenario_result: 'passed',
      scenario_scenarioName: '@tag1 - success - envvar checks',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../run profiles/{{featurePath}}/tags_and_vars.feature/@tag1 - success - envvar checks',
      test_label: '@tag1 - success - envvar checks',
      test_parent: '.../run profiles/{{featurePath}}/tags_and_vars.feature',
      test_uri: '.../run profiles/{{featurePath}}/tags_and_vars.feature'
    }),

    new TestResult({
      scenario_featureFileRelativePath: '{{featurePath}}/tags_and_vars.feature',
      scenario_featureName: 'Tags and Vars',
      scenario_getLabel: '@tag2 - success',
      scenario_isOutline: false,
      scenario_result: 'skipped',
      scenario_scenarioName: '@tag2 - success',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../run profiles/{{featurePath}}/tags_and_vars.feature/@tag2 - success',
      test_label: '@tag2 - success',
      test_parent: '.../run profiles/{{featurePath}}/tags_and_vars.feature',
      test_uri: '.../run profiles/{{featurePath}}/tags_and_vars.feature'
    }),

    new TestResult({
      scenario_featureFileRelativePath: '{{featurePath}}/tags_and_vars.feature',
      scenario_featureName: 'Tags and Vars',
      scenario_getLabel: '@tag2 - fail',
      scenario_isOutline: false,
      scenario_result: 'skipped',
      scenario_scenarioName: '@tag2 - fail',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../run profiles/{{featurePath}}/tags_and_vars.feature/@tag2 - fail',
      test_label: '@tag2 - fail',
      test_parent: '.../run profiles/{{featurePath}}/tags_and_vars.feature',
      test_uri: '.../run profiles/{{featurePath}}/tags_and_vars.feature'
    }),

    new TestResult({
      scenario_featureFileRelativePath: '{{featurePath}}/tags_and_vars.feature',
      scenario_featureName: 'Tags and Vars',
      scenario_getLabel: '@tag2 @skip - skip always',
      scenario_isOutline: false,
      scenario_result: 'skipped',
      scenario_scenarioName: '@tag2 @skip - skip always',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../run profiles/{{featurePath}}/tags_and_vars.feature/@tag2 @skip - skip always',
      test_label: '@tag2 @skip - skip always',
      test_parent: '.../run profiles/{{featurePath}}/tags_and_vars.feature',
      test_uri: '.../run profiles/{{featurePath}}/tags_and_vars.feature'
    }),

    new TestResult({
      scenario_featureFileRelativePath: '{{featurePath}}/tags_and_vars.feature',
      scenario_featureName: 'Tags and Vars',
      scenario_getLabel: '@tag2 - success - envvar checks',
      scenario_isOutline: false,
      scenario_result: 'skipped',
      scenario_scenarioName: '@tag2 - success - envvar checks',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../run profiles/{{featurePath}}/tags_and_vars.feature/@tag2 - success - envvar checks',
      test_label: '@tag2 - success - envvar checks',
      test_parent: '.../run profiles/{{featurePath}}/tags_and_vars.feature',
      test_uri: '.../run profiles/{{featurePath}}/tags_and_vars.feature'
    }),

    new TestResult({
      scenario_featureFileRelativePath: '{{featurePath}}/tags_and_vars.feature',
      scenario_featureName: 'Tags and Vars',
      scenario_getLabel: 'untagged - success',
      scenario_isOutline: false,
      scenario_result: 'skipped',
      scenario_scenarioName: 'untagged - success',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../run profiles/{{featurePath}}/tags_and_vars.feature/untagged - success',
      test_label: 'untagged - success',
      test_parent: '.../run profiles/{{featurePath}}/tags_and_vars.feature',
      test_uri: '.../run profiles/{{featurePath}}/tags_and_vars.feature'
    }),

    new TestResult({
      scenario_featureFileRelativePath: '{{featurePath}}/tags_and_vars.feature',
      scenario_featureName: 'Tags and Vars',
      scenario_getLabel: 'untagged - fail',
      scenario_isOutline: false,
      scenario_result: 'skipped',
      scenario_scenarioName: 'untagged - fail',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../run profiles/{{featurePath}}/tags_and_vars.feature/untagged - fail',
      test_label: 'untagged - fail',
      test_parent: '.../run profiles/{{featurePath}}/tags_and_vars.feature',
      test_uri: '.../run profiles/{{featurePath}}/tags_and_vars.feature'
    }),

    new TestResult({
      scenario_featureFileRelativePath: '{{featurePath}}/tags_and_vars.feature',
      scenario_featureName: 'Tags and Vars',
      scenario_getLabel: 'untagged - @skip - skip always',
      scenario_isOutline: false,
      scenario_result: 'skipped',
      scenario_scenarioName: 'untagged - @skip - skip always',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../run profiles/{{featurePath}}/tags_and_vars.feature/untagged - @skip - skip always',
      test_label: 'untagged - @skip - skip always',
      test_parent: '.../run profiles/{{featurePath}}/tags_and_vars.feature',
      test_uri: '.../run profiles/{{featurePath}}/tags_and_vars.feature'
    }),

    new TestResult({
      scenario_featureFileRelativePath: '{{featurePath}}/tags_and_vars.feature',
      scenario_featureName: 'Tags and Vars',
      scenario_getLabel: 'untagged - success - envvar checks',
      scenario_isOutline: false,
      scenario_result: 'skipped',
      scenario_scenarioName: 'untagged - success - envvar checks',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../run profiles/{{featurePath}}/tags_and_vars.feature/untagged - success - envvar checks',
      test_label: 'untagged - success - envvar checks',
      test_parent: '.../run profiles/{{featurePath}}/tags_and_vars.feature',
      test_uri: '.../run profiles/{{featurePath}}/tags_and_vars.feature'
    }),

  ];


  const wkspSettings = config.workspaceSettings[wkspUri.path];
  return applyTestConfiguration(wkspSettings, expectedResults);
}


export const getExpectedResultsForTag2Expression = (wkspUri: vscode.Uri, config: Configuration): TestResult[] => {

  const expectedResults: TestResult[] = [
    new TestResult({
      scenario_featureFileRelativePath: '{{featurePath}}/tags_and_vars.feature',
      scenario_featureName: 'Tags and Vars',
      scenario_getLabel: '@tag1 - success',
      scenario_isOutline: false,
      scenario_result: 'skipped',
      scenario_scenarioName: '@tag1 - success',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../run profiles/{{featurePath}}/tags_and_vars.feature/@tag1 - success',
      test_label: '@tag1 - success',
      test_parent: '.../run profiles/{{featurePath}}/tags_and_vars.feature',
      test_uri: '.../run profiles/{{featurePath}}/tags_and_vars.feature'
    }),

    new TestResult({
      scenario_featureFileRelativePath: '{{featurePath}}/tags_and_vars.feature',
      scenario_featureName: 'Tags and Vars',
      scenario_getLabel: '@tag1 - fail',
      scenario_isOutline: false,
      scenario_result: 'skipped',
      scenario_scenarioName: '@tag1 - fail',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../run profiles/{{featurePath}}/tags_and_vars.feature/@tag1 - fail',
      test_label: '@tag1 - fail',
      test_parent: '.../run profiles/{{featurePath}}/tags_and_vars.feature',
      test_uri: '.../run profiles/{{featurePath}}/tags_and_vars.feature'
    }),

    new TestResult({
      scenario_featureFileRelativePath: '{{featurePath}}/tags_and_vars.feature',
      scenario_featureName: 'Tags and Vars',
      scenario_getLabel: '@tag1 @skip - skip always',
      scenario_isOutline: false,
      scenario_result: 'skipped',
      scenario_scenarioName: '@tag1 @skip - skip always',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../run profiles/{{featurePath}}/tags_and_vars.feature/@tag1 @skip - skip always',
      test_label: '@tag1 @skip - skip always',
      test_parent: '.../run profiles/{{featurePath}}/tags_and_vars.feature',
      test_uri: '.../run profiles/{{featurePath}}/tags_and_vars.feature'
    }),

    new TestResult({
      scenario_featureFileRelativePath: '{{featurePath}}/tags_and_vars.feature',
      scenario_featureName: 'Tags and Vars',
      scenario_getLabel: '@tag1 - success - envvar checks',
      scenario_isOutline: false,
      scenario_result: 'skipped',
      scenario_scenarioName: '@tag1 - success - envvar checks',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../run profiles/{{featurePath}}/tags_and_vars.feature/@tag1 - success - envvar checks',
      test_label: '@tag1 - success - envvar checks',
      test_parent: '.../run profiles/{{featurePath}}/tags_and_vars.feature',
      test_uri: '.../run profiles/{{featurePath}}/tags_and_vars.feature'
    }),

    new TestResult({
      scenario_featureFileRelativePath: '{{featurePath}}/tags_and_vars.feature',
      scenario_featureName: 'Tags and Vars',
      scenario_getLabel: '@tag2 - success',
      scenario_isOutline: false,
      scenario_result: 'passed',
      scenario_scenarioName: '@tag2 - success',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../run profiles/{{featurePath}}/tags_and_vars.feature/@tag2 - success',
      test_label: '@tag2 - success',
      test_parent: '.../run profiles/{{featurePath}}/tags_and_vars.feature',
      test_uri: '.../run profiles/{{featurePath}}/tags_and_vars.feature'
    }),

    new TestResult({
      scenario_featureFileRelativePath: '{{featurePath}}/tags_and_vars.feature',
      scenario_featureName: 'Tags and Vars',
      scenario_getLabel: '@tag2 - fail',
      scenario_isOutline: false,
      scenario_result: 'failed',
      scenario_scenarioName: '@tag2 - fail',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../run profiles/{{featurePath}}/tags_and_vars.feature/@tag2 - fail',
      test_label: '@tag2 - fail',
      test_parent: '.../run profiles/{{featurePath}}/tags_and_vars.feature',
      test_uri: '.../run profiles/{{featurePath}}/tags_and_vars.feature'
    }),

    new TestResult({
      scenario_featureFileRelativePath: '{{featurePath}}/tags_and_vars.feature',
      scenario_featureName: 'Tags and Vars',
      scenario_getLabel: '@tag2 @skip - skip always',
      scenario_isOutline: false,
      scenario_result: 'skipped',
      scenario_scenarioName: '@tag2 @skip - skip always',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../run profiles/{{featurePath}}/tags_and_vars.feature/@tag2 @skip - skip always',
      test_label: '@tag2 @skip - skip always',
      test_parent: '.../run profiles/{{featurePath}}/tags_and_vars.feature',
      test_uri: '.../run profiles/{{featurePath}}/tags_and_vars.feature'
    }),

    new TestResult({
      scenario_featureFileRelativePath: '{{featurePath}}/tags_and_vars.feature',
      scenario_featureName: 'Tags and Vars',
      scenario_getLabel: '@tag2 - success - envvar checks',
      scenario_isOutline: false,
      scenario_result: 'passed',
      scenario_scenarioName: '@tag2 - success - envvar checks',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../run profiles/{{featurePath}}/tags_and_vars.feature/@tag2 - success - envvar checks',
      test_label: '@tag2 - success - envvar checks',
      test_parent: '.../run profiles/{{featurePath}}/tags_and_vars.feature',
      test_uri: '.../run profiles/{{featurePath}}/tags_and_vars.feature'
    }),

    new TestResult({
      scenario_featureFileRelativePath: '{{featurePath}}/tags_and_vars.feature',
      scenario_featureName: 'Tags and Vars',
      scenario_getLabel: 'untagged - success',
      scenario_isOutline: false,
      scenario_result: 'skipped',
      scenario_scenarioName: 'untagged - success',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../run profiles/{{featurePath}}/tags_and_vars.feature/untagged - success',
      test_label: 'untagged - success',
      test_parent: '.../run profiles/{{featurePath}}/tags_and_vars.feature',
      test_uri: '.../run profiles/{{featurePath}}/tags_and_vars.feature'
    }),

    new TestResult({
      scenario_featureFileRelativePath: '{{featurePath}}/tags_and_vars.feature',
      scenario_featureName: 'Tags and Vars',
      scenario_getLabel: 'untagged - fail',
      scenario_isOutline: false,
      scenario_result: 'skipped',
      scenario_scenarioName: 'untagged - fail',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../run profiles/{{featurePath}}/tags_and_vars.feature/untagged - fail',
      test_label: 'untagged - fail',
      test_parent: '.../run profiles/{{featurePath}}/tags_and_vars.feature',
      test_uri: '.../run profiles/{{featurePath}}/tags_and_vars.feature'
    }),

    new TestResult({
      scenario_featureFileRelativePath: '{{featurePath}}/tags_and_vars.feature',
      scenario_featureName: 'Tags and Vars',
      scenario_getLabel: 'untagged - @skip - skip always',
      scenario_isOutline: false,
      scenario_result: 'skipped',
      scenario_scenarioName: 'untagged - @skip - skip always',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../run profiles/{{featurePath}}/tags_and_vars.feature/untagged - @skip - skip always',
      test_label: 'untagged - @skip - skip always',
      test_parent: '.../run profiles/{{featurePath}}/tags_and_vars.feature',
      test_uri: '.../run profiles/{{featurePath}}/tags_and_vars.feature'
    }),

    new TestResult({
      scenario_featureFileRelativePath: '{{featurePath}}/tags_and_vars.feature',
      scenario_featureName: 'Tags and Vars',
      scenario_getLabel: 'untagged - success - envvar checks',
      scenario_isOutline: false,
      scenario_result: 'skipped',
      scenario_scenarioName: 'untagged - success - envvar checks',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../run profiles/{{featurePath}}/tags_and_vars.feature/untagged - success - envvar checks',
      test_label: 'untagged - success - envvar checks',
      test_parent: '.../run profiles/{{featurePath}}/tags_and_vars.feature',
      test_uri: '.../run profiles/{{featurePath}}/tags_and_vars.feature'
    }),

  ];


  const wkspSettings = config.workspaceSettings[wkspUri.path];
  return applyTestConfiguration(wkspSettings, expectedResults);
}


export const getExpectedResultsForTag1Or2Expression = (wkspUri: vscode.Uri, config: Configuration): TestResult[] => {

  const expectedResults: TestResult[] = [
    new TestResult({
      scenario_featureFileRelativePath: '{{featurePath}}/tags_and_vars.feature',
      scenario_featureName: 'Tags and Vars',
      scenario_getLabel: '@tag1 - success',
      scenario_isOutline: false,
      scenario_result: 'passed',
      scenario_scenarioName: '@tag1 - success',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../run profiles/{{featurePath}}/tags_and_vars.feature/@tag1 - success',
      test_label: '@tag1 - success',
      test_parent: '.../run profiles/{{featurePath}}/tags_and_vars.feature',
      test_uri: '.../run profiles/{{featurePath}}/tags_and_vars.feature'
    }),

    new TestResult({
      scenario_featureFileRelativePath: '{{featurePath}}/tags_and_vars.feature',
      scenario_featureName: 'Tags and Vars',
      scenario_getLabel: '@tag1 - fail',
      scenario_isOutline: false,
      scenario_result: 'failed',
      scenario_scenarioName: '@tag1 - fail',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../run profiles/{{featurePath}}/tags_and_vars.feature/@tag1 - fail',
      test_label: '@tag1 - fail',
      test_parent: '.../run profiles/{{featurePath}}/tags_and_vars.feature',
      test_uri: '.../run profiles/{{featurePath}}/tags_and_vars.feature'
    }),

    new TestResult({
      scenario_featureFileRelativePath: '{{featurePath}}/tags_and_vars.feature',
      scenario_featureName: 'Tags and Vars',
      scenario_getLabel: '@tag1 @skip - skip always',
      scenario_isOutline: false,
      scenario_result: 'skipped',
      scenario_scenarioName: '@tag1 @skip - skip always',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../run profiles/{{featurePath}}/tags_and_vars.feature/@tag1 @skip - skip always',
      test_label: '@tag1 @skip - skip always',
      test_parent: '.../run profiles/{{featurePath}}/tags_and_vars.feature',
      test_uri: '.../run profiles/{{featurePath}}/tags_and_vars.feature'
    }),

    new TestResult({
      scenario_featureFileRelativePath: '{{featurePath}}/tags_and_vars.feature',
      scenario_featureName: 'Tags and Vars',
      scenario_getLabel: '@tag1 - success - envvar checks',
      scenario_isOutline: false,
      scenario_result: 'passed',
      scenario_scenarioName: '@tag1 - success - envvar checks',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../run profiles/{{featurePath}}/tags_and_vars.feature/@tag1 - success - envvar checks',
      test_label: '@tag1 - success - envvar checks',
      test_parent: '.../run profiles/{{featurePath}}/tags_and_vars.feature',
      test_uri: '.../run profiles/{{featurePath}}/tags_and_vars.feature'
    }),

    new TestResult({
      scenario_featureFileRelativePath: '{{featurePath}}/tags_and_vars.feature',
      scenario_featureName: 'Tags and Vars',
      scenario_getLabel: '@tag2 - success',
      scenario_isOutline: false,
      scenario_result: 'passed',
      scenario_scenarioName: '@tag2 - success',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../run profiles/{{featurePath}}/tags_and_vars.feature/@tag2 - success',
      test_label: '@tag2 - success',
      test_parent: '.../run profiles/{{featurePath}}/tags_and_vars.feature',
      test_uri: '.../run profiles/{{featurePath}}/tags_and_vars.feature'
    }),

    new TestResult({
      scenario_featureFileRelativePath: '{{featurePath}}/tags_and_vars.feature',
      scenario_featureName: 'Tags and Vars',
      scenario_getLabel: '@tag2 - fail',
      scenario_isOutline: false,
      scenario_result: 'failed',
      scenario_scenarioName: '@tag2 - fail',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../run profiles/{{featurePath}}/tags_and_vars.feature/@tag2 - fail',
      test_label: '@tag2 - fail',
      test_parent: '.../run profiles/{{featurePath}}/tags_and_vars.feature',
      test_uri: '.../run profiles/{{featurePath}}/tags_and_vars.feature'
    }),

    new TestResult({
      scenario_featureFileRelativePath: '{{featurePath}}/tags_and_vars.feature',
      scenario_featureName: 'Tags and Vars',
      scenario_getLabel: '@tag2 @skip - skip always',
      scenario_isOutline: false,
      scenario_result: 'skipped',
      scenario_scenarioName: '@tag2 @skip - skip always',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../run profiles/{{featurePath}}/tags_and_vars.feature/@tag2 @skip - skip always',
      test_label: '@tag2 @skip - skip always',
      test_parent: '.../run profiles/{{featurePath}}/tags_and_vars.feature',
      test_uri: '.../run profiles/{{featurePath}}/tags_and_vars.feature'
    }),

    new TestResult({
      scenario_featureFileRelativePath: '{{featurePath}}/tags_and_vars.feature',
      scenario_featureName: 'Tags and Vars',
      scenario_getLabel: '@tag2 - success - envvar checks',
      scenario_isOutline: false,
      scenario_result: 'passed',
      scenario_scenarioName: '@tag2 - success - envvar checks',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../run profiles/{{featurePath}}/tags_and_vars.feature/@tag2 - success - envvar checks',
      test_label: '@tag2 - success - envvar checks',
      test_parent: '.../run profiles/{{featurePath}}/tags_and_vars.feature',
      test_uri: '.../run profiles/{{featurePath}}/tags_and_vars.feature'
    }),

    new TestResult({
      scenario_featureFileRelativePath: '{{featurePath}}/tags_and_vars.feature',
      scenario_featureName: 'Tags and Vars',
      scenario_getLabel: 'untagged - success',
      scenario_isOutline: false,
      scenario_result: 'skipped',
      scenario_scenarioName: 'untagged - success',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../run profiles/{{featurePath}}/tags_and_vars.feature/untagged - success',
      test_label: 'untagged - success',
      test_parent: '.../run profiles/{{featurePath}}/tags_and_vars.feature',
      test_uri: '.../run profiles/{{featurePath}}/tags_and_vars.feature'
    }),

    new TestResult({
      scenario_featureFileRelativePath: '{{featurePath}}/tags_and_vars.feature',
      scenario_featureName: 'Tags and Vars',
      scenario_getLabel: 'untagged - fail',
      scenario_isOutline: false,
      scenario_result: 'skipped',
      scenario_scenarioName: 'untagged - fail',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../run profiles/{{featurePath}}/tags_and_vars.feature/untagged - fail',
      test_label: 'untagged - fail',
      test_parent: '.../run profiles/{{featurePath}}/tags_and_vars.feature',
      test_uri: '.../run profiles/{{featurePath}}/tags_and_vars.feature'
    }),

    new TestResult({
      scenario_featureFileRelativePath: '{{featurePath}}/tags_and_vars.feature',
      scenario_featureName: 'Tags and Vars',
      scenario_getLabel: 'untagged - @skip - skip always',
      scenario_isOutline: false,
      scenario_result: 'skipped',
      scenario_scenarioName: 'untagged - @skip - skip always',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../run profiles/{{featurePath}}/tags_and_vars.feature/untagged - @skip - skip always',
      test_label: 'untagged - @skip - skip always',
      test_parent: '.../run profiles/{{featurePath}}/tags_and_vars.feature',
      test_uri: '.../run profiles/{{featurePath}}/tags_and_vars.feature'
    }),

    new TestResult({
      scenario_featureFileRelativePath: '{{featurePath}}/tags_and_vars.feature',
      scenario_featureName: 'Tags and Vars',
      scenario_getLabel: 'untagged - success - envvar checks',
      scenario_isOutline: false,
      scenario_result: 'skipped',
      scenario_scenarioName: 'untagged - success - envvar checks',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../run profiles/{{featurePath}}/tags_and_vars.feature/untagged - success - envvar checks',
      test_label: 'untagged - success - envvar checks',
      test_parent: '.../run profiles/{{featurePath}}/tags_and_vars.feature',
      test_uri: '.../run profiles/{{featurePath}}/tags_and_vars.feature'
    }),

  ];


  const wkspSettings = config.workspaceSettings[wkspUri.path];
  return applyTestConfiguration(wkspSettings, expectedResults);
}


