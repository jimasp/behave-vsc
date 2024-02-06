import * as vscode from 'vscode';
import { getProjectSettingsForFile, getProjectUriForFile, sepr } from '../common/helpers';
import { services } from '../common/services';
import { featureFileStepRe } from "../parsers/featureParser";
import { getStepFilesSteps } from '../parsers/stepsParser';


// provides autocompletion in feature files (i.e. available steps) after typing "Given", "When", "Then", "And", "But"
export const autoCompleteProvider = {
  async provideCompletionItems(document: vscode.TextDocument, position: vscode.Position): Promise<vscode.CompletionItem[] | undefined> {
    try {
      const lcLine = document.lineAt(position).text.trimStart().toLowerCase();
      const step = featureFileStepRe.exec(lcLine);
      if (!step)
        return;

      const projSettings = await getProjectSettingsForFile(document.uri);
      if (!projSettings)
        return;

      const stepType = step[1].trim();
      const textWithoutType = step[2].trim();

      let matchText1 = `^${stepType}${sepr}${textWithoutType}`;
      const matchText2 = `^step${sepr}${textWithoutType}`;

      // if step is "and" or "but", find the previous step and substitute that step type 
      // as matchText1 (e.g. and I do something -> given I do something, when I do something, etc.)
      if (stepType === "and" || stepType === "but") {
        for (let i = position.line - 1; i > -1; i--) {
          const lcPrevLine = document.lineAt(i).text.trimStart().toLowerCase();
          const prevStep = featureFileStepRe.exec(lcPrevLine);
          if (prevStep && prevStep[1].trim() !== "and" && prevStep[1].trim() !== "but") {
            const prevStepType = prevStep[1].trim();
            matchText1 = `^${prevStepType}${sepr}${textWithoutType}`;
            break;
          }
        }
      }

      const stepFileSteps = getStepFilesSteps(projSettings.uri);
      const items: vscode.CompletionItem[] = [];

      // find stepFileSteps that match either:
      // (a) matchText1: the text typed so far (with "and"/"but" switched if required), or 
      // (b) matchText2: "step" + text typed so far
      for (const [key, value] of stepFileSteps) {
        const lcKey = key.toLowerCase();
        if (lcKey.startsWith(matchText1) || lcKey.startsWith(matchText2)) {
          let itemText = value.textAsRe.startsWith(".*") ? " " + value.textAsRe.slice(1) : value.textAsRe;
          itemText = value.textAsRe.replaceAll(".*", "?");
          // deal with e.g \( escapes in textAsRe
          itemText = itemText.replaceAll("\\\\", "#@slash@#").replaceAll("\\", "").replaceAll("#@slash@#", "\\");
          itemText = itemText.replace(textWithoutType, "").trim();
          const item = new vscode.CompletionItem(itemText, vscode.CompletionItemKind.Function);
          item.detail = vscode.workspace.asRelativePath(value.uri, false);
          items.push(item);
        }
      }

      return items;
    }
    catch (e: unknown) {
      // entry point function (handler) - show error  
      try {
        const projUri = getProjectUriForFile(document.uri);
        services.logger.showError(e, projUri);
      }
      catch {
        services.logger.showError(e);
      }
    }
  }

}


