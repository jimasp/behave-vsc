import path = require("path");
import { Expectations, TestBehaveIni } from "../_helpers/common";
import { TestWorkspaceConfig } from "../_helpers/testWorkspaceConfig";
import { getExpectedCountsWithoutBehaveIni, getExpectedResultsWithoutBehaveIni } from "./expectedResultsWithoutBehaveIni";
import { getExpectedCountsWith2PathBehaveIni, getExpectedResultsWith2PathBehaveIni } from "./expectedResultsWith2PathBehaveIni"
import { getExpectedCountsWith3PathBehaveIni, getExpectedResultsWith3PathBehaveIni } from "./expectedResultsWith3PathBehaveIni";

export const wsConfig = new TestWorkspaceConfig({
  behaveWorkingDirectory: "working folder",
});

export const wsParallelConfig = new TestWorkspaceConfig({
  runParallel: true,
  behaveWorkingDirectory: "working folder",
});

export const expectations: Expectations = {
  expectedRawBehaveConfigPaths: [],
  expectedProjRelativeBehaveWorkingDirPath: "working folder",
  expectedBaseDirPath: "features",
  expectedProjRelativeFeatureFolders: ["working folder/features"], // 1 folder automatically determined without behave.ini
  expectedProjRelativeStepsFolders: ["working folder/features/steps"],
  getExpectedCountsFunc: getExpectedCountsWithoutBehaveIni,
  getExpectedResultsFunc: getExpectedResultsWithoutBehaveIni,
}

export const behaveIniWith2RelPathsSetting: TestBehaveIni = {
  content: `[behave]\npaths=features\n\t.`
}

export const expectationsWith2RelPathsBehaveIni: Expectations = {
  expectedRawBehaveConfigPaths: ["features", "."],
  expectedProjRelativeBehaveWorkingDirPath: "working folder",
  expectedBaseDirPath: "features",
  expectedProjRelativeFeatureFolders: ["working folder"], // 1 folder due to getOptimisedFeaturePaths (one path is the parent of the other)
  expectedProjRelativeStepsFolders: ["working folder/features/steps"],
  getExpectedCountsFunc: getExpectedCountsWith2PathBehaveIni,
  getExpectedResultsFunc: getExpectedResultsWith2PathBehaveIni,
}

export const behaveIniWith3RelPathsSetting: TestBehaveIni = {
  content: `[behave]\npaths=features\n\t.\n\t..`
}

export const expectationsWith3RelPathsBehaveIni: Expectations = {
  expectedRawBehaveConfigPaths: ["features", ".", ".."],
  expectedProjRelativeBehaveWorkingDirPath: "working folder",
  expectedBaseDirPath: "features",
  expectedProjRelativeFeatureFolders: ["", "working folder"], // 2 folders due to getOptimisedFeaturePaths
  expectedProjRelativeStepsFolders: ["working folder/features/steps"],
  getExpectedCountsFunc: getExpectedCountsWith3PathBehaveIni,
  getExpectedResultsFunc: getExpectedResultsWith3PathBehaveIni,
}


const absPathFeatures = path
  .resolve(__dirname, '..', '..', 'example-projects', 'working dir', 'working folder', 'features')
  .replace("/out/_tests/", "/");

const absPathWorkRoot = path
  .resolve(__dirname, '..', '..', 'example-projects', 'working dir', 'working folder')
  .replace("/out/_tests/", "/");

const absPathProjRoot = path
  .resolve(__dirname, '..', '..', 'example-projects', 'working dir')
  .replace("/out/_tests/", "/");

export const behaveIniWith3AbsPathsSetting: TestBehaveIni = {
  content: `[behave]\npaths=${absPathFeatures}\n\t${absPathWorkRoot}\n\t${absPathProjRoot}`
}

export const expectationsWith3AbsPathsBehaveIni: Expectations = {
  expectedRawBehaveConfigPaths: [absPathFeatures, absPathWorkRoot, absPathProjRoot],
  expectedProjRelativeBehaveWorkingDirPath: "working folder",
  expectedBaseDirPath: "features",
  expectedProjRelativeFeatureFolders: ["", "working folder"], // 2 folders due to getOptimisedFeaturePaths
  expectedProjRelativeStepsFolders: ["working folder/features/steps"],
  getExpectedCountsFunc: getExpectedCountsWith3PathBehaveIni,
  getExpectedResultsFunc: getExpectedResultsWith3PathBehaveIni,
}
