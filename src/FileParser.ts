import * as vscode from 'vscode';
import { config } from "./Configuration";
import { WorkspaceSettings } from "./settings";
import { getFeatureNameFromFile } from './featureParser';
import {
  countTestItemsInCollection, getAllTestItems, getIdForUri, getWorkspaceFolder,
  getUrisOfWkspFoldersWithFeatures, isFeatureFile, isStepsFile, TestCounts, WkspError
} from './common';
import { parseStepsFile, StepDetail, StepMap as StepMap } from './stepsParser';
import { TestData, TestFile } from './TestFile';
import { performance } from 'perf_hooks';

const stepMap: StepMap = new Map<string, StepDetail>();
export const getStepMap = () => stepMap;
export type ParseCounts = { tests: TestCounts, featureFileCountExcludingEmptyOrCommentedOut: number, stepFiles: number, stepMappings: number }; // for integration test assertions      

export class FileParser {

  private _parseFilesCallCounts = 0;
  private _featuresLoadedForAllWorkspaces = false;
  private _featuresLoadedForWorkspace: { [key: string]: boolean } = {};
  private _cancelTokenSources: { [wkspUriPath: string]: vscode.CancellationTokenSource } = {};

  async readyForRun(timeout: number, caller: string) {
    const interval = 100;

    const check = (resolve: (value: boolean) => void) => {
      if (this._featuresLoadedForAllWorkspaces) {
        console.log(`readyForRun (${caller}) - good to go (all features parsed, steps parsing may continue in background)`);
        resolve(true);
      }
      else {
        timeout -= interval;
        console.log(`readyForRun (${caller}) timeout remaining:` + timeout);
        if (timeout < interval) {
          console.log(`readyForRun (${caller})  - timed out`);
          return resolve(false);
        }
        setTimeout(() => check(resolve), interval);
      }
    }

    return new Promise<boolean>(check);
  }


  private _parseFeatureFiles = async (wkspSettings: WorkspaceSettings, testData: TestData, controller: vscode.TestController,
    cancelToken: vscode.CancellationToken, caller: string): Promise<number> => {

    let processed = 0;

    console.log("removing existing test nodes/items for workspace: " + wkspSettings.name);
    const items = getAllTestItems(wkspSettings.uri, controller.items);
    for (const item of items) {
      controller.items.delete(item.id);
    }

    const pattern = new vscode.RelativePattern(wkspSettings.featuresUri.path, "**/*.feature");
    const featureFiles = await vscode.workspace.findFiles(pattern, null, undefined, cancelToken);

    for (const uri of featureFiles) {
      if (cancelToken.isCancellationRequested)
        break;
      await this.updateTestItemFromFeatureFile(wkspSettings, testData, controller, uri, caller);
      processed++;
    }

    if (cancelToken.isCancellationRequested) {
      // either findFiles or loop will have exited early, log it either way
      console.log(`${caller}: cancelling, _parseFeatureFiles stopped`);
    }

    return processed;
  }


  private _parseStepsFiles = async (wkspSettings: WorkspaceSettings, cancelToken: vscode.CancellationToken, caller: string): Promise<number> => {

    let processed = 0;

    console.log("removing existing steps for workspace: " + wkspSettings.name);
    const wkspStepKeys = new Map([...stepMap].filter(([k,]) => k.startsWith(wkspSettings.featuresUri.path))).keys();
    for (const key of wkspStepKeys) {
      stepMap.delete(key);
    }

    const pattern = new vscode.RelativePattern(wkspSettings.featuresUri.path, "**/steps/**/*.py");
    let stepFiles = await vscode.workspace.findFiles(pattern, null, undefined, cancelToken);
    stepFiles = stepFiles.filter(uri => isStepsFile(uri));

    for (const uri of stepFiles) {
      if (cancelToken.isCancellationRequested)
        break;
      await this.updateStepsFromStepsFile(wkspSettings.featuresUri.path, uri, caller);
      processed++;
    }

    if (cancelToken.isCancellationRequested) {
      // either findFiles or loop will have exited early, log it either way
      console.log(`${caller}: cancelling, _parseStepFiles stopped`);
    }

    return processed;
  }


