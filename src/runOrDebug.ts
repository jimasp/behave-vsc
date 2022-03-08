import * as vscode from 'vscode';
import config from "./configuration";
import { runAll, runScenario } from './runScenario';
import { debugScenario } from './debugScenario';
import { QueueItem } from './extension';
import { updateTest } from './outputParser';
import path = require('path');



const shared_args = [
  "-f", "json", "--no-summary", "--no-snippets", "--show-skipped", // required
  "--capture", "--capture-stderr", "--logcapture", "--show-source", "--show-timings", // preserve default configuration
];


export async function runBehaveAll(run:vscode.TestRun, queue:QueueItem[], cancellation: vscode.CancellationToken) : Promise<void> {
  
  const pythonExec = await config.getPythonExec();
  const friendlyCmd = `${pythonExec} -m behave`;
  config.logger.logInfo(`${friendlyCmd}\n`);
  
  try {
    await runAll(run, queue, shared_args, cancellation);
  }
  catch(e:unknown) {
    config.logger.logError(e instanceof Error ? (e.stack ? e.stack : e.message) : e as string);
  }
}



export async function runOrDebugBehaveScenario(run:vscode.TestRun, queueItem:QueueItem, 
  debug: boolean, cancellation: vscode.CancellationToken) : Promise<void> {
 
    const scenario = queueItem.scenario;
    const scenarioName = scenario.scenarioName;
    const featuresFolderIndex = scenario.featureFilePath.lastIndexOf("/features/");
    const behaveFriendlyFeatureFilePath = scenario.featureFilePath.substring(featuresFolderIndex);   

    const pythonExec = await config.getPythonExec();
    const escapedScenarioName = formatScenarioName(scenarioName, queueItem.scenario.isOutline);
    const args = [ "-i", behaveFriendlyFeatureFilePath, "-n", escapedScenarioName].concat(shared_args);
    const friendlyCmd = `${pythonExec} -m behave -i "${behaveFriendlyFeatureFilePath}" -n "${escapedScenarioName}"`;

    if (scenario.fastSkip) {
      config.logger.logInfo(`Fast skipping '${behaveFriendlyFeatureFilePath}' '${scenarioName}'\n`);
      return updateTest(run, {status: "skipped", duration:0}, queueItem);
    }


    config.logger.logInfo(`${friendlyCmd}\n`);

    try {    
      if(debug) {   
        await debugScenario(run, queueItem, escapedScenarioName, args, cancellation);  
      }
      else {
        await runScenario(run, queueItem, args, cancellation);   
      }
    }
    catch(e:unknown) {
      config.logger.logError(e instanceof Error ? (e.stack ? e.stack : e.message) : e as string);
    }

    
    function formatScenarioName(string:string, isOutline:boolean) {
      const escapeRegEx = string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); 
      
      if(isOutline)
        return "^" + escapeRegEx + " -- @";

      return "^" + escapeRegEx + "$";      
    }    
}




