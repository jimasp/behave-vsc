import * as vscode from "vscode";
import { getLines } from "../common";

const featureRe = /^\s*Feature:(.*)$/i;
const backgroundRe = /^\s*Background:(.*)$/i;
const scenarioRe = /^\s*(Scenario|Scenario Outline|Scenario Template):(.*)$/i;
const scenarioOutlineRe = /^\s*(Scenario Outline|Scenario Template):(.*)$/i;
const examplesRe = /^\s*Examples:(.*)$/i;
const ruleRe = /^\s*Rule:(.*)$/i;

export class DocumentSymbolProvider implements vscode.DocumentSymbolProvider {
  provideDocumentSymbols(
    document: vscode.TextDocument,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    cancelToken: vscode.CancellationToken
  ): vscode.DocumentSymbol[] | undefined {
    const symbols: vscode.DocumentSymbol[] = [];
    const lines = getLines(document.getText());

    let currentFeature: vscode.DocumentSymbol | undefined;
    let currentRule: vscode.DocumentSymbol | undefined;
    let currentScenario: vscode.DocumentSymbol | undefined;

    for (let lineNo = 0; lineNo < lines.length; lineNo++) {
      const line = lines[lineNo].trim();

      // Skip empty lines and comments
      if (line === "" || line.startsWith("#")) {
        continue;
      }

      // Check for Feature
      const featureMatch = featureRe.exec(line);
      if (featureMatch) {
        const featureName = featureMatch[1].trim() || "Feature";
        const range = new vscode.Range(
          new vscode.Position(lineNo, 0),
          new vscode.Position(lineNo, lines[lineNo].length)
        );
        currentFeature = new vscode.DocumentSymbol(
          featureName,
          "",
          vscode.SymbolKind.Module,
          range,
          range
        );
        symbols.push(currentFeature);
        currentRule = undefined;
        currentScenario = undefined;
        continue;
      }

      // Check for Rule
      const ruleMatch = ruleRe.exec(line);
      if (ruleMatch && currentFeature) {
        const ruleName = ruleMatch[1].trim() || "Rule";
        const range = new vscode.Range(
          new vscode.Position(lineNo, 0),
          new vscode.Position(lineNo, lines[lineNo].length)
        );
        currentRule = new vscode.DocumentSymbol(
          ruleName,
          "",
          vscode.SymbolKind.Namespace,
          range,
          range
        );
        currentFeature.children.push(currentRule);
        currentScenario = undefined;
        continue;
      }

      // Check for Background
      const backgroundMatch = backgroundRe.exec(line);
      if (backgroundMatch && currentFeature) {
        const backgroundName = backgroundMatch[1].trim() || "Background";
        const range = new vscode.Range(
          new vscode.Position(lineNo, 0),
          new vscode.Position(lineNo, lines[lineNo].length)
        );
        const backgroundSymbol = new vscode.DocumentSymbol(
          backgroundName,
          "",
          vscode.SymbolKind.Method,
          range,
          range
        );

        if (currentRule) {
          currentRule.children.push(backgroundSymbol);
        } else {
          currentFeature.children.push(backgroundSymbol);
        }
        currentScenario = undefined;
        continue;
      }

      // Check for Scenario or Scenario Outline
      const scenarioMatch = scenarioRe.exec(line);
      if (scenarioMatch && currentFeature) {
        const scenarioName = scenarioMatch[2].trim() || "Scenario";
        const isOutline = scenarioOutlineRe.test(line);
        const range = new vscode.Range(
          new vscode.Position(lineNo, 0),
          new vscode.Position(lineNo, lines[lineNo].length)
        );
        currentScenario = new vscode.DocumentSymbol(
          scenarioName,
          isOutline ? "Scenario Outline" : "Scenario",
          vscode.SymbolKind.Function,
          range,
          range
        );

        if (currentRule) {
          currentRule.children.push(currentScenario);
        } else {
          currentFeature.children.push(currentScenario);
        }
        continue;
      }

      // Check for Examples (as a child of Scenario Outline)
      const examplesMatch = examplesRe.exec(line);
      if (examplesMatch && currentScenario) {
        const examplesName = examplesMatch[1].trim() || "Examples";
        const range = new vscode.Range(
          new vscode.Position(lineNo, 0),
          new vscode.Position(lineNo, lines[lineNo].length)
        );
        const examplesSymbol = new vscode.DocumentSymbol(
          examplesName,
          "",
          vscode.SymbolKind.Property,
          range,
          range
        );
        currentScenario.children.push(examplesSymbol);
        continue;
      }
    }

    return symbols;
  }
}
