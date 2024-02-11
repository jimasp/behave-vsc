import path = require("path");
import { Expectations, TestBehaveIni } from "../_helpers/common";
import { TestWorkspaceConfig } from "../_helpers/testWorkspaceConfig";
import { getExpectedCountsWithBehaveIni, getExpectedResultsWithBehaveIni } from "./expectedResultsWithBehaveIni"
import { getExpectedCountsWithoutBehaveIni, getExpectedResultsWithoutBehaveIni } from "./expectedResultsWithoutBehaveIni";

export const wsConfig = new TestWorkspaceConfig({
  behaveWorkingDirectory: "working folder",
});

export const wsParallelConfig = new TestWorkspaceConfig({
  runParallel: true,
  behaveWorkingDirectory: "working folder",
});

export const expectationsWithBehaveIni: Expectations = {
  expectedProjRelativeBehaveWorkingDirPath: "working folder",
  expectedBaseDirPath: "features",
  expectedProjRelativeFeatureFolders: ["", "working folder/features"],
  expectedProjRelativeStepsFolders: ["working folder/features/steps"],
  getExpectedCountsFunc: getExpectedCountsWithBehaveIni,
  getExpectedResultsFunc: getExpectedResultsWithBehaveIni,
}

export const expectationsWithoutBehaveIni: Expectations = {
  expectedProjRelativeBehaveWorkingDirPath: "working folder",
  expectedBaseDirPath: "features",
  expectedProjRelativeFeatureFolders: ["working folder/features"],
  expectedProjRelativeStepsFolders: ["working folder/features/steps"],
  getExpectedCountsFunc: getExpectedCountsWithoutBehaveIni,
  getExpectedResultsFunc: getExpectedResultsWithoutBehaveIni,
}



export const behaveIniWithRelPathsSetting: TestBehaveIni = {
  content: `[behave]\npaths=features\n\t..` // (.. to include the root feature)
}

const fullPath = path
  .resolve(__dirname, '..', '..', 'example-projects', 'working dir', 'working folder', 'features')
  .replace("/out/_tests/", "/");

export const behaveIniFullPathsSetting: TestBehaveIni = {
  content: `[behave]\npaths=${fullPath}\n\t..` // (.. to include the root feature)
}


