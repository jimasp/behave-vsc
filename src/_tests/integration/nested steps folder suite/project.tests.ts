import { TestProjectRunner } from "../_common/projectRunner";
import { noBehaveIni, noConfig, noRunOptions } from "../_common/types";
import { expectations } from "./config";



suite(`nested steps folder suite: project.tests`, function () {

  const testProjectRunner = new TestProjectRunner("nested steps folder");

  test("debugAll", async () =>
    await testProjectRunner.debugAll(noConfig, noBehaveIni, noRunOptions, expectations));


});

