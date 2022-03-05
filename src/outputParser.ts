import * as vscode from 'vscode';
import config from "./configuration";
import { QueueItem } from "./extension";


export interface ParseResult {
  status:string; 
  duration:number;
}

interface JsonFeature {
  elements:JsonScenario[];
  keyword:string;
  location:string;
  name:string;
  status:string;
  tags:string[];
}

interface JsonScenario {
  steps: JsonStep[];
  keyword:string;
  location:string;
  name:string;
  status:string;
  tags:string[];
}

interface JsonStep { 
  keyword: string;
  name: string;
  result: {
    duration: number;
    status: string;
    error_message: string[]|string;
  }
}

export function parseOutputAndUpdateAllTestResults(run:vscode.TestRun, queue:QueueItem[], behaveOutput: string) {
  parseOutputAndUpdateTestResults(run, queue, behaveOutput);
}

export function parseOutputAndUpdateTestResult(run:vscode.TestRun, queueItem:QueueItem, behaveOutput: string) {
  parseOutputAndUpdateTestResults(run, [queueItem], behaveOutput);
}


function parseOutputAndUpdateTestResults(run:vscode.TestRun, contextualQueue:QueueItem[], behaveOutput: string) 
  : void {

    const extractFeatureFilePathFromJsonScenarioLocation = (scenarioLocation:string) : string => {
      const ffRe = /(.+)(:[0-9]+)$/;
      const matches = ffRe.exec(scenarioLocation);
      let ff = "";
      
      if (matches && matches[1]) {
        ff = matches[1];
      }
  
      if(ff === "") {
        // should never happen
        throw `could not extract feaure file path from scenarioLocation ${scenarioLocation}`;
      }
  
      return ff;
    }

    const getQueueItemFromJsonScenario = (queue: QueueItem[], jScenario: JsonScenario) : QueueItem => {

      if(queue.length === 0)
        throw "queue is empty"; // should never happen
    
      const jFeatureFilePath = extractFeatureFilePathFromJsonScenarioLocation(jScenario.location);

      const matches = queue.filter((qi) => {
        const qisFeatureFilePath = qi.scenario.featureFilePath;
        if (qisFeatureFilePath && qisFeatureFilePath.indexOf(jFeatureFilePath) !== -1) {
          if (qi.scenario.scenarioName === jScenario.name ||
            qi.scenario.scenarioName === jScenario.name.substring(0, jScenario.name.lastIndexOf(" -- @"))) { // -- @  = outline scenario
            return true;
          }
        }
      });
  
      if (matches.length !== 1) {
        // should never happen
        throw `could not match queue item for ${jScenario.name} and ${jScenario.location}`;
      }
  
      return matches[0];
    }  
  

    const updateTestResult = (run: vscode.TestRun, match: QueueItem, failedScenarioNames: string[], skippedScenarioNames: string[],
      result: ParseResult) : void => {

      const scenarioName = match.scenario.scenarioName;
      let inlist = true;

      // failed status = ANY message other than "passed or "skipped"
      const failed = result.status !== "passed" && result.status !== "skipped";      

      
      // N.B. outline scenarios produce multiple json scenarios for a single test item
      // and we need to set only one result per test item

      if (!failedScenarioNames.includes(scenarioName)) {
        inlist = false;
        if (failed) {
          failedScenarioNames.push(scenarioName);
        }
      }
      
      if (!skippedScenarioNames.includes(scenarioName)) {
        inlist = false || inlist;
        if(result.status === "skipped") {
          skippedScenarioNames.push(scenarioName);
        }
      }

      // not in either list, update
      if(!inlist) {
        updateTest(run, result, match);      
      }
      
    }      


    // processing

    if (behaveOutput === "") {
      throw `Error, no behave output.\n`;
    }    

    // either user hit top-level skip, or spawn was killed 
    if(behaveOutput === "skipped") {
      // run terminated, cannot update results
      return;
    }

    const jFeatures: JsonFeature[] = loadJsonFeatures(behaveOutput);

    for(let i=0; i<jFeatures.length; i++) {

      const jFeature = jFeatures[i];

      if(!jFeature.elements) {
          continue;
      }

      const failedScenarioNames:string[] = [];
      const skippedScenarioNames:string[] = [];

      jFeature.elements.forEach((jScenario:JsonScenario) => {
        const result = parseScenarioResult(jScenario);
        // contextualQueue: either the whole queue or single queueItem (see exported functions that call parseOutputAndUpdateTestResults)
        const queueItem = contextualQueue.length === 1 ? contextualQueue[0] : getQueueItemFromJsonScenario(contextualQueue, jScenario);
        updateTestResult(run, queueItem, failedScenarioNames, skippedScenarioNames, result);
      });

    }
}



export function updateTest(run: vscode.TestRun, result: ParseResult, item: QueueItem) : void {

  if (result.status === "passed") {
    run.passed(item.test, result.duration);
  }
  else if (result.status === "skipped") {
    run.skipped(item.test);
  }
  else {
    if(!item.test.uri || !item.test.range)
      throw "invalid test item";
    const message = new vscode.TestMessage(result.status);
    message.location = new vscode.Location(item.test.uri, item.test.range);
    run.failed(item.test, message, result.duration);
  }

  item.scenario.result = result.status;
}



function parseScenarioResult(jScenario:JsonScenario) : ParseResult {

  // console.log(jScenario);

  let duration = 0;
  if(jScenario.steps) {
    jScenario.steps.forEach(step => {
      step.result?.duration ? duration += (step.result.duration * 1000) : 0
    });
  }

  const status = jScenario.status;
  if(status === "passed" || status === "skipped") {
    return {status:status, duration: duration }
  }

  if(status !== "failed") {
    config.logger.logError("unmatched status result:" + status);
    throw "extension error, see output window '" + config.extensionFriendlyName + "'.";
  }

  // status === "failed"


  // get the step result
  let step:JsonStep|undefined;
  for (let i = 0; i < jScenario.steps.length; i++) {     
    step = jScenario.steps[i];
    if(step.result.status !== "passed") {
      break;
    }
  }

  if(step === undefined) {
    throw "step is undefined";
  }

  if(step.result.status === "undefined") {
    return {status: `step '${step.keyword} ${step.name}' has not been implemented.`, duration: duration};
  }

  if(step.result.status === "failed") {
    const errMsg = Array.isArray(step.result.error_message) ? step.result.error_message.join("\n") : step.result.error_message;
    return {status: errMsg, duration: duration};
  }

  throw "unhandled result"; // should never happen
}


function loadJsonFeatures(behaveOutput: string) : JsonFeature[] {
  let jsonObj: JsonFeature[];

  // remove "SKIP" lines from end of output before parsing
  // (note that we DO want "--show-skipped" so we can parse the skipped scenario json output, 
  // because this save us having to add code to find the scenario test items that belong 
  // to a skipped feature when we parse the output)
  const end = behaveOutput.lastIndexOf("]") + 1;
  if(end > 0) {
    behaveOutput = behaveOutput.substring(0, end);
  }  

  try {
    jsonObj = JSON.parse(behaveOutput);
  }
  catch {
    // if output is not parseable json, then most likely something 
    // went wrong calling behave, e.g. a behave configuration error, or an invalid feature file
    throw `Unparseable output:\n${behaveOutput}\n`;
  }
  return jsonObj;
}
