import * as vscode from 'vscode';
import config from "./Configuration";
import { WorkspaceSettings } from "./WorkspaceSettings";
import { getFeatureNameFromFile } from './featureParser';
import { countTestItemsInCollection, getAllTestItems, getTestItem, getWorkspaceFolder, getWorkspaceFolderUris, isFeatureFile, isStepsFile, TestCounts } from './helpers';
import { parseStepsFile, StepDetail, Steps } from './stepsParser';
import { TestFile } from './TestFile';
import { performance } from 'perf_hooks';
import { testData } from './extension';

const steps: Steps = new Map<string, StepDetail>();
export const getSteps = () => steps;
export type ParseCounts = { testCounts: TestCounts, featureFileCount: number, stepFileCount: number, stepsCount: number }; // for integration test assertions      

export class FileParser {

  private _calls = 0;
  private _featuresLoadedForAllWorkspaces = false;
  private _featuresLoadedForWorkspace: { [key: string]: boolean } = {};
  private _cancelTokenSources: { [wkspUriPath: string]: vscode.CancellationTokenSource } = {};

  async readyForRun(timeout: number) {
    const interval = 100;

    const check = (resolve: (value: boolean) => void) => {
      if (this._featuresLoadedForAllWorkspaces) {
        resolve(true);
      }
      else {
        timeout -= interval;
        console.log("timeout:" + timeout);
        if (timeout < interval)
          resolve(false);
        setTimeout(() => check(resolve), interval);
      }
    }

    return new Promise<boolean>(check);
  }

  private _parseFeatureFiles = async (wkspSettings: WorkspaceSettings, controller: vscode.TestController, cancelToken: vscode.CancellationToken,
    caller: string): Promise<number> => {

    let processed = 0;

    // delete existing folder items and test items for this workspace
    const items = getAllTestItems(wkspSettings.uri, controller.items);
    for (const item of items) {
      controller.items.delete(item.id);
    }

    const pattern = new vscode.RelativePattern(wkspSettings.fullFeaturesPath, "**/*.feature");
    const featureFiles = await vscode.workspace.findFiles(pattern, undefined, undefined, cancelToken);

    for (const uri of featureFiles) {
      if (cancelToken.isCancellationRequested)
        break;
      await this.updateTestItemFromFeatureFile(wkspSettings, controller, uri, caller);
      processed++;
    }

    if (cancelToken.isCancellationRequested) {
      // either findFiles or loop will have exited early, log it either way
      console.log(`${caller} cancelled - _parseFeatureFiles stopped`);
    }

    return processed;
  }

  private _parseStepsFiles = async (wkspSettings: WorkspaceSettings, cancelToken: vscode.CancellationToken, caller: string): Promise<number> => {

    let processed = 0;
    const wkspStepKeys = new Map([...steps].filter(([k,]) => k.startsWith(wkspSettings.fullFeaturesPath))).keys();
    for (const key of wkspStepKeys) {
      steps.delete(key);
    }

    const pattern = new vscode.RelativePattern(wkspSettings.fullFeaturesPath, "**/steps/**/*.py");
    let stepFiles = await vscode.workspace.findFiles(pattern, undefined, undefined, cancelToken);
    stepFiles = stepFiles.filter(uri => isStepsFile(uri));

    for (const uri of stepFiles) {
      if (cancelToken.isCancellationRequested)
        break;
      await this.updateStepsFromStepsFile(wkspSettings.fullFeaturesPath, uri, caller);
      processed++;
    }

    if (cancelToken.isCancellationRequested) {
      // either findFiles or loop will have exited early, log it either way
      console.log(`${caller} cancelled - _parseStepFiles stopped`);
    }

    return processed;
  }


  private _logTimesToConsole = (counts: TestCounts, featTime: number, stepsTime: number, featureFileCount: number, stepFileCount: number) => {
    // show diag times for extension developers
    console.log(
      `---` +
      `\nparseFiles() completed.` +
      `\nProcessing ${featureFileCount} feature files, ${stepFileCount} step files, ` +
      `producing ${counts.nodeCount} tree nodes, ${counts.testCount} tests, and ${steps.size} steps took ${stepsTime + featTime}ms. ` +
      `\nBreakdown: features ${featTime}ms, steps ${stepsTime}ms.` +
      `\nIgnore times if: (a) during vscode startup (contention), or (b) there are active breakpoints, or (c) when another test extension is also refreshing.` +
      `\nFor a more representative time, disable active breakpoints and other test extensions, then click the test refresh button a few times.` +
      `\n==================`
    );
  }


