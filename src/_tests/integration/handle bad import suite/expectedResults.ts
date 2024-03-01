import { ProjParseCounts } from "../../../parsers/fileParser";
import { TestResult } from "../_common/types"

export function getExpectedCounts(): ProjParseCounts {
  const testCount = getExpectedResults().length;
  return {
    tests: { nodeCount: 4, testCount: testCount },
    featureFilesExceptEmptyOrCommentedOut: 1, stepFilesExceptEmptyOrCommentedOut: 2,
    stepFileStepsExceptCommentedOut: 3, featureFileStepsExceptCommentedOut: 9, stepMappings: 9
  };
}

export const getExpectedResults = (): TestResult[] => {

  const expectedResults: TestResult[] = [

    new TestResult({
      scenario_featureFileRelativePath: 'features/simple.feature',
      scenario_featureName: 'Bad import: scenarios should fail (unless cancelled)',
      scenario_getLabel: 'fail 1',
      scenario_isOutline: false,
      scenario_result: 'no-junit-file',
      scenario_scenarioName: 'fail 1',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../handle bad import/features/simple.feature/fail 1',
      test_label: 'fail 1',
      test_parent: '.../handle bad import/features/simple.feature',
      test_uri: '.../handle bad import/features/simple.feature',
    }),

    new TestResult({
      scenario_featureFileRelativePath: 'features/simple.feature',
      scenario_featureName: 'Bad import: scenarios should fail (unless cancelled)',
      scenario_getLabel: 'fail 2',
      scenario_isOutline: false,
      scenario_result: 'no-junit-file',
      scenario_scenarioName: 'fail 2',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../handle bad import/features/simple.feature/fail 2',
      test_label: 'fail 2',
      test_parent: '.../handle bad import/features/simple.feature',
      test_uri: '.../handle bad import/features/simple.feature',
    }),

    new TestResult({
      scenario_featureFileRelativePath: 'features/simple.feature',
      scenario_featureName: 'Bad import: scenarios should fail (unless cancelled)',
      scenario_getLabel: 'fail 3',
      scenario_isOutline: false,
      scenario_result: 'no-junit-file',
      scenario_scenarioName: 'fail 3',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../handle bad import/features/simple.feature/fail 3',
      test_label: 'fail 3',
      test_parent: '.../handle bad import/features/simple.feature',
      test_uri: '.../handle bad import/features/simple.feature',
    }),

  ];

  return expectedResults;
}


