import { ProjParseCounts } from "../../parsers/fileParser";
import { TestResult } from "../suite-helpers/expectedResults.helpers";

export function getExpectedCounts(): ProjParseCounts {
  const testCount = getExpectedResults().length;
  return {
    tests: { nodeCount: 21, testCount: testCount },
    featureFilesExceptEmptyOrCommentedOut: 4, stepFilesExceptEmptyOrCommentedOut: 3,
    stepFileStepsExceptCommentedOut: 13, featureFileStepsExceptCommentedOut: 39, stepMappings: 39
  };
}

export const getExpectedResults = (): TestResult[] => {

  const expectedResults: TestResult[] = [

    new TestResult({
      scenario_featureName: 'Another',
      scenario_featureFileRelativePath: 'subfolder 1/subfolder 2/features/more/another.feature',
      scenario_getLabel: 'run a successful test',
      scenario_isOutline: false,
      scenario_result: 'passed',
      scenario_scenarioName: 'run a successful test',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../sibling steps folder 2/subfolder 1/subfolder 2/features/more/another.feature/run a successful test',
      test_label: 'run a successful test',
      test_parent: '.../sibling steps folder 2/subfolder 1/subfolder 2/features/more/another.feature',
      test_uri: '.../sibling steps folder 2/subfolder 1/subfolder 2/features/more/another.feature'
    }),

    new TestResult({
      scenario_featureName: 'Another',
      scenario_featureFileRelativePath: 'subfolder 1/subfolder 2/features/more/another.feature',
      scenario_getLabel: 'run a failing test',
      scenario_isOutline: false,
      scenario_result: 'failed',
      scenario_scenarioName: 'run a failing test',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../sibling steps folder 2/subfolder 1/subfolder 2/features/more/another.feature/run a failing test',
      test_label: 'run a failing test',
      test_parent: '.../sibling steps folder 2/subfolder 1/subfolder 2/features/more/another.feature',
      test_uri: '.../sibling steps folder 2/subfolder 1/subfolder 2/features/more/another.feature'
    }),

    new TestResult({
      scenario_featureName: 'Another',
      scenario_featureFileRelativePath: 'subfolder 1/subfolder 2/features/more/another.feature',
      scenario_getLabel: 'run a skipped test',
      scenario_isOutline: false,
      scenario_result: 'skipped',
      scenario_scenarioName: 'run a skipped test',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../sibling steps folder 2/subfolder 1/subfolder 2/features/more/another.feature/run a skipped test',
      test_label: 'run a skipped test',
      test_parent: '.../sibling steps folder 2/subfolder 1/subfolder 2/features/more/another.feature',
      test_uri: '.../sibling steps folder 2/subfolder 1/subfolder 2/features/more/another.feature'
    }),

    new TestResult({
      scenario_featureFileRelativePath: 'subfolder 1/features2/basic.feature',
      scenario_featureName: 'Basic',
      scenario_getLabel: 'run a successful test',
      scenario_isOutline: false,
      scenario_result: 'passed',
      scenario_scenarioName: 'run a successful test',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../sibling steps folder 2/subfolder 1/features2/basic.feature/run a successful test',
      test_label: 'run a successful test',
      test_parent: '.../sibling steps folder 2/subfolder 1/features2/basic.feature',
      test_uri: '.../sibling steps folder 2/subfolder 1/features2/basic.feature'
    }),

    new TestResult({
      scenario_featureFileRelativePath: 'subfolder 1/features2/basic.feature',
      scenario_featureName: 'Basic',
      scenario_getLabel: 'run a failing test',
      scenario_isOutline: false,
      scenario_result: 'failed',
      scenario_scenarioName: 'run a failing test',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../sibling steps folder 2/subfolder 1/features2/basic.feature/run a failing test',
      test_label: 'run a failing test',
      test_parent: '.../sibling steps folder 2/subfolder 1/features2/basic.feature',
      test_uri: '.../sibling steps folder 2/subfolder 1/features2/basic.feature'
    }),

    new TestResult({
      scenario_featureFileRelativePath: 'subfolder 1/features2/basic.feature',
      scenario_featureName: 'Basic',
      scenario_getLabel: 'run a skipped test',
      scenario_isOutline: false,
      scenario_result: 'skipped',
      scenario_scenarioName: 'run a skipped test',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../sibling steps folder 2/subfolder 1/features2/basic.feature/run a skipped test',
      test_label: 'run a skipped test',
      test_parent: '.../sibling steps folder 2/subfolder 1/features2/basic.feature',
      test_uri: '.../sibling steps folder 2/subfolder 1/features2/basic.feature'
    }),

    new TestResult({
      scenario_featureName: 'Mixed outline',
      scenario_featureFileRelativePath: 'subfolder 1/subfolder 2/features/outline_mixed.feature',
      scenario_getLabel: 'Blenders Success <thing>',
      scenario_isOutline: true,
      scenario_result: 'passed',
      scenario_scenarioName: 'Blenders Success <thing>',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../sibling steps folder 2/subfolder 1/subfolder 2/features/outline_mixed.feature/Blenders Success <thing>',
      test_label: 'Blenders Success <thing>',
      test_parent: '.../sibling steps folder 2/subfolder 1/subfolder 2/features/outline_mixed.feature',
      test_uri: '.../sibling steps folder 2/subfolder 1/subfolder 2/features/outline_mixed.feature'
    }),

    new TestResult({
      scenario_featureName: 'Mixed outline',
      scenario_featureFileRelativePath: 'subfolder 1/subfolder 2/features/outline_mixed.feature',
      scenario_getLabel: 'Blenders Fail <thing>',
      scenario_isOutline: true,
      scenario_result: 'failed',
      scenario_scenarioName: 'Blenders Fail <thing>',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../sibling steps folder 2/subfolder 1/subfolder 2/features/outline_mixed.feature/Blenders Fail <thing>',
      test_label: 'Blenders Fail <thing>',
      test_parent: '.../sibling steps folder 2/subfolder 1/subfolder 2/features/outline_mixed.feature',
      test_uri: '.../sibling steps folder 2/subfolder 1/subfolder 2/features/outline_mixed.feature'
    }),

    new TestResult({
      scenario_featureName: 'Mixed outline',
      scenario_featureFileRelativePath: 'subfolder 1/subfolder 2/features/outline_mixed.feature',
      scenario_getLabel: 'Blenders Skip <thing>',
      scenario_isOutline: true,
      scenario_result: 'skipped',
      scenario_scenarioName: 'Blenders Skip <thing>',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../sibling steps folder 2/subfolder 1/subfolder 2/features/outline_mixed.feature/Blenders Skip <thing>',
      test_label: 'Blenders Skip <thing>',
      test_parent: '.../sibling steps folder 2/subfolder 1/subfolder 2/features/outline_mixed.feature',
      test_uri: '.../sibling steps folder 2/subfolder 1/subfolder 2/features/outline_mixed.feature'
    }),

    new TestResult({
      scenario_featureFileRelativePath: 'behave tests/some tests/outline_mixed.feature',
      scenario_featureName: 'Mixed outline',
      scenario_getLabel: 'Blenders Success paramless',
      scenario_isOutline: true,
      scenario_result: 'passed',
      scenario_scenarioName: 'Blenders Success paramless',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../sibling steps folder 2/subfolder 1/subfolder 2/features/outline_mixed.feature/Blenders Success paramless',
      test_label: 'Blenders Success paramless',
      test_parent: '.../sibling steps folder 2/subfolder 1/subfolder 2/features/outline_mixed.feature',
      test_uri: '.../sibling steps folder 2/subfolder 1/subfolder 2/features/outline_mixed.feature'
    }),

    new TestResult({
      scenario_featureName: 'Mixed outline',
      scenario_featureFileRelativePath: 'subfolder 1/subfolder 2/features/outline_mixed.feature',
      scenario_getLabel: 'Blenders Fail paramless',
      scenario_isOutline: true,
      scenario_result: 'failed',
      scenario_scenarioName: 'Blenders Fail paramless',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../sibling steps folder 2/subfolder 1/subfolder 2/features/outline_mixed.feature/Blenders Fail paramless',
      test_label: 'Blenders Fail paramless',
      test_parent: '.../sibling steps folder 2/subfolder 1/subfolder 2/features/outline_mixed.feature',
      test_uri: '.../sibling steps folder 2/subfolder 1/subfolder 2/features/outline_mixed.feature'
    }),

    new TestResult({
      scenario_featureName: 'Mixed outline',
      scenario_featureFileRelativePath: 'subfolder 1/subfolder 2/features/outline_mixed.feature',
      scenario_getLabel: 'Blenders Success "<thing>"',
      scenario_isOutline: true,
      scenario_result: 'passed',
      scenario_scenarioName: 'Blenders Success "<thing>"',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../sibling steps folder 2/subfolder 1/subfolder 2/features/outline_mixed.feature/Blenders Success "<thing>"',
      test_label: 'Blenders Success "<thing>"',
      test_parent: '.../sibling steps folder 2/subfolder 1/subfolder 2/features/outline_mixed.feature',
      test_uri: '.../sibling steps folder 2/subfolder 1/subfolder 2/features/outline_mixed.feature'
    }),

    new TestResult({
      scenario_featureName: 'Table feature',
      scenario_featureFileRelativePath: 'subfolder 1/subfolder 2/features/table.feature',
      scenario_getLabel: 'Use a table (success)',
      scenario_isOutline: false,
      scenario_result: 'passed',
      scenario_scenarioName: 'Use a table (success)',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../sibling steps folder 2/subfolder 1/subfolder 2/features/table.feature/Use a table (success)',
      test_label: 'Use a table (success)',
      test_parent: '.../sibling steps folder 2/subfolder 1/subfolder 2/features/table.feature',
      test_uri: '.../sibling steps folder 2/subfolder 1/subfolder 2/features/table.feature'
    }),

    new TestResult({
      scenario_featureName: 'Table feature',
      scenario_featureFileRelativePath: 'subfolder 1/subfolder 2/features/table.feature',
      scenario_getLabel: 'Use a table (fail)',
      scenario_isOutline: false,
      scenario_result: 'failed',
      scenario_scenarioName: 'Use a table (fail)',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../sibling steps folder 2/subfolder 1/subfolder 2/features/table.feature/Use a table (fail)',
      test_label: 'Use a table (fail)',
      test_parent: '.../sibling steps folder 2/subfolder 1/subfolder 2/features/table.feature',
      test_uri: '.../sibling steps folder 2/subfolder 1/subfolder 2/features/table.feature'
    }),


  ];



  return expectedResults;
}


