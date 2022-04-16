/* eslint-disable @typescript-eslint/no-explicit-any */
import * as vscode from 'vscode';
import * as assert from 'assert';
import { ExtensionConfiguration } from "../../configuration";
import { IntegrationTestInterface } from '../../extension';
import { TestResult } from "./expectedResults.helpers";
import { TestWorkspaceConfig } from './testWorkspaceConfig';
import { getStepMatch } from '../../gotoStepHandler';
import { Steps } from '../../stepsParser';


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



let actRet: IntegrationTestInterface;

const activateExtension = async (): Promise<IntegrationTestInterface> => {
	await vscode.commands.executeCommand("workbench.view.testing.focus");
	if (actRet !== undefined)
		return actRet;

	const ext = vscode.extensions.getExtension("jimasp.behave-vsc");
	actRet = await ext?.activate() as IntegrationTestInterface;
	return actRet;
}


function assertUserSettingsAsExpected(testConfig: TestWorkspaceConfig, config: ExtensionConfiguration) {
	assert.deepStrictEqual(config.workspaceSettings(uri).envVarList, testConfig.getExpected("envVarList"));
	assert.deepStrictEqual(config.workspaceSettings(uri).fastSkipList, testConfig.getExpected("fastSkipList"));
	assert.strictEqual(config.workspaceSettings(uri).featuresPath, testConfig.getExpected("featuresPath"));
	assert.strictEqual(config.workspaceSettings(uri).justMyCode, testConfig.getExpected("justMyCode"));
	assert.strictEqual(config.workspaceSettings(uri).runAllAsOne, testConfig.getExpected("runAllAsOne"));
	assert.strictEqual(config.workspaceSettings(uri).runParallel, testConfig.getExpected("runParallel"));
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


async function getAllStepsFromFeatureFiles(path: string) {

	let stepLines: string[] = [];
	const pattern = new vscode.RelativePattern(path, "**/*.feature");
	const featureFiles = await vscode.workspace.findFiles(pattern);

	for (const file of featureFiles) {
		const doc = await vscode.workspace.openTextDocument(file);
		const content = doc.getText();
		addStepsFromFeatureFile(content, stepLines);
	}

	stepLines = [...new Set(stepLines)]; // remove duplicates

	return stepLines;
}


async function assertAllStepsCanBeMatched(parsedSteps: Steps, path: string) {

	const featureSteps = await getAllStepsFromFeatureFiles(path);

	for (const idx in featureSteps) {
		const line = featureSteps[idx];
		try {
			if (!line.includes("missing step")) {
				const match = getStepMatch(parsedSteps, line);
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


export const runAllTestsAndAssertTheResults = async (debug: boolean, testConfig: TestWorkspaceConfig,
	getExpectedResults: (debug: boolean, config: ExtensionConfiguration) => TestResult[]) => {

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
	actRet.config.reloadWorkspaceSettings(wskpUri, testConfig);
	actRet.treeBuilder.buildTree(wkspUri, actRet.ctrl, "runAllTestsAndAssertTheResults", false);

	assertUserSettingsAsExpected(testConfig, actRet.config);

	// readyForRun() will happen in runHandler(), but we need to add more time
	// for test parsing here before requesting a test run due to vscode startup contention
	await actRet.treeBuilder.readyForRun(2000);

	//run tests
	const runRequest = new vscode.TestRunRequest(undefined, undefined, undefined);
	const results = await actRet?.runHandler(debug, runRequest, cancelToken);

	if (!results || results.length === 0)
		throw new Error("no results returned from runHandler");

	const expectedResults = getExpectedResults(debug, actRet.config);

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
			scenario_featureFileRelativePath: result.scenario.featureFileRelativePath,
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


	await assertAllStepsCanBeMatched(actRet.getSteps(), actRet.config.workspaceSettings(uri).fullFeaturesPath);
}


