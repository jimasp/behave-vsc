import { TestWorkspaceRunners, noBehaveIni, noRunOptions } from "../_helpers/testWorkspaceRunners";
import { behaveIni, expectations, wsConfig, wsConfigParallel } from "./defaults";


suite(`project B suite`, () => {
	const testWorkspaceRunners = new TestWorkspaceRunners("project B");

	test("runAll", async () =>
		await testWorkspaceRunners.runAll(wsConfig, noBehaveIni, noRunOptions, expectations));

	test("runAll - with behave.ini", async () =>
		await testWorkspaceRunners.runAll(wsConfig, behaveIni, noRunOptions, expectations));

	test("runAll - parallel", async () =>
		await testWorkspaceRunners.runAll(wsConfigParallel, noBehaveIni, noRunOptions, expectations));

});




