/* eslint-disable @typescript-eslint/no-explicit-any */
import * as vscode from 'vscode';
import * as assert from 'assert';
import { performance } from 'perf_hooks';
import { Configuration } from "../../configuration";
import { ProjectSettings, RunProfilesSetting } from "../../settings";
import { TestSupport } from '../../extension';
import { TestResult } from "./expectedResults.helpers";
import { TestWorkspaceConfig, TestWorkspaceConfigWithprojUri } from './testWorkspaceConfig';
import { ProjParseCounts } from '../../parsers/fileParser';
import { getUrisOfWkspFoldersWithFeatures, getTestItems, getScenarioTests, uriId, isFeatureFile, isStepsFile, getLines } from '../../common';
import { featureFileStepRe } from '../../parsers/featureParser';
import { funcRe } from '../../parsers/stepsParser';
import { Expectations, RunOptions } from './testWorkspaceRunners';


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
			expectedResult.scenario_scenarioName !== actualResult.scenario_scenarioName
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
		// UHOH (did you add a new scenario that hasn't been added to expected results yet? 
		// IF a new scenario has been added: see debug console and copy/paste into xxx suite/expectedResults.ts)
		debugger; // eslint-disable-line no-debugger
		throw `match.length was:${match.length} when attempting to match test id ${actualResult.test_id} to expected result`;
	}

	return match;
}


function assertWorkspaceSettingsAsExpected(projUri: vscode.Uri, projName: string,
	testConfig: TestWorkspaceConfig, config: Configuration, expectations: Expectations) {

	// multiroot will read window settings from multiroot.code-workspace file, not config
	if (!(global as any).multiRootTest) {
		const instanceSettings = config.instanceSettings;
		assert.strictEqual(instanceSettings.multiRootProjectsRunInParallel, testConfig.getExpected("multiRootProjectsRunInParallel"),
			`${projName} project: multiRootProjectsRunInParallel`);
		assert.strictEqual(instanceSettings.xRay, testConfig.getExpected("xRay"),
			`${projName} project: xRay`);
		assert.deepStrictEqual(instanceSettings.runProfiles, testConfig.getExpected("runProfiles"),
			`${projName} project: runProfiles`);
	}

	const projSettings = config.projectSettings[projUri.path];
	assert.deepStrictEqual(projSettings.envVarOverrides, testConfig.getExpected("envVarOverrides"),
		`${projName} project: envVarOverrides`);
	assert.deepStrictEqual(projSettings.relativeFeatureFolders, expectations.expectedProjectRelativeFeatureFolders,
		`${projName} project: relativeFeatureFolders`);
	assert.deepStrictEqual(projSettings.relativeStepsFolders, expectations.expectedProjectRelativeStepsFolders,
		`${projName} project: relativeStepsFolders`);
	assert.strictEqual(projSettings.relativeBaseDirPath, expectations.expectedProjectRelativeBaseDirPath,
		`${projName} project: relativeBaseDirPath`);
	assert.deepStrictEqual(projSettings.relativeConfigPaths, expectations.expectedProjectRelativeConfigPaths,
		`${projName} project: relativeConfigPaths`);
	assert.strictEqual(projSettings.justMyCode, testConfig.getExpected("justMyCode"),
		`${projName} project: justMyCode`);
	assert.strictEqual(projSettings.runParallel, testConfig.getExpected("runParallel"),
		`${projName} project: runParallel`);
	assert.deepStrictEqual(projSettings.stepLibraries, testConfig.getExpected("stepLibraries"),
		`${projName} project: stepLibraries`);
}


type FileStep = {
	uri: vscode.Uri,
	lineNo: number,
}

function addStepsFromFeatureFile(uri: vscode.Uri, content: string, featureSteps: Map<FileStep, string>) {
	const lines = getLines(content.trim());
	for (let lineNo = 0; lineNo < lines.length; lineNo++) {
		const line = lines[lineNo].trim();
		const stExec = featureFileStepRe.exec(line);
		if (stExec)
			featureSteps.set({ uri, lineNo }, line);
	}

	return featureSteps;
}

