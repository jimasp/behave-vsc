import * as vscode from 'vscode';
import * as os from 'os';
import * as xml2js from 'xml2js';
import { QueueItem } from "./extension";
import { getContentFromFilesystem, showDebugWindow, WIN_MAX_PATH, WkspError } from './common';
import { config } from './configuration';
import { WorkspaceSettings } from './settings';

export type parseJunitFileResult = { junitContents: JunitContents, fsPath: string };

interface JunitContents {
  testsuite: TestSuite
}

interface TestSuite {
  "$": {
    name: string,
    tests: number,
    errors: number,
    failures: number,
    skipped: number,
    time: number,
    timestamp: string,
    hostname: string
  },
  testcase: [TestCase]
}

interface TestCase {
  "$": {
    classname: string,
    name: string,
    status: string,
    time: number
  },
  skipped: string[],
  "system-out": string[]
  failure: [Reason]
  error: [Reason]
}

interface Reason {
  "_": string,
  "$": {
    type: string,
    message: string
  }
}

type ParseResult = {
  status: string,
  duration: number
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
  run.appendOutput(`test item ${item.test.id} result: ${result.status === "passed" || result.status === "skipped" ? result.status : "failed"}`);
}



function CreateParseResult(debug: boolean, wkspUri: vscode.Uri, testCase: TestCase, actualDuration?: number): ParseResult {

  let duration = testCase.$.time * 1000;
  const status = testCase.$.status;

  if (actualDuration)
    duration = actualDuration;

  if (status === "passed" || status === "skipped")
    return { status: status, duration: duration };

  if (status === "untested") {
    if (debug)
      showDebugWindow();
    else
      config.logger.show(wkspUri);
    const window = debug ? "debug console" : `Behave VSC output window`;
    return { status: `Untested: see output in ${window}`, duration: duration };
  }

  if (status !== "failed")
    throw new Error("Unrecognised scenario status result:" + status);

  // status === "failed"

  const reasonBlocks: string[] = [];
  const concatErrText = (testCase: TestCase) => {
    const build = (reasons: Reason[]) => {
      if (!reasons)
        return;
      reasons.forEach(reason => {
        //let reasonBlock = `${reason.$.type}: ${reason.$.message}\n`;
        const reasonBlock = reason._.trim();
        reasonBlocks.push(reasonBlock);
      });
    }
    build(testCase.failure);
    build(testCase.error);
  }

  concatErrText(testCase);

  if (reasonBlocks.length === 0)
    throw new Error("Failed test has no failure or error message");

  // remove any error text we don't need in the UI
  let errText = "";
  reasonBlocks.forEach(reason => {
    const lines = reason.split("\n");
    lines.forEach(line => {
      if (!line.startsWith("Location: ") && /None$/.exec(line) === null) {
        errText += line.replace(/ ... failed in .+\..+s$/, " ... failed").replace(/ ... undefined in .+\..+s$/, " ... undefined") + "\n";
      }
    });
  });
  errText = errText.trim();

  return { status: errText, duration: duration };
}


function getjUnitClassName(queueItem: QueueItem, wskpRelativeFeaturesPath: string) {
  const featureFileStem = queueItem.scenario.featureFileName.replace(/.feature$/, "");
  let dotSubFolders = queueItem.scenario.featureFileWorkspaceRelativePath.replace(wskpRelativeFeaturesPath + "/", "").split("/").slice(0, -1).join(".");
  dotSubFolders = dotSubFolders === "" ? "" : dotSubFolders + ".";
  return `${dotSubFolders}${featureFileStem}`;
}




export function getJunitFileUri(queueItem: QueueItem, wkspRelativeFeaturesPath: string, junitDirUri: vscode.Uri, ignoreWinMaxPath = false): vscode.Uri {
  const classname = getjUnitClassName(queueItem, wkspRelativeFeaturesPath);
  const junitFilename = `TESTS-${classname}.xml`;
  const junitFileUri = vscode.Uri.joinPath(junitDirUri, junitFilename);

  if (os.platform() !== "win32" || ignoreWinMaxPath)
    return junitFileUri;

  if (junitFileUri.fsPath.length <= WIN_MAX_PATH)
    return junitFileUri;

  throw `windows max path exceeded while trying to build junit file path: ${junitFileUri.fsPath}`;
}


