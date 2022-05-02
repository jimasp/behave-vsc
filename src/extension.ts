/* eslint-disable @typescript-eslint/ban-ts-comment */
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore: '"vscode"' has no exported member 'StatementCoverage'
import * as vscode from 'vscode';
import config, { ExtensionConfiguration, EXTENSION_FULL_NAME, EXTENSION_NAME } from "./Configuration";
import { BehaveTestData, Scenario, TestData, TestFile } from './TestFile';
import { getWorkspaceFolderUris, getWorkspaceSettingsForFile, isFeatureFile, isStepsFile, logExtensionVersion, removeDirectoryRecursive } from './helpers';
import { Steps } from './stepsParser';
import { gotoStepHandler } from './gotoStepHandler';
import { getSteps, FileParser } from './FileParser';
import { debugCancelSource, testRunHandler } from './testRunHandler';


export let parser: FileParser;
export const testData = new WeakMap<vscode.TestItem, BehaveTestData>();
export interface QueueItem { test: vscode.TestItem; scenario: Scenario; }


export type Instances = {
  runHandler: (debug: boolean, request: vscode.TestRunRequest, cancellation: vscode.CancellationToken) => Promise<QueueItem[] | undefined>,
  config: ExtensionConfiguration,
  ctrl: vscode.TestController,
  parser: FileParser,
  getSteps: () => Steps,
  testData: TestData
};


// called on extension activation:
// set up all relevant event handlers/hooks/subscriptions with vscode api
export async function activate(context: vscode.ExtensionContext): Promise<Instances | undefined> {

  try {

    logExtensionVersion(context);
    parser = new FileParser();

    const ctrl = vscode.tests.createTestController(`${EXTENSION_FULL_NAME}.TestController`, 'Feature Tests');
    // the function contained in push() will execute immediately, as well as registering it for disposal on extension deactivation
    // i.e. startWatchingWorkspace will execute immediately, as will registerCommand, but gotoStepHandler will not (as it is a parameter)
    // push disposables (registerCommand is a disposable so that your command will no longer be active when the extension is deactivated)
    context.subscriptions.push(ctrl);
    for (const wkspUri of getWorkspaceFolderUris()) {
      context.subscriptions.push(startWatchingWorkspace(wkspUri, ctrl));
    }
    context.subscriptions.push(vscode.commands.registerCommand("behave-vsc.gotoStep", gotoStepHandler));

    const cancelRemoveDirectoryRecursive = new vscode.CancellationTokenSource();
    removeDirectoryRecursive(config.extTempFilesUri, cancelRemoveDirectoryRecursive.token);
    const runHandler = testRunHandler(ctrl, cancelRemoveDirectoryRecursive);

    ctrl.createRunProfile('Run Tests', vscode.TestRunProfileKind.Run,
      (request: vscode.TestRunRequest, token: vscode.CancellationToken) => {
        runHandler(false, request, token);
      }
      , true);

    ctrl.createRunProfile('Debug Tests', vscode.TestRunProfileKind.Debug,
      (request: vscode.TestRunRequest, token: vscode.CancellationToken) => {
        runHandler(true, request, token);
      }
      , true);


    ctrl.resolveHandler = async (item: vscode.TestItem | undefined) => {
      try {
        if (!item)
          return;

        const data = testData.get(item);
        if (data instanceof TestFile) {
          const wkspSettings = getWorkspaceSettingsForFile(item.uri);
          await data.updateScenarioTestItemsFromFeatureFileOnDisk(wkspSettings, ctrl, item, "resolveHandler");
        }
      }
      catch (e: unknown) {
        config.logger.logError(e);
      }
    };

    ctrl.refreshHandler = async (cancelToken: vscode.CancellationToken) => {
      try {

        await parser.parseFilesForAllWorkspaces(ctrl, "refreshHandler", cancelToken);
      }
      catch (e: unknown) {
        config.logger.logError(e);
      }
    };


    // onDidTerminateDebugSession doesn't provide reason for the stop,
    // so we need to check the reason from the debug adapter protocol
    context.subscriptions.push(vscode.debug.registerDebugAdapterTrackerFactory('*', {
      createDebugAdapterTracker() {
        let threadExit = false;

        return {
          onDidSendMessage: (m) => {
            // https://github.com/microsoft/vscode-debugadapter-node/blob/main/debugProtocol.json
            // console.log(JSON.stringify(m));

            if (m.body?.reason === "exited" && m.body?.threadId) {
              // thread exit
              threadExit = true;
              return;
            }

            if (m.event === "exited") {
              if (!threadExit) {
                // exit, but not a thread exit, so we need to set flag to 
                // stop the run, (most likely debug was stopped by user)
                debugCancelSource.cancel();
              }
            }
          },
        };
      }
    }));

    context.subscriptions.push(vscode.workspace.onDidChangeWorkspaceFolders(async () => {
      parser.parseFilesForAllWorkspaces(ctrl, "onDidChangeWorkspaceFolders");
      for (const wkspUri of getWorkspaceFolderUris()) {
        config.reloadSettings(wkspUri);
      }
    }));

    context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(async (event) => {
      try {
        for (const wkspUri of getWorkspaceFolderUris()) {
          // note - affectsConfiguration(ext,uri) i.e. with a scope (uri) param is smart re. default resource values, but 
          // we don't want that behaviour because we want to distinguish between runAllAsOne being set and being absent from 
          // settings.json, so we don't include the uri in the affectsConfiguration() call
          if (event.affectsConfiguration(EXTENSION_NAME)) {
            config.reloadSettings(wkspUri);
            parser.parseFilesForWorkspace(wkspUri, ctrl, "OnDidChangeConfiguration");
          }
        }
      }
      catch (e: unknown) {
        config.logger.logError(e);
      }
    }));


    const updateNodeForDocument = async (e: vscode.TextDocument) => {
      const wkspSettings = getWorkspaceSettingsForFile(e.uri);
      const item = await parser.getOrCreateFeatureTestItemAndParentFolderTestItemsFromFeatureFile(wkspSettings, ctrl, e.uri, "updateNodeForDocument");
      if (item)
        item.testFile.createScenarioTestItemsFromFeatureFileContents(wkspSettings, e.uri.path, ctrl, e.getText(), item.testItem, "updateNodeForDocument");
    }

    // for any open .feature documents on startup
    // TODO - review if we still need this?
    const docs = vscode.workspace.textDocuments.filter(d => d.uri.scheme === "file" && d.uri.path.toLowerCase().endsWith(".feature"));
    for (const doc of docs) {
      await updateNodeForDocument(doc);
    }

    return {
      // return instances to support integration testing
      runHandler: runHandler,
      config: config,
      ctrl: ctrl,
      parser: parser,
      getSteps: getSteps,
      testData: testData
    };

  }
  catch (e: unknown) {
    if (config) {
      config.logger.logError(e);
    }
    else {
      // should never happen
      const text = (e instanceof Error ? (e.stack ? e.stack : e.message) : e as string);
      vscode.window.showErrorMessage(text);
    }
  }

} // end activate()



