import { TestWorkspaceConfig } from "../_helpers/testWorkspaceConfig"
import { Expectations, RunOptions, TestBehaveIni } from "../_helpers/common"
import { getExpectedCounts, getExpectedResultsForAProfileWithoutTags } from "./expectedResults"


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
        "BEHAVE_STAGE": "stage2"
      },
    },
    "tag1 profile": {
      "tagExpression": "@tag1",
    },
    "tag1 vars profile": {
      "env": {
        "var1": "TAG1-var1",
        "var2": "TAG1-var2"
      },
      "tagExpression": "@tag1",
    },
    "tag2 vars profile": {
      "env": {
        "var1": "TAG2-var1",
        "var2": "TAG2-var2"
      },
      "tagExpression": "@tag2",
    },
    "tag1or2 vars profile": {
      "env": {
        "var1": "TAG1_OR_2-var1",
        "var2": "TAG1_OR_2-var2"
      },
      "tagExpression": "@tag1,@tag2",
    },
  }
});

export const runOptions: RunOptions = {
  selectedRunProfile: undefined
}

export const expectations: Expectations = {
  expectedProjRelativeBehaveWorkingDirPath: "",
  expectedBaseDirPath: "features",
  expectedProjRelativeFeatureFolders: ["features"],
  expectedProjRelativeStepsFolders: ["features", "features/steps"], // "features" = wsConfig importedSteps setting
  getExpectedCountsFunc: getExpectedCounts,
  // default, replaced in tests as needed to vary results as per different tag combos 
  // (there are several expectedResults functions in expectedResults.ts)
  getExpectedResultsFunc: getExpectedResultsForAProfileWithoutTags,
}

export const behaveIni: TestBehaveIni = {
  content: `[behave]\npaths=features`
}

