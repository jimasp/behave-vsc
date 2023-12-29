import { TestWorkspaceRunners, noRunOptions } from "../_helpers/testWorkspaceRunners";
import { wsConfig, expectationsWithSettingsJson, wsConfigParallel, behaveIni } from "./default";


suite(`project A suite`, () => {
	const testWorkspaceRunners = new TestWorkspaceRunners("project A");


	test("runAll", async () =>
		await testWorkspaceRunners.runAll(wsConfig, behaveIni, noRunOptions, expectationsWithSettingsJson)
	)

	test("runAll - parallel", async () =>
		await testWorkspaceRunners.runAll(wsConfigParallel, behaveIni, noRunOptions, expectationsWithSettingsJson)
	)

});

