import { TestWorkspaceRunners, noConfig, noRunOptions, parallelConfig } from "../suite-helpers/testWorkspaceRunners";
import { expectations } from "./defaults";


suite(`sibling steps folder 2 suite`, () => {
	const testWorkspaceRunners = new TestWorkspaceRunners("sibling steps folder 2");

	test("runAll", async () =>
		await testWorkspaceRunners.runAll(noConfig, noRunOptions, expectations)
	).timeout(300000);

	test("runAll - parallel", async () =>
		await testWorkspaceRunners.runAll(parallelConfig, noRunOptions, expectations)
	).timeout(300000);

}).timeout(900000);



