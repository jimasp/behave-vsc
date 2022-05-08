/* eslint-disable @typescript-eslint/no-explicit-any */
import * as vscode from 'vscode';
import * as assert from 'assert';
import * as chai from 'chai';
import { Configuration } from "../../Configuration";
import { WorkspaceSettings } from "../../WorkspaceSettings";
import { TestSupport } from '../../extension';
import { TestResult } from "./expectedResults.helpers";
import { TestWorkspaceConfig } from './testWorkspaceConfig';
import { getStepMatch } from '../../gotoStepHandler';
import { Steps } from '../../stepsParser';
import { ParseCounts } from '../../FileParser';
import { getWorkspaceFolderUris, getAllTestItems, getScenarioTests } from '../../helpers';


function assertTestResultMatchesExpectedResult(expectedResults: TestResult[], actualResult: TestResult): TestResult[] {

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
			expectedResult.scenario_fastSkip !== actualResult.scenario_fastSkip
		) {

			if (expectedResult.test_id === actualResult.test_id) {
				console.log("actual:");
				console.log(JSON.stringify(actualResult));
				console.log("expected:");
				console.log(JSON.stringify(expectedResult));
				// eslint-disable-next-line no-debugger
				debugger; // UHOH
				throw "test ids matched but properties were different";
			}

			return false;
		}

		// now match shortened expected result string:

		if (expectedResult.scenario_result !== actualResult.scenario_result) {
			console.log("actual:");
			console.log(JSON.stringify(actualResult));
			console.log("expected:");
			console.log(JSON.stringify(expectedResult));
			// eslint-disable-next-line no-debugger
			debugger; // UHOH			
			throw "test ids matched but results did not match expected result";
		}

		return true;
	});

	if (match.length !== 1) {
		console.log(actualResult);
		// eslint-disable-next-line no-debugger
		debugger; // UHOH (did we add a new test that hasn't been added to expected results? if so, see debug console and copy/paste into ws?.expectedResults.ts)
		throw "match.length !== 1";
	}

	return match;
}


function assertWorkspaceSettingsAsExpected(wkspUri: vscode.Uri, testConfig: TestWorkspaceConfig, config: Configuration) {

	const winSettings = config.getWindowSettings();
	assert.strictEqual(winSettings.alwaysShowOutput, testConfig.getExpected("alwaysShowOutput"));
	assert.strictEqual(winSettings.runWorkspacesInParallel, testConfig.getExpected("runWorkspacesInParallel"));
	assert.strictEqual(winSettings.showConfigurationWarnings, testConfig.getExpected("showConfigurationWarnings"));

	const wkspSettings = config.getWorkspaceSettings(wkspUri);
	assert.deepStrictEqual(wkspSettings.envVarList, testConfig.getExpected("envVarList"));
	assert.deepStrictEqual(wkspSettings.fastSkipList, testConfig.getExpected("fastSkipList"));
	assert.strictEqual(wkspSettings.workspaceRelativeFeaturesPath, testConfig.getExpected("featuresPath"));
	assert.strictEqual(wkspSettings.featuresUri.path, testConfig.getExpected("featuresUri.path", wkspUri));
	assert.strictEqual(wkspSettings.featuresUri.fsPath, testConfig.getExpected("featuresUri.fsPath", wkspUri));
	assert.strictEqual(wkspSettings.justMyCode, testConfig.getExpected("justMyCode"));
	assert.strictEqual(wkspSettings.runAllAsOne, testConfig.getExpected("runAllAsOne"));
	assert.strictEqual(wkspSettings.runParallel, testConfig.getExpected("runParallel"));
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
	//const stepMap: Map<string, string[]> = new Map();
	const pattern = new vscode.RelativePattern(wkspSettings.featuresUri.path, "**/*.feature");
	const featureFileUris = await vscode.workspace.findFiles(pattern);

	for (const featFileUri of featureFileUris) {
		const doc = await vscode.workspace.openTextDocument(featFileUri);
		const content = doc.getText();
		addStepsFromFeatureFile(content, stepLines);
	}

	return [...new Set(stepLines)]; // remove duplicates
}


async function assertAllStepsCanBeMatched(parsedSteps: Steps, wkspSettings: WorkspaceSettings) {

	const featureSteps = await getAllStepsFromFeatureFiles(wkspSettings);

	for (const idx in featureSteps) {
		const line = featureSteps[idx];
		try {
			if (!line.includes("missing step")) {
				const match = getStepMatch(wkspSettings.uri, parsedSteps, line);
				assert(match, "match");
			}
		}
		catch (e: unknown) {
			// eslint-disable-next-line no-debugger
			debugger; // UHOH
			if (e instanceof assert.AssertionError)
				throw new Error(`getStepMatch() could not find match for step line: "${line}"`);
			throw e;
		}
	}
}


