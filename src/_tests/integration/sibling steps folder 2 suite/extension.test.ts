import { TestWorkspaceRunners, noBehaveConfig, noConfig, noRunOptions, parallelConfig } from "../_helpers/testWorkspaceRunners";
import { expectations } from "./defaults";


suite(`sibling steps folder 2 suite`, () => {
	const testWorkspaceRunners = new TestWorkspaceRunners("sibling steps folder 2");

	test("runAll", async () =>
		await testWorkspaceRunners.runAll(noConfig, noBehaveConfig, noRunOptions, expectations)
	)

	test("runAll - parallel", async () =>
		await testWorkspaceRunners.runAll(parallelConfig, noBehaveConfig, noRunOptions, expectations)
	)

});



