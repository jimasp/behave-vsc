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
  expectedProjectRelativeBaseDirPath: "behave tests/some tests",
  expectedProjectRelativeConfigPaths: ["behave tests/some tests"],
  expectedProjectRelativeFeatureFolders: ["behave tests/some tests"],
  expectedProjectRelativeStepsFolders: ["behave tests/some tests/steps"],
  getExpectedCountsFunc: getExpectedCounts,
  getExpectedResultsFunc: getExpectedResults,
}