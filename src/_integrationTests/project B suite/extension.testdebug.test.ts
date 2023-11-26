import { getExpectedCounts, getExpectedResults } from "./expectedResults";
import { Expectations, ProjectRunners, TestRunOptions } from "../suite-shared/project.runners";


// this is a separate file because we don't want to run parallel debug 
// sessions (which is not supported) when running the multi-root tests (i.e. runMultiRootWorkspacesInParallel=true)

suite(`project B suite test debug run`, () => {
  const folderName = "project B";
  const testPre = `runHandler should return expected results for "${folderName}" with configuration:`;
  const sharedWorkspaceTests = new ProjectRunners(testPre);

  const options: TestRunOptions = {
    projName: folderName,
    envVarOverrides: undefined,
    runProfiles: undefined,
    selectedRunProfile: undefined,
    // imports, i.e. features/grouped/steps + features/grouped2/steps
    stepLibraries: [
      {
        "relativePath": "features",
        "stepFilesRx": ".*/steps/.*"
      }
    ]
  };

  const expectations: Expectations = {
    expectedProjectRelativeBaseDirPath: "features",
    expectedProjectRelativeConfigPaths: ["features"],
    expectedProjectRelativeFeatureFolders: ["features"],
    expectedProjectRelativeStepsFolders: ["features", "features/steps"], // "features" is because of stepLibraries
    getExpectedCountsFunc: getExpectedCounts,
    getExpectedResultsFunc: getExpectedResults,
  }


  test("runDebug", async () => await sharedWorkspaceTests.runDebug(options, expectations)).timeout(300000);
}).timeout(900000);

