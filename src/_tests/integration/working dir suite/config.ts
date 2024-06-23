import path from 'path';
import vscode from 'vscode';
import { Expectations, TestBehaveIni } from "../_common/types";
import { TestWorkspaceConfig } from "../_common/testWorkspaceConfig";
import { getExpectedCountsWithoutBehaveIni, getExpectedResultsWithoutBehaveIni } from "./expectedResultsWithoutBehaveIni";
import { getExpectedCountsWith2PathBehaveIni, getExpectedResultsWith2PathBehaveIni } from "./expectedResultsWith2PathBehaveIni.js"
import { getExpectedCountsWith3PathBehaveIni, getExpectedResultsWith3PathBehaveIni } from "./expectedResultsWith3PathBehaveIni";
import { getExampleProjectFolderUri } from "../_common/helpers";


const projUri = getExampleProjectFolderUri("working dir");
const absPathProj = getExampleProjectFolderUri("working dir").fsPath;
const absPathWorkRoot = vscode.Uri.joinPath(projUri, "working folder").fsPath;
const absPathFeatures = path.join(absPathWorkRoot, "features");


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
  expectedProjRelativeFeatureFolders: ["working folder"], // 1 folder due to getOptimisedFeatureParsingPaths (one path is the parent of the other)
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
  expectedProjRelativeFeatureFolders: ["", "working folder"], // 2 folders due to getOptimisedFeatureParsingPaths
  expectedProjRelativeStepsFolders: ["working folder/features/steps"],
  getExpectedCountsFunc: getExpectedCountsWith3PathBehaveIni,
  getExpectedResultsFunc: getExpectedResultsWith3PathBehaveIni,
}


export const behaveIniWith3AbsPathsSetting: TestBehaveIni = {
  content: `[behave]\npaths=${absPathFeatures}\n\t${absPathWorkRoot}\n\t${absPathProj}`
}

export const expectationsWith3AbsPathsBehaveIni: Expectations = {
  expectedRawBehaveConfigPaths: [absPathFeatures, absPathWorkRoot, absPathProj],
  expectedProjRelativeBehaveWorkingDirPath: "working folder",
  expectedBaseDirPath: "features",
  expectedProjRelativeFeatureFolders: ["", "working folder"], // 2 folders due to getOptimisedFeatureParsingPaths
  expectedProjRelativeStepsFolders: ["working folder/features/steps"],
  getExpectedCountsFunc: getExpectedCountsWith3PathBehaveIni,
  getExpectedResultsFunc: getExpectedResultsWith3PathBehaveIni,
}
