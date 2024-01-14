import { TestProjectRunner, noBehaveIni, noRunOptions } from "../_helpers/runners/projectRunner";
import { wsConfig, expectations } from "./defaults";


// this file is separate because we don't want to run parallel debug 
// sessions when running the multi-root suite/index.ts tests 
// (runMultiRootProjectsInParallel=true is not applicable to debug)

suite(`project B suite test debug run`, () => {
  const testProjectRunner = new TestProjectRunner("project B");

  test("debugAll", async () =>
    await testProjectRunner.debugAll(wsConfig, noBehaveIni, noRunOptions, expectations)
  )


});

