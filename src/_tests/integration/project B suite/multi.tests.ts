import { TestProjectRunner } from "../_common/projectRunner";
import { noBehaveIni, noConfig, noRunOptions, parallelConfig } from "../_common/types";
import { behaveIni, expectations, expectationsWithBehaveIni } from "./config";

suite(`multi project B suite: multi.tests`, () => {
	const testProjectRunner = new TestProjectRunner("project B");

	test("runAll", async () =>
		await testProjectRunner.runAll(noConfig, noBehaveIni, noRunOptions, expectations));

	test("runAll - with behave.ini", async () =>
		await testProjectRunner.runAll(noConfig, behaveIni, noRunOptions, expectationsWithBehaveIni));

	test("runAll - parallel", async () =>
		await testProjectRunner.runAll(parallelConfig, noBehaveIni, noRunOptions, expectations));

});

