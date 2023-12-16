import { TestWorkspaceRunners, noConfig, noRunOptions, parallelConfig } from "../_helpers/testWorkspaceRunners";
import { expectations } from "./defaults";


suite(`multiple feature folders suite`, () => {

	const testWorkspaceRunners = new TestWorkspaceRunners("multiple top-level features folders");

	test("runAll", async () =>
		await testWorkspaceRunners.runAll(noConfig, noRunOptions, expectations)
	).timeout(300000);

	test("runAll - parallel", async () => {
		await testWorkspaceRunners.runAll(parallelConfig, noRunOptions, expectations)
	}).timeout(300000);

}).timeout(900000);



