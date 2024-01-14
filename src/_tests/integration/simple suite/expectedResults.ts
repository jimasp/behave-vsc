import { ProjParseCounts } from "../../../parsers/fileParser";
import { TestResult } from "../_helpers/common"

export function getExpectedCounts(): ProjParseCounts {
  const testCount = getExpectedResults().length;
  return {
    tests: { nodeCount: 6, testCount: testCount },
    featureFilesExceptEmptyOrCommentedOut: 2, stepFilesExceptEmptyOrCommentedOut: 1,
    stepFileStepsExceptCommentedOut: 6, featureFileStepsExceptCommentedOut: 10, stepMappings: 10
  };
}

export const getExpectedResults = (): TestResult[] => {

  const expectedResults: TestResult[] = [

    new TestResult({
      scenario_featureFileRelativePath: 'features/single.scenario.feature',
      scenario_featureName: 'Single scenario',
      scenario_getLabel: 'run a successful test',
      scenario_isOutline: false,
      scenario_result: 'passed',
      scenario_scenarioName: 'run a successful test',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../simple/features/single.scenario.feature/run a successful test',
      test_label: 'run a successful test',
      test_parent: '.../simple/features/single.scenario.feature',
      test_uri: '.../simple/features/single.scenario.feature'
    }),

    new TestResult({
      scenario_featureFileRelativePath: 'features/mixed.results.feature',
      scenario_featureName: 'Mixed results',
      scenario_getLabel: 'run a successful test',
      scenario_isOutline: false,
      scenario_result: 'passed',
      scenario_scenarioName: 'run a successful test',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../simple/features/mixed.results.feature/run a successful test',
      test_label: 'run a successful test',
      test_parent: '.../simple/features/mixed.results.feature',
      test_uri: '.../simple/features/mixed.results.feature'
    }),

    new TestResult({
      scenario_featureFileRelativePath: 'features/mixed.results.feature',
      scenario_featureName: 'Mixed results',
      scenario_getLabel: 'run a failing test',
      scenario_isOutline: false,
      scenario_result: 'failed',
      scenario_scenarioName: 'run a failing test',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../simple/features/mixed.results.feature/run a failing test',
      test_label: 'run a failing test',
      test_parent: '.../simple/features/mixed.results.feature',
      test_uri: '.../simple/features/mixed.results.feature'
    }),

    new TestResult({
      scenario_featureFileRelativePath: 'features/mixed.results.feature',
      scenario_featureName: 'Mixed results',
      scenario_getLabel: 'run a skipped test',
      scenario_isOutline: false,
      scenario_result: 'skipped',
      scenario_scenarioName: 'run a skipped test',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../simple/features/mixed.results.feature/run a skipped test',
      test_label: 'run a skipped test',
      test_parent: '.../simple/features/mixed.results.feature',
      test_uri: '.../simple/features/mixed.results.feature'
    }),

  ];



  return expectedResults;
}


