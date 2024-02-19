import { TestProjectRunner } from "../_runners/projectRunner";
import { noBehaveIni, noRunOptions } from "../_helpers/common";
import { behaveIniFullPathsSetting, behaveIniWithRelPathsSetting, expectationsWithBehaveIni, expectationsWithoutBehaveIni, wsConfig, wsParallelConfig } from "./config";



suite(`working dir suite`, function () {

	const testProjectRunner = new TestProjectRunner("working dir");

	test("runAll", async () =>
		await testProjectRunner.runAll(wsConfig, noBehaveIni, noRunOptions, expectationsWithoutBehaveIni));

	test("runAll - with behave.ini paths as relative path", async () =>
		await testProjectRunner.runAll(wsConfig, behaveIniWithRelPathsSetting, noRunOptions, expectationsWithBehaveIni));

	test("runAll - with behave.ini paths as full path", async () =>
		await testProjectRunner.runAll(wsConfig, behaveIniFullPathsSetting, noRunOptions, expectationsWithBehaveIni));

	test("runAll - parallel", async () =>
		await testProjectRunner.runAll(wsParallelConfig, noBehaveIni, noRunOptions, expectationsWithoutBehaveIni));

});





