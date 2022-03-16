/* eslint-disable @typescript-eslint/ban-ts-comment */
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore: '"vscode"' has no exported member 'StatementCoverage'
import * as vscode from 'vscode';
import config from "./configuration";
import { getContentFromFilesystem, Scenario, testData, TestFile } from './testTree';
import { runBehaveAll } from './runOrDebug';
import { getFeatureNameFromFile } from './featureParser';
import { parseStepsFile, StepDetail, Steps } from './stepsParser';
import { debugStopped, resetDebugStop } from './debugScenario';
import { logActivate, logRunDiagOutput } from './extensionHelpers';
import { gotoStepHandler } from './gotoStepHandler';


const steps: Steps = new Map<string, StepDetail>();
export const getSteps = () => steps;

export interface QueueItem { test: vscode.TestItem; scenario: Scenario }

export async function activate(context: vscode.ExtensionContext) {

  try {

    logActivate(context);

    const ctrl = vscode.tests.createTestController(`${config.extensionName}.TestController`, 'Feature Tests');
    context.subscriptions.push(ctrl);
    context.subscriptions.push(startWatchingWorkspace(ctrl));
    context.subscriptions.push(vscode.commands.registerCommand("behave-vsc.gotoStep", gotoStepHandler));

    const runHandler = async (debug: boolean, request: vscode.TestRunRequest, cancellation: vscode.CancellationToken) => {

      try {

        logRunDiagOutput(debug);
        const queue: QueueItem[] = [];
        const run = ctrl.createTestRun(request, config.extensionFullName, false);
        config.logger.run = run;
        // map of file uris to statements on each line:
        // @ts-ignore: '"vscode"' has no exported member 'StatementCoverage'
        const coveredLines = new Map</* file uri */ string, (vscode.StatementCoverage | undefined)[]>();

        const discoverTests = async (tests: Iterable<vscode.TestItem>) => {
          for (const test of tests) {
            if (request.exclude?.includes(test)) {
              continue;
            }

            const data = testData.get(test);

            if (data instanceof Scenario) {
              run.enqueued(test);
              queue.push({ test, scenario: data });
            } else {
              if (data instanceof TestFile && !data.didResolve) {
                await data.updateFromDisk(ctrl, test);
              }

              await discoverTests(gatherTestItems(test.children));
            }

            if (test.uri && !coveredLines.has(test.uri.toString())) {
              try {
                const lines = (getContentFromFilesystem(test.uri)).split('\n');
                coveredLines.set(
                  test.uri.toString(),
                  lines.map((lineText, lineNo) =>
                    // @ts-ignore: '"vscode"' has no exported member 'StatementCoverage'
                    lineText.trim().length ? new vscode.StatementCoverage(0, new vscode.Position(lineNo, 0)) : undefined
                  )
                );
              } catch {
                // ignored
              }
            }
          }
        };


        const runTestQueue = async (request: vscode.TestRunRequest) => {

          if (queue.length === 0) {
            const err = "empty queue - nothing to do";
            config.logger.logError(err);
            throw err;
          }

          const allTestsIncluded = (!request.include || request.include.length == 0) && (!request.exclude || request.exclude.length == 0);

          if (!debug && allTestsIncluded && config.userSettings.runAllAsOne) {

            await runBehaveAll(context, run, queue, cancellation);

            for (const qi of queue) {
              updateRun(qi.test, coveredLines, run);
            }

            return;
          }


          const asyncPromises: Promise<void>[] = [];
          resetDebugStop();

          for (const qi of queue) {
            run.appendOutput(`Running ${qi.test.id}\r\n`);
            if (debugStopped() || cancellation.isCancellationRequested) {
              updateRun(qi.test, coveredLines, run);
            }
            else {

              run.started(qi.test);

              if (!config.userSettings.runParallel || debug) {
                await qi.scenario.runOrDebug(context, debug, run, qi, cancellation);
                updateRun(qi.test, coveredLines, run);
              }
              else {
                // async run (parallel)
                const promise = qi.scenario.runOrDebug(context, false, run, qi, cancellation).then(() => {
                  updateRun(qi.test, coveredLines, run)
                });
                asyncPromises.push(promise);
              }
            }
          }

          await Promise.all(asyncPromises);
        };


        let completed = 0;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const updateRun = (test: vscode.TestItem, coveredLines: Map<string, any[]>, run: vscode.TestRun) => {
          if (!test || !test.range || !test.uri)
            throw "invalid test item";

          const lineNo = test.range.start.line;
          const fileCoverage = coveredLines.get(test.uri.toString());
          if (fileCoverage) {
            fileCoverage[lineNo].executionCount++;
          }

          run.appendOutput(`Completed ${test.id}\r\n`);

          completed++;
          if (completed === queue.length) {
            run.end();
          }
        };

        // @ts-ignore: Property 'coverageProvider' does not exist on type 'TestRun'
        run.coverageProvider = {
          provideFileCoverage() {
            // @ts-ignore: '"vscode"' has no exported member 'FileCoverage'
            const coverage: vscode.FileCoverage[] = [];
            for (const [uri, statements] of coveredLines) {
              coverage.push(
                // @ts-ignore: '"vscode"' has no exported member 'FileCoverage'
                vscode.FileCoverage.fromDetails(
                  vscode.Uri.parse(uri),
                  // @ts-ignore: '"vscode"' has no exported member 'StatementCoverage'
                  statements.filter((s): s is vscode.StatementCoverage => !!s)
                )
              );
            }

            return coverage;
          },
        };

        await discoverTests(request.include ?? gatherTestItems(ctrl.items));
        await runTestQueue(request);

        return queue;

      }
      catch (e: unknown) {
        config.logger.logError(e);
      }

    };


    const refreshHandler = async () => {
      try {
        await findInitialFeatureFiles(ctrl, true);
      }
      catch (e: unknown) {
        config.logger.logError(e);
      }
    };
    // @ts-ignore: Property 'refreshHander' does not exist on type 'TestController'
    ctrl.refreshHandler = refreshHandler;

    vscode.workspace.onDidChangeConfiguration(async (e) => {
      try {
        if (e.affectsConfiguration(config.extensionName)) {
          config.reloadUserSettings();
          await refreshHandler();
        }
      }
      catch (e: unknown) {
        config.logger.logError(e);
      }
    });


    ctrl.createRunProfile('Run Tests',
      vscode.TestRunProfileKind.Run,
      (request: vscode.TestRunRequest, token: vscode.CancellationToken) => {
        runHandler(false, request, token);
      }
      , true);

    ctrl.createRunProfile('Debug Tests',
      vscode.TestRunProfileKind.Debug,
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
          await data.updateFromDisk(ctrl, item);
        }
      }
      catch (e: unknown) {
        config.logger.logError(e);
      }
    };


    const updateNodeForDocument = (e: vscode.TextDocument) => {
      const created = getOrCreateFile(ctrl, e.uri);
      if (created)
        created.data.updateFromContents(ctrl, e.getText(), created.file);
    }

    // for any open documents on startup
    for (const document of vscode.workspace.textDocuments) {
      updateNodeForDocument(document);
    }

    return { runHandler: runHandler, config: config, ctrl: ctrl, findInitialFiles: findInitialFeatureFiles }; // support extensiontest.ts

  }
  catch (e: unknown) {
    if (config)
      config.logger.logError(e);
    else {
      // this should never happen
      const text = (e instanceof Error ? (e.stack ? e.stack : e.message) : e as string);
      vscode.window.showErrorMessage(text);
    }
  }


} // end activate()


