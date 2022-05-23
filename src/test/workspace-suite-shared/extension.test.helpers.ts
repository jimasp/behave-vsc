/* eslint-disable @typescript-eslint/no-explicit-any */
import * as vscode from 'vscode';
import * as assert from 'assert';
import { Configuration } from "../../Configuration";
import { WorkspaceSettings } from "../../settings";
import { TestSupport } from '../../extension';
import { TestResult } from "./expectedResults.helpers";
import { TestWorkspaceConfig, TestWorkspaceConfigWithWkspUri } from './testWorkspaceConfig';
import { getStepMatch } from '../../gotoStepHandler';
import { StepMap } from '../../stepsParser';
import { ParseCounts } from '../../FileParser';
import { getUrisOfWkspFoldersWithFeatures, getAllTestItems, getScenarioTests, getTestIdForUri } from '../../common';
import { performance } from 'perf_hooks';


function assertTestResultMatchesExpectedResult(expectedResults: TestResult[], actualResult: TestResult, testConfig: TestWorkspaceConfig): TestResult[] {

	const match = expectedResults.filter((expectedResult: TestResult) => {

		if (
			expectedResult.test_id !== actualResult.test_id ||
			expectedResult.test_uri !== actualResult.test_uri,
			expectedResult.test_parent !== actualResult.test_parent ||
			expectedResult.test_children !== actualResult.test_children ||
			expectedResult.test_description !== actualResult.test_description ||
			expectedResult.test_error !== actualResult.test_error ||
			expectedResult.test_label !== actualResult.test_label ||
			expectedResult.scenario_isOutline !== actualResult.scenario_isOutline ||
			expectedResult.scenario_getLabel !== actualResult.scenario_getLabel ||
			expectedResult.scenario_featureName !== actualResult.scenario_featureName ||
			expectedResult.scenario_scenarioName !== actualResult.scenario_scenarioName ||
			expectedResult.scenario_fastSkipTag !== actualResult.scenario_fastSkipTag
		) {

			if (expectedResult.test_id === actualResult.test_id) {
				debugger; // eslint-disable-line no-debugger 
				throw `test ids matched but properties were different:\n` +
				`expectedResult:${JSON.stringify(expectedResult)}\n` +
				`actualResult:${JSON.stringify(actualResult)}\n`;
			}

			return false;
		}

		// now match shortened expected result string:

		if (expectedResult.scenario_result !== actualResult.scenario_result) {
			debugger; // eslint-disable-line no-debugger	
			if (actualResult.scenario_result) {
				throw `test ids matched but result did not match expected result\n` +
				`expectedResult:${JSON.stringify(expectedResult)}\n` +
				`actualResult:${JSON.stringify(actualResult)}\n` +
				`testConfig:${JSON.stringify(testConfig)}\n`;
			}
			throw `result is undefined, was the test run cancelled?\n` +
			`actualResult:${JSON.stringify(expectedResult)}\n` +
			`testConfig:${JSON.stringify(testConfig)}\n`;
		}

		return true;

	}); // end filter


	if (match.length !== 1) {
		console.log(actualResult);
		// eslint-disable-next-line no-debugger
		debugger; // UHOH (did we add a new test that hasn't been added to expected results? if so, see debug console and copy/paste into ws?.expectedResults.ts)
		throw `match.length was:${match.length} when attempting to match test id ${actualResult.test_id} to expected result`;
	}

	return match;
}


function assertWorkspaceSettingsAsExpected(wkspName: string, wkspUri: vscode.Uri, testConfig: TestWorkspaceConfig, config: Configuration) {

	// multiroot will read window settings from multiroot.code-workspace file, not config
	if (!(global as any).multiRootTest) {
		const winSettings = config.globalSettings;
		assert.strictEqual(winSettings.alwaysShowOutput, testConfig.getExpected("alwaysShowOutput"), wkspName);
		assert.strictEqual(winSettings.multiRootRunWorkspacesInParallel, testConfig.getExpected("multiRootRunWorkspacesInParallel"), wkspName);
		assert.strictEqual(winSettings.showConfigurationWarnings, testConfig.getExpected("showConfigurationWarnings"), wkspName);
		assert.strictEqual(winSettings.logDiagnostics, testConfig.getExpected("logDiagnostics"), wkspName);
	}

	const wkspSettings = config.workspaceSettings[wkspUri.path];
	assert.deepStrictEqual(wkspSettings.envVarList, testConfig.getExpected("envVarList"), wkspName);
	assert.deepStrictEqual(wkspSettings.fastSkipList, testConfig.getExpected("fastSkipList"), wkspName);
	assert.strictEqual(wkspSettings.workspaceRelativeFeaturesPath, testConfig.getExpected("featuresPath"), wkspName);
	assert.strictEqual(wkspSettings.featuresUri.path, testConfig.getExpected("featuresUri.path", wkspUri), wkspName);
	assert.strictEqual(wkspSettings.featuresUri.fsPath, testConfig.getExpected("featuresUri.fsPath", wkspUri), wkspName);
	assert.strictEqual(wkspSettings.justMyCode, testConfig.getExpected("justMyCode"), wkspName);
	assert.strictEqual(wkspSettings.runAllAsOne, testConfig.getExpected("runAllAsOne"), wkspName);
	assert.strictEqual(wkspSettings.runParallel, testConfig.getExpected("runParallel"), wkspName);
}


