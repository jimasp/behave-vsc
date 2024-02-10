import { TestProjectRunner } from "../_helpers/runners/projectRunner";
import { noBehaveIni, noConfig, noRunOptions } from "../_helpers/common";
import { expectations } from "./defaults";


suite(`higher steps folder suite test debug run`, () => {
  const testProjectRunner = new TestProjectRunner("higher steps folder");

  test("debugAll", async () =>
    await testProjectRunner.debugAll(noConfig, noBehaveIni, noRunOptions, expectations));

});

