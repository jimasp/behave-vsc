import { TestWorkspaceRunners, noRunOptions } from "../suite-helpers/testWorkspaceRunners";
import { wsConfig, expectations } from "./defaults";


suite(`step library suite`, () => {
	const testWorkspaceRunners = new TestWorkspaceRunners("step library");

	test("runAll", async () =>
		await testWorkspaceRunners.runAll(wsConfig, noRunOptions, expectations)).timeout(300000);

}).timeout(900000);



