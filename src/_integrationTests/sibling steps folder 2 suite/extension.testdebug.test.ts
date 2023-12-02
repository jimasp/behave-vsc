import { TestWorkspaceRunners } from "../suite-helpers/testWorkspaceRunners";
import { configOptions, expectations, runOptions } from "./defaults";


// this file is separate because we don't want to run parallel debug 
// sessions (which is not supported) when running the multi-root tests 

suite(`sibling steps folder 2 suite test debug run`, () => {
  const testWorkspaceRunners = new TestWorkspaceRunners("sibling steps folder 2");

  test("debugAll", async () => await testWorkspaceRunners.debugAll(configOptions, runOptions, expectations)).timeout(300000);
}).timeout(900000);

