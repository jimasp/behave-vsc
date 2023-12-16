import { TestWorkspaceRunners, noBehaveConfig, noConfig, noRunOptions } from "../_helpers/testWorkspaceRunners";
import { expectations } from "./defaults";


// this file is separate because we don't want to run parallel debug 
// sessions (which is not supported) when running the multi-root tests (i.e. runMultiRootWorkspacesInParallel=true)

suite(`simple suite test debug run`, () => {
  const testWorkspaceRunners = new TestWorkspaceRunners("simple");

  test("debugAll", async () =>
    await testWorkspaceRunners.debugAll(noConfig, noBehaveConfig, noRunOptions, expectations)
  )

});

