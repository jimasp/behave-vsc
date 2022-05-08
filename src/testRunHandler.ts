import * as vscode from 'vscode';
import config from "./Configuration";
import { WorkspaceSettings } from "./WorkspaceSettings";
import { Scenario, TestFile } from './TestFile';
import { runBehaveAll, runOrDebugBehaveScenario } from './runOrDebug';
import { countTestItems, getAllTestItems, getContentFromFilesystem, getIdForUri, getWorkspaceFolderUris, getWorkspaceSettingsForFile } from './helpers';
import { customAlphabet } from 'nanoid';
import { QueueItem, testData } from './extension';
import { FileParser } from './FileParser';

// TODO - subscribe/dispose this on extension deactivation 
// (with thorough manual retest of debug and run stop/start)
// ALTERNATIVELY consider rewrite for run one-shot debug mode (maybe try that first?)
export let debugCancelSource: vscode.CancellationTokenSource;

// TODO refactor
export function testRunHandler(ctrl: vscode.TestController, parser: FileParser, cancelRemoveDirectoryRecursiveSource: vscode.CancellationTokenSource) {
  return async (debug: boolean, request: vscode.TestRunRequest, runToken: vscode.CancellationToken) => {

    // the test tree is built as a background process which is called from a few places
    // (and it will be slow during vscode startup due to contention), so we don't want to await it except on user request (refresh click),
    // but at the same time, we also don't want to allow test runs when the tests items are out of date vs the file system
    const ready = await parser.readyForRun(1000);
    if (!ready) {
      const msg = "cannot run tests while test items are still updating, please try again";
      console.warn(msg);
      vscode.window.showWarningMessage(msg);
      return;
    }

    cancelRemoveDirectoryRecursiveSource.cancel();
    debugCancelSource = new vscode.CancellationTokenSource();
    const combinedSource = new vscode.CancellationTokenSource();
    const combinedToken = combinedSource.token;

    const debugCancelHandler = debugCancelSource.token.onCancellationRequested(() => {
      combinedSource.cancel();
    });

    const runCancelHandler = runToken.onCancellationRequested(() => {
      combinedSource.cancel();
    });


    const queue: QueueItem[] = [];
    const run_id = customAlphabet('1234567890', 6);
    const run = ctrl.createTestRun(request, `${run_id()}`, false);

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
              await data.updateScenarioTestItemsFromFeatureFileOnDisk(wkspSettings, ctrl, test, "queueSelectedItems");
            }

            await queueSelectedTestItems(gatherTestItems(test.children));
          }

          if (test.uri && !coveredLines.has(getIdForUri(test.uri))) {
            try {
              const lines = (await getContentFromFilesystem(test.uri)).split('\n');
              coveredLines.set(
                getIdForUri(test.uri),
                lines.map((lineText, lineNo) =>
                  // eslint-disable-next-line @typescript-eslint/ban-ts-comment                
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


      const runWorkspaceQueue = async (request: vscode.TestRunRequest, wkspQueue: QueueItem[], wkspSettings: WorkspaceSettings) => {

        const wkspPath = wkspSettings.uri.path;
        const asyncRunPromises: Promise<void>[] = [];

        const start = Date.now();
        if (!debug)
          config.logger.logInfo(`--- workspace ${wkspPath} tests started for run ${run.name} @${new Date().toISOString()} ---\n`, wkspSettings.uri, run);

        const logComplete = () => {
          const end = Date.now();
          if (!debug) {
            config.logger.logInfo(`\n--- ${wkspPath} tests completed for run ${run.name} @${new Date().toISOString()} (${(end - start) / 1000} secs)---`,
              wkspSettings.uri, run);
          }
        }

        let allTestsForThisWkspIncluded = (!request.include || request.include.length == 0) && (!request.exclude || request.exclude.length == 0);

        if (!allTestsForThisWkspIncluded) {
          const wkspGrandParentItemIncluded = request.include?.filter(item => item.id === wkspSettings.uri.path).length === 1;

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
          console.log(runDiag);

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
      };


      const runTestQueue = async (request: vscode.TestRunRequest) => {

        if (!debug)
          run.appendOutput(`\n=== starting test run ${run.name} @${new Date().toISOString()} ===\n`);

        if (queue.length === 0) {
          throw "empty queue - nothing to do";
        }

        const wkspRunPromises: Promise<void>[] = [];
        const winSettings = config.getWindowSettings();

        // run each workspace queue
        for (const wkspUri of getWorkspaceFolderUris()) {
          const wkspSettings = config.getWorkspaceSettings(wkspUri);

          const wkspQueue = queue.filter(item => {
            return item.test.uri?.path.startsWith(wkspSettings.featuresUri.path);
          });

          if (wkspQueue.length === 0)
            continue;

          if (!debug) {
            config.logger.clear(wkspUri);
            if (winSettings.alwaysShowOutput)
              config.logger.show(wkspUri);
          }

          if (debug || !winSettings.runWorkspacesInParallel) // limit to one debug session
            await runWorkspaceQueue(request, wkspQueue, wkspSettings);
          else
            wkspRunPromises.push(runWorkspaceQueue(request, wkspQueue, wkspSettings));
        }

        if (winSettings.runWorkspacesInParallel)
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

        const runDiag = `${test.id} completed for run ${run.name}\r\n`;
        run.appendOutput(runDiag);
        console.log(runDiag);

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
      config.logger.logError(e);
      run.end();
    }
    finally {
      debugCancelSource.dispose();
      debugCancelHandler.dispose();
      runCancelHandler.dispose();
    }

  };
}


function gatherTestItems(collection: vscode.TestItemCollection) {
  const items: vscode.TestItem[] = [];
  collection.forEach((item: vscode.TestItem) => items.push(item));
  return items;
}




