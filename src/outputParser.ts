import * as vscode from 'vscode';
import config from "./configuration";
import { QueueItem } from "./extension";

export interface ParseResult {
  status: string;
  duration: number;
}

export interface JsonFeature {
  elements: JsonScenario[];
  keyword: string;
  location: string;
  name: string;
  status: string;
  tags: string[];
}

interface JsonScenario {
  steps: JsonStep[];
  keyword: string;
  location: string;
  name: string;
  status: string;
  tags: string[];
}

interface JsonStep {
  keyword: string;
  name: string;
  result: {
    duration: number;
    status: string;
    error_message: string[] | string;
  }
}

export const moreInfo = (debug: boolean) => "See behave output in " + (debug ? "debug console." : `${config.extensionFriendlyName} output window.`);

export function parseOutputAndUpdateTestResults(run: vscode.TestRun, contextualQueue: QueueItem[], behaveOutput: string, debug: boolean) {
  const jFeatures: JsonFeature[] = parseJsonFeatures(behaveOutput);
  updateTestResults(run, contextualQueue, jFeatures, debug);
}


export function updateTestResults(run: vscode.TestRun, contextualQueue: QueueItem[], jFeatures: JsonFeature[], debug: boolean)
  : void {

  const extractFeatureFilePathFromJsonScenarioLocation = (scenarioLocation: string): string => {
    const ffRe = /(.+)(:[0-9]+)$/;
    const matches = ffRe.exec(scenarioLocation);
    let ff = "";

    if (matches && matches[1]) {
      ff = matches[1];
    }

    if (ff === "") {
      // should never happen
      throw `could not extract feaure file path from scenarioLocation ${scenarioLocation}`;
    }

    return ff;
  }

  const getQueueItemFromJsonScenario = (queue: QueueItem[], jScenario: JsonScenario): QueueItem => {

    if (queue.length === 0)
      throw "queue is empty"; // should never happen

    const jFeatureFilePath = extractFeatureFilePathFromJsonScenarioLocation(jScenario.location);

    const matches = queue.filter((qi) => {
      const qisFeatureFilePath = qi.scenario.featureFileRelativePath;
      if (qisFeatureFilePath && qisFeatureFilePath.startsWith(jFeatureFilePath)) {
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
    result: ParseResult): void => {

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
      if (result.status === "skipped") {
        skippedScenarioNames.push(scenarioName);
      }
    }

    // not in either list, update
    if (!inlist) {
      updateTest(run, result, match);
    }

  }


  // processing


  for (let i = 0; i < jFeatures.length; i++) {

    const jFeature = jFeatures[i];
    if (!jFeature.elements) {
      const status = `Parent feature status was '${jFeature.status}' but no scenario results found.\n${moreInfo(debug)}`;
      const childScenarioQueueItems = contextualQueue.filter(qi => jFeature.location.startsWith(qi.scenario.featureFileRelativePath));
      childScenarioQueueItems.forEach(childScenarioQueueItem => {
        updateTest(run, { status: status, duration: 0 }, childScenarioQueueItem);
      });
      continue;
    }

    const failedScenarioNames: string[] = [];
    const skippedScenarioNames: string[] = [];

    jFeature.elements.forEach((jScenario: JsonScenario) => {
      const result = parseScenarioResult(jScenario, debug);
      // contextualQueue: either the whole queue or single queueItem (see exported functions that call parseOutputAndUpdateTestResults)
      const queueItem = contextualQueue.length === 1 ? contextualQueue[0] : getQueueItemFromJsonScenario(contextualQueue, jScenario);
      updateTestResult(run, queueItem, failedScenarioNames, skippedScenarioNames, result);
    });

  }
}



export function updateTest(run: vscode.TestRun, result: ParseResult, item: QueueItem): void {

  if (result.status === "passed") {
    run.passed(item.test, result.duration);
  }
  else if (result.status === "skipped") {
    run.skipped(item.test);
  }
  else {
    if (!item.test.uri || !item.test.range)
      throw "invalid test item";
    const message = new vscode.TestMessage(result.status);
    message.location = new vscode.Location(item.test.uri, item.test.range);
    run.failed(item.test, message, result.duration);
  }

  item.scenario.result = result.status;
}



function parseScenarioResult(jScenario: JsonScenario, debug: boolean): ParseResult {

  // console.log(jScenario);

  let duration = 0;
  if (jScenario.steps) {
    jScenario.steps.forEach(step => {
      step.result?.duration ? duration += (step.result.duration * 1000) : 0
    });
  }

  const status = jScenario.status;
  if (status === "passed" || status === "skipped") {
    return { status: status, duration: duration }
  }

  if (status !== "failed") {
    config.logger.logError("Unrecognised scenario status result:" + status);
    throw `Extension error, ${moreInfo(debug)}'`;
  }

  // status === "failed"


  // get the first failing step result
  let step: JsonStep | undefined;
  for (let i = 0; i < jScenario.steps.length; i++) {
    step = jScenario.steps[i];
    if (!step.result) {
      return { status: `Scenario failed without a step status.\n${moreInfo(debug)}`, duration: duration };
    }
    if (step.result.status !== "passed") {
      break;
    }
  }

  if (step === undefined) {
    throw "Step is undefined"; // should never happen
  }

  // (if the scenario failed, but all steps passed, the it could be e.g. an after_scenario hook error)
  if (step.result.status === "passed") {
    return { status: `All steps passed, but scenario failed.\n${moreInfo(debug)}`, duration: duration };
  }

  if (step.result.status === "undefined") {
    return { status: `Step '${step.keyword} ${step.name}' has not been implemented.`, duration: duration };
  }

  if (step.result.status === "failed") {
    const errMsg = Array.isArray(step.result.error_message) ? step.result.error_message.join("\n") : step.result.error_message;
    return { status: errMsg, duration: duration };
  }

  throw "unhandled result"; // should never happen
}


export function parseJsonFeatures(behaveOutput: string): JsonFeature[] {
  let jsonObj: JsonFeature[];

  if (behaveOutput === "") {
    throw `Error, no behave output.\n`;
  }

  // handle windows line endings
  let fixOutput = behaveOutput.replaceAll("\r\n", "\n")

  // handle behave bug where it doesn't always stick a \n before the first HOOK-ERROR
  fixOutput = fixOutput.replaceAll("}]}", "}]}\n");

  // remove non-json lines (HOOK-ERROR / SKIP)
  const lines = fixOutput.split("\n");
  let cleanedOutput = "";
  for (const i in lines) {
    const line = lines[i];
    if (line.startsWith("[") || line.startsWith("]") || line.startsWith("{") || line.startsWith(","))
      cleanedOutput += line;
  }

  try {
    jsonObj = JSON.parse(cleanedOutput);
  }
  catch {
    // if cleaned output is not parseable json, then most likely something 
    // went wrong calling behave, e.g. a behave configuration error, or an invalid feature file
    throw `Unparseable output:\n${behaveOutput}\n`;
  }
  return jsonObj;
}
