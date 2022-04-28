/* eslint-disable @typescript-eslint/no-explicit-any */
import * as vscode from 'vscode';
import * as path from 'path';
import * as assert from 'assert';
import { ExtensionConfiguration } from "../../Configuration";
import { WorkspaceSettings } from "../../WorkspaceSettings";
import { Instances } from '../../extension';
import { TestResult } from "./expectedResults.helpers";
import { TestWorkspaceConfig } from './testWorkspaceConfig';
import { getStepMatch } from '../../gotoStepHandler';
import { Steps } from '../../stepsParser';
import { getAllTestItems } from '../../helpers';


export function getWorkspaceUriFromName(wkspName: string) {
	const wsPath = path.resolve(__dirname, `../../../${wkspName}`);
	return vscode.Uri.file(wsPath)
}


function findMatch(expectedResults: TestResult[], actualResult: TestResult): TestResult[] {

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
				console.log(actualResult);
				// eslint-disable-next-line no-debugger
				debugger; // UHOH
			}

			return false;
		}

		// now match shortened expected result string:

		if (expectedResult.scenario_result !== actualResult.scenario_result) {
			console.log(actualResult);
			// eslint-disable-next-line no-debugger
			debugger; // UHOH			

			return false;
		}

		return true;
	});

	if (match.length !== 1) {
		console.log(actualResult);
		// eslint-disable-next-line no-debugger
		debugger; // UHOH 
	}

	return match;
}



let actRet: Instances;
const activateExtension = async (): Promise<Instances> => {
	if (actRet !== undefined)
		return actRet;

	const ext = vscode.extensions.getExtension("jimasp.behave-vsc");
	actRet = await ext?.activate() as Instances;
	return actRet;
}


function assertWorkspaceSettingsAsExpected(wkspUri: vscode.Uri, testConfig: TestWorkspaceConfig, config: ExtensionConfiguration) {
	const cfgSettings = config.getWorkspaceSettings(wkspUri);
	assert.deepStrictEqual(cfgSettings.envVarList, testConfig.getExpected("envVarList"));
	assert.deepStrictEqual(cfgSettings.fastSkipList, testConfig.getExpected("fastSkipList"));
	assert.strictEqual(cfgSettings.featuresPath, testConfig.getExpected("featuresPath"));
	assert.strictEqual(cfgSettings.justMyCode, testConfig.getExpected("justMyCode"));
	assert.strictEqual(cfgSettings.runAllAsOne, testConfig.getExpected("runAllAsOne"));
	assert.strictEqual(cfgSettings.runParallel, testConfig.getExpected("runParallel"));
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
	const pattern = new vscode.RelativePattern(wkspSettings.fullFeaturesPath, "**/*.feature");
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
				assert(match);
			}
		}
		catch (e: unknown) {
			if (e instanceof assert.AssertionError)
				throw new Error(`getStepMatch() could not find match for step line: "${line}"`);
			throw e;
		}
	}
}


export const runAllTestsAndAssertTheResults = async (wkspUri: vscode.Uri, debug: boolean, testConfig: TestWorkspaceConfig,
	getExpectedResults: (debug: boolean, wkspUri: vscode.Uri, config: ExtensionConfiguration) => TestResult[]) => {

	const standardisePath = (path: string | undefined): string | undefined => {
		return path === undefined ? undefined : "..." + path.substring(path.indexOf("/example-project-workspace"));
	}

	const standardiseResult = (result: string | undefined): string | undefined => {
		let res = result;
		if (!result)
			return undefined;


		const tb = "Traceback (most recent call last):\n  File ";
		const tbAss = "assert ";

		if (result.startsWith(tb)) {
			const tbAssStart = result.indexOf(tbAss);
			if (tbAssStart)
				res = result.replace(result.substring(tb.length - 1, tbAssStart), "... ");
		}

		return res;
	}

	const getChildrenIds = (children: vscode.TestItemCollection): string | undefined => {
		if (children.size === 0)
			return undefined;
		const arrChildrenIds: string[] = [];
		children.forEach(child => {
			arrChildrenIds.push(child.id);
		});
		return arrChildrenIds.join();
	}

	// get instances from returned object
	actRet = await activateExtension();
	assert(actRet.config);
	assert(actRet.runHandler);
	assert(actRet.ctrl);
	assert(actRet);

	const cancelToken = new vscode.CancellationTokenSource().token;

	// normally OnDidChangeConfiguration is called when the user changes the settings in the extension
	// we need to call the methods in that function manually:
	actRet.config.reloadWorkspaceSettings(wkspUri, testConfig);
	assertWorkspaceSettingsAsExpected(wkspUri, testConfig, actRet.config);

	// readyForRun() will happen in runHandler(), but we need to add more time
	// before requesting a test run due to vscode startup contention
	// (we could await parseFiles, but then our tests wouldn't cover the same timeout operation as real usage)
	actRet.parser.parseFiles(wkspUri, actRet.ctrl, "runAllTestsAndAssertTheResults");
	await actRet.parser.readyForRun(5000);


	const include: vscode.TestItem[] = [];
	const allItems = getAllTestItems(actRet.ctrl.items);
	allItems.forEach(item => {
		if (item.id.includes(wkspUri.path))
			include.push(item);
	});

	const runRequest = new vscode.TestRunRequest(include, undefined, undefined);

	// run tests
	await vscode.commands.executeCommand("workbench.view.testing.focus");
	const resultsPromise = actRet?.runHandler(debug, runRequest, cancelToken);
	// hack to show test ui during debug testing so we can see progress
	await new Promise(t => setTimeout(t, 1000));
	await vscode.commands.executeCommand("workbench.view.testing.focus");
	const results = await resultsPromise;

	if (!results || results.length === 0)
		throw new Error("no results returned from runHandler");

	const expectedResults = getExpectedResults(debug, wkspUri, actRet.config);

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


		assert(JSON.stringify(result.test.range).includes("line"));


		const match = findMatch(expectedResults, scenResult);
		assert.strictEqual(match.length, 1);
	});


	// (keep this at the end, as individual match asserts are more useful to get first)
	assert.strictEqual(results.length, expectedResults.length);


	await assertAllStepsCanBeMatched(actRet.getSteps(), actRet.config.getWorkspaceSettings(wkspUri));
}


