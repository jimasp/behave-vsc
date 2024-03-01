import { ProjParseCounts } from "../../../parsers/fileParser";
import { TestResult } from "../_common/types"

export function getExpectedCounts(): ProjParseCounts {
  const testCount = getExpectedResultsForNoTagsSpecified().length;
  return {
    tests: { nodeCount: 15, testCount: testCount },
    featureFilesExceptEmptyOrCommentedOut: 1, stepFilesExceptEmptyOrCommentedOut: 3,
    stepFileStepsExceptCommentedOut: 11, featureFileStepsExceptCommentedOut: 47, stepMappings: 47
  };
}



export const getExpectedResultsForNoTagsSpecified = (): TestResult[] => {

  const expectedResults: TestResult[] = [

    new TestResult({
      scenario_featureFileRelativePath: 'features/tags_and_vars.feature',
      scenario_featureName: 'Tags and Vars',
      scenario_getLabel: '@tag1 or @tag2 - success - stage check',
      scenario_isOutline: false,
      scenario_result: 'passed',
      scenario_scenarioName: '@tag1 or @tag2 - success - stage check',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../run profiles/features/tags_and_vars.feature/@tag1 or @tag2 - success - stage check',
      test_label: '@tag1 or @tag2 - success - stage check',
      test_parent: '.../run profiles/features/tags_and_vars.feature',
      test_uri: '.../run profiles/features/tags_and_vars.feature'
    }),

    new TestResult({
      scenario_featureFileRelativePath: 'features/tags_and_vars.feature',
      scenario_featureName: 'Tags and Vars',
      scenario_getLabel: '@tag1 - success',
      scenario_isOutline: false,
      scenario_result: 'passed',
      scenario_scenarioName: '@tag1 - success',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../run profiles/features/tags_and_vars.feature/@tag1 - success',
      test_label: '@tag1 - success',
      test_parent: '.../run profiles/features/tags_and_vars.feature',
      test_uri: '.../run profiles/features/tags_and_vars.feature'
    }),

    new TestResult({
      scenario_featureFileRelativePath: 'features/tags_and_vars.feature',
      scenario_featureName: 'Tags and Vars',
      scenario_getLabel: '@tag1 - fail',
      scenario_isOutline: false,
      scenario_result: 'failed',
      scenario_scenarioName: '@tag1 - fail',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../run profiles/features/tags_and_vars.feature/@tag1 - fail',
      test_label: '@tag1 - fail',
      test_parent: '.../run profiles/features/tags_and_vars.feature',
      test_uri: '.../run profiles/features/tags_and_vars.feature'
    }),

    new TestResult({
      scenario_featureFileRelativePath: 'features/tags_and_vars.feature',
      scenario_featureName: 'Tags and Vars',
      scenario_getLabel: '@tag1 @skip - skip',
      scenario_isOutline: false,
      scenario_result: 'skipped',
      scenario_scenarioName: '@tag1 @skip - skip',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../run profiles/features/tags_and_vars.feature/@tag1 @skip - skip',
      test_label: '@tag1 @skip - skip',
      test_parent: '.../run profiles/features/tags_and_vars.feature',
      test_uri: '.../run profiles/features/tags_and_vars.feature'
    }),

    new TestResult({
      scenario_featureFileRelativePath: 'features/tags_and_vars.feature',
      scenario_featureName: 'Tags and Vars',
      scenario_getLabel: '@tag1 - success - envvar checks',
      scenario_isOutline: false,
      scenario_result: 'passed',
      scenario_scenarioName: '@tag1 - success - envvar checks',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../run profiles/features/tags_and_vars.feature/@tag1 - success - envvar checks',
      test_label: '@tag1 - success - envvar checks',
      test_parent: '.../run profiles/features/tags_and_vars.feature',
      test_uri: '.../run profiles/features/tags_and_vars.feature'
    }),

    new TestResult({
      scenario_featureFileRelativePath: 'features/tags_and_vars.feature',
      scenario_featureName: 'Tags and Vars',
      scenario_getLabel: '@tag2 - success',
      scenario_isOutline: false,
      scenario_result: 'passed',
      scenario_scenarioName: '@tag2 - success',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../run profiles/features/tags_and_vars.feature/@tag2 - success',
      test_label: '@tag2 - success',
      test_parent: '.../run profiles/features/tags_and_vars.feature',
      test_uri: '.../run profiles/features/tags_and_vars.feature'
    }),

    new TestResult({
      scenario_featureFileRelativePath: 'features/tags_and_vars.feature',
      scenario_featureName: 'Tags and Vars',
      scenario_getLabel: '@tag2 - fail',
      scenario_isOutline: false,
      scenario_result: 'failed',
      scenario_scenarioName: '@tag2 - fail',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../run profiles/features/tags_and_vars.feature/@tag2 - fail',
      test_label: '@tag2 - fail',
      test_parent: '.../run profiles/features/tags_and_vars.feature',
      test_uri: '.../run profiles/features/tags_and_vars.feature'
    }),

    new TestResult({
      scenario_featureFileRelativePath: 'features/tags_and_vars.feature',
      scenario_featureName: 'Tags and Vars',
      scenario_getLabel: '@tag2 @skip - skip',
      scenario_isOutline: false,
      scenario_result: 'skipped',
      scenario_scenarioName: '@tag2 @skip - skip',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../run profiles/features/tags_and_vars.feature/@tag2 @skip - skip',
      test_label: '@tag2 @skip - skip',
      test_parent: '.../run profiles/features/tags_and_vars.feature',
      test_uri: '.../run profiles/features/tags_and_vars.feature'
    }),

    new TestResult({
      scenario_featureFileRelativePath: 'features/tags_and_vars.feature',
      scenario_featureName: 'Tags and Vars',
      scenario_getLabel: '@tag2 - success - envvar checks',
      scenario_isOutline: false,
      scenario_result: 'passed',
      scenario_scenarioName: '@tag2 - success - envvar checks',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../run profiles/features/tags_and_vars.feature/@tag2 - success - envvar checks',
      test_label: '@tag2 - success - envvar checks',
      test_parent: '.../run profiles/features/tags_and_vars.feature',
      test_uri: '.../run profiles/features/tags_and_vars.feature'
    }),

    new TestResult({
      scenario_featureFileRelativePath: 'features/tags_and_vars.feature',
      scenario_featureName: 'Tags and Vars',
      scenario_getLabel: 'untagged - success',
      scenario_isOutline: false,
      scenario_result: 'passed',
      scenario_scenarioName: 'untagged - success',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../run profiles/features/tags_and_vars.feature/untagged - success',
      test_label: 'untagged - success',
      test_parent: '.../run profiles/features/tags_and_vars.feature',
      test_uri: '.../run profiles/features/tags_and_vars.feature'
    }),

    new TestResult({
      scenario_featureFileRelativePath: 'features/tags_and_vars.feature',
      scenario_featureName: 'Tags and Vars',
      scenario_getLabel: 'untagged - fail',
      scenario_isOutline: false,
      scenario_result: 'failed',
      scenario_scenarioName: 'untagged - fail',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../run profiles/features/tags_and_vars.feature/untagged - fail',
      test_label: 'untagged - fail',
      test_parent: '.../run profiles/features/tags_and_vars.feature',
      test_uri: '.../run profiles/features/tags_and_vars.feature'
    }),

    new TestResult({
      scenario_featureFileRelativePath: 'features/tags_and_vars.feature',
      scenario_featureName: 'Tags and Vars',
      scenario_getLabel: 'untagged - @skip - skip',
      scenario_isOutline: false,
      scenario_result: 'skipped',
      scenario_scenarioName: 'untagged - @skip - skip',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../run profiles/features/tags_and_vars.feature/untagged - @skip - skip',
      test_label: 'untagged - @skip - skip',
      test_parent: '.../run profiles/features/tags_and_vars.feature',
      test_uri: '.../run profiles/features/tags_and_vars.feature'
    }),

    new TestResult({
      scenario_featureFileRelativePath: 'features/tags_and_vars.feature',
      scenario_featureName: 'Tags and Vars',
      scenario_getLabel: 'untagged - success - envvar checks',
      scenario_isOutline: false,
      scenario_result: 'passed',
      scenario_scenarioName: 'untagged - success - envvar checks',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../run profiles/features/tags_and_vars.feature/untagged - success - envvar checks',
      test_label: 'untagged - success - envvar checks',
      test_parent: '.../run profiles/features/tags_and_vars.feature',
      test_uri: '.../run profiles/features/tags_and_vars.feature'
    }),

    new TestResult({
      scenario_featureFileRelativePath: 'features/tags_and_vars.feature',
      scenario_featureName: 'Tags and Vars',
      scenario_getLabel: '@tag1 or @tag2 or @qu\'oted"tag - success - match check',
      scenario_isOutline: false,
      scenario_result: 'passed',
      scenario_scenarioName: '@tag1 or @tag2 or @qu\'oted"tag - success - match check',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../run profiles/features/tags_and_vars.feature/@tag1 or @tag2 or @qu\'oted"tag - success - match check',
      test_label: '@tag1 or @tag2 or @qu\'oted"tag - success - match check',
      test_parent: '.../run profiles/features/tags_and_vars.feature',
      test_uri: '.../run profiles/features/tags_and_vars.feature',
    }),

  ];



  return expectedResults;
}


