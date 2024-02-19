import { Expectations, TestBehaveIni } from "../_helpers/common"
import { getExpectedCounts, getExpectedResults } from "./expectedResults"


export const expectations: Expectations = {
  expectedProjRelativeBehaveWorkingDirPath: "",
  expectedBaseDirPath: "",
  expectedProjRelativeFeatureFolders: ["features", "features2"],
  expectedProjRelativeStepsFolders: ["steps"],
  getExpectedCountsFunc: getExpectedCounts,
  getExpectedResultsFunc: getExpectedResults,
}


export const behaveIni: TestBehaveIni = {
  content: `[behave]\npaths=features\n\tfeatures2`
}



