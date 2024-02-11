import { Expectations, TestBehaveIni } from "../_helpers/common";
import { getExpectedCounts, getExpectedResults } from "./expectedResults"


export const expectations: Expectations = {
  expectedProjRelativeBehaveWorkingDirPath: "",
  expectedBaseDirPath: "",
  expectedProjRelativeFeatureFolders: ["my_features"],
  expectedProjRelativeStepsFolders: ["steps"],
  getExpectedCountsFunc: getExpectedCounts,
  getExpectedResultsFunc: getExpectedResults,
}


export const behaveIni: TestBehaveIni = {
  content: `[behave]\npaths=my_features`
}





