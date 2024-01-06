import { TestProjectRunner, noBehaveIni, noRunOptions } from "../_helpers/testProjectRunner";
import { wsConfig, expectations, behaveIni } from "./defaults";


suite(`imported steps suite`, () => {
	const testProjectRunner = new TestProjectRunner("imported steps");

	test("runAll", async () =>
		await testProjectRunner.runAll(wsConfig, noBehaveIni, noRunOptions, expectations));


	test("runAll - with behave.ini", async () =>
		await testProjectRunner.runAll(wsConfig, behaveIni, noRunOptions, expectations));

});



