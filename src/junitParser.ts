import * as vscode from 'vscode';
import * as os from 'os';
import * as xml2js from 'xml2js';
import { QueueItem } from "./extension";
import { getContentFromFilesystem } from './helpers';
import { WIN_MAX_PATH } from './Configuration';

const parser = new xml2js.Parser();

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

  const rundiag = `test item ${item.test.id} result: ${result.status === "passed" || result.status === "skipped" ? result.status : "failed"}`;
  run.appendOutput(rundiag);
  console.log(rundiag);
}



function CreateParseResult(testCase: TestCase): ParseResult {

  const duration = testCase.$.time * 1000;
  const status = testCase.$.status;

  if (status === "passed" || status === "skipped")
    return { status: status, duration: duration };

  if (status === "untested")
    return { status: "Untested (see output in Behave VSC output window)", duration: duration };

  if (status !== "failed")
    throw new Error("Unrecognised scenario status result:" + status);

  // status === "failed"

  const reasonBlocks: string[] = [];
  const concatErrText = (testCase: TestCase) => {
    const build = (reasons: Reason[]) => {
      if (!reasons)
        return;
      reasons.forEach(reason => {
        let reasonBlock = reason.$.message + "\n";
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

  // remove any error text we don't need in the ui context
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


export async function getJunitFileUriToQueueItemMap(queue: QueueItem[], wkspRelativeFeaturesPath: string, junitDirUri: vscode.Uri) {
  return queue.map(qi => {
    const junitFileUri = getJunitFileUri(qi, wkspRelativeFeaturesPath, junitDirUri);
    return { queueItem: qi, junitFileUri: junitFileUri, updated: false };
  });
}


export async function parseAndUpdateTestResults(junitFileUri: vscode.Uri, run: vscode.TestRun, queueItem: QueueItem, wkspRelativeFeaturesPath: string,
  cancelToken: vscode.CancellationToken): Promise<void> {

  let result: parseJunitFileResult;
  try {
    result = await parseJunitFile(junitFileUri);
  }
  catch (e: unknown) {
    if (cancelToken.isCancellationRequested &&
      ((e as vscode.FileSystemError).code === "FileNotFound" || (e as vscode.FileSystemError).code === "EntryNotFound")) {
      return;
    }
    throw e;
  }

  const fullFeatureName = getjUnitClassName(queueItem, wkspRelativeFeaturesPath);
  const className = `${fullFeatureName}.${queueItem.scenario.featureName}`;
  const scenarioName = queueItem.scenario.scenarioName;
  const queueItemResults = result.junitContents.testsuite.testcase.filter(tc =>
    tc.$.classname === className && (tc.$.name === scenarioName || tc.$.name.substring(0, tc.$.name.lastIndexOf(" -- @")) === scenarioName)
  );

  if (!queueItemResults) {
    throw `could not match queueItem to result, matching with $.classname=${className}, $.name=${queueItem.scenario.scenarioName} ` +
    `in file ${result.fsPath}`;
  }

  let queueItemResult = queueItemResults[0];

  // outline
  if (queueItemResults.length > 1) {
    for (const qir of queueItemResults) {
      if (qir.$.status === "failed") {
        queueItemResult = qir;
        break;
      }
    }
  }

  const parseResult = CreateParseResult(queueItemResult);
  updateTest(run, parseResult, queueItem);
}

export type parseJunitFileResult = { junitContents: JunitContents, fsPath: string };

async function parseJunitFile(junitFileUri: vscode.Uri): Promise<parseJunitFileResult> {
  const junitXml = await getContentFromFilesystem(junitFileUri);
  const contents: JunitContents = await parser.parseStringPromise(junitXml);
  return { junitContents: contents, fsPath: junitFileUri.fsPath };
}

