import { TestProjectRunner } from "../_helpers/runners/projectRunner";
import { noBehaveIni, noConfig, noRunOptions, parallelConfig } from "../_helpers/common";
import { behaveIni, expectations } from "./defaults";


// THIS FILE CONTAINS TESTS THAT WE WANT TO RUN FROM ../multi-root suite/index.ts
// i.e. tests we want to run in parallel with other projects
//
// (These tests will ALSO be run via ./index.ts)

suite(`multiple top-level features folders suite`, () => {

	const testProjectRunner = new TestProjectRunner("multiple top-level features folders");

	// NOTE THAT THERE ARE 2 EXPECTATION OBJECTS HERE which correlate to with/without behave.ini 

	test("runAll - no behave.ini", async () =>
		await testProjectRunner.runAll(noConfig, noBehaveIni, noRunOptions, expectations));

	test("runAll - with behave.ini", async () =>
		await testProjectRunner.runAll(noConfig, behaveIni, noRunOptions, expectations));

	test("runAll - parallel", async () => {
		await testProjectRunner.runAll(parallelConfig, noBehaveIni, noRunOptions, expectations)
	})

});



