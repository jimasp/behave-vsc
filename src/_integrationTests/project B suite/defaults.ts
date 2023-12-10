import { ImportedStepsSetting } from "../../settings";
import { TestWorkspaceConfig } from "../suite-helpers/testWorkspaceConfig";
import { Expectations } from "../suite-helpers/testWorkspaceRunners";
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