import { TestWorkspaceRunners } from "../suite-helpers/testWorkspaceRunners";
import { configOptions, expectations, runOptions } from "./defaults";


suite(`sibling steps folder 1 suite`, () => {
	const testWorkspaceRunners = new TestWorkspaceRunners("sibling steps folder 1");

	test("runAllWithNoConfig", async () =>
		await testWorkspaceRunners.runAllWithNoConfig(expectations)).timeout(300000);

	test("runAllParallel", async () =>
		await testWorkspaceRunners.runAllParallel(configOptions, runOptions, expectations)).timeout(300000);

	test("runAll", async () =>
		await testWorkspaceRunners.runAll(configOptions, runOptions, expectations)).timeout(300000);

}).timeout(900000);



