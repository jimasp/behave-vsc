import * as path from 'path';
import * as os from 'os';
import * as vscode from 'vscode';

const EXTENSION_NAME = "behave-vsc";  
const EXTENSION_FULL_NAME = "jimasp.behave-vsc";
const EXTENSION_FRIENDLY_NAME = "Behave VSC";


export interface ExtensionConfiguration {
    readonly extensionName: string;
    readonly extensionFullName: string;
    readonly extensionFriendlyName: string;
    readonly debugOutputFilePath: string;
    readonly logger: Logger;
    readonly userSettings: UserSettings;
    readonly workspaceFolder: vscode.WorkspaceFolder;
    readonly workspaceFolderPath: string;
    __setExtensionTestsConfig(testConfig: vscode.WorkspaceConfiguration): void;
    getPythonExec(): Promise<string>;
}


class Configuration implements ExtensionConfiguration {
    public readonly extensionName = EXTENSION_NAME;  
    public readonly extensionFullName = EXTENSION_FULL_NAME;  
    public readonly extensionFriendlyName = EXTENSION_FRIENDLY_NAME;
    public readonly debugOutputFilePath = path.join(os.tmpdir(), EXTENSION_NAME);
    public readonly logger:Logger = new Logger();
    private extensionTestsConfig?: vscode.WorkspaceConfiguration;    
    
    private static _configuration?: Configuration; 

    private constructor() {
        Configuration._configuration = this;
    }  

    static get configuration() {
        if(Configuration._configuration)
            return Configuration._configuration;
        
        Configuration._configuration = new Configuration();
        return Configuration._configuration;
    }             

    __setExtensionTestsConfig(testConfig:vscode.WorkspaceConfiguration) {
        this.extensionTestsConfig = testConfig;
    }


    // note that configuration, including the python path can change after start up 

    public get userSettings() { 
        if(!this.extensionTestsConfig)
            return new UserSettings(vscode.workspace.getConfiguration(EXTENSION_NAME)); 
        
        return new UserSettings(this.extensionTestsConfig);
    } 

    // WE ONLY SUPPORT A SINGLE WORKSPACE FOLDER ATM
    public get workspaceFolder(): vscode.WorkspaceFolder {
        const wsf = vscode.workspace.workspaceFolders;
        if(wsf && wsf?.length > 0)
            return wsf[0];
        throw "no workspace folder found";
    }

    public get workspaceFolderPath(): string {
        return this.workspaceFolder.uri.fsPath;  
    }

    public getPythonExec = async():Promise<string> => {
        return await getPythonExecutable(this.logger, this.workspaceFolder.uri);
    }    
}

class Logger {

    private outputChannel: vscode.OutputChannel = vscode.window.createOutputChannel(EXTENSION_FRIENDLY_NAME);
    public run:vscode.TestRun|undefined = undefined;

    show = () => {
        this.outputChannel.show();
    }
    clear = () => {
        console.clear();        
        this.outputChannel.clear();
    };
    logInfo = (text:string) => {
        console.log(text);        
        this.outputChannel.appendLine(text);
        if(this.run)
            this.run?.appendOutput(text);
    };   
    logError = (text:string) => {
        console.error(text);        
        const ocHighlight = "\x1b \x1b \x1b \x1b \x1b \x1b \x1b";
        this.outputChannel.appendLine(ocHighlight);
        this.outputChannel.appendLine(text);
        this.outputChannel.appendLine(ocHighlight);
        this.outputChannel.show(true);
        if(this.run)
            this.run?.appendOutput(text);        
    };   
} 

class UserSettings {
    public runParallel:boolean;
    public runAllAsOne:boolean;
    public fastSkipList:string[];
    public envVars: {[name: string]: string} = {};
    constructor(wsConfig:vscode.WorkspaceConfiguration) {
        const runParallelCfg:boolean|undefined = wsConfig.get("runParallel");
        const runAllAsOneCfg:boolean|undefined = wsConfig.get("runAllAsOne");
        const fastSkipListCfg:string|undefined = wsConfig.get("fastSkipList");
        const envVarListCfg:string|undefined = wsConfig.get("envVarList");
        this.runParallel = runParallelCfg !== undefined ? runParallelCfg : false;
        this.runAllAsOne = runAllAsOneCfg !== undefined ? runAllAsOneCfg : true;
        this.fastSkipList = fastSkipListCfg !== undefined ? fastSkipListCfg.split(',').map(s=> !s.startsWith("@") ? "" : s.trim()) : [""];
        if(envVarListCfg !== undefined && envVarListCfg.indexOf(":") !== -1) {
            envVarListCfg.split("',").map(s=> { 
                s = s.replace(/\\'/, "^#^");
                const e = s.split("':");
                const name = e[0].replace(/'/g,"").replace("^#^","'");
                const value = e[1].replace(/'/g,"").replace("^#^", "'");
                this.envVars[name] = value;
            });
        }
    }
}

const getPythonExecutable = async(logger:Logger, scope:vscode.Uri) => {

    const MSPY = "ms-python.python" 
    const pyext = vscode.extensions.getExtension(MSPY);


    if(!pyext) {
        const msg = EXTENSION_FRIENDLY_NAME + " could not find required dependency " + MSPY;
        vscode.window.showErrorMessage(msg);
        logger.logError(msg);
        return undefined;
    }    

    if(!pyext.isActive) {
        await pyext?.activate();
        if(!pyext.isActive) {
            const msg = EXTENSION_FRIENDLY_NAME + " could not activate required dependency " + MSPY;
            vscode.window.showErrorMessage(msg);
            logger.logError(msg);
            return undefined;  
        }    
    }

    const pythonExec = await pyext?.exports.settings.getExecutionDetails(scope).execCommand[0];        
    if(!pythonExec || pythonExec == "") {
        const msg = EXTENSION_FRIENDLY_NAME  + " failed to obtain python executable from " + MSPY;
        vscode.window.showErrorMessage(msg);
        logger.logError(msg);
        return undefined;
    }

    return pythonExec;
}


export default Configuration.configuration;


