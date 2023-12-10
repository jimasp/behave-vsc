import { TestWorkspaceConfig } from "../suite-helpers/testWorkspaceConfig";
import { Expectations } from "../suite-helpers/testWorkspaceRunners";
import { getExpectedCounts, getExpectedResults } from "./expectedResults"


export const wsConfig = new TestWorkspaceConfig({
  importedSteps: {
    "folder1/steps_lib_1 ": ".*/steps/.*",
    "folder2\\steps_lib_2": ".*\\steps\\.*|more_steps\\.*|.*\\steps2.py|.*\\steps3.py"
  }
});


export const expectations: Expectations = {
  expectedProjectRelativeBaseDirPath: "features",
  expectedProjectRelativeConfigPaths: ["features"],
  expectedProjectRelativeFeatureFolders: ["features"],
  expectedProjectRelativeStepsFolders: ["folder1/steps_lib_1", "folder2/steps_lib_2", "features/steps"], // order is important
  getExpectedCountsFunc: getExpectedCounts,
  getExpectedResultsFunc: getExpectedResults,
}