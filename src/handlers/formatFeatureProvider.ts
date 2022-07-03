import * as vscode from 'vscode';
import { getWorkspaceUriForFile } from '../common';
import { config } from '../configuration';


// this fires on format document or format selection
export const formatFeatureProvider = {
  provideDocumentRangeFormattingEdits(document: vscode.TextDocument) {
    try {

      const result = [];
      const lines = document.getText().split("\n");
      let indent = "";

      for (let lineNo = 0; lineNo < lines.length; lineNo++) {
        const line = document.lineAt(lineNo).text;

        let replacement = "";

        if (line.trim() === "") {
          if (lineNo > 0) {
            const before = document.lineAt(lineNo - 1).text;
            if (before.trim() === '')
              result.push(vscode.TextEdit.delete(new vscode.Range(new vscode.Position(lineNo - 1, 0), new vscode.Position(lineNo, line.length))));
          }
          continue;
        }

        indent = getIndent(indent, line);
        replacement = line.replace(/^\s*/, indent);
        result.push(new vscode.TextEdit(new vscode.Range(new vscode.Position(lineNo, 0), new vscode.Position(lineNo, line.length)), replacement));
      }

      return result;
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



function getIndent(prevIndent: string, line: string) {

  // note - behaviour should basically match up with 
  // gherkin.language-configuration.json - which is used for autoformat while typing
  const zeroIndent = /^$|^\s*$|^\s*Feature:.*/
  const oneIndent = /^\s*(@|Background:|Rule:|Scenario:|Scenario Outline:|Scenario Template:).*/;
  const twoIndent = /^\s*(Given|When|Then|And|But|Examples:).*/;
  const threeIndent = /^\s*\|.*/;
  const indentSpaces = "   ";

  if (line.startsWith("#"))
    return prevIndent;

  if (zeroIndent.test(line))
    return "";

  if (oneIndent.test(line))
    return indentSpaces;

  if (twoIndent.test(line))
    return indentSpaces.repeat(2);

  if (threeIndent.test(line))
    return indentSpaces.repeat(3);

  return prevIndent;
}

