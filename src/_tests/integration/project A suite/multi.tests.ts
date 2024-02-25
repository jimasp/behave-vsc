import { noRunOptions } from "../_helpers/common";
import { TestProjectRunner } from "../_runners/projectRunner";
import { wsConfig, expectations, wsConfigParallel, behaveIni } from "./config";


suite(`project A suite: multi.tests`, () => {
	const testProjectRunner = new TestProjectRunner("project A");

	test("runAll", async () =>
		await testProjectRunner.runAll(wsConfig, behaveIni, noRunOptions, expectations));

	test("runAll - parallel", async () =>
		await testProjectRunner.runAll(wsConfigParallel, behaveIni, noRunOptions, expectations));

	test("runScenariosSubSetForEachFeature", async () =>
		await testProjectRunner.runSubsetOfScenariosForEachFeature(wsConfig, behaveIni, noRunOptions, expectations));

});

