import { EnvSetting } from "../../../config/settings";
import { TestWorkspaceConfig } from "../_common/testWorkspaceConfig";
import { Expectations, TestBehaveIni } from "../_common/types";
import { getExpectedCounts, getExpectedResults } from "./expectedResults";

const env: EnvSetting = {
  "some_var": "double=qu\"oted",
  "some_var2": "single=qu'oted",
  "space_var": " ",
  "USERNAME": "bob-163487"
}

export const wsConfig = new TestWorkspaceConfig({
  envVarOverrides: env
});

export const wsConfigParallel = new TestWorkspaceConfig({
  runParallel: true,
  envVarOverrides: env
});

export const expectations: Expectations = {
  expectedRawBehaveConfigPaths: ["behave tests/some tests"],
  expectedProjRelativeBehaveWorkingDirPath: "",
  expectedBaseDirPath: "behave tests/some tests",
  expectedProjRelativeFeatureFolders: ["behave tests/some tests"],
  expectedProjRelativeStepsFolders: ["behave tests/some tests/steps"],
  getExpectedCountsFunc: getExpectedCounts,
  getExpectedResultsFunc: getExpectedResults,
}


export const behaveIni: TestBehaveIni = {
  content: `[behave]\npaths=behave tests/some tests`
}
