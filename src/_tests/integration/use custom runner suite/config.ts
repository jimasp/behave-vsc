import { TestWorkspaceConfig } from "../_common/testWorkspaceConfig"
import { Expectations, RunOptions } from "../_common/types"
import { getExpectedCounts } from "./expectedResults"


export const wsConfig = new TestWorkspaceConfig({
  behaveWorkingDirectory: "django/mysite",
  runProfiles: [
    // NOTE - these are also used in simple suite (see simple suite's multi.tests.ts)
    {
      "name": "behave-django runner profile: WAIT for test results",
      "env": {
        "var1": "var1 value",
      },
      "tagsParameters": "--tags=~@skip",
      "customRunner": {
        "scriptFile": "manage.py",
        "args": [
          "--simple"
        ],
        "waitForJUnitFiles": true
      },
    },
    {
      "name": "behave-django runner profile: do NOT wait for test results",
      "env": {
        "var1": "var1 value",
      },
      "tagsParameters": "--tags=~@skip",
      "customRunner": {
        "scriptFile": "manage.py",
        "waitForJUnitFiles": false
      },
    },
  ]
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


