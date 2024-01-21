import { TestProjectRunner } from "../_helpers/runners/projectRunner";
import { noBehaveIni, noRunOptions } from "../_helpers/common";
import { behaveIni, expectations, wsConfig, wsConfigParallel } from "./defaults";

// THIS FILE CONTAINS TESTS THAT WE WANT TO RUN FROM ../multi-root suite/index.ts
// i.e. tests we want to run in parallel with other projects
//
// (These tests will ALSO be run via ./index.ts)

suite(`project B suite: runMulti`, () => {
	const testProjectRunner = new TestProjectRunner("project B");

	// test("runAll", async () =>
	// 	await testProjectRunner.runAll(wsConfig, noBehaveIni, noRunOptions, expectations));

	// test("runAll - with behave.ini", async () =>
	// 	await testProjectRunner.runAll(wsConfig, behaveIni, noRunOptions, expectations));

	// test("runAll - parallel", async () =>
	// 	await testProjectRunner.runAll(wsConfigParallel, noBehaveIni, noRunOptions, expectations));

	// test("runSubsetOfScenariosForEachFeature", async () =>
	// 	await testProjectRunner.runSubsetOfScenariosForEachFeature(wsConfig, noRunOptions, expectations));

	// test("runSubsetOfScenariosForEachFeature - parallel", async () =>
	// 	await testProjectRunner.runSubsetOfScenariosForEachFeature(wsConfigParallel, noRunOptions, expectations));

	test("runFeatureSet", async () =>
		await testProjectRunner.runFeatureSet(wsConfig, noRunOptions, expectations));

});