  async updateStepsFromStepsFile(wkspFullFeaturesPath: string, uri: vscode.Uri, caller: string) {

    if (!isStepsFile(uri))
      throw new Error(`${uri.path} is not a steps file`);

    await parseStepsFile(wkspFullFeaturesPath, uri, steps, caller);
  }

  async updateTestItemFromFeatureFile(wkspSettings: WorkspaceSettings, controller: vscode.TestController, uri: vscode.Uri, caller: string) {

    if (!isFeatureFile(uri))
      throw new Error(`${caller}: ${uri.path} is not a feature file`);

    const item = await this.getOrCreateFeatureTestItemAndParentFolderTestItemsFromFeatureFile(wkspSettings, controller, uri, caller);
    if (item) {
      console.log(`${caller}: parsing ${uri.path}`);
      await item.testFile.updateScenarioTestItemsFromFeatureFileOnDisk(wkspSettings, controller, item.testItem, caller);
    }
    else {
      console.log(`${caller}: no scenarios found in ${uri.path}`);
    }
  }


  async getOrCreateFeatureTestItemAndParentFolderTestItemsFromFeatureFile(wkspSettings: WorkspaceSettings, controller: vscode.TestController,
    uri: vscode.Uri, caller: string): Promise<{ testItem: vscode.TestItem, testFile: TestFile } | undefined> {

    if (!isFeatureFile(uri))
      throw new Error(`${uri.path} is not a feature file`);

    const existingItem = controller.items.get(uri.toString());
    if (existingItem) {
      console.log(`${caller}: found existing test item for ${uri.path}`);
      return { testItem: existingItem, testFile: testData.get(existingItem) as TestFile || new TestFile() };
    }

    const featureName = await getFeatureNameFromFile(uri);
    if (featureName === null)
      return undefined;

    const testItem = controller.createTestItem(uri.toString(), featureName, uri);
    testItem.canResolveChildren = true;
    controller.items.add(testItem);
    const testFile = new TestFile();
    testData.set(testItem, testFile);

    // if it's a multi-root workspace, use workspace grandparent nodes, e.g. "workspace_1", "workspace_2"
    let wkspGrandParent: vscode.TestItem | undefined;
    const wkspPath = wkspSettings.uri.path;
    if (getWorkspaceFolderUris().length > 1) {
      wkspGrandParent = controller.items.get(wkspPath);
      if (!wkspGrandParent) {
        const wkspName = wkspSettings.name;
        wkspGrandParent = controller.createTestItem(wkspPath, wkspName);
        wkspGrandParent.canResolveChildren = true;
        controller.items.add(wkspGrandParent);
      }
    }

    // build folder hierarchy above test item
    // build top-down in case parent folder gets renamed/deleted etc.
    // note that the id is based on the file path so a new node is created if the folder is renamed
    // (old nodes are removed when required by parseFeatureFiles())
    let firstFolder: vscode.TestItem | undefined = undefined;
    let parent: vscode.TestItem | undefined = undefined;
    let current: vscode.TestItem | undefined;
    const sfp = uri.path.substring(wkspSettings.fullFeaturesPath.length + 1);
    if (sfp.includes("/")) {

      const folders = sfp.split("/").slice(0, -1);
      for (let i = 0; i < folders.length; i++) {
        const path = folders.slice(0, i + 1).join("/");
        const folderName = "\uD83D\uDCC1 " + folders[i];
        const folderId = `${wkspSettings.fullFeaturesPath}/${path}`;

        if (i === 0)
          parent = wkspGrandParent;

        if (parent)
          current = parent.children.get(folderId);

        if (!current)
          current = getTestItem(folderId, controller.items);

        if (!current) {
          current = controller.createTestItem(folderId, folderName);
          current.canResolveChildren = true;
          controller.items.add(current);
        }

        if (i === folders.length - 1)
          current.children.add(testItem);

        if (parent)
          parent.children.add(current);

        parent = current;

        if (i === 0)
          firstFolder = current;
      }
    }

    if (wkspGrandParent) {
      if (firstFolder) {
        wkspGrandParent.children.add(firstFolder);
      }
      else {
        wkspGrandParent.children.add(testItem);
      }
    }

    console.log(`${caller}: created test item for ${uri.path}`);
    return { testItem: testItem, testFile: testFile };
  }


