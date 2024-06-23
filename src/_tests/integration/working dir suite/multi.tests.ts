import { TestProjectRunner } from "../_common/projectRunner";
import { noBehaveIni, noRunOptions } from "../_common/types";
import {
	expectations, wsConfig, wsParallelConfig,
	behaveIniWith3AbsPathsSetting, behaveIniWith2RelPathsSetting, behaveIniWith3RelPathsSetting,
	expectationsWith3RelPathsBehaveIni, expectationsWith2RelPathsBehaveIni, expectationsWith3AbsPathsBehaveIni
} from "./config";



suite(`working dir suite`, function () {

	const testProjectRunner = new TestProjectRunner("working dir");

	test("runAll", async () =>
		await testProjectRunner.runAll(wsConfig, noBehaveIni, noRunOptions, expectations));

	test("runAll - parallel", async () =>
		await testProjectRunner.runAll(wsParallelConfig, noBehaveIni, noRunOptions, expectations));

	test("runAll - with behave.ini with 2 relative paths", async () =>
		await testProjectRunner.runAll(wsConfig, behaveIniWith2RelPathsSetting, noRunOptions, expectationsWith2RelPathsBehaveIni));

	test("runAll - with behave.ini with 3 relative paths", async () =>
		await testProjectRunner.runAll(wsConfig, behaveIniWith3RelPathsSetting, noRunOptions, expectationsWith3RelPathsBehaveIni));

	test("runAll - with behave.ini with 3 absolute paths", async () =>
		await testProjectRunner.runAll(wsConfig, behaveIniWith3AbsPathsSetting, noRunOptions, expectationsWith3AbsPathsBehaveIni));

});





