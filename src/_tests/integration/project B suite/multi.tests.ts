import { TestProjectRunner } from "../_helpers/runners/projectRunner";
import { emptyBehaveIni, noConfig, noRunOptions, parallelConfig } from "../_helpers/common";
import { behaveIni, expectations } from "./defaults";

// THIS FILE CONTAINS TESTS THAT WE WANT TO RUN FROM ../multi-root suite/index.ts
// i.e. tests we want to run in parallel with other projects
//
// (These tests will ALSO be run via ./index.ts)

suite(`multi project B suite`, () => {
	const testProjectRunner = new TestProjectRunner("project B");

	test("runAll", async () =>
		await testProjectRunner.runAll(noConfig, emptyBehaveIni, noRunOptions, expectations));

	test("runAll - with behave.ini", async () =>
		await testProjectRunner.runAll(noConfig, behaveIni, noRunOptions, expectations));

	test("runAll - parallel", async () =>
		await testProjectRunner.runAll(parallelConfig, emptyBehaveIni, noRunOptions, expectations));

});

