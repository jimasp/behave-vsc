import * as vscode from 'vscode';
import { getWorkspaceUriForFile } from '../common';
import { config } from '../configuration';


// NOTE - THESE SHOULD MATCH language-configuration.json
const increaseIndentPatternRe = /^\s*(Feature|Background|Rule|Scenario|Scenario Outline|Examples):.*/;
const beforeText = /^\s+$/;
const previousLineText = /^(?!\s*Feature:).*$/;


// this fires on format document or format selection
export const formatFeatureProvider = {
  provideDocumentRangeFormattingEdits(document: vscode.TextDocument) {
    try {

      const result = [];
      const lines = document.getText().split("\n");

      for (let lineNo = 0; lineNo < lines.length; lineNo++) {
        const line = document.lineAt(lineNo).text;
        if (line === '' || line.startsWith("#"))
          continue;

        let out = "";

        if (increaseIndentPatternRe.test(line))
          out = "   " + line;

        if (beforeText.test(line) && previousLineText.test(line))
          out = line;

        result.push(new vscode.TextEdit(new vscode.Range(new vscode.Position(lineNo, 0), new vscode.Position(lineNo, line.length)), out));
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