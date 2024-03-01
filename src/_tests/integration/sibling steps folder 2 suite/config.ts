import { Expectations, TestBehaveIni } from "../_common/types";
import { getExpectedCounts, getExpectedResults } from "./expectedResults"


const expectedPaths = ["subfolder 1/subfolder 2/features", "subfolder 1/features", "subfolder 1/features2"];

export const expectations: Expectations = {
  expectedRawBehaveConfigPaths: expectedPaths,
  expectedProjRelativeBehaveWorkingDirPath: "",
  expectedBaseDirPath: "subfolder 1/subfolder 2",
  expectedProjRelativeFeatureFolders: ["subfolder 1/features", "subfolder 1/features2", "subfolder 1/subfolder 2/features"],
  expectedProjRelativeStepsFolders: ["subfolder 1/subfolder 2/steps"], // current behave behaviour is to match the first config path steps folder
  getExpectedCountsFunc: getExpectedCounts,
  getExpectedResultsFunc: getExpectedResults,
}

export const behaveIni: TestBehaveIni = {
  content: `[behave]\npaths=${expectedPaths.join("\n\t")}`
}

