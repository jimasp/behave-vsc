import path = require("path");
import { Expectations, TestBehaveIni } from "../_helpers/common";
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
  expectedProjectRelativeFeatureFolders: ["working folder/features"],
  expectedProjectRelativeStepsFolders: ["working folder/features/steps"],
  getExpectedCountsFunc: getExpectedCounts,
  getExpectedResultsFunc: getExpectedResults,
}

const expectedPaths = ["working folder/features"];

export const behaveIniWithRelPathsSetting: TestBehaveIni = {
  content: `[behave]\npaths=features`,
  expectedRelPaths: expectedPaths
}

const fullPath = path
  .resolve(__dirname, '..', '..', 'example-projects', 'working dir', 'working folder', 'features')
  .replace("/out/_tests/", "/");

export const behaveIniFullPathsSetting: TestBehaveIni = {
  content: `[behave]\npaths=${fullPath}`,
  expectedRelPaths: expectedPaths
}


