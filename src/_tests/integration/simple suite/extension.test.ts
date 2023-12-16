import * as sinon from 'sinon';
import { TestWorkspaceRunners, noConfig, noRunOptions, parallelConfig } from "../_helpers/testWorkspaceRunners";
import { expectations } from "./defaults";
import { services } from '../../../diService';


suite(`simple suite`, () => {
	let sandbox: sinon.SinonSandbox;

	setup(() => {
		sandbox = sinon.createSandbox();
	});

	teardown(() => {
		sandbox.restore();
	});

	const testWorkspaceRunners = new TestWorkspaceRunners("simple");

	test("runAll", async () => {
		await testWorkspaceRunners.runAll(noConfig, noRunOptions, expectations);
	}).timeout(300000);

	test("runAll - with behave config paths", async () => {
		// what about multiroot??? can we stop this replacing for that?
		sandbox.stub(services.behaveConfig, "getProjectRelativeBehaveConfigPaths").returns(["features"]);
		await testWorkspaceRunners.runAll(noConfig, noRunOptions, expectations);
	}).timeout(300000);

	test("runAll - parallel", async () => {
		await testWorkspaceRunners.runAll(parallelConfig, noRunOptions, expectations)
	}).timeout(300000);

}).timeout(900000);





