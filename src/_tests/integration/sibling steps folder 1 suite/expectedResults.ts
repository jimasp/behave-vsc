import { ProjParseCounts } from "../../../parsers/fileParser";
import { TestResult } from "../_helpers/common";

export function getExpectedCounts(): ProjParseCounts {
  const testCount = getExpectedResults().length;
  return {
    tests: { nodeCount: 14, testCount: testCount },
    featureFilesExceptEmptyOrCommentedOut: 3, stepFilesExceptEmptyOrCommentedOut: 3,
    stepFileStepsExceptCommentedOut: 13, featureFileStepsExceptCommentedOut: 28, stepMappings: 28
  };
}

export const getExpectedResults = (): TestResult[] => {

  const expectedResults: TestResult[] = [
    new TestResult({
      scenario_featureFileRelativePath: 'my_features/basic_no_skip.feature',
      scenario_featureName: 'Basic',
      scenario_getLabel: 'run a successful test',
      scenario_isOutline: false,
      scenario_result: 'passed',
      scenario_scenarioName: 'run a successful test',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../sibling steps folder 1/my_features/basic_no_skip.feature/run a successful test',
      test_label: 'run a successful test',
      test_parent: '.../sibling steps folder 1/my_features/basic_no_skip.feature',
      test_uri: '.../sibling steps folder 1/my_features/basic_no_skip.feature'
    }),

    new TestResult({
      scenario_featureFileRelativePath: 'my_features/basic_no_skip.feature',
      scenario_featureName: 'Basic',
      scenario_getLabel: 'run a failing test',
      scenario_isOutline: false,
      scenario_result: 'failed',
      scenario_scenarioName: 'run a failing test',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../sibling steps folder 1/my_features/basic_no_skip.feature/run a failing test',
      test_label: 'run a failing test',
      test_parent: '.../sibling steps folder 1/my_features/basic_no_skip.feature',
      test_uri: '.../sibling steps folder 1/my_features/basic_no_skip.feature'
    }),

    new TestResult({
      scenario_featureName: 'Mixed outline',
      scenario_featureFileRelativePath: 'my_features/outline/outline_mixed_no_skip.feature',
      scenario_getLabel: 'Blenders Success <thing>',
      scenario_isOutline: true,
      scenario_result: 'passed',
      scenario_scenarioName: 'Blenders Success <thing>',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../sibling steps folder 1/my_features/outline/outline_mixed_no_skip.feature/Blenders Success <thing>',
      test_label: 'Blenders Success <thing>',
      test_parent: '.../sibling steps folder 1/my_features/outline/outline_mixed_no_skip.feature',
      test_uri: '.../sibling steps folder 1/my_features/outline/outline_mixed_no_skip.feature'
    }),

    new TestResult({
      scenario_featureName: 'Mixed outline',
      scenario_featureFileRelativePath: 'my_features/outline/outline_mixed_no_skip.feature',
      scenario_getLabel: 'Blenders Fail <thing>',
      scenario_isOutline: true,
      scenario_result: 'failed',
      scenario_scenarioName: 'Blenders Fail <thing>',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../sibling steps folder 1/my_features/outline/outline_mixed_no_skip.feature/Blenders Fail <thing>',
      test_label: 'Blenders Fail <thing>',
      test_parent: '.../sibling steps folder 1/my_features/outline/outline_mixed_no_skip.feature',
      test_uri: '.../sibling steps folder 1/my_features/outline/outline_mixed_no_skip.feature'
    }),

    new TestResult({
      scenario_featureFileRelativePath: 'my_features/some tests/outline_mixed_no_skip.feature',
      scenario_featureName: 'Mixed outline',
      scenario_getLabel: 'Blenders Success paramless',
      scenario_isOutline: true,
      scenario_result: 'passed',
      scenario_scenarioName: 'Blenders Success paramless',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../sibling steps folder 1/my_features/outline/outline_mixed_no_skip.feature/Blenders Success paramless',
      test_label: 'Blenders Success paramless',
      test_parent: '.../sibling steps folder 1/my_features/outline/outline_mixed_no_skip.feature',
      test_uri: '.../sibling steps folder 1/my_features/outline/outline_mixed_no_skip.feature'
    }),

    new TestResult({
      scenario_featureName: 'Mixed outline',
      scenario_featureFileRelativePath: 'my_features/outline/outline_mixed_no_skip.feature',
      scenario_getLabel: 'Blenders Fail paramless',
      scenario_isOutline: true,
      scenario_result: 'failed',
      scenario_scenarioName: 'Blenders Fail paramless',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../sibling steps folder 1/my_features/outline/outline_mixed_no_skip.feature/Blenders Fail paramless',
      test_label: 'Blenders Fail paramless',
      test_parent: '.../sibling steps folder 1/my_features/outline/outline_mixed_no_skip.feature',
      test_uri: '.../sibling steps folder 1/my_features/outline/outline_mixed_no_skip.feature'
    }),

    new TestResult({
      scenario_featureName: 'Mixed outline',
      scenario_featureFileRelativePath: 'my_features/outline/outline_mixed_no_skip.feature',
      scenario_getLabel: 'Blenders Success "<thing>"',
      scenario_isOutline: true,
      scenario_result: 'passed',
      scenario_scenarioName: 'Blenders Success "<thing>"',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../sibling steps folder 1/my_features/outline/outline_mixed_no_skip.feature/Blenders Success "<thing>"',
      test_label: 'Blenders Success "<thing>"',
      test_parent: '.../sibling steps folder 1/my_features/outline/outline_mixed_no_skip.feature',
      test_uri: '.../sibling steps folder 1/my_features/outline/outline_mixed_no_skip.feature'
    }),

    new TestResult({
      scenario_featureName: 'Table feature',
      scenario_featureFileRelativePath: 'my_features/table/table.feature',
      scenario_getLabel: 'Use a table (success)',
      scenario_isOutline: false,
      scenario_result: 'passed',
      scenario_scenarioName: 'Use a table (success)',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../sibling steps folder 1/my_features/table/table.feature/Use a table (success)',
      test_label: 'Use a table (success)',
      test_parent: '.../sibling steps folder 1/my_features/table/table.feature',
      test_uri: '.../sibling steps folder 1/my_features/table/table.feature'
    }),

    new TestResult({
      scenario_featureName: 'Table feature',
      scenario_featureFileRelativePath: 'my_features/table/table.feature',
      scenario_getLabel: 'Use a table (fail)',
      scenario_isOutline: false,
      scenario_result: 'failed',
      scenario_scenarioName: 'Use a table (fail)',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../sibling steps folder 1/my_features/table/table.feature/Use a table (fail)',
      test_label: 'Use a table (fail)',
      test_parent: '.../sibling steps folder 1/my_features/table/table.feature',
      test_uri: '.../sibling steps folder 1/my_features/table/table.feature'
    }),


  ];



  return expectedResults;
}


