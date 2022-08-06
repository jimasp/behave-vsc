import * as vscode from 'vscode';
import { getWorkspaceUriForFile, getLines } from '../common';
import { config } from '../configuration';


// this fires on format document or format selection
export const formatFeatureProvider = {
  provideDocumentRangeFormattingEdits(document: vscode.TextDocument) {
    try {

      const result = [];
      const lines = getLines(document.getText());
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

        indent = getIndent(indent, lineNo, lines);
        replacement = getLF(indent, lineNo, lines) + line.replace(/^\s*/, indent);
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


function getLF(indent: string, lineNo: number, lines: string[]): string {
  if (lineNo === 0)
    return "";
  const prevLine = lines[lineNo - 1].trim();
  if (prevLine === "" || prevLine.startsWith("#") || prevLine.startsWith("@"))
    return "";
  return indent.length === indentSpaces.length ? "\n" : "";
}


const indentSpaces = "   ";
function getIndent(prevIndent: string, lineNo: number, lines: string[]): string {

  // note - behaviour should basically match up 
  // with gherkin.language-configuration.json - which is used for autoformat while typing
  const zeroIndent = /^$|^\s*$|^\s*Feature:.*/
  const oneIndent = /^\s*(@|Background:|Rule:|Scenario:|Scenario Outline:|Scenario Template:).*/;
  const twoIndent = /^\s*(Given|When|Then|And|But|Examples:).*/;
  const threeIndent = /^\s*\|.*/;


  const line = lines[lineNo];
  const nextLine = lineNo + 1 < lines.length ? lines[lineNo + 1] : undefined;
  if (nextLine && (line.startsWith("#") || line.startsWith("@")))
    return getIndent("", lineNo + 1, lines);

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

