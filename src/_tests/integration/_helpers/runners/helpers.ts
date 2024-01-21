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
import { services } from '../../../../services';
import { assertInstances } from './assertions';
import { logStore } from '../../../runner';
import { Configuration } from '../../../../config/configuration';
import { RunOptions } from '../common';
import { ProjectSettings, RunProfilesSetting } from '../../../../config/settings';
import { TestWorkspaceConfig } from '../testWorkspaceConfig';
import { getFriendlyEnvVars } from '../../../../runners/helpers';
import { ProjRun } from '../../../../runners/testRunHandler';



export function getTestProjectUri(projName: string) {
	const uris = getUrisOfWkspFoldersWithFeatures();
	const projUri = uris.find(uri => uri.path.includes(projName));
	assert(projUri, "projUri");
	return projUri;
}

export function getBehaveIniPaths(workDirUri: vscode.Uri) {
	const behaveIniPath = path.join(workDirUri.fsPath, 'behave.ini');
	const behaveIniTmpPath = path.join(workDirUri.fsPath, 'behave.ini.tmp');
	return { behaveIniPath, behaveIniTmpPath };
}

export async function replaceBehaveIni(projName: string, projUri: vscode.Uri, workDirUri: vscode.Uri, content: string) {
	// behave behaviour is dictated by a file on disk, 
	// i.e. we cannot mock out behave.ini or we would go out of sync with behave
	const paths = getBehaveIniPaths(workDirUri);
	if (fs.existsSync(paths.behaveIniPath))
		fs.renameSync(paths.behaveIniPath, paths.behaveIniTmpPath);
	fs.writeFileSync(paths.behaveIniPath, Buffer.from(content));
	await waitForWatcherParse(projUri, projName, false);
}


export async function restoreBehaveIni(projName: string, projUri: vscode.Uri, workDirUri: vscode.Uri) {
	const paths = getBehaveIniPaths(workDirUri);
	if (fs.existsSync(paths.behaveIniTmpPath))
		fs.renameSync(paths.behaveIniTmpPath, paths.behaveIniPath);
	else
		fs.unlinkSync(paths.behaveIniPath);
	await waitForWatcherParse(projUri, projName, true);
}


export async function waitForWatcherParse(projUri: vscode.Uri, projName: string, waitUntilComplete: boolean) {
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

export const ACQUIRE = "acquire";
export const RELEASE = "release";

// used to mitigate parallel project initialisation for multiroot parallel project testing
// (it's a bad lock implementation, but works for our needs here, and more importantly adds logs to let us know what's happening)
export async function setLock(consoleName: string, acquireOrRelease: string) {

	if (!(global as any).multiRootTest)
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


export function createFakeProjRun(testExtConfig: TestWorkspaceConfig, requestInclude?: vscode.TestItem[]): ProjRun {

	const projSettings = {
		runParallel: testExtConfig.get("runParallel") as boolean,
		projRelativeWorkingDirPath: testExtConfig.get("relativeWorkingDir") as string,
	} as ProjectSettings;

	const request = {
		include: requestInclude
	} as vscode.TestRunRequest;

	return {
		projSettings: projSettings,
		request: request
	} as ProjRun;
}