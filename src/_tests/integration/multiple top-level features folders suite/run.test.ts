import { TestProjectRunner } from "../_helpers/runners/projectRunner";
import { noBehaveIni, noConfig, noRunOptions, parallelConfig } from "../_helpers/common";
import { behaveIni, expectationsWithoutBehaveIniPaths, expectationsWithBehaveIniPaths } from "./defaults";


suite(`multiple top-level features folders suite`, () => {

	const testProjectRunner = new TestProjectRunner("multiple top-level features folders");

	// NOTE THAT THERE ARE 2 EXPECTATION OBJECTS HERE which correlate to with/without behave.ini 

	test("runAll", async () =>
		await testProjectRunner.runAll(noConfig, noBehaveIni, noRunOptions, expectationsWithoutBehaveIniPaths));

	test("runAll - with behave.ini", async () =>
		await testProjectRunner.runAll(noConfig, behaveIni, noRunOptions, expectationsWithBehaveIniPaths));

	test("runAll - parallel", async () => {
		await testProjectRunner.runAll(parallelConfig, noBehaveIni, noRunOptions, expectationsWithoutBehaveIniPaths)
	})

});



