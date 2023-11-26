import { getExpectedCounts, getExpectedResults } from "./expectedResults";
import { ProjectRunners } from "../suite-shared/project.runners";


// this is a separate file because we don't want to run parallel debug 
// sessions (which is not supported) when running the multi-root tests (i.e. runMultiRootWorkspacesInParallel=true)

suite(`project B suite test debug run`, () => {
  const folderName = "project B";
  const testPre = `runHandler should return expected results for "${folderName}" with configuration:`;
  const sharedWorkspaceTests = new ProjectRunners(testPre);

  test("runDebug", async () => await sharedWorkspaceTests.runDebug(folderName, "",
    "features", "features", getExpectedCounts, getExpectedResults)).timeout(300000);
}).timeout(900000);

