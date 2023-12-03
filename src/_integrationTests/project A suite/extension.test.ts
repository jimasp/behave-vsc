import { TestWorkspaceRunners, noRunOptions } from "../suite-helpers/testWorkspaceRunners";
import { wsConfig, expectations, wsConfigParallel } from "./default";


suite(`project A suite`, () => {
	const testWorkspaceRunners = new TestWorkspaceRunners("project A");


	test("runAll", async () =>
		await testWorkspaceRunners.runAll(wsConfig, noRunOptions, expectations)
	).timeout(300000);

	test("runAll - parallel", async () =>
		await testWorkspaceRunners.runAll(wsConfigParallel, noRunOptions, expectations)
	).timeout(300000);

}).timeout(900000);

