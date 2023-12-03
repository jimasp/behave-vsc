import { TestWorkspaceConfig } from "../suite-helpers/testWorkspaceConfig";
import { getExpectedCounts, getExpectedResults } from "./expectedResults"


export const wsConfig = new TestWorkspaceConfig({
  stepLibraries: [
    {
      "relativePath": "folder1/steps_lib_1 ",
      "stepFilesRx": ".*/steps/.*"
    },
    {
      "relativePath": "folder2\\steps_lib_2",
      "stepFilesRx": ".*\\steps\\.*|more_steps\\.*|.*\\steps2.py|.*\\steps3.py",
    }
  ]
});


export const expectations = {
  expectedProjectRelativeBaseDirPath: "features",
  expectedProjectRelativeConfigPaths: ["features"],
  expectedProjectRelativeFeatureFolders: ["features"],
  expectedProjectRelativeStepsFolders: ["folder1/steps_lib_1", "folder2/steps_lib_2", "features/steps"], // order is important
  getExpectedCountsFunc: getExpectedCounts,
  getExpectedResultsFunc: getExpectedResults,
}
