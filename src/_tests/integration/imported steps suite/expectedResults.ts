import { ProjParseCounts } from "../../../parsers/fileParser";
import { TestResult } from "../_common/types";

export function getExpectedCounts(): ProjParseCounts {
  const testCount = getExpectedResults().length;
  return {
    tests: { nodeCount: 5, testCount: testCount },
    featureFilesExceptEmptyOrCommentedOut: 1, stepFilesExceptEmptyOrCommentedOut: 7,
    stepFileStepsExceptCommentedOut: 8, featureFileStepsExceptCommentedOut: 8, stepMappings: 8
  };
}

export const getExpectedResults = (): TestResult[] => {

  const expectedResults: TestResult[] = [
    new TestResult({
      scenario_featureFileRelativePath: 'features/basic.feature',
      scenario_featureName: 'Basic',
      scenario_getLabel: 'run a successful test using importedSteps',
      scenario_isOutline: false,
      scenario_result: 'passed',
      scenario_scenarioName: 'run a successful test using importedSteps',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../imported steps/features/basic.feature/run a successful test using importedSteps',
      test_label: 'run a successful test using importedSteps',
      test_parent: '.../imported steps/features/basic.feature',
      test_uri: '.../imported steps/features/basic.feature'
    }),

    new TestResult({
      scenario_featureFileRelativePath: 'features/basic.feature',
      scenario_featureName: 'Basic',
      scenario_getLabel: 'run a failing test using importedSteps',
      scenario_isOutline: false,
      scenario_result: 'failed',
      scenario_scenarioName: 'run a failing test using importedSteps',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../imported steps/features/basic.feature/run a failing test using importedSteps',
      test_label: 'run a failing test using importedSteps',
      test_parent: '.../imported steps/features/basic.feature',
      test_uri: '.../imported steps/features/basic.feature'
    }),

    new TestResult({
      scenario_featureFileRelativePath: 'features/basic.feature',
      scenario_featureName: 'Basic',
      scenario_getLabel: 'run a skipped test using importedSteps',
      scenario_isOutline: false,
      scenario_result: 'skipped',
      scenario_scenarioName: 'run a skipped test using importedSteps',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../imported steps/features/basic.feature/run a skipped test using importedSteps',
      test_label: 'run a skipped test using importedSteps',
      test_parent: '.../imported steps/features/basic.feature',
      test_uri: '.../imported steps/features/basic.feature'
    }),

    new TestResult({
      scenario_featureFileRelativePath: 'features/basic.feature',
      scenario_featureName: 'Basic',
      scenario_getLabel: 'step reference check for excluded path importedSteps',
      scenario_isOutline: false,
      scenario_result: 'passed',
      scenario_scenarioName: 'step reference check for excluded path importedSteps',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../imported steps/features/basic.feature/step reference check for excluded path importedSteps',
      test_label: 'step reference check for excluded path importedSteps',
      test_parent: '.../imported steps/features/basic.feature',
      test_uri: '.../imported steps/features/basic.feature',
    }),

  ];



  return expectedResults;
}


