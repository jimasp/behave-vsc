import { Expectations } from "../suite-helpers/testWorkspaceRunners";
import { getExpectedCounts, getExpectedResults } from "./expectedResults";


export const expectations: Expectations = {
  expectedProjectRelativeBaseDirPath: "",
  expectedProjectRelativeConfigPaths: ["subfolder/features"],
  expectedProjectRelativeFeatureFolders: ["subfolder/features"],
  expectedProjectRelativeStepsFolders: ["steps"],
  getExpectedCountsFunc: getExpectedCounts,
  getExpectedResultsFunc: getExpectedResults,
}
