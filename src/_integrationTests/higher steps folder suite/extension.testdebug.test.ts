import { getExpectedCounts, getExpectedResults } from "./expectedResults";
import { ProjectRunners, TestRunOptions } from "../suite-shared/project.runners";


// this file is separate because we don't want to run parallel debug 
// sessions (which is not supported) when running the multi-root tests 

suite(`higher steps folder suite test debug run`, () => {
  const folderName = "higher steps folder";
  const testPre = `runHandler should return expected results for "${folderName}" with configuration:`;
  const sharedWorkspaceTests = new ProjectRunners(testPre);

  const options: TestRunOptions = {
    projName: folderName,
    expectedProjectRelativeBaseDirPath: "",
    expectedProjectRelativeConfigPaths: ["subfolder/features"],
    expectedProjectRelativeFeatureFolders: ["subfolder/features"],
    expectedProjectRelativeStepsFolders: ["steps"],
    getExpectedCountsFunc: getExpectedCounts,
    getExpectedResultsFunc: getExpectedResults,
    envVarOverrides: undefined,
    runProfiles: undefined,
    selectedRunProfile: undefined,
    stepLibraries: undefined
  };


  test("runDebug", async () => await sharedWorkspaceTests.runDebug(options)).timeout(300000);

}).timeout(900000);

