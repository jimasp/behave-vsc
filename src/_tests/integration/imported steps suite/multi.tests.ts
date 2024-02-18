import { TestProjectRunner } from "../_runners/projectRunner";
import { noBehaveIni, noRunOptions } from "../_helpers/common";
import { wsConfig, expectations, behaveIni } from "./defaults";

// THIS FILE CONTAINS TESTS THAT WE WANT TO RUN FROM THE MULTIROOT SUITE ../multi-root suite/index.ts (as well as from ./index.ts)
// i.e. these are tests we want to run in parallel with other projects in the multiroot workspace

suite(`imported steps suite`, () => {
	const testProjectRunner = new TestProjectRunner("imported steps");

	test("runAll - no behave.ini", async () =>
		await testProjectRunner.runAll(wsConfig, noBehaveIni, noRunOptions, expectations));

	test("runAll - with behave.ini", async () =>
		await testProjectRunner.runAll(wsConfig, behaveIni, noRunOptions, expectations));

});



