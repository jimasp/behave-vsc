import { TestProjectRunner } from "../_common/projectRunner";
import { noBehaveIni, noConfig, noRunOptions } from "../_common/types"
import { expectations } from "./config";


suite(`nested steps folder suite: multi.tests`, function () {

	const testProjectRunner = new TestProjectRunner("nested steps folder");

	test("runAll", async () =>
		await testProjectRunner.runAll(noConfig, noBehaveIni, noRunOptions, expectations));

});





