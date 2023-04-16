import * as vscode from 'vscode';
import { getWorkspaceUriForFile, getLines } from '../common/helpers';
import { config } from '../common/configuration';

const zeroIndent = /^$|^\s*$|^\s*Feature:.*/
const oneIndent = /^\s*(Background:|Rule:|Scenario:|Scenario Outline:|Scenario Template:).*/;
const twoIndent = /^\s*(Given|When|Then|And|But|Examples:).*/;
const threeIndent = /^\s*\|.*/;
const allIndents = [oneIndent, twoIndent, threeIndent].map(r => r.source).join("|");
const indent = "\t";

// this fires on format document or format selection
export const formatFeatureProvider = {
  async provideDocumentRangeFormattingEdits(document: vscode.TextDocument) {
    try {

      const result = [];
      let featFound = false;
      const lines = getLines(document.getText());
      let indent = "";

      for (let lineNo = 0; lineNo < lines.length; lineNo++) {
        const line = document.lineAt(lineNo).text;

        if (line.trim() === "") {
          if (lineNo > 0) {
            const before = document.lineAt(lineNo - 1).text;
            if (before.trim() === '')
              result.push(vscode.TextEdit.delete(new vscode.Range(new vscode.Position(lineNo - 1, 0), new vscode.Position(lineNo, line.length))));
          }
          continue;
        }

        if (!featFound) {
          const feat = /^\s*Feature:.*/;
          if (feat.test(line))
            featFound = true;
        }

        if (featFound)
          indent = getIndent(indent, lineNo, lines);

        const replacement = getLF(indent, lineNo, lines) + line.replace(/^\s*/, indent).trimEnd();
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

  const line = lines[lineNo].trim();
  const prevLine = lines[lineNo - 1].trim();

  if (prevLine === "" || prevLine.startsWith("#") || prevLine.startsWith("@"))
    return "";
  if (oneIndent.test(line) || line.toLowerCase().startsWith("examples:") || line.startsWith("@"))
    return "\n";

  return "";
}


function getIndent(currentIndent: string, lineNo: number, lines: string[]): string {

  // NOTE: behaviour should be roughly consistent with 
  // gherkin.language-configuration.json (which is used for autoformat while typing). 
  // the difference here is that we enforce the indent based on the current line content, 
  // rather than just on the previous line content.

  const lineRaw = lines[lineNo];
  const line = lineRaw.trim();

  if (zeroIndent.test(line))
    return "";

  if (oneIndent.test(line))
    return indent;

  if (twoIndent.test(line))
    return indent.repeat(2);

  if (threeIndent.test(line))
    return indent.repeat(3);

  // unmatched, so must be a comment line, or a tag line, or a multiline string
  return getNextIndent(currentIndent, lineNo, lines);
}



function getNextIndent(currentIndent: string, lineNum: number, lines: string[]): string {

  let next = 0;
  for (let lineNo = lineNum + 1; lineNo < lines.length; lineNo++) {
    const nextLine = lines[lineNo].trim();
    if (nextLine.match(allIndents)) {
      next = lineNo;
      break;
    }
  }

  if (next === 0)
    return currentIndent;

  return getIndent(currentIndent, next, lines);
}

