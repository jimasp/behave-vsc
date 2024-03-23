import * as vscode from 'vscode';
import { services } from './common/services';
import { BehaveTestData, Scenario, TestData } from './parsers/testFile';
import {
  getProjectUris, isFeatureFile,
  isStepsFile, logExtensionVersion, uriId, urisMatch
} from './common/helpers';
import { StepFileStep } from './parsers/stepsParser';
import { gotoStepHandler } from './handlers/gotoStepHandler';
import { findStepReferencesHandler, nextStepReferenceHandler, prevStepReferenceHandler, treeView } from './handlers/findStepReferencesHandler';
import { ITestRunHandler, testRunHandler } from './runners/testRunHandler';
import { xRayLog } from './common/logger';
import { performance } from 'perf_hooks';
import { StepMapping, getStepFileStepForFeatureFileStep, getStepMappingsForStepsFileFunction } from './parsers/stepMappings';
import { autoCompleteProvider } from './handlers/autoCompleteProvider';
import { formatFeatureProvider } from './handlers/formatFeatureProvider';
import { SemHighlightProvider, semLegend } from './handlers/semHighlightProvider';
import { ProjectWatcher } from './watchers/projectWatcher';
import { JunitWatcher } from './watchers/junitWatcher';
import { createRunProfilesForProject } from './profiles/runProfiles';



const projMap = new Map<string, ProjMapEntry>();

export interface QueueItem {
  test: vscode.TestItem;
  scenario: Scenario;
}

export type ProjMapEntry = {
  ctrl: vscode.TestController,
  runHandler: ITestRunHandler,
  watcher: ProjectWatcher,
  runProfiles: vscode.TestRunProfile[]
};

export function getProjMapEntry(projUri: vscode.Uri): ProjMapEntry {
  const entry = projMap.get(uriId(projUri));
  if (!entry)
    throw new Error("projMap not found");
  return entry;
}


export function deactivate() {
  // clean any disposable objects not handled by context.subscriptions (or any potentially large non-disposable objects)
  projMap.forEach(m => { m.ctrl.dispose(); m.watcher.dispose(); m.runProfiles.forEach(r => r.dispose()); });
  projMap.clear();
  xRayLog("PERF: ignore all PERF times during vscode startup, as most functions are async and affected by startup contention, " +
    "(in most cases you can click refresh in test explorer for a more representative time)");
}


