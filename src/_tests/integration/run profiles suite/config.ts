import { TestWorkspaceConfig } from "../_helpers/testWorkspaceConfig"
import { Expectations, RunOptions, TestBehaveIni } from "../_helpers/common"
import { getExpectedCounts, getExpectedResultsForNoTagsSpecified } from "./expectedResults"


export const wsConfig = new TestWorkspaceConfig({
  importedSteps: {
    "features": ".*/steps/.*"
  },
  env: {
    "var1": "ENV-var1",
    "var3": "ENV-var3"
  },
  runProfiles: {
    "stage2 profile": {
      "env": {
        "profile": "stage2_profile",
        "BEHAVE_STAGE": "stage2"
      },
    },
    "tag1 profile": {
      "env": {
        "profile": "tag1_profile",
      },
      "tagExpression": "@tag1",
    },
    "tag1 vars profile": {
      "env": {
        "profile": "tag1_vars_profile",
        "var1": "TAG1-var1",
        "var2": "TAG1-var2"
      },
      "tagExpression": "@tag1",
    },
    "tag2 vars profile": {
      "env": {
        "profile": "tag2_vars_profile",
        "var1": "TAG2-var1",
        "var2": "TAG2-var2"
      },
      "tagExpression": "@tag2",
    },
    "tag1or2 vars profile": {
      "env": {
        "profile": "tag1or2_vars_profile",
        "var1": "TAG1_OR_2-var1",
        "var2": "TAG1_OR_2-var2"
      },
      "tagExpression": "@tag1,@tag2",
    },
    "qu'oted\"tag profile": {
      "env": {
        "profile": "qu'oted\"tag_profile",
      },
      "tagExpression": "@qu'oted\"tag",
    },
    "qu'oted\"env profile": {
      "env": {
        "profile": "qu'oted\"env_profile",
        "qu'oted\"env": "v'al\"ue"
      },
    },
  }
});


export const runOptions: RunOptions = {
  selectedRunProfile: undefined
}

export const expectations: Expectations = {
  expectedRawBehaveConfigPaths: [],
  expectedProjRelativeBehaveWorkingDirPath: "",
  expectedBaseDirPath: "features",
  expectedProjRelativeFeatureFolders: ["features"],
  expectedProjRelativeStepsFolders: ["features", "features/steps"], // "features" = wsConfig importedSteps setting
  getExpectedCountsFunc: getExpectedCounts,
  // getExpectedResultsFunc is replaced in test suite as needed to vary results as per different profiles
  // (there are several expectedResults functions in expectedResults.ts)  
  getExpectedResultsFunc: () => [],
}

export const behaveIni: TestBehaveIni = {
  content: `[behave]\npaths=features`
}

