import path = require("path");
import { Expectations, TestBehaveIni } from "../_helpers/common";
import { TestWorkspaceConfig } from "../_helpers/testWorkspaceConfig";
import { getExpectedCounts, getExpectedResults } from "./expectedResults"

export const wsConfig = new TestWorkspaceConfig({
  behaveWorkingDirectory: "working folder",
});

export const wsParallelConfig = new TestWorkspaceConfig({
  runParallel: true,
  behaveWorkingDirectory: "working folder",
});

export const expectations: Expectations = {
  expectedProjRelativeBehaveWorkingDirPath: "working folder",
  expectedBaseDirPath: "features",
  expectedProjRelativeFeatureFolders: ["working folder/features"],
  expectedProjRelativeStepsFolders: ["working folder/features/steps"],
  getExpectedCountsFunc: getExpectedCounts,
  getExpectedResultsFunc: getExpectedResults,
}


export const behaveIniWithRelPathsSetting: TestBehaveIni = {
  content: `[behave]\npaths=features`
}

const fullPath = path
  .resolve(__dirname, '..', '..', 'example-projects', 'working dir', 'working folder', 'features')
  .replace("/out/_tests/", "/");

export const behaveIniFullPathsSetting: TestBehaveIni = {
  content: `[behave]\npaths=${fullPath}`
}


