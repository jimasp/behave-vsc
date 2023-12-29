import { TestWorkspaceRunners, noBehaveIni, noConfig, noRunOptions, parallelConfig } from "../_helpers/testWorkspaceRunners";
import { behaveIni, expectations } from "./defaults";


suite(`simple suite`, function () {

	const testWorkspaceRunners = new TestWorkspaceRunners("simple");

	test("runAll", async () =>
		await testWorkspaceRunners.runAll(noConfig, noBehaveIni, noRunOptions, expectations));

	test("runAll - with behave.ini", async () =>
		await testWorkspaceRunners.runAll(noConfig, behaveIni, noRunOptions, expectations));

	test("runAll - parallel", async () =>
		await testWorkspaceRunners.runAll(parallelConfig, noBehaveIni, noRunOptions, expectations));

});