function addStepsFromFeatureFile(content: string, featureSteps: string[]) {
	const lines = content.trim().split('\n');
	for (let lineNo = 0; lineNo < lines.length; lineNo++) {

		const line = lines[lineNo].trim();

		if (line === '' || line.startsWith("#")) {
			continue;
		}

		const lcase = line.toLowerCase();
		if (lcase.startsWith("given ") || lcase.startsWith("when ") || lcase.startsWith("then ")) {
			featureSteps.push(line);
		}
	}

	return featureSteps;
}


async function getAllStepsFromFeatureFiles(wkspSettings: WorkspaceSettings) {

	const stepLines: string[] = [];
	const pattern = new vscode.RelativePattern(wkspSettings.uri, `${wkspSettings.workspaceRelativeFeaturesPath}/**/*.feature`);
	const featureFileUris = await vscode.workspace.findFiles(pattern, null);

	for (const featFileUri of featureFileUris) {
		const doc = await vscode.workspace.openTextDocument(featFileUri);
		const content = doc.getText();
		addStepsFromFeatureFile(content, stepLines);
	}

	return [...new Set(stepLines)]; // remove duplicates
}


async function assertAllStepsCanBeMatched(parsedSteps: StepMap, wkspSettings: WorkspaceSettings) {

	const featureSteps = await getAllStepsFromFeatureFiles(wkspSettings);

	for (const idx in featureSteps) {
		const line = featureSteps[idx];
		try {
			if (!line.includes("missing step")) {
				const match = getStepMatch(wkspSettings, parsedSteps, line);
				assert(match, "match");
			}
		}
		catch (e: unknown) {
			debugger; // eslint-disable-line no-debugger
			if (e instanceof assert.AssertionError)
				throw new Error(`getStepMatch() could not find match for step line: "${line}"`);
			throw e;
		}
	}
}


function standardisePath(path: string | undefined): string | undefined {
	if (!path)
		return path;
	path = decodeURI(path);
	const find = "/example-projects/";
	return path === undefined ? undefined : "..." + path.substring(path.indexOf(find) + find.length - 1);
}


function standardiseResult(result: string | undefined): string | undefined {
	let res = result;
	if (!result)
		return undefined;

	const tbm = /Traceback.*:\n {2}File /;
	const tbe = tbm.exec(result);
	if (!tbe)
		return res;

	const tb = tbe[0];
	const tbi = result.search(tbm);

	if (tbi !== -1) {
		let tbSnip = result.indexOf("assert ");
		if (tbSnip === -1)
			tbSnip = result.indexOf("raise Exception(");
		if (tbSnip !== -1)
			res = result.replace(result.substring(tbi + tb.length, tbSnip), "-snip- ");
	}

	return res;
}

function getChildrenIds(children: vscode.TestItemCollection): string | undefined {
	if (children.size === 0)
		return undefined;
	const arrChildrenIds: string[] = [];
	children.forEach(child => {
		arrChildrenIds.push(child.id);
	});
	return arrChildrenIds.join();
}

