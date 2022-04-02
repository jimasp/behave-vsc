/* eslint-disable @typescript-eslint/no-explicit-any */
import * as vscode from 'vscode';
import * as assert from 'assert';
import { ExtensionConfiguration } from "../../configuration";
import { QueueItem } from '../../extension';
import { TestResult } from "../expectedResults.helpers";
import { TestWorkspaceConfig } from '../testWorkspaceConfig';


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




let actRet: ActivateReturnType;
type ActivateReturnType = {
	runHandler: (debug: boolean, request: vscode.TestRunRequest, cancellation: vscode.CancellationToken) => Promise<QueueItem[]>,
	config: ExtensionConfiguration
};


const activateExtension = async (): Promise<ActivateReturnType> => {
	await vscode.commands.executeCommand("workbench.view.testing.focus");
	if (actRet !== undefined)
		return actRet;

	const ext = vscode.extensions.getExtension("jimasp.behave-vsc");
	actRet = await ext?.activate() as ActivateReturnType;
	return actRet;
}


function assertUserSettingsAsExpected(testConfig: TestWorkspaceConfig, config: ExtensionConfiguration) {
	assert.deepStrictEqual(config.userSettings.envVarList, testConfig.getExpected("envVarList"));
	assert.deepStrictEqual(config.userSettings.fastSkipList, testConfig.getExpected("fastSkipList"));
	assert.strictEqual(config.userSettings.featuresPath, testConfig.getExpected("featuresPath"));
	assert.strictEqual(config.userSettings.justMyCode, testConfig.getExpected("justMyCode"));
	assert.strictEqual(config.userSettings.runAllAsOne, testConfig.getExpected("runAllAsOne"));
	assert.strictEqual(config.userSettings.runParallel, testConfig.getExpected("runParallel"));
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


	actRet = await activateExtension();
	actRet.config.reloadUserSettings(testConfig);
	assertUserSettingsAsExpected(testConfig, actRet.config);

	const runRequest = new vscode.TestRunRequest(undefined, undefined, undefined);
	const cancelToken = new vscode.CancellationTokenSource().token;

	//run tests
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


		assert(JSON.stringify(result.test.range).indexOf("line") !== -1);

		const match = findMatch(expectedResults, scenResult);
		assert.strictEqual(match.length, 1);
	});


	// (keep this at the end, as individual match asserts are more useful to get first)
	assert.strictEqual(results.length, expectedResults.length);
}


