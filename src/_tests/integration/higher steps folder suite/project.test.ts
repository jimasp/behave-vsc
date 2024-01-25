import { TestProjectRunner } from "../_helpers/runners/projectRunner";
import { noBehaveIni, noConfig, noRunOptions } from "../_helpers/common";
import { expectations } from "./defaults";


// debug tests are in this separate file so we can ignore this file path in the multi-root suite/index.ts runner() constructor 
// (runMultiRootProjectsInParallel=true is not applicable to debug)

suite(`higher steps folder suite test debug run`, () => {
  const testProjectRunner = new TestProjectRunner("higher steps folder");

  test("debugAll", async () =>
    await testProjectRunner.debugAll(noConfig, noBehaveIni, noRunOptions, expectations));

});

