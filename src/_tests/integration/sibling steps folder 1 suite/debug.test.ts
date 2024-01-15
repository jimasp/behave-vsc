import { TestProjectRunner } from "../_helpers/runners/projectRunner";
import { noBehaveIni, noConfig, noRunOptions } from "../_helpers/common";
import { expectationsWithoutBehaveIniPaths } from "./defaults";


// debug tests are in this separate file so we can ignore this file path in the multi-root suite/index.ts runner() constructor 
// (runMultiRootProjectsInParallel=true is not applicable to debug)

suite(`sibling steps folder 1 suite test debug run`, () => {
  const testProjectRunner = new TestProjectRunner("sibling steps folder 1");

  test("debugAll", async () => await testProjectRunner.debugAll(noConfig, noBehaveIni, noRunOptions, expectationsWithoutBehaveIniPaths));

});

