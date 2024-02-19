import { TestProjectRunner } from "../_runners/projectRunner";
import { noBehaveIni, noRunOptions } from "../_helpers/common";
import { expectations, wsConfig } from "./defaults";

suite(`imported steps suite debug run`, () => {
	const testProjectRunner = new TestProjectRunner("imported steps");

	test("debugAll", async () =>
		await testProjectRunner.debugAll(wsConfig, noBehaveIni, noRunOptions, expectations));

});




