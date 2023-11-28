import { getExpectedCounts, getExpectedResults } from "./expectedResults";
import { TestWorkspaceRunners } from "../suite-helpers/testWorkspaceRunners";


// this file is separate because we don't want to run parallel debug 
// sessions (which is not supported) when running the multi-root tests 

suite(`sibling steps folder 1 suite test debug run`, () => {
  const folderName = "sibling steps folder 1";
  const testPre = `runHandler should return expected results for "${folderName}" with configuration:`;
  const testWorkspaceRunners = new TestWorkspaceRunners(testPre);

  test("debugAll", async () => await testWorkspaceRunners.debugAll(folderName, "",
    "", "steps", getExpectedCounts, getExpectedResults)).timeout(300000);
}).timeout(900000);

