import { TestWorkspaceRunners } from "../suite-helpers/testWorkspaceRunners";
import { configOptions, expectations, runOptions } from "./default";


suite(`project A suite`, () => {
	const testWorkspaceRunners = new TestWorkspaceRunners("project A");


	test("runAll", async () =>
		await testWorkspaceRunners.runAll(configOptions, runOptions, expectations)).timeout(300000);

	test("runAllParallel", async () =>
		await testWorkspaceRunners.runAllParallel(configOptions, runOptions, expectations)).timeout(300000);

}).timeout(900000);

