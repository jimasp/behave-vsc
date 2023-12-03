import { TestWorkspaceConfig } from "../suite-helpers/testWorkspaceConfig";
import { Expectations } from "../suite-helpers/testWorkspaceRunners";
import { getExpectedCounts, getExpectedResults } from "./expectedResults";


const stepLibraries = [
  {
    "relativePath": "features",
    "stepFilesRx": ".*/steps/.*"
  }
]

export const wsConfig = new TestWorkspaceConfig({
  stepLibraries: stepLibraries
});

export const wsConfigParallel = new TestWorkspaceConfig({
  stepLibraries: stepLibraries,
  runParallel: true
});

export const expectations: Expectations = {
  expectedProjectRelativeBaseDirPath: "features",
  expectedProjectRelativeConfigPaths: ["features"],
  expectedProjectRelativeFeatureFolders: ["features"],
  expectedProjectRelativeStepsFolders: ["features", "features/steps"], // "features" is because of stepLibraries
  getExpectedCountsFunc: getExpectedCounts,
  getExpectedResultsFunc: getExpectedResults,
}