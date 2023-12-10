import { ProjParseCounts } from "../../parsers/fileParser";
import { TestResult } from "../suite-helpers/expectedResults.helpers";

export function getExpectedCounts(): ProjParseCounts {
  const testCount = getExpectedResults().length;
  return {
    tests: { nodeCount: 4, testCount: testCount },
    featureFilesExceptEmptyOrCommentedOut: 1, stepFilesExceptEmptyOrCommentedOut: 6,
    stepFileStepsExceptCommentedOut: 7, featureFileStepsExceptCommentedOut: 7, stepMappings: 7
  };
}

export const getExpectedResults = (): TestResult[] => {

  const expectedResults: TestResult[] = [
    new TestResult({
      scenario_featureFileRelativePath: 'features/basic.feature',
      scenario_featureName: 'Basic',
      scenario_getLabel: 'run a successful test',
      scenario_isOutline: false,
      scenario_result: 'passed',
      scenario_scenarioName: 'run a successful test',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../imported steps/features/basic.feature/run a successful test',
      test_label: 'run a successful test',
      test_parent: '.../imported steps/features/basic.feature',
      test_uri: '.../imported steps/features/basic.feature'
    }),

    new TestResult({
      scenario_featureFileRelativePath: 'features/basic.feature',
      scenario_featureName: 'Basic',
      scenario_getLabel: 'run a failing test',
      scenario_isOutline: false,
      scenario_result: 'failed',
      scenario_scenarioName: 'run a failing test',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../imported steps/features/basic.feature/run a failing test',
      test_label: 'run a failing test',
      test_parent: '.../imported steps/features/basic.feature',
      test_uri: '.../imported steps/features/basic.feature'
    }),

    new TestResult({
      scenario_featureFileRelativePath: 'features/basic.feature',
      scenario_featureName: 'Basic',
      scenario_getLabel: 'run a skipped test',
      scenario_isOutline: false,
      scenario_result: 'skipped',
      scenario_scenarioName: 'run a skipped test',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../imported steps/features/basic.feature/run a skipped test',
      test_label: 'run a skipped test',
      test_parent: '.../imported steps/features/basic.feature',
      test_uri: '.../imported steps/features/basic.feature'
    }),

  ];



  return expectedResults;
}


