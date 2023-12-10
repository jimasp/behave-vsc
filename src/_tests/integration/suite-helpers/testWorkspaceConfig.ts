import * as vscode from 'vscode';
import { RunProfilesSetting, ImportedSteps, ImportedStepsSetting } from '../../../settings';


// used only in the extension tests themselves
export class TestWorkspaceConfigWithprojUri {
	constructor(public testConfig: TestWorkspaceConfig, public projUri: vscode.Uri) { }
}

// used in extension code to allow us to dynamically inject a test workspace configuration
// (i.e. independent of the actual settings.json)
export class TestWorkspaceConfig implements vscode.WorkspaceConfiguration {

	public runParallel?: boolean;
	private env?: { [name: string]: string };
	private envVarOverrides?: { [name: string]: string };
	private justMyCode?: boolean;
	private runMultiRootProjectsInParallel?: boolean;
	private importedSteps?: ImportedStepsSetting;
	private runProfiles?: RunProfilesSetting;
	private xRay?: boolean;

	// all USER-SETTABLE settings in settings.json or *.code-workspace
	constructor({
		envVarOverrides = undefined,
		env = undefined,
		justMyCode = undefined,
		runMultiRootProjectsInParallel = undefined,
		runParallel = undefined,
		importedSteps = undefined,
		runProfiles = undefined,
		xRay = undefined
	}: {
		envVarOverrides?: { [name: string]: string },
		env?: { [name: string]: string },
		justMyCode?: boolean,
		runMultiRootProjectsInParallel?: boolean,
		runParallel?: boolean,
		importedSteps?: ImportedStepsSetting,
		runProfiles?: RunProfilesSetting,
		xRay?: boolean
	} = {}) {
		this.envVarOverrides = envVarOverrides;
		this.env = env;
		this.justMyCode = justMyCode;
		this.runParallel = runParallel;
		this.runMultiRootProjectsInParallel = runMultiRootProjectsInParallel;
		this.importedSteps = importedSteps;
		this.runProfiles = runProfiles;
		this.xRay = xRay;
	}


	get<T>(section: string): T {

		// switch for all user-settable settings in settings.json or *.code-workspace
		//		
		// NOTE: FOR WorkspaceConfiguration.get(), VSCODE WILL ASSIGN IN PREFERENCE:
		// 1. the actual value if one is set in settings.json/*.code-worspace (this could be e.g. an empty string)
		// 2. the default in the package.json (if there is one) 
		// 3. the default value for the type (e.g. bool = false, string = "", dict = {}, array = [])
		// SO WE MUST MIRROR THAT BEHAVIOUR HERE
		switch (section) {
			case "envVarOverrides": // DEPRECATED
				return <T><unknown>(this.envVarOverrides === undefined ? {} : this.envVarOverrides);
			case "env":
				return <T><unknown>(this.env === undefined ? {} : this.env);
			case "runMultiRootProjectsInParallel":
				return <T><unknown>(this.runMultiRootProjectsInParallel === undefined ? true : this.runMultiRootProjectsInParallel);
			case "justMyCode":
				return <T><unknown>(this.justMyCode === undefined ? true : this.justMyCode);
			case "runParallel":
				return <T><unknown>(this.runParallel === undefined ? false : this.runParallel);
			case "importedSteps":
				return <T><unknown>(this.importedSteps === undefined ? [] : this.importedSteps);
			case "xRay":
				return <T><unknown>(this.xRay === undefined ? false : this.xRay);
			case "runProfiles":
				return <T><unknown>(this.runProfiles === undefined ? {} : this.runProfiles);
			default:
				debugger; // eslint-disable-line no-debugger
				throw new Error("get() missing case for section: " + section);
		}
	}


	inspect<T>(section: string): {
		key: string; defaultValue?: T | undefined; globalValue?: T | undefined; workspaceValue?: T | undefined;
		workspaceFolderValue?: T | undefined; defaultLanguageValue?: T | undefined; globalLanguageValue?: T | undefined;
		workspaceLanguageValue?: T | undefined; workspaceFolderLanguageValue?: T | undefined;
		languageIds?: string[] | undefined;
	} | undefined {

		// switch for all user-settable settings in settings.json or *.code-workspace
		let response;
		switch (section) {
			case "envVarOverrides": // DEPRECATED
				response = <T><unknown>this.envVarOverrides;
				break;
			case "env":
				response = <T><unknown>this.env;
				break;
			case "justMyCode":
				response = <T><unknown>this.justMyCode;
				break;
			case "runMultiRootProjectsInParallel":
				response = <T><unknown>this.runMultiRootProjectsInParallel;
				break;
			case "runParallel":
				response = <T><unknown>this.runParallel;
				break;
			case "importedSteps":
				response = <T><unknown>this.importedSteps;
				break;
			case "runProfiles":
				response = <T><unknown>this.runProfiles;
				break;
			case "xRay":
				response = <T><unknown>this.xRay;
				break;
			default:
				debugger; // eslint-disable-line no-debugger
				throw new Error("inspect() missing case for section: " + section);
		}

		return {
			key: "",
			workspaceFolderValue: response,
			workspaceLanguageValue: undefined,
			languageIds: []
		}
	}


	getExpected<T>(section: string): T | undefined {

		// switch for ALL (i.e. including non-user-settable) settings in settings.json or *.code-workspace 
		// (unless tested directly in assertWorkspaceSettingsAsExpected)		
		switch (section) {
			case "env":
				return <T><unknown>(Object.keys(this.get("env") || {}).length === 0 ? (this.envVarOverrides ? this.envVarOverrides : {}) : this.get("env"));
			case "justMyCode":
				return <T><unknown>(this.get("justMyCode"));
			case "runMultiRootProjectsInParallel":
				return <T><unknown>(this.get("runMultiRootProjectsInParallel"));
			case "runParallel":
				return <T><unknown>(this.get("runParallel"));
			case "runProfiles":
				return <T><unknown>(this.get("runProfiles"));
			case "importedSteps":
				return <T><unknown>(this.get("importedSteps") === undefined ? [] : convertimportedStepsToExpectedArray(this.get("importedSteps")));
			case "xRay":
				return <T><unknown>(this.get("xRay"));
			default:
				debugger; // eslint-disable-line no-debugger
				throw new Error("getExpected() missing case for section: " + section);
		}
	}


	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	has(section: string): boolean {
		throw new Error('has() method not implemented.');
	}


	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	update(section: string, value: never, configurationTarget?: boolean | vscode.ConfigurationTarget | null, overrideInLanguage?: boolean): Thenable<void> {
		throw new Error('update() method not implemented.');
	}

}


function convertimportedStepsToExpectedArray(importedSteps: ImportedStepsSetting): ImportedSteps {
	// settings.ts should convert from dict to kvp array and trim keys/values
	const arr: ImportedSteps = [];
	if (importedSteps) {
		for (const key in importedSteps) {
			const tKey = key.trim().replace(/\\/g, "/");
			const tValue = importedSteps[key].trim().replace(/\\/g, "/");
			arr.push({ relativePath: tKey, stepFilesRx: tValue });
		}
	}
	return arr;
}

