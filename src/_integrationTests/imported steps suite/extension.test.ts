import { TestWorkspaceRunners, noRunOptions } from "../suite-helpers/testWorkspaceRunners";
import { wsConfig, expectations } from "./defaults";


suite(`imported steps suite`, () => {
	const testWorkspaceRunners = new TestWorkspaceRunners("imported steps");

	test("runAll", async () =>
		await testWorkspaceRunners.runAll(wsConfig, noRunOptions, expectations)).timeout(300000);

}).timeout(900000);



