import { getWs2ExpectedCounts, getWs2ExpectedResults } from "./ws2.expectedResults";
import { SharedWorkspaceTests } from "../workspace-suite-shared/shared.workspace.tests";


// this file is separate because we don't want to run parallel debug 
// sessions (which is not supported) when running the multi-root tests 

suite(`workspace-2-suite test debug run`, () => {
  const folderName = "project-2";
  const testPre = `runHandler should return expected results for "${folderName}" with configuration:`;
  const sharedWorkspaceTests = new SharedWorkspaceTests(testPre);

  test("runDebug", async () => await sharedWorkspaceTests.runDebug(folderName, "", getWs2ExpectedCounts, getWs2ExpectedResults)).timeout(300000);
}).timeout(900000);

