import * as assert from "assert";
import * as vscode from "vscode";
import { Configuration } from "../../../../config/configuration";
import { IntegrationTestAPI, QueueItem } from "../../../../extension";
import { ProjParseCounts } from "../../../../parsers/fileParser";
import { TestWorkspaceConfig } from "../testWorkspaceConfig";
import { Expectations, TestResult } from "../common";
import { services } from "../../../../services";
import { ProjectSettings } from "../../../../config/settings";
import { getLines, isFeatureFile, isStepsFile } from "../../../../common/helpers";
import { featureFileStepRe } from "../../../../parsers/featureParser";
import { funcRe } from "../../../../parsers/stepsParser";
import { logStore } from "../../../runner";



export function assertInstances(instances: IntegrationTestAPI) {
  assert(instances);
  assert(instances.ctrl);
  assert(instances.getStepFileStepForFeatureFileStep);
  assert(instances.getStepMappingsForStepsFileFunction);
  assert(instances.runHandler);
  assert(instances.testData);
  assert(instances.configurationChangedHandler);
}


export function assertWorkspaceSettingsAsExpected(projUri: vscode.Uri, projName: string,
  testConfig: TestWorkspaceConfig, config: Configuration, expectations: Expectations) {

  // multiroot will read window settings from multiroot.code-workspace file, not config
  if (!(global as any).multiRootTest) {
    const instanceSettings = config.instanceSettings;
    assert.strictEqual(instanceSettings.runMultiRootProjectsInParallel, testConfig.getExpected("runMultiRootProjectsInParallel"),
      `${projName} project: runMultiRootProjectsInParallel`);
    assert.strictEqual(instanceSettings.xRay, testConfig.getExpected("xRay"),
      `${projName} project: xRay`);
    assert.deepStrictEqual(instanceSettings.runProfiles, testConfig.getExpected("runProfiles"),
      `${projName} project: runProfiles`);
  }

  const projSettings = config.projectSettings[projUri.path];
  assert.deepStrictEqual(projSettings.env, testConfig.getExpected("env"),
    `${projName} project: env`);
  assert.deepStrictEqual(projSettings.projRelativeFeatureFolders, expectations.expectedProjectRelativeFeatureFolders,
    `${projName} project: relativeFeatureFolders`);
  assert.deepStrictEqual(projSettings.projRelativeStepsFolders, expectations.expectedProjectRelativeStepsFolders,
    `${projName} project: relativeStepsFolders`);
  assert.strictEqual(projSettings.projRelativeBaseDirPath, expectations.expectedProjectRelativeBaseDirPath,
    `${projName} project: relativeBaseDirPath`);
  assert.deepStrictEqual(projSettings.projRelativeConfigPaths, expectations.expectedProjectRelativeConfigPaths,
    `${projName} project: relativeConfigPaths`);
  assert.strictEqual(projSettings.projRelativeWorkingDirPath, expectations.expectedProjectRelativeWorkingDirPath,
    `${projName} project: relativeWorkingDirPath`);
  assert.strictEqual(projSettings.justMyCode, testConfig.getExpected("justMyCode"),
    `${projName} project: justMyCode`);
  assert.strictEqual(projSettings.runParallel, testConfig.getExpected("runParallel"),
    `${projName} project: runParallel`);
  assert.deepStrictEqual(projSettings.importedSteps, testConfig.getExpected("importedSteps"),
    `${projName} project: importedSteps`);
}


