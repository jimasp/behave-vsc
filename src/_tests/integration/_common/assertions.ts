import * as assert from "assert";
import * as vscode from "vscode";
import { Configuration } from "../../../config/configuration";
import { IntegrationTestAPI, QueueItem } from "../../../extension";
import { ProjParseCounts } from "../../../parsers/fileParser";
import { TestWorkspaceConfig } from "./testWorkspaceConfig";
import { Expectations, TestResult, testGlobals } from "./types";
import { services } from "../../../common/services";
import { ProjectSettings } from "../../../config/settings";
import { getLines, isFeatureFile, isStepsFile } from "../../../common/helpers";
import { featureFileStepRe } from "../../../parsers/featureParser";
import { funcRe } from "../../../parsers/stepsParser";
import { logStore } from "../../runner";




export async function assertWorkspaceSettingsAsExpected(projUri: vscode.Uri, projName: string, testConfig: TestWorkspaceConfig,
  actualConfig: Configuration, expectations: Expectations) {

  try {
    // multiroot will read window settings from multiroot.code-workspace file, not config
    if (!testGlobals.multiRootTest) {
      const instanceSettings = actualConfig.instanceSettings;
      assert.strictEqual(instanceSettings.runMultiRootProjectsInParallel, testConfig.getExpected("runMultiRootProjectsInParallel"),
        `${projName} project: runMultiRootProjectsInParallel`);
      assert.strictEqual(instanceSettings.xRay, testConfig.getExpected("xRay"),
        `${projName} project: xRay`);
      assert.deepStrictEqual(instanceSettings.runProfiles, testConfig.getExpected("runProfiles"),
        `${projName} project: runProfiles`);
    }

    const projSettings = await actualConfig.getProjectSettings(projUri.path);
    assert.deepStrictEqual(projSettings.env, testConfig.getExpected("env"),
      `${projName} project: env`);
    assert.deepStrictEqual(projSettings.rawBehaveConfigPaths, expectations.expectedRawBehaveConfigPaths,
      `${projName} project: rawBehaveConfigPaths`);
    assert.deepStrictEqual(projSettings.projRelativeFeatureFolders, expectations.expectedProjRelativeFeatureFolders,
      `${projName} project: projRelativeFeatureFolders`);
    assert.deepStrictEqual(projSettings.projRelativeStepsFolders, expectations.expectedProjRelativeStepsFolders,
      `${projName} project: projRelativeStepsFolders`);
    assert.strictEqual(projSettings.baseDirPath, expectations.expectedBaseDirPath,
      `${projName} project: baseDirPath`);
    assert.strictEqual(projSettings.projRelativeBehaveWorkingDirPath, expectations.expectedProjRelativeBehaveWorkingDirPath,
      `${projName} project: projRelativeWorkingDirPath`);
    const behaveWorkDirUri = vscode.Uri.joinPath(projUri, expectations.expectedProjRelativeBehaveWorkingDirPath);
    const populateLazy_fsPath = behaveWorkDirUri.fsPath; // eslint-disable-line @typescript-eslint/no-unused-vars
    assert.deepStrictEqual(projSettings.behaveWorkingDirUri, behaveWorkDirUri,
      `${projName} project: behaveWorkingDirUri`);
    assert.strictEqual(projSettings.justMyCode, testConfig.getExpected("justMyCode"),
      `${projName} project: justMyCode`);
    assert.strictEqual(projSettings.runParallel, testConfig.getExpected("runParallel"),
      `${projName} project: runParallel`);
    assert.deepStrictEqual(projSettings.importedSteps, testConfig.getExpected("importedSteps"),
      `${projName} project: importedSteps`);
  }
  catch (assertErr: unknown) {
    debugger; // eslint-disable-line no-debugger      

    throw new Error(`assertWorkspaceSettingsAsExpected failed for ${projName} project:\n${assertErr}`);
  }
}


export function assertTestResultMatchesExpectedResult(projName: string, expectedResults: TestResult[], actualResult: TestResult,
  testConfig: TestWorkspaceConfig, execFriendlyCmd: boolean): TestResult[] {

  const match = expectedResults.filter((expectedResult: TestResult) => {
    if (expectedResult.test_id === actualResult.test_id) {
      checkPropertiesMatchOrThrow(projName, expectedResult, actualResult, testConfig, execFriendlyCmd);
      return true;
    }
    return false;
  }); // end filter


  if (match.length !== 1) {
    console.log(formatResult(actualResult, true));
    // UHOH - did you add/modify a feature/scenario, that is not in an expectedResults? IF (and ONLY IF) you did add a 
    // new feature/scenario, then SEE THE "new TestResult" in the DEBUG CONSOLE and "copy all"/paste into xxx suite/expectedResults.ts)
    debugger; // eslint-disable-line no-debugger
    throw new Error(`match.length was:${match.length} when attempting to match test id "${actualResult.test_id}" to expected result`);
  }

  return match;
}


