import { TestProjectRunner } from "../_helpers/runners/projectRunner";
import { noBehaveIni, noConfig, noRunOptions } from "../_helpers/common";
import { behaveIni, expectations } from "./defaults";

// THIS FILE CONTAINS TESTS THAT WE WANT TO RUN FROM ../multi-root suite/index.ts
// i.e. tests we want to run in parallel with other projects
//
// (These tests will ALSO be run via ./index.ts)

suite(`higher steps folder suite`, () => {
	const testProjectRunner = new TestProjectRunner("higher steps folder");

	// (works with no behave.ini because steps folder is in project root)
	test("runAll - no behave.ini", async () =>
		await testProjectRunner.runAll(noConfig, noBehaveIni, noRunOptions, expectations));

	test("runAll - with behave.ini", async () =>
		await testProjectRunner.runAll(noConfig, behaveIni, noRunOptions, expectations));

});



