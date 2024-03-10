import { TestProjectRunner } from "../_common/projectRunner";
import { TestWorkspaceConfig } from "../_common/testWorkspaceConfig";
import { noBehaveIni, noConfig, noRunOptions, parallelConfig, testGlobals } from "../_common/types"
import { wsConfig as useCustomRunnerConfig } from "../use custom runner suite/config";
import { behaveIni, expectations, expectationsWithBehaveIni, runOptions } from "./config";
import { getExpectedResults } from "./expectedResults";


suite(`simple suite: multi.tests`, function () {

	const testProjectRunner = new TestProjectRunner("simple");

	test("runAll", async () =>
		await testProjectRunner.runAll(noConfig, noBehaveIni, noRunOptions, expectations));

	test("runAll - with behave.ini", async () =>
		await testProjectRunner.runAll(noConfig, behaveIni, noRunOptions, expectationsWithBehaveIni));

	test("runAll - parallel", async () =>
		await testProjectRunner.runAll(parallelConfig, noBehaveIni, noRunOptions, expectations));

	test("runScenariosSubSetForEachFeature", async () =>
		await testProjectRunner.runSubsetOfScenariosForEachFeature(noConfig, behaveIni, noRunOptions, expectationsWithBehaveIni));

	// not much point in a parallel subset test, but we'll keep it in the simple suite, just in case things change
	test("runScenariosSubSetForEachFeature - parallel", async () =>
		await testProjectRunner.runSubsetOfScenariosForEachFeature(parallelConfig, noBehaveIni, noRunOptions, expectations));



	if (testGlobals.multiRootTest) {

		// Run profiles are global for the vscode instance, i.e. apply to all projects in a multiroot workspace.
		// These tests check that running a runprofile with a customRunner against a project (i.e. Simple in this case) 
		// that does NOT contain the customRunner.script in its behave working directory will simply mark all tests as skipped.		

		const simpleGetExpectedResults = () => getExpectedResults().map(r => ({ ...r, scenario_result: "skipped" }));
		const customRunnerExpectations = {
			...expectations,
			getExpectedResultsFunc: simpleGetExpectedResults
		};
		const customRunnerConfig = new TestWorkspaceConfig({
			...useCustomRunnerConfig,
			runParallel: false,
			behaveWorkingDirectory: ""
		});

		test("runAll - custom runner profile: wait for results - SIMPLE PROJECT", async () => {
			const testProjectRunner = new TestProjectRunner("simple");
			runOptions.selectedRunProfile = "behave-django runner profile: wait for test results";
			await testProjectRunner.runAll(customRunnerConfig, noBehaveIni, runOptions, customRunnerExpectations, false, false);
		});

		test("runAll - custom runner profile: do NOT wait for results - SIMPLE PROJECT", async () => {
			const testProjectRunner = new TestProjectRunner("simple");
			runOptions.selectedRunProfile = "behave-django runner profile: do NOT wait for test results";
			await testProjectRunner.runAll(customRunnerConfig, noBehaveIni, runOptions, customRunnerExpectations, false, false);
		});
	}


});