// construction function called on extension activation OR the first time a new/unrecognised workspace gets added.
// - call anything that needs to be initialised/kicked off async on startup, and 
// - set up all relevant event handlers/hooks/subscriptions to the vscode api
// this function should only contain initialisation, registering event handlers, and unawaited async calls
//
// ** DO NOT MAKE THIS FUNCTION ASYNC ** (we want to kick off async tasks and then return)
export function activate(context: vscode.ExtensionContext): IntegrationTestAPI | undefined {

  try {
    const start = performance.now();
    xRayLog("activate called, node pid:" + process.pid);

    const testData: TestData = new WeakMap<vscode.TestItem, BehaveTestData>();
    const junitWatcher = new JunitWatcher();
    const startupPromise = runStartupTasks(context, testData, junitWatcher);

    // any function contained in a context.subscriptions.push() will execute immediately, 
    // as well as registering the returned disposable object for a dispose() call on extension deactivation
    // i.e. startWatchingWorkspace will execute immediately, as will registerCommand, but gotoStepHandler will not (as it is a parameter 
    // to a register command, which returns a disposable so our custom command is deregistered when the extension is deactivated).
    // to test any custom dispose() methods (which must be synchronous), just start and then close the extension host environment.    
    context.subscriptions.push(
      services,
      treeView,
      junitWatcher,
      vscode.commands.registerTextEditorCommand(`behave-vsc.gotoStep`, gotoStepHandler),
      vscode.commands.registerTextEditorCommand(`behave-vsc.findStepReferences`, findStepReferencesHandler),
      vscode.commands.registerCommand(`behave-vsc.stepReferences.prev`, prevStepReferenceHandler),
      vscode.commands.registerCommand(`behave-vsc.stepReferences.next`, nextStepReferenceHandler),
      vscode.languages.registerCompletionItemProvider('gherkin', autoCompleteProvider, ...[" "]),
      vscode.languages.registerDocumentRangeFormattingEditProvider('gherkin', formatFeatureProvider),
      vscode.languages.registerDocumentSemanticTokensProvider({ language: 'gherkin' }, new SemHighlightProvider(), semLegend)
    );


    // TODO: remove? we probably don't need this handler, as we are watching/re-parsing files on any change
    // initially called with undefined when test explorer is opened by the user for the first time, 
    // then called whenever a test node is expanded in test explorer if item.canResolveChildren is true.
    // (a test node expansion can fire this even if not by user interaction, e.g. on startup if it was expanded previously) 
    // ctrl.resolveHandler = async (item: vscode.TestItem | undefined) => {
    //   try {
    //     // ignore undefined, we build in background at startup via parseFilesForAllProjects
    //     // and we also rebuild via file watchers
    //     if (!item || !item.uri || item.uri?.scheme !== 'file')
    //       return;

    //     // we only build upwards from feature files
    //     const data = testData.get(item);
    //     if (!(data instanceof TestFile))
    //       return;

    //     // reparse the file to rebuild children
    //     services.parser.reparseFile(item.uri, testData, ctrl, "resolveHandler");
    //   }
    //   catch (e: unknown) {
    //     // entry point function (handler) - show error
    //     logger.showError(e);
    //   }
    // };


    // called when a user renames, adds or removes a workspace folder.
    // NOTE: the first time a new not-previously recognised workspace folder gets added a new node host 
    // process will start, this host process will terminate, and activate() will be called shortly after    
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    context.subscriptions.push(vscode.workspace.onDidChangeWorkspaceFolders(async (event) => {
      try {
        await configurationChangedHandler(true);
      }
      catch (e: unknown) {
        // entry point function (handler) - show error        
        services.logger.showError(e);
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
        if (!await isFeatureFile(uri) && !await isStepsFile(uri))
          return;
        services.parser.reparseFile(uri, testData, "onDidChangeTextDocument", event.document.getText());
      }
      catch (e: unknown) {
        // entry point function (handler) - show error        
        services.logger.showError(e);
      }
    }));


    // called by onDidChangeConfiguration when there is a settings.json/*.vscode-workspace change 
    // and onDidChangeWorkspaceFolders (also called by integration tests with a testCfg).
    // NOTE: in some circumstances this function can be called twice in quick succession when a multi-root workspace folder is added/removed/renamed 
    // (i.e. once by onDidChangeWorkspaceFolders and once by onDidChangeConfiguration), but parser methods will self-cancel as needed
    const configurationChangedHandler = async (wkspFoldersChanged: boolean, event?: vscode.ConfigurationChangeEvent,
      testConfig?: vscode.WorkspaceConfiguration, testProjUri?: vscode.Uri) => {

      if (testConfig && !testProjUri)
        throw new Error("testProjUri must be supplied when testConfig is supplied");

      // for integration test runAllTestsAndAssertTheResults, 
      // only reload config on request (i.e. when testCfg supplied)
      if (services.config.isIntegrationTestRun && !testConfig)
        return;

      try {

        // Note - affectsConfiguration(ext,uri) i.e. with a scope (uri) param is smart re. default resource values, but we don't want 
        // that behaviour because sometimes (e.g. when dealing with deprecated settings) we want to distinguish between some properties 
        // being set vs being absent from settings.json (via inspect not get) via getActualWorkspaceSetting, 
        // so we don't include the uri in the affectsConfiguration() call.
        // (Separately, just note that the settings change could be a global window setting 
        // from *.code-workspace file, rather than from settings.json)
        const affected = event?.affectsConfiguration("behave-vsc");
        if (!affected && !wkspFoldersChanged && !testConfig)
          return;

        if (!testConfig)
          services.logger.clearAllProjects();

        const projectUris = wkspFoldersChanged ? await getProjectUris(true) : await getProjectUris();

        // adding/removing/renaming workspaces will not only change the 
        // set of workspaces we are watching, but also the output channels        
        if (wkspFoldersChanged)
          services.logger.syncOutputChannelsToProjects(projectUris);

        for (const projUri of projectUris) {
          if (testConfig) {
            if (urisMatch(testProjUri!, projUri))
              await services.config.reloadSettings(projUri, testConfig);
            continue;
          }

          await services.config.reloadSettings(projUri);
        }



        // code.workspace or settings.json configuration has now changed, so we need to reparse files

        // (in the case of a testConfig insertion we just reparse the supplied project to avoid issues 
        // with parallel integration test suite runs)
        if (testConfig) {
          if (!testProjUri)
            throw new Error("testProjUri must be supplied when testConfig is supplied");
          await recreateRunHandlersAndProfilesAndWatchersAndReparse(testData, projectUris, junitWatcher, testProjUri);
          return;
        }

        // we don't know which workspace was affected (see comment on affectsConfiguration above), so just reparse all workspaces
        // (also, when a workspace is added/removed/renamed (forceRefresh), we need to clear down and reparse all test nodes 
        // to rebuild the top level nodes)
        recreateRunHandlersAndProfilesAndWatchersAndReparse(testData, projectUris, junitWatcher);
      }
      catch (e: unknown) {
        // entry point function (handler) - show error        
        services.logger.showError(e);
      }
    }


    context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(async (event) => {
      await configurationChangedHandler(false, event);
    }));

    xRayLog(`PERF: activate took  ${performance.now() - start} ms`);

    if (context.extensionMode !== vscode.ExtensionMode.Test)
      return;

    return {
      // test mode = return instances in API to support integration testing
      getProjMapEntry: getProjMapEntry,
      testData: testData,
      getStepMappingsForStepsFileFunction: getStepMappingsForStepsFileFunction,
      getStepFileStepForFeatureFileStep: getStepFileStepForFeatureFileStep,
      configurationChangedHandler: configurationChangedHandler,
      getProjectUris: getProjectUris,
      startupPromise: startupPromise
    }

  }
  catch (e: unknown) {
    // entry point function (handler) - show error    
    if (services.config && services.logger) {
      services.logger.showError(e);
    }
    else {
      // no logger yet, use vscode.window.showErrorMessage directly
      const text = (e instanceof Error ? (e.stack ? e.stack : e.message) : e as string);
      vscode.window.showErrorMessage(text);
    }
  }


} // end activate()

