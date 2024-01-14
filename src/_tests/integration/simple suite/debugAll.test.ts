import { TestProjectRunner, noBehaveIni, noConfig, noRunOptions } from "../_helpers/runners/projectRunner";
import { expectations } from "./defaults";


// this file is separate because we don't want to run parallel debug 
// sessions when running the multi-root suite/index.ts tests 
// (runMultiRootProjectsInParallel=true is not applicable to debug)

suite(`simple suite test debug run`, () => {
  const testProjectRunner = new TestProjectRunner("simple");

  // test("debugAll", async () =>
  //   await testProjectRunner.debugAll(noConfig, noBehaveIni, noRunOptions, expectations));

});

