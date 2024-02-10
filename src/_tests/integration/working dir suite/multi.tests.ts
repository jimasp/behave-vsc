import { TestProjectRunner } from "../_helpers/runners/projectRunner";
import { noBehaveIni, noRunOptions } from "../_helpers/common";
import { behaveIniFullPathsSetting, behaveIniWithRelPathsSetting, expectations, wsConfig, wsParallelConfig } from "./defaults";


// THIS FILE CONTAINS TESTS THAT WE WANT TO RUN FROM THE MULTIROOT SUITE ../multi-root suite/index.ts (as well as from ./index.ts)
// i.e. these are tests we want to run in parallel with other projects in the multiroot workspace


suite(`working dir suite`, function () {

	const testProjectRunner = new TestProjectRunner("working dir");

	test("runAll", async () =>
		await testProjectRunner.runAll(wsConfig, noBehaveIni, noRunOptions, expectations));

	test("runAll - with behave.ini paths as relative path", async () =>
		await testProjectRunner.runAll(wsConfig, behaveIniWithRelPathsSetting, noRunOptions, expectations));

	test("runAll - with behave.ini paths as full path", async () =>
		await testProjectRunner.runAll(wsConfig, behaveIniFullPathsSetting, noRunOptions, expectations));

	test("runAll - parallel", async () =>
		await testProjectRunner.runAll(wsParallelConfig, noBehaveIni, noRunOptions, expectations));

});





