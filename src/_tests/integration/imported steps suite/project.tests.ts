import { TestProjectRunner } from "../_runners/projectRunner";
import { noBehaveIni, noRunOptions } from "../_helpers/common";
import { expectations, wsConfig } from "./config";

suite(`imported steps suite: project.tests`, () => {
	const testProjectRunner = new TestProjectRunner("imported steps");

	test("debugAll", async () =>
		await testProjectRunner.debugAll(wsConfig, noBehaveIni, noRunOptions, expectations));

});