  async clearTestItemsAndParseFilesForAllWorkspaces(ctrl: vscode.TestController, intiator: string, cancelToken?: vscode.CancellationToken) {

    // clear everything so we can rebuild the top level nodes
    const items = getAllTestItems(null, ctrl.items);
    for (const item of items) {
      ctrl.items.delete(item.id);
    }

    for (const wkspUri of getWorkspaceFolderUris()) {
      this.parseFilesForWorkspace(wkspUri, ctrl, `clearTestItemsAndParseFilesForAllWorkspaces from ${intiator}`, cancelToken);
    }
  }

  // NOTE - this is background task
  // it should only be awaited on user request, i.e. when called by the refreshHandler
  async parseFilesForWorkspace(wkspUri: vscode.Uri, ctrl: vscode.TestController, intiator: string,
    callerCancelToken?: vscode.CancellationToken): Promise<ParseCounts> {

    const wkspPath = wkspUri.path;
    this._featuresLoadedForAllWorkspaces = false;
    this._featuresLoadedForWorkspace[wkspPath] = false;
    this._calls++;
    const wkspName = getWorkspaceFolder(wkspUri).name;
    const callName = `parseFiles ${this._calls} ${wkspName}`;
    const wkspSettings = config.getWorkspaceSettings(wkspUri);
    let testCounts: TestCounts = { nodeCount: 0, testCount: 0 };

    // if caller cancels, pass it on to the internal token
    const cancellationHandler = callerCancelToken?.onCancellationRequested(() => {
      this._cancelTokenSources[wkspPath].cancel();
    });


    try {

      console.log(`\n===== ${callName}: started, initiated by:${intiator} =====`);

      // this function is not generally awaited, and therefore re-entrant, so 
      // cancel any existing parseFiles call for this workspace
      if (this._cancelTokenSources[wkspPath]) {
        this._cancelTokenSources[wkspPath].cancel();
        while (this._cancelTokenSources[wkspPath]) {
          await new Promise(t => setTimeout(t, 20));
        }
      }


      this._cancelTokenSources[wkspPath] = new vscode.CancellationTokenSource();

      const start = performance.now();
      const featureFileCount = await this._parseFeatureFiles(wkspSettings, ctrl, this._cancelTokenSources[wkspPath].token, callName);
      const featTime = performance.now() - start;
      if (!this._cancelTokenSources[wkspPath].token.isCancellationRequested) {
        console.log(`${callName}: features loaded for workspace ${wkspName}`);
        this._featuresLoadedForWorkspace[wkspPath] = true;
        const anyWkspStillLoading = getWorkspaceFolderUris().filter(uri => !this._featuresLoadedForWorkspace[uri.path])
        if (anyWkspStillLoading.length === 0) {
          this._featuresLoadedForAllWorkspaces = true;
          console.log(`${callName}: features loaded for all workspaces`);
        }
      }

      const stepsStart = performance.now();
      const stepFileCount = await this._parseStepsFiles(wkspSettings, this._cancelTokenSources[wkspPath].token, callName);
      const stepsTime = performance.now() - stepsStart;
      if (!this._cancelTokenSources[wkspPath].token.isCancellationRequested) {
        console.log(`${callName}: steps loaded`);
      }

      if (this._cancelTokenSources[wkspPath].token.isCancellationRequested) {
        console.log(`${callName}: cancellation complete`);
      }
      else {
        console.log(`${callName}: complete`);
        if (featureFileCount === 0)
          config.logger.logError(`No feature files found in ${wkspSettings.fullFeaturesFsPath}`, wkspUri);
        if (stepFileCount === 0)
          config.logger.logError(`No step files found in ${wkspSettings.fullFeaturesFsPath}/steps`, wkspUri);
        testCounts = countTestItemsInCollection(wkspUri, testData, ctrl.items);
        this._logTimesToConsole(testCounts, featTime, stepsTime, featureFileCount, stepFileCount);
      }

      this._cancelTokenSources[wkspPath].dispose();
      delete this._cancelTokenSources[wkspPath];

      const wkspSteps = new Map([...steps].filter(([k,]) => k.startsWith(wkspSettings.fullFeaturesPath)));
      return { testCounts: testCounts, featureFileCount: featureFileCount, stepFileCount: stepFileCount, stepsCount: wkspSteps.size };
    }
    catch (e: unknown) {
      config.logger.logError(e, wkspUri);
      throw e;
    }
    finally {
      cancellationHandler?.dispose();
    }
  }
}