import * as vscode from 'vscode';




export class TestWorkspaceConfig implements vscode.WorkspaceConfiguration {
	constructor(private runParallel?: boolean, private runAllAsOne?: boolean, private fastSkipList?: string,
		private envVarList?: string, private featuresPath?: string, private justMyCode?: boolean, private runWorkspacesInParallel?: boolean,
		private showConfigurationWarnings?: boolean) { }


	inspect<T>(section: string): {
		key: string; defaultValue?: T | undefined; globalValue?: T | undefined; workspaceValue?: T | undefined;
		workspaceFolderValue?: T | undefined; defaultLanguageValue?: T | undefined; globalLanguageValue?: T | undefined;
		workspaceLanguageValue?: T | undefined; workspaceFolderLanguageValue?: T | undefined;
		languageIds?: string[] | undefined;
	} | undefined {

		let response;
		switch (section) {
			case "envVarList":
				response = <T><unknown>this.envVarList;
				break;
			case "fastSkipList":
				response = <T><unknown>this.fastSkipList;
				break;
			case "justMyCode":
				response = <T><unknown>this.justMyCode;
				break;
			case "featuresPath":
				response = <T><unknown>this.featuresPath;
				break;
			case "runAllAsOne":
				response = <T><unknown>this.runAllAsOne;
				break;
			case "runParallel":
				response = <T><unknown>this.runParallel;
				break;
			case "runWorkspacesInParallel":
				response = <T><unknown>this.runWorkspacesInParallel;
				break;
			case "showConfigurationWarnings":
				response = <T><unknown>this.showConfigurationWarnings;
				break;
			default:
				// eslint-disable-next-line no-debugger
				debugger;
				throw new Error("inspect() missing case for section: " + section);
		}

		return {
			key: "",
			workspaceFolderValue: response,
			workspaceLanguageValue: undefined,
			languageIds: []
		}
	}


	get<T>(section: string): T {

		// for get, vscode will use the default in the package.json if there is 
		// one, or otherwise a default value for the type (e.g. bool = false, string = "", etc.)
		// so we mirror that behavior here and return defaults
		switch (section) {
			case "envVarList":
				return <T><unknown>(this.envVarList === undefined ? "" : this.envVarList);
			case "justMyCode":
				return <T><unknown>(this.justMyCode === undefined ? false : this.justMyCode);
			case "fastSkipList":
				return <T><unknown>(this.fastSkipList === undefined ? "" : this.fastSkipList);
			case "featuresPath":
				return <T><unknown>(this.featuresPath === undefined ? "features" : this.featuresPath);
			case "runAllAsOne":
				return <T><unknown>(this.runAllAsOne === undefined ? false : this.runAllAsOne);
			case "runParallel":
				return <T><unknown>(this.runParallel === undefined ? false : this.runParallel);
			case "runWorkspacesInParallel":
				return <T><unknown>(this.runWorkspacesInParallel === undefined ? false : this.runWorkspacesInParallel);
			case "showConfigurationWarnings":
				return <T><unknown>(this.showConfigurationWarnings === undefined ? false : this.showConfigurationWarnings);
			default:
				// eslint-disable-next-line no-debugger
				debugger;
				throw new Error("get() missing case for section: " + section);
		}
	}


	getExpected<T>(section: string): T | undefined {


		const getExpectedEnvVarList = (): { [name: string]: string } | undefined => {
			switch (this.envVarList) {
				case "  'some_var' : 'double qu\"oted',  'some_var2':  'single qu\\'oted', 'empty_var'  :'', 'space_var': ' '  ":
					return { some_var: 'double qu"oted', some_var2: 'single qu\'oted', empty_var: '', space_var: ' ' };
				case "'some_var':'double qu\"oted','some_var2':'single qu\\'oted', 'empty_var':'', 'space_var': ' '":
					return { some_var: 'double qu"oted', some_var2: 'single qu\'oted', empty_var: '', space_var: ' ' };
				case "":
				case undefined:
					return {};
				default:
					// eslint-disable-next-line no-debugger
					debugger;
					throw new Error("getExpectedEnvVarList() missing case for envVarList: " + this.envVarList);
			}

		}

		const getExpectedFastSkipList = (): string[] => {
			switch (this.fastSkipList) {
				case "  @fast-skip-me,  @fast-skip-me-too, ":
					return ["@fast-skip-me", "@fast-skip-me-too"];
				case "@fast-skip-me,@fast-skip-me-too":
					return ["@fast-skip-me", "@fast-skip-me-too"];
				case "":
				case undefined:
					return [];
				default:
					// eslint-disable-next-line no-debugger
					debugger;
					throw new Error("getExpectedFastSkipList() missing case for fastSkipList: " + this.envVarList);
			}
		}

		const getExpectedFeaturesPath = (): string => {
			switch (this.featuresPath) {
				case "":
				case undefined:
					return "features";
				default:
					return this.featuresPath;
			}
		}

		const getExpectedRunAllAsOne = (): boolean => {
			if (this.runParallel && this.runAllAsOne === undefined)
				return this.runAllAsOne = false;
			else
				return this.runAllAsOne = this.runAllAsOne === undefined ? true : this.runAllAsOne;
		};

		switch (section) {
			case "envVarList":
				return <T><unknown>getExpectedEnvVarList();
			case "fastSkipList":
				return <T><unknown>getExpectedFastSkipList();
			case "justMyCode":
				return <T><unknown>(this.get("justMyCode"));
			case "featuresPath":
				return <T><unknown>getExpectedFeaturesPath();
			case "runAllAsOne":
				return <T><unknown>(getExpectedRunAllAsOne());
			case "runParallel":
				return <T><unknown>(this.get("runParallel"));
			case "runWorkspacesInParallel":
				return <T><unknown>(this.get("runWorkspacesinParallel"));
			case "showConfigurationWarnings":
				return <T><unknown>(this.get("showConfigurationWarnings"));
			default:
				// eslint-disable-next-line no-debugger
				debugger;
				throw new Error("getExpected() missing case for section: " + section);
		}
	}

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	has(section: string): boolean {
		throw new Error('has() function not implemented.');
	}



	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	update(section: string, value: never, configurationTarget?: boolean | vscode.ConfigurationTarget | null,
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		overrideInLanguage?: boolean): Thenable<void> {
		throw new Error('update() function not implemented.');
	}

}
