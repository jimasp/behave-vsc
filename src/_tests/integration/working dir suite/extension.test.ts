import { TestProjectRunner, noBehaveIni, noRunOptions } from "../_helpers/testProjectRunner";
import { behaveIniFullPathsSetting, behaveIniWithRelPathsSetting, expectations, wsConfig, wsParallelConfig } from "./defaults";


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





