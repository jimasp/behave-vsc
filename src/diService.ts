import * as BehaveConfigImport from './config/behaveConfig';
import { ExtensionConfiguration } from './config/configuration';


export interface Services {
    config: ExtensionConfiguration;
    behaveConfig: BehaveConfigImport.BehaveConfigType;
}

interface Global {
    bvscDiServices: Services;
}

class ServicesClass implements Services {
    // any singleton services,
    // e.g. imported modules that we want to stub out for testing
    config: ExtensionConfiguration;
    behaveConfig: BehaveConfigImport.BehaveConfigType;
    constructor() {
        this.config = ExtensionConfiguration.configuration;
        this.behaveConfig = BehaveConfigImport;
    }
}

// NOTE: we use a global rather than a singleton implementation, this is required so that tests can stub the services
// and to ensure that constructors are only called once when test code is executed
declare const global: Global;
if (!global.bvscDiServices) {
    global.bvscDiServices = new ServicesClass();
    console.debug("bvscDiServices created");
}
export const services: Services = global.bvscDiServices;

