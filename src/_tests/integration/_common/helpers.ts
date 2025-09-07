 
import vscode from 'vscode';
import fs from 'fs';
import path from 'path';
import assert from 'assert';
import { performance } from 'perf_hooks';
import { IntegrationTestAPI, QueueItem } from '../../../extension';
import { RunOptions, testGlobals } from './types';
import { CustomRunner, ProjectSettings, RunProfile, RunProfileEnvSetting, RunProfilesSetting } from '../../../config/settings';
import { TestWorkspaceConfig } from './testWorkspaceConfig';
import { getFriendlyEnvVars, getOptimisedFeaturePathsRegEx, getPipedScenarioNamesRegex } from '../../../runners/helpers';
import { ProjRun } from '../../../runners/testRunHandler';

export const JS_OUTPUT_DIR = "/out/";


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
	// generous timeout on lock for the sake of debugging, also multiroot test runs can be
	// slow on low-spec PCs or runners, and one unlucky project may get stuck 
	// waiting on a lock while others grab the lock before it
	for (let i = 0; i < 500; i++) {
		if (!lockVal)
			break;
		console.log(`${consoleName}: setLock waiting for ${lockVal} to release lock`);
		await new Promise(t => setTimeout(t, 200));
	}
	const waited = performance.now() - start;

	if (lockVal) {
		throw new Error(`${consoleName}: setLock timed out after ${waited} waiting for lock`);
	}
	else if (acquireOrRelease === ACQUIRE) {
		lockVal = consoleName;
		console.log(`${consoleName}: setLock acquired lock after ${waited}`);
	}

}


export async function getTestProjectUri(api: IntegrationTestAPI, projName: string) {
	const uris = await api.getProjectUris(false);
	const projUri = uris.find(uri => uri.path.includes(projName));
	assert(projUri, "projUri");
	return projUri;
}


export function getBehaveIniFsPaths(workDirUri: vscode.Uri) {
	const behaveIniFsPath = vscode.Uri.joinPath(workDirUri, 'behave.ini').fsPath;
	const behaveIniBakFsPath = vscode.Uri.joinPath(workDirUri, 'behave.ini.bak').fsPath;
	return { behaveIniFsPath, behaveIniBakFsPath };
}


export function replaceBehaveIni(consoleName: string, workDirUri: vscode.Uri, content?: string) {
	const paths = getBehaveIniFsPaths(workDirUri);
	if (content === undefined) {
		if (fs.existsSync(paths.behaveIniFsPath))
			fs.unlinkSync(paths.behaveIniFsPath);
		return;
	}
	fs.writeFileSync(paths.behaveIniFsPath, content);
	console.log(`${consoleName}: replaceBehaveIni wrote "${content}" to ${paths.behaveIniFsPath}`);
}


function cleanUp(consoleName: string, workDirUri: vscode.Uri, exitHandler: () => void) {
	const paths = getBehaveIniFsPaths(workDirUri);
	if (fs.existsSync(paths.behaveIniFsPath)) {
		fs.unlinkSync(paths.behaveIniFsPath);
		// console.log(`${consoleName}: restoreBehaveIni removed "${paths.behaveIniFsPath}"`);
	}
	if (fs.existsSync(paths.behaveIniBakFsPath)) {
		fs.copyFileSync(paths.behaveIniBakFsPath, paths.behaveIniFsPath);
		// console.log(`${consoleName}: restoreBehaveIni copied "${paths.behaveIniBakFsPath}" to ${paths.behaveIniFsPath}`);
		return;
	}

	// remove exit handler as no longer required
	if (exitHandler)
		process.off('exit', exitHandler);
}

export function setCleanup(consoleName: string, workDirUri: vscode.Uri) {
	// cleanUp needs to be called from finally block to tidy up between 
	// tests, but it but also needs to be called on process exit.
	// so we'll set up the cleanUp function to be called on exit, but also 
	// return the cleanUp function so it can be called from finally block.

	//let cleanup: () => void = () => { };
	const exitHandler = () => cleanUp(consoleName, workDirUri, exitHandler);
	process.on('exit', exitHandler);
	return exitHandler;
}


