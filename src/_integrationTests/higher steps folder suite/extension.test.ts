import { TestWorkspaceRunners, } from "../suite-helpers/testWorkspaceRunners";
import { configOptions, expectations, runOptions } from "./defaults";


suite(`higher steps folder suite`, () => {
	const testWorkspaceRunners = new TestWorkspaceRunners("higher steps folder");

	test("runAll", async () =>
		await testWorkspaceRunners.runAll(configOptions, runOptions, expectations)).timeout(300000);

	test("runAllParallel", async () =>
		await testWorkspaceRunners.runAllParallel(configOptions, runOptions, expectations)).timeout(300000);

	test("debugAll", async () => await testWorkspaceRunners.debugAll(configOptions, runOptions, expectations)).timeout(300000);

}).timeout(900000);



