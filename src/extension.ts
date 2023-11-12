import * as vscode from 'vscode';
import { config, Configuration } from "./configuration";
import { BehaveTestData, Scenario, TestData, TestFile } from './parsers/testFile';
import {
  getContentFromFilesystem,
  getUrisOfWkspFoldersWithFeatures, getProjectSettingsForFile, isFeatureFile,
  isStepsFile, logExtensionVersion, cleanExtensionTempDirectory, urisMatch
} from './common';
import { StepFileStep } from './parsers/stepsParser';
import { gotoStepHandler } from './handlers/gotoStepHandler';
import { findStepReferencesHandler, nextStepReferenceHandler as nextStepReferenceHandler, prevStepReferenceHandler, treeView } from './handlers/findStepReferencesHandler';
import { FileParser } from './parsers/fileParser';
import { testRunHandler } from './runners/testRunHandler';
import { TestWorkspaceConfigWithprojUri } from './_integrationTests/suite-shared/testWorkspaceConfig';
import { diagLog } from './logger';
import { performance } from 'perf_hooks';
import { StepMapping, getStepFileStepForFeatureFileStep, getStepMappingsForStepsFileFunction } from './parsers/stepMappings';
import { autoCompleteProvider } from './handlers/autoCompleteProvider';
import { formatFeatureProvider } from './handlers/formatFeatureProvider';
import { SemHighlightProvider, semLegend } from './handlers/semHighlightProvider';
import { startWatchingProject } from './watchers/workspaceWatcher';
import { JunitWatcher } from './watchers/junitWatcher';
import { RunProfile } from './settings';


const testData = new WeakMap<vscode.TestItem, BehaveTestData>();
const wkspWatchers = new Map<vscode.Uri, vscode.FileSystemWatcher[]>();
export const parser = new FileParser();
export interface QueueItem { test: vscode.TestItem; scenario: Scenario; }


export type TestSupport = {
  runHandler: (debug: boolean, request: vscode.TestRunRequest, runProfile?: RunProfile) => Promise<QueueItem[] | undefined>,
  config: Configuration,
  ctrl: vscode.TestController,
  parser: FileParser,
  getStepMappingsForStepsFileFunction: (stepsFileUri: vscode.Uri, lineNo: number) => StepMapping[],
  getStepFileStepForFeatureFileStep: (featureFileUri: vscode.Uri, line: number) => StepFileStep | undefined,
  testData: TestData,
  configurationChangedHandler: (event?: vscode.ConfigurationChangeEvent, testCfg?: TestWorkspaceConfigWithprojUri,
    forceRefresh?: boolean) => Promise<void>
};