function addStepsFromStepsFile(uri: vscode.Uri, content: string, steps: Map<FileStep, string>) {
	const lines = getLines(content.trim());
	for (let lineNo = 0; lineNo < lines.length; lineNo++) {
		const line = lines[lineNo].trim();
		const prevLine = lineNo === 0 ? "" : lines[lineNo - 1].trim();
		if (funcRe.test(line) && prevLine !== "" && prevLine !== "@classmethod") {
			steps.set({ uri, lineNo }, line);
		}
	}

	return steps;
}


async function getAllStepLinesFromFeatureFiles(projSettings: ProjectSettings) {

	const stepLines = new Map<FileStep, string>();
	const pattern = new vscode.RelativePattern(projSettings.uri, `${projSettings.relativeFeatureFolders}/**/*.feature`);
	const featureFileUris = await vscode.workspace.findFiles(pattern, null);

	for (const featFileUri of featureFileUris) {
		if (isFeatureFile(featFileUri)) {
			const doc = await vscode.workspace.openTextDocument(featFileUri);
			const content = doc.getText();
			addStepsFromFeatureFile(featFileUri, content, stepLines);
		}
	}

	return [...stepLines];
}

async function getAllStepFunctionLinesFromStepsFiles(projSettings: ProjectSettings) {

	const funcLines = new Map<FileStep, string>();
	const pattern = new vscode.RelativePattern(projSettings.uri, `${projSettings.relativeFeatureFolders}/steps/*.py`);
	const stepFileUris = await vscode.workspace.findFiles(pattern, null);

	for (const stepFileUri of stepFileUris) {
		if (isStepsFile(stepFileUri)) {
			const doc = await vscode.workspace.openTextDocument(stepFileUri);
			const content = doc.getText();
			addStepsFromStepsFile(stepFileUri, content, funcLines);
		}
	}

	return [...funcLines];
}



async function assertAllFeatureFileStepsHaveAStepFileStepMatch(projUri: vscode.Uri, instances: TestSupport) {

	const projSettings = instances.config.projectSettings[projUri.path];
	const featureFileSteps = await getAllStepLinesFromFeatureFiles(projSettings);

	for (const [step, stepText] of featureFileSteps) {
		const uri = step.uri;
		const lineNo = step.lineNo;
		try {
			if (!stepText.includes("missing step")) {
				const match = instances.getStepFileStepForFeatureFileStep(uri, lineNo);
				assert(match);
			}
		}
		catch (e: unknown) {
			debugger; // eslint-disable-line no-debugger
			if (e instanceof assert.AssertionError)
				throw new Error(`getStepFileStepForFeatureFileLine() could not find match for line ${uri.fsPath}:${lineNo}, (step text: "${stepText}")`);
			throw e;
		}
	}
	console.log(`assertAllFeatureFileStepsHaveAStepFileStepMatch for ${projSettings.name}, ${featureFileSteps.length} feature file steps successfully matched`)
}


