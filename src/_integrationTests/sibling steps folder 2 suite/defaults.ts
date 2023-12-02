import { ConfigOptions, RunOptions } from "../suite-helpers/testWorkspaceRunners"
import { getExpectedCounts, getExpectedResults } from "./expectedResults"


export const configOptions: ConfigOptions = {
  envVarOverrides: undefined,
  runProfiles: undefined,
  stepLibraries: undefined
}

export const runOptions: RunOptions = {
  selectedRunProfile: undefined
}

export const expectations = {
  expectedProjectRelativeBaseDirPath: "subfolder 1/subfolder 2",
  expectedProjectRelativeConfigPaths: ["subfolder 1/subfolder 2/features", "subfolder 1/features2"],
  expectedProjectRelativeFeatureFolders: ["subfolder 1/subfolder 2/features", "subfolder 1/features2"],
  expectedProjectRelativeStepsFolders: ["subfolder 1/subfolder 2/steps"],
  getExpectedCountsFunc: getExpectedCounts,
  getExpectedResultsFunc: getExpectedResults,
}
