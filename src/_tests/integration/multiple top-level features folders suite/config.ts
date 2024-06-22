import { Expectations, TestBehaveIni } from "../_common/types.js"
import { getExpectedCounts, getExpectedResults } from "./expectedResults.js"


export const expectations: Expectations = {
  expectedRawBehaveConfigPaths: [],
  expectedProjRelativeBehaveWorkingDirPath: ".",
  expectedBaseDirPath: ".",
  expectedProjRelativeFeatureFolders: ["features", "features2"],
  expectedProjRelativeStepsFolders: ["steps"],
  getExpectedCountsFunc: getExpectedCounts,
  getExpectedResultsFunc: getExpectedResults,
}

export const expectationsWithBehaveIni = {
  ...expectations,
  expectedRawBehaveConfigPaths: ["features", "features2"]
}


export const behaveIni: TestBehaveIni = {
  content: `[behave]\npaths=features\n\tfeatures2`
}



