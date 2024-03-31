import { TestWorkspaceConfig } from "../_common/testWorkspaceConfig"
import { Expectations, RunOptions } from "../_common/types"
import { getExpectedCounts } from "./expectedResults"


export const wsConfig = new TestWorkspaceConfig({
  behaveWorkingDirectory: "django/mysite",
  runProfiles: [
    {
      "name": "behave-django runner profile - wait for results",
      "promptForTags": false,
      "args": {
        "argList": [
          "--keepdb"
        ],
      },
      "customRunner": {
        "scriptFile": "manage.py",
        "waitForJUnitFiles": true
      },
    },
    {
      "name": "behave-django runner profile - do not wait for results",
      "promptForTags": false,
      "customRunner": {
        "scriptFile": "manage.py",
        "waitForJUnitFiles": false
      },
    },
    {
      "name": "myscript - wait for results",
      "promptForTags": false,
      "args": {
        "argList": ["--tags=@myscript"],
      },
      "customRunner": {
        "scriptFile": "myscript.py",
        "waitForJUnitFiles": true
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