function checkPropertiesMatchOrThrow(projName: string, expectedResult: TestResult, actualResult: TestResult,
  testConfig: TestWorkspaceConfig, execFriendlyCmd: boolean): boolean {

  const differentProperties = [];
  for (const key in expectedResult) {
    if (Object.prototype.hasOwnProperty.call(expectedResult, key)) {
      const value = expectedResult[key as keyof TestResult];
      if (value !== actualResult[key as keyof TestResult])
        differentProperties.push(key);
    }
  }

  if (differentProperties.length === 0)
    return true;

  console.error(`test ids matched but properties were different from expected:\n` +
    `project: ${projName}\n` +
    `testConfig: ${JSON.stringify(testConfig)}\n` +
    `execFriendlyCmd: ${execFriendlyCmd}\n` +
    `differing properties: ${differentProperties.join(", ")}\n` +
    `expectedResult: ${formatResult(expectedResult)}` +
    `actualResult: ${formatResult(actualResult)}`);

  let error = "";
  if (differentProperties.length === 1 && expectedResult.scenario_result !== actualResult.scenario_result) {
    if (!actualResult.scenario_result) {
      error = `scenario_result is undefined, was the test run cancelled?`;
    }
    else {
      error = `scenario_result did not match expected scenario_result\n` +
        `note - if you only get this error while running "npm run test", but NOT when running integration test suites in the IDE, ` +
        `then first check if the behave command line output matches the IDE behave command output.`;
    }
  }

  if (!error)
    error = `differing properties: ${differentProperties.join(", ")}`;

  debugger; // eslint-disable-line no-debugger  
  throw new Error(error);
}


