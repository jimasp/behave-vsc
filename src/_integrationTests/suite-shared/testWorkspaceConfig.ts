import * as vscode from 'vscode';
import { RunProfilesSetting, StepLibrariesSetting } from '../../settings';


// used only in the extension tests themselves
export class TestWorkspaceConfigWithprojUri {
	constructor(public testConfig: TestWorkspaceConfig, public projUri: vscode.Uri) { }
}

// used in extension code to allow us to dynamically inject a test workspace configuration
// (i.e. independent of the actual settings.json)
export class TestWorkspaceConfig implements vscode.WorkspaceConfiguration {

	private envVarOverrides: { [name: string]: string } | undefined;
	private featuresPath: string | undefined;
	private justMyCode: boolean | undefined;
	private multiRootProjectsRunInParallel: boolean | undefined;
	private runParallel: boolean | undefined;
	private stepLibraries: StepLibrariesSetting | undefined;
	private runProfiles: RunProfilesSetting | undefined;
	private xRay: boolean | undefined;

	// all USER-SETTABLE settings in settings.json or *.code-workspace
	constructor({
		envVarOverrides, featuresPath: featuresPath, justMyCode,
		multiRootProjectsRunInParallel,
		runParallel, stepLibraries, runProfiles, xRay
	}: {
		envVarOverrides: { [name: string]: string } | undefined,
		featuresPath: string | undefined,
		justMyCode: boolean | undefined,
		multiRootProjectsRunInParallel: boolean | undefined,
		runParallel: boolean | undefined,
		stepLibraries: StepLibrariesSetting | undefined,
		runProfiles: RunProfilesSetting | undefined,
		xRay: boolean | undefined
	}) {
		this.envVarOverrides = envVarOverrides;
		this.featuresPath = featuresPath;
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
			case "envVarOverrides":
				return <T><unknown>(this.envVarOverrides === undefined ? {} : this.envVarOverrides);
			case "featuresPath":
				return <T><unknown>(this.featuresPath === undefined ? "features" : this.featuresPath);
			case "multiRootProjectsRunInParallel":
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
			case "envVarOverrides":
				response = <T><unknown>this.envVarOverrides;
				break;
			case "justMyCode":
				response = <T><unknown>this.justMyCode;
				break;
			case "featuresPath":
				response = <T><unknown>this.featuresPath;
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


	getExpected<T>(section: string, projUri?: vscode.Uri): T | undefined {

		const getexpectedProjectRelativeFeaturesPath = (): string => {
			switch (this.featuresPath) {
				case "":
				case undefined:
					return "features";
				default:
					return this.featuresPath.trim().replace(/^\\|^\//, "").replace(/\\$|\/$/, "");
			}
		}

		const getExpectedFeaturesUri = (): vscode.Uri => {
			if (!projUri)
				throw "you must supply projUri to call getExpectedFeaturesUri";
			return vscode.Uri.joinPath(projUri, getexpectedProjectRelativeFeaturesPath()); //.trim().replace(/^\\|^\//, "").replace(/\\$|\/$/, ""));
		}


		// switch for ALL (i.e. including non-user-settable) settings in settings.json or *.code-workspace 
		// (unless tested directly in assertWorkspaceSettingsAsExpected)		
		switch (section) {
			case "envVarOverrides":
				return <T><unknown>this.get("envVarOverrides");
			case "workspaceRelativeFeaturesPath":
				return <T><unknown>getexpectedProjectRelativeFeaturesPath();
			case "featuresUri":
				return <T><unknown>getExpectedFeaturesUri();
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

