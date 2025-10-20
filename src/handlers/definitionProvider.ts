import * as vscode from "vscode";
import { config } from "../configuration";
import { getWorkspaceUriForFile, isFeatureFile } from "../common";
import { getStepFileStepForFeatureFileStep, waitOnReadyForStepsNavigation } from "../parsers/stepMappings";
import { featureFileStepRe } from "../parsers/featureParser";


export class DefinitionProvider implements vscode.DefinitionProvider {
  async provideDefinition(
    document: vscode.TextDocument,
    position: vscode.Position
  ): Promise<vscode.Location | vscode.LocationLink[] | undefined> {
    const docUri = document.uri;

    try {
      if (!docUri || !isFeatureFile(docUri)) {
        return undefined;
      }

      const lineNo = position.line;
      const lineText = document.lineAt(lineNo).text.trim();
      const stExec = featureFileStepRe.exec(lineText);
      if (!stExec) {
        return undefined;
      }

      if (!await waitOnReadyForStepsNavigation(500, docUri)) {
        return undefined;
      }

      const stepFileStep = getStepFileStepForFeatureFileStep(docUri, lineNo);

      if (!stepFileStep) {
        return undefined;
      }

      // Find the start of the step text (after the Given/When/Then/And/But keyword)
      const line = document.lineAt(lineNo);
      const trimmedStart = line.text.indexOf(lineText);
      const originRange = new vscode.Range(
        new vscode.Position(lineNo, trimmedStart),
        new vscode.Position(lineNo, line.text.length)
      );

      // Return a LocationLink with originSelectionRange to control the underlined span
      return [{
        originSelectionRange: originRange,
        targetUri: stepFileStep.uri,
        targetRange: stepFileStep.functionDefinitionRange,
        targetSelectionRange: stepFileStep.functionDefinitionRange
      }];
    }
    catch (e: unknown) {
      try {
        const wkspUri = getWorkspaceUriForFile(docUri);
        config.logger.showError(e, wkspUri);
      }
      catch {
        config.logger.showError(e);
      }
      return undefined;
    }
  }
}