function assertExpectedCounts(debug: boolean, wkspUri: vscode.Uri, wkspName: string, config: Configuration,
	getExpectedCounts: (debug: boolean, wkspUri: vscode.Uri, config: Configuration) => ParseCounts,
	actualCounts: ParseCounts, hasMuliRootWkspNode: boolean) {

	const expectedCounts = getExpectedCounts(debug, wkspUri, config);

	assert(actualCounts.featureFileCountExcludingEmptyOrCommentedOut == expectedCounts.featureFileCountExcludingEmptyOrCommentedOut, wkspName);
	assert(actualCounts.tests.testCount == expectedCounts.tests.testCount, wkspName);

	assert(actualCounts.stepFiles === expectedCounts.stepFiles, wkspName);
	assert(actualCounts.stepMappings === expectedCounts.stepMappings, wkspName);

	if (hasMuliRootWkspNode)
		assert(actualCounts.tests.nodeCount == expectedCounts.tests.nodeCount + 1, wkspName);
	else
		assert(actualCounts.tests.nodeCount == expectedCounts.tests.nodeCount, wkspName);
}


function assertInstances(instances: TestSupport) {
	assert(instances);
	assert(instances.config);
	assert(instances.ctrl);
	assert(instances.getSteps);
	assert(instances.parser);
	assert(instances.runHandler);
	assert(instances.testData);
	assert(instances.configurationChangedHandler);
}

function getWorkspaceUri(wkspName: string) {
	const uris = getUrisOfWkspFoldersWithFeatures();
	const wkspUri = uris.find(uri => uri.path.includes(wkspName));
	assert(wkspUri, "wkspUri");
	return wkspUri;
}

//declare const global: any; // eslint-disable-line @typescript-eslint/no-explicit-any
//global.lock = "";
let lockVal = "";

// used to mitigate parallel workspace initialisation for multiroot parallel workspace testing
// (it's a bad lock implementation, but works for our needs here, and more importantly adds logs to let us know what's happening)
async function setLock(consoleName: string, acquireOrRelease: string) {

	if (!(global as any).multiRootTest)
		return;

	if (!["acquire", "release"].includes(acquireOrRelease))
		throw "invalid value for acquire or release";

	if (acquireOrRelease === "release") {
		console.log(`${consoleName}: setLock releasing lock`);
		lockVal = "";
		return;
	}

	if (!lockVal && acquireOrRelease === "acquire") {
		lockVal = consoleName;
		console.log(`${consoleName}: setLock acquiring lock`);
		return;
	}

	const start = performance.now()
	for (let i = 0; i < 300; i++) { // (generous for the sake of debugging)
		if (!lockVal)
			break;
		console.log(`${consoleName}: setLock waiting for ${lockVal} to release lock`);
		await new Promise(t => setTimeout(t, 200));
	}
	const waited = performance.now() - start;

	if (lockVal) {
		throw new Error(`${consoleName}: setLock timed out after ${waited} waiting for all workspaces to initialise`);
	}
	else {
		if (acquireOrRelease === "acquire") {
			lockVal = consoleName;
			console.log(`${consoleName}: setLock acquired lock after ${waited}`);
		}
	}

}


// activate only once for parallel (multiroot) calls and get the same instances
let extInstances: TestSupport | undefined = undefined;
async function getExtensionInstances(): Promise<TestSupport> {

	if (extInstances)
		return extInstances;

	const extension = vscode.extensions.getExtension("jimasp.behave-vsc");
	assert(extension);
	assert(extension.isActive);

	// call activate() to get instances
	const start = performance.now();
	extInstances = await extension.activate() as TestSupport;
	const tookMs = performance.now() - start;
	console.log(`activate call time: ${tookMs} ms`);
	assert(tookMs < 5);
	assert(extension.isActive);
	assertInstances(extInstances);
	extInstances.config.integrationTestRun = true;

	// wait for any initial parse to complete
	await extInstances.parser.readyForRun(5000, "getExtensionInstances");

	await vscode.commands.executeCommand("testing.clearTestResults");
	await vscode.commands.executeCommand("workbench.view.testing.focus");
	return extInstances;
}


