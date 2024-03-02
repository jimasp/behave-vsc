/* eslint-disable @typescript-eslint/no-explicit-any */
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as assert from 'assert';
import { performance } from 'perf_hooks';
import { IntegrationTestAPI, QueueItem } from '../../../extension';
import { getUrisOfWkspFoldersWithFeatures } from '../../../common/helpers';
import { RunOptions, testGlobals } from './types';
import { CustomRunner, ProjectSettings, RunProfilesSetting } from '../../../config/settings';
import { TestWorkspaceConfig } from './testWorkspaceConfig';
import { getFriendlyEnvVars, getOptimisedFeaturePathsRegEx, getPipedScenarioNamesRegex } from '../../../runners/helpers';
import { ProjRun } from '../../../runners/testRunHandler';



let lockVal = "";
export const ACQUIRE = "acquire";
export const RELEASE = "release";
export async function setLock(consoleName: string, acquireOrRelease: string) {
	// this function is used to mitigate parallel project initialisation for multiroot parallel project testing
	// (it's a bad lock implementation, but works for our needs here, and more importantly adds logs to let us know what's happening)	

	console.log(testGlobals.multiRootTest);

	if (!testGlobals.multiRootTest)
		return;

	if (![ACQUIRE, RELEASE].includes(acquireOrRelease))
		throw new Error("invalid value for acquire or release");

	if (acquireOrRelease === RELEASE) {
		console.log(`${consoleName}: setLock releasing lock`);
		lockVal = "";
		return;
	}

	if (!lockVal && acquireOrRelease === ACQUIRE) {
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
	else if (acquireOrRelease === ACQUIRE) {
		lockVal = consoleName;
		console.log(`${consoleName}: setLock acquired lock after ${waited}`);
	}

}


export function getTestProjectUri(projName: string) {
	const uris = getUrisOfWkspFoldersWithFeatures();
	const projUri = uris.find(uri => uri.path.includes(projName));
	assert(projUri, "projUri");
	return projUri;
}


export function getBehaveIniPaths(workDirUri: vscode.Uri) {
	const behaveIniPath = path.join(workDirUri.fsPath, 'behave.ini');
	const behaveIniBakPath = path.join(workDirUri.fsPath, 'behave.ini.bak');
	return { behaveIniPath, behaveIniBakPath };
}


export async function replaceBehaveIni(consoleName: string, workDirUri: vscode.Uri, content?: string) {
	const paths = getBehaveIniPaths(workDirUri);
	if (content === undefined) {
		if (fs.existsSync(paths.behaveIniPath))
			await fs.promises.unlink(paths.behaveIniPath);
		return;
	}
	await fs.promises.writeFile(paths.behaveIniPath, content);
	console.log(`${consoleName}: replaceBehaveIni wrote "${content}" to ${paths.behaveIniPath}`);
}


export async function restoreBehaveIni(consoleName: string, workDirUri: vscode.Uri) {
	const paths = getBehaveIniPaths(workDirUri);
	if (fs.existsSync(paths.behaveIniPath)) {
		await fs.promises.unlink(paths.behaveIniPath);
		console.log(`${consoleName}: restoreBehaveIni removed "${paths.behaveIniPath}"`);
	}
	if (fs.existsSync(paths.behaveIniBakPath)) {
		await fs.promises.copyFile(paths.behaveIniBakPath, paths.behaveIniPath);
		console.log(`${consoleName}: restoreBehaveIni copied "${paths.behaveIniBakPath}" to ${paths.behaveIniPath}`);
		return;
	}
}


export async function checkExtensionIsReady(): Promise<IntegrationTestAPI> {

	const extension = vscode.extensions.getExtension("jimasp.behave-vsc");
	assert(extension);
	assert(extension.isActive);

	const api: IntegrationTestAPI = extension.exports; // i.e. what activate() returns
	assert(api);
	assertApiInstances(api);

	await api.parseAllPromise;
	await vscode.commands.executeCommand("workbench.view.testing.focus");
	return api;
}


export function getExpectedTagsString(testExtConfig: TestWorkspaceConfig, runOptions: RunOptions) {
	let tagsString = "";
	if (runOptions.selectedRunProfile) {
		const runProfiles = testExtConfig.get("runProfiles") as RunProfilesSetting;
		const selectedRunProfile = runProfiles[runOptions.selectedRunProfile];
		if (selectedRunProfile.tagExpression)
			tagsString = selectedRunProfile.tagExpression;
	}
	return tagsString;
}

export function getExpectedEnvVarsString(testExtConfig: TestWorkspaceConfig, runOptions?: RunOptions) {

	const env: object = testExtConfig.get("env");

	let rpEnv: object | undefined = {};
	if (runOptions && runOptions.selectedRunProfile) {
		const runProfiles = testExtConfig.get("runProfiles") as RunProfilesSetting;
		const selectedRunProfile = runProfiles[runOptions.selectedRunProfile];
		rpEnv = selectedRunProfile.env;
	}

	const allenv = { ...env, ...rpEnv };
	const pr = { env: allenv } as ProjRun;
	const envVarsString = getFriendlyEnvVars(pr);

	return envVarsString;
}


export function createFakeProjRun(testExtConfig: TestWorkspaceConfig, request: vscode.TestRunRequest): ProjRun {

	const projSettings = {
		runParallel: testExtConfig.get("runParallel"),
		projRelativeBehaveWorkingDirPath: testExtConfig.get("behaveWorkingDirectory"),

	} as ProjectSettings;

	return {
		projSettings: projSettings,
		request: request,
	} as ProjRun;
}

export function buildExpectedFriendlyCmdOrderedIncludes(testExtConfig: TestWorkspaceConfig, runOptions: RunOptions,
	request: vscode.TestRunRequest, projName: string, queueItems?: QueueItem[], includeScenariosRx = false) {

	const tagsString = getExpectedTagsString(testExtConfig, runOptions);
	const envVarsString = getExpectedEnvVarsString(testExtConfig, runOptions);
	const workingFolder = testExtConfig.get("behaveWorkingDirectory") as string;

	let customRunner: CustomRunner | undefined = undefined;
	if (runOptions.selectedRunProfile) {
		const runProfiles = testExtConfig.get("runProfiles") as RunProfilesSetting;
		const runProfile = runProfiles[runOptions.selectedRunProfile];
		customRunner = runProfile.customRunner;
	}

	const pr = createFakeProjRun(testExtConfig, request);

	let argPipedFeaturePathsRx = "", argPipedScenariosRx = "";
	if (queueItems) {
		const pipedFeaturePathsRx = getOptimisedFeaturePathsRegEx(pr, queueItems);
		argPipedFeaturePathsRx = pipedFeaturePathsRx ? `-i "${pipedFeaturePathsRx}"` : "";
		if (includeScenariosRx) {
			const pipedScenariosRx = getPipedScenarioNamesRegex(queueItems, true);
			argPipedScenariosRx = pipedScenariosRx ? `-n "${pipedScenariosRx}"` : "";
		}
	}

	const scriptOrModule = customRunner ? customRunner.script : "-m";
	const scriptArgs = customRunner?.args ? customRunner.args.join(" ") : "";

	const expectCmdOrderedIncludes = [
		`cd `, `example-projects`, projName, workingFolder, `\n`,
		envVarsString,
		`python`,
		scriptOrModule,
		`behave`,
		scriptArgs,
		tagsString,
		argPipedFeaturePathsRx,
		argPipedScenariosRx,
		`--show-skipped --junit --junit-directory`,
		projName
	];
	return expectCmdOrderedIncludes;
}


function assertApiInstances(api: IntegrationTestAPI) {
	assert(api);
	assert(api.ctrl);
	assert(api.getStepFileStepForFeatureFileStep);
	assert(api.getStepMappingsForStepsFileFunction);
	assert(api.runHandler);
	assert(api.testData);
	assert(api.configurationChangedHandler);
	assert(api.parseAllPromise);
}
