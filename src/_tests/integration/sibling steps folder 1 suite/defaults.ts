import { Expectations } from "../_helpers/common";
import { getExpectedCounts, getExpectedResults } from "./expectedResults"


export const expectationsWithoutBehaveIniPaths: Expectations = {
  expectedProjectRelativeWorkingDirPath: "",
  expectedProjectRelativeBaseDirPath: "",
  expectedProjectRelativeConfigPaths: [""],
  expectedProjectRelativeFeatureFolders: ["my_features"],
  expectedProjectRelativeStepsFolders: ["steps"],
  getExpectedCountsFunc: getExpectedCounts,
  getExpectedResultsFunc: getExpectedResults,
}

export const expectationsWithBehaveIniPaths: Expectations = {
  expectedProjectRelativeWorkingDirPath: "",
  expectedProjectRelativeBaseDirPath: "",
  expectedProjectRelativeConfigPaths: ["my_features"],
  expectedProjectRelativeFeatureFolders: ["my_features"],
  expectedProjectRelativeStepsFolders: ["steps"],
  getExpectedCountsFunc: getExpectedCounts,
  getExpectedResultsFunc: getExpectedResults,
}

export const behaveIni = `[behave]\npaths=${expectationsWithBehaveIniPaths.expectedProjectRelativeFeatureFolders.join("\n\t")}`;