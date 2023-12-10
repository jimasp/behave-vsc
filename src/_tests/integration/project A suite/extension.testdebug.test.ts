import { TestWorkspaceRunners, noRunOptions } from "../suite-helpers/testWorkspaceRunners";
import { expectations, wsConfig } from "./default";


// this file is separate because we don't want to run parallel debug 
// sessions (which is not supported) when running the multi-root tests (i.e. runMultiRootWorkspacesInParallel=true)

suite(`higher steps folder suite test debug run`, () => {
  const testWorkspaceRunners = new TestWorkspaceRunners("project A");

  test("debugAll", async () =>
    await testWorkspaceRunners.debugAll(wsConfig, noRunOptions, expectations)
  ).timeout(300000);


}).timeout(900000);

