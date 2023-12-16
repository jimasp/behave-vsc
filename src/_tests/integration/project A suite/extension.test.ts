import { TestWorkspaceRunners, noRunOptions } from "../_helpers/testWorkspaceRunners";
import { wsConfig, expectations, wsConfigParallel, behaveConfig } from "./default";


suite(`project A suite`, () => {
	const testWorkspaceRunners = new TestWorkspaceRunners("project A");


	test("runAll", async () =>
		await testWorkspaceRunners.runAll(wsConfig, behaveConfig, noRunOptions, expectations)
	)

	test("runAll - parallel", async () =>
		await testWorkspaceRunners.runAll(wsConfigParallel, behaveConfig, noRunOptions, expectations)
	)

});

