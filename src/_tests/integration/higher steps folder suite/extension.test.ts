import { TestWorkspaceRunners, noConfig, noRunOptions, noBehaveIni } from "../_helpers/testWorkspaceRunners";
import { behaveIni, expectations } from "./defaults";


suite(`higher steps folder suite`, () => {
	const testWorkspaceRunners = new TestWorkspaceRunners("higher steps folder");

	test("runAll", async () =>
		await testWorkspaceRunners.runAll(noConfig, noBehaveIni, noRunOptions, expectations));

	test("runAll - with behave.ini", async () =>
		await testWorkspaceRunners.runAll(noConfig, behaveIni, noRunOptions, expectations));

});



