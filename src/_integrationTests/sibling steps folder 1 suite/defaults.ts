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
  expectedProjectRelativeBaseDirPath: "",
  expectedProjectRelativeConfigPaths: [""],
  expectedProjectRelativeFeatureFolders: [""], // "" = project root
  expectedProjectRelativeStepsFolders: ["steps"],
  getExpectedCountsFunc: getExpectedCounts,
  getExpectedResultsFunc: getExpectedResults,
}
