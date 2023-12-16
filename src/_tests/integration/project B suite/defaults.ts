import { ImportedStepsSetting } from "../../../config/settings";
import { TestWorkspaceConfig } from "../_helpers/testWorkspaceConfig";
import { BehaveConfigStub, Expectations } from "../_helpers/testWorkspaceRunners";
import { getExpectedCounts, getExpectedResults } from "./expectedResults";


const importedSteps: ImportedStepsSetting = {
  "features": ".*/steps/.*"
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
  expectedProjectRelativeStepsFolders: ["features", "features/steps"], // "features" is because of importedSteps
  getExpectedCountsFunc: getExpectedCounts,
  getExpectedResultsFunc: getExpectedResults,
}

export const behaveConfig: BehaveConfigStub = {
  paths: expectations.expectedProjectRelativeFeatureFolders
}