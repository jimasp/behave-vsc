import * as vscode from 'vscode';
import { getWorkspaceUriForFile, getLines } from '../common';
import { config } from '../configuration';
import { featureFileStepRe } from '../parsers/featureParser';
import { getStepFileStepForFeatureFileStep } from '../parsers/stepMappings';
import { parseRepWildcard } from '../parsers/stepsParser';

const tokenTypes = new Map<string, number>();

export const semLegend = (function () {
	const tokenTypesLegend = ['function'];
	tokenTypesLegend.forEach((tokenType, index) => tokenTypes.set(tokenType, index));
	return new vscode.SemanticTokensLegend(tokenTypesLegend);
})();

interface ParsedToken {
	line: number;
	startCharacter: number;
	length: number;
	tokenType: string;
}

// atm this is just used for colourising step parameters 
// (most colourising is done via gherkin.grammar.json)
export class semHighlightProvider implements vscode.DocumentSemanticTokensProvider {
	async provideDocumentSemanticTokens(document: vscode.TextDocument, cancelToken: vscode.CancellationToken): Promise<vscode.SemanticTokens> {
		try {
			const allTokens = this._parseDoc(document, cancelToken);
			const builder = new vscode.SemanticTokensBuilder();
			allTokens.forEach((token) => {
				builder.push(
					token.line,
					token.startCharacter,
					token.length,
					this._encodeTokenType(token.tokenType),
					undefined
				);
			});
			return builder.build();
		}
		catch (e: unknown) {
			// entry point function (handler)
			try {
				// not worth showing the error to user for this, just log it
				const wkspUri = getWorkspaceUriForFile(document.uri);
				config.logger.showError(`${e}`, wkspUri); // TODO: change to logInfo
			}
			catch {
				config.logger.showError(`${e}`);
			}
			return new vscode.SemanticTokens(new Uint32Array(0));
		}
	}

	private _encodeTokenType(tokenType: string): number {
		const tt = tokenTypes.get(tokenType);
		return tt ? tt : 0;
	}

	private _parseDoc(document: vscode.TextDocument, cancelToken: vscode.CancellationToken): ParsedToken[] {
		const r: ParsedToken[] = [];
		const lines = getLines(document.getText());
		for (let i = 0; i < lines.length; i++) {

			if (cancelToken.isCancellationRequested)
				break;

			const line = lines[i];
			const stepFileStep = getStepFileStepForFeatureFileStep(document.uri, i);

			if (stepFileStep && stepFileStep.textAsRe.includes(parseRepWildcard)) {

				const grpWldText = stepFileStep.textAsRe.replaceAll(parseRepWildcard, `(${parseRepWildcard})`);
				const matches = new RegExp(grpWldText).exec(line);

				if (matches && matches.length > 1) {

					matches.shift();
					matches.forEach((match) => {

						if (stepFileStep.textAsRe.startsWith(parseRepWildcard)) {
							const m = featureFileStepRe.exec(line);
							if (m)
								match = match.replace(m[1], "").trim();
						}

						r.push({
							line: i,
							startCharacter: line.indexOf(match),
							length: match.length,
							tokenType: 'function'
						});

					});
				}

			}

		}

		return r;
	}

}