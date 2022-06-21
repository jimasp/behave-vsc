import * as vscode from 'vscode';
import { config } from "./configuration";
import { WorkspaceSettings } from "./settings";
import { getFeatureFileSteps, getFeatureNameFromFile } from './featureParser';
import {
  countTestItemsInCollection, getAllTestItems, uriMatchString, getWorkspaceFolder,
  getUrisOfWkspFoldersWithFeatures, isFeatureFile, isStepsFile, TestCounts, findFiles, urisMatch
} from './common';
import { parseStepsFile, getStepFileSteps } from './stepsParser';
import { TestData, TestFile } from './testFile';
import { performance } from 'perf_hooks';
import { diagLog } from './logger';
import { deleteStepMappings, buildStepMappings, getStepMappings, getStepMappings } from './stepMappings';


// for integration test assertions      
export type WkspParseCounts = {
  tests: TestCounts,
  featureFilesExcludingEmptyOrCommentedOut: number,
  stepFiles: number,
  stepFileSteps: number
  featureFileSteps: number,
  stepMappings: number
};

export class FileParser {

  private _parseFilesCallCounts = 0;
  private _finishedFeaturesParseForAllWorkspaces = false;
  private _finishedStepsParseForAllWorkspaces = false;
  private _finishedFeaturesParseForWorkspace: { [key: string]: boolean } = {};
  private _finishedStepsParseForWorkspace: { [key: string]: boolean } = {};
  private _cancelTokenSources: { [wkspUriPath: string]: vscode.CancellationTokenSource } = {};
  private _errored = false;

  async featureParseComplete(timeout: number, caller: string) {
    const interval = 100;

    const check = (resolve: (value: boolean) => void) => {
      if (this._finishedFeaturesParseForAllWorkspaces) {
        diagLog(`featureParseComplete (${caller}) - good to go (all features parsed, steps parsing may continue in background)`);
        resolve(true);
      }
      else {
        timeout -= interval;
        diagLog(`featureParseComplete (${caller}) timeout remaining:` + timeout);
        if (timeout < interval) {
          diagLog(`featureParseComplete (${caller})  - timed out`);
          return resolve(false);
        }
        setTimeout(() => check(resolve), interval);
      }
    }

    return new Promise<boolean>(check);
  }


  async stepsParseComplete(timeout: number, caller: string) {
    const interval = 100;

    const check = (resolve: (value: boolean) => void) => {
      if (this._finishedStepsParseForAllWorkspaces) {
        diagLog(`stepsParseComplete (${caller}) - good to go (all steps parsed)`);
        resolve(true);
      }
      else {
        timeout -= interval;
        diagLog(`stepsParseComplete (${caller}) timeout remaining:` + timeout);
        if (timeout < interval) {
          diagLog(`stepsParseComplete (${caller})  - timed out`);
          return resolve(false);
        }
        setTimeout(() => check(resolve), interval);
      }
    }

    return new Promise<boolean>(check);
  }


  _parseFeatureFiles = async (wkspSettings: WorkspaceSettings, testData: TestData, controller: vscode.TestController,
    cancelToken: vscode.CancellationToken, caller: string): Promise<number> => {

    diagLog("removing existing test nodes/items for workspace: " + wkspSettings.name);
    const items = getAllTestItems(wkspSettings.uri, controller.items);
    for (const item of items) {
      testData.delete(item);
      controller.items.delete(item.id);
    }

    deleteStepMappings(wkspSettings.featuresUri);

    // replaced with custom findFiles function for now (see comment in findFiles function)
    //const pattern = new vscode.RelativePattern(wkspSettings.uri, `${wkspSettings.workspaceRelativeFeaturesPath}/**/*.feature`);
    //const featureFiles = await vscode.workspace.findFiles(pattern, null, undefined, cancelToken);
    const featureFiles = await findFiles(wkspSettings.featuresUri, undefined, ".feature", cancelToken);

    if (featureFiles.length < 1 && !cancelToken.isCancellationRequested)
      throw `No feature files found in ${wkspSettings.featuresUri.fsPath}`;

    let processed = 0;
    for (const uri of featureFiles) {
      if (cancelToken.isCancellationRequested)
        break;
      await this.updateTestItemFromFeatureFile(wkspSettings, testData, controller, uri, caller);
      processed++;
    }

    if (cancelToken.isCancellationRequested) {
      // either findFiles or loop will have exited early, log it either way
      diagLog(`${caller}: cancelling, _parseFeatureFiles stopped`);
    }

    return processed;
  }


