import * as vscode from 'vscode';
import * as os from 'os';
import * as xml2js from 'xml2js';
import { QueueItem } from "../extension";
import { getContentFromFilesystem, showDebugWindow, WkspError } from '../common/helpers';
import { config } from '../common/configuration';
import { getJunitWkspRunDirUri } from '../watchers/junitWatcher';
import { WorkspaceSettings } from '../common/settings';


const WIN_MAX_PATH = 259; // 256 + 3 for "C:\", see https://superuser.com/a/1620952

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
  duration: number,
  text: string,
}

export const statusBuffer = new Set<string>();

export function updateTest(run: vscode.TestRun, debug: boolean, result: ParseResult, item: QueueItem): void {

  // this function will be called every time the feature file is updated, only update tests we haven't already updated
  if (statusBuffer.has(item.test.id))
    return;
  statusBuffer.add(item.test.id);

  const window = debug ? "debug console" : `Behave VSC output window`;
  let message: vscode.TestMessage = new vscode.TestMessage(result.text);
  if (!item.test.uri || !item.test.range)
    throw "invalid test item";
  message.location = new vscode.Location(item.test.uri, item.test.range);

  if (run.token.isCancellationRequested)
    return;

  switch (result.status) {
    case "passed":
      run.passed(item.test, result.duration);
      break;
    case "skipped":
      run.skipped(item.test);
      break;
    case "no-junit-file":
      message.message = `No JUnit file was written for this test. Check output in ${window}.`;
      run.errored(item.test, message);
      result.status
      break;
    case "untested":
      message.message = `This test was not run. Check output in ${window}.`;
      run.errored(item.test, message);
      break;
    case "failed":
      message = new vscode.TestMessage(result.text ?? "failed");
      run.failed(item.test, message, result.duration);
      break;
    default:
      throw `Unhandled test result status: ${result.status}`;
  }

  item.qItem.result = result.status;

  if (result.status === "passed" || result.status === "skipped")
    run.appendOutput(result.text, message.location, item.test);
}


