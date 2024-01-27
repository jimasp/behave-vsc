import { TestWorkspaceConfig } from "../_helpers/testWorkspaceConfig";
import { Expectations, TestBehaveIni } from "../_helpers/common";
import { getExpectedCounts, getExpectedResults } from "./expectedResults"


export const wsConfig = new TestWorkspaceConfig({
  importedSteps: {
    "folder1/steps_lib_1 ": ".*/steps/.*",
    "folder2\\steps_lib_2": ".*\\steps\\.*|more_steps\\.*|.*\\steps2.py|.*\\steps3.py"
  }
});


export const expectations: Expectations = {
  expectedProjectRelativeWorkingDirPath: "",
  expectedProjectRelativeBaseDirPath: "features",
  expectedProjectRelativeFeatureFolders: ["features"],
  expectedProjectRelativeStepsFolders: ["folder1/steps_lib_1", "folder2/steps_lib_2", "features/steps"], // order is important
  getExpectedCountsFunc: getExpectedCounts,
  getExpectedResultsFunc: getExpectedResults,
}

export const behaveIni: TestBehaveIni = {
  content: `[behave]\npaths=features`,
  expectedRelPaths: ["features"]
}
