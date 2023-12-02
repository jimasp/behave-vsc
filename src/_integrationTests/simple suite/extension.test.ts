import { TestWorkspaceRunners } from "../suite-helpers/testWorkspaceRunners";
import { configOptions, expectations, runOptions } from "./defaults";


suite(`simple suite`, () => {

	const testWorkspaceRunners = new TestWorkspaceRunners("simple");

	test("runAllWithNoConfig", async () =>
		await testWorkspaceRunners.runAllWithNoConfig(expectations)).timeout(300000);

	test("runAllParallel", async () =>
		await testWorkspaceRunners.runAllParallel(configOptions, runOptions, expectations)).timeout(300000);

	test("runAll", async () =>
		await testWorkspaceRunners.runAll(configOptions, runOptions, expectations)).timeout(300000);

}).timeout(900000);



