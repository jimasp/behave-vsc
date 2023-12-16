import { Expectations } from "../_helpers/testWorkspaceRunners"
import { getExpectedCounts, getExpectedResults } from "./expectedResults"


export const expectations: Expectations = {
  expectedProjectRelativeBaseDirPath: "",
  expectedProjectRelativeConfigPaths: [""],
  expectedProjectRelativeFeatureFolders: ["features", "features2"],
  expectedProjectRelativeStepsFolders: ["steps"],
  getExpectedCountsFunc: getExpectedCounts,
  getExpectedResultsFunc: getExpectedResults,
}
