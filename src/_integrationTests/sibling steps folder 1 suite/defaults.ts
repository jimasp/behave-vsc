import { getExpectedCounts, getExpectedResults } from "./expectedResults"


export const expectations = {
  expectedProjectRelativeBaseDirPath: "",
  expectedProjectRelativeConfigPaths: [""],
  expectedProjectRelativeFeatureFolders: [""], // "" = project root
  expectedProjectRelativeStepsFolders: ["steps"],
  getExpectedCountsFunc: getExpectedCounts,
  getExpectedResultsFunc: getExpectedResults,
}
