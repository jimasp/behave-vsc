import * as vscode from 'vscode';

export class TestWorkspaceConfig implements vscode.WorkspaceConfiguration 
{
	constructor(private runParallel:boolean, private runAllAsOne:boolean, private fastSkipList: string, 
		private envVarList:string) {}

	get<T>(section: string): T | undefined {
		
		switch (section) {
			case "runParallel":
				return <T><unknown>(this.runParallel);
			case "runAllAsOne":
				return <T><unknown>(this.runAllAsOne);
			case "fastSkipList":
				return <T><unknown>(this.fastSkipList);
			case "envVarList":
					return <T><unknown>(this.envVarList);
							
			default:
				break;
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
		languageIds?: string[] | undefined; } | undefined 
	{
		throw new Error('Function not implemented.');
	}


	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	update(section: string, value: never, configurationTarget?: boolean | vscode.ConfigurationTarget | null, 
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		overrideInLanguage?: boolean): Thenable<void> 
	{
			throw new Error('Function not implemented.');
	}

}