export function getJunitFileUriToQueueItemMap(queue: QueueItem[], wkspRelativeFeaturesPath: string, junitDirUri: vscode.Uri) {
  return queue.map(qi => {
    const junitFileUri = getJunitFileUri(qi, wkspRelativeFeaturesPath, junitDirUri);
    return { queueItem: qi, junitFileUri: junitFileUri, updated: false };
  });
}


export async function parseAndUpdateTestResults(debug: boolean, behaveExecutionError: boolean, wkspSettings: WorkspaceSettings,
  junitFileUri: vscode.Uri | undefined, run: vscode.TestRun, queueItem: QueueItem, cancelToken: vscode.CancellationToken,
  actualDuration?: number): Promise<void> {

  if (behaveExecutionError) {
    handleNoJunitFile(debug, wkspSettings.uri, run, queueItem, actualDuration);
    return;
  }

  if (cancelToken.isCancellationRequested)
    return;

  if (!junitFileUri) {
    throw new WkspError("junitFileUri must be supplied if behaveExecutionError is false", wkspSettings.uri);
  }

  let junitXml: string;
  try {
    junitXml = await getContentFromFilesystem(junitFileUri);
  }
  catch {
    handleNoJunitFile(debug, wkspSettings.uri, run, queueItem, actualDuration);
    return;
  }

  const parser = new xml2js.Parser();
  let junitContents: JunitContents;
  try {
    junitContents = await parser.parseStringPromise(junitXml);
  }
  catch {
    throw new WkspError(`Unable to parse junit file ${junitFileUri.fsPath}`, wkspSettings.uri);
  }

  const fullFeatureName = getjUnitClassName(queueItem, wkspSettings.workspaceRelativeFeaturesPath);
  const className = `${fullFeatureName}.${queueItem.scenario.featureName}`;
  const scenarioName = queueItem.scenario.scenarioName;

  // normal scenario
  let queueItemResults = junitContents.testsuite.testcase.filter(tc =>
    tc.$.classname === className && tc.$.name === scenarioName
  );

  // scenario outline
  if (queueItemResults.length === 0) {
    queueItemResults = junitContents.testsuite.testcase.filter(tc =>
      tc.$.classname === className && tc.$.name.substring(0, tc.$.name.lastIndexOf(" -- @")) === scenarioName
    );
  }

  // scenario outline with <param> in scenario outline name
  if (queueItemResults.length === 0 && scenarioName.includes("<")) {
    queueItemResults = junitContents.testsuite.testcase.filter(tc => {
      const jScenName = tc.$.name.substring(0, tc.$.name.lastIndexOf(" -- @"));
      const rx = new RegExp(scenarioName.replace(/<.*>/g, ".*"));
      return tc.$.classname === className && rx.test(jScenName);
    });
  }


  if (queueItemResults.length === 0) {
    throw `could not match queueItem to junit result, when trying to match with $.classname="${className}", ` +
    `$.name="${queueItem.scenario.scenarioName}" in file ${junitFileUri.fsPath}`;
  }

  let queueItemResult = queueItemResults[0];

  // scenario outline
  if (queueItemResults.length > 1) {
    for (const qir of queueItemResults) {
      if (qir.$.status === "failed") {
        queueItemResult = qir;
        break;
      }
    }
  }

  const parseResult = CreateParseResult(debug, wkspSettings.uri, queueItemResult, actualDuration);
  updateTest(run, parseResult, queueItem);
}


function handleNoJunitFile(debug: boolean, wkspUri: vscode.Uri, run: vscode.TestRun, queueItem: QueueItem, actualDuration?: number) {
  const window = debug ? "debug console" : `Behave VSC output window`;
  const parseResult = { status: `Check output in ${window}.`, duration: actualDuration ? actualDuration : 0 };
  updateTest(run, parseResult, queueItem);

  if (config.integrationTestRun)
    debugger; // eslint-disable-line no-debugger

  if (debug)
    showDebugWindow();
  else
    config.logger.show(wkspUri);

  return;
}


