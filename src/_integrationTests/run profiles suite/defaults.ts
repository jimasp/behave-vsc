import { TestWorkspaceConfig } from "../suite-helpers/testWorkspaceConfig"
import { Expectations, RunOptions } from "../suite-helpers/testWorkspaceRunners"
import { getExpectedCounts, getExpectedResultsForAProfileWithoutTags } from "./expectedResults"


export const wsConfig = new TestWorkspaceConfig({
  envVarOverrides: {
    "var1": "ENV-var1",
    "var3": "ENV-var3"
  },
  runProfiles: {
    "stage2 profile": {
      "envVarOverrides": {
        "BEHAVE_STAGE": "stage2"
      },
    },
    "tag1 profile": {
      "tagExpression": "@tag1",
    },
    "tag1 vars profile": {
      "envVarOverrides": {
        "var1": "TAG1-var1",
        "var2": "TAG1-var2"
      },
      "tagExpression": "@tag1",
    },
    "tag2 vars profile": {
      "envVarOverrides": {
        "var1": "TAG2-var1",
        "var2": "TAG2-var2"
      },
      "tagExpression": "@tag2",
    },
    "tag1or2 vars profile": {
      "envVarOverrides": {
        "var1": "TAG1_OR_2-var1",
        "var2": "TAG1_OR_2-var2"
      },
      "tagExpression": "@tag1,@tag2",
    },
  },
  stepLibraries: [
    {
      "relativePath": "features",
      "stepFilesRx": ".*/steps/.*"
    }
  ]
});

export const runOptions: RunOptions = {
  selectedRunProfile: undefined
}

export const expectations: Expectations = {
  expectedProjectRelativeBaseDirPath: "features",
  expectedProjectRelativeConfigPaths: ["features"],
  expectedProjectRelativeFeatureFolders: ["features"],
  expectedProjectRelativeStepsFolders: ["features", "features/steps"], // "features" = cfgOptions steps setting
  getExpectedCountsFunc: getExpectedCounts,
  getExpectedResultsFunc: getExpectedResultsForAProfileWithoutTags,
}

