import * as vscode from 'vscode';
import { getParentProjectUri, getLines } from '../common/helpers';
import { services } from '../common/services';

const zeroIndent = /^$|^\s*$|^\s*Feature:.*/
const oneIndent = /^\s*(Background:|Rule:|Scenario:|Scenario Outline:|Scenario Template:).*/;
const twoIndent = /^\s*(Given|When|Then|And|But|Examples:).*/;
const threeIndent = /^\s*\|.*/;
const allIndents = [oneIndent, twoIndent, threeIndent].map(r => r.source).join("|");


// this fires on "format document" or "format selection/paste" or "format on save"
// (gherkin.language-configuration.json sets indentation used on typing out a feature file, e.g. pressing enter)
export const formatFeatureProvider = {
  async provideDocumentRangeFormattingEdits(document: vscode.TextDocument, range: vscode.Range,
    options: vscode.FormattingOptions, cancelToken: vscode.CancellationToken): Promise<vscode.TextEdit[] | undefined> {

    try {

      const result = [];

      const start = new vscode.Position(range.start.line, 0);
      const end = new vscode.Position(range.end.line, document.lineAt(range.end.line).text.length);
      const fullLines = new vscode.Range(start, end);
      const selectedLines = getLines(document.getText(fullLines));

      const { insertSpaces, tabSize } = options;
      const indentChars = insertSpaces ? " ".repeat(tabSize) : "\t";
      let indent = "";
      let aboveFeatureLine = selectedLines.findIndex(l => /^\s*Feature:.*/.test(l)) > -1;
      let lineIndex = -1;

      for (let docLineNo = range.start.line; docLineNo <= range.end.line; docLineNo++) {
        if (cancelToken.isCancellationRequested)
          break;
        lineIndex++;

        const line = selectedLines[lineIndex];

        if (line.trim() === "") {
          if (docLineNo > 0) {
            const before = document.lineAt(docLineNo - 1).text;
            if (before.trim() === '')
              result.push(vscode.TextEdit.delete(new vscode.Range(new vscode.Position(docLineNo - 1, 0), new vscode.Position(docLineNo, line.length))));
          }
          continue;
        }

        if (aboveFeatureLine) {
          indent = "";
          const feat = /^\s*Feature:.*/;
          if (feat.test(line))
            aboveFeatureLine = false;
        }
        else {
          indent = getIndent(indentChars, indent, lineIndex, selectedLines);
        }

        const replacement = getLF(lineIndex, selectedLines) + line.replace(/^\s*/, indent).trimEnd();
        result.push(new vscode.TextEdit(new vscode.Range(new vscode.Position(docLineNo, 0), new vscode.Position(docLineNo, line.length)), replacement));
      }

      return result;

    }
    catch (e: unknown) {
      // entry point function (handler) - show error  
      try {
        const projUri = getParentProjectUri(document.uri);
        services.logger.logError(e, projUri);
      }
      catch {
        services.logger.logError(e);
      }
    }
  }
}


function getLF(lineNo: number, lines: string[]): string {

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


function getIndent(indentChars: string, currentIndent: string, lineNo: number, lines: string[]): string {

  // NOTE: behaviour should be roughly consistent with 
  // gherkin.language-configuration.json (which is used for autoformat while typing). 
  // the difference here is that we enforce the indent based on the current line content, 
  // rather than just on the previous line content.

  const lineRaw = lines[lineNo];
  const line = lineRaw.trim();

  if (zeroIndent.test(line))
    return "";

  if (oneIndent.test(line))
    return indentChars;

  if (twoIndent.test(line))
    return indentChars.repeat(2);

  if (threeIndent.test(line))
    return indentChars.repeat(3);

  // unmatched, e.g. a comment line, or a tag line, or a multiline string
  return getNextIndent(indentChars, currentIndent, lineNo, lines);
}



function getNextIndent(indentChars: string, currentIndent: string, lineNum: number, lines: string[]): string {

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

  return getIndent(indentChars, currentIndent, next, lines);
}

