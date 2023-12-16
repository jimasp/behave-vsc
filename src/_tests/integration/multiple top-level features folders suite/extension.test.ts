import { TestWorkspaceRunners, noBehaveConfig, noConfig, noRunOptions, parallelConfig } from "../_helpers/testWorkspaceRunners";
import { expectations } from "./defaults";


suite(`multiple feature folders suite`, () => {

	const testWorkspaceRunners = new TestWorkspaceRunners("multiple top-level features folders");

	test("runAll", async () =>
		await testWorkspaceRunners.runAll(noConfig, noBehaveConfig, noRunOptions, expectations)
	)

	test("runAll - parallel", async () => {
		await testWorkspaceRunners.runAll(parallelConfig, noBehaveConfig, noRunOptions, expectations)
	})

});



