import { TestWorkspaceRunners, noBehaveIni, noConfig, noRunOptions } from "../_helpers/testWorkspaceRunners";
import { expectations } from "./defaults";


// this file is separate because we don't want to run parallel debug 
// sessions (which is not supported) when running the multi-root tests 

suite(`higher steps folder suite test debug run`, () => {
  const testWorkspaceRunners = new TestWorkspaceRunners("higher steps folder");

  test("debugAll", async () =>
    await testWorkspaceRunners.debugAll(noConfig, noBehaveIni, noRunOptions, expectations));

});

