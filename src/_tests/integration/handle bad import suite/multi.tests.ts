import { TestProjectRunner } from "../_runners/projectRunner";
import { noBehaveIni, noConfig, noRunOptions } from "../_helpers/common"
import { expectations } from "./config";


suite(`handle bad import suite: multi.tests`, function () {
	const testProjectRunner = new TestProjectRunner("handle bad import");

	test("runAll", async () =>
		await testProjectRunner.runAll(noConfig, noBehaveIni, noRunOptions, expectations));
});





