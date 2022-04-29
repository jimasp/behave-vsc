import * as vscode from 'vscode';
import * as xml2js from 'xml2js';
import config, { EXTENSION_FRIENDLY_NAME } from "./Configuration";
import { QueueItem } from "./extension";
import { getContentFromFilesystem } from './helpers';
const vwfs = vscode.workspace.fs;

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


export const moreInfo = (debug: boolean) => "See behave output in " + (debug ? "debug console." : `${EXTENSION_FRIENDLY_NAME} output window.`);


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
    return { status: status, duration: duration }

  if (status !== "failed")
    config.logger.logError("Unrecognised scenario status result:" + status);

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

  // remove any error text we don't need in the ui
  let errText = "";
  reasonBlocks.forEach(reason => {
    const lines = reason.split("\n");
    lines.forEach(line => {
      if (!line.startsWith("Location: ") && /None$/.exec(line) === null)
        errText += line.replace(/ in .+\..+s$/, "") + "\n";
    });
  });
  errText = errText.trim();

  return { status: errText, duration: duration };

}

function getDotFoldersFeatureName(queueItem: QueueItem, featuresPath: string) {
  const featureFileStem = `${queueItem.scenario.featureFileWorkspaceRelativePath.split("/").pop()?.replace(/.feature$/, "")}`;
  let dotSubFolders = queueItem.scenario.featureFileWorkspaceRelativePath.replace(featuresPath + "/", "").split("/").slice(0, -1).join(".");
  dotSubFolders = dotSubFolders === "" ? "" : dotSubFolders + ".";
  return `${dotSubFolders}${featureFileStem}`;
}

export function getJunitFileUri(queueItem: QueueItem, featuresPath: string, junitUri: vscode.Uri) {
  const classname = getDotFoldersFeatureName(queueItem, featuresPath);
  const junitFilename = `TESTS-${classname}.xml`;
  return vscode.Uri.joinPath(junitUri, junitFilename);
}

export async function parseAndUpdateTestResults(run: vscode.TestRun, queueItem: QueueItem, featuresPath: string, junitUri: vscode.Uri): Promise<string> {
  const result = await parseJunitFile(queueItem, featuresPath, junitUri);
  const fullFeatureName = getDotFoldersFeatureName(queueItem, featuresPath);
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
  return parseResult.status;
}

export async function junitFileExists(queueItem: QueueItem, featuresPath: string, junitUri: vscode.Uri): Promise<boolean> {
  const junitFileUri = getJunitFileUri(queueItem, featuresPath, junitUri);
  try {
    await vwfs.stat(junitFileUri);
    return true;
  }
  catch (e: unknown) {
    if ((e as vscode.FileSystemError).code === "FileNotFound")
      return false;
    throw e;
  }
}

async function parseJunitFile(queueItem: QueueItem, featuresPath: string, junitUri: vscode.Uri): Promise<{ junitContents: JunitContents, fsPath: string }> {
  const junitFileUri = getJunitFileUri(queueItem, featuresPath, junitUri);
  const junitXml = await getContentFromFilesystem(junitFileUri);
  const contents: JunitContents = await parser.parseStringPromise(junitXml);
  return { junitContents: contents, fsPath: junitFileUri.fsPath };
}