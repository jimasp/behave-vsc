import { ProjParseCounts } from "../../../parsers/fileParser";
import { TestResult } from "../_helpers/common";

export function getExpectedCountsWithBehaveIni(): ProjParseCounts {
  const testCount = getExpectedResultsWithBehaveIni().length;
  return {
    tests: { nodeCount: 14, testCount: testCount },
    featureFilesExceptEmptyOrCommentedOut: 4, stepFilesExceptEmptyOrCommentedOut: 1,
    stepFileStepsExceptCommentedOut: 6, featureFileStepsExceptCommentedOut: 16, stepMappings: 16
  };
}

export const getExpectedResultsWithBehaveIni = (): TestResult[] => {

  const expectedResults: TestResult[] = [

    new TestResult({
      scenario_featureFileRelativePath: 'proj.root.feature',
      scenario_featureName: 'Root feature added via .. in paths',
      scenario_getLabel: 'run a successful test',
      scenario_isOutline: false,
      scenario_result: 'passed',
      scenario_scenarioName: 'run a successful test',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../working dir/proj.root.feature/run a successful test',
      test_label: 'run a successful test',
      test_parent: '.../working dir/proj.root.feature',
      test_uri: '.../working dir/proj.root.feature',
    }),

    new TestResult({
      scenario_featureFileRelativePath: 'working folder/features/work.feature',
      scenario_featureName: 'Work',
      scenario_getLabel: 'run a successful test',
      scenario_isOutline: false,
      scenario_result: 'passed',
      scenario_scenarioName: 'run a successful test',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../working dir/working folder/features/work.feature/run a successful test',
      test_label: 'run a successful test',
      test_parent: '.../working dir/working folder/features/work.feature',
      test_uri: '.../working dir/working folder/features/work.feature'
    }),

    new TestResult({
      scenario_featureFileRelativePath: 'working folder/features/work.feature',
      scenario_featureName: 'Work',
      scenario_getLabel: 'run a failing test',
      scenario_isOutline: false,
      scenario_result: 'failed',
      scenario_scenarioName: 'run a failing test',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../working dir/working folder/features/work.feature/run a failing test',
      test_label: 'run a failing test',
      test_parent: '.../working dir/working folder/features/work.feature',
      test_uri: '.../working dir/working folder/features/work.feature'
    }),

    new TestResult({
      scenario_featureFileRelativePath: 'working folder/features/work.feature',
      scenario_featureName: 'Work',
      scenario_getLabel: 'run a skipped test',
      scenario_isOutline: false,
      scenario_result: 'skipped',
      scenario_scenarioName: 'run a skipped test',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../working dir/working folder/features/work.feature/run a skipped test',
      test_label: 'run a skipped test',
      test_parent: '.../working dir/working folder/features/work.feature',
      test_uri: '.../working dir/working folder/features/work.feature'
    }),

    new TestResult({
      scenario_featureFileRelativePath: 'working folder/features/sub1/sub1.feature',
      scenario_featureName: 'Work sub1',
      scenario_getLabel: 'run a failing test',
      scenario_isOutline: false,
      scenario_result: 'failed',
      scenario_scenarioName: 'run a failing test',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../working dir/working folder/features/sub1/sub1.feature/run a failing test',
      test_label: 'run a failing test',
      test_parent: '.../working dir/working folder/features/sub1/sub1.feature',
      test_uri: '.../working dir/working folder/features/sub1/sub1.feature',
    }),

    new TestResult({
      scenario_featureFileRelativePath: 'working folder/features/sub1/sub2/sub2.feature',
      scenario_featureName: 'Work sub2',
      scenario_getLabel: 'run a successful test',
      scenario_isOutline: false,
      scenario_result: 'passed',
      scenario_scenarioName: 'run a successful test',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../working dir/working folder/features/sub1/sub2/sub2.feature/run a successful test',
      test_label: 'run a successful test',
      test_parent: '.../working dir/working folder/features/sub1/sub2/sub2.feature',
      test_uri: '.../working dir/working folder/features/sub1/sub2/sub2.feature'
    }),

  ];



  return expectedResults;
}


