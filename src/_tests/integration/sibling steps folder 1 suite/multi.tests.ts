import { TestProjectRunner } from "../_common/projectRunner";
import { noBehaveIni, noConfig, parallelConfig, noRunOptions } from "../_common/types";
import { behaveIni, expectations, expectationsWithBehaveIni } from "./config";


suite(`sibling steps folder 1 suite: multi.tests`, () => {
	const testProjectRunner = new TestProjectRunner("sibling steps folder 1");

	test("runAll", async () =>
		await testProjectRunner.runAll(noConfig, noBehaveIni, noRunOptions, expectations));

	test("runAll - with behave.ini", async () =>
		await testProjectRunner.runAll(noConfig, behaveIni, noRunOptions, expectationsWithBehaveIni));

	test("runAll - parallel", async () =>
		await testProjectRunner.runAll(parallelConfig, noBehaveIni, noRunOptions, expectations));

});



