import { TestWorkspaceRunners, noRunOptions } from "../_helpers/testWorkspaceRunners";
import { expectations, wsConfig, wsConfigParallel } from "./defaults";


suite(`project B suite`, () => {
	const testWorkspaceRunners = new TestWorkspaceRunners("project B");

	test("runAll", async () =>
		await testWorkspaceRunners.runAll(wsConfig, noRunOptions, expectations)
	)

	test("runAll - parallel", async () =>
		await testWorkspaceRunners.runAll(wsConfigParallel, noRunOptions, expectations)
	)


});



