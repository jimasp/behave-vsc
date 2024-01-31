import { TestProjectRunner } from "../_helpers/runners/projectRunner";
import { emptyBehaveIni, noRunOptions } from "../_helpers/common"
import { expectations, wsConfig } from "./defaults";


suite(`working dir suite test debug run`, () => {
  const testProjectRunner = new TestProjectRunner("working dir");

  test("debugAll", async () =>
    await testProjectRunner.debugAll(wsConfig, emptyBehaveIni, noRunOptions, expectations));

});

