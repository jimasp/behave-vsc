import { ConfigOptions, Expectations, RunOptions } from "../suite-helpers/testWorkspaceRunners";
import { getExpectedCounts, getExpectedResults } from "./expectedResults";

export const configOptions: ConfigOptions = {
  envVarOverrides: undefined,
  runProfiles: undefined,
  stepLibraries: [
    {
      "relativePath": "features",
      "stepFilesRx": ".*/steps/.*"
    }
  ]
};

export const runOptions: RunOptions = {
  selectedRunProfile: undefined
}

export const expectations: Expectations = {
  expectedProjectRelativeBaseDirPath: "features",
  expectedProjectRelativeConfigPaths: ["features"],
  expectedProjectRelativeFeatureFolders: ["features"],
  expectedProjectRelativeStepsFolders: ["features", "features/steps"], // "features" is because of stepLibraries
  getExpectedCountsFunc: getExpectedCounts,
  getExpectedResultsFunc: getExpectedResults,
}