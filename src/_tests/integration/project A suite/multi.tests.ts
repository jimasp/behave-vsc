import { noRunOptions } from "../_helpers/common";
import { TestProjectRunner } from "../_helpers/runners/projectRunner";
import { wsConfig, expectations, wsConfigParallel, behaveIni } from "./defaults";


// THIS FILE CONTAINS TESTS THAT WE WANT TO RUN FROM THE MULTIROOT SUITE ../multi-root suite/index.ts (as well as from ./index.ts)
// i.e. these are tests we want to run in parallel with other projects in the multiroot workspace

suite(`project A suite`, () => {
	const testProjectRunner = new TestProjectRunner("project A");

	test("runAll", async () =>
		await testProjectRunner.runAll(wsConfig, behaveIni, noRunOptions, expectations));

	test("runAll - parallel", async () =>
		await testProjectRunner.runAll(wsConfigParallel, behaveIni, noRunOptions, expectations));

	test("runScenariosSubSetForEachFeature", async () =>
		await testProjectRunner.runSubsetOfScenariosForEachFeature(wsConfig, noRunOptions, expectations));

});

