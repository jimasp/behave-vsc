import { getExpectedCounts, getExpectedResults } from "./expectedResults";
import { ProjectRunners } from "../suite-shared/project.runners";


// this file is separate because we don't want to run parallel debug 
// sessions (which is not supported) when running the multi-root tests (i.e. runMultiRootWorkspacesInParallel=true)

suite(`higher steps folder suite test debug run`, () => {
  const folderName = "project A";
  const testPre = `runHandler should return expected results for "${folderName}" with configuration:`;
  const sharedWorkspaceTests = new ProjectRunners(testPre);

  test("runDebug", async () =>
    await sharedWorkspaceTests.runDebug(folderName,
      "/behave tests/some tests/", "behave tests/some tests", "behave tests/some tests",
      getExpectedCounts, getExpectedResults)).timeout(300000);

}).timeout(900000);

