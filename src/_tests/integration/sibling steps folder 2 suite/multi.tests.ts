import { TestProjectRunner } from "../_runners/projectRunner";
import { noConfig, parallelConfig, noRunOptions } from "../_helpers/common";
import { behaveIni, expectations } from "./config";


suite(`sibling steps folder 2 suite: multi.tests`, () => {
	const testProjectRunner = new TestProjectRunner("sibling steps folder 2");

	test("runAll", async () =>
		await testProjectRunner.runAll(noConfig, behaveIni, noRunOptions, expectations));

	test("runAll - parallel", async () =>
		await testProjectRunner.runAll(parallelConfig, behaveIni, noRunOptions, expectations));

});