function standardisePath(path: string | undefined): string | undefined {
	return path === undefined ? undefined : "..." + path.substring(path.indexOf("/example-project-workspace"));
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

function assertExpectedCounts(getExpectedCounts: () => ParseCounts, actualCounts: ParseCounts, multiroot: vscode.TestItem | undefined) {
	const expectedCounts = getExpectedCounts();

	// feature file and tests (scenarios) lengths should be equal, but we allow 
	// greater than because there is a more helpful assert later if feature files/scenarios have been added
	assert(actualCounts.featureFileCount >= expectedCounts.featureFileCount, `expected:${expectedCounts.featureFileCount}, actual:${actualCounts.featureFileCount}`);
	assert(actualCounts.testCounts.testCount >= expectedCounts.testCounts.testCount);

	assert(actualCounts.stepFileCount === expectedCounts.stepFileCount);
	assert(actualCounts.stepsCount === expectedCounts.stepsCount);

	// (see comment above to explain greater than)
	if (multiroot)
		assert(actualCounts.testCounts.nodeCount >= expectedCounts.testCounts.nodeCount + 1); // add one for the workspace parent node if in multi-root mode
	else
		assert(actualCounts.testCounts.nodeCount >= expectedCounts.testCounts.nodeCount);
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
	const uris = getWorkspaceFolderUris();
	const wkspUri = uris.find(uri => uri.path.includes(wkspName));
	assert(wkspUri, "wkspUri");
	return wkspUri;
}


export const checkParseFileCounts = async (wkspName: string, getExpectedCounts: () => ParseCounts) => {
	const wkspUri = getWorkspaceUri(wkspName);
	const extension = vscode.extensions.getExtension("jimasp.behave-vsc");
	assert(extension);
	const instances = await extension.activate() as TestSupport;
	assert(extension.isActive, "extension.isActive");
	assertInstances(instances);
	const actualCounts = await instances.parser.parseFilesForWorkspace(wkspUri, instances.ctrl, "checkParseFileCounts");
	assert(actualCounts !== null, "actualCounts !== null");
	const allWkspItems = getAllTestItems(wkspUri, instances.ctrl.items);
	const multirootWkspItem = allWkspItems.find(item => item.id === wkspUri.fsPath);
	assertExpectedCounts(getExpectedCounts, actualCounts, multirootWkspItem);
}


export const runAllTestsAndAssertTheResults = async (debug: boolean, wkspName: string, testConfig: TestWorkspaceConfig,
	getExpectedResults: (debug: boolean, wkspUri: vscode.Uri, config: Configuration) => TestResult[]) => {

	const wkspUri = getWorkspaceUri(wkspName);
	const cancelToken = new vscode.CancellationTokenSource().token;
	vscode.commands.executeCommand("testing.clearTestResults");
	const extension = vscode.extensions.getExtension("jimasp.behave-vsc");
	assert(extension, "extension");
	const instances = await extension.activate() as TestSupport;
	assert(extension.isActive, "extension.isActive");
	assertInstances(instances);

	// normally OnDidChangeConfiguration is called when the user changes the settings in the extension
	// we can insert a test config, so we need call it manually 
	await instances.configurationChangedHandler(undefined, testConfig);
	assertWorkspaceSettingsAsExpected(wkspUri, testConfig, instances.config);

	// readyForRun() will happen in runHandler(), but we need to add more time
	// before requesting a test run due to contention
	// (we don't want to await parseFiles, because then our tests wouldn't cover the same timeout operation as real usage)
	const done = await instances.parser.readyForRun(3000);
	assert(done);

	// sanity check lengths
	const allWkspItems = getAllTestItems(wkspUri, instances.ctrl.items);
	console.log("workspace nodes:" + allWkspItems.length);
	const include = getScenarioTests(instances.testData, allWkspItems);
	const expectedResults = getExpectedResults(debug, wkspUri, instances.config);
	// included tests (scenarios) and expected tests lengths should be equal, but we allow 
	// greater than because there is a more helpful assert later if feature files/scenarios have been added
	console.log(`test includes: ${include.length}, tests expected: ${expectedResults.length}`);
	assert(include.length >= expectedResults.length);


	// run behave tests

	console.log("calling runHandler to run tests...")
	const runRequest = new vscode.TestRunRequest(include, undefined, undefined);
	await vscode.commands.executeCommand("workbench.view.testing.focus");

	// assert(instances.runHandler)
	// const results = await instances.runHandler(debug, runRequest, cancelToken);
	const resultsPromise = instances.runHandler(debug, runRequest, cancelToken);
	if (debug) {
		// timeout hack to show test ui during debug testing so we can see progress		
		await new Promise(t => setTimeout(t, 1000));
		await vscode.commands.executeCommand("workbench.view.testing.focus");
	}
	const results = await resultsPromise;
	console.log("runHandler completed")


	if (!results || results.length === 0)
		throw new Error("no results returned from runHandler");


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
			scenario_fastSkip: result.scenario.fastSkip,
			scenario_result: standardiseResult(result.scenario.result)
		});


		assert(JSON.stringify(result.test.range).includes("line"), 'JSON.stringify(result.test.range).includes("line")');

		assertTestResultMatchesExpectedResult(expectedResults, scenResult);
	});


	// (keep this at the end, as individual match asserts are more useful to get first)
	assert.equal(results.length, expectedResults.length, "results.length === expectedResults.length");

	await assertAllStepsCanBeMatched(instances.getSteps(), instances.config.getWorkspaceSettings(wkspUri));
}




