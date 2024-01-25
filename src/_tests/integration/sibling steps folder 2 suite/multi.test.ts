import { TestProjectRunner } from "../_helpers/runners/projectRunner";
import { noBehaveIni, noConfig, parallelConfig, noRunOptions } from "../_helpers/common";
import { expectations } from "./defaults";


// THIS FILE CONTAINS TESTS THAT WE WANT TO RUN FROM ../multi-root suite/index.ts
// i.e. tests we want to run in parallel with other projects
//
// (These tests will ALSO be run via ./index.ts)

suite(`sibling steps folder 2 suite`, () => {
	const testProjectRunner = new TestProjectRunner("sibling steps folder 2");

	test("runAll", async () =>
		await testProjectRunner.runAll(noConfig, noBehaveIni, noRunOptions, expectations));

	test("runAll - parallel", async () =>
		await testProjectRunner.runAll(parallelConfig, noBehaveIni, noRunOptions, expectations));

});


