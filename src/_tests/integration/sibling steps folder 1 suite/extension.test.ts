import { TestWorkspaceRunners, noBehaveIni, noConfig, noRunOptions, parallelConfig } from "../_helpers/testWorkspaceRunners";
import { behaveIni, expectationsWithBehaveIniPaths, expectationsWithoutBehaveIniPaths } from "./defaults";


suite(`sibling steps folder 1 suite`, () => {
	const testWorkspaceRunners = new TestWorkspaceRunners("sibling steps folder 1");

	test("runAll", async () =>
		await testWorkspaceRunners.runAll(noConfig, noBehaveIni, noRunOptions, expectationsWithoutBehaveIniPaths));

	test("runAll - with behave.ini", async () =>
		await testWorkspaceRunners.runAll(noConfig, behaveIni, noRunOptions, expectationsWithBehaveIniPaths));

	test("runAll - parallel", async () =>
		await testWorkspaceRunners.runAll(parallelConfig, noBehaveIni, noRunOptions, expectationsWithoutBehaveIniPaths));

});



