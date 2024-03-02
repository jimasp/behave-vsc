import { TestWorkspaceConfig } from "../_common/testWorkspaceConfig"
import { Expectations, RunOptions } from "../_common/types"
import { getExpectedCounts } from "./expectedResults"


export const wsConfig = new TestWorkspaceConfig({
  behaveWorkingDirectory: "django/mysite",
  runProfiles: {
    "behave-django runner profile: wait for test results": {
      "env": {
        "var1": "var1 value",
      },
      "tagExpression": "--tags=~@skip",
      "customRunner": {
        "script": "manage.py",
        "args": [
          "--simple"
        ],
        "waitForJUnitResults": true
      },
    },
    "behave-django runner profile: do NOT wait for test results": {
      "env": {
        "var1": "var1 value",
      },
      "tagExpression": "--tags=~@skip",
      "customRunner": {
        "script": "manage.py",
        "waitForJUnitResults": false
      },
    },
  },
});

export const wsConfigParallel = new TestWorkspaceConfig({
  ...wsConfig,
  runParallel: true
});


export const runOptions: RunOptions = {
  selectedRunProfile: undefined
}

export const expectations: Expectations = {
  expectedRawBehaveConfigPaths: [],
  expectedProjRelativeBehaveWorkingDirPath: "django/mysite",
  expectedBaseDirPath: "features",
  expectedProjRelativeFeatureFolders: ["django/mysite/features"],
  expectedProjRelativeStepsFolders: ["django/mysite/features/steps"],
  getExpectedCountsFunc: getExpectedCounts,
  // getExpectedResultsFunc is replaced in test suite as needed to vary results as per different profiles
  // (there are several expectedResults functions in expectedResults.ts)  
  getExpectedResultsFunc: () => [],
}