export function assertTestResultMatchesExpectedResult(expectedResults: TestResult[], actualResult: TestResult, testConfig: TestWorkspaceConfig): TestResult[] {

  const match = expectedResults.filter((expectedResult: TestResult) => {

    if (
      expectedResult.test_id !== actualResult.test_id ||
      expectedResult.test_uri !== actualResult.test_uri ||
      expectedResult.test_parent !== actualResult.test_parent ||
      expectedResult.test_children !== actualResult.test_children ||
      expectedResult.test_description !== actualResult.test_description ||
      expectedResult.test_error !== actualResult.test_error ||
      expectedResult.test_label !== actualResult.test_label ||
      expectedResult.scenario_featureFileRelativePath !== actualResult.scenario_featureFileRelativePath ||
      expectedResult.scenario_isOutline !== actualResult.scenario_isOutline ||
      expectedResult.scenario_getLabel !== actualResult.scenario_getLabel ||
      expectedResult.scenario_featureName !== actualResult.scenario_featureName ||
      expectedResult.scenario_scenarioName !== actualResult.scenario_scenarioName
    ) {

      if (expectedResult.test_id === actualResult.test_id) {
        debugger; // eslint-disable-line no-debugger 
        throw new Error(`test ids matched but properties were different: \n` +
          `expectedResult:${JSON.stringify(expectedResult)} \n` +
          `actualResult:${JSON.stringify(actualResult)} \n`);
      }

      return false;
    }

    // now match shortened expected result string:

    if (expectedResult.scenario_result !== actualResult.scenario_result) {
      debugger; // eslint-disable-line no-debugger	
      if (actualResult.scenario_result) {
        throw new Error(`test ids matched but result did not match expected result\n` +
          `expectedResult:${JSON.stringify(expectedResult)} \n` +
          `actualResult:${JSON.stringify(actualResult)} \n` +
          `testConfig:${JSON.stringify(testConfig)} \n` +
          `note - if you only get this error while running "npm run test", but NOT when running integration test suites in the IDE, ` +
          `then first check if the behave command line output matches the IDE behave command output.`);
      }
      throw new Error(`result is undefined, was the test run cancelled ?\n` +
        `actualResult:${JSON.stringify(expectedResult)} \n` +
        `testConfig:${JSON.stringify(testConfig)} \n`);
    }

    return true;

  }); // end filter


  if (match.length !== 1) {

    logUnexpectedResult(actualResult);

    // UHOH - did you add/modify a feature/scenario, that is not in an expectedResults? 
    // IF (and only IF) a new feature/scenario has been 
    // ADDED then SEE THE "new TestResult" in the DEBUG CONSOLE and "copy all"/paste into xxx suite/expectedResults.ts)
    debugger; // eslint-disable-line no-debugger
    throw new Error(`match.length was:${match.length} when attempting to match test id "${actualResult.test_id}" to expected result`);
  }

  return match;
}


export async function assertAllFeatureFileStepsHaveAStepFileStepMatch(projUri: vscode.Uri, instances: IntegrationTestAPI) {

  const projSettings = services.config.projectSettings[projUri.path];
  const featureFileSteps = await getAllStepLinesFromFeatureFiles(projSettings);

  for (const [step, stepText] of featureFileSteps) {
    const uri = step.uri;
    const lineNo = step.lineNo;
    try {
      if (!stepText.includes("missing step")) {
        const match = instances.getStepFileStepForFeatureFileStep(uri, lineNo);
        assert(match);
      }
    }
    catch (e: unknown) {
      debugger; // eslint-disable-line no-debugger
      if (e instanceof assert.AssertionError)
        throw new Error(`getStepFileStepForFeatureFileLine() could not find match for line ${uri.fsPath}:${lineNo}, (step text: "${stepText}")`);
      throw e;
    }
  }
  console.log(`assertAllFeatureFileStepsHaveAStepFileStepMatch for ${projSettings.name}, ${featureFileSteps.length} feature file steps successfully matched`)
}


export async function assertAllStepFileStepsHaveAtLeastOneFeatureReference(projUri: vscode.Uri, instances: IntegrationTestAPI) {

  const projSettings = services.config.projectSettings[projUri.path];
  const stepFileSteps = await getAllStepFunctionLinesFromStepsFiles(projSettings);

  for (const [step, funcLine] of stepFileSteps) {
    const uri = step.uri;
    const lineNo = step.lineNo;
    try {
      if (!funcLine.includes("unreferenced_step")) {
        const mappings = instances.getStepMappingsForStepsFileFunction(uri, lineNo);
        assert(mappings.length > 0);
        mappings.forEach(mapping => {
          assert(mapping.featureFileStep);
        });
      }
    }
    catch (e: unknown) {
      debugger; // eslint-disable-line no-debugger
      if (e instanceof assert.AssertionError)
        throw new Error(`getStepMappingsForStepsFileFunction() could not find mapping for line ${uri.fsPath}:${lineNo + 1}, (function: "${funcLine}")`);
      throw e;
    }
  }
  console.log(`assertAllStepFileStepsHaveAtLeastOneFeatureReference for ${projSettings.name}, ${stepFileSteps.length} step file steps successfully matched`)
}


