import { TestProjectRunner, noBehaveIni, noRunOptions } from "../_helpers/testProjectRunner";
import { wsConfig, expectations } from "./defaults";


// this is a separate file because we don't want to run parallel debug 
// sessions (which is not supported) when running the multi-root tests (i.e. runMultiRootWorkspacesInParallel=true)

suite(`project B suite test debug run`, () => {
  const testProjectRunner = new TestProjectRunner("project B");

  test("debugAll", async () =>
    await testProjectRunner.debugAll(wsConfig, noBehaveIni, noRunOptions, expectations)
  )


});

