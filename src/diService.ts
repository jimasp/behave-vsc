import * as vscode from 'vscode';
import { ExtensionConfiguration } from './config/configuration';
import { FileParser } from './parsers/fileParser';
import { diagLog } from './common/logger';


export interface Services {
    extConfig: ExtensionConfiguration;
    parser: FileParser;
}

interface Global {
    bvscDiServices: Services;
}

class ServicesClass implements Services {
    // any shared singleton services,
    // e.g. imported modules that we need for test code
    extConfig: ExtensionConfiguration;
    parser: FileParser;
    constructor() {
        this.extConfig = new ExtensionConfiguration();
        this.parser = new FileParser();
    }
}

// NOTE: we use a global rather than a singleton implementation so that test code can stub the services
// and to ensure that constructors are only called once when test code is executed
declare const global: Global;
if (!global.bvscDiServices) {
    try {
        global.bvscDiServices = new ServicesClass();
        diagLog("bvscDiServices created");
    }
    catch (e: unknown) {
        const text = (e instanceof Error ? (e.stack ? e.stack : e.message) : e as string);
        vscode.window.showErrorMessage(text);
    }
}
export const services: Services = global.bvscDiServices;