function CreateParseResult(wkspSettings: WorkspaceSettings, debug: boolean, testCase: TestCase, actualDuration?: number): ParseResult {

  let xmlDuration = testCase.$.time * 1000;
  const xmlStatus = testCase.$.status;
  const text = testCase["system-out"].join("\n").replaceAll("\n", "\r\n");

  if (actualDuration)
    xmlDuration = actualDuration;

  if (xmlStatus === "passed" || xmlStatus === "skipped")
    return { status: xmlStatus, duration: xmlDuration, text: text };

  if (xmlStatus === "untested") {
    if (debug)
      showDebugWindow();
    else
      config.logger.show(wkspSettings.uri);
    return { status: "untested", duration: xmlDuration, text: text };
  }

  if (xmlStatus !== "failed") {
    throw new Error(`Unrecognised behave scenario status result "${xmlStatus}" found while parsing junit file ` +
      `for testCase "${testCase.$.name}"`);
  }

  // status === "failed"

  const reasonBlocks: string[] = [];
  const concatErrText = (testCase: TestCase) => {
    const build = (reasons: Reason[]) => {
      if (!reasons)
        return;
      reasons.forEach(reason => {
        let reasonBlock = "";
        if (reason.$.type && reason.$.type !== "NoneType")
          reasonBlock += `${reason.$.type.replace("\n", "")}\n`;
        if (reason.$.message)
          reasonBlock += `${reason.$.message.replace("\n", "")}\n`;
        if (reason._)
          reasonBlock += reason._.trim();
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

  return { status: xmlStatus, duration: xmlDuration, text: errText };
}


function getjUnitClassName(featureFileName: string, featureFileWorkspaceRelativePath: string, wskpRelativeFeaturesPath: string) {
  const featureFileStem = featureFileName.replace(/.feature$/, "");
  let dotSubFolders = featureFileWorkspaceRelativePath.replace(wskpRelativeFeaturesPath + "/", "").split("/").slice(0, -1).join(".");
  dotSubFolders = dotSubFolders === "" ? "" : dotSubFolders + ".";
  return `${dotSubFolders}${featureFileStem}`;
}




function getJunitFileUri(queueItem: QueueItem, wkspJunitRunDirUri: vscode.Uri, wskpRelativeFeaturesPath: string): vscode.Uri {

  const classname = getjUnitClassName(queueItem.qItem.featureFileName,
    queueItem.qItem.featureFileWorkspaceRelativePath, wskpRelativeFeaturesPath);
  const junitFilename = `TESTS-${classname}.xml`;
  const junitFileUri = vscode.Uri.joinPath(wkspJunitRunDirUri, junitFilename);

  if (os.platform() !== "win32")
    return junitFileUri;

  if (junitFileUri.fsPath.length <= WIN_MAX_PATH)
    return junitFileUri;

  throw `windows max path exceeded while trying to build junit file path: ${junitFileUri.fsPath}`;
}


export class QueueItemMapEntry {
  constructor(
    public readonly queueItem: QueueItem,
    public readonly junitFileUri: vscode.Uri,
    public readonly wkspSettings: WorkspaceSettings,
    public updated = false
  ) { }
}


export function getWkspQueueJunitFileMap(wkspSettings: WorkspaceSettings, run: vscode.TestRun, wkspQueueItems: QueueItem[]) {
  const wkspJunitRunDirUri = getJunitWkspRunDirUri(run, wkspSettings.name);
  return wkspQueueItems.map(qi => {
    const junitFileUri = getJunitFileUri(qi, wkspJunitRunDirUri, wkspSettings.workspaceRelativeFeaturesPath);
    return new QueueItemMapEntry(qi, junitFileUri, wkspSettings);
  });
}




export async function parseJunitFileAndUpdateTestResults(wkspSettings: WorkspaceSettings, run: vscode.TestRun, debug: boolean,
  junitFileUri: vscode.Uri, filteredQueue: QueueItem[]): Promise<void> {

  if (!junitFileUri.fsPath.toLowerCase().endsWith(".xml"))
    throw new WkspError("junitFileUri must be an xml file", wkspSettings.uri);

  let junitXml: string;
  try {
    junitXml = await getContentFromFilesystem(junitFileUri);
  }
  catch {
    updateTestResultsForUnreadableJunitFile(wkspSettings, run, filteredQueue, junitFileUri);
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


  for (const queueItem of filteredQueue) {

    const fullFeatureName = getjUnitClassName(queueItem.qItem.featureFileName, queueItem.qItem.featureFileWorkspaceRelativePath,
      wkspSettings.workspaceRelativeFeaturesPath);
    const className = `${fullFeatureName}.${queueItem.qItem.featureName}`;
    const scenarioName = queueItem.qItem.scenarioName;
    const testCase = junitContents.testsuite.testcase;

    // should get single queueItemResult if normal scenario
    let queueItemResults = testCase.filter(tc => tc.$.classname === className && tc.$.name === scenarioName);

    // scenario outline
    if (queueItemResults.length === 0)
      queueItemResults = testCase.filter(tc => tc.$.classname === className && new RegExp(queueItem.qItem.runName).test(tc.$.name));

    if (queueItemResults.length === 0)
      throw `could not get junit results for queueItem. file: ${junitFileUri.fsPath}, queueItem: ${scenarioName}`;

    const rowRegEx = new RegExp(queueItem.qItem.runName);
    const result = queueItemResults.length === 1
      ? queueItemResults[0]
      : rowRegEx
        ? queueItemResults.find(qir => rowRegEx.test(qir.$.name))
        : queueItemResults.find(qir => qir.$.status === "failed") || queueItemResults[0];

    if (!result)
      throw `could not match queueItem to junit result. file: ${junitFileUri.fsPath}, queueItem: ${scenarioName}`;

    const parseResult = CreateParseResult(wkspSettings, debug, result);
    updateTest(run, debug, parseResult, queueItem);
  }
}


export function updateTestResultsForUnreadableJunitFile(wkspSettings: WorkspaceSettings, run: vscode.TestRun,
  queueItems: QueueItem[], junitFileUri: vscode.Uri) {

  const parseResult = { status: "no-junit-file", duration: 0, text: "no matching junit file was found" };
  for (const queueItem of queueItems) {
    updateTest(run, false, parseResult, queueItem);
  }

  if (config.exampleProject) {
    debugger; // eslint-disable-line no-debugger
    throw `JUnit file ${junitFileUri.fsPath} could not be read. Check Behave VSC output window for errors.`;
  }

  config.logger.show(wkspSettings.uri);
}
