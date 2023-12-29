import { TestWorkspaceRunners, noBehaveIni, noRunOptions } from "../_helpers/testWorkspaceRunners";
import { wsConfig, expectations, behaveIni } from "./defaults";


suite(`imported steps suite`, () => {
	const testWorkspaceRunners = new TestWorkspaceRunners("imported steps");

	test("runAll", async () =>
		await testWorkspaceRunners.runAll(wsConfig, noBehaveIni, noRunOptions, expectations));


	test("runAll - with behave.ini", async () =>
		await testWorkspaceRunners.runAll(wsConfig, behaveIni, noRunOptions, expectations));

});



