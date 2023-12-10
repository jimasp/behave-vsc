import { TestWorkspaceRunners, noRunOptions } from "../suite-helpers/testWorkspaceRunners";
import { expectations, wsConfig, wsConfigParallel } from "./defaults";


suite(`project B suite`, () => {
	const testWorkspaceRunners = new TestWorkspaceRunners("project B");

	test("runAll", async () =>
		await testWorkspaceRunners.runAll(wsConfig, noRunOptions, expectations)
	).timeout(300000);

	test("runAll - parallel", async () =>
		await testWorkspaceRunners.runAll(wsConfigParallel, noRunOptions, expectations)
	).timeout(300000);


}).timeout(900000);



