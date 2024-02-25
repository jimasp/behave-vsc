import { ProjParseCounts } from "../../../parsers/fileParser";
import { TestResult } from "../_helpers/common"

export function getExpectedCounts(): ProjParseCounts {
  const testCount = getExpectedResultsForNoProfile().length;
  return {
    tests: { nodeCount: 7, testCount: testCount },
    featureFilesExceptEmptyOrCommentedOut: 2, stepFilesExceptEmptyOrCommentedOut: 1,
    stepFileStepsExceptCommentedOut: 3, featureFileStepsExceptCommentedOut: 12, stepMappings: 12
  };
}


export const getExpectedResultsForNoProfile = (): TestResult[] => {

  const expectedResults: TestResult[] = [

    // NONE of this group of expected results are expected to have a scenario_result of "success"
    // this is because our integration tests directly execute testRunHandler,
    // (i.e. ignoring any default profile) and we're not specifying a profile in this test case,
    // so they will all fail unless they are skipped tests.

    new TestResult({
      scenario_featureFileRelativePath: 'django/mysite/features/mixed.feature',
      scenario_featureName: 'Mixed results',
      scenario_getLabel: 'test success',
      scenario_isOutline: false,
      scenario_result: 'failed',
      scenario_scenarioName: 'test success',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../use custom runner/django/mysite/features/mixed.feature/test success',
      test_label: 'test success',
      test_parent: '.../use custom runner/django/mysite/features/mixed.feature',
      test_uri: '.../use custom runner/django/mysite/features/mixed.feature',
    }),

    new TestResult({
      scenario_featureFileRelativePath: 'django/mysite/features/mixed.feature',
      scenario_featureName: 'Mixed results',
      scenario_getLabel: 'test failure',
      scenario_isOutline: false,
      scenario_result: 'failed',
      scenario_scenarioName: 'test failure',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../use custom runner/django/mysite/features/mixed.feature/test failure',
      test_label: 'test failure',
      test_parent: '.../use custom runner/django/mysite/features/mixed.feature',
      test_uri: '.../use custom runner/django/mysite/features/mixed.feature',
    }),

    new TestResult({
      scenario_featureFileRelativePath: 'django/mysite/features/mixed.feature',
      scenario_featureName: 'Mixed results',
      scenario_getLabel: 'test skipped',
      scenario_isOutline: false,
      scenario_result: 'skipped',
      scenario_scenarioName: 'test skipped',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../use custom runner/django/mysite/features/mixed.feature/test skipped',
      test_label: 'test skipped',
      test_parent: '.../use custom runner/django/mysite/features/mixed.feature',
      test_uri: '.../use custom runner/django/mysite/features/mixed.feature',
    }),

    new TestResult({
      scenario_featureFileRelativePath: 'django/mysite/features/folder/folder.feature',
      scenario_featureName: 'Folder feature',
      scenario_getLabel: 'test success',
      scenario_isOutline: false,
      scenario_result: 'failed',
      scenario_scenarioName: 'test success',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../use custom runner/django/mysite/features/folder/folder.feature/test success',
      test_label: 'test success',
      test_parent: '.../use custom runner/django/mysite/features/folder/folder.feature',
      test_uri: '.../use custom runner/django/mysite/features/folder/folder.feature',
    }),

  ];


  return expectedResults;
}


