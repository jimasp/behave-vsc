import { getExpectedCounts, getExpectedResults } from "./expectedResults";
import { SharedWorkspaceTests } from "../suite-shared/shared.workspace.tests";


// this file is separate because we don't want to run parallel debug 
// sessions (which is not supported) when running the multi-root tests 

suite(`sibling steps folder 2 suite test debug run`, () => {
  const folderName = "sibling steps folder 2";
  const testPre = `runHandler should return expected results for "${folderName}" with configuration:`;
  const sharedWorkspaceTests = new SharedWorkspaceTests(testPre);

  test("runDebug", async () => await sharedWorkspaceTests.runDebug(folderName, "subfolder 1/subfolder 2/features",
    "subfolder 1/subfolder 2/steps", getExpectedCounts, getExpectedResults)).timeout(300000);
}).timeout(900000);