export async function assertAllFeatureFileStepsHaveAStepFileStepMatch(projUri: vscode.Uri, instances: IntegrationTestAPI) {

  const projSettings = await services.config.getProjectSettings(projUri.path);
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

  const projSettings = await services.config.getProjectSettings(projUri.path);
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


export function assertLogExists(projUri: vscode.Uri, orderedIncludes: string[], testTitle?: string) {
  const hint = testTitle ? `(test:${testTitle}) ` : "";

  let closestMatch = { log: '', failedOnInclude: '', highestIndex: 0, mismatchIndex: 0 };
  const projLogs = logStore.get().filter(x => x[0] === projUri.path).map(x => x[1]);

  // we use an ordered includes array here rather than a regex, this is so that:
  // a) we can do a a direct string comparison vs getting caught up in regex escaping issues
  // b) we can easily see which portion (i.e. orderedInclude) it failed to match
  // c) we have an easy way to get the closest matched log for the error message if there is no match
  const matchingLogs = projLogs.filter(x => {
    let lastIndex = -1;
    let includesIndex = 0;
    for (const include of orderedIncludes) {
      const currentIndex = x.indexOf(include, lastIndex + 1);
      if (include !== "" && currentIndex === -1) {
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
    throw new Error(`more than one matching log ${hint}`);

  if (matchingLogs.length === 0) {
    // throw here rather than assert so we can examine projLogs if we are debugging integration tests
    debugger; // eslint-disable-line no-debugger
    throw new Error(`logStore did not contain expected log for project: "${projUri.path}"\n${hint}\n` +
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


export function assertExpectedResults(projName: string, results: QueueItem[] | undefined, expectedResults: TestResult[],
  testExtConfig: TestWorkspaceConfig, execFriendlyCmd: boolean, expectedTestRunSize?: number, testTitle?: string) {

  const hint = testTitle ? `(test:${testTitle}) ` : "";

  try {
    assert(results && (results.length !== 0 || expectedResults.length === 0), "runHandler returned an empty queue, check for previous errors in the debug console");

    results.forEach(result => {
      const scenResult = ScenarioResult(result);
      assert(JSON.stringify(result.test.range).includes("line"), 'JSON.stringify(result.test.range).includes("line")');
      assertTestResultMatchesExpectedResult(projName, expectedResults, scenResult, testExtConfig, execFriendlyCmd);
    });

    // (keep this assert below results.forEach, as individual match asserts are more useful to fail out first)
    if (!expectedTestRunSize)
      expectedTestRunSize = expectedResults.length;

    assert.equal(results.length, expectedTestRunSize, `${hint}results.length !== resultsLengthExpected`);
  }
  catch (assertErr: unknown) {
    debugger; // eslint-disable-line no-debugger      

    throw new Error(`assertExpectedResults failed for ${projName} project: ${hint}\n${assertErr}`);
  }
}


export function assertExpectedCounts(projUri: vscode.Uri, projName: string, config: Configuration,
  getExpectedCountsFunc: (projUri: vscode.Uri, config: Configuration) => ProjParseCounts,
  actualCounts: ProjParseCounts, hasMultiRootWkspNode: boolean) {

  const expectedCounts = getExpectedCountsFunc(projUri, config);

  try {

    assert.strictEqual(actualCounts.featureFilesExceptEmptyOrCommentedOut, expectedCounts.featureFilesExceptEmptyOrCommentedOut,
      projName + ": unexpected featureFilesExceptEmptyOrCommentedOut count");
    assert.strictEqual(actualCounts.stepFilesExceptEmptyOrCommentedOut, expectedCounts.stepFilesExceptEmptyOrCommentedOut,
      projName + ": unexpected stepFilesExceptEmptyOrCommentedOut count");
    assert.strictEqual(actualCounts.stepFileStepsExceptCommentedOut, expectedCounts.stepFileStepsExceptCommentedOut,
      projName + ": unexpected stepFileStepsExceptCommentedOut count");
    assert.strictEqual(actualCounts.featureFileStepsExceptCommentedOut, expectedCounts.featureFileStepsExceptCommentedOut,
      projName + ": unexpected featureFileStepsExceptCommentedOut count");
    assert.strictEqual(actualCounts.stepMappings, expectedCounts.stepMappings, projName + ": unexpected stepMappings count");

    // (test counts are only calculated if xRay is true)
    if (!config.instanceSettings.xRay)
      return;

    // note >= because:
    // if the number of tests is greater than expected, it may be because we've just 
    // added a new feature/scenario to our test project, either way, we will to continue on to 
    // the other asserts so we can see the extra TestResult in the console output 
    assert(actualCounts.tests.testCount >= expectedCounts.tests.testCount, projName + ": unexpected testCount");

    if (hasMultiRootWkspNode) {
      assert.strictEqual(actualCounts.tests.nodeCount, expectedCounts.tests.nodeCount + 1, projName + ": unexpected nodeCount");
    }
    else {
      assert.strictEqual(actualCounts.tests.nodeCount, expectedCounts.tests.nodeCount, projName + ": unexpected nodeCount");
    }
  }
  catch (assertErr: unknown) {
    // UHOH - did we comment something out? do a git diff?
    debugger; // eslint-disable-line no-debugger      

    throw new Error(`assertExpectedCounts failed for ${projName} project:\n${assertErr}`);
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
      // special chars in scenario names would break decodeURI, and may include "/", so we'll split on .feature/
      const split = path.split(".feature/");
      const folderPath = split[0] + ".feature/";
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


async function getFilesInFolders(projUri: vscode.Uri, projectRelativeFolders: string[], fileExtension: string): Promise<vscode.Uri[]> {
  const fileUris: vscode.Uri[] = [];
  for (const relFolder of projectRelativeFolders) {
    const pattern = relFolder === ""
      ? new vscode.RelativePattern(projUri, `*.${fileExtension}`)
      : new vscode.RelativePattern(projUri, `${relFolder}/**/*.${fileExtension}`);
    const fileUrisForFolder = await vscode.workspace.findFiles(pattern, null);
    fileUris.push(...fileUrisForFolder);
  }

  return fileUris;
}

async function getAllStepLinesFromFeatureFiles(ps: ProjectSettings) {

  const fileExtension = "feature";
  const fileUris = await getFilesInFolders(ps.uri, ps.projRelativeFeatureFolders, fileExtension);

  if (fileUris.length === 0) {
    debugger; // eslint-disable-line no-debugger
    throw new Error(`no .${fileExtension} files found in ${ps.uri.path}`);
  }

  const stepLines = new Map<FileStep, string>();
  for (const featFileUri of fileUris) {
    if (await isFeatureFile(featFileUri)) {
      const doc = await vscode.workspace.openTextDocument(featFileUri);
      const content = doc.getText();
      addStepsFromFeatureFile(featFileUri, content, stepLines);
    }
  }

  if (stepLines.size === 0) {
    debugger; // eslint-disable-line no-debugger
    throw new Error(`no step lines found in ${ps.uri.path}`);
  }

  return [...stepLines];
}


async function getAllStepFunctionLinesFromStepsFiles(ps: ProjectSettings) {

  const fileExtension = "py";
  const fileUris = await getFilesInFolders(ps.uri, ps.projRelativeStepsFolders, fileExtension);

  if (fileUris.length === 0) {
    debugger; // eslint-disable-line no-debugger
    throw new Error(`no .${fileExtension} files found in ${ps.uri.path}`);
  }

  const funcLines = new Map<FileStep, string>();
  for (const stepFileUri of fileUris) {
    if (await isStepsFile(stepFileUri)) {
      const doc = await vscode.workspace.openTextDocument(stepFileUri);
      const content = doc.getText();
      addStepsFromStepsFile(stepFileUri, content, funcLines);
    }
  }

  if (funcLines.size === 0) {
    debugger; // eslint-disable-line no-debugger
    throw new Error(`no step function lines found in ${ps.uri.path}`);
  }

  return [...funcLines];
}


function formatResult(actualResult: TestResult, addNew = false) {

  let log = addNew ? "new TestResult({\n" : "TestResult({\n";
  const sortedProperties = Object.keys(actualResult).sort();

  for (const property of sortedProperties) {
    if (Object.prototype.hasOwnProperty.call(actualResult, property)) {
      const val = actualResult[property as keyof TestResult];
      const value = typeof val === 'string'
        ? `'${(actualResult[property as keyof TestResult] as string).replace(/['\\]/g, "\\$&")}'`
        : val;
      log += `\t${property}: ${value},\n`;
    }
  }

  log += ("}),\n");

  return log;
}


type FileStep = {
  uri: vscode.Uri,
  lineNo: number,
}
