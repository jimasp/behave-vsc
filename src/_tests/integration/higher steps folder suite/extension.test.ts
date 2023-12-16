import { TestWorkspaceRunners, parallelConfig, noConfig, noRunOptions, noBehaveConfig, } from "../_helpers/testWorkspaceRunners";
import { expectations } from "./defaults";


suite(`higher steps folder suite`, () => {
	const testWorkspaceRunners = new TestWorkspaceRunners("higher steps folder");

	test("runAll", async () =>
		await testWorkspaceRunners.runAll(noConfig, noBehaveConfig, noRunOptions, expectations)
	)

	test("runAll - parallel", async () =>
		await testWorkspaceRunners.runAll(parallelConfig, noBehaveConfig, noRunOptions, expectations)
	)


});



