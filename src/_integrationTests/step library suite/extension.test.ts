import { TestWorkspaceRunners } from "../suite-helpers/testWorkspaceRunners";
import { configOptions, expectations, runOptions } from "./defaults";


suite(`step library suite`, () => {
	const testWorkspaceRunners = new TestWorkspaceRunners("step library");

	test("runWithStepsLibrary", async () =>
		await testWorkspaceRunners.runAll(configOptions, runOptions, expectations)).timeout(300000);

}).timeout(900000);



