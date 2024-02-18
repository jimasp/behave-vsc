import { ProjParseCounts } from "../../../parsers/fileParser";
import { TestResult } from "../_helpers/common";

export function getExpectedCounts(): ProjParseCounts {
  const testCount = getExpectedResults().length;
  return {
    tests: { nodeCount: 12, testCount: testCount },
    featureFilesExceptEmptyOrCommentedOut: 4, stepFilesExceptEmptyOrCommentedOut: 1,
    stepFileStepsExceptCommentedOut: 3, featureFileStepsExceptCommentedOut: 15, stepMappings: 15
  };
}

export const getExpectedResults = (): TestResult[] => {

  const expectedResults: TestResult[] = [
    new TestResult({
      scenario_featureFileRelativePath: 'features/f-basic1.feature',
      scenario_featureName: 'f-basic1',
      scenario_getLabel: 'run a successful test',
      scenario_isOutline: false,
      scenario_result: 'passed',
      scenario_scenarioName: 'run a successful test',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../multiple top-level features folders/features/f-basic1.feature/run a successful test',
      test_label: 'run a successful test',
      test_parent: '.../multiple top-level features folders/features/f-basic1.feature',
      test_uri: '.../multiple top-level features folders/features/f-basic1.feature'
    }),

    new TestResult({
      scenario_featureFileRelativePath: 'features/f-basic1.feature',
      scenario_featureName: 'f-basic1',
      scenario_getLabel: 'run a failing test',
      scenario_isOutline: false,
      scenario_result: 'failed',
      scenario_scenarioName: 'run a failing test',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../multiple top-level features folders/features/f-basic1.feature/run a failing test',
      test_label: 'run a failing test',
      test_parent: '.../multiple top-level features folders/features/f-basic1.feature',
      test_uri: '.../multiple top-level features folders/features/f-basic1.feature'
    }),

    new TestResult({
      scenario_featureFileRelativePath: 'features/f-basic2.feature',
      scenario_featureName: 'f-basic2',
      scenario_getLabel: 'run a successful test',
      scenario_isOutline: false,
      scenario_result: 'passed',
      scenario_scenarioName: 'run a successful test',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../multiple top-level features folders/features/f-basic2.feature/run a successful test',
      test_label: 'run a successful test',
      test_parent: '.../multiple top-level features folders/features/f-basic2.feature',
      test_uri: '.../multiple top-level features folders/features/f-basic2.feature'
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


