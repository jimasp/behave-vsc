import { TestWorkspaceRunners, noBehaveIni, noConfig, noRunOptions, parallelConfig } from "../_helpers/testWorkspaceRunners";
import { behaveIni, expectationsWithoutBehaveIniPaths, expectationsWithBehaveIniPaths } from "./defaults";


suite(`multiple feature folders suite`, () => {

	const testWorkspaceRunners = new TestWorkspaceRunners("multiple top-level features folders");

	// NOTE THAT THERE ARE 2 EXPECTATION OBJECTS HERE which correlate to with/without behave.ini 

	test("runAll", async () =>
		await testWorkspaceRunners.runAll(noConfig, noBehaveIni, noRunOptions, expectationsWithoutBehaveIniPaths));

	test("runAll - with behave.ini", async () =>
		await testWorkspaceRunners.runAll(noConfig, behaveIni, noRunOptions, expectationsWithBehaveIniPaths));

	test("runAll - parallel", async () => {
		await testWorkspaceRunners.runAll(parallelConfig, noBehaveIni, noRunOptions, expectationsWithoutBehaveIniPaths)
	})

});