export const getExpectedResultsForTag1RunProfile = (): TestResult[] => {

  const expectedResults: TestResult[] = [

    new TestResult({
      scenario_featureFileRelativePath: 'features/tags_and_vars.feature',
      scenario_featureName: 'Tags and Vars',
      scenario_getLabel: '@tag1 or @tag2 - success - stage check',
      scenario_isOutline: false,
      scenario_result: 'passed',
      scenario_scenarioName: '@tag1 or @tag2 - success - stage check',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../run profiles/features/tags_and_vars.feature/@tag1 or @tag2 - success - stage check',
      test_label: '@tag1 or @tag2 - success - stage check',
      test_parent: '.../run profiles/features/tags_and_vars.feature',
      test_uri: '.../run profiles/features/tags_and_vars.feature'
    }),

    new TestResult({
      scenario_featureFileRelativePath: 'features/tags_and_vars.feature',
      scenario_featureName: 'Tags and Vars',
      scenario_getLabel: '@tag1 - success',
      scenario_isOutline: false,
      scenario_result: 'passed',
      scenario_scenarioName: '@tag1 - success',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../run profiles/features/tags_and_vars.feature/@tag1 - success',
      test_label: '@tag1 - success',
      test_parent: '.../run profiles/features/tags_and_vars.feature',
      test_uri: '.../run profiles/features/tags_and_vars.feature'
    }),

    new TestResult({
      scenario_featureFileRelativePath: 'features/tags_and_vars.feature',
      scenario_featureName: 'Tags and Vars',
      scenario_getLabel: '@tag1 - fail',
      scenario_isOutline: false,
      scenario_result: 'failed',
      scenario_scenarioName: '@tag1 - fail',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../run profiles/features/tags_and_vars.feature/@tag1 - fail',
      test_label: '@tag1 - fail',
      test_parent: '.../run profiles/features/tags_and_vars.feature',
      test_uri: '.../run profiles/features/tags_and_vars.feature'
    }),

    new TestResult({
      scenario_featureFileRelativePath: 'features/tags_and_vars.feature',
      scenario_featureName: 'Tags and Vars',
      scenario_getLabel: '@tag1 @skip - skip',
      scenario_isOutline: false,
      scenario_result: 'skipped',
      scenario_scenarioName: '@tag1 @skip - skip',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../run profiles/features/tags_and_vars.feature/@tag1 @skip - skip',
      test_label: '@tag1 @skip - skip',
      test_parent: '.../run profiles/features/tags_and_vars.feature',
      test_uri: '.../run profiles/features/tags_and_vars.feature'
    }),

    new TestResult({
      scenario_featureFileRelativePath: 'features/tags_and_vars.feature',
      scenario_featureName: 'Tags and Vars',
      scenario_getLabel: '@tag1 - success - envvar checks',
      scenario_isOutline: false,
      scenario_result: 'passed',
      scenario_scenarioName: '@tag1 - success - envvar checks',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../run profiles/features/tags_and_vars.feature/@tag1 - success - envvar checks',
      test_label: '@tag1 - success - envvar checks',
      test_parent: '.../run profiles/features/tags_and_vars.feature',
      test_uri: '.../run profiles/features/tags_and_vars.feature'
    }),

    new TestResult({
      scenario_featureFileRelativePath: 'features/tags_and_vars.feature',
      scenario_featureName: 'Tags and Vars',
      scenario_getLabel: '@tag2 - success',
      scenario_isOutline: false,
      scenario_result: 'skipped',
      scenario_scenarioName: '@tag2 - success',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../run profiles/features/tags_and_vars.feature/@tag2 - success',
      test_label: '@tag2 - success',
      test_parent: '.../run profiles/features/tags_and_vars.feature',
      test_uri: '.../run profiles/features/tags_and_vars.feature'
    }),

    new TestResult({
      scenario_featureFileRelativePath: 'features/tags_and_vars.feature',
      scenario_featureName: 'Tags and Vars',
      scenario_getLabel: '@tag2 - fail',
      scenario_isOutline: false,
      scenario_result: 'skipped',
      scenario_scenarioName: '@tag2 - fail',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../run profiles/features/tags_and_vars.feature/@tag2 - fail',
      test_label: '@tag2 - fail',
      test_parent: '.../run profiles/features/tags_and_vars.feature',
      test_uri: '.../run profiles/features/tags_and_vars.feature'
    }),

    new TestResult({
      scenario_featureFileRelativePath: 'features/tags_and_vars.feature',
      scenario_featureName: 'Tags and Vars',
      scenario_getLabel: '@tag2 @skip - skip',
      scenario_isOutline: false,
      scenario_result: 'skipped',
      scenario_scenarioName: '@tag2 @skip - skip',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../run profiles/features/tags_and_vars.feature/@tag2 @skip - skip',
      test_label: '@tag2 @skip - skip',
      test_parent: '.../run profiles/features/tags_and_vars.feature',
      test_uri: '.../run profiles/features/tags_and_vars.feature'
    }),

    new TestResult({
      scenario_featureFileRelativePath: 'features/tags_and_vars.feature',
      scenario_featureName: 'Tags and Vars',
      scenario_getLabel: '@tag2 - success - envvar checks',
      scenario_isOutline: false,
      scenario_result: 'skipped',
      scenario_scenarioName: '@tag2 - success - envvar checks',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../run profiles/features/tags_and_vars.feature/@tag2 - success - envvar checks',
      test_label: '@tag2 - success - envvar checks',
      test_parent: '.../run profiles/features/tags_and_vars.feature',
      test_uri: '.../run profiles/features/tags_and_vars.feature'
    }),

    new TestResult({
      scenario_featureFileRelativePath: 'features/tags_and_vars.feature',
      scenario_featureName: 'Tags and Vars',
      scenario_getLabel: 'untagged - success',
      scenario_isOutline: false,
      scenario_result: 'skipped',
      scenario_scenarioName: 'untagged - success',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../run profiles/features/tags_and_vars.feature/untagged - success',
      test_label: 'untagged - success',
      test_parent: '.../run profiles/features/tags_and_vars.feature',
      test_uri: '.../run profiles/features/tags_and_vars.feature'
    }),

    new TestResult({
      scenario_featureFileRelativePath: 'features/tags_and_vars.feature',
      scenario_featureName: 'Tags and Vars',
      scenario_getLabel: 'untagged - fail',
      scenario_isOutline: false,
      scenario_result: 'skipped',
      scenario_scenarioName: 'untagged - fail',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../run profiles/features/tags_and_vars.feature/untagged - fail',
      test_label: 'untagged - fail',
      test_parent: '.../run profiles/features/tags_and_vars.feature',
      test_uri: '.../run profiles/features/tags_and_vars.feature'
    }),

    new TestResult({
      scenario_featureFileRelativePath: 'features/tags_and_vars.feature',
      scenario_featureName: 'Tags and Vars',
      scenario_getLabel: 'untagged - @skip - skip',
      scenario_isOutline: false,
      scenario_result: 'skipped',
      scenario_scenarioName: 'untagged - @skip - skip',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../run profiles/features/tags_and_vars.feature/untagged - @skip - skip',
      test_label: 'untagged - @skip - skip',
      test_parent: '.../run profiles/features/tags_and_vars.feature',
      test_uri: '.../run profiles/features/tags_and_vars.feature'
    }),

    new TestResult({
      scenario_featureFileRelativePath: 'features/tags_and_vars.feature',
      scenario_featureName: 'Tags and Vars',
      scenario_getLabel: 'untagged - success - envvar checks',
      scenario_isOutline: false,
      scenario_result: 'skipped',
      scenario_scenarioName: 'untagged - success - envvar checks',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../run profiles/features/tags_and_vars.feature/untagged - success - envvar checks',
      test_label: 'untagged - success - envvar checks',
      test_parent: '.../run profiles/features/tags_and_vars.feature',
      test_uri: '.../run profiles/features/tags_and_vars.feature'
    }),

    new TestResult({
      scenario_featureFileRelativePath: 'features/tags_and_vars.feature',
      scenario_featureName: 'Tags and Vars',
      scenario_getLabel: '@tag1 or @tag2 or @qu\'oted"tag - success - match check',
      scenario_isOutline: false,
      scenario_result: 'passed',
      scenario_scenarioName: '@tag1 or @tag2 or @qu\'oted"tag - success - match check',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../run profiles/features/tags_and_vars.feature/@tag1 or @tag2 or @qu\'oted"tag - success - match check',
      test_label: '@tag1 or @tag2 or @qu\'oted"tag - success - match check',
      test_parent: '.../run profiles/features/tags_and_vars.feature',
      test_uri: '.../run profiles/features/tags_and_vars.feature',
    }),

  ];



  return expectedResults;
}


