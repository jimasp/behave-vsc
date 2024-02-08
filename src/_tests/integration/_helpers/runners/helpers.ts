/* eslint-disable @typescript-eslint/no-explicit-any */
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as assert from 'assert';
import { performance } from 'perf_hooks';
import { IntegrationTestAPI } from '../../../../extension';
import {
	getUrisOfWkspFoldersWithFeatures,
} from '../../../../common/helpers';
import { services } from '../../../../common/services';
import { assertInstances } from './assertions';
import { RunOptions } from '../common';
import { ProjectSettings, RunProfilesSetting } from '../../../../config/settings';
import { TestWorkspaceConfig } from '../testWorkspaceConfig';
import { getFriendlyEnvVars } from '../../../../runners/helpers';
import { ProjRun } from '../../../../runners/testRunHandler';



let lockVal = "";
export const ACQUIRE = "acquire";
export const RELEASE = "release";
export async function setLock(consoleName: string, acquireOrRelease: string) {
	// this function is used to mitigate parallel project initialisation for multiroot parallel project testing
	// (it's a bad lock implementation, but works for our needs here, and more importantly adds logs to let us know what's happening)	

	if (!(global as any).multiRootTest) // eslint-disable-line @typescript-eslint/no-explicit-any
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


// gets the extension API
// also does some other stuff we only want to happen once for each integration test run
// e.g. where multiple projects are running in parallel (i.e. multiroot workspace)
let api: IntegrationTestAPI | undefined = undefined;
export async function checkExtensionIsReady(): Promise<IntegrationTestAPI> {

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


export function getExpectedTagsString(testExtConfig: TestWorkspaceConfig, runOptions: RunOptions) {
	let tagsString = "";
	if (runOptions.selectedRunProfile) {
		const runProfiles = testExtConfig.get("runProfiles") as RunProfilesSetting;
		const selectedRunProfile = runProfiles[runOptions.selectedRunProfile];
		if (selectedRunProfile.tagExpression)
			tagsString = `--tags="${selectedRunProfile.tagExpression}" `;
	}
	return tagsString;
}

export function getExpectedEnvVarsString(testExtConfig: TestWorkspaceConfig, runOptions: RunOptions) {

	const env: object = testExtConfig.get("env");

	let rpEnv: object | undefined = {};
	if (runOptions.selectedRunProfile) {
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
		projRelativeWorkingDirPath: testExtConfig.get("behaveWorkingDirectory"),
	} as ProjectSettings;

	return {
		projSettings: projSettings,
		request: request
	} as ProjRun;
}