async function runStartupTasks(context: vscode.ExtensionContext, testData: TestData, junitWatcher: JunitWatcher): Promise<void> {

  try {

    // INCREASE THIS TO 10000 IF YOU ARE LOOKING AT PERF TIMINGS
    const contentionTimeout = services.config.isIntegrationTestRun ? 3000 : 3000;

    // wait a little to avoid contention, i.e. vscode is busy on startup
    await new Promise(resolve => setTimeout(resolve, contentionTimeout));

    const start = performance.now();

    // get "project" uris, i.e. uris of workspace folders that contain .feature files
    const projUris = await getProjectUris(true);
    if (projUris.length === 0) {
      // this should never happen as the extension should not activate if there is no .feature file
      throw new Error("No workspaces with features found in workspace");
    }

    // get the logger sorted first,
    services.logger.syncOutputChannelsToProjects(projUris);
    logExtensionVersion(context);

    junitWatcher.startWatchingJunitFolder();

    await recreateRunHandlersAndProfilesAndWatchersAndReparse(testData, projUris, junitWatcher);

    xRayLog(`PERF: async runStartupTasks took ${performance.now() - start} ms (if testing PERF timers, increase contentionTimeout)`);
  }
  catch (e: unknown) {
    // unawaited async function - show error
    services.logger.showError(e);
  }
}


async function recreateRunHandlersAndProfilesAndWatchersAndReparse(testData: TestData,
  allProjectUris: vscode.Uri[], junitWatcher: JunitWatcher, projUri?: vscode.Uri): Promise<void> {

  try {
    const start = performance.now();

    const multiRoot = allProjectUris.length > 1 ? true : false;
    // if projUri is supplied, we only want to recreate run handlers/profiles and reparse for that project    
    const projectUris = allProjectUris.filter(x => !projUri || urisMatch(x, projUri));
    console.log(projectUris);


    for (const projUri of projectUris) {

      const ps = await services.config.getProjectSettings(projUri);
      if (!ps.isValid)
        continue;

      const map = projMap.get(ps.id);
      if (map) {
        map.ctrl.dispose();
        map.watcher.dispose();
        map.runProfiles.forEach(r => r.dispose());
        projMap.delete(ps.id);
      }

      const ctrl = vscode.tests.createTestController(`behave-vsc.${ps.name}`, multiRoot ? "Feature Tests: " + ps.name : "Feature Tests");
      const projRunHandler = testRunHandler(ctrl, testData, junitWatcher);
      const projWatcher = ProjectWatcher.create(projUri, ctrl, testData);
      const projRunProfiles = createRunProfilesForProject(ps, multiRoot, ctrl, projRunHandler);
      const projMapEntry = { ctrl: ctrl, runHandler: projRunHandler, watcher: projWatcher, runProfiles: projRunProfiles };
      projMap.set(ps.id, projMapEntry);

      // called by manual refresh button in test explorer
      ctrl.refreshHandler = async (cancelToken: vscode.CancellationToken) => {
        try {
          await services.config.reloadSettings(projUri);
          services.parser.parseFilesForProject(projUri, ctrl, testData, "refreshHandler", false, cancelToken);
        }
        catch (e: unknown) {
          // entry point function (handler) - show error        
          services.logger.showError(e);
        }
      };

      // (recreateRunHandlersAndProfilesAndWatchersAndReparse is normally not awaited)
      await services.parser.parseFilesForProject(projUri, ctrl, testData, "activate", true);
    }

    xRayLog(`PERF: recreateRunHandlersAndProfilesAndWatchersAndReparse took  ${performance.now() - start} ms`);

  }
  catch (e: unknown) {
    // unawaited (except for integration tests) async function - show error       
    services.logger.showError(e);
  }
}



// public API (i.e. the activate function return type) is normally there to be called from other 
// extensions, but we're just using it to return activate's private instances and methods for integration test support.
// (integration tests can also use the instances exposed via diService.services)
export type IntegrationTestAPI = {
  getProjMapEntry: (projUri: vscode.Uri) => ProjMapEntry,
  testData: TestData,
  getStepMappingsForStepsFileFunction: (stepsFileUri: vscode.Uri, lineNo: number) => StepMapping[],
  getStepFileStepForFeatureFileStep: (featureFileUri: vscode.Uri, line: number) => StepFileStep | undefined,
  configurationChangedHandler: (forceRefresh: boolean, event?: vscode.ConfigurationChangeEvent,
    testCfg?: vscode.WorkspaceConfiguration, testProjUri?: vscode.Uri) => Promise<void>,
  getProjectUris: (forceRefresh: boolean) => Promise<vscode.Uri[]>,
  startupPromise: Promise<void>
};

