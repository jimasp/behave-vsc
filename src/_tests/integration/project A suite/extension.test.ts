import { noRunOptions } from "../_helpers/common";
import { TestProjectRunner } from "../_helpers/runners/projectRunner";
import { wsConfig, expectationsWithSettingsJson, wsConfigParallel, behaveIni } from "./default";


suite(`project A suite`, () => {
	const testProjectRunner = new TestProjectRunner("project A");


	test("runAll", async () =>
		await testProjectRunner.runAll(wsConfig, behaveIni, noRunOptions, expectationsWithSettingsJson)
	)

	test("runAll - parallel", async () =>
		await testProjectRunner.runAll(wsConfigParallel, behaveIni, noRunOptions, expectationsWithSettingsJson)
	)

});

