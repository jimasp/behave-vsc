import { ConfigOptions, Expectations, RunOptions } from "../suite-helpers/testWorkspaceRunners";
import { getExpectedCounts, getExpectedResults } from "./expectedResults";


export const configOptions: ConfigOptions = {
  envVarOverrides: undefined,
  runProfiles: undefined,
  stepLibraries: undefined
};

export const runOptions: RunOptions = {
  selectedRunProfile: undefined
}

export const expectations: Expectations = {
  expectedProjectRelativeBaseDirPath: "",
  expectedProjectRelativeConfigPaths: ["subfolder/features"],
  expectedProjectRelativeFeatureFolders: ["subfolder/features"],
  expectedProjectRelativeStepsFolders: ["steps"],
  getExpectedCountsFunc: getExpectedCounts,
  getExpectedResultsFunc: getExpectedResults,
}
