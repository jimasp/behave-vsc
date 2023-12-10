import { TestWorkspaceRunners, noConfig, noRunOptions, parallelConfig } from "../suite-helpers/testWorkspaceRunners";
import { expectations } from "./defaults";


suite(`simple suite`, () => {

	const testWorkspaceRunners = new TestWorkspaceRunners("simple");

	test("runAll", async () =>
		await testWorkspaceRunners.runAll(noConfig, noRunOptions, expectations)
	).timeout(300000);

	test("runAll - parallel", async () => {
		await testWorkspaceRunners.runAll(parallelConfig, noRunOptions, expectations)
	}).timeout(300000);

}).timeout(900000);



