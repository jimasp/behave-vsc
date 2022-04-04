import * as vscode from 'vscode';


export class TestWorkspaceConfig implements vscode.WorkspaceConfiguration {
	constructor(private runParallel?: boolean, private runAllAsOne?: boolean, private fastSkipList?: string,
		private envVarList?: string, private featuresPath?: string, private justMyCode?: boolean) { }

	get<T>(section: string): T | undefined {

		switch (section) {
			case "envVarList":
				return <T><unknown>(this.envVarList);
			case "justMyCode":
				return <T><unknown>(this.justMyCode);
			case "fastSkipList":
				return <T><unknown>(this.fastSkipList);
			case "featuresPath":
				return <T><unknown>(this.featuresPath);
			case "runAllAsOne":
				return <T><unknown>(this.runAllAsOne);
			case "runParallel":
				return <T><unknown>(this.runParallel);
			default:
				// eslint-disable-next-line no-debugger
				debugger;
				throw new Error("missing test case for section: " + section);
		}
	}


	getExpected<T>(section: string): T | undefined {


		const getExpectedEnvVarList = (): { [name: string]: string } | undefined => {
			switch (this.envVarList) {
				case "  'some_var' : 'double qu\"oted',  'some_var2':  'single qu\\'oted', 'empty_var'  :'', 'space_var': ' '  ":
					return { some_var: 'double qu"oted', some_var2: 'single qu\'oted', empty_var: '', space_var: ' ' };
				case "'some_var':'double qu\"oted','some_var2':'single qu\\'oted', 'empty_var':'', 'space_var': ' '":
					return { some_var: 'double qu"oted', some_var2: 'single qu\'oted', empty_var: '', space_var: ' ' };
				case undefined:
					return {};
				case "":
					return {};
				default:
					// eslint-disable-next-line no-debugger
					debugger;
					throw new Error("missing test case for envVarList: " + this.envVarList);
			}

		}

		const getExpectedFastSkipList = (): string[] => {
			switch (this.fastSkipList) {
				case "  @fast-skip-me,  @fast-skip-me-too, ":
					return ["@fast-skip-me", "@fast-skip-me-too"];
				case "@fast-skip-me,@fast-skip-me-too":
					return ["@fast-skip-me", "@fast-skip-me-too"];
				case undefined:
					return [];
				case "":
					return [];
				default:
					// eslint-disable-next-line no-debugger
					debugger;
					throw new Error("missing test case for fastSkipList: " + this.envVarList);
			}
		}

		const getExpectedFeaturesPath = (): string => {
			switch (this.featuresPath) {
				case undefined:
					return "features";
				case "":
					return "features";
				default:
					return this.featuresPath;
			}
		}

		switch (section) {
			case "envVarList":
				return <T><unknown>getExpectedEnvVarList();
			case "fastSkipList":
				return <T><unknown>getExpectedFastSkipList();
			case "justMyCode":
				return <T><unknown>(this.justMyCode === undefined ? true : this.justMyCode);
			case "featuresPath":
				return <T><unknown>getExpectedFeaturesPath();
			case "runAllAsOne":
				return <T><unknown>(this.runAllAsOne === undefined ? true : this.runAllAsOne);
			case "runParallel":
				return <T><unknown>(this.runParallel === undefined ? false : this.runParallel);
			default:
				// eslint-disable-next-line no-debugger
				debugger;
				throw new Error("missing case for section: " + section);
		}
	}

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	has(section: string): boolean {
		throw new Error('Function not implemented.');
	}

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	inspect<T>(section: string): {
		key: string; defaultValue?: T | undefined; globalValue?: T | undefined; workspaceValue?: T | undefined;
		workspaceFolderValue?: T | undefined; defaultLanguageValue?: T | undefined; globalLanguageValue?: T | undefined;
		workspaceLanguageValue?: T | undefined; workspaceFolderLanguageValue?: T | undefined;
		languageIds?: string[] | undefined;
	} | undefined {
		throw new Error('Function not implemented.');
	}


	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	update(section: string, value: never, configurationTarget?: boolean | vscode.ConfigurationTarget | null,
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		overrideInLanguage?: boolean): Thenable<void> {
		throw new Error('Function not implemented.');
	}

}