export async function checkExtensionIsReady(): Promise<IntegrationTestAPI> {

	const extension = vscode.extensions.getExtension("jimasp.behave-vsc");
	assert(extension);
	assert(extension.isActive);

	const api: IntegrationTestAPI = extension.exports; // i.e. what activate() returns
	assert(api);
	assertApiInstances(api);

	await api.startupPromise;

	await vscode.commands.executeCommand("workbench.view.testing.focus");
	await vscode.commands.executeCommand("testing.collapseAll");

	return api;
}

export function getExpectedArgsString(projUri: vscode.Uri, testExtConfig: TestWorkspaceConfig, runOptions: RunOptions): string {
	const runProfile = getRunProfile(projUri, testExtConfig, runOptions);

	let args: string[] = testExtConfig.get("args");
	if (runProfile.args)
		args = runProfile.args.inherit ? [...args, ...runProfile.args.list] : runProfile.args.list;

	const argsString = args ? args.join(" ") : "";
	return argsString;
}


export function getExpectedEnvVarsString(projUri: vscode.Uri, testExtConfig: TestWorkspaceConfig, runOptions?: RunOptions): string {

	let rpEnv: RunProfileEnvSetting | undefined;
	if (runOptions && runOptions.selectedRunProfile) {
		const runProfile = getRunProfile(projUri, testExtConfig, runOptions);
		rpEnv = runProfile.env;
	}

	let env: object = testExtConfig.get("env");
	if (rpEnv)
		env = rpEnv.inherit ? { ...env, ...rpEnv.vars } : rpEnv.vars;

	const pr = { env: env } as ProjRun;
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

export function buildExpectedFriendlyCmdOrderedIncludes(projUri: vscode.Uri,
	testExtConfig: TestWorkspaceConfig, runOptions: RunOptions,
	request: vscode.TestRunRequest, projName: string, queueItems?: QueueItem[], includeScenariosRx = false) {

	const envVarsString = getExpectedEnvVarsString(projUri, testExtConfig, runOptions);
	const argsString = getExpectedArgsString(projUri, testExtConfig, runOptions);
	let workingFolder = testExtConfig.get("behaveWorkingDirectory") as string;
	workingFolder = workingFolder.replaceAll("/", path.sep);

	let customRunner: CustomRunner | undefined = undefined;
	if (runOptions.selectedRunProfile) {
		const runProfile = getRunProfile(projUri, testExtConfig, runOptions);
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

	const scriptOrModule = customRunner ? customRunner.scriptFile : "-m";

	const expectCmdOrderedIncludes = [
		`cd `, `example-projects`, projName, workingFolder, `\n`,
		envVarsString,
		`python`,
		scriptOrModule,
		`behave`,
		argsString,
		argPipedFeaturePathsRx,
		argPipedScenariosRx,
		`--show-skipped --junit --junit-directory`,
		projName
	];
	return expectCmdOrderedIncludes;
}


export function getRunProfile(projUri: vscode.Uri, testExtConfig: TestWorkspaceConfig, runOptions: RunOptions | undefined): RunProfile {
	if (!runOptions?.selectedRunProfile)
		return new RunProfile("IntTestDefaultProfile", projUri);
	const runProfilesSetting = testExtConfig.get("runProfiles") as RunProfilesSetting;
	const profile = runProfilesSetting.find(x => x.name === runOptions.selectedRunProfile);
	if (!profile)
		assert(profile, `selectedRunProfile "${runOptions.selectedRunProfile}" not found in testExtConfig runProfiles`);
	return new RunProfile(profile.name, projUri, profile.promptForTags, profile.env, profile.args, profile.customRunner);
}



export function getExampleProjectFolderUri(exampleProjectFolderName: string) {
	const thisUri = vscode.Uri.file(__dirname);
	const exampleProjectFoldersUri = vscode.Uri.joinPath(thisUri, "../../../../example-projects");
	const exampleProjectFolderUri = vscode.Uri.joinPath(exampleProjectFoldersUri, exampleProjectFolderName);
	assert(fs.existsSync(exampleProjectFolderUri.fsPath));
	return exampleProjectFolderUri;
}


function assertApiInstances(api: IntegrationTestAPI) {
	assert(api);
	assert(api.getProjMapEntry);
	assert(api.getStepFileStepForFeatureFileStep);
	assert(api.getStepMappingsForStepsFileFunction);
	assert(api.testData);
	assert(api.configurationChangedHandler);
	assert(api.startupPromise);
}