export const getExpectedResultsForTag2RunProfile = (): TestResult[] => {

  const expectedResults: TestResult[] = [

    new TestResult({
      scenario_featureFileRelativePath: 'features/tags_and_vars.feature',
      scenario_featureName: 'Tags and Vars',
      scenario_getLabel: '@tag1 or @tag2 - success - stage check',
      scenario_isOutline: false,
      scenario_result: 'passed',
      scenario_scenarioName: '@tag1 or @tag2 - success - stage check',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../run profiles/features/tags_and_vars.feature/@tag1 or @tag2 - success - stage check',
      test_label: '@tag1 or @tag2 - success - stage check',
      test_parent: '.../run profiles/features/tags_and_vars.feature',
      test_uri: '.../run profiles/features/tags_and_vars.feature'
    }),

    new TestResult({
      scenario_featureFileRelativePath: 'features/tags_and_vars.feature',
      scenario_featureName: 'Tags and Vars',
      scenario_getLabel: '@tag1 - success',
      scenario_isOutline: false,
      scenario_result: 'skipped',
      scenario_scenarioName: '@tag1 - success',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../run profiles/features/tags_and_vars.feature/@tag1 - success',
      test_label: '@tag1 - success',
      test_parent: '.../run profiles/features/tags_and_vars.feature',
      test_uri: '.../run profiles/features/tags_and_vars.feature'
    }),

    new TestResult({
      scenario_featureFileRelativePath: 'features/tags_and_vars.feature',
      scenario_featureName: 'Tags and Vars',
      scenario_getLabel: '@tag1 - fail',
      scenario_isOutline: false,
      scenario_result: 'skipped',
      scenario_scenarioName: '@tag1 - fail',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../run profiles/features/tags_and_vars.feature/@tag1 - fail',
      test_label: '@tag1 - fail',
      test_parent: '.../run profiles/features/tags_and_vars.feature',
      test_uri: '.../run profiles/features/tags_and_vars.feature'
    }),

    new TestResult({
      scenario_featureFileRelativePath: 'features/tags_and_vars.feature',
      scenario_featureName: 'Tags and Vars',
      scenario_getLabel: '@tag1 @skip - skip',
      scenario_isOutline: false,
      scenario_result: 'skipped',
      scenario_scenarioName: '@tag1 @skip - skip',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../run profiles/features/tags_and_vars.feature/@tag1 @skip - skip',
      test_label: '@tag1 @skip - skip',
      test_parent: '.../run profiles/features/tags_and_vars.feature',
      test_uri: '.../run profiles/features/tags_and_vars.feature'
    }),

    new TestResult({
      scenario_featureFileRelativePath: 'features/tags_and_vars.feature',
      scenario_featureName: 'Tags and Vars',
      scenario_getLabel: '@tag1 - success - envvar checks',
      scenario_isOutline: false,
      scenario_result: 'skipped',
      scenario_scenarioName: '@tag1 - success - envvar checks',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../run profiles/features/tags_and_vars.feature/@tag1 - success - envvar checks',
      test_label: '@tag1 - success - envvar checks',
      test_parent: '.../run profiles/features/tags_and_vars.feature',
      test_uri: '.../run profiles/features/tags_and_vars.feature'
    }),

    new TestResult({
      scenario_featureFileRelativePath: 'features/tags_and_vars.feature',
      scenario_featureName: 'Tags and Vars',
      scenario_getLabel: '@tag2 - success',
      scenario_isOutline: false,
      scenario_result: 'passed',
      scenario_scenarioName: '@tag2 - success',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../run profiles/features/tags_and_vars.feature/@tag2 - success',
      test_label: '@tag2 - success',
      test_parent: '.../run profiles/features/tags_and_vars.feature',
      test_uri: '.../run profiles/features/tags_and_vars.feature'
    }),

    new TestResult({
      scenario_featureFileRelativePath: 'features/tags_and_vars.feature',
      scenario_featureName: 'Tags and Vars',
      scenario_getLabel: '@tag2 - fail',
      scenario_isOutline: false,
      scenario_result: 'failed',
      scenario_scenarioName: '@tag2 - fail',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../run profiles/features/tags_and_vars.feature/@tag2 - fail',
      test_label: '@tag2 - fail',
      test_parent: '.../run profiles/features/tags_and_vars.feature',
      test_uri: '.../run profiles/features/tags_and_vars.feature'
    }),

    new TestResult({
      scenario_featureFileRelativePath: 'features/tags_and_vars.feature',
      scenario_featureName: 'Tags and Vars',
      scenario_getLabel: '@tag2 @skip - skip',
      scenario_isOutline: false,
      scenario_result: 'skipped',
      scenario_scenarioName: '@tag2 @skip - skip',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../run profiles/features/tags_and_vars.feature/@tag2 @skip - skip',
      test_label: '@tag2 @skip - skip',
      test_parent: '.../run profiles/features/tags_and_vars.feature',
      test_uri: '.../run profiles/features/tags_and_vars.feature'
    }),

    new TestResult({
      scenario_featureFileRelativePath: 'features/tags_and_vars.feature',
      scenario_featureName: 'Tags and Vars',
      scenario_getLabel: '@tag2 - success - envvar checks',
      scenario_isOutline: false,
      scenario_result: 'passed',
      scenario_scenarioName: '@tag2 - success - envvar checks',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../run profiles/features/tags_and_vars.feature/@tag2 - success - envvar checks',
      test_label: '@tag2 - success - envvar checks',
      test_parent: '.../run profiles/features/tags_and_vars.feature',
      test_uri: '.../run profiles/features/tags_and_vars.feature'
    }),

    new TestResult({
      scenario_featureFileRelativePath: 'features/tags_and_vars.feature',
      scenario_featureName: 'Tags and Vars',
      scenario_getLabel: 'untagged - success',
      scenario_isOutline: false,
      scenario_result: 'skipped',
      scenario_scenarioName: 'untagged - success',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../run profiles/features/tags_and_vars.feature/untagged - success',
      test_label: 'untagged - success',
      test_parent: '.../run profiles/features/tags_and_vars.feature',
      test_uri: '.../run profiles/features/tags_and_vars.feature'
    }),

    new TestResult({
      scenario_featureFileRelativePath: 'features/tags_and_vars.feature',
      scenario_featureName: 'Tags and Vars',
      scenario_getLabel: 'untagged - fail',
      scenario_isOutline: false,
      scenario_result: 'skipped',
      scenario_scenarioName: 'untagged - fail',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../run profiles/features/tags_and_vars.feature/untagged - fail',
      test_label: 'untagged - fail',
      test_parent: '.../run profiles/features/tags_and_vars.feature',
      test_uri: '.../run profiles/features/tags_and_vars.feature'
    }),

    new TestResult({
      scenario_featureFileRelativePath: 'features/tags_and_vars.feature',
      scenario_featureName: 'Tags and Vars',
      scenario_getLabel: 'untagged - @skip - skip',
      scenario_isOutline: false,
      scenario_result: 'skipped',
      scenario_scenarioName: 'untagged - @skip - skip',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../run profiles/features/tags_and_vars.feature/untagged - @skip - skip',
      test_label: 'untagged - @skip - skip',
      test_parent: '.../run profiles/features/tags_and_vars.feature',
      test_uri: '.../run profiles/features/tags_and_vars.feature'
    }),

    new TestResult({
      scenario_featureFileRelativePath: 'features/tags_and_vars.feature',
      scenario_featureName: 'Tags and Vars',
      scenario_getLabel: 'untagged - success - envvar checks',
      scenario_isOutline: false,
      scenario_result: 'skipped',
      scenario_scenarioName: 'untagged - success - envvar checks',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../run profiles/features/tags_and_vars.feature/untagged - success - envvar checks',
      test_label: 'untagged - success - envvar checks',
      test_parent: '.../run profiles/features/tags_and_vars.feature',
      test_uri: '.../run profiles/features/tags_and_vars.feature'
    }),

    new TestResult({
      scenario_featureFileRelativePath: 'features/tags_and_vars.feature',
      scenario_featureName: 'Tags and Vars',
      scenario_getLabel: '@tag1 or @tag2 or @qu\'oted"tag - success - match check',
      scenario_isOutline: false,
      scenario_result: 'passed',
      scenario_scenarioName: '@tag1 or @tag2 or @qu\'oted"tag - success - match check',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../run profiles/features/tags_and_vars.feature/@tag1 or @tag2 or @qu\'oted"tag - success - match check',
      test_label: '@tag1 or @tag2 or @qu\'oted"tag - success - match check',
      test_parent: '.../run profiles/features/tags_and_vars.feature',
      test_uri: '.../run profiles/features/tags_and_vars.feature',
    }),

  ];



  return expectedResults;
}


