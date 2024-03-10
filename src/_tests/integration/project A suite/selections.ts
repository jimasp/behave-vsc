import { Selection } from '../_common/runSelections';

export const selections: Selection[] = [
  {
    title: "1 scenario, should execute cmd with 1 scenario",
    selection: ["example-projects/project A/behave tests/some tests/group1_features/basic.feature/run a successful test"],
    expectedFeatureRegEx: 'behave tests/some tests/group1_features/basic.feature$',
    expectedScenarioRegEx: '^run a successful test\\$',
  },
  {
    title: "2 scenarios, should execute cmd with 2 scenarios",
    selection: [
      "example-projects/project A/behave tests/some tests/group1_features/basic.feature/run a successful test",
      "example-projects/project A/behave tests/some tests/group1_features/basic.feature/run a failing test"
    ],
    expectedFeatureRegEx: 'behave tests/some tests/group1_features/basic.feature$',
    expectedScenarioRegEx: '^run a failing test\\$|^run a successful test\\$',
  },
  {
    title: "1 feature, should execute cmd with 1 feature",
    selection: ["example-projects/project A/behave tests/some tests/nested1/nested2/nested3/nested3.1.feature"],
    expectedFeatureRegEx: 'behave tests/some tests/nested1/nested2/nested3/nested3.1.feature$',
    expectedScenarioRegEx: '',
  },
  {
    title: "2 features selected, should execute cmd with 2 features",
    selection: [
      "example-projects/project A/behave tests/some tests/nested1/nested2/nested3/nested3.1.feature",
      "example-projects/project A/behave tests/some tests/nested1/nested2/nested3/nested3.2.feature"
    ],
    expectedFeatureRegEx: 'behave tests/some tests/nested1/nested2/nested3/nested3.1.feature$|behave tests/some tests/nested1/nested2/nested3/nested3.2.feature$',
    expectedScenarioRegEx: "",
  },
  {
    title: "all features selected in top-level folder, should execute cmd with features (because nested folders are not selected)",
    selection: [
      "example-projects/project A/behave tests/some tests/nested1/nested1.1.feature",
      "example-projects/project A/behave tests/some tests/nested1/nested1.2.feature",
      "example-projects/project A/behave tests/some tests/nested1/nested1.3.feature",
    ],
    expectedFeatureRegEx: 'behave tests/some tests/nested1/nested1.1.feature$|behave tests/some tests/nested1/nested1.2.feature$|behave tests/some tests/nested1/nested1.3.feature$',
    expectedScenarioRegEx: "",
  },
  {
    title: "single feature, all scenarios selected, should execute cmd with feature",
    selection: [
      "example-projects/project A/behave tests/some tests/nested1/nested2/nested3/nested3.1.feature/success",
      "example-projects/project A/behave tests/some tests/nested1/nested2/nested3/nested3.1.feature/failure"
    ],
    expectedFeatureRegEx: 'behave tests/some tests/nested1/nested2/nested3/nested3.1.feature$',
    expectedScenarioRegEx: "",
  },
  {
    title: "single folder selected, should execute cmd with folder",
    selection: ["example-projects/project A/behave tests/some tests/nested1/nested2"],
    expectedFeatureRegEx: 'behave tests/some tests/nested1/nested2/',
    expectedScenarioRegEx: "",
  },
  {
    title: "only feature in folder, should execute cmd with folder",
    selection: ["example-projects/project A/behave tests/some tests/nested1/nested2/nested3a/nested3a.feature"],
    expectedFeatureRegEx: 'behave tests/some tests/nested1/nested2/nested3a/',
    expectedScenarioRegEx: "",
  },
  {
    title: "3 folders (parent \"nested2\" is not run because it does not include parent folder feature children), should execute cmd with 3 folders",
    selection: [
      "example-projects/project A/behave tests/some tests/nested1/nested2/nested3",
      "example-projects/project A/behave tests/some tests/nested1/nested2/nested3a",
      "example-projects/project A/behave tests/some tests/nested1/nested2/nested3b",
    ],
    expectedFeatureRegEx: 'behave tests/some tests/nested1/nested2/nested3/|behave tests/some tests/nested1/nested2/nested3a/|behave tests/some tests/nested1/nested2/nested3b/',
    expectedScenarioRegEx: "",
  },
  {
    title: "2 scenarios that are the sole scenario in the feature and a single feature selected from a folder, should execute cmd with 3 folders",
    selection: [
      "example-projects/project A/behave tests/some tests/nested1/nested2/nested3b/nested3b.feature/failure",
      "example-projects/project A/behave tests/some tests/nested1/nested2/nested3a/nested3a.feature/success",
      "example-projects/project A/behave tests/some tests/nested1/nested2/nested3"
    ],
    expectedFeatureRegEx: 'behave tests/some tests/nested1/nested2/nested3/|behave tests/some tests/nested1/nested2/nested3a/|behave tests/some tests/nested1/nested2/nested3b/',
    expectedScenarioRegEx: "",
  },
  {
    title: "all folders and features in parent folder, should execute cmd with parent folder",
    selection: [
      "example-projects/project A/behave tests/some tests/nested1/nested2/nested3",
      "example-projects/project A/behave tests/some tests/nested1/nested2/nested3a/nested3a.feature/success",
      "example-projects/project A/behave tests/some tests/nested1/nested2/nested3b/nested3b.feature/failure",
      "example-projects/project A/behave tests/some tests/nested1/nested2/nested2.1.feature",
      "example-projects/project A/behave tests/some tests/nested1/nested2/nested2.2.feature",
      "example-projects/project A/behave tests/some tests/nested1/nested2/nested2.3.feature"
    ],
    expectedFeatureRegEx: 'behave tests/some tests/nested1/nested2/',
    expectedScenarioRegEx: "",
  },
  {
    title: "2 folders and a 1 feature which is the only feature in a folder, should execute cmd with 3 folders",
    selection: [
      "example-projects/project A/behave tests/some tests/nested1/nested2/nested3",
      "example-projects/project A/behave tests/some tests/nested1/nested2/nested3a",
      "example-projects/project A/behave tests/some tests/nested1/nested2/nested3b/nested3b.feature",
    ],
    expectedFeatureRegEx: 'behave tests/some tests/nested1/nested2/nested3/|behave tests/some tests/nested1/nested2/nested3a/|behave tests/some tests/nested1/nested2/nested3b/',
    expectedScenarioRegEx: "",
  },
  {
    title: "all folders and features in parent folder selected but using a single feature/scenario selected from a folder with one feature/scenario, should execute cmd with parent folder",
    selection: [
      "example-projects/project A/behave tests/some tests/nested1/nested2/nested3b/nested3b.feature/failure",
      "example-projects/project A/behave tests/some tests/nested1/nested2/nested3a/nested3a.feature/success",
      "example-projects/project A/behave tests/some tests/nested1/nested2/nested3",
      "example-projects/project A/behave tests/some tests/nested1/nested2/nested2.1.feature",
      "example-projects/project A/behave tests/some tests/nested1/nested2/nested2.2.feature",
      "example-projects/project A/behave tests/some tests/nested1/nested2/nested2.3.feature"
    ],
    expectedFeatureRegEx: 'behave tests/some tests/nested1/nested2/',
    expectedScenarioRegEx: "",
  },
  {
    title: "all scenarios from a folder selected should execute cmd with that folder",
    selection: [
      "example-projects/project A/behave tests/some tests/nested1/nested2/nested3/nested3.3.feature/skipped-by-feature",
      "example-projects/project A/behave tests/some tests/nested1/nested2/nested3/nested3.2.feature/skipped",
      "example-projects/project A/behave tests/some tests/nested1/nested2/nested3/nested3.2.feature/failure",
      "example-projects/project A/behave tests/some tests/nested1/nested2/nested3/nested3.1.feature/failure",
      "example-projects/project A/behave tests/some tests/nested1/nested2/nested3/nested3.1.feature/success"
    ],
    expectedFeatureRegEx: 'behave tests/some tests/nested1/nested2/nested3/',
    expectedScenarioRegEx: "",
  },
  {
    title: "all scenarios from a folder selected should execute cmd with that folder",
    selection: [
      "example-projects/project A/behave tests/some tests/nested1/nested2/nested3/nested3.3.feature/skipped-by-feature",
      "example-projects/project A/behave tests/some tests/nested1/nested2/nested3/nested3.2.feature/skipped",
      "example-projects/project A/behave tests/some tests/nested1/nested2/nested3/nested3.2.feature/failure",
      "example-projects/project A/behave tests/some tests/nested1/nested2/nested3/nested3.1.feature/failure",
      "example-projects/project A/behave tests/some tests/nested1/nested2/nested3/nested3.1.feature/success",
      "example-projects/project A/behave tests/some tests/nested1/nested2/nested3a/nested3a.feature/success",
      "example-projects/project A/behave tests/some tests/nested1/nested2/nested3b/nested3b.feature/failure",
      "example-projects/project A/behave tests/some tests/nested1/nested2/nested2.1.feature/success",
      "example-projects/project A/behave tests/some tests/nested1/nested2/nested2.2.feature/failure",
      "example-projects/project A/behave tests/some tests/nested1/nested2/nested2.3.feature/skipped-by-feature",
      "example-projects/project A/behave tests/some tests/nested1/nested1.1.feature/success",
      "example-projects/project A/behave tests/some tests/nested1/nested1.1.feature/failure",
      "example-projects/project A/behave tests/some tests/nested1/nested1.2.feature/failure",
      "example-projects/project A/behave tests/some tests/nested1/nested1.2.feature/skipped",
      "example-projects/project A/behave tests/some tests/nested1/nested1.3.feature/skipped-by-feature"
    ],
    expectedFeatureRegEx: 'behave tests/some tests/nested1/',
    expectedScenarioRegEx: "",
  },
  {
    title: "special chars \"",
    selection: ["example-projects/project A/behave tests/some tests/special_characters.feature/run a successful rx scenario = \""],
    expectedFeatureRegEx: 'behave tests/some tests/special_characters.feature$',
    expectedScenarioRegEx: '^run a successful rx scenario = \\"\\$',
  },
  {
    title: "special chars '",
    selection: ["example-projects/project A/behave tests/some tests/special_characters.feature/run a successful rx scenario = '"],
    expectedFeatureRegEx: 'behave tests/some tests/special_characters.feature$',
    expectedScenarioRegEx: "^run a successful rx scenario = '\\$",
  },
  {
    title: "special chars `",
    selection: ["example-projects/project A/behave tests/some tests/special_characters.feature/run a successful rx scenario = `"],
    expectedFeatureRegEx: 'behave tests/some tests/special_characters.feature$',
    expectedScenarioRegEx: "^run a successful rx scenario = \\`\\$",
  },
  {
    title: "special chars \\",
    selection: ["example-projects/project A/behave tests/some tests/special_characters.feature/run a successful rx scenario = \\"],
    expectedFeatureRegEx: 'behave tests/some tests/special_characters.feature$',
    expectedScenarioRegEx: "^run a successful rx scenario = \\\\\\\\\\$",
  },
  {
    title: "special chars $",
    selection: ["example-projects/project A/behave tests/some tests/special_characters.feature/run a successful rx scenario = $"],
    expectedFeatureRegEx: 'behave tests/some tests/special_characters.feature$',
    expectedScenarioRegEx: "^run a successful rx scenario = \\\\$\\$",
  },
  {
    title: "special chars $$",
    selection: ["example-projects/project A/behave tests/some tests/special_characters.feature/run a successful rx scenario = $$"],
    expectedFeatureRegEx: 'behave tests/some tests/special_characters.feature$',
    expectedScenarioRegEx: "^run a successful rx scenario = \\\\$\\\\$\\$",
  },
  {
    title: "special chars \\$",
    selection: ["example-projects/project A/behave tests/some tests/special_characters.feature/run a successful rx scenario = \\$"],
    expectedFeatureRegEx: 'behave tests/some tests/special_characters.feature$',
    expectedScenarioRegEx: "^run a successful rx scenario = \\\\\\\\\\\\$\\$",
  },
  {
    title: "special chars \\\\$\\$",
    selection: ["example-projects/project A/behave tests/some tests/special_characters.feature/run a successful rx scenario = \\\\$\\$"],
    expectedFeatureRegEx: 'behave tests/some tests/special_characters.feature$',
    expectedScenarioRegEx: "^run a successful rx scenario = \\\\\\\\\\\\\\\\\\\\$\\\\\\\\\\\\$\\$",
  },
  {
    title: "special chars !",
    selection: ["example-projects/project A/behave tests/some tests/special_characters.feature/run a successful rx scenario = !"],
    expectedFeatureRegEx: 'behave tests/some tests/special_characters.feature$',
    expectedScenarioRegEx: "^run a successful rx scenario = \\!\\$",
  },
  {
    title: "special chars #",
    selection: ["example-projects/project A/behave tests/some tests/special_characters.feature/run a successful rx scenario = #"],
    expectedFeatureRegEx: 'behave tests/some tests/special_characters.feature$',
    expectedScenarioRegEx: "^run a successful rx scenario = #\\$",
  },
  {
    title: "special chars [\\=",
    selection: ["example-projects/project A/behave tests/some tests/special_characters.feature/run a successful rx scenario = [\\="],
    expectedFeatureRegEx: 'behave tests/some tests/special_characters.feature$',
    expectedScenarioRegEx: "^run a successful rx scenario = \\[\\\\\\\\=\\$",
  },
  {
    title: "special chars [\\]$\\!$",
    selection: ["example-projects/project A/behave tests/some tests/special_characters.feature/run a successful rx scenario = [\\]$\\!$"],
    expectedFeatureRegEx: 'behave tests/some tests/special_characters.feature$',
    expectedScenarioRegEx: "^run a successful rx scenario = \\[\\\\\\\\\\]\\\\$\\\\\\\\\\!\\\\$\\$",
  },
  {
    title: "special chars /[.*+?^${}()|[\\]$",
    selection: ["example-projects/project A/behave tests/some tests/special_characters.feature/run a successful rx scenario = /[.*+?^${}()|[\\]$"],
    expectedFeatureRegEx: 'behave tests/some tests/special_characters.feature$',
    expectedScenarioRegEx: "^run a successful rx scenario = /\\[\\.\\*\\+\\?\\^\\\\$\\{\\}\\(\\)\\|\\[\\\\\\\\\\]\\\\$\\$",
  },
  {
    title: "special chars [\\=\"'!@#$%^&*()_-+`~,./<>?{}|]",
    selection: ["example-projects/project A/behave tests/some tests/special_characters.feature/run a successful rx scenario = [\\=\"'!@#$%^&*()_-+`~,./<>?{}|]"],
    expectedFeatureRegEx: 'behave tests/some tests/special_characters.feature$',
    expectedScenarioRegEx: "^run a successful rx scenario = \\[\\\\\\\\=\\\"'\\!@#\\\\$%\\^&\\*\\(\\)_-\\+\\`~,\\./<>\\?\\{\\}\\|\\]\\$",
  },

];
