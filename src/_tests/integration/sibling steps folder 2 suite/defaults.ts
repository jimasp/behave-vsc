import { Expectations, TestBehaveIni } from "../_helpers/common";
import { getExpectedCounts, getExpectedResults } from "./expectedResults"


export const expectations: Expectations = {
  expectedProjectRelativeWorkingDirPath: "",
  expectedProjectRelativeBaseDirPath: "subfolder 1/subfolder 2",
  expectedProjectRelativeFeatureFolders: ["subfolder 1/subfolder 2/features", "subfolder 1/features", "subfolder 1/features2"],
  expectedProjectRelativeStepsFolders: ["subfolder 1/subfolder 2/steps"], // current behave behaviour is to match the first config path steps folder
  getExpectedCountsFunc: getExpectedCounts,
  getExpectedResultsFunc: getExpectedResults,
}

const expectedPaths = ["subfolder 1/subfolder 2/features", "subfolder 1/features", "subfolder 1/features2"];
export const behaveIni: TestBehaveIni = {
  content: `[behave]\npaths=${expectedPaths.join("\n\t")}`,
  expectedProjRelPaths: expectedPaths
}

