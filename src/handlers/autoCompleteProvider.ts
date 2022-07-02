import * as vscode from 'vscode';
import { getWorkspaceSettingsForFile, getWorkspaceUriForFile, sepr } from '../common';
import { config } from '../configuration';
import { featureFileStepRe } from "../parsing/featureParser";
import { getStepFileSteps } from '../parsing/stepsParser';


export const autoCompleteProvider = {
  provideCompletionItems(document: vscode.TextDocument, position: vscode.Position): vscode.CompletionItem[] | undefined {
    try {
      const lcLine = document.lineAt(position).text.trimStart().toLowerCase();
      const step = featureFileStepRe.exec(lcLine);
      if (!step)
        return;

      const wkspSettings = getWorkspaceSettingsForFile(document.uri);
      if (!wkspSettings)
        return;

      const stepType = step[1].trim();
      const textWithoutType = step[2].trim();

      let matchText1 = `^${stepType}${sepr}${textWithoutType}`;
      const matchText2 = `^step${sepr}${textWithoutType}`;

      if (stepType === "and" || stepType === "but") {
        const lcPrevLine = document.lineAt(position.line - 1).text.trimStart().toLowerCase();
        const prevStep = featureFileStepRe.exec(lcPrevLine);
        if (!prevStep)
          return;
        const prevStepType = prevStep[1].trim();
        matchText1 = `^${prevStepType}${sepr}${textWithoutType}`;
      }

      const stepFileSteps = getStepFileSteps(wkspSettings.featuresUri);
      const items: vscode.CompletionItem[] = [];

      for (const [key, value] of stepFileSteps) {
        const lcKey = key.toLowerCase();
        if (lcKey.startsWith(matchText1) || lcKey.startsWith(matchText2)) {
          let itemText = value.textAsRe.replaceAll(".*", "?");
          // deal with e.g \( escapes in textAsRe
          itemText = itemText.replaceAll("\\\\", "#@slash@#").replaceAll("\\", "").replaceAll("#@slash@#", "\\");
          const item = new vscode.CompletionItem(itemText, vscode.CompletionItemKind.Snippet);
          item.detail = vscode.workspace.asRelativePath(value.uri);
          // save file to cause file reparse so that step mapping is updated to support immediate "go to stop definition"
          item.command = { command: 'workbench.action.files.save', title: '', arguments: [] };
          items.push(item);
        }
      }

      return items;
    }
    catch (e: unknown) {
      // entry point function (handler) - show error  
      try {
        const wkspUri = getWorkspaceUriForFile(document.uri);
        config.logger.showError(e, wkspUri);
      }
      catch {
        config.logger.showError(e);
      }
    }
  }

}