  private _parseStepsFiles = async (wkspSettings: WorkspaceSettings, cancelToken: vscode.CancellationToken, caller: string): Promise<number> => {

    diagLog("removing existing steps for workspace: " + wkspSettings.name);
    const stepFileSteps = getStepFileSteps();
    const matchString = uriMatchString(wkspSettings.featuresUri);
    const wkspStepKeys = new Map([...stepFileSteps].filter(([k,]) => k.startsWith(matchString))).keys();
    for (const key of wkspStepKeys) {
      stepFileSteps.delete(key);
    }

    // replaced with custom findFiles function for now (see comment in findFiles function)    
    //const pattern = new vscode.RelativePattern(wkspSettings.uri, `${wkspSettings.workspaceRelativeFeaturesPath}/**/steps/**/*.py`);
    //let stepFiles = await vscode.workspace.findFiles(pattern, null, undefined, cancelToken);
    let stepFiles = await findFiles(wkspSettings.featuresUri, "steps", ".py", cancelToken);
    stepFiles = stepFiles.filter(uri => isStepsFile(uri));

    if (stepFiles.length < 1 && !cancelToken.isCancellationRequested)
      throw `No step files found in ${vscode.Uri.joinPath(wkspSettings.featuresUri, "steps").fsPath}`;

    let processed = 0;
    for (const uri of stepFiles) {
      if (cancelToken.isCancellationRequested)
        break;
      await this.updateStepsFromStepsFile(wkspSettings.featuresUri, uri, caller);
      processed++;
    }

    if (cancelToken.isCancellationRequested) {
      // either findFiles or loop will have exited early, log it either way
      diagLog(`${caller}: cancelling, _parseStepFiles stopped`);
    }

    return processed;
  }


  async updateStepsFromStepsFile(featuresUri: vscode.Uri, fileUri: vscode.Uri, caller: string) {

    if (!isStepsFile(fileUri))
      throw new Error(`${fileUri.fsPath} is not a steps file`);

    await parseStepsFile(featuresUri, fileUri, caller);
  }

  async updateTestItemFromFeatureFile(wkspSettings: WorkspaceSettings, testData: TestData, controller: vscode.TestController, uri: vscode.Uri, caller: string) {

    if (!isFeatureFile(uri))
      throw new Error(`${caller}: ${uri.path} is not a feature file`);

    const item = await this.getOrCreateFeatureTestItemAndParentFolderTestItemsFromFeatureFile(wkspSettings, testData, controller, uri, caller);
    if (item) {
      diagLog(`${caller}: parsing ${uri.path}`);
      await item.testFile.createScenarioTestItemsFromFeatureFile(wkspSettings, testData, controller, item.testItem, caller);
    }
    else {
      diagLog(`${caller}: no scenarios found in ${uri.path}`);
    }
  }


