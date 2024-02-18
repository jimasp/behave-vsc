import { TestProjectRunner } from "../_runners/projectRunner";
import { noBehaveIni, noConfig, noRunOptions, parallelConfig } from "../_helpers/common";
import { behaveIni, expectations } from "./defaults";


// THIS FILE CONTAINS TESTS THAT WE WANT TO RUN FROM THE MULTIROOT SUITE ../multi-root suite/index.ts (as well as from ./index.ts)
// i.e. these are tests we want to run in parallel with other projects in the multiroot workspace

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



