import { TestProjectRunner } from "../_helpers/runners/projectRunner";
import { noBehaveIni, noConfig, noRunOptions } from "../_helpers/common";
import { expectationsWithoutBehaveIniPaths } from "./defaults";


suite(`sibling steps folder 1 suite test debug run`, () => {
  const testProjectRunner = new TestProjectRunner("sibling steps folder 1");

  test("debugAll", async () => await testProjectRunner.debugAll(noConfig, noBehaveIni, noRunOptions, expectationsWithoutBehaveIniPaths));

});