export function assertLogExists(projUri: vscode.Uri, orderedIncludes: string[]) {
  let closestMatch = { log: '', failedOnInclude: '', highestIndex: 0, mismatchIndex: 0 };
  const projLogs = logStore.get().filter(x => x[0] === projUri.path).map(x => x[1]);

  // for simplicity, we use an ordered includes array here rather than a regex, 
  // this is so we can do a a direct string comparison (vs getting caught up in regex escaping issues)  
  const matchingLogs = projLogs.filter(x => {
    let lastIndex = -1;
    let includesIndex = 0;
    for (const include of orderedIncludes) {
      const currentIndex = x.indexOf(include, lastIndex + 1);
      if (currentIndex === -1) {
        if (includesIndex > closestMatch.highestIndex)
          closestMatch = { log: x, failedOnInclude: include, highestIndex: includesIndex, mismatchIndex: 0 };
        if (includesIndex === closestMatch.highestIndex) {
          const mismatchIndex = findMismatchIndex(x, closestMatch.log);
          if (mismatchIndex > closestMatch.mismatchIndex)
            closestMatch = { log: x, failedOnInclude: include, highestIndex: includesIndex, mismatchIndex };
        }
        return false;
      }
      lastIndex = currentIndex;
      includesIndex++;
    }

    return true;
  });

  if (matchingLogs.length > 1)
    throw new Error("more than one matching log");

  if (matchingLogs.length === 0) {
    // throw here rather than assert so we can examine projLogs if we are debugging integration tests
    debugger; // eslint-disable-line no-debugger
    throw new Error(`logStore did not contain expected log for project: "${projUri.path}"\n` +
      `closest matched log was: "${closestMatch.log}"\n` +
      `which failed on include string: "${closestMatch.failedOnInclude}"\n` +
      `include strings list was:"${orderedIncludes}"`);
  }
}

function findMismatchIndex(str1: string, str2: string): number {
  const minLength = Math.min(str1.length, str2.length);
  for (let i = 0; i < minLength; i++) {
    if (str1[i] !== str2[i]) {
      return i;
    }
  }
  if (str1.length !== str2.length) {
    return minLength;
  }
  return -1;  // The strings are identical
}


export function assertExpectedResults(results: QueueItem[] | undefined, expectedResults: TestResult[],
  testExtConfig: TestWorkspaceConfig, expectedTestRunSize?: number) {

  assert(results && results.length !== 0, "runHandler returned an empty queue, check for previous errors in the debug console");

  results.forEach(result => {
    const scenResult = ScenarioResult(result);
    assert(JSON.stringify(result.test.range).includes("line"), 'JSON.stringify(result.test.range).includes("line")');
    assertTestResultMatchesExpectedResult(expectedResults, scenResult, testExtConfig);
  });

  // (keep this assert below results.forEach, as individual match asserts are more useful to fail out first)
  if (!expectedTestRunSize)
    expectedTestRunSize = expectedResults.length;
  assert.equal(results.length, expectedTestRunSize, "results.length !== resultsLengthExpected");
}


export function assertExpectedCounts(projUri: vscode.Uri, projName: string, config: Configuration,
  getExpectedCountsFunc: (projUri: vscode.Uri, config: Configuration) => ProjParseCounts,
  actualCounts: ProjParseCounts, hasMultiRootWkspNode: boolean) {

  try {
    const expectedCounts = getExpectedCountsFunc(projUri, config);

    assert(actualCounts.featureFilesExceptEmptyOrCommentedOut == expectedCounts.featureFilesExceptEmptyOrCommentedOut, projName + ": featureFilesExceptEmptyOrCommentedOut");
    assert(actualCounts.stepFilesExceptEmptyOrCommentedOut === expectedCounts.stepFilesExceptEmptyOrCommentedOut, projName + ": stepFilesExceptEmptyOrCommentedOut");
    assert(actualCounts.stepFileStepsExceptCommentedOut === expectedCounts.stepFileStepsExceptCommentedOut, projName + ": stepFileStepsExceptCommentedOut");
    assert(actualCounts.featureFileStepsExceptCommentedOut === expectedCounts.featureFileStepsExceptCommentedOut, projName + ": featureFileStepsExceptCommentedOut");
    assert(actualCounts.stepMappings === expectedCounts.stepMappings, projName + ": stepMappings");

    // (test counts are only calculated if xRay is true)
    if (!config.instanceSettings.xRay)
      return;

    assert(actualCounts.tests.testCount === expectedCounts.tests.testCount, projName + ": testCount");

    if (hasMultiRootWkspNode) {
      assert(actualCounts.tests.nodeCount === expectedCounts.tests.nodeCount + 1, projName + ": nodeCount");
    }
    else {
      assert(actualCounts.tests.nodeCount === expectedCounts.tests.nodeCount, projName + ": nodeCount");
    }
  }
  catch (e: unknown) {
    // UHOH - did we add a test or comment something out? do a git diff?
    debugger; // eslint-disable-line no-debugger
  }
}


export function ScenarioResult(result: QueueItem) {
  return new TestResult({
    test_id: standardisePath(result.test.id, true),
    test_uri: standardisePath(result.test.uri?.toString()),
    test_parent: standardisePath(result.test.parent?.id),
    test_children: getChildrenIds(result.test.children),
    test_description: result.test.description,
    test_error: result.test.error?.toString(),
    test_label: result.test.label,
    scenario_isOutline: result.scenario.isOutline,
    scenario_getLabel: result.scenario.getLabel(),
    scenario_featureFileRelativePath: result.scenario.featureFileProjectRelativePath,
    scenario_featureName: result.scenario.featureName,
    scenario_scenarioName: result.scenario.scenarioName,
    scenario_result: standardiseResult(result.scenario.result)
  });
}


