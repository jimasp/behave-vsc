import { ProjParseCounts } from "../../../parsers/fileParser";
import { TestResult } from "../_helpers/runners/assertions";

export function getExpectedCounts(): ProjParseCounts {
  const testCount = getExpectedResults().length;
  return {
    tests: { nodeCount: 4, testCount: testCount },
    featureFilesExceptEmptyOrCommentedOut: 1, stepFilesExceptEmptyOrCommentedOut: 1,
    stepFileStepsExceptCommentedOut: 6, featureFileStepsExceptCommentedOut: 7, stepMappings: 7
  };
}

export const getExpectedResults = (): TestResult[] => {

  const expectedResults: TestResult[] = [
    new TestResult({
      scenario_featureFileRelativePath: 'features/simple.feature',
      scenario_featureName: 'Simple',
      scenario_getLabel: 'run a successful test',
      scenario_isOutline: false,
      scenario_result: 'passed',
      scenario_scenarioName: 'run a successful test',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../simple/features/simple.feature/run a successful test',
      test_label: 'run a successful test',
      test_parent: '.../simple/features/simple.feature',
      test_uri: '.../simple/features/simple.feature'
    }),

    new TestResult({
      scenario_featureFileRelativePath: 'features/simple.feature',
      scenario_featureName: 'Simple',
      scenario_getLabel: 'run a failing test',
      scenario_isOutline: false,
      scenario_result: 'failed',
      scenario_scenarioName: 'run a failing test',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../simple/features/simple.feature/run a failing test',
      test_label: 'run a failing test',
      test_parent: '.../simple/features/simple.feature',
      test_uri: '.../simple/features/simple.feature'
    }),

    new TestResult({
      scenario_featureFileRelativePath: 'features/simple.feature',
      scenario_featureName: 'Simple',
      scenario_getLabel: 'run a skipped test',
      scenario_isOutline: false,
      scenario_result: 'skipped',
      scenario_scenarioName: 'run a skipped test',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../simple/features/simple.feature/run a skipped test',
      test_label: 'run a skipped test',
      test_parent: '.../simple/features/simple.feature',
      test_uri: '.../simple/features/simple.feature'
    }),

  ];



  return expectedResults;
}


