import { Expectations } from "../_common/types";
import { getExpectedCounts, getExpectedResults } from "./expectedResults"


export const expectations: Expectations = {
  expectedRawBehaveConfigPaths: [],
  expectedProjRelativeBehaveWorkingDirPath: "",
  expectedBaseDirPath: "",
  expectedProjRelativeFeatureFolders: ["features"],
  expectedProjRelativeStepsFolders: ["steps"],
  getExpectedCountsFunc: getExpectedCounts,
  getExpectedResultsFunc: getExpectedResults,
}

