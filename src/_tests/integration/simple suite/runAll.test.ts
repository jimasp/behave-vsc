import { TestProjectRunner } from "../_helpers/runners/projectRunner";
import { noBehaveIni, noConfig, noRunOptions, parallelConfig } from "../_helpers/common"
import { behaveIni, expectations } from "./defaults";


suite(`simple suite`, function () {

	const testProjectRunner = new TestProjectRunner("simple");

	// test("runAll", async () =>
	// 	await testProjectRunner.runAll(noConfig, noBehaveIni, noRunOptions, expectations));

	// test("runAll - with behave.ini", async () =>
	// 	await testProjectRunner.runAll(noConfig, behaveIni, noRunOptions, expectations));

	// test("runAll - parallel", async () =>
	// 	await testProjectRunner.runAll(parallelConfig, noBehaveIni, noRunOptions, expectations));

});





