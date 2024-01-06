import { TestProjectRunner, noBehaveIni, noConfig, noRunOptions } from "../_helpers/testProjectRunner";
import { expectations } from "./defaults";


// this file is separate because we don't want to run parallel debug 
// sessions (which is not supported) when running the multi-root tests (i.e. runMultiRootWorkspacesInParallel=true)

suite(`simple suite test debug run`, () => {
  const testProjectRunner = new TestProjectRunner("simple");

  test("debugAll", async () =>
    await testProjectRunner.debugAll(noConfig, noBehaveIni, noRunOptions, expectations));

});

