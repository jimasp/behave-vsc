import { getExpectedCounts, getExpectedResults } from "./expectedResults";
import { Expectations, ProjectRunners, TestRunOptions } from "../suite-shared/project.runners";


// this file is separate because we don't want to run parallel debug 
// sessions (which is not supported) when running the multi-root tests (i.e. runMultiRootWorkspacesInParallel=true)

suite(`higher steps folder suite test debug run`, () => {
  const folderName = "project A";
  const testPre = `runHandler should return expected results for "${folderName}" with configuration:`;
  const sharedWorkspaceTests = new ProjectRunners(testPre);

  const options: TestRunOptions = {
    projName: folderName,
    envVarOverrides: undefined,
    runProfiles: undefined,
    selectedRunProfile: undefined,
    stepLibraries: undefined
  };

  const expectations: Expectations = {
    expectedProjectRelativeBaseDirPath: "behave tests/some tests",
    expectedProjectRelativeConfigPaths: ["behave tests/some tests"],
    expectedProjectRelativeFeatureFolders: ["behave tests/some tests"],
    expectedProjectRelativeStepsFolders: ["behave tests/some tests/steps"],
    getExpectedCountsFunc: getExpectedCounts,
    getExpectedResultsFunc: getExpectedResults,
  }

  test("runDebug", async () =>
    await sharedWorkspaceTests.runDebug(options, expectations)).timeout(300000);

}).timeout(900000);

