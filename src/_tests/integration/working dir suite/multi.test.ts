import { TestProjectRunner } from "../_helpers/runners/projectRunner";
import { noBehaveIni, noRunOptions } from "../_helpers/common";
import { behaveIniFullPathsSetting, behaveIniWithRelPathsSetting, expectations, wsConfig, wsParallelConfig } from "./defaults";


// THIS FILE CONTAINS TESTS THAT WE WANT TO RUN FROM ../multi-root suite/index.ts
// i.e. tests we want to run in parallel with other projects
//
// (These tests will ALSO be run via ./index.ts)


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




