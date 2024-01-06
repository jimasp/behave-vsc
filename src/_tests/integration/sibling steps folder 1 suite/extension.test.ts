import { TestProjectRunner, noBehaveIni, noConfig, noRunOptions, parallelConfig } from "../_helpers/testProjectRunner";
import { behaveIni, expectationsWithBehaveIniPaths, expectationsWithoutBehaveIniPaths } from "./defaults";


suite(`sibling steps folder 1 suite`, () => {
	const testProjectRunner = new TestProjectRunner("sibling steps folder 1");

	test("runAll", async () =>
		await testProjectRunner.runAll(noConfig, noBehaveIni, noRunOptions, expectationsWithoutBehaveIniPaths));

	test("runAll - with behave.ini", async () =>
		await testProjectRunner.runAll(noConfig, behaveIni, noRunOptions, expectationsWithBehaveIniPaths));

	test("runAll - parallel", async () =>
		await testProjectRunner.runAll(parallelConfig, noBehaveIni, noRunOptions, expectationsWithoutBehaveIniPaths));

});



