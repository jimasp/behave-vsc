import { Expectations } from "../_helpers/common";
import { getExpectedCounts, getExpectedResults } from "./expectedResults";


export const expectations: Expectations = {
  expectedProjectRelativeWorkingDirPath: "",
  expectedProjectRelativeBaseDirPath: "",
  expectedProjectRelativeConfigPaths: ["subfolder/features"],
  expectedProjectRelativeFeatureFolders: ["subfolder/features"],
  expectedProjectRelativeStepsFolders: ["steps"],
  getExpectedCountsFunc: getExpectedCounts,
  getExpectedResultsFunc: getExpectedResults,
}

export const behaveIni = `[behave]\npaths=${expectations.expectedProjectRelativeFeatureFolders.join("\n\t")}`;