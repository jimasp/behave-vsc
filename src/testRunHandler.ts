import * as vscode from 'vscode';
import { config } from "./configuration";
import { WorkspaceSettings } from "./settings";
import { Scenario, TestData, TestFile } from './testFile';
import { runBehaveAll, runOrDebugBehaveScenario } from './runOrDebug';
import {
  countTestItems, getAllTestItems, getContentFromFilesystem, uriMatchString,
  getUrisOfWkspFoldersWithFeatures, getWorkspaceSettingsForFile, rndAlphaNumeric, rndNumeric
} from './common';
import { QueueItem } from './extension';
import { FileParser } from './fileParser';
import { performance } from 'perf_hooks';
import { diagLog, DiagLogType } from './logger';


// cancellation tokens are one-shot, but this is new'd in each run, then disposed in the finally,
// so cancelTestRun() does not affect subsequent runs
let internalCancelSource: vscode.CancellationTokenSource;

export function disposeCancelTestRunSource() {
  if (internalCancelSource)
    internalCancelSource.dispose();
}

export function cancelTestRun(cancelledBy: string) {
  if (internalCancelSource) {
    diagLog(`\n=== test run CANCELLED by ${cancelledBy} ===\n\n`);
    internalCancelSource.cancel();
  }
}

// TODO refactor
export function testRunHandler(testData: TestData, ctrl: vscode.TestController, parser: FileParser,
  removeTempDirectoryCancelSource: vscode.CancellationTokenSource) {

  return async (debug: boolean, request: vscode.TestRunRequest, testRunStopButtonToken: vscode.CancellationToken) => {

    // the test tree is built as a background process which is called from a few places
    // (and it will be slow during vscode startup due to contention), so we don't want to await it except on user request (refresh click),
    // but at the same time, we also don't want to allow test runs when the tests items are out of date vs the file system
    const ready = await parser.featureParseComplete(1000, "testRunHandler");
    if (!ready) {
      const msg = "Cannot run tests while feature files are being parsed, please try again.";
      diagLog(msg, undefined, DiagLogType.warn);
      vscode.window.showWarningMessage(msg);
      return;
    }

    // stop the temp directory removal function if it is still running
    removeTempDirectoryCancelSource.cancel();

    internalCancelSource = new vscode.CancellationTokenSource();
    const combinedCancelSource = new vscode.CancellationTokenSource();
    const combinedToken = combinedCancelSource.token;

    const debugCancelHandler = internalCancelSource.token.onCancellationRequested(() => {
      combinedCancelSource.cancel();
    });

    const runCancelHandler = testRunStopButtonToken.onCancellationRequested(() => {
      combinedCancelSource.cancel();
    });


    const queue: QueueItem[] = [];
    const run = ctrl.createTestRun(request, rndNumeric(), false);

    try {
      // map of file uris to statements on each line:
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore: '"vscode"' has no exported member 'StatementCoverage'
      const coveredLines = new Map</* file uri */ string, (vscode.StatementCoverage | undefined)[]>();

      const queueSelectedTestItems = async (tests: Iterable<vscode.TestItem>) => {
        for (const test of tests) {
          if (request.exclude?.includes(test)) {
            continue;
          }

          const data = testData.get(test);

          if (data instanceof Scenario) {
            run.enqueued(test);
            queue.push({ test, scenario: data });
          }
          else {
            if (data instanceof TestFile && !data.didResolve) {
              const wkspSettings = getWorkspaceSettingsForFile(test.uri);
              await data.createScenarioTestItemsFromFeatureFile(wkspSettings, testData, ctrl, test, "queueSelectedItems");
            }

            await queueSelectedTestItems(gatherTestItems(test.children));
          }

          if (test.uri && !coveredLines.has(uriMatchString(test.uri))) {
            try {
              const lines = (await getContentFromFilesystem(test.uri)).split('\n');
              coveredLines.set(
                uriMatchString(test.uri),
                lines.map((lineText, lineNo) =>
                  // eslint-disable-next-line @typescript-eslint/ban-ts-comment                
                  // @ts-ignore: '"vscode"' has no exported member 'StatementCoverage'
                  lineText.trim().length ? new vscode.StatementCoverage(0, new vscode.Position(lineNo, 0)) : undefined
                )
              );
            }
            catch {
              // ignore for now
            }
          }
        }
      };


      const runWorkspaceQueue = async (request: vscode.TestRunRequest, wkspQueue: QueueItem[], wkspSettings: WorkspaceSettings) => {

        try {
          const asyncRunPromises: Promise<void>[] = [];

          const start = performance.now();
          if (!debug)
            config.logger.logInfo(`--- ${wkspSettings.name} tests started for run ${run.name} @${new Date().toISOString()} ---\n`, wkspSettings.uri, run);

          const logComplete = () => {
            const end = performance.now();
            if (!debug) {
              config.logger.logInfo(`\n--- ${wkspSettings.name} tests completed for run ${run.name} @${new Date().toISOString()} (${(end - start) / 1000} secs)---`,
                wkspSettings.uri, run);
            }
          }

          let allTestsForThisWkspIncluded = (!request.include || request.include.length == 0) && (!request.exclude || request.exclude.length == 0);

          if (!allTestsForThisWkspIncluded) {
            const wkspGrandParentItemIncluded = request.include?.filter(item => item.id === uriMatchString(wkspSettings.uri)).length === 1;

            if (wkspGrandParentItemIncluded)
              allTestsForThisWkspIncluded = true;
            else {
              const allWkspItems = getAllTestItems(wkspSettings.uri, ctrl.items);
              const wkspTestCount = countTestItems(testData, allWkspItems).testCount;
              allTestsForThisWkspIncluded = request.include?.length === wkspTestCount;
            }
          }


          if (wkspSettings.runAllAsOne && !debug && allTestsForThisWkspIncluded) {
            wkspQueue.forEach(wkspQueueItem => run.started(wkspQueueItem.test));
            await runBehaveAll(wkspSettings, run, wkspQueue, combinedToken);
            for (const qi of wkspQueue) {
              updateRun(qi.test, coveredLines, run);
            }
            logComplete();
            return;
          }



          for (const wkspQueueItem of wkspQueue) {

            const runDiag = `Running ${wkspQueueItem.test.id} for run ${run.name}\r\n`;
            if (!debug)
              run.appendOutput(runDiag);
            diagLog(runDiag, wkspSettings.uri);

            if (combinedToken.isCancellationRequested) {
              updateRun(wkspQueueItem.test, coveredLines, run);
            }
            else {
              run.started(wkspQueueItem.test);
              if (!wkspSettings.runParallel || debug) {
                await runOrDebugBehaveScenario(debug, false, wkspSettings, run, wkspQueueItem, combinedToken);
                updateRun(wkspQueueItem.test, coveredLines, run);
              }
              else {
                // async run (parallel)
                const promise = runOrDebugBehaveScenario(false, true, wkspSettings, run, wkspQueueItem, combinedToken).then((errText) => {
                  updateRun(wkspQueueItem.test, coveredLines, run);
                  return errText;
                });
                asyncRunPromises.push(promise);
              }
            }
          }

          // either we're done (non-async run), or we have promises to await
          await Promise.all(asyncRunPromises);

          logComplete();
        }
        catch (e: unknown) {
          cancelTestRun("runWorkspaceQueue");
          // unawaited (if multiRootRunWorkspacesInParallel) async function - show error
          config.logger.showError(e, wkspSettings.uri, run);
        }
      };


      const runTestQueue = async (request: vscode.TestRunRequest) => {

        if (!debug)
          run.appendOutput(`\n=== starting test run ${run.name} @${new Date().toISOString()} ===\n`);

        if (queue.length === 0) {
          throw "empty queue - nothing to do";
        }

        const wkspRunPromises: Promise<void>[] = [];
        const winSettings = config.globalSettings;

        // run each workspace queue
        for (const wkspUri of getUrisOfWkspFoldersWithFeatures()) {
          const wkspSettings = config.workspaceSettings[wkspUri.path];
          const idMatch = uriMatchString(wkspSettings.featuresUri);
          const wkspQueue = queue.filter(item => item.test.id.includes(idMatch));

          if (wkspQueue.length === 0)
            continue;

          if (!debug)
            config.logger.clear(wkspUri);

          if (debug || !winSettings.multiRootRunWorkspacesInParallel) // limit to one debug session
            await runWorkspaceQueue(request, wkspQueue, wkspSettings);
          else
            wkspRunPromises.push(runWorkspaceQueue(request, wkspQueue, wkspSettings));
        }

        if (winSettings.multiRootRunWorkspacesInParallel)
          await Promise.all(wkspRunPromises);

        if (!debug)
          run.appendOutput(`\n=== test run ${run.name} complete @${new Date().toISOString()} ===\n`);
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
        completed++;
        if (completed === queue.length) {
          run.end();
        }
      };

      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore: Property 'coverageProvider' does not exist on type 'TestRun'
      run.coverageProvider = {
        provideFileCoverage() {
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore: '"vscode"' has no exported member 'FileCoverage'
          const coverage: vscode.FileCoverage[] = [];
          for (const [uri, statements] of coveredLines) {
            coverage.push(
              // eslint-disable-next-line @typescript-eslint/ban-ts-comment
              // @ts-ignore: '"vscode"' has no exported member 'FileCoverage'
              vscode.FileCoverage.fromDetails(
                vscode.Uri.parse(uri),
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore: '"vscode"' has no exported member 'StatementCoverage'
                statements.filter((s): s is vscode.StatementCoverage => !!s)
              )
            );
          }

          return coverage;
        },
      };

      await queueSelectedTestItems(request.include ?? gatherTestItems(ctrl.items));
      await runTestQueue(request);

      return queue;

    }
    catch (e: unknown) {
      // entry point (handler) - log error
      run.end();
      config.logger.showError(e, undefined);
    }
    finally {
      internalCancelSource?.dispose();
      debugCancelHandler?.dispose();
      runCancelHandler?.dispose();
    }

  };
}


function gatherTestItems(collection: vscode.TestItemCollection) {
  const items: vscode.TestItem[] = [];
  collection.forEach((item: vscode.TestItem) => items.push(item));
  return items;
}




