import { TestWorkspaceRunners } from "../suite-helpers/testWorkspaceRunners";
import { configOptions, expectations, runOptions } from "./defaults";


suite(`project B suite`, () => {
	const testWorkspaceRunners = new TestWorkspaceRunners("project B");

	test("runAllParallel", async () =>
		await testWorkspaceRunners.runAllParallel(configOptions, runOptions, expectations)).timeout(300000);

	test("runAll", async () =>
		await testWorkspaceRunners.runAll(configOptions, runOptions, expectations)).timeout(300000);

}).timeout(900000);