// construction function called on extension activation OR the first time a new/unrecognised workspace gets added.
// - call anything that needs to be initialised/kicked off async on startup, and 
// - set up all relevant event handlers/hooks/subscriptions to the vscode api
// NOTE - THIS MUST RETURN FAST: AVOID using "await" here unless absolutely necessary (except inside handlers)
// this function should only contain initialisation, registering event handlers, and unawaited async calls
export async function activate(context: vscode.ExtensionContext): Promise<TestSupport | undefined> {

  try {

    const start = performance.now();
    diagLog("activate called, node pid:" + process.pid);
    config.logger.syncChannelsToWorkspaceFolders();
    logExtensionVersion(context);
    const ctrl = vscode.tests.createTestController(`behave-vsc.TestController`, 'Feature Tests');
    parser.clearTestItemsAndParseFilesForAllWorkspaces(testData, ctrl, "activate", true);

    const cleanExtensionTempDirectoryCancelSource = new vscode.CancellationTokenSource();
    cleanExtensionTempDirectory(cleanExtensionTempDirectoryCancelSource.token);

    for (const projUri of getUrisOfWkspFoldersWithFeatures()) {
      const watchers = startWatchingProject(projUri, ctrl, testData, parser);
      wkspWatchers.set(projUri, watchers);
      watchers.forEach(w => context.subscriptions.push(w));
    }

    const junitWatcher = new JunitWatcher();
    junitWatcher.startWatchingJunitFolder();

    // any function contained in a context.subscriptions.push() will execute immediately, 
    // as well as registering the returned disposable object for a dispose() call on extension deactivation
    // i.e. startWatchingWorkspace will execute immediately, as will registerCommand, but gotoStepHandler will not (as it is a parameter 
    // to a register command, which returns a disposable so our custom command is deregistered when the extension is deactivated).
    // to test any custom dispose() methods (which must be synchronous), just start and then close the extension host environment.    
    context.subscriptions.push(
      ctrl,
      treeView,
      config,
      cleanExtensionTempDirectoryCancelSource,
      junitWatcher,
      vscode.commands.registerTextEditorCommand(`behave-vsc.gotoStep`, gotoStepHandler),
      vscode.commands.registerTextEditorCommand(`behave-vsc.findStepReferences`, findStepReferencesHandler),
      vscode.commands.registerCommand(`behave-vsc.stepReferences.prev`, prevStepReferenceHandler),
      vscode.commands.registerCommand(`behave-vsc.stepReferences.next`, nextStepReferenceHandler),
      vscode.languages.registerCompletionItemProvider('gherkin', autoCompleteProvider, ...[" "]),
      vscode.languages.registerDocumentRangeFormattingEditProvider('gherkin', formatFeatureProvider),
      vscode.languages.registerDocumentSemanticTokensProvider({ language: 'gherkin' }, new SemHighlightProvider(), semLegend)
    );


    const runHandler = testRunHandler(testData, ctrl, parser, junitWatcher, cleanExtensionTempDirectoryCancelSource);
    createRunProfiles(ctrl, runHandler);

    ctrl.resolveHandler = async (item: vscode.TestItem | undefined) => {
      let projSettings;

      try {
        if (!item || !item.uri || item.uri?.scheme !== 'file')
          return;

        const data = testData.get(item);
        if (!(data instanceof TestFile))
          return;

        projSettings = getProjectSettingsForFile(item.uri);
        const content = await getContentFromFilesystem(item.uri);
        await data.createScenarioTestItemsFromFeatureFileContent(projSettings, content, testData, ctrl, item, "resolveHandler");
      }
      catch (e: unknown) {
        // entry point function (handler) - show error
        const projUri = projSettings ? projSettings.uri : undefined;
        config.logger.showError(e, projUri);
      }
    };


    ctrl.refreshHandler = async (cancelToken: vscode.CancellationToken) => {
      try {
        await parser.clearTestItemsAndParseFilesForAllWorkspaces(testData, ctrl, "refreshHandler", false, cancelToken);
      }
      catch (e: unknown) {
        // entry point function (handler) - show error        
        config.logger.showError(e, undefined);
      }
    };


    // called when a user renames, adds or removes a workspace folder.
    // NOTE: the first time a new not-previously recognised workspace gets added a new node host 
    // process will start, this host process will terminate, and activate() will be called shortly after    
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    context.subscriptions.push(vscode.workspace.onDidChangeWorkspaceFolders(async (event) => {
      try {
        await configurationChangedHandler(undefined, undefined, true);
      }
      catch (e: unknown) {
        // entry point function (handler) - show error        
        config.logger.showError(e, undefined);
      }
    }));


    // called when a user edits a file.
    // we want to reparse on edit (not just on disk changes) because:
    // a. the user may run a file they just edited without saving,
    // b. the semantic highlighting while typing requires the stepmappings to be up to date as the user types,
    // c. instant test tree updates is a nice bonus for user experience
    // d. to keep stepmappings in sync in case user clicks go to step def/ref before file save
    context.subscriptions.push(vscode.workspace.onDidChangeTextDocument(async (event) => {
      try {
        const uri = event.document.uri;
        if (!isFeatureFile(uri) && !isStepsFile(uri))
          return;
        const projSettings = getProjectSettingsForFile(uri);
        parser.reparseFile(uri, event.document.getText(), projSettings, testData, ctrl);
      }
      catch (e: unknown) {
        // entry point function (handler) - show error        
        config.logger.showError(e, undefined);
      }
    }));


    // called by onDidChangeConfiguration when there is a settings.json/*.vscode-workspace change 
    // and onDidChangeWorkspaceFolders (also called by integration tests with a testCfg).
    // NOTE: in some circumstances this function can be called twice in quick succession when a multi-root workspace folder is added/removed/renamed 
    // (i.e. once by onDidChangeWorkspaceFolders and once by onDidChangeConfiguration), but parser methods will self-cancel as needed
    const configurationChangedHandler = async (event?: vscode.ConfigurationChangeEvent, testCfg?: TestWorkspaceConfigWithprojUri,
      forceFullRefresh?: boolean) => {

      // for integration test runAllTestsAndAssertTheResults, 
      // only reload config on request (i.e. when testCfg supplied)
      if (config.integrationTestRun && !testCfg)
        return;

      try {

        // note - affectsConfiguration(ext,uri) i.e. with a scope (uri) param is smart re. default resource values, but  we don't want 
        // that behaviour because we want to distinguish between some properties being set vs being absent from 
        // settings.json (via inspect not get), so we don't include the uri in the affectsConfiguration() call
        // (separately, just note that the settings change could be a global window setting 
        // from *.code-workspace file, rather than from settings.json)
        const affected = event && event.affectsConfiguration("behave-vsc");
        if (!affected && !forceFullRefresh && !testCfg)
          return;

        if (!testCfg)
          config.logger.clearAllProjects();

        // adding/removing/renaming workspaces will not only change the 
        // set of workspaces we are watching, but also the output channels
        config.logger.syncChannelsToWorkspaceFolders();

        for (const projUri of getUrisOfWkspFoldersWithFeatures(true)) {
          if (testCfg) {
            if (urisMatch(testCfg.projUri, projUri)) {
              config.reloadSettings(projUri, testCfg.testConfig);
            }
            continue;
          }

          config.reloadSettings(projUri);
          const oldWatchers = wkspWatchers.get(projUri);
          if (oldWatchers)
            oldWatchers.forEach(w => w.dispose());
          const watchers = startWatchingProject(projUri, ctrl, testData, parser);
          wkspWatchers.set(projUri, watchers);
          watchers.forEach(w => context.subscriptions.push(w));
        }

        // code.workspace or settings.json configuration has now changed, so we need to reparse files

        // (in the case of a testConfig insertion we just reparse the supplied workspace to avoid issues with parallel 
        // workspace integration test runs)
        if (testCfg) {
          parser.parseFilesForWorkspace(testCfg.projUri, testData, ctrl, "configurationChangedHandler", false);
          return;
        }

        // we don't know which workspace was affected (see comment on affectsConfiguration above), so just reparse all workspaces
        // (also, when a workspace is added/removed/renamed (forceRefresh), we need to clear down and reparse all test nodes 
        // to rebuild the top level nodes)
        parser.clearTestItemsAndParseFilesForAllWorkspaces(testData, ctrl, "configurationChangedHandler", false);
      }
      catch (e: unknown) {
        // entry point function (handler) - show error        
        config.logger.showError(e, undefined);
      }
    }


    context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(async (event) => {
      await configurationChangedHandler(event);
    }));

    diagLog(`PERF: activate took  ${performance.now() - start} ms`);

    return {
      // return instances to support integration testing
      runHandler: runHandler,
      config: config,
      ctrl: ctrl,
      parser: parser,
      getStepMappingsForStepsFileFunction: getStepMappingsForStepsFileFunction,
      getStepFileStepForFeatureFileStep: getStepFileStepForFeatureFileStep,
      testData: testData,
      configurationChangedHandler: configurationChangedHandler
    };

  }
  catch (e: unknown) {
    // entry point function (handler) - show error    
    if (config && config.logger) {
      config.logger.showError(e, undefined);
    }
    else {
      // no logger, use vscode.window.showErrorMessage directly
      const text = (e instanceof Error ? (e.stack ? e.stack : e.message) : e as string);
      vscode.window.showErrorMessage(text);
    }
  }


  function createRunProfiles(ctrl: vscode.TestController,
    runHandler: (debug: boolean, request: vscode.TestRunRequest, runProfile?: RunProfile) => Promise<QueueItem[] | undefined>) {

    ctrl.createRunProfile('Run Features', vscode.TestRunProfileKind.Run,
      async (request: vscode.TestRunRequest) => {
        await runHandler(false, request);
      },
      true);

    ctrl.createRunProfile('Debug Features', vscode.TestRunProfileKind.Debug,
      async (request: vscode.TestRunRequest) => {
        await runHandler(true, request);
      },
      true);

    ctrl.createRunProfile('Run Features with Tags', vscode.TestRunProfileKind.Run,
      async (request: vscode.TestRunRequest) => {
        const tagExpression = await vscode.window.showInputBox(
          { prompt: "Enter tag expression, e.g. `mytag1, mytag2`" }
        );
        await runHandler(false, request, new RunProfile(undefined, tagExpression));
      });

    ctrl.createRunProfile('Debug Features with Tags', vscode.TestRunProfileKind.Debug,
      async (request: vscode.TestRunRequest) => {
        const tagExpression = await vscode.window.showInputBox(
          { prompt: "Enter tag expression, e.g. `mytag1, mytag2`" }
        );
        await runHandler(true, request, new RunProfile(undefined, tagExpression));
      });

    for (const name in config.instanceSettings.runProfiles) {
      const runProfile = config.instanceSettings.runProfiles[name];
      ctrl.createRunProfile("Run Features: " + name, vscode.TestRunProfileKind.Run,
        async (request: vscode.TestRunRequest) => {
          await runHandler(false, request, runProfile);
        });
      ctrl.createRunProfile("Debug Features: " + name, vscode.TestRunProfileKind.Debug,
        async (request: vscode.TestRunRequest) => {
          await runHandler(true, request, runProfile);
        });
    }
  }
} // end activate()