export const getExpectedResultsForTag1Or2RunProfile = (): TestResult[] => {

  const expectedResults: TestResult[] = [

    new TestResult({
      scenario_featureFileRelativePath: 'features/tags_and_vars.feature',
      scenario_featureName: 'Tags and Vars',
      scenario_getLabel: '@tag1 or @tag2 - success - stage check',
      scenario_isOutline: false,
      scenario_result: 'passed',
      scenario_scenarioName: '@tag1 or @tag2 - success - stage check',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../run profiles/features/tags_and_vars.feature/@tag1 or @tag2 - success - stage check',
      test_label: '@tag1 or @tag2 - success - stage check',
      test_parent: '.../run profiles/features/tags_and_vars.feature',
      test_uri: '.../run profiles/features/tags_and_vars.feature'
    }),

    new TestResult({
      scenario_featureFileRelativePath: 'features/tags_and_vars.feature',
      scenario_featureName: 'Tags and Vars',
      scenario_getLabel: '@tag1 - success',
      scenario_isOutline: false,
      scenario_result: 'passed',
      scenario_scenarioName: '@tag1 - success',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../run profiles/features/tags_and_vars.feature/@tag1 - success',
      test_label: '@tag1 - success',
      test_parent: '.../run profiles/features/tags_and_vars.feature',
      test_uri: '.../run profiles/features/tags_and_vars.feature'
    }),

    new TestResult({
      scenario_featureFileRelativePath: 'features/tags_and_vars.feature',
      scenario_featureName: 'Tags and Vars',
      scenario_getLabel: '@tag1 - fail',
      scenario_isOutline: false,
      scenario_result: 'failed',
      scenario_scenarioName: '@tag1 - fail',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../run profiles/features/tags_and_vars.feature/@tag1 - fail',
      test_label: '@tag1 - fail',
      test_parent: '.../run profiles/features/tags_and_vars.feature',
      test_uri: '.../run profiles/features/tags_and_vars.feature'
    }),

    new TestResult({
      scenario_featureFileRelativePath: 'features/tags_and_vars.feature',
      scenario_featureName: 'Tags and Vars',
      scenario_getLabel: '@tag1 @skip - skip',
      scenario_isOutline: false,
      scenario_result: 'skipped',
      scenario_scenarioName: '@tag1 @skip - skip',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../run profiles/features/tags_and_vars.feature/@tag1 @skip - skip',
      test_label: '@tag1 @skip - skip',
      test_parent: '.../run profiles/features/tags_and_vars.feature',
      test_uri: '.../run profiles/features/tags_and_vars.feature'
    }),

    new TestResult({
      scenario_featureFileRelativePath: 'features/tags_and_vars.feature',
      scenario_featureName: 'Tags and Vars',
      scenario_getLabel: '@tag1 - success - envvar checks',
      scenario_isOutline: false,
      scenario_result: 'passed',
      scenario_scenarioName: '@tag1 - success - envvar checks',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../run profiles/features/tags_and_vars.feature/@tag1 - success - envvar checks',
      test_label: '@tag1 - success - envvar checks',
      test_parent: '.../run profiles/features/tags_and_vars.feature',
      test_uri: '.../run profiles/features/tags_and_vars.feature'
    }),

    new TestResult({
      scenario_featureFileRelativePath: 'features/tags_and_vars.feature',
      scenario_featureName: 'Tags and Vars',
      scenario_getLabel: '@tag2 - success',
      scenario_isOutline: false,
      scenario_result: 'passed',
      scenario_scenarioName: '@tag2 - success',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../run profiles/features/tags_and_vars.feature/@tag2 - success',
      test_label: '@tag2 - success',
      test_parent: '.../run profiles/features/tags_and_vars.feature',
      test_uri: '.../run profiles/features/tags_and_vars.feature'
    }),

    new TestResult({
      scenario_featureFileRelativePath: 'features/tags_and_vars.feature',
      scenario_featureName: 'Tags and Vars',
      scenario_getLabel: '@tag2 - fail',
      scenario_isOutline: false,
      scenario_result: 'failed',
      scenario_scenarioName: '@tag2 - fail',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../run profiles/features/tags_and_vars.feature/@tag2 - fail',
      test_label: '@tag2 - fail',
      test_parent: '.../run profiles/features/tags_and_vars.feature',
      test_uri: '.../run profiles/features/tags_and_vars.feature'
    }),

    new TestResult({
      scenario_featureFileRelativePath: 'features/tags_and_vars.feature',
      scenario_featureName: 'Tags and Vars',
      scenario_getLabel: '@tag2 @skip - skip',
      scenario_isOutline: false,
      scenario_result: 'skipped',
      scenario_scenarioName: '@tag2 @skip - skip',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../run profiles/features/tags_and_vars.feature/@tag2 @skip - skip',
      test_label: '@tag2 @skip - skip',
      test_parent: '.../run profiles/features/tags_and_vars.feature',
      test_uri: '.../run profiles/features/tags_and_vars.feature'
    }),

    new TestResult({
      scenario_featureFileRelativePath: 'features/tags_and_vars.feature',
      scenario_featureName: 'Tags and Vars',
      scenario_getLabel: '@tag2 - success - envvar checks',
      scenario_isOutline: false,
      scenario_result: 'passed',
      scenario_scenarioName: '@tag2 - success - envvar checks',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../run profiles/features/tags_and_vars.feature/@tag2 - success - envvar checks',
      test_label: '@tag2 - success - envvar checks',
      test_parent: '.../run profiles/features/tags_and_vars.feature',
      test_uri: '.../run profiles/features/tags_and_vars.feature'
    }),

    new TestResult({
      scenario_featureFileRelativePath: 'features/tags_and_vars.feature',
      scenario_featureName: 'Tags and Vars',
      scenario_getLabel: 'untagged - success',
      scenario_isOutline: false,
      scenario_result: 'skipped',
      scenario_scenarioName: 'untagged - success',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../run profiles/features/tags_and_vars.feature/untagged - success',
      test_label: 'untagged - success',
      test_parent: '.../run profiles/features/tags_and_vars.feature',
      test_uri: '.../run profiles/features/tags_and_vars.feature'
    }),

    new TestResult({
      scenario_featureFileRelativePath: 'features/tags_and_vars.feature',
      scenario_featureName: 'Tags and Vars',
      scenario_getLabel: 'untagged - fail',
      scenario_isOutline: false,
      scenario_result: 'skipped',
      scenario_scenarioName: 'untagged - fail',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../run profiles/features/tags_and_vars.feature/untagged - fail',
      test_label: 'untagged - fail',
      test_parent: '.../run profiles/features/tags_and_vars.feature',
      test_uri: '.../run profiles/features/tags_and_vars.feature'
    }),

    new TestResult({
      scenario_featureFileRelativePath: 'features/tags_and_vars.feature',
      scenario_featureName: 'Tags and Vars',
      scenario_getLabel: 'untagged - @skip - skip',
      scenario_isOutline: false,
      scenario_result: 'skipped',
      scenario_scenarioName: 'untagged - @skip - skip',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../run profiles/features/tags_and_vars.feature/untagged - @skip - skip',
      test_label: 'untagged - @skip - skip',
      test_parent: '.../run profiles/features/tags_and_vars.feature',
      test_uri: '.../run profiles/features/tags_and_vars.feature'
    }),

    new TestResult({
      scenario_featureFileRelativePath: 'features/tags_and_vars.feature',
      scenario_featureName: 'Tags and Vars',
      scenario_getLabel: 'untagged - success - envvar checks',
      scenario_isOutline: false,
      scenario_result: 'skipped',
      scenario_scenarioName: 'untagged - success - envvar checks',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../run profiles/features/tags_and_vars.feature/untagged - success - envvar checks',
      test_label: 'untagged - success - envvar checks',
      test_parent: '.../run profiles/features/tags_and_vars.feature',
      test_uri: '.../run profiles/features/tags_and_vars.feature'
    }),

    new TestResult({
      scenario_featureFileRelativePath: 'features/tags_and_vars.feature',
      scenario_featureName: 'Tags and Vars',
      scenario_getLabel: '@tag1 or @tag2 or @qu\'oted"tag - success - match check',
      scenario_isOutline: false,
      scenario_result: 'passed',
      scenario_scenarioName: '@tag1 or @tag2 or @qu\'oted"tag - success - match check',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../run profiles/features/tags_and_vars.feature/@tag1 or @tag2 or @qu\'oted"tag - success - match check',
      test_label: '@tag1 or @tag2 or @qu\'oted"tag - success - match check',
      test_parent: '.../run profiles/features/tags_and_vars.feature',
      test_uri: '.../run profiles/features/tags_and_vars.feature',
    }),

  ];


  return expectedResults;
}


