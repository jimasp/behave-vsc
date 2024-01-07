import path = require("path");
import { Expectations } from "../_helpers/testProjectRunner"
import { TestWorkspaceConfig } from "../_helpers/testWorkspaceConfig";
import { getExpectedCounts, getExpectedResults } from "./expectedResults"

export const wsConfig = new TestWorkspaceConfig({
  relativeWorkingDir: "working folder",
});

export const wsParallelConfig = new TestWorkspaceConfig({
  runParallel: true,
  relativeWorkingDir: "working folder",
});

export const expectations: Expectations = {
  expectedProjectRelativeWorkingDirPath: "working folder",
  expectedProjectRelativeBaseDirPath: "working folder/features",
  expectedProjectRelativeConfigPaths: ["working folder/features"],
  expectedProjectRelativeFeatureFolders: ["working folder/features"],
  expectedProjectRelativeStepsFolders: ["working folder/features/steps"],
  getExpectedCountsFunc: getExpectedCounts,
  getExpectedResultsFunc: getExpectedResults,
}

export const behaveIniWithRelPathsSetting = `[behave]\npaths=features`;


const fullPath = path
  .resolve(__dirname, '..', '..', 'example-projects', 'working dir', 'working folder', 'features')
  .replace("/out/_tests/", "/");

export const behaveIniFullPathsSetting = `[behave]\npaths=${fullPath}`;