function getOrCreateFile(controller: vscode.TestController, uri: vscode.Uri): { file: vscode.TestItem, data: TestFile } | undefined {

  if (uri.scheme !== "file" || !uri.path.endsWith('.feature')) {
    return undefined;
  }

  const existing = controller.items.get(uri.toString());
  if (existing) {
    return { file: existing, data: testData.get(existing) as TestFile };
  }

  const featureName = getFeatureNameFromFile(uri);
  if (featureName === null)
    return undefined;

  // support e.g. /group1.features/ parentGroup folder node
  let parentGroup: vscode.TestItem | undefined = undefined;
  const featuresFolderIndex = uri.path.lastIndexOf("/features/") + "/features/".length;
  const sfp = uri.path.substring(featuresFolderIndex);
  if (sfp.indexOf("/") !== -1) {
    const groupName = sfp.split("/")[0];
    parentGroup = controller.items.get(groupName);
    if (!parentGroup) {
      parentGroup = controller.createTestItem(groupName, groupName, undefined);
      parentGroup.canResolveChildren = true;
    }
  }

  const file = controller.createTestItem(uri.toString(), featureName, uri);
  controller.items.add(file);

  if (parentGroup !== undefined) {
    parentGroup.children.add(file);
    controller.items.add(parentGroup);
  }

  const data = new TestFile();
  testData.set(file, data);

  file.canResolveChildren = true;

  return { file, data };
}

