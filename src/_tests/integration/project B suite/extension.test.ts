import { TestProjectRunner, noBehaveIni, noRunOptions } from "../_helpers/testProjectRunner";
import { behaveIni, expectations, wsConfig, wsConfigParallel } from "./defaults";


suite(`project B suite`, () => {
	const testProjectRunner = new TestProjectRunner("project B");

	test("runAll", async () =>
		await testProjectRunner.runAll(wsConfig, noBehaveIni, noRunOptions, expectations));

	test("runAll - with behave.ini", async () =>
		await testProjectRunner.runAll(wsConfig, behaveIni, noRunOptions, expectations));

	test("runAll - parallel", async () =>
		await testProjectRunner.runAll(wsConfigParallel, noBehaveIni, noRunOptions, expectations));

});




