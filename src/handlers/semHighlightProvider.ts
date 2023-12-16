import * as vscode from 'vscode';
import { getProjectUriForFile, getLines } from '../common/helpers';
import { services } from '../diService';
import { parser } from '../extension';
import { featureFileStepRe } from '../parsers/featureParser';
import { getStepFileStepForFeatureFileStep } from '../parsers/stepMappings';
import { parseRepWildcard } from '../parsers/stepsParser';

const tokenTypes = new Map<string, number>();

export const semLegend = (function () {
	const tokenTypesLegend = [
		"missing_step",
		"function",
	];
	tokenTypesLegend.forEach((tokenType, index) => tokenTypes.set(tokenType, index));
	return new vscode.SemanticTokensLegend(tokenTypesLegend);
})();

interface ParsedToken {
	line: number;
	startCharacter: number;
	length: number;
	tokenType: string;
}

// NOTE: most colourising is done via gherkin.grammar.json,
// this is only to do advanced custom highlighting 
// i.e. to highlight step {parameters} and missing steps, by comparing feature file steps against parsed stepmappings
export class SemHighlightProvider implements vscode.DocumentSemanticTokensProvider {

	async provideDocumentSemanticTokens(document: vscode.TextDocument, cancelToken: vscode.CancellationToken): Promise<vscode.SemanticTokens> {

		await parser.stepsParseComplete(2000, "provideDocumentSemanticTokens");

		// line numbers and contents shift for compares, so wouldn't match up 
		// with current step mappings, so skip semhighlight for git scheme
		if (document.uri.scheme === "git")
			return new vscode.SemanticTokens(new Uint32Array(0));

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
				const projUri = getProjectUriForFile(document.uri);
				services.config.logger.logInfo(`${e}`, projUri);
			}
			catch {
				services.config.logger.showError(`${e}`);
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

			if (!stepFileStep && featureFileStepRe.test(line)) {

				r.push({
					line: i,
					startCharacter: 0,
					length: line.length,
					tokenType: "missing_step",
				});

				continue;
			}

			if (stepFileStep && stepFileStep.textAsRe.includes(parseRepWildcard)) {
				const grpWldText = stepFileStep.textAsRe.replaceAll(parseRepWildcard, `(${parseRepWildcard})`);
				const wcMatches = new RegExp(grpWldText).exec(line);

				if (wcMatches && wcMatches.length > 1) {

					wcMatches.shift();
					wcMatches.forEach((match) => {
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


const tmpLegend = new vscode.SemanticTokensLegend([]);
const tmpSemHighlightProvider = new class tmpSemHighlightProvider implements vscode.DocumentSemanticTokensProvider {
	onDidChangeSemanticTokens?: vscode.Event<void> | undefined;
	provideDocumentSemanticTokens(): never { throw new Error('this should never be called'); }
	provideDocumentSemanticTokensEdits?(): never { throw new Error('this should never be called'); }
}

// TODO: is there a better way to retrigger semantic highlighting? ask MS. this works well for now.
// retrigger semantic highlighting so that all currently open document tabs containing feature files are refreshed with changes to step mappings
// i.e. when you change a steps file, the semantic highlighting should be IMMEDIATELY updated in place in all open feature files for any 
// new missing/valid steps as the result of the step file edit.
// (using a fake language id and tmpProvider here to minimize processing, we just want to cause a trigger of the existing semHighlightProvider)
export function retriggerSemanticHighlighting() {
	const dis = vscode.languages.registerDocumentSemanticTokensProvider({ language: '-not-a-language-' }, tmpSemHighlightProvider, tmpLegend);
	dis.dispose();
}
