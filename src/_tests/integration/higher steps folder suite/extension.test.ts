import { TestProjectRunner } from "../_helpers/runners/projectRunner";
import { noBehaveIni, noConfig, noRunOptions } from "../_helpers/common";
import { behaveIni, expectations } from "./defaults";


suite(`higher steps folder suite`, () => {
	const testProjectRunner = new TestProjectRunner("higher steps folder");

	test("runAll", async () =>
		await testProjectRunner.runAll(noConfig, noBehaveIni, noRunOptions, expectations));

	test("runAll - with behave.ini", async () =>
		await testProjectRunner.runAll(noConfig, behaveIni, noRunOptions, expectations));

});



