import { Expectations } from "../_helpers/runners/projectRunner"
import { getExpectedCounts, getExpectedResults } from "./expectedResults"


export const expectationsWithoutBehaveIniPaths: Expectations = {
  expectedProjectRelativeWorkingDirPath: "",
  expectedProjectRelativeBaseDirPath: "",
  expectedProjectRelativeConfigPaths: [""],
  expectedProjectRelativeFeatureFolders: ["features", "features2"],
  expectedProjectRelativeStepsFolders: ["steps"],
  getExpectedCountsFunc: getExpectedCounts,
  getExpectedResultsFunc: getExpectedResults,
}

export const expectationsWithBehaveIniPaths = {
  expectedProjectRelativeWorkingDirPath: "",
  expectedProjectRelativeBaseDirPath: "",
  expectedProjectRelativeConfigPaths: ["features", "features2"],
  expectedProjectRelativeFeatureFolders: ["features", "features2"],
  expectedProjectRelativeStepsFolders: ["steps"],
  getExpectedCountsFunc: getExpectedCounts,
  getExpectedResultsFunc: getExpectedResults,
}

export const behaveIni = `[behave]\npaths=${expectationsWithBehaveIniPaths.expectedProjectRelativeFeatureFolders.join("\n\t")}`;

