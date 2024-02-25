import { TestProjectRunner } from "../_runners/projectRunner";
import { noBehaveIni, noConfig, noRunOptions } from "../_helpers/common";
import { behaveIni, expectations, expectationsWithBehaveIni } from "./config";

suite(`higher steps folder suite: multi.tests`, () => {
	const testProjectRunner = new TestProjectRunner("higher steps folder");

	// (works with no behave.ini because steps folder is in project root)
	test("runAll - no behave.ini", async () =>
		await testProjectRunner.runAll(noConfig, noBehaveIni, noRunOptions, expectations));

	test("runAll - with behave.ini", async () =>
		await testProjectRunner.runAll(noConfig, behaveIni, noRunOptions, expectationsWithBehaveIni));

});



