import { ImportedStepsSetting } from "../../../config/settings";
import { TestWorkspaceConfig } from "../_helpers/testWorkspaceConfig";
import { Expectations, TestBehaveIni } from "../_helpers/common";
import { getExpectedCounts, getExpectedResults } from "./expectedResults";


const importedSteps: ImportedStepsSetting = {
  "features/grouped": ".*/steps/.*",
  "features/grouped2": ".*/g2_steps/.*"
}

export const wsConfig = new TestWorkspaceConfig({
  importedSteps: importedSteps
});

export const wsConfigParallel = new TestWorkspaceConfig({
  importedSteps: importedSteps,
  runParallel: true
});

export const expectations: Expectations = {
  expectedProjectRelativeWorkingDirPath: "",
  expectedProjectRelativeBaseDirPath: "features",
  expectedProjectRelativeFeatureFolders: ["features"],
  expectedProjectRelativeStepsFolders: ["features/grouped", "features/grouped2", "features/steps"], // features/grouped2 = imported steps
  getExpectedCountsFunc: getExpectedCounts,
  getExpectedResultsFunc: getExpectedResults,
}

export const behaveIni: TestBehaveIni = {
  content: `[behave]\npaths=features`,
  expectedProjRelPaths: ["features"]
}

