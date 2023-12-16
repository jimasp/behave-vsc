import { TestWorkspaceRunners, parallelConfig, noConfig, noRunOptions, } from "../_helpers/testWorkspaceRunners";
import { expectations } from "./defaults";


suite(`higher steps folder suite`, () => {
	const testWorkspaceRunners = new TestWorkspaceRunners("higher steps folder");

	test("runAll", async () =>
		await testWorkspaceRunners.runAll(noConfig, noRunOptions, expectations)
	).timeout(300000);

	test("runAll - parallel", async () =>
		await testWorkspaceRunners.runAll(parallelConfig, noRunOptions, expectations)
	).timeout(300000);


}).timeout(900000);



