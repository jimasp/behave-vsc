import { TestProjectRunner, noRunOptions } from "../_helpers/testProjectRunner";
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

