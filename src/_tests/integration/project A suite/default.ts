import { EnvSetting } from "../../../config/settings";
import { TestWorkspaceConfig } from "../_helpers/testWorkspaceConfig";
import { BehaveConfigStub, Expectations } from "../_helpers/testWorkspaceRunners";
import { getExpectedCounts, getExpectedResults } from "./expectedResults";

const env: EnvSetting = {
  "some_var": "double qu\"oted",
  "some_var2": "single qu'oted",
  "space_var": " ",
  "USERNAME": "bob-163487"
}

export const wsConfig = new TestWorkspaceConfig({
  envVarOverrides: env
});

export const wsConfigParallel = new TestWorkspaceConfig({
  envVarOverrides: env
});

export const expectations: Expectations = {
  expectedProjectRelativeBaseDirPath: "behave tests/some tests",
  expectedProjectRelativeConfigPaths: ["behave tests/some tests"],
  expectedProjectRelativeFeatureFolders: ["behave tests/some tests"],
  expectedProjectRelativeStepsFolders: ["behave tests/some tests/steps"],
  getExpectedCountsFunc: getExpectedCounts,
  getExpectedResultsFunc: getExpectedResults,
}

export const behaveConfig: BehaveConfigStub = {
  paths: expectations.expectedProjectRelativeFeatureFolders
}