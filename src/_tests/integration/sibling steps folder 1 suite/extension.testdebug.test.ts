import { TestWorkspaceRunners, noBehaveIni, noConfig, noRunOptions } from "../_helpers/testWorkspaceRunners";
import { expectationsWithoutBehaveIniPaths } from "./defaults";


// this file is separate because we don't want to run parallel debug 
// sessions (which is not supported) when running the multi-root tests 

suite(`sibling steps folder 1 suite test debug run`, () => {
  const testWorkspaceRunners = new TestWorkspaceRunners("sibling steps folder 1");

  test("debugAll", async () => await testWorkspaceRunners.debugAll(noConfig, noBehaveIni, noRunOptions, expectationsWithoutBehaveIniPaths));

});

