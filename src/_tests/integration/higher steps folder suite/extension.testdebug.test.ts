import { TestProjectRunner, noBehaveIni, noConfig, noRunOptions } from "../_helpers/runners/projectRunner";
import { expectations } from "./defaults";


// this file is separate because we don't want to run parallel debug 
// sessions (which is not supported) when running the multi-root tests 

suite(`higher steps folder suite test debug run`, () => {
  const testProjectRunner = new TestProjectRunner("higher steps folder");

  test("debugAll", async () =>
    await testProjectRunner.debugAll(noConfig, noBehaveIni, noRunOptions, expectations));

});

