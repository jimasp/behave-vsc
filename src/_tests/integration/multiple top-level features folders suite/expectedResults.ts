import { ProjParseCounts } from "../../../parsers/fileParser";
import { TestResult } from "../_helpers/common";

export function getExpectedCounts(): ProjParseCounts {
  const testCount = getExpectedResults().length;
  return {
    tests: { nodeCount: 9, testCount: testCount },
    featureFilesExceptEmptyOrCommentedOut: 3, stepFilesExceptEmptyOrCommentedOut: 1,
    stepFileStepsExceptCommentedOut: 3, featureFileStepsExceptCommentedOut: 9, stepMappings: 9
  };
}

export const getExpectedResults = (): TestResult[] => {

  const expectedResults: TestResult[] = [
    new TestResult({
      scenario_featureFileRelativePath: 'features/f-basic.feature',
      scenario_featureName: 'f-basic',
      scenario_getLabel: 'run a successful test',
      scenario_isOutline: false,
      scenario_result: 'passed',
      scenario_scenarioName: 'run a successful test',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../multiple top-level features folders/features/f-basic.feature/run a successful test',
      test_label: 'run a successful test',
      test_parent: '.../multiple top-level features folders/features/f-basic.feature',
      test_uri: '.../multiple top-level features folders/features/f-basic.feature'
    }),

    new TestResult({
      scenario_featureFileRelativePath: 'features2/f2-basic.feature',
      scenario_featureName: 'f2-basic',
      scenario_getLabel: 'run a successful test',
      scenario_isOutline: false,
      scenario_result: 'passed',
      scenario_scenarioName: 'run a successful test',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../multiple top-level features folders/features2/f2-basic.feature/run a successful test',
      test_label: 'run a successful test',
      test_parent: '.../multiple top-level features folders/features2/f2-basic.feature',
      test_uri: '.../multiple top-level features folders/features2/f2-basic.feature'
    }),

    new TestResult({
      scenario_featureFileRelativePath: 'features2/subfolder/f2-basic-sub.feature',
      scenario_featureName: 'f2-basic-sub',
      scenario_getLabel: 'run a successful test',
      scenario_isOutline: false,
      scenario_result: 'passed',
      scenario_scenarioName: 'run a successful test',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../multiple top-level features folders/features2/subfolder/f2-basic-sub.feature/run a successful test',
      test_label: 'run a successful test',
      test_parent: '.../multiple top-level features folders/features2/subfolder/f2-basic-sub.feature',
      test_uri: '.../multiple top-level features folders/features2/subfolder/f2-basic-sub.feature'
    }),

  ];


  return expectedResults;
}


