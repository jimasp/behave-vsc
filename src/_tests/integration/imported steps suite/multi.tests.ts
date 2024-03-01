import { TestProjectRunner } from "../_common/projectRunner";
import { noBehaveIni, noRunOptions } from "../_common/types";
import { wsConfig, expectations, behaveIni, expectationsWithBehaveIni } from "./config";

suite(`imported steps suite: multi.tests`, () => {
	const testProjectRunner = new TestProjectRunner("imported steps");

	test("runAll - no behave.ini", async () =>
		await testProjectRunner.runAll(wsConfig, noBehaveIni, noRunOptions, expectations));

	test("runAll - with behave.ini", async () =>
		await testProjectRunner.runAll(wsConfig, behaveIni, noRunOptions, expectationsWithBehaveIni));

});



