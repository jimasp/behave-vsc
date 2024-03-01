import { TestProjectRunner } from "../_common/projectRunner";
import { noBehaveIni, noConfig, noRunOptions, parallelConfig } from "../_common/types"
import { behaveIni, expectations, expectationsWithBehaveIni } from "./config";


suite(`simple suite: multi.tests`, function () {

	const testProjectRunner = new TestProjectRunner("simple");

	test("runAll", async () =>
		await testProjectRunner.runAll(noConfig, noBehaveIni, noRunOptions, expectations));

	test("runAll - with behave.ini", async () =>
		await testProjectRunner.runAll(noConfig, behaveIni, noRunOptions, expectationsWithBehaveIni));

	test("runAll - parallel", async () =>
		await testProjectRunner.runAll(parallelConfig, noBehaveIni, noRunOptions, expectations));

	test("runScenariosSubSetForEachFeature", async () =>
		await testProjectRunner.runSubsetOfScenariosForEachFeature(noConfig, behaveIni, noRunOptions, expectationsWithBehaveIni));

	// not much point in a parallel subset test, but we'll keep it in the simple suite, just in case things change
	test("runScenariosSubSetForEachFeature - parallel", async () =>
		await testProjectRunner.runSubsetOfScenariosForEachFeature(parallelConfig, noBehaveIni, noRunOptions, expectations));

});





