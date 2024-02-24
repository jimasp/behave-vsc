import { ProjParseCounts } from "../../../parsers/fileParser";
import { TestResult } from "../_helpers/common";

export function getExpectedCountsWith2PathBehaveIni(): ProjParseCounts {
  const testCount = getExpectedResultsWith2PathBehaveIni().length;
  return {
    tests: { nodeCount: 13, testCount: testCount },
    featureFilesExceptEmptyOrCommentedOut: 4, stepFilesExceptEmptyOrCommentedOut: 1,
    stepFileStepsExceptCommentedOut: 6, featureFileStepsExceptCommentedOut: 16, stepMappings: 16
  };
}

export const getExpectedResultsWith2PathBehaveIni = (): TestResult[] => {

  const expectedResults: TestResult[] = [

    new TestResult({
      scenario_featureFileRelativePath: 'working folder/work.root.feature',
      scenario_featureName: 'Work root feature',
      scenario_getLabel: 'run a successful test',
      scenario_isOutline: false,
      scenario_result: 'passed',
      scenario_scenarioName: 'run a successful test',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../working dir/working folder/work.root.feature/run a successful test',
      test_label: 'run a successful test',
      test_parent: '.../working dir/working folder/work.root.feature',
      test_uri: '.../working dir/working folder/work.root.feature',
    }),

    new TestResult({
      scenario_featureFileRelativePath: 'working folder/features/work.features.feature',
      scenario_featureName: 'Work',
      scenario_getLabel: 'run a successful test',
      scenario_isOutline: false,
      scenario_result: 'passed',
      scenario_scenarioName: 'run a successful test',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../working dir/working folder/features/work.features.feature/run a successful test',
      test_label: 'run a successful test',
      test_parent: '.../working dir/working folder/features/work.features.feature',
      test_uri: '.../working dir/working folder/features/work.features.feature'
    }),

    new TestResult({
      scenario_featureFileRelativePath: 'working folder/features/work.features.feature',
      scenario_featureName: 'Work',
      scenario_getLabel: 'run a failing test',
      scenario_isOutline: false,
      scenario_result: 'failed',
      scenario_scenarioName: 'run a failing test',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../working dir/working folder/features/work.features.feature/run a failing test',
      test_label: 'run a failing test',
      test_parent: '.../working dir/working folder/features/work.features.feature',
      test_uri: '.../working dir/working folder/features/work.features.feature'
    }),

    new TestResult({
      scenario_featureFileRelativePath: 'working folder/features/work.features.feature',
      scenario_featureName: 'Work',
      scenario_getLabel: 'run a skipped test',
      scenario_isOutline: false,
      scenario_result: 'skipped',
      scenario_scenarioName: 'run a skipped test',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../working dir/working folder/features/work.features.feature/run a skipped test',
      test_label: 'run a skipped test',
      test_parent: '.../working dir/working folder/features/work.features.feature',
      test_uri: '.../working dir/working folder/features/work.features.feature'
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


