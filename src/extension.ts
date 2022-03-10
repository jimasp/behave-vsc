/* eslint-disable @typescript-eslint/ban-ts-comment */
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore: '"vscode"' has no exported member 'StatementCoverage'
import * as vscode from 'vscode';
import config from "./configuration";
import { getContentFromFilesystem, Scenario, testData, TestFile } from './testTree';
import { runBehaveAll } from './runOrDebug';
import { getFeatureNameFromFile } from './featureParser';
import { parseStepsFile, StepDetail, Steps } from './stepsParser';


function logRunHandlerDiagOutput() {
  config.logger.clear();
  config.logger.logInfo(`user configuration: ${JSON.stringify(config.userSettings, null, 2)}\n`);
  config.logger.logInfo("equivalent commands:");
  config.logger.logInfo(`cd "${config.workspaceFolderPath}"`);
}

function logActivate(context:vscode.ExtensionContext) {
  let version:string = context.extension.packageJSON.version;
  if(version.startsWith("0")) {
    version += " pre-release";
  }
  config.logger.logInfo(`activated (version ${version})`);
}

const steps:Steps = new Map<string, StepDetail>();

export interface QueueItem { test: vscode.TestItem; scenario: Scenario }

export async function activate(context: vscode.ExtensionContext) {

  logActivate(context);

  const ctrl = vscode.tests.createTestController(`${config.extensionName}.TestController`, 'Feature Tests');
  context.subscriptions.push(ctrl);
  context.subscriptions.push(startWatchingWorkspace(ctrl));
  context.subscriptions.push(vscode.commands.registerCommand("behave-vsc.gotoStep", gotoStepHandler));

  const runHandler = async (debug: boolean, request: vscode.TestRunRequest, cancellation: vscode.CancellationToken) => {

    logRunHandlerDiagOutput();
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


    const runTestQueue = async(request: vscode.TestRunRequest) => {

      if(queue.length === 0) {
        const err = "empty queue - nothing to do";
        config.logger.logError(err);
        throw err;
      }

      if(!debug && config.userSettings.runAllAsOne &&
        (!request.include || request.include.length == 0) && (!request.exclude || request.exclude.length == 0) ) {

        await runBehaveAll(run, queue, cancellation);

        for (const qi of queue) {
          updateRun(qi.test, coveredLines, run);
        }

        return;
      }

      const asyncPromises:Promise<void>[] = [];


      for (const qi of queue) {
        run.appendOutput(`Running ${qi.test.id}\r\n`);
        if (cancellation.isCancellationRequested) {
          run.skipped(qi.test);
        } else {

          run.started(qi.test);

          if(!config.userSettings.runParallel || debug) {
            // run/debug one by one, or runAllAsOne
            await qi.scenario.runOrDebug(debug, run, qi, cancellation);
            updateRun(qi.test, coveredLines, run);
          }
          else {
            // async run (parallel)
            const promise = qi.scenario.runOrDebug(false, run, qi, cancellation).then(() => {
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
  };

   
  const refreshHandler = async() => {
    await findInitialFeatureFiles(ctrl, true);
  };
  // @ts-ignore: Property 'refreshHander' does not exist on type 'TestController'
  ctrl.refreshHandler = refreshHandler;
  
  vscode.workspace.onDidChangeConfiguration(async(e) => {
    if(e.affectsConfiguration(config.extensionName)) {
      config.reloadUserSettings();
      await refreshHandler();
    }
  });


  ctrl.createRunProfile('Run Tests',
    vscode.TestRunProfileKind.Run,
    (request:vscode.TestRunRequest, token:vscode.CancellationToken) => {
      runHandler(false, request, token);
    }
  , true);

  ctrl.createRunProfile('Debug Tests',
    vscode.TestRunProfileKind.Debug,
    (request:vscode.TestRunRequest, token:vscode.CancellationToken) => {
      runHandler(true, request, token);
    }
  , true);


  ctrl.resolveHandler = async (item: vscode.TestItem|undefined)  => {
    if (!item)
      return;

    const data = testData.get(item);
    if (data instanceof TestFile) {
      await data.updateFromDisk(ctrl, item);      
    }
  };


  function updateNodeForDocument(e: vscode.TextDocument) {
    const created = getOrCreateFile(ctrl, e.uri);
    if(created)
      created.data.updateFromContents(ctrl, e.getText(), created.file);
  }


  // for any open documents on startup
  for (const document of vscode.workspace.textDocuments) {
    updateNodeForDocument(document);
  }

  // removed as it causes side effects on the tree, and also gives misleading updates to the tree before they are actually in effect   
  // context.subscriptions.push(
  //   vscode.workspace.onDidOpenTextDocument(updateNodeForDocument),
  //   vscode.workspace.onDidChangeTextDocument((e: vscode.TextDocumentChangeEvent) => updateNodeForDocument(e.document))
  // );

  return { runHandler: runHandler, config: config, ctrl: ctrl, findInitialFiles: findInitialFeatureFiles}; // support extensiontest.ts

} // end activate()


function getOrCreateFile(controller: vscode.TestController, uri: vscode.Uri) : {file:vscode.TestItem, data:TestFile} |undefined {

  if (uri.scheme !== "file" || !uri.path.endsWith('.feature')) {
    return undefined;
  }

  const existing = controller.items.get(uri.toString());
  if (existing) {
    return { file: existing, data:  testData.get(existing) as TestFile };
  }

  const featureName = getFeatureNameFromFile(uri);
  if(featureName === null)
    return undefined;

  // support e.g. /group1.features/ parentGroup folder node
  let parentGroup:vscode.TestItem|undefined = undefined;
  const featuresFolderIndex = uri.path.lastIndexOf("/features/") + "/features/".length;
  const sfp = uri.path.substring(featuresFolderIndex); 
  if(sfp.indexOf("/") !== -1) {
    const groupName = sfp.split("/")[0];
    parentGroup = controller.items.get(groupName);
    if(!parentGroup) {
      parentGroup = controller.createTestItem(groupName, groupName, undefined);
      parentGroup.canResolveChildren = true;
    }
  }

  const file = controller.createTestItem(uri.toString(), featureName, uri);
  controller.items.add(file);

  if(parentGroup !== undefined) {
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



async function findInitialFeatureFiles(controller: vscode.TestController, reparse?:boolean) {
  controller.items.forEach(item => controller.items.delete(item.id));
  const featureFiles1 = await vscode.workspace.findFiles("**/features/*.feature");      
  const featureFiles2 = await vscode.workspace.findFiles("**/features/**/*.feature");
  const featureFiles = featureFiles1.concat(featureFiles2);

  for (const featureFile of featureFiles) {
    const created = getOrCreateFile(controller, featureFile);
    if(created && reparse){
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

    // not just .feature files, also support folder changes, could change to just .feature files when refreshhandler() works
    const watcher = vscode.workspace.createFileSystemWatcher('**/features/**');  

    watcher.onDidCreate(uri => {
      
      if(uri.path.indexOf("/steps/") !== -1) {
        updateSteps(uri);
        return;
      }

      if(uri.path.toLowerCase().endsWith(".feature"))
        getOrCreateFile(controller, uri);      
      else if(uri.path.toLowerCase().endsWith("/"))
        findInitialFeatureFiles(controller);

    });

    watcher.onDidChange(uri => {
      
      if(uri.path.indexOf("/steps/") !== -1) {
        updateSteps(uri);
        return;
      }      

      if(uri.path.toLowerCase().endsWith(".feature")) {      
        const created = getOrCreateFile(controller, uri);
        if (created) {
          created.data.updateFromDisk(controller, created.file);
        }
      }
      else if(uri.path.toLowerCase().endsWith("/"))
        findInitialFeatureFiles(controller);

    });


    watcher.onDidDelete(uri =>  {
      
      if(uri.path.indexOf("/steps/") !== -1) {
        updateSteps(uri);
        return;
      }

      if(uri.path.toLowerCase().endsWith(".feature"))
        getOrCreateFile(controller, uri);      
      else if(uri.path.toLowerCase().endsWith("/"))
        findInitialFeatureFiles(controller);

    });

    findInitialFeatureFiles(controller, true);    
    findInitialStepsFiles();

    return watcher;

}


function updateSteps(uri:vscode.Uri) {
  if(uri.path.toLowerCase().endsWith(".py")) {
    const content = getContentFromFilesystem(uri);
    parseStepsFile(uri, content, steps);
  }
  else if(uri.path.toLowerCase().endsWith("/"))
    findInitialStepsFiles();
}


function gotoStepHandler(uri: vscode.Uri) {

  function getStepMatch(stepText:string): StepDetail|null {

    let stepMatch:StepDetail|null = null;

    for(const[key, value] of steps) {
      const rx = new RegExp(key);
      const match = rx.exec(stepText);
      if(match && match.length !== 0)  {
        stepMatch = value;
        break;
      }
    }

    if(stepMatch)
      return stepMatch;

    // fallback - reverse the lookup
    for(const[key, value] of steps) {
      const rx = new RegExp("^\\^" + stepText + ".*");
      const match = rx.exec(key);
      if(match && match.length !== 0)  {
        stepMatch = value;
        break;
      }
    }
  
    return stepMatch;
  }

  try {  
    const activeEditor = vscode.window.activeTextEditor;
    if (!activeEditor) {
      return;
    }
    
    let line = activeEditor.document.lineAt(activeEditor.selection.active.line).text.trim();
    if(line.endsWith(":")) // table
      line = line.slice(0,-1);

    const stepRe = /^(\s*)(given|when|then|but|and)(.+)$/i;
    const matches = stepRe.exec(line);
    if(!matches || !matches[3])
      return;

    const stepText = matches[3].trim();
    const stepMatch = getStepMatch(stepText);

    if(!stepMatch) {
      vscode.window.showInformationMessage(`Step '${stepText}' not found`)
      return;
    }

    vscode.workspace.openTextDocument(stepMatch.uri).then(doc => {
      vscode.window.showTextDocument(doc, {preview:false}).then(editor => {
        if(!editor) {
          config.logger.logError("Could not open editor for file:" + uri.fsPath)
          return;
        }
        editor.selection =  new vscode.Selection(stepMatch.range.start, stepMatch.range.end);
        editor.revealRange(stepMatch.range);
      });
    });   
    
  }
  catch(e:unknown) {
    config.logger.logError(e instanceof Error ? (e.stack ? e.stack : e.message) : e as string);
  }
  
  
}


