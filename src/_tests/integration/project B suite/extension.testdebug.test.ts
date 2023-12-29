import { TestWorkspaceRunners, noBehaveIni, noRunOptions } from "../_helpers/testWorkspaceRunners";
import { wsConfig, expectations } from "./defaults";


// this is a separate file because we don't want to run parallel debug 
// sessions (which is not supported) when running the multi-root tests (i.e. runMultiRootWorkspacesInParallel=true)

suite(`project B suite test debug run`, () => {
  const testWorkspaceRunners = new TestWorkspaceRunners("project B");

  test("debugAll", async () =>
    await testWorkspaceRunners.debugAll(wsConfig, noBehaveIni, noRunOptions, expectations)
  )


});

