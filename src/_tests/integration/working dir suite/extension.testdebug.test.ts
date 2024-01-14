import { TestProjectRunner } from "../_helpers/runners/projectRunner";
import { noBehaveIni, noRunOptions } from "../_helpers/common"
import { expectations, wsConfig } from "./defaults";


// this file is separate because we don't want to run parallel debug 
// sessions when running the multi-root suite/index.ts tests 
// (runMultiRootProjectsInParallel=true is not applicable to debug)

suite(`working dir suite test debug run`, () => {
  const testProjectRunner = new TestProjectRunner("working dir");

  test("debugAll", async () =>
    await testProjectRunner.debugAll(wsConfig, noBehaveIni, noRunOptions, expectations));

});

