import { Expectations } from "../_helpers/testProjectRunner"
import { getExpectedCounts, getExpectedResults } from "./expectedResults"


export const expectationsWithoutBehaveIniPaths: Expectations = {
  expectedProjectRelativeBaseDirPath: "",
  expectedProjectRelativeConfigPaths: [""],
  expectedProjectRelativeFeatureFolders: ["my_features"],
  expectedProjectRelativeStepsFolders: ["steps"],
  getExpectedCountsFunc: getExpectedCounts,
  getExpectedResultsFunc: getExpectedResults,
}

export const expectationsWithBehaveIniPaths: Expectations = {
  expectedProjectRelativeBaseDirPath: "",
  expectedProjectRelativeConfigPaths: ["my_features"],
  expectedProjectRelativeFeatureFolders: ["my_features"],
  expectedProjectRelativeStepsFolders: ["steps"],
  getExpectedCountsFunc: getExpectedCounts,
  getExpectedResultsFunc: getExpectedResults,
}

export const behaveIni = `[behave]\npaths=${expectationsWithBehaveIniPaths.expectedProjectRelativeFeatureFolders.join("\n\t")}`;