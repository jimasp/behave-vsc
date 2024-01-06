/* eslint-disable @typescript-eslint/no-explicit-any */
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as assert from 'assert';
import { performance } from 'perf_hooks';
import { Configuration } from "../../../config/configuration";
import { ProjectSettings, RunProfilesSetting } from "../../../config/settings";
import { IntegrationTestAPI } from '../../../extension';
import { TestResult } from "./expectedResults.helpers";
import { TestWorkspaceConfig, TestWorkspaceConfigWithProjUri } from './testWorkspaceConfig';
import { ProjParseCounts } from "../../../parsers/fileParser";
import {
	getUrisOfWkspFoldersWithFeatures, getTestItems,
	getScenarioTests, uriId, isFeatureFile, isStepsFile, getLines
} from '../../../common/helpers';
import { featureFileStepRe } from '../../../parsers/featureParser';
import { funcRe } from '../../../parsers/stepsParser';
import { Expectations, RunOptions } from './testProjectRunner';
import { services } from '../../../services';



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
				`testConfig:${JSON.stringify(testConfig)}\n` +
				`note - if you only get this error while running "npm run test", but NOT when running integration test suites in the IDE, ` +
				`then first check if the behave command line output matches the IDE behave command output.`;
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
		assert.strictEqual(instanceSettings.runMultiRootProjectsInParallel, testConfig.getExpected("runMultiRootProjectsInParallel"),
			`${projName} project: runMultiRootProjectsInParallel`);
		assert.strictEqual(instanceSettings.xRay, testConfig.getExpected("xRay"),
			`${projName} project: xRay`);
		assert.deepStrictEqual(instanceSettings.runProfiles, testConfig.getExpected("runProfiles"),
			`${projName} project: runProfiles`);
	}

	const projSettings = config.projectSettings[projUri.path];
	assert.deepStrictEqual(projSettings.env, testConfig.getExpected("env"),
		`${projName} project: env`);
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
	assert.deepStrictEqual(projSettings.importedSteps, testConfig.getExpected("importedSteps"),
		`${projName} project: importedSteps`);
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