  async getOrCreateFeatureTestItemAndParentFolderTestItemsFromFeatureFile(wkspSettings: WorkspaceSettings, testData: TestData, controller: vscode.TestController,
    uri: vscode.Uri, caller: string): Promise<{ testItem: vscode.TestItem, testFile: TestFile } | undefined> {

    if (!isFeatureFile(uri))
      throw new Error(`${uri.path} is not a feature file`);

    const existingItem = controller.items.get(uri.path);
    if (existingItem) {
      diagLog(`${caller}: found existing test item for ${uri.path}`);
      return { testItem: existingItem, testFile: testData.get(existingItem) as TestFile || new TestFile() };
    }

    const featureName = await getFeatureNameFromFile(uri);
    if (featureName === null)
      return undefined;

    const testItem = controller.createTestItem(uriMatchString(uri), featureName, uri);
    testItem.canResolveChildren = true;
    controller.items.add(testItem);
    const testFile = new TestFile();
    testData.set(testItem, testFile);

    // if it's a multi-root workspace, use workspace grandparent nodes, e.g. "workspace_1", "workspace_2"
    let wkspGrandParent: vscode.TestItem | undefined;
    const wkspTestItemId = uriMatchString(wkspSettings.uri);
    if ((getUrisOfWkspFoldersWithFeatures()).length > 1) {
      wkspGrandParent = controller.items.get(wkspTestItemId);
      if (!wkspGrandParent) {
        const wkspName = wkspSettings.name;
        wkspGrandParent = controller.createTestItem(wkspTestItemId, wkspName);
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
        const folderTestItemId = `${uriMatchString(wkspSettings.featuresUri)}/${path}`;

        if (i === 0)
          parent = wkspGrandParent;

        if (parent)
          current = parent.children.get(folderTestItemId);

        if (!current) { // TODO: put getAllTestItems above loop (needs thorough testing of UI interactions of folder/file renames)
          const allTestItems = getAllTestItems(wkspSettings.uri, controller.items);
          current = allTestItems.find(item => item.id === folderTestItemId);
        }

        if (!current) {
          current = controller.createTestItem(folderTestItemId, folderName);
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

    diagLog(`${caller}: created test item for ${uri.path}`);
    return { testItem: testItem, testFile: testFile };
  }


  async clearTestItemsAndParseFilesForAllWorkspaces(testData: TestData, ctrl: vscode.TestController, intiator: string, cancelToken?: vscode.CancellationToken) {

    this._finishedFeaturesParseForAllWorkspaces = false;
    this._errored = false;

    // this function is called e.g. when a workspace gets added/removed/renamed, so 
    // clear everything up-front so that we rebuild the top level nodes
    diagLog("clearTestItemsAndParseFilesForAllWorkspaces - removing all test nodes/items for all workspaces");
    const items = getAllTestItems(null, ctrl.items);
    for (const item of items) {
      ctrl.items.delete(item.id);
      testData.delete(item);
    }

    for (const wkspUri of getUrisOfWkspFoldersWithFeatures()) {
      this.parseFilesForWorkspace(wkspUri, testData, ctrl, `clearTestItemsAndParseFilesForAllWorkspaces from ${intiator}`, cancelToken);
    }
  }


  // NOTE:
  // - This is normally a BACKGROUND task. It should only be await-ed on user request, i.e. when called by the refreshHandler.
  // - It is a self-cancelling re-entrant function, i.e. any current parse for the same workspace will be cancelled. 
  async parseFilesForWorkspace(wkspUri: vscode.Uri, testData: TestData, ctrl: vscode.TestController, intiator: string,
    callerCancelToken?: vscode.CancellationToken): Promise<WkspParseCounts | undefined> {

    const wkspPath = wkspUri.path;
    this._finishedFeaturesParseForAllWorkspaces = false;
    this._finishedStepsParseForAllWorkspaces = false;
    this._finishedFeaturesParseForWorkspace[wkspPath] = false;
    this._finishedStepsParseForWorkspace[wkspPath] = false;

    // if caller cancels, pass it on to the internal token
    const cancellationHandler = callerCancelToken?.onCancellationRequested(() => {
      if (this._cancelTokenSources[wkspPath])
        this._cancelTokenSources[wkspPath].cancel();
    });


    try {

      this._parseFilesCallCounts++;
      const wkspName = getWorkspaceFolder(wkspUri).name;
      const callName = `parseFiles #${this._parseFilesCallCounts} ${wkspName} (${intiator})`;
      let testCounts: TestCounts = { nodeCount: 0, testCount: 0 };

      diagLog(`\n===== ${callName}: started =====`);

      // this function is not generally awaited, and therefore re-entrant, so 
      // cancel any existing parseFiles call for this workspace
      if (this._cancelTokenSources[wkspPath]) {
        diagLog(`cancelling previous parseFiles call for ${wkspName}`);
        this._cancelTokenSources[wkspPath].cancel();
        while (this._cancelTokenSources[wkspPath]) {
          await new Promise(t => setTimeout(t, 20));
        }
      }
      this._cancelTokenSources[wkspPath] = new vscode.CancellationTokenSource();
      const wkspSettings: WorkspaceSettings = config.workspaceSettings[wkspUri.path];


      const start = performance.now();
      const featureFileCount = await this._parseFeatureFiles(wkspSettings, testData, ctrl, this._cancelTokenSources[wkspPath].token, callName);
      const featTime = performance.now() - start;
      if (this._cancelTokenSources[wkspPath].token.isCancellationRequested) {
        diagLog(`${callName}: cancellation complete`);
        return;
      }
      diagLog(`${callName}: features loaded for workspace ${wkspName}`);
      this._finishedFeaturesParseForWorkspace[wkspPath] = true;
      const wkspsStillParsingFeatures = (getUrisOfWkspFoldersWithFeatures()).filter(uri => !this._finishedFeaturesParseForWorkspace[uri.path])
      if (wkspsStillParsingFeatures.length === 0) {
        this._finishedFeaturesParseForAllWorkspaces = true;
        diagLog(`${callName}: features loaded for all workspaces`);
      }
      else {
        diagLog(`${callName}: waiting on feature parse for ${wkspsStillParsingFeatures.map(w => w.path)}`)
      }


      const stepsStart = performance.now();
      const stepFileCount = await this._parseStepsFiles(wkspSettings, this._cancelTokenSources[wkspPath].token, callName);
      const stepsTime = performance.now() - stepsStart;
      if (this._cancelTokenSources[wkspPath].token.isCancellationRequested) {
        diagLog(`${callName}: cancellation complete`);
        return;
      }
      this._finishedStepsParseForWorkspace[wkspPath] = true;
      diagLog(`${callName}: steps loaded`);
      const wkspsStillParsingSteps = (getUrisOfWkspFoldersWithFeatures()).filter(uri => !this._finishedStepsParseForWorkspace[uri.path])
      if (wkspsStillParsingSteps.length === 0) {
        this._finishedStepsParseForAllWorkspaces = true;
        diagLog(`${callName}: steps loaded for all workspaces`);
      }
      else {
        diagLog(`${callName}: waiting on steps parse for ${wkspsStillParsingSteps.map(w => w.path)}`)
      }


      const updateMappingsStart = performance.now();
      const mappingsCount = await buildStepMappings(wkspSettings.featuresUri);
      const buildMappingsTime = performance.now() - updateMappingsStart;

      if (this._cancelTokenSources[wkspPath].token.isCancellationRequested) {
        diagLog(`${callName}: cancellation complete`);
        return;
      }

      diagLog(`${callName}: complete`);
      testCounts = countTestItemsInCollection(wkspUri, testData, ctrl.items);
      this._logTimesToConsole(callName, testCounts, featTime, stepsTime, mappingsCount, buildMappingsTime, featureFileCount, stepFileCount);

      if (!config.integrationTestRun)
        return;

      return {
        tests: testCounts,
        featureFilesExcludingEmptyOrCommentedOut: featureFileCount,
        stepFiles: stepFileCount,
        stepFileSteps: getStepFileSteps(wkspSettings.featuresUri).length,
        featureFileSteps: getFeatureFileSteps(wkspSettings.featuresUri).length,
        stepMappings: getStepMappings(wkspSettings.featuresUri).length
      };
    }
    catch (e: unknown) {
      // unawaited async func, must log the error 

      // multiple functions can be running in parallel, but if any of them fail we'll consider it fatal and bail out all of them
      Object.keys(this._cancelTokenSources).forEach(k => {
        this._cancelTokenSources[k].cancel();
        this._cancelTokenSources[k].dispose();
        delete this._cancelTokenSources[k];
      });
      // only log the first error (i.e. avoid logging the same error multiple times)
      if (!this._errored) {
        this._errored = true;
        config.logger.showError(e, wkspUri);
      }
      return;
    }
    finally {
      this._cancelTokenSources[wkspPath]?.dispose();
      delete this._cancelTokenSources[wkspPath];
      cancellationHandler?.dispose();
    }
  }


  private _logTimesToConsole = (callName: string, testCounts: TestCounts, featParseTime: number, stepsParseTime: number,
    mappingsCount: number, buildMappingsTime: number, featureFileCount: number, stepFileCount: number) => {
    diagLog(
      `---` +
      `\nperf info: ${callName} completed.` +
      `\nProcessing ${featureFileCount} feature files, ${stepFileCount} step files, ` +
      `producing ${testCounts.nodeCount} tree nodes, ${testCounts.testCount} tests, and ${mappingsCount} stepMappings took ${stepsParseTime + featParseTime} ms. ` +
      `\nBreakdown: feature file parsing ${featParseTime} ms, step file parsing ${stepsParseTime} ms, building step mappings: ${buildMappingsTime} ms` +
      `\nIgnore times if any of these are true: (a) time taken was during vscode startup contention, (b) busy cpu due to background processes, " + 
      "(c) another test extension is also refreshing, (d) you are debugging the extension itself or running an extension integration test.` +
      `\nFor a more representative time, disable other test extensions then click the test refresh button a few times.` +
      `\n(Note that for multi-root, multiple workspaces refresh in parallel, so you should consider the longest parseFile time as the total time.)` +
      `\n==================`
    );
  }


}
