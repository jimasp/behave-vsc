import { Expectations, TestBehaveIni } from "../_helpers/common"
import { getExpectedCounts, getExpectedResults } from "./expectedResults"


export const expectations: Expectations = {
  expectedProjectRelativeWorkingDirPath: "",
  expectedProjectRelativeBaseDirPath: "",
  expectedProjectRelativeFeatureFolders: ["features", "features2"],
  expectedProjectRelativeStepsFolders: ["steps"],
  getExpectedCountsFunc: getExpectedCounts,
  getExpectedResultsFunc: getExpectedResults,
}


export const behaveIni: TestBehaveIni = {
  content: `[behave]\npaths=features\n\tfeatures2`,
  expectedRelPaths: ["features", "features2"]
}