// NOTE: when workspace-multiroot-suite/index.ts is run (in order to test parallel workspace runs) this
// function will run in parallel with itself (but as per the promises in that file, only one instance at a time for a given workspace, 
// so example project workspaces 1 & 2 & simple can run in parallel, but not e.g. 1&1)
export async function runAllTestsAndAssertTheResults(debug: boolean, wkspName: string, testConfig: TestWorkspaceConfig,
	getExpectedCounts: (debug: boolean, wkspUri: vscode.Uri, config: Configuration) => ParseCounts,
	getExpectedResults: (debug: boolean, wkspUri: vscode.Uri, config: Configuration) => TestResult[]) {

	const consoleName = `runAllTestsAndAssertTheResults for ${wkspName}`;
	const wkspUri = getWorkspaceUri(wkspName);

	await setLock(consoleName, "acquire");
	console.log(`${consoleName} initialising`);

	const instances = await getExtensionInstances();

	// normally OnDidChangeConfiguration is called when the user changes the settings in the extension
	// we  we need call it manually to insert a test config
	console.log(`${consoleName}: calling configurationChangedHandler`);
	await instances.configurationChangedHandler(undefined, new TestWorkspaceConfigWithWkspUri(testConfig, wkspUri));
	assertWorkspaceSettingsAsExpected(wkspName, wkspUri, testConfig, instances.config);

	// parse and check counts
	const actualCounts = await instances.parser.parseFilesForWorkspace(wkspUri, instances.testData, instances.ctrl, "checkParseFileCounts");
	const allWkspItems = getAllTestItems(wkspUri, instances.ctrl.items);
	console.log(`${consoleName}: workspace nodes:${allWkspItems.length}`);
	assert(actualCounts !== null, "actualCounts !== null");
	const hasMuliRootWkspNode = allWkspItems.find(item => item.id === getTestIdForUri(wkspUri)) !== undefined;
	assertExpectedCounts(debug, wkspUri, wkspName, instances.config, getExpectedCounts, actualCounts, hasMuliRootWkspNode);

	// check all steps can be matched
	await assertAllStepsCanBeMatched(instances.getSteps(), instances.config.workspaceSettings[wkspUri.path]);

	// sanity check include length matches expected length
	const include = getScenarioTests(instances.testData, allWkspItems);
	console.log(`${consoleName}: testData = ${JSON.stringify(instances.testData)}`);
	const expectedResults = getExpectedResults(debug, wkspUri, instances.config);
	console.log(`${consoleName}: test includes = ${include.length}, tests expected = ${expectedResults.length}`);
	// included tests (scenarios) and expected tests lengths should be equal, but 
	// we allow greater than because there is a more helpful assert later (assertTestResultMatchesExpectedResult) if tests have been added	
	assert(include.length >= expectedResults.length, consoleName + ", (see counts above)");
	console.log(`${consoleName}: initialised`);


	// run behave tests - we kick the runHandler off inside the lock to ensure that readyForRun() will 
	// pass, i.e. no other parsing gets kicked off until it has begun.
	// we do NOT want to await the runHandler as we want to release the lock for parallel run execution for multi-root
	console.log(`${consoleName}: calling runHandler to run tests...`);
	const runRequest = new vscode.TestRunRequest(include, undefined, undefined);
	assert(await instances.parser.readyForRun(0, consoleName));
	const fakeTestRunStopButtonToken = new vscode.CancellationTokenSource().token;
	const resultsPromise = instances.runHandler(debug, runRequest, fakeTestRunStopButtonToken);

	await setLock(consoleName, "release");


	if (debug) {
		// timeout hack to show test ui during debug testing so we can see progress		
		await new Promise(t => setTimeout(t, 1000));
		await vscode.commands.executeCommand("workbench.view.testing.focus");
	}
	const results = await resultsPromise;
	console.log(`${consoleName}: runHandler completed`);

	// validate results

	if (!results || results.length === 0)
		throw new Error(`${consoleName}: no results returned from runHandler`);

	results.forEach(result => {

		const scenResult = new TestResult({
			test_id: standardisePath(result.test.id),
			test_uri: standardisePath(result.test.uri?.toString()),
			test_parent: standardisePath(result.test.parent?.id),
			test_children: getChildrenIds(result.test.children),
			test_description: result.test.description,
			test_error: result.test.error?.toString(),
			test_label: result.test.label,
			scenario_isOutline: result.scenario.isOutline,
			scenario_getLabel: result.scenario.getLabel(),
			scenario_featureFileRelativePath: result.scenario.featureFileWorkspaceRelativePath,
			scenario_featureName: result.scenario.featureName,
			scenario_scenarioName: result.scenario.scenarioName,
			scenario_fastSkipTag: result.scenario.fastSkipTag,
			scenario_result: standardiseResult(result.scenario.result)
		});


		assert(JSON.stringify(result.test.range).includes("line"), 'JSON.stringify(result.test.range).includes("line")');
		assertTestResultMatchesExpectedResult(expectedResults, scenResult, testConfig);
	});


	// (keep this below results.forEach, as individual match asserts are more useful to get first)
	assert.equal(results.length, expectedResults.length, "results.length === expectedResults.length");
}




