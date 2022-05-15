import { getWssExpectedCounts, getWssExpectedResults } from "./wss.expectedResults";
import { SharedWorkspaceTests } from "../workspace-suite-shared/shared.workspace.tests";


// this file is separate because we don't want to run parallel debug 
// sessions (which is not supported) when running the multi-root tests 

suite(`workspace-simple-suite test debug run`, () => {
  const wkspName = "example project simple";
  const testPre = `runHandler should return expected results for "${wkspName}" with configuration:`;
  const sharedWorkspaceTests = new SharedWorkspaceTests(testPre);

  test("runDebug", async () => await sharedWorkspaceTests.runDebug(wkspName, "", getWssExpectedCounts, getWssExpectedResults)).timeout(180000);
}).timeout(600000);

