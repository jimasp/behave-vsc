import * as vscode from 'vscode';
import * as fs from 'fs';
import { performance } from 'perf_hooks';
import { services } from "../diService";
import { ProjectSettings } from "../config/settings";
import { deleteFeatureFilesStepsForProject, getFeatureFilesSteps, getFeatureNameFromContent } from './featureParser';
import {
  countTestItemsInCollection, getTestItems, uriId, getWorkspaceFolder,
  getUrisOfWkspFoldersWithFeatures, isFeatureFile, isStepsFile, TestCounts, findFiles, getContentFromFilesystem, getFeaturesFolderUriForFeatureFileUri, deleteTestTreeNodes, getShortestCommonPathsExcludingLastPart
} from '../common/helpers';
import { parseStepsFileContent, getStepFilesSteps, deleteStepFileStepsForProject } from './stepsParser';
import { TestData, TestFile } from './testFile';
import { diagLog } from '../common/logger';
import { clearStepMappings, rebuildStepMappings, getStepMappings, deleteStepsAndStepMappingsForStepsFile, deleteStepsAndStepMappingsForFeatureFile } from './stepMappings';


// for integration test assertions      
export type ProjParseCounts = {
  tests: TestCounts,
  featureFilesExceptEmptyOrCommentedOut: number,
  stepFilesExceptEmptyOrCommentedOut: number,
  stepFileStepsExceptCommentedOut: number
  featureFileStepsExceptCommentedOut: number,
  stepMappings: number
};

export class FileParser {

  private _parseFilesCallCounts = 0;
  private _finishedFeaturesParseForAllProjects = false;
  private _finishedStepsParseForAllProjects = false;
  private _finishedFeaturesParseForProject: { [key: string]: boolean } = {};
  private _finishedStepsParseForProject: { [key: string]: boolean } = {};
  private _cancelTokenSources: { [projUriPath: string]: vscode.CancellationTokenSource } = {};
  private _errored = false;
  private _reparsingFile = false;

