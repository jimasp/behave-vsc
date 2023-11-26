import { getExpectedCounts, getExpectedResultsForTag1RunProfile } from "./expectedResults";
import { ProjectRunners } from "../suite-shared/project.runners";
import { projectEnvVarOverrides, runProfilesSetting } from "./extension.test";


// this file is separate because we don't want to run parallel debug 
// sessions (which is not supported) when running the multi-root tests 

suite(`run profiles suite test debug run`, () => {
  const folderName = "run profiles";
  const testPre = `runHandler should return expected results for "${folderName}" with configuration:`;
  const sharedWorkspaceTests = new ProjectRunners(testPre);

  test("runDebug - tag1 profile", async () =>
    await sharedWorkspaceTests.runDebug(folderName,
      "", "features", "features", getExpectedCounts, getExpectedResultsForTag1RunProfile,
      projectEnvVarOverrides, runProfilesSetting, "tag1 profile")

  ).timeout(300000);

}).timeout(900000);

