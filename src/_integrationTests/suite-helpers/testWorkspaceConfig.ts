import * as vscode from 'vscode';
import { RunProfilesSetting, StepLibrariesSetting } from '../../settings';


// used only in the extension tests themselves
export class TestWorkspaceConfigWithprojUri {
	constructor(public testConfig: TestWorkspaceConfig, public projUri: vscode.Uri) { }
}

// used in extension code to allow us to dynamically inject a test workspace configuration
// (i.e. independent of the actual settings.json)
export class TestWorkspaceConfig implements vscode.WorkspaceConfiguration {

	public runParallel?: boolean;
	private env?: { [name: string]: string };
	private justMyCode?: boolean;
	private multiRootProjectsRunInParallel?: boolean;
	private stepLibraries?: StepLibrariesSetting;
	private runProfiles?: RunProfilesSetting;
	private xRay?: boolean;

	// all USER-SETTABLE settings in settings.json or *.code-workspace
	constructor({
		env = undefined,
		justMyCode = undefined,
		multiRootProjectsRunInParallel = undefined,
		runParallel = undefined,
		stepLibraries = undefined,
		runProfiles = undefined,
		xRay = undefined
	}: {
		env?: { [name: string]: string },
		justMyCode?: boolean,
		multiRootProjectsRunInParallel?: boolean,
		runParallel?: boolean,
		stepLibraries?: StepLibrariesSetting,
		runProfiles?: RunProfilesSetting,
		xRay?: boolean
	} = {}) {
		this.env = env;
		this.justMyCode = justMyCode;
		this.runParallel = runParallel;
		this.multiRootProjectsRunInParallel = multiRootProjectsRunInParallel;
		this.stepLibraries = stepLibraries;
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
			case "env":
				return <T><unknown>(this.env === undefined ? {} : this.env);
			case "multiRootProjectsRunInParallel":
				return <T><unknown>(this.multiRootProjectsRunInParallel === undefined ? true : this.multiRootProjectsRunInParallel);
			case "multiRootRunWorkspacesInParallel": // deprecated
				return <T><unknown>(this.multiRootProjectsRunInParallel === undefined ? true : this.multiRootProjectsRunInParallel);
			case "justMyCode":
				return <T><unknown>(this.justMyCode === undefined ? true : this.justMyCode);
			case "runParallel":
				return <T><unknown>(this.runParallel === undefined ? false : this.runParallel);
			case "stepLibraries":
				return <T><unknown>(this.stepLibraries === undefined ? [] : this.stepLibraries);
			case "xRay":
				return <T><unknown>(this.xRay === undefined ? false : this.xRay);
			case "runProfiles":
				return <T><unknown>(this.runProfiles === undefined ? {} : this.runProfiles);
			case "featuresPath": // deprecated
				return <T><unknown>("ignored");
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
			case "env":
				response = <T><unknown>this.env;
				break;
			case "justMyCode":
				response = <T><unknown>this.justMyCode;
				break;
			case "featuresPath":
				response = <T><unknown>"deprecated";
				break;
			case "multiRootProjectsRunInParallel":
				response = <T><unknown>this.multiRootProjectsRunInParallel;
				break;
			case "runParallel":
				response = <T><unknown>this.runParallel;
				break;
			case "stepLibraries":
				response = <T><unknown>this.stepLibraries;
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
				return <T><unknown>this.get("env");
			case "featuresPath":
				return <T><unknown>("deprecated");
			case "justMyCode":
				return <T><unknown>(this.get("justMyCode"));
			case "multiRootProjectsRunInParallel":
				return <T><unknown>(this.get("multiRootProjectsRunInParallel"));
			case "runParallel":
				return <T><unknown>(this.get("runParallel"));
			case "runProfiles":
				return <T><unknown>(this.get("runProfiles"));
			case "stepLibraries":
				return <T><unknown>(this.get("stepLibraries"));
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

