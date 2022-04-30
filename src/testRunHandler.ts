import * as vscode from 'vscode';
import config from "./Configuration";
import { WorkspaceSettings } from "./WorkspaceSettings";
import { Scenario, testData, TestFile } from './TestFile';
import { runBehaveAll } from './behaveRunOrDebug';
import { countTestItemsInArray, getAllTestItems, getContentFromFilesystem, getWorkspaceFolderUris, getWorkspaceSettingsForFile } from './helpers';
import { performance } from 'perf_hooks';
import { parser, QueueItem } from './extension';

export let debugCancelSource = new vscode.CancellationTokenSource();


export function testRunHandler(ctrl: vscode.TestController) {
  return async (debug: boolean, request: vscode.TestRunRequest, cancellation: vscode.CancellationToken) => {

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

    try {

      const queue: QueueItem[] = [];
      const run = ctrl.createTestRun(request, `${performance.now()}`, false);
      config.logger.run = run;

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

          if (test.uri && !coveredLines.has(test.uri.toString())) {
            try {
              const lines = (await getContentFromFilesystem(test.uri)).split('\n');
              coveredLines.set(
                test.uri.toString(),
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

      const runWorkspaceQueue = async (request: vscode.TestRunRequest, wkspSettings: WorkspaceSettings) => {

        const wkspPath = wkspSettings.uri.path;
        const asyncRunPromises: Promise<void>[] = [];

        const wkspQueue = queue.filter(item => {
          return item.test.uri?.path.startsWith(wkspSettings.fullFeaturesPath);
        });

        if (wkspQueue.length === 0)
          return;

        config.logger.logInfo(`--- workspace ${wkspPath} tests started for run ${run.name}---`);


        let allTestsForThisWkspIncluded = (!request.include || request.include.length == 0) && (!request.exclude || request.exclude.length == 0);

        if (!allTestsForThisWkspIncluded) {
          const wkspGrandParentItem = wkspQueue.find(item => item.test.id === wkspSettings.uri.path);

          if (wkspGrandParentItem && request.include?.includes(wkspGrandParentItem.test))
            allTestsForThisWkspIncluded = true;
          else {
            const allWkspItems = getAllTestItems(ctrl.items).filter(item => item.id.includes(wkspPath));
            const wkspTestCount = countTestItemsInArray(allWkspItems).testCount;
            allTestsForThisWkspIncluded = request.include?.length === wkspTestCount;
          }
        }


        if (wkspSettings.runAllAsOne && !debug && allTestsForThisWkspIncluded) {
          wkspQueue.forEach(wkspQueueItem => run.started(wkspQueueItem.test));
          await runBehaveAll(wkspSettings, run, wkspQueue, cancellation);
          for (const qi of wkspQueue) {
            updateRun(qi.test, coveredLines, run);
          }
          return;
        }


        for (const wkspQueueItem of wkspQueue) {

          const runDiag = `Running ${wkspQueueItem.test.id} for run ${run.name}\r\n`;
          run.appendOutput(runDiag);
          console.log(runDiag);

          if (debugCancelSource.token.isCancellationRequested || cancellation.isCancellationRequested) {
            updateRun(wkspQueueItem.test, coveredLines, run);
          }
          else {
            run.started(wkspQueueItem.test);
            if (!wkspSettings.runParallel || debug) {
              await wkspQueueItem.scenario.runOrDebug(wkspSettings, debug, run, wkspQueueItem, debugCancelSource.token);
              updateRun(wkspQueueItem.test, coveredLines, run);
            }
            else {
              // async run (parallel)
              const promise = wkspQueueItem.scenario.runOrDebug(wkspSettings, false, run, wkspQueueItem, cancellation).then(() => {
                updateRun(wkspQueueItem.test, coveredLines, run);
              });
              asyncRunPromises.push(promise);
            }
          }
        }

        // either we're done (non-async run), or we have promises to await
        await Promise.all(asyncRunPromises);
        config.logger.logInfo(`\n--- ${wkspPath} tests completed for run ${run.name} ---`);

      };


      const runTestQueue = async (request: vscode.TestRunRequest) => {

        config.logger.clear();
        config.logger.logInfo(`\n=== starting test run ${run.name} ===\n`);

        if (queue.length === 0) {
          const err = "empty queue - nothing to do";
          config.logger.logError(err);
          throw err;
        }

        const wkspRunPromises: Promise<void>[] = [];
        debugCancelSource.dispose();
        debugCancelSource = new vscode.CancellationTokenSource();


        // run each workspace queue in parallel (unless debug)
        for (const wkspUri of getWorkspaceFolderUris()) {
          const wkspSettings = config.getWorkspaceSettings(wkspUri);
          if (debug || !wkspSettings.runWorkspacesInParallel)
            await runWorkspaceQueue(request, wkspSettings); // limit to one debug session

          else
            wkspRunPromises.push(runWorkspaceQueue(request, wkspSettings));
        }

        await Promise.all(wkspRunPromises);

        config.logger.logInfo(`\n=== test run ${run.name} complete ===\n`);
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
    }

  };
}


function gatherTestItems(collection: vscode.TestItemCollection) {
  const items: vscode.TestItem[] = [];
  collection.forEach((item: vscode.TestItem) => items.push(item));
  return items;
}