export function standardisePath(path: string | undefined, isId = false): string | undefined {
  if (!path)
    return path;
  try {
    if (isId) {
      // special chars in scenario names would break decodeURI, and may include "/", so we'll split on .feature
      const split = path.split(".feature");
      const folderPath = split[0] + ".feature";
      path = decodeURI(folderPath) + split[1];
    }
    else {
      path = decodeURI(path);
    }
  }
  catch (e: unknown) {
    debugger; // eslint-disable-line no-debugger
    throw e;
  }
  const find = "/example-projects/";
  return path === undefined ? undefined : "..." + path.substring(path.indexOf(find) + find.length - 1);
}



export function addStepsFromFeatureFile(uri: vscode.Uri, content: string, featureSteps: Map<FileStep, string>) {
  const lines = getLines(content.trim());
  for (let lineNo = 0; lineNo < lines.length; lineNo++) {
    const line = lines[lineNo].trim();
    const stExec = featureFileStepRe.exec(line);
    if (stExec)
      featureSteps.set({ uri, lineNo }, line);
  }

  return featureSteps;
}


export function addStepsFromStepsFile(uri: vscode.Uri, content: string, steps: Map<FileStep, string>) {
  const lines = getLines(content.trim());
  for (let lineNo = 0; lineNo < lines.length; lineNo++) {
    const line = lines[lineNo].trim();
    const prevLine = lineNo === 0 ? "" : lines[lineNo - 1].trim();
    if (funcRe.test(line) && prevLine !== "" && prevLine !== "@classmethod") {
      steps.set({ uri, lineNo }, line);
    }
  }

  return steps;
}


function standardiseResult(result: string | undefined): string | undefined {
  let res = result;
  if (!result)
    return undefined;

  const tbm = /Traceback.*:\n {2}File /;
  const tbe = tbm.exec(result);
  if (!tbe)
    return res;

  const tb = tbe[0];
  const tbi = result.search(tbm);

  if (tbi !== -1) {
    let tbSnip = result.indexOf("assert ");
    if (tbSnip === -1)
      tbSnip = result.indexOf("raise Exception(");
    if (tbSnip !== -1)
      res = result.replace(result.substring(tbi + tb.length, tbSnip), "-snip- ");
  }

  return res;
}

function getChildrenIds(children: vscode.TestItemCollection): string | undefined {
  if (children.size === 0)
    return undefined;
  const arrChildrenIds: string[] = [];
  children.forEach(child => {
    arrChildrenIds.push(child.id);
  });
  return arrChildrenIds.join();
}


async function getAllStepLinesFromFeatureFiles(projSettings: ProjectSettings) {

  const stepLines = new Map<FileStep, string>();
  const pattern = new vscode.RelativePattern(projSettings.uri, `${projSettings.projRelativeFeatureFolders}/**/*.feature`);
  const featureFileUris = await vscode.workspace.findFiles(pattern, null);

  for (const featFileUri of featureFileUris) {
    if (isFeatureFile(featFileUri)) {
      const doc = await vscode.workspace.openTextDocument(featFileUri);
      const content = doc.getText();
      addStepsFromFeatureFile(featFileUri, content, stepLines);
    }
  }

  return [...stepLines];
}

async function getAllStepFunctionLinesFromStepsFiles(projSettings: ProjectSettings) {

  const funcLines = new Map<FileStep, string>();
  const pattern = new vscode.RelativePattern(projSettings.uri, `${projSettings.projRelativeFeatureFolders} /steps/ *.py`);
  const stepFileUris = await vscode.workspace.findFiles(pattern, null);

  for (const stepFileUri of stepFileUris) {
    if (isStepsFile(stepFileUri)) {
      const doc = await vscode.workspace.openTextDocument(stepFileUri);
      const content = doc.getText();
      addStepsFromStepsFile(stepFileUri, content, funcLines);
    }
  }

  return [...funcLines];
}


function logUnexpectedResult(actualResult: TestResult) {
  console.clear();
  console.log("new TestResult({");
  const sortedProperties = Object.keys(actualResult).sort();
  for (const property of sortedProperties) {
    if (Object.prototype.hasOwnProperty.call(actualResult, property)) {
      const val = actualResult[property as keyof TestResult];
      const value = typeof val === 'string'
        ? `'${(actualResult[property as keyof TestResult] as string).replace(/['\\]/g, "\\$&")}'`
        : val;
      console.log(`\t${property}: ${value},`);
    }
  }
  console.log("}),");
}


type FileStep = {
  uri: vscode.Uri,
  lineNo: number,
}