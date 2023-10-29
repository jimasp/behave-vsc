import { getExpectedCounts, getExpectedResultsForTag1Or2Expression, getExpectedResultsForTag1Expression, getExpectedResultsForTag2Expression, getExpectedResultsForNoTagExpression } from "./expectedResults";
import { SharedWorkspaceTests } from "../suite-shared/shared.workspace.tests";
import { runProfilesWorkspaceEnvVarOverrides, runProfilesWorkspaceRunProfiles } from "./extension.test";


// this file is separate because we don't want to run parallel debug 
// sessions (which is not supported) when running the multi-root tests 

suite(`run profiles suite test debug run`, () => {
  const folderName = "run profiles";
  const testPre = `runHandler should return expected results for "${folderName}" with configuration:`;
  const sharedWorkspaceTests = new SharedWorkspaceTests(testPre);

  test("runDebugWithRunProfiles", async () =>
    await sharedWorkspaceTests.runDebugWithRunProfiles(folderName,
      "", "features", "features", getExpectedCounts, getExpectedResultsForNoTagExpression,
      runProfilesWorkspaceEnvVarOverrides, runProfilesWorkspaceRunProfiles, "", {})
  ).timeout(300000);

  test("runDebugWithRunProfiles", async () =>
    await sharedWorkspaceTests.runDebugWithRunProfiles(folderName,
      "", "features", "features", getExpectedCounts, getExpectedResultsForTag1Expression,
      runProfilesWorkspaceEnvVarOverrides, runProfilesWorkspaceRunProfiles, "@tag1", {})
  ).timeout(300000);

  test("runDebugWithRunProfiles", async () =>
    await sharedWorkspaceTests.runDebugWithRunProfiles(folderName,
      "", "features", "features", getExpectedCounts, getExpectedResultsForTag2Expression,
      runProfilesWorkspaceEnvVarOverrides, runProfilesWorkspaceRunProfiles, "@tag2", {})
  ).timeout(300000);

  test("runDebugWithRunProfiles", async () =>
    await sharedWorkspaceTests.runDebugWithRunProfiles(folderName,
      "", "features", "features", getExpectedCounts, getExpectedResultsForTag1Or2Expression,
      runProfilesWorkspaceEnvVarOverrides, runProfilesWorkspaceRunProfiles, "@tag1,@tag2", {})
  ).timeout(300000);

}).timeout(900000);