function gatherTestItems(collection: vscode.TestItemCollection) {
  const items: vscode.TestItem[] = [];
  collection.forEach((item: vscode.TestItem) => items.push(item));
  return items;
}



async function findInitialFeatureFiles(controller: vscode.TestController, reparse?: boolean) {
  controller.items.forEach(item => controller.items.delete(item.id));
  const featureFiles1 = await vscode.workspace.findFiles("**/features/*.feature");
  const featureFiles2 = await vscode.workspace.findFiles("**/features/**/*.feature");
  const featureFiles = featureFiles1.concat(featureFiles2);

  for (const featureFile of featureFiles) {
    const created = getOrCreateFile(controller, featureFile);
    if (created && reparse) {
      await created.data.updateFromDisk(controller, created.file);
    }
  }
}

async function findInitialStepsFiles() {
  steps.clear();
  const stepFiles1 = await vscode.workspace.findFiles("**/features/steps/*.py");
  const stepFiles2 = await vscode.workspace.findFiles("**/features/steps/**/*.py");
  const stepFiles = stepFiles1.concat(stepFiles2);

  for (const stepFile of stepFiles) {
    updateSteps(stepFile);
  }
}

function startWatchingWorkspace(controller: vscode.TestController) {

  // ** = not just .feature files, also support folder changes
  const watcher = vscode.workspace.createFileSystemWatcher('**/features/**');

  watcher.onDidCreate(uri => {

    try {

      if (uri.path.indexOf("/steps/") !== -1) {
        updateSteps(uri);
        return;
      }

      if (uri.path.toLowerCase().endsWith(".feature"))
        getOrCreateFile(controller, uri);
      else if (uri.path.toLowerCase().endsWith("/"))
        findInitialFeatureFiles(controller);

    }
    catch (e: unknown) {
      config.logger.logError(e);
    }

  });

  watcher.onDidChange(uri => {

    try {

      if (uri.path.indexOf("/steps/") !== -1) {
        updateSteps(uri);
        return;
      }

      if (uri.path.toLowerCase().endsWith(".feature")) {
        const created = getOrCreateFile(controller, uri);
        if (created) {
          created.data.updateFromDisk(controller, created.file);
        }
      }
      else if (uri.path.toLowerCase().endsWith("/"))
        findInitialFeatureFiles(controller);

    }
    catch (e: unknown) {
      config.logger.logError(e);
    }

  });


  watcher.onDidDelete(uri => {
    try {

      if (uri.path.indexOf("/steps/") !== -1) {
        updateSteps(uri);
        return;
      }

      if (uri.path.toLowerCase().endsWith(".feature"))
        getOrCreateFile(controller, uri);
      else if (uri.path.toLowerCase().endsWith("/"))
        findInitialFeatureFiles(controller);

    }
    catch (e: unknown) {
      config.logger.logError(e);
    }

  });

  findInitialFeatureFiles(controller, true);
  findInitialStepsFiles();

  return watcher;



}


function updateSteps(uri: vscode.Uri) {
  if (uri.path.toLowerCase().endsWith(".py")) {
    const content = getContentFromFilesystem(uri);
    parseStepsFile(uri, content, steps);
  }
  else if (uri.path.toLowerCase().endsWith("/"))
    findInitialStepsFiles();
}