export const getExpectedResultsForBehaveDjangoProfileWaitForJUnitResults = (): TestResult[] => {

  const expectedResults: TestResult[] = [

    new TestResult({
      scenario_featureFileRelativePath: 'django/mysite/features/mixed.feature',
      scenario_featureName: 'Mixed results',
      scenario_getLabel: 'test success',
      scenario_isOutline: false,
      scenario_result: 'passed',
      scenario_scenarioName: 'test success',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../use custom runner/django/mysite/features/mixed.feature/test success',
      test_label: 'test success',
      test_parent: '.../use custom runner/django/mysite/features/mixed.feature',
      test_uri: '.../use custom runner/django/mysite/features/mixed.feature',
    }),

    new TestResult({
      scenario_featureFileRelativePath: 'django/mysite/features/mixed.feature',
      scenario_featureName: 'Mixed results',
      scenario_getLabel: 'test failure',
      scenario_isOutline: false,
      scenario_result: 'failed',
      scenario_scenarioName: 'test failure',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../use custom runner/django/mysite/features/mixed.feature/test failure',
      test_label: 'test failure',
      test_parent: '.../use custom runner/django/mysite/features/mixed.feature',
      test_uri: '.../use custom runner/django/mysite/features/mixed.feature',
    }),

    new TestResult({
      scenario_featureFileRelativePath: 'django/mysite/features/mixed.feature',
      scenario_featureName: 'Mixed results',
      scenario_getLabel: 'test skipped',
      scenario_isOutline: false,
      scenario_result: 'skipped',
      scenario_scenarioName: 'test skipped',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../use custom runner/django/mysite/features/mixed.feature/test skipped',
      test_label: 'test skipped',
      test_parent: '.../use custom runner/django/mysite/features/mixed.feature',
      test_uri: '.../use custom runner/django/mysite/features/mixed.feature',
    }),

    new TestResult({
      scenario_featureFileRelativePath: 'django/mysite/features/folder/folder.feature',
      scenario_featureName: 'Folder feature',
      scenario_getLabel: 'test success',
      scenario_isOutline: false,
      scenario_result: 'passed',
      scenario_scenarioName: 'test success',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../use custom runner/django/mysite/features/folder/folder.feature/test success',
      test_label: 'test success',
      test_parent: '.../use custom runner/django/mysite/features/folder/folder.feature',
      test_uri: '.../use custom runner/django/mysite/features/folder/folder.feature',
    }),

  ];


  return expectedResults;
}


export const getExpectedResultsForBehaveDjangoProfileDoNotWaitForJUnitResults = (): TestResult[] => {

  // because we don't wait for the result, all the scenario_results will be undefined

  const expectedResults: TestResult[] = [

    new TestResult({
      scenario_featureFileRelativePath: 'django/mysite/features/mixed.feature',
      scenario_featureName: 'Mixed results',
      scenario_getLabel: 'test success',
      scenario_isOutline: false,
      scenario_result: 'skipped',
      scenario_scenarioName: 'test success',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../use custom runner/django/mysite/features/mixed.feature/test success',
      test_label: 'test success',
      test_parent: '.../use custom runner/django/mysite/features/mixed.feature',
      test_uri: '.../use custom runner/django/mysite/features/mixed.feature',
    }),

    new TestResult({
      scenario_featureFileRelativePath: 'django/mysite/features/mixed.feature',
      scenario_featureName: 'Mixed results',
      scenario_getLabel: 'test failure',
      scenario_isOutline: false,
      scenario_result: 'skipped',
      scenario_scenarioName: 'test failure',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../use custom runner/django/mysite/features/mixed.feature/test failure',
      test_label: 'test failure',
      test_parent: '.../use custom runner/django/mysite/features/mixed.feature',
      test_uri: '.../use custom runner/django/mysite/features/mixed.feature',
    }),

    new TestResult({
      scenario_featureFileRelativePath: 'django/mysite/features/mixed.feature',
      scenario_featureName: 'Mixed results',
      scenario_getLabel: 'test skipped',
      scenario_isOutline: false,
      scenario_result: 'skipped',
      scenario_scenarioName: 'test skipped',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../use custom runner/django/mysite/features/mixed.feature/test skipped',
      test_label: 'test skipped',
      test_parent: '.../use custom runner/django/mysite/features/mixed.feature',
      test_uri: '.../use custom runner/django/mysite/features/mixed.feature',
    }),

    new TestResult({
      scenario_featureFileRelativePath: 'django/mysite/features/folder/folder.feature',
      scenario_featureName: 'Folder feature',
      scenario_getLabel: 'test success',
      scenario_isOutline: false,
      scenario_result: 'skipped',
      scenario_scenarioName: 'test success',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../use custom runner/django/mysite/features/folder/folder.feature/test success',
      test_label: 'test success',
      test_parent: '.../use custom runner/django/mysite/features/folder/folder.feature',
      test_uri: '.../use custom runner/django/mysite/features/folder/folder.feature',
    }),

  ];

  return expectedResults;

}


