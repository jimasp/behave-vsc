import { EnvVarOverridesSetting } from "../../settings";
import { TestWorkspaceConfig } from "../suite-helpers/testWorkspaceConfig";
import { Expectations } from "../suite-helpers/testWorkspaceRunners";
import { getExpectedCounts, getExpectedResults } from "./expectedResults";

const envVarOverrides: EnvVarOverridesSetting = {
  "some_var": "double qu\"oted",
  "some_var2": "single qu'oted",
  "space_var": " ",
  "USERNAME": "bob-163487"
}

export const wsConfig = new TestWorkspaceConfig({
  envVarOverrides: envVarOverrides
});

export const wsConfigParallel = new TestWorkspaceConfig({
  envVarOverrides: envVarOverrides
});

export const expectations: Expectations = {
  expectedProjectRelativeBaseDirPath: "behave tests/some tests",
  expectedProjectRelativeConfigPaths: ["behave tests/some tests"],
  expectedProjectRelativeFeatureFolders: ["behave tests/some tests"],
  expectedProjectRelativeStepsFolders: ["behave tests/some tests/steps"],
  getExpectedCountsFunc: getExpectedCounts,
  getExpectedResultsFunc: getExpectedResults,
}