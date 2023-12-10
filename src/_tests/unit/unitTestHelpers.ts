// import * as vscode from 'vscode';
// import * as path from 'path';
// import * as fs from 'fs';
// import { DiagLogType, Logger } from '../../common/logger';


// class FakeLogger {
//   // private channels: { [projPath: string]: vscode.OutputChannel; } = {};
//   visible = false;
//   syncChannelsToWorkspaceFolders() { return; }
//   dispose() { return; }
//   show(projUri: vscode.Uri) { return projUri; }
//   clear(projUri: vscode.Uri) { return projUri; }
//   clearAllProjects() { return; }
//   logInfoAllProjects(text: string, run?: vscode.TestRun) { return [text, run]; }
//   logInfo(text: string, projUri: vscode.Uri, run?: vscode.TestRun) { return [text, projUri, run]; }
//   logInfoNoLF(text: string, projUri: vscode.Uri, run?: vscode.TestRun) { return [text, projUri, run]; }
//   logSettingsWarning(text: string, projUri: vscode.Uri, run?: vscode.TestRun) { return [text, projUri, run]; }
//   showWarn(text: string, projUri: vscode.Uri, run?: vscode.TestRun) { return [text, projUri, run]; }
//   showError(error: unknown, projUri?: vscode.Uri | undefined, run?: vscode.TestRun) { return [error, projUri, run]; }
//   getLogs() { return []; }
//   _show = (text: string, projUri: vscode.Uri | undefined, run: vscode.TestRun | undefined, logType: DiagLogType) => {
//     return [text, projUri, run, logType];
//   }
// }

// export const fakeLogger = new FakeLogger() as unknown as Logger;
// export const unitTestWkspFolderUri = vscode.Uri.file(path.resolve(__dirname, './unit test workspace'));
// export const unitTestWkspFolderFsPath = unitTestWkspFolderUri.fsPath;
// fs.mkdirSync(unitTestWkspFolderFsPath, { recursive: true });

