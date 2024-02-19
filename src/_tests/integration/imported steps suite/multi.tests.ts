import { TestProjectRunner } from "../_runners/projectRunner";
import { noBehaveIni, noRunOptions } from "../_helpers/common";
import { wsConfig, expectations, behaveIni } from "./config";

suite(`imported steps suite`, () => {
	const testProjectRunner = new TestProjectRunner("imported steps");

	test("runAll - no behave.ini", async () =>
		await testProjectRunner.runAll(wsConfig, noBehaveIni, noRunOptions, expectations));

	test("runAll - with behave.ini", async () =>
		await testProjectRunner.runAll(wsConfig, behaveIni, noRunOptions, expectations));

});



