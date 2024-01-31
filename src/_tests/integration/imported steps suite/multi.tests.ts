import { TestProjectRunner } from "../_helpers/runners/projectRunner";
import { emptyBehaveIni, noRunOptions } from "../_helpers/common";
import { wsConfig, expectations, behaveIni } from "./defaults";

// THIS FILE CONTAINS TESTS THAT WE WANT TO RUN FROM ../multi-root suite/index.ts
// i.e. tests we want to run in parallel with other projects
//
// (These tests will ALSO be run via ./index.ts)

suite(`imported steps suite`, () => {
	const testProjectRunner = new TestProjectRunner("imported steps");

	test("runAll", async () =>
		await testProjectRunner.runAll(wsConfig, emptyBehaveIni, noRunOptions, expectations));

	test("runAll - with behave.ini", async () =>
		await testProjectRunner.runAll(wsConfig, behaveIni, noRunOptions, expectations));

});



