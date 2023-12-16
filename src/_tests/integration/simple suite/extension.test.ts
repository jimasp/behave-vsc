import * as sinon from 'sinon';
import { TestWorkspaceRunners, behaveConfig_paths_features, noBehaveConfig, noConfig, noRunOptions, parallelConfig } from "../_helpers/testWorkspaceRunners";
import { expectations } from "./defaults";


suite(`simple suite`, function () {
	let sandbox: sinon.SinonSandbox;

	setup(() => {
		sandbox = sinon.createSandbox();
	});

	teardown(() => {
		sandbox.restore();
	});

	const testWorkspaceRunners = new TestWorkspaceRunners("simple");

	test("runAll", async () => {
		await testWorkspaceRunners.runAll(noConfig, noBehaveConfig, noRunOptions, expectations);
	})

	test("runAll - with behave config paths", async () => {
		await testWorkspaceRunners.runAll(noConfig, behaveConfig_paths_features, noRunOptions, expectations);
	})

	test("runAll - parallel", async () => {
		await testWorkspaceRunners.runAll(parallelConfig, noBehaveConfig, noRunOptions, expectations)
	})

});