async function assertAllFeatureFileStepsHaveAStepFileStepMatch(projUri: vscode.Uri, instances: IntegrationTestAPI) {

	const projSettings = services.config.projectSettings[projUri.path];
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


async function assertAllStepFileStepsHaveAtLeastOneFeatureReference(projUri: vscode.Uri, instances: IntegrationTestAPI) {

	const projSettings = services.config.projectSettings[projUri.path];
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

		// (test counts are only calculated if xRay is true)
		if (!config.instanceSettings.xRay)
			return;

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


function assertInstances(instances: IntegrationTestAPI) {
	assert(instances);
	assert(instances.ctrl);
	assert(instances.getStepFileStepForFeatureFileStep);
	assert(instances.getStepMappingsForStepsFileFunction);
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

function getBehaveIniPaths(projUri: vscode.Uri) {
	const behaveIniPath = path.join(projUri.fsPath, 'behave.ini');
	const behaveIniTmpPath = path.join(projUri.fsPath, 'behave.ini.tmp');
	return { behaveIniPath, behaveIniTmpPath };
}

async function replaceBehaveIni(api: IntegrationTestAPI, projName: string, projUri: vscode.Uri, content: string) {
	// behave behaviour is dictated by a file on disk, 
	// i.e. we cannot mock out behave.ini or we would go out of sync with behave
	const paths = getBehaveIniPaths(projUri);
	if (fs.existsSync(paths.behaveIniPath))
		fs.renameSync(paths.behaveIniPath, paths.behaveIniTmpPath);
	fs.writeFileSync(paths.behaveIniPath, Buffer.from(content));
	await waitForWatcherParse(projUri, projName, false);
}


async function restoreBehaveIni(projName: string, projUri: vscode.Uri) {
	const paths = getBehaveIniPaths(projUri);
	if (fs.existsSync(paths.behaveIniTmpPath))
		fs.renameSync(paths.behaveIniTmpPath, paths.behaveIniPath);
	else
		fs.unlinkSync(paths.behaveIniPath);
	await waitForWatcherParse(projUri, projName, true);
}


async function waitForWatcherParse(projUri: vscode.Uri, projName: string, waitUntilComplete: boolean) {
	// replacing the behave.ini file will, after a DELAY, fire a reparse via the projectWatcher (fileSystemWatcher).
	// for testing, we need to make sure the delayed parse has kicked off BEFORE config is 
	// reloaded in runAllTestsAndAssertTheResults via configurationChangedHandler, otherwise:
	// a. this delayed parse would cancel the reparse inside configurationChangedHandler, and
	// b. equally it would not be cancelled itself by the configurationChangedHandler reparse because it hasn't started yet.
	// so we wait for the parse to kick off:
	let waited = 0;
	while (waited < 5000) {
		if (services.parser.parseIsActiveForProject(projUri))
			break;
		await new Promise(t => setTimeout(t, 5));
		waited += 5;
	}
	console.log(`waitForWatcherParseToStart ${projName}: waited ${waited}ms for parse instigated by behave config change to start`);

	// wait for parse to complete if requested (this is just to stop the "Canceled" red error appearing 
	// when we're actually expecting a cancel due to the integration test suite exiting the IDE on successful test completion)
	if (waitUntilComplete) {
		waited = 0;
		while (waited < 5000) {
			if (!services.parser.parseIsActiveForProject(projUri))
				break;
			await new Promise(t => setTimeout(t, 5));
			waited += 5;
		}
		console.log(`waitForWatcherParseToComplete ${projName}: waited ${waited}ms for parse instigated by behave config change to complete`);
	}

}



//declare const global: any; // eslint-disable-line @typescript-eslint/no-explicit-any
//global.lock = "";
let lockVal = "";

// used to mitigate parallel project initialisation for multiroot parallel project testing
// (it's a bad lock implementation, but works for our needs here, and more importantly adds logs to let us know what's happening)
async function setLock(consoleName: string, acquireOrRelease: string) {

	if (!(global as any).multiRootTest)
		return;

	if (!["acquire", "release"].includes(acquireOrRelease))
		throw new Error("invalid value for acquire or release");

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
		throw new Error(`${consoleName}: setLock timed out after ${waited} waiting for all projects to initialise`);
	}
	else if (acquireOrRelease === "acquire") {
		lockVal = consoleName;
		console.log(`${consoleName}: setLock acquired lock after ${waited}`);
	}

}


// gets the extension API
// also does some other stuff we only want to happen once for each integration test run
// e.g. where multiple projects are running in parallel (i.e. multiroot workspace)
let api: IntegrationTestAPI | undefined = undefined;
async function checkExtensionIsReady(): Promise<IntegrationTestAPI> {

	if (api)
		return api;

	// starting up a vscode host instance gets busy with cpu etc., so give the extension a 
	// chance to complete any async initialisation it needs to do on startup
	// before our integration tests start messing with it
	await new Promise(t => setTimeout(t, 3000));

	const extension = vscode.extensions.getExtension("jimasp.behave-vsc");
	assert(extension);
	assert(extension.isActive);

	// because the extension is already active (see assert above)
	// this doesn't actually call activate() again, it just returns the API	
	api = await extension.activate() as IntegrationTestAPI;
	console.log(extension);

	assertInstances(api);
	services.config.isIntegrationTestRun = true;

	await vscode.commands.executeCommand("testing.clearTestResults");
	await vscode.commands.executeCommand("workbench.view.testing.focus");
	return api;
}


// In the real world, a user can kick off one project and then another and then another, 
// (i.e. staggered) - they do not have to wait for the first to complete,
// so, when multiroot suite/index.ts is run (in order to test staggered project runs) this
// function will run in parallel with itself (but as per the promises in that file, only one at a time for a given project, 
// so for example projects A/B/Simple can run in parallel, but not e.g. A/A)
export async function runAllTestsAndAssertTheResults(projName: string, isDebugRun: boolean, testExtConfig: TestWorkspaceConfig,
	behaveIniContent: string, runOptions: RunOptions, expectations: Expectations): Promise<void> {

	const projUri = getTestProjectUri(projName);
	const projId = uriId(projUri);
	const api = await checkExtensionIsReady();
	const consoleName = `runAllAndAssert for ${projName}`;

	try {

		// SET LOCK:
		// we can't run runHandler while parsing is active, so we lock here until two things have happened for the given project:
		// 1. all (re)parses have completed, and 
		// 2. the runHandler has been started.
		// once that has happened, we will release the lock for the next project.
		// NOTE: any config change causes a reparse, so behave.ini and test config changes must also be inside 
		// this lock (as well as parseFilesForProject and runHandler)
		await setLock(consoleName, "acquire");

		// we do this BEFORE we call configurationChangedHandler() to load our test config,
		// because replacing the behave.ini file will itself trigger configurationChangedHandler() which 
		// would then reload settings.json from disk and replace the test config we are about to load
		if (behaveIniContent) {
			await replaceBehaveIni(api, projName, projUri, behaveIniContent);
			console.log(`${consoleName}: replaceBehaveIni completed`);
		}

		// NOTE: configuration settings are intially loaded from disk (settings.json and *.code-workspace) by extension.ts activate(),
		// and we cannot intercept this because activate() runs as soon as the extension host loads, but we can change 
		// it afterwards - we do this here by calling configurationChangedHandler() with our own test config.
		// The configuration will be actually be loaded once, then reloaded 1-3 times:
		// 1. on the initial load (activate) of the extension,
		// 2. if behave ini is replaced on disk above,
		// 3. here to insert our test config.
		// 4. if behave ini is restored in the finally block (i.e. if 2 happened)
		console.log(`${consoleName}: calling configurationChangedHandler`);
		await api.configurationChangedHandler(undefined, new TestWorkspaceConfigWithProjUri(testExtConfig, projUri));
		assertWorkspaceSettingsAsExpected(projUri, projName, testExtConfig, services.config, expectations);


		// parse to get check counts (checked later, but we want to do this inside the lock)
		const actualCounts = await services.parser.parseFilesForProject(projUri, api.testData, api.ctrl,
			"runAllTestsAndAssertTheResults", false);
		assert(actualCounts, "actualCounts was undefined");

		const allProjItems = getTestItems(projId, api.ctrl.items);
		console.log(`${consoleName}: workspace nodes:${allProjItems.length}`);
		assert(allProjItems.length > 0, "allProjItems.length was 0");
		const matchingItems = allProjItems.filter(item => api.testData.get(item) !== undefined);
		assert(matchingItems.length > 0, "matchingItems.length was 0");
		const hasMultiRootWkspNode = allProjItems.find(item => item.id === uriId(projUri)) !== undefined;

		// sanity check included tests length matches expected length
		const includedTests = getScenarioTests(api.testData, allProjItems);
		assert(includedTests.length > 0, "includedTests.length was 0");
		const expectedResults = expectations.getExpectedResultsFunc(projUri, services.config);
		if (includedTests.length !== expectedResults.length)
			debugger; // eslint-disable-line no-debugger
		console.log(`${consoleName}: test includes = ${includedTests.length}, tests expected = ${expectedResults.length}`);
		// included tests (scenarios) and expected tests lengths should be equal, but 
		// we allow greater than because there is a more helpful assert later (assertTestResultMatchesExpectedResult) if new
		// tests have recently been added	
		assert(includedTests.length >= expectedResults.length, consoleName + ", (see counts above)");
		console.log(`${consoleName}: initialised`);

		// check all steps can be matched
		await assertAllFeatureFileStepsHaveAStepFileStepMatch(projUri, api);
		await assertAllStepFileStepsHaveAtLeastOneFeatureReference(projUri, api);

		// run behave tests - we kick the runHandler off inside the lock to ensure that featureParseComplete() check
		// will complete inside the runHandler, i.e. so no other parsing gets kicked off until the parse is complete.
		// we do NOT want to await the runHandler as we want to release the lock for parallel run execution for multi-root
		console.log(`${consoleName}: calling runHandler to run tests...`);
		const request = new vscode.TestRunRequest(includedTests);
		let runProfile = undefined;
		if (runOptions.selectedRunProfile)
			runProfile = (testExtConfig.get("runProfiles") as RunProfilesSetting)[runOptions.selectedRunProfile];
		// do NOT await (see comment above)
		const resultsPromise = api.runHandler(isDebugRun, request, runProfile);

		// RELEASE LOCK: 
		// give run handler a chance to call the featureParseComplete() check, then 
		// release the lock so (different) projects can run in parallel
		await (new Promise(t => setTimeout(t, 50)));
		await setLock(consoleName, "release");



		if (isDebugRun) {
			// timeout hack to show test ui during debug testing so we can see progress		
			await new Promise(t => setTimeout(t, 1000));
			await vscode.commands.executeCommand("workbench.view.testing.focus");
		}


		// WAIT FOR TESTRUNHANDLER TO COMPLETE, I.E. GET RESULTS
		const results = await resultsPromise;
		console.log(`${consoleName}: runHandler completed`);


		// ASSERT RESULTS

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
				scenario_featureFileRelativePath: result.scenario.featureFileProjectRelativePath,
				scenario_featureName: result.scenario.featureName,
				scenario_scenarioName: result.scenario.scenarioName,
				scenario_result: standardiseResult(result.scenario.result)
			});


			assert(JSON.stringify(result.test.range).includes("line"), 'JSON.stringify(result.test.range).includes("line")');
			assertTestResultMatchesExpectedResult(expectedResults, scenResult, testExtConfig);
		});

		// (keep these below results.forEach, as individual match asserts are more useful to get first)
		assertExpectedCounts(projUri, projName, services.config, expectations.getExpectedCountsFunc,
			actualCounts, hasMultiRootWkspNode);
		assert.equal(results.length, expectedResults.length, "results.length === expectedResults.length");

	}
	finally {
		if (behaveIniContent)
			await restoreBehaveIni(projName, projUri);
	}
}




