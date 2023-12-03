import { TestWorkspaceRunners, noConfig, noRunOptions, parallelConfig } from "../suite-helpers/testWorkspaceRunners";
import { expectations } from "./defaults";


suite(`multiple feature folders suite`, () => {

	const testWorkspaceRunners = new TestWorkspaceRunners("multiple features folders");

	test("runAll", async () =>
		await testWorkspaceRunners.runAll(noConfig, noRunOptions, expectations)
	).timeout(300000);

	test("runAll - parallel", async () => {
		await testWorkspaceRunners.runAll(parallelConfig, noRunOptions, expectations)
	}).timeout(300000);

}).timeout(900000);



