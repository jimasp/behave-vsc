import { TestProjectRunner, noBehaveIni, noConfig, noRunOptions } from "../_helpers/runners/projectRunner";
import { expectationsWithoutBehaveIniPaths } from "./defaults";


// this file is separate because we don't want to run parallel debug 
// sessions (which is not supported) when running the multi-root tests 

suite(`sibling steps folder 1 suite test debug run`, () => {
  const testProjectRunner = new TestProjectRunner("sibling steps folder 1");

  test("debugAll", async () => await testProjectRunner.debugAll(noConfig, noBehaveIni, noRunOptions, expectationsWithoutBehaveIniPaths));

});