async function assertAllStepFileStepsHaveAtLeastOneFeatureReference(projUri: vscode.Uri, instances: TestSupport) {

	const projSettings = instances.config.projectSettings[projUri.path];
	const stepFileSteps = await getAllStepFunctionLinesFromStepsFiles(projSettings);

	for (const [step, funcLine] of stepFileSteps) {
		const uri = step.uri;
		const lineNo = step.lineNo;
		try {
			if (!funcLine.includes("unreferenced_step")) {
				const mappings = instances.getStepMappingsForStepsFileFunction(uri, lineNo);
				assert(mappings.length > 0);
				mappings.forEach(mapping => {
					assert(mapping.featureFileStep);
				});
			}
		}
		catch (e: unknown) {
			debugger; // eslint-disable-line no-debugger
			if (e instanceof assert.AssertionError)
				throw new Error(`getStepMappingsForStepsFileFunction() could not find mapping for line ${uri.fsPath}:${lineNo + 1}, (function: "${funcLine}")`);
			throw e;
		}
	}
	console.log(`assertAllStepFileStepsHaveAtLeastOneFeatureReference for ${projSettings.name}, ${stepFileSteps.length} step file steps successfully matched`)
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

function assertExpectedCounts(projUri: vscode.Uri, projName: string, config: Configuration,
	getExpectedCountsFunc: (projUri: vscode.Uri, config: Configuration) => ProjParseCounts,
	actualCounts: ProjParseCounts, hasMultiRootWkspNode: boolean) {

	try {
		const expectedCounts = getExpectedCountsFunc(projUri, config);

		assert(actualCounts.featureFilesExceptEmptyOrCommentedOut == expectedCounts.featureFilesExceptEmptyOrCommentedOut, projName + ": featureFilesExceptEmptyOrCommentedOut");
		assert(actualCounts.stepFilesExceptEmptyOrCommentedOut === expectedCounts.stepFilesExceptEmptyOrCommentedOut, projName + ": stepFilesExceptEmptyOrCommentedOut");
		assert(actualCounts.stepFileStepsExceptCommentedOut === expectedCounts.stepFileStepsExceptCommentedOut, projName + ": stepFileStepsExceptCommentedOut");
		assert(actualCounts.featureFileStepsExceptCommentedOut === expectedCounts.featureFileStepsExceptCommentedOut, projName + ": featureFileStepsExceptCommentedOut");
		assert(actualCounts.stepMappings === expectedCounts.stepMappings, projName + ": stepMappings");
		assert(actualCounts.tests.testCount === expectedCounts.tests.testCount, projName + ": testCount");

		if (hasMultiRootWkspNode) {
			assert(actualCounts.tests.nodeCount === expectedCounts.tests.nodeCount + 1, projName + ": nodeCount");
		}
		else {
			assert(actualCounts.tests.nodeCount === expectedCounts.tests.nodeCount, projName + ": nodeCount");
		}
	}
	catch (e: unknown) {
		// UHOH - did we add a test or comment something out? do a git diff?
		debugger; // eslint-disable-line no-debugger
	}
}


function assertInstances(instances: TestSupport) {
	assert(instances);
	assert(instances.config);
	assert(instances.ctrl);
	assert(instances.getStepFileStepForFeatureFileStep);
	assert(instances.getStepMappingsForStepsFileFunction);
	assert(instances.parser);
	assert(instances.runHandler);
	assert(instances.testData);
	assert(instances.configurationChangedHandler);
}

function getTestProjectUri(projName: string) {
	const uris = getUrisOfWkspFoldersWithFeatures();
	const projUri = uris.find(uri => uri.path.includes(projName));
	assert(projUri, "projUri");
	return projUri;
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


// returns instances of vars initialised by the extension's activate() function, wrapped in a "TestSupport" type
// activate only once for parallel (multiroot) calls and get the same instances
let extInstances: TestSupport | undefined = undefined;
async function getTestSupportFromExtension(): Promise<TestSupport> {

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

	// unless there is a breakpoint in activate, then activate should take < 1ms on most machines as it is uncontested at this point, 
	// (i.e. it may be considerably slower than this during normal vscode startup contention when vscode is loading itself and other extensions)
	// but if it goes over 5ms here and there is no breakpoint in activate, then we've messed something up
	// (for a more realistic contested startup time, filter the debug console log by "PERF:" in this source environment and look for "activate"
	assert(tookMs < 5);

	assert(extension.isActive);
	assertInstances(extInstances);
	extInstances.config.integrationTestRun = true;

	// give the extension a chance to do any async initialisation it needs to do
	await new Promise(t => setTimeout(t, 3000));

	await vscode.commands.executeCommand("testing.clearTestResults");
	await vscode.commands.executeCommand("workbench.view.testing.focus");
	return extInstances;
}


// A user can kick off one project and then another and then another, (i.e. staggered), they do not have to wait for the first to complete,
// so, when workspace-multiroot suite/index.ts is run (in order to test staggered workspace runs) this
// function will run in parallel with itself (but as per the promises in that file, only one instance at a time for a given workspace, 
// so for example project workspaces A/B/Simple can run in parallel, but not e.g. A/A)
export async function runAllTestsAndAssertTheResults(projName: string, isDebugRun: boolean, testConfig: TestWorkspaceConfig,
	runOptions: RunOptions, expectations: Expectations) {

	const consoleName = `runAllTestsAndAssertTheResults for ${projName}`;
	const projUri = getTestProjectUri(projName);
	const projId = uriId(projUri);

	await setLock(consoleName, "acquire");
	console.log(`${consoleName} initialising`);

	const instances = await getTestSupportFromExtension();

	// normally OnDidChangeConfiguration is called when the user changes the settings in the extension
	// but we need call it manually to insert a test config
	console.log(`${consoleName}: calling configurationChangedHandler`);
	await instances.configurationChangedHandler(undefined, new TestWorkspaceConfigWithprojUri(testConfig, projUri));
	assertWorkspaceSettingsAsExpected(projUri, projName, testConfig, instances.config, expectations);

	// parse to get check counts (checked later, but we want to do this inside the lock)
	const actualCounts = await instances.parser.parseFilesForProject(projUri, instances.testData, instances.ctrl,
		"runAllTestsAndAssertTheResults", false);
	assert(actualCounts, "actualCounts was undefined");
	const allProjItems = getTestItems(projId, instances.ctrl.items);
	console.log(`${consoleName}: workspace nodes:${allProjItems.length}`);
	assert(allProjItems.length > 0, "allProjItems.length was 0");
	const hasMultiRootWkspNode = allProjItems.find(item => item.id === uriId(projUri)) !== undefined;

	// check all steps can be matched
	await assertAllFeatureFileStepsHaveAStepFileStepMatch(projUri, instances);
	await assertAllStepFileStepsHaveAtLeastOneFeatureReference(projUri, instances);

	// sanity check include length matches expected length
	const include = getScenarioTests(instances.testData, allProjItems);
	const expectedResults = expectations.getExpectedResultsFunc(projUri, instances.config);
	if (include.length !== expectedResults.length)
		debugger; // eslint-disable-line no-debugger
	console.log(`${consoleName}: test includes = ${include.length}, tests expected = ${expectedResults.length}`);
	// included tests (scenarios) and expected tests lengths should be equal, but 
	// we allow greater than because there is a more helpful assert later (assertTestResultMatchesExpectedResult) if new
	// tests have recently been added	
	assert(include.length >= expectedResults.length, consoleName + ", (see counts above)");
	console.log(`${consoleName}: initialised`);


	// run behave tests - we kick the runHandler off inside the lock to ensure that featureParseComplete() check
	// will inside the runHandler, i.e. so no other parsing gets kicked off until it has begun.
	// we do NOT want to await the runHandler as we want to release the lock for parallel run execution for multi-root
	console.log(`${consoleName}: calling runHandler to run tests...`);
	const request = new vscode.TestRunRequest(include);
	let runProfile = undefined;
	if (runOptions.selectedRunProfile)
		runProfile = (testConfig.get("runProfiles") as RunProfilesSetting)[runOptions.selectedRunProfile];
	const resultsPromise = instances.runHandler(isDebugRun, request, runProfile);

	// give run handler a chance to pass the featureParseComplete() check, then release the lock
	await (new Promise(t => setTimeout(t, 50)));
	await setLock(consoleName, "release");


	if (isDebugRun) {
		// timeout hack to show test ui during debug testing so we can see progress		
		await new Promise(t => setTimeout(t, 1000));
		await vscode.commands.executeCommand("workbench.view.testing.focus");
	}
	const results = await resultsPromise;
	console.log(`${consoleName}: runHandler completed`);

	// validate results

	if (!results || results.length === 0) {
		debugger; // eslint-disable-line no-debugger
		throw new Error(`${consoleName}: runHandler returned an empty queue, check for previous errors in the debug console`);
	}

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
			scenario_result: standardiseResult(result.scenario.result)
		});


		assert(JSON.stringify(result.test.range).includes("line"), 'JSON.stringify(result.test.range).includes("line")');
		assertTestResultMatchesExpectedResult(expectedResults, scenResult, testConfig);
	});

	// (keep these below results.forEach, as individual match asserts are more useful to get first)
	assertExpectedCounts(projUri, projName, instances.config, expectations.getExpectedCountsFunc,
		actualCounts, hasMultiRootWkspNode);
	assert.equal(results.length, expectedResults.length, "results.length === expectedResults.length");
}