  async featureParseComplete(timeout: number, caller: string) {
    const interval = 100;
    if (timeout < 150)
      timeout = 150;

    // parsing is a background task, ensure things had a chance to start to avoid false positives
    await new Promise(t => setTimeout(t, 50));
    timeout = timeout - 50;

    const check = (resolve: (value: boolean) => void) => {
      if (this._finishedFeaturesParseForAllProjects) {
        diagLog(`featureParseComplete (${caller}) - is good to go (all features parsed, steps parsing may continue in background)`);
        resolve(true);
      }
      else {
        timeout -= interval;
        diagLog(`featureParseComplete  (${caller}) waiting - ${timeout} left until timeout`);
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
    if (timeout < 150)
      timeout = 150;

    // parsing is a background task, ensure things had a chance to start to avoid false positives
    await new Promise(t => setTimeout(t, 50));
    timeout = timeout - 50;

    const check = (resolve: (value: boolean) => void) => {
      if (this._finishedStepsParseForAllProjects && !this._reparsingFile) {
        diagLog(`stepsParseComplete (${caller}) - is good to go (all steps parsed)`);
        resolve(true);
      }
      else {
        timeout -= interval;
        diagLog(`stepsParseComplete (${caller}) waiting - ${timeout} left until timeout`);
        if (timeout < interval) {
          diagLog(`stepsParseComplete (${caller}) - timed out`);
          return resolve(false);
        }
        setTimeout(() => check(resolve), interval);
      }
    }

    return new Promise<boolean>(check);
  }


  private _parseFeatureFiles = async (projSettings: ProjectSettings, testData: TestData, ctrl: vscode.TestController,
    cancelToken: vscode.CancellationToken, caller: string, firstRun: boolean): Promise<number> => {

    const projUri = projSettings.uri;

    diagLog("removing existing test nodes/items for project: " + projSettings.name);
    deleteTestTreeNodes(projSettings.id, testData, ctrl);

    deleteFeatureFilesStepsForProject(projUri);
    clearStepMappings(projUri);

    let processed = 0;
    for (const relFeaturesFolder of projSettings.relativeFeatureFolders) {
      const featuresFolderUri = vscode.Uri.joinPath(projUri, relFeaturesFolder);
      if (!fs.existsSync(featuresFolderUri.fsPath)) {
        // e.g. user has deleted/renamed folder
        continue;
      }
      const featureFiles = (await findFiles(featuresFolderUri, new RegExp(".*\\.feature$"), cancelToken));

      if (featureFiles.length < 1 && !cancelToken.isCancellationRequested)
        services.extConfig.logger.showWarn(`No feature files found in ${relFeaturesFolder}`, projUri);

      for (const uri of featureFiles) {
        if (cancelToken.isCancellationRequested)
          break;
        const content = await getContentFromFilesystem(uri);
        await this._updateTestItemFromFeatureFileContent(projSettings, content, testData, ctrl, uri, caller, firstRun);
        processed++;
      }

      if (cancelToken.isCancellationRequested) {
        // either findFiles or loop will have exited early, log it either way
        diagLog(`${caller}: cancelling, _parseFeatureFiles stopped`);
      }
    }

    return processed;
  }


  private _parseStepsFiles = async (projSettings: ProjectSettings, cancelToken: vscode.CancellationToken,
    caller: string): Promise<number> => {

    const projUri = projSettings.uri;

    diagLog("removing existing steps for project: " + projSettings.name);
    deleteStepFileStepsForProject(projUri);

    const processed: string[] = [];
    for (const relStepsSearchPath of projSettings.relativeStepsFolders) {
      let stepFiles: vscode.Uri[] = [];
      const stepsSearchUri = vscode.Uri.joinPath(projUri, relStepsSearchPath);
      if (!fs.existsSync(stepsSearchUri.fsPath))
        continue;

      stepFiles = await findFiles(stepsSearchUri, new RegExp(".*\\.py$"), cancelToken);

      if (stepFiles.length < 1 && !cancelToken.isCancellationRequested)
        continue;

      for (const uri of stepFiles) {
        if (cancelToken.isCancellationRequested)
          break;
        // the importedSteps setting could result in multiple matches, so skip if already processed
        if (processed.includes(uriId(uri)))
          continue;
        if (!isStepsFile(uri))
          continue;
        const content = await getContentFromFilesystem(uri);
        await parseStepsFileContent(projUri, content, uri, caller);
        processed.push((uriId(uri)));
      }

      if (cancelToken.isCancellationRequested) {
        // either findFiles or loop will have exited early, log it either way
        diagLog(`${caller}: cancelling, _parseStepFiles stopped`);
      }
    }

    return processed.length;
  }


  private async _updateTestItemFromFeatureFileContent(projSettings: ProjectSettings, content: string, testData: TestData,
    controller: vscode.TestController, uri: vscode.Uri, caller: string, firstRun: boolean) {

    if (!isFeatureFile(uri))
      throw new Error(`${caller}: ${uri.path} is not a feature file`);

    if (!content)
      return;

    const item = await this._getOrCreateFeatureTestItemAndParentFolderTestItemsForFeature(projSettings, content, testData,
      controller, uri, caller, firstRun);
    if (item) {
      diagLog(`${caller}: parsing ${uri.path}`);
      await item.testFile.createScenarioTestItemsFromFeatureFileContent(projSettings, content, testData, controller, item.testItem, caller);
    }
    else {
      diagLog(`${caller}: no scenarios found in ${uri.path}`);
    }
  }


  private async _getOrCreateFeatureTestItemAndParentFolderTestItemsForFeature(projSettings: ProjectSettings, content: string,
    testData: TestData, controller: vscode.TestController, uri: vscode.Uri, caller: string,
    firstRun: boolean): Promise<{ testItem: vscode.TestItem, testFile: TestFile } | undefined> {

    if (!isFeatureFile(uri))
      throw new Error(`${uri.path} is not a feature file`);

    if (!content)
      return;

    // note - get() will only match the top level node (e.g. a folder or root feature)
    const existingItem = controller.items.get(uriId(uri));

    const featureName = await getFeatureNameFromContent(content, uri, firstRun);
    if (!featureName) {
      if (existingItem)
        controller.items.delete(existingItem.id);
      return undefined;
    }

    if (existingItem) {
      diagLog(`${caller}: found existing top-level node for file ${uri.path}`);
      existingItem.label = featureName;
      return { testItem: existingItem, testFile: testData.get(existingItem) as TestFile || new TestFile() };
    }

    const testItem = controller.createTestItem(uriId(uri), featureName, uri);
    testItem.canResolveChildren = true;
    controller.items.add(testItem);
    const testFile = new TestFile();
    testData.set(testItem, testFile);

    // if it's a multi-root workspace, use project grandparent nodes, e.g. "project_1", "project_2"
    let projGrandParent: vscode.TestItem | undefined;
    if ((getUrisOfWkspFoldersWithFeatures()).length > 1) {
      projGrandParent = controller.items.get(projSettings.id);
      if (!projGrandParent) {
        const projName = projSettings.name;
        projGrandParent = controller.createTestItem(projSettings.id, projName);
        projGrandParent.canResolveChildren = true;
        controller.items.add(projGrandParent);
      }
    }



    // build folder hierarchy above test item
    // build top-down in case parent folder gets renamed/deleted etc.
    // note that the id is based on the file path so a new node is created if the folder is renamed
    // (old nodes are removed when required by _parseFeatureFiles())
    let firstFolder: vscode.TestItem | undefined = undefined;
    let parent: vscode.TestItem | undefined = undefined;
    let current: vscode.TestItem | undefined;

    let sfp = "";
    if (projSettings.relativeFeatureFolders.length > 1) {
      sfp = uri.path.substring(projSettings.uri.path.length + 1);
      // test any changes here with the test UI folder tree using example project "sibling steps folder 2"
      let shortest = getShortestCommonPathsExcludingLastPart(projSettings.relativeFeatureFolders);
      shortest = shortest.sort((a, b) => a.length - b.length);
      for (const folder of shortest) {
        if (sfp.startsWith(folder + "/")) {
          sfp = sfp.substring(folder.length + 1);
          break;
        }
      }
    }
    else {
      const fullFeaturesPath = getFeaturesFolderUriForFeatureFileUri(projSettings, uri)?.path;
      if (fullFeaturesPath)
        sfp = uri.path.substring(fullFeaturesPath.length + 1);
    }

    if (sfp.includes("/")) {

      const folders = sfp.split("/").slice(0, -1);
      for (let folderNo = 0; folderNo < folders.length; folderNo++) {
        const path = folders.slice(0, folderNo + 1).join("/");
        const folderName = "$(folder) " + folders[folderNo]; // $(folder) = folder icon
        const folderTestItemId = `${uriId(projSettings.uri)}/${path}`;

        if (folderNo === 0)
          parent = projGrandParent;

        if (parent)
          current = parent.children.get(folderTestItemId);

        if (!current) { // TODO: move getAllTestItems above the loop (moving it would need thorough testing of UI interactions of folder/file renames)
          const allTestItems = getTestItems(projSettings.id, controller.items);
          current = allTestItems.find(item => item.id === folderTestItemId);
        }

        if (!current) {
          current = controller.createTestItem(folderTestItemId, folderName);
          current.canResolveChildren = true;
          controller.items.add(current);
        }

        if (folderNo === folders.length - 1)
          current.children.add(testItem);

        if (parent)
          parent.children.add(current);

        parent = current;

        if (folderNo === 0)
          firstFolder = current;
      }
    }

    if (projGrandParent) {
      if (firstFolder) {
        projGrandParent.children.add(firstFolder);
      }
      else {
        projGrandParent.children.add(testItem);
      }
    }

    diagLog(`${caller}: created test item for ${uri.path}`);
    return { testItem: testItem, testFile: testFile };
  }


  async parseFilesForAllProjects(testData: TestData, ctrl: vscode.TestController,
    intiator: string, firstRun: boolean, cancelToken?: vscode.CancellationToken) {

    this._finishedFeaturesParseForAllProjects = false;
    this._errored = false;

    // this function is called e.g. when a workspace folder (i.e. project) gets added/removed/renamed, so 
    // clear everything up-front so that we rebuild the top level nodes
    diagLog("parseFilesForAllProjects - removing all test nodes/items for all projects");
    deleteTestTreeNodes(null, testData, ctrl);

    for (const projUri of getUrisOfWkspFoldersWithFeatures()) {
      this.parseFilesForProject(projUri, testData, ctrl, `parseFilesForAllProjects from ${intiator}`,
        firstRun, cancelToken);
    }
  }


  // NOTE:
  // - This is a self-cancelling RE-ENTRANT function, i.e. when called, any current parse for the same project will stop.   
  // - This is normally a BACKGROUND task. It should ONLY be await-ed on user request, i.e. when called by the refreshHandler.
  async parseFilesForProject(projUri: vscode.Uri, testData: TestData, ctrl: vscode.TestController, intiator: string, firstRun: boolean,
    callerCancelToken?: vscode.CancellationToken): Promise<ProjParseCounts | undefined> {

    const projPath = projUri.path;
    this._finishedFeaturesParseForAllProjects = false;
    this._finishedStepsParseForAllProjects = false;
    this._finishedFeaturesParseForProject[projPath] = false;
    this._finishedStepsParseForProject[projPath] = false;

    // if caller itself cancels, pass it on to the internal token
    const cancellationHandler = callerCancelToken?.onCancellationRequested(() => {
      if (this._cancelTokenSources[projPath])
        this._cancelTokenSources[projPath].cancel();
    });


    try {

      this._parseFilesCallCounts++;
      const projName = getWorkspaceFolder(projUri).name;
      const projId = uriId(projUri);
      const callName = `parseFiles #${this._parseFilesCallCounts} ${projName} (${intiator})`;
      let testCounts: TestCounts = { nodeCount: 0, testCount: 0 };

      diagLog(`\n===== ${callName}: started =====`);

      // this function is not generally awaited, and therefore re-entrant, so 
      // cancel any existing parseFiles call for this project
      if (this._cancelTokenSources[projPath]) {
        diagLog(`cancelling previous parseFiles call for ${projName}`);
        this._cancelTokenSources[projPath].cancel();
        while (this._cancelTokenSources[projPath]) {
          await new Promise(t => setTimeout(t, 20));
        }
      }
      this._cancelTokenSources[projPath] = new vscode.CancellationTokenSource();
      const projSettings: ProjectSettings = services.extConfig.projectSettings[projUri.path];


      const start = performance.now();
      const featureFileCount = await this._parseFeatureFiles(projSettings, testData, ctrl, this._cancelTokenSources[projPath].token,
        callName, firstRun);
      const featTime = performance.now() - start;
      if (this._cancelTokenSources[projPath].token.isCancellationRequested) {
        diagLog(`${callName}: cancellation complete`);
        return;
      }
      diagLog(`${callName}: features loaded for project ${projName}`);
      this._finishedFeaturesParseForProject[projPath] = true;
      const projectsStillParsingFeatures = (getUrisOfWkspFoldersWithFeatures()).filter(uri =>
        !this._finishedFeaturesParseForProject[uri.path]);
      if (projectsStillParsingFeatures.length === 0) {
        this._finishedFeaturesParseForAllProjects = true;
        diagLog(`${callName}: features loaded for all projects`);
      }
      else {
        diagLog(`${callName}: waiting on feature parse for ${projectsStillParsingFeatures.map(w => w.path)}`)
      }


      let mappingsCount = 0;
      let buildMappingsTime = 0;
      const stepsStart = performance.now();
      const stepFileCount = await this._parseStepsFiles(projSettings, this._cancelTokenSources[projPath].token, callName);
      const stepsTime = performance.now() - stepsStart;
      if (this._cancelTokenSources[projPath].token.isCancellationRequested) {
        diagLog(`${callName}: cancellation complete`);
        return;
      }

      this._finishedStepsParseForProject[projPath] = true;
      diagLog(`${callName}: steps loaded`);

      const updateMappingsStart = performance.now();
      mappingsCount = rebuildStepMappings(projSettings.uri);
      buildMappingsTime = performance.now() - updateMappingsStart;
      diagLog(`${callName}: stepmappings built`);

      const projectsStillParsingSteps = (getUrisOfWkspFoldersWithFeatures()).filter(uri => !this._finishedStepsParseForProject[uri.path]);
      if (projectsStillParsingSteps.length === 0) {
        this._finishedStepsParseForAllProjects = true;
        diagLog(`${callName}: steps loaded for all projects`);
      }
      else {
        diagLog(`${callName}: waiting on steps parse for ${projectsStillParsingSteps.map(w => w.path)}`)
      }


      if (this._cancelTokenSources[projPath].token.isCancellationRequested) {
        diagLog(`${callName}: cancellation complete`);
        return;
      }

      diagLog(`${callName}: complete`);
      testCounts = countTestItemsInCollection(projId, testData, ctrl.items);
      this._logTimesToConsole(callName, testCounts, featTime, stepsTime, mappingsCount, buildMappingsTime, featureFileCount, stepFileCount);

      if (!services.extConfig.integrationTestRun)
        return;

      return {
        tests: testCounts,
        featureFilesExceptEmptyOrCommentedOut: featureFileCount,
        stepFilesExceptEmptyOrCommentedOut: stepFileCount,
        stepFileStepsExceptCommentedOut: getStepFilesSteps(projSettings.uri).length,
        featureFileStepsExceptCommentedOut: getFeatureFilesSteps(projSettings.uri).length,
        stepMappings: getStepMappings(projSettings.uri).length
      };
    }
    catch (e: unknown) {
      // unawaited async func, must log the error 

      this._finishedFeaturesParseForProject[projPath] = true;
      this._finishedStepsParseForProject[projPath] = true;
      this._finishedFeaturesParseForAllProjects = true;
      this._finishedStepsParseForAllProjects = true;

      // multiple functions can be running in parallel, but if any of them fail we'll consider it fatal and bail out all of them
      Object.keys(this._cancelTokenSources).forEach(k => {
        this._cancelTokenSources[k].cancel();
        this._cancelTokenSources[k].dispose();
        delete this._cancelTokenSources[k];
      });
      // only log the first error (i.e. avoid logging the same error multiple times)
      if (!this._errored) {
        this._errored = true;
        services.extConfig.logger.showError(e, projUri);
      }

      return;
    }
    finally {

      this._cancelTokenSources[projPath]?.dispose();
      delete this._cancelTokenSources[projPath];
      cancellationHandler?.dispose();
    }
  }



  async reparseFile(fileUri: vscode.Uri, content: string | undefined, projSettings: ProjectSettings, testData: TestData, ctrl: vscode.TestController) {
    try {
      this._reparsingFile = true;

      const isAFeatureFile = isFeatureFile(fileUri);
      let isAStepsFile = false;
      if (!isAFeatureFile)
        isAStepsFile = isStepsFile(fileUri);
      if (!isAStepsFile && !isAFeatureFile)
        return;

      if (!content)
        content = await getContentFromFilesystem(fileUri);

      if (isAStepsFile) {
        deleteStepsAndStepMappingsForStepsFile(fileUri);
        await parseStepsFileContent(projSettings.uri, content, fileUri, "reparseFile");
      }

      if (isAFeatureFile) {
        deleteStepsAndStepMappingsForFeatureFile(fileUri);
        await this._updateTestItemFromFeatureFileContent(projSettings, content, testData, ctrl, fileUri, "reparseFile", false);
      }

      rebuildStepMappings(projSettings.uri);
    }
    catch (e: unknown) {
      // unawaited async func, must log the error
      services.extConfig.logger.showError(e, projSettings.uri);
    }
    finally {
      this._reparsingFile = false;
    }
  }


  private _logTimesToConsole = (callName: string, testCounts: TestCounts, featParseTime: number, stepsParseTime: number,
    mappingsCount: number, buildMappingsTime: number, featureFileCount: number, stepFileCount: number) => {
    diagLog(
      `---` +
      `\nPERF: ${callName} completed.` +
      `\nPERF: Processing ${featureFileCount} feature files, ${stepFileCount} step files, ` +
      `producing ${testCounts.nodeCount} tree nodes, ${testCounts.testCount} tests, and ${mappingsCount} stepMappings took ${stepsParseTime + featParseTime} ms. ` +
      `\nPERF: Breakdown: feature file parsing ${featParseTime} ms, step file parsing ${stepsParseTime} ms, building step mappings: ${buildMappingsTime} ms` +
      `\nPERF: NOTE: Ignore parseFile times if any of these are true:` +
      `\nPERF:   (a) time taken was during vscode startup contention, ` +
      `\nPERF:   (b) busy cpu due to background processes, ` +
      `\nPERF:   (c) another test extension is also refreshing, ` +
      `\nPERF:   (d) you are debugging the extension itself and have breakpoints, or you are running an extension integration test.` +
      `\nPERF: For a more representative time, disable other test extensions then click the test refresh button a few times.` +
      `\nPERF: (Note that for multi-root, multiple projects refresh in parallel, so you should consider the longest parseFile time as the total time.)` +
      `\n==================`
    );
  }


}
