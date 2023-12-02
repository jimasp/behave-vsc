import { ConfigOptions, RunOptions } from "../suite-helpers/testWorkspaceRunners"
import { getExpectedCounts, getExpectedResults } from "./expectedResults"


export const configOptions: ConfigOptions = {
  envVarOverrides: undefined,
  runProfiles: undefined,
  stepLibraries: [
    {
      "relativePath": "folder1/steps_lib_1 ",
      "stepFilesRx": ".*/steps/.*"
    },
    {
      "relativePath": "folder2\\steps_lib_2",
      "stepFilesRx": ".*/steps/.*|more_steps/.*|.*/steps2.py|.*/steps3.py",
    }
  ]
}

export const runOptions: RunOptions = {
  selectedRunProfile: undefined
}

export const expectations = {
  expectedProjectRelativeBaseDirPath: "features",
  expectedProjectRelativeConfigPaths: ["features"],
  expectedProjectRelativeFeatureFolders: ["features"],
  expectedProjectRelativeStepsFolders: ["features/steps", "folder1/steps_lib_1", "folder2/steps_lib_2"],
  getExpectedCountsFunc: getExpectedCounts,
  getExpectedResultsFunc: getExpectedResults,
}
