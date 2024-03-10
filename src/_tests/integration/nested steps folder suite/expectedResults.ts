import { ProjParseCounts } from "../../../parsers/fileParser";
import { TestResult } from "../_common/types"

export function getExpectedCounts(): ProjParseCounts {
  const testCount = getExpectedResults().length;
  return {
    tests: { nodeCount: 2, testCount: testCount },
    featureFilesExceptEmptyOrCommentedOut: 1, stepFilesExceptEmptyOrCommentedOut: 2,
    stepFileStepsExceptCommentedOut: 3, featureFileStepsExceptCommentedOut: 3, stepMappings: 3
  };
}

export const getExpectedResults = (): TestResult[] => {

  const expectedResults: TestResult[] = [

    new TestResult({
      scenario_featureFileRelativePath: 'features/success.feature',
      scenario_featureName: 'Success',
      scenario_getLabel: 'run a successful test',
      scenario_isOutline: false,
      scenario_result: 'passed',
      scenario_scenarioName: 'run a successful test',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../nested steps folder/features/success.feature/run a successful test',
      test_label: 'run a successful test',
      test_parent: '.../nested steps folder/features/success.feature',
      test_uri: '.../nested steps folder/features/success.feature'
    }),

  ];



  return expectedResults;
}


