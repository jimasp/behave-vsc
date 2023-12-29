import { ImportedStepsSetting } from "../../../config/settings";
import { TestWorkspaceConfig } from "../_helpers/testWorkspaceConfig";
import { Expectations } from "../_helpers/testWorkspaceRunners";
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
  expectedProjectRelativeBaseDirPath: "features",
  expectedProjectRelativeConfigPaths: ["features"],
  expectedProjectRelativeFeatureFolders: ["features"],
  expectedProjectRelativeStepsFolders: ["features/grouped", "features/grouped2", "features/steps"], // features/grouped2 = imported steps
  getExpectedCountsFunc: getExpectedCounts,
  getExpectedResultsFunc: getExpectedResults,
}

export const behaveIni = `[behave]\npaths=${expectations.expectedProjectRelativeFeatureFolders.join("\n\t")}`;