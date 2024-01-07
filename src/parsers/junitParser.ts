import * as vscode from 'vscode';
import * as os from 'os';
import * as xml2js from 'xml2js';
import * as path from 'path';
import { QueueItem } from "../extension";
import { getContentFromFilesystem, showDebugWindow, WIN_MAX_PATH, projError } from '../common/helpers';
import { services } from '../services';
import { getJunitProjRunDirUri } from '../watchers/junitWatcher';
import { ProjectSettings } from '../config/settings';
import { Scenario } from './testFile';


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
  failedText?: string,
}


export function updateTest(run: vscode.TestRun, debug: boolean, result: ParseResult, item: QueueItem): void {

  const window = debug ? "debug console" : `Behave VSC output window`;
  let message: vscode.TestMessage;

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
      run.errored(item.test, new vscode.TestMessage(`${result.failedText}.\nCheck output in ${window}.\n` +
        '(If there is no behave error, then check your behave configuration "paths" setting.)'));
      break;
    case "untested":
      run.errored(item.test, new vscode.TestMessage(`JUnit result was "untested". Check output in ${window}.`));
      break;
    case "failed":
      if (!item.test.uri || !item.test.range)
        throw new Error("invalid test item");
      message = new vscode.TestMessage(result.failedText ?? "failed");
      message.location = new vscode.Location(item.test.uri, item.test.range);
      run.failed(item.test, message, result.duration);
      break;
    default:
      throw new Error(`Unhandled test result status: ${result.status}`);
  }

  item.scenario.result = result.status;
  run.appendOutput(`Test item ${vscode.Uri.parse(item.test.id).fsPath}: ${result.status === "passed" || result.status === "skipped"
    ? result.status.toUpperCase() : "FAILED"}\r\n`);

}


function CreateParseResult(projSettings: ProjectSettings, debug: boolean, testCase: TestCase, actualDuration?: number): ParseResult {

  let xmlDuration = testCase.$.time * 1000;
  const xmlStatus = testCase.$.status;

  if (actualDuration)
    xmlDuration = actualDuration;

  if (xmlStatus === "passed" || xmlStatus === "skipped")
    return { status: xmlStatus, duration: xmlDuration };

  if (xmlStatus === "untested") {
    if (debug)
      showDebugWindow();
    else
      services.logger.show(projSettings.uri);
    return { status: "untested", duration: xmlDuration };
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

  return { status: xmlStatus, duration: xmlDuration, failedText: errText };
}



function getJunitFeatureName(projSettings: ProjectSettings, scenario: Scenario): string {
  // NOTE: THIS FUNCTION MUST HAVE BASICALLY THE SAME LOGIC AS THE 
  // BEHAVE SOURCE CODE FUNCTION "make_feature_filename()".
  // IF THAT FUNCTION CHANGES IN BEHAVE, THEN IT IS LIKELY THIS WILL ALSO HAVE TO CHANGE.    
  let fileName = null;
  const relFeatureFilePath = scenario.featureFileProjectRelativePath;
  for (const relConfigPath of projSettings.projRelativeConfigPaths) {
    if (relFeatureFilePath.startsWith(relConfigPath)) {
      fileName = relFeatureFilePath.slice(relConfigPath.length + (relConfigPath !== "" ? 1 : 0));
      break;
    }
  }

  if (!fileName)
    fileName = path.relative(projSettings.projRelativeBaseDirPath, scenario.featureFileProjectRelativePath);

  fileName = fileName.split('.').slice(0, -1).join('.');
  fileName = fileName.replace(/\\/g, '/').replace(/\//g, '.');
  return fileName;
}


function getJunitFileUri(projSettings: ProjectSettings, queueItem: QueueItem, projJunitRunDirUri: vscode.Uri): vscode.Uri {

  const junitName = getJunitFeatureName(projSettings, queueItem.scenario);
  const junitFileUri = vscode.Uri.joinPath(projJunitRunDirUri, `TESTS-${junitName}.xml`);

  if (os.platform() !== "win32")
    return junitFileUri;

  if (junitFileUri.fsPath.length <= WIN_MAX_PATH)
    return junitFileUri;

  throw new Error(`windows max path exceeded while trying to build junit file path: ${junitFileUri.fsPath}`);
}


export class QueueItemMapEntry {
  constructor(
    public readonly queueItem: QueueItem,
    public readonly junitFileUri: vscode.Uri,
    public readonly projSettings: ProjectSettings,
    public updated = false
  ) { }
}


export function getProjQueueJunitFileMap(projSettings: ProjectSettings, run: vscode.TestRun, projQueueItems: QueueItem[]) {
  const projJunitRunDirUri = getJunitProjRunDirUri(run, projSettings.name);
  return projQueueItems.map(qi => {
    const junitFileUri = getJunitFileUri(projSettings, qi, projJunitRunDirUri);
    return new QueueItemMapEntry(qi, junitFileUri, projSettings);
  });
}




export async function parseJunitFileAndUpdateTestResults(projSettings: ProjectSettings, run: vscode.TestRun, debug: boolean,
  junitFileUri: vscode.Uri, filteredQueue: QueueItem[]): Promise<void> {

  if (!junitFileUri.fsPath.toLowerCase().endsWith(".xml"))
    throw new projError("junitFileUri must be an xml file", projSettings.uri);

  let junitXml: string;
  try {
    junitXml = await getContentFromFilesystem(junitFileUri);
  }
  catch {
    updateTestResultsForUnreadableJunitFile(projSettings, run, filteredQueue, junitFileUri);
    return;
  }

  const parser = new xml2js.Parser();
  let junitContents: JunitContents;
  try {
    junitContents = await parser.parseStringPromise(junitXml);
  }
  catch {
    throw new projError(`Unable to parse junit file ${junitFileUri.fsPath}`, projSettings.uri);
  }


  for (const queueItem of filteredQueue) {

    const fullFeatureName = getJunitFeatureName(projSettings, queueItem.scenario);
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
      throw new Error(`could not match queueItem to junit result, when trying to match with $.classname="${className}", ` +
        `$.name="${queueItem.scenario.scenarioName}" in file ${junitFileUri.fsPath}`);
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

    const parseResult = CreateParseResult(projSettings, debug, queueItemResult);
    updateTest(run, debug, parseResult, queueItem);
  }
}


export function updateTestResultsForUnreadableJunitFile(projSettings: ProjectSettings, run: vscode.TestRun,
  queueItems: QueueItem[], junitFileUri: vscode.Uri) {

  const parseResult: ParseResult = {
    status: "no-junit-file",
    duration: 0,
    failedText: `Failed to read expected JUnit file ${junitFileUri.fsPath}`
  };

  for (const queueItem of queueItems) {
    updateTest(run, false, parseResult, queueItem);
  }

  if (services.config.exampleProject) {
    debugger; // eslint-disable-line no-debugger
    throw new Error(`JUnit file ${junitFileUri.fsPath} could not be read.`);
  }

  services.logger.show(projSettings.uri);
}