function startWatchingWorkspace(wkspUri: vscode.Uri, ctrl: vscode.TestController) {

  // NOTE - not just .feature and .py files, but also watch FOLDER changes inside the features folder
  const wkspFullFeaturesPath = config.getWorkspaceSettings(wkspUri).fullFeaturesPath;
  const pattern = new vscode.RelativePattern(wkspFullFeaturesPath, "**");
  const watcher = vscode.workspace.createFileSystemWatcher(pattern);
  const wkspSettings = getWorkspaceSettingsForFile(wkspUri);

  const updater = (uri: vscode.Uri) => {
    try {

      if (isStepsFile(uri)) {
        parser.updateStepsFromStepsFile(wkspFullFeaturesPath, uri, "updater");
        return;
      }

      if (isFeatureFile(uri)) {
        parser.updateTestItemFromFeatureFile(wkspSettings, ctrl, uri, "updater");
      }

    }
    catch (e: unknown) {
      config.logger.logError(e);
    }
  }


  // fires on either new file/folder creation OR rename (inc. git actions)
  watcher.onDidCreate(uri => {
    updater(uri)
  });

  // fires on file save (inc. git actions)
  watcher.onDidChange(uri => {
    updater(uri)
  });

  // fires on either file/folder delete OR rename (inc. git actions)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  watcher.onDidDelete(uri => {

    const path = uri.path.toLowerCase();

    // we want folders in our pattern to be watched as e.g. renaming a folder does not raise events for child files    
    // but we cannot determine if this is a file or folder deletion as:
    //   (a) it has been deleted so we can't stat, and 
    //   (b) "." is valid in folder names so we can't determine by looking at the path
    // but we should ignore specific file extensions or paths we know we don't care about
    if (path.endsWith(".tmp")) // .tmp = vscode file history file
      return;

    // log for extension developers in case we need to add another file type above
    if (path.indexOf(".") && !isFeatureFile(uri) && !isStepsFile(uri)) {
      console.warn("detected deletion of unanticipated file type");
    }

    try {
      parser.parseFilesForWorkspace(wkspUri, ctrl, "OnDidDelete");
    }
    catch (e: unknown) {
      config.logger.logError(e);
    }
  });



  parser.parseFilesForWorkspace(wkspUri, ctrl, "startWatchingWorkspace");

  return watcher;
}
