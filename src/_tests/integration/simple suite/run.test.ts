import { TestProjectRunner } from "../_helpers/runners/projectRunner";
import { noBehaveIni, noConfig, noRunOptions, parallelConfig } from "../_helpers/common"
import { behaveIni, expectations } from "./defaults";


suite(`simple suite`, function () {

	const testProjectRunner = new TestProjectRunner("simple");

	test("runAll", async () =>
		await testProjectRunner.runAll(noConfig, noBehaveIni, noRunOptions, expectations));

	test("runAll - with behave.ini", async () =>
		await testProjectRunner.runAll(noConfig, behaveIni, noRunOptions, expectations));

	test("runAll - parallel", async () =>
		await testProjectRunner.runAll(parallelConfig, noBehaveIni, noRunOptions, expectations));

	test("runScenariosSubSetForEachFeature", async () =>
		await testProjectRunner.runSubsetOfScenariosForEachFeature(noConfig, noRunOptions, expectations));

	// not much point in a parallel subset test, but we'll keep it in the simple suite, just in case things change
	test("runScenariosSubSetForEachFeature - parallel", async () =>
		await testProjectRunner.runSubsetOfScenariosForEachFeature(parallelConfig, noRunOptions, expectations));

});





