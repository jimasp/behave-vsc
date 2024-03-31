import { TestWorkspaceConfig } from "../_common/testWorkspaceConfig"
import { Expectations, RunOptions, TestBehaveIni } from "../_common/types"
import { getExpectedCounts } from "./expectedResults"



export const wsConfig = new TestWorkspaceConfig({
  importedSteps: {
    "features": ".*/steps/.*"
  },
  env: {
    "var1": "ENV-var1",
    "var3": "ENV-var3"
  },
  args: [
    "-D",
    "foo=bar",
    "-D",
    "fizz=buzz",
  ],
  runProfiles: [
    {
      "name": "qu'oted\"tag and qu'oted\"env profile",
      "env": {
        "profile": "qu'oted\"tag and qu'oted\"env profile",
        "qu'oted\"env": "v'al\"ue"
      },
      "adhocTagsParameters": "--tags=@qu'oted\"tag",
    },
    {
      "name": "args profile",
      "env": {
        "profile": "args profile",
      },
      "args": [
        "-D",
        "d1=val1",
        "-D",
        "d2=val2",
      ],
    },
    {
      "name": "no args profile",
      "env": {
        "profile": "no args profile",
      },
      "args": [],
    },
    {
      "name": "stage2 profile",
      "env": {
        "profile": "stage2 profile",
        "BEHAVE_STAGE": "stage2"
      },
    },
    {
      "name": "tag1 profile",
      "env": {
        "profile": "tag1 profile",
      },
      "adhocTagsParameters": "--tags=tag1",
    },
    {
      "name": "tag1 vars profile",
      "env": {
        "profile": "tag1 vars profile",
        "var1": "TAG1-var1",
        "var2": "TAG1-var2"
      },
      "adhocTagsParameters": "--tags=tag1",
    },
    {
      "name": "tag2 vars profile",
      "env": {
        "profile": "tag2 vars profile",
        "var1": "TAG2-var1",
        "var2": "TAG2-var2"
      },
      "adhocTagsParameters": "--tags=@tag2",
    },
    {
      "name": "tag1ortag2 vars profile",
      "env": {
        "profile": "tag1ortag2 vars profile",
        "var1": "TAG1_OR_2-var1",
        "var2": "TAG1_OR_2-var2"
      },
      "adhocTagsParameters": "--tags=tag1,@tag2",
    },
    {
      "name": "tag1andtag2 profile",
      "env": {
        "profile": "tag1andtag2 profile",
      },
      "adhocTagsParameters": "--tags=tag1 --tags=tag2",
    },
    {
      "name": "tag1ortag2andtag3 profile",
      "env": {
        "profile": "tag1ortag2andtag3 profile",
      },
      "adhocTagsParameters": "--tags=tag1,tag2 --tags=tag3",
    },
    {
      "name": "nottag1andnottag2 profile",
      "env": {
        "profile": "nottag1andnottag2 profile",
      },
      "adhocTagsParameters": "--tags=~tag1 --tags=-tag2",
    },
  ]
});


export const runOptions: RunOptions = {
  selectedRunProfile: undefined
}

export const expectations: Expectations = {
  expectedRawBehaveConfigPaths: [],
  expectedProjRelativeBehaveWorkingDirPath: ".",
  expectedBaseDirPath: "features",
  expectedProjRelativeFeatureFolders: ["features"],
  // expectedProjRelativeStepsFolders includes "features" because of the wsConfig importedSteps 
  // setting above (i.e. the regex will determine if contained files are considered steps files in isStepFile)
  expectedProjRelativeStepsFolders: ["features", "features/steps"],
  getExpectedCountsFunc: getExpectedCounts,
  // getExpectedResultsFunc is replaced in test suite as needed to vary results as per different profiles
  // (there are several expectedResults functions in expectedResults.ts)  
  getExpectedResultsFunc: () => [],
}

export const behaveIni: TestBehaveIni = {
  content: `[behave]\npaths=features`
}