  async updateStepsFromStepsFile(wkspFullFeaturesPath: string, uri: vscode.Uri, caller: string) {

    if (!isStepsFile(uri))
      throw new Error(`${uri.path} is not a steps file`);

    await parseStepsFile(wkspFullFeaturesPath, uri, stepMap, caller);
  }

  async updateTestItemFromFeatureFile(wkspSettings: WorkspaceSettings, testData: TestData, controller: vscode.TestController, uri: vscode.Uri, caller: string) {

    if (!isFeatureFile(uri))
      throw new Error(`${caller}: ${uri.path} is not a feature file`);

    const item = await this.getOrCreateFeatureTestItemAndParentFolderTestItemsFromFeatureFile(wkspSettings, testData, controller, uri, caller);
    if (item) {
      console.log(`${caller}: parsing ${uri.path}`);
      await item.testFile.updateScenarioTestItemsFromFeatureFileOnDisk(wkspSettings, testData, controller, item.testItem, caller);
    }
    else {
      console.log(`${caller}: no scenarios found in ${uri.path}`);
    }
  }


  async getOrCreateFeatureTestItemAndParentFolderTestItemsFromFeatureFile(wkspSettings: WorkspaceSettings, testData: TestData, controller: vscode.TestController,
    uri: vscode.Uri, caller: string): Promise<{ testItem: vscode.TestItem, testFile: TestFile } | undefined> {

    if (!isFeatureFile(uri))
      throw new Error(`${uri.path} is not a feature file`);

    const existingItem = controller.items.get(uri.path);
    if (existingItem) {
      console.log(`${caller}: found existing test item for ${uri.path}`);
      return { testItem: existingItem, testFile: testData.get(existingItem) as TestFile || new TestFile() };
    }

    const featureName = await getFeatureNameFromFile(uri);
    if (featureName === null)
      return undefined;

    const testItem = controller.createTestItem(getIdForUri(uri), featureName, uri);
    testItem.canResolveChildren = true;
    controller.items.add(testItem);
    const testFile = new TestFile();
    testData.set(testItem, testFile);

    // if it's a multi-root workspace, use workspace grandparent nodes, e.g. "workspace_1", "workspace_2"
    let wkspGrandParent: vscode.TestItem | undefined;
    const wkspPath = getIdForUri(wkspSettings.uri);
    if ((getUrisOfWkspFoldersWithFeatures()).length > 1) {
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
    const sfp = uri.path.substring(wkspSettings.featuresUri.path.length + 1);
    if (sfp.includes("/")) {

      const folders = sfp.split("/").slice(0, -1);
      for (let i = 0; i < folders.length; i++) {
        const path = folders.slice(0, i + 1).join("/");
        const folderName = "\uD83D\uDCC1 " + folders[i]; // folder icon
        const folderId = `${getIdForUri(wkspSettings.featuresUri)}/${path}`;

        if (i === 0)
          parent = wkspGrandParent;

        if (parent)
          current = parent.children.get(folderId);

        if (!current) { // TODO: put getAllTestItems above loop (needs thorough testing of UI interactions of folder/file renames)
          const allTestItems = getAllTestItems(wkspSettings.uri, controller.items);
          current = allTestItems.find(item => item.id === folderId);
        }

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


  async clearTestItemsAndParseFilesForAllWorkspaces(testData: TestData, ctrl: vscode.TestController, intiator: string, cancelToken?: vscode.CancellationToken) {

    this._featuresLoadedForAllWorkspaces = false;

    // this function is called e.g. when a workspace gets added/removed, so 
    // clear everything up-front so that we rebuild the top level nodes
    console.log("clearTestItemsAndParseFilesForAllWorkspaces - removing all test nodes/items for all workspaces");
    const items = getAllTestItems(null, ctrl.items);
    for (const item of items) {
      ctrl.items.delete(item.id);
    }

    for (const wkspUri of getUrisOfWkspFoldersWithFeatures()) {
      this.parseFilesForWorkspace(wkspUri, testData, ctrl, `clearTestItemsAndParseFilesForAllWorkspaces from ${intiator}`, cancelToken);
    }
  }

  // NOTE - this is normally a BACKGROUND task
  // it should only be await-ed on user request, i.e. when called by the refreshHandler
  async parseFilesForWorkspace(wkspUri: vscode.Uri, testData: TestData, ctrl: vscode.TestController, intiator: string,
    callerCancelToken?: vscode.CancellationToken): Promise<ParseCounts | null> {

    const wkspPath = wkspUri.path;
    this._featuresLoadedForAllWorkspaces = false;
    this._featuresLoadedForWorkspace[wkspPath] = false;

    // if caller cancels, pass it on to the internal token
    const cancellationHandler = callerCancelToken?.onCancellationRequested(() => {
      this._cancelTokenSources[wkspPath].cancel();
    });


    try {


      this._parseFilesCallCounts++;
      const wkspName = getWorkspaceFolder(wkspUri).name;
      const callName = `parseFiles #${this._parseFilesCallCounts} ${wkspName} (${intiator})`;
      const wkspSettings = config.workspaceSettings[wkspUri.path];
      let testCounts: TestCounts = { nodeCount: 0, testCount: 0 };

      console.log(`\n===== ${callName}: started =====`);

      // this function is not generally awaited, and therefore re-entrant, so 
      // cancel any existing parseFiles call for this workspace
      if (this._cancelTokenSources[wkspPath]) {
        console.log(`cancelling previous parseFiles call for ${wkspName}`);
        this._cancelTokenSources[wkspPath].cancel();
        while (this._cancelTokenSources[wkspPath]) {
          await new Promise(t => setTimeout(t, 20));
        }
      }


      this._cancelTokenSources[wkspPath] = new vscode.CancellationTokenSource();

      const start = performance.now();
      const featureFileCount = await this._parseFeatureFiles(wkspSettings, testData, ctrl, this._cancelTokenSources[wkspPath].token, callName);
      const featTime = performance.now() - start;

      if (!this._cancelTokenSources[wkspPath].token.isCancellationRequested) {
        console.log(`${callName}: features loaded for workspace ${wkspName}`);
        this._featuresLoadedForWorkspace[wkspPath] = true;
        const anyWkspStillLoading = (getUrisOfWkspFoldersWithFeatures()).filter(uri => !this._featuresLoadedForWorkspace[uri.path])
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
          throw `No feature files found in ${wkspSettings.featuresUri.fsPath}`;
        if (stepFileCount === 0)
          throw `No step files found in ${wkspSettings.featuresUri.fsPath}/steps`;
        testCounts = countTestItemsInCollection(wkspUri, testData, ctrl.items);
        this._logTimesToConsole(callName, testCounts, featTime, stepsTime, featureFileCount, stepFileCount);
      }

      this._cancelTokenSources[wkspPath].dispose();
      delete this._cancelTokenSources[wkspPath];

      const wkspSteps = new Map([...stepMap].filter(([k,]) => k.startsWith(wkspSettings.featuresUri.path)));
      return {
        tests: testCounts, featureFileCountExcludingEmptyOrCommentedOut: featureFileCount,
        stepFiles: stepFileCount, stepMappings: wkspSteps.size
      };
    }
    catch (e: unknown) {
      // unawaited async func, log the error 
      config.logger.logError(new WkspError(e, wkspUri));
      return null;
    }
    finally {
      cancellationHandler?.dispose();
    }
  }


  private _logTimesToConsole = (callName: string, counts: TestCounts, featTime: number, stepsTime: number, featureFileCount: number, stepFileCount: number) => {
    // show diag times for extension developers
    console.log(
      `---` +
      `\n${callName} completed.` +
      `\nProcessing ${featureFileCount} feature files, ${stepFileCount} step files, ` +
      `producing ${counts.nodeCount} tree nodes, ${counts.testCount} tests, and ${stepMap.size} stepMatches took ${stepsTime + featTime}ms. ` +
      `\nBreakdown: features ${featTime}ms, steps ${stepsTime}ms.` +
      `\nIgnore times if: (a) during vscode startup/integration testing (contention), or (b) there are active breakpoints, or (c) when another test extension is also refreshing.` +
      `\nFor a more representative time, disable active breakpoints and other test extensions, then click the test refresh button a few times.` +
      `\n==================`
    );
  }


}
