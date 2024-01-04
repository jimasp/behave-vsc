import * as vscode from 'vscode';
import { Configuration } from './config/configuration';
import { FileParser } from './parsers/fileParser';
import { Logger, diagLog } from './common/logger';


interface Global {
    bvscSingletons: Singletons;
}

class Singletons {
    // any shared singleton services
    logger: Logger;
    extConfig: Configuration;
    parser: FileParser;
    constructor() {
        this.logger = new Logger();
        this.extConfig = new Configuration();
        this.parser = new FileParser();
    }
    dispose() {
        this.logger.dispose();
    }
}

// NOTE: we use a global rather than a singleton implementation - this is so that integration tests 
// code can access the SAME instances (and to ensure that constructors are only called once when integration test code is executed)
declare const global: Global;
if (!global.bvscSingletons) {
    try {
        diagLog("bvscDiServices - initialising...");
        global.bvscSingletons = new Singletons();
        diagLog("bvscDiServices - ready");
    }
    catch (e: unknown) {
        const text = (e instanceof Error ? (e.stack ? e.stack : e.message) : e as string);
        vscode.window.showErrorMessage(text);
    }
}
export const services: Singletons = global.bvscSingletons;

