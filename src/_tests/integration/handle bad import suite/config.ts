import { Expectations, TestBehaveIni } from "../_common/types";
import { getExpectedCounts, getExpectedResults } from "./expectedResults"


export const expectations: Expectations = {
  expectedRawBehaveConfigPaths: [],
  expectedProjRelativeBehaveWorkingDirPath: ".",
  expectedBaseDirPath: "features",
  expectedProjRelativeFeatureFolders: ["features"],
  expectedProjRelativeStepsFolders: ["features/steps"],
  getExpectedCountsFunc: getExpectedCounts,
  getExpectedResultsFunc: getExpectedResults,
}


export const behaveIni: TestBehaveIni = {
  content: `[behave]\npaths=features`
}
