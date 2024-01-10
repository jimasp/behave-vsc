import { Expectations } from "../_helpers/testProjectRunner"
import { getExpectedCounts, getExpectedResults } from "./expectedResults"


export const expectations: Expectations = {
  expectedProjectRelativeWorkingDirPath: "",
  expectedProjectRelativeBaseDirPath: "subfolder 1/subfolder 2",
  expectedProjectRelativeConfigPaths: ["subfolder 1/subfolder 2/features", "subfolder 1/features", "subfolder 1/features2"],
  expectedProjectRelativeFeatureFolders: ["subfolder 1/subfolder 2/features", "subfolder 1/features", "subfolder 1/features2"],
  expectedProjectRelativeStepsFolders: ["subfolder 1/subfolder 2/steps"], // current behave behaviour is to match the first config path steps folder
  getExpectedCountsFunc: getExpectedCounts,
  getExpectedResultsFunc: getExpectedResults,
}

export const behaveIni = `[behave]\npaths=${expectations.expectedProjectRelativeFeatureFolders.join("\n\t")}`;