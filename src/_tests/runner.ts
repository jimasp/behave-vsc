import path from 'path';
import Mocha from 'mocha';
import vscode from 'vscode';
import inspector from 'inspector';
import { globSync } from 'glob';
import { services } from '../common/services';
import { testGlobals } from './integration/_common/types';



export function runner(globStr: string, ignore?: string[]): Promise<void> {

	const mocha = initialise();
	const testsRoot = __dirname;

	return new Promise((resolve, reject): void => {

		try {
			const files = globSync(globStr, { cwd: testsRoot, ignore: ignore });
			files.reverse().forEach(f => mocha.addFile(path.resolve(testsRoot, f)));

			mocha.run(failures => {
				if (failures > 0) {
					reject(new Error(`${failures} tests failed.`));
				}
				else {
					resolve();
				}
			});
		}
		catch (err) {
			console.error(err);
			debugger; // eslint-disable-line no-debugger
			return reject(err);
		}

	});
}

function initialise() {
	services.config.isIntegrationTestRun = true;

	if (!testGlobals.multiRootTest)
		vscode.commands.executeCommand("testing.clearTestResults");

	const mocha = new Mocha({
		ui: 'tdd',
		color: true,
		bail: true,
		timeout: debuggerIsAttached() ? 900000 : 60000,
	});

	return mocha;
}


function debuggerIsAttached(): boolean {
	return inspector.url() !== undefined;
}


// note - this won't store logs in activate() when the extension host is initially fired up
// because when the extension host instance loads the extension, it calls activate() before we get here
const logInfo = services.logger.logInfo;
services.logger.logInfo = (text: string, projUri: vscode.Uri, run?: vscode.TestRun) => {
	logStore.get().push([projUri.path, text]);
	logInfo.call(services.logger, text, projUri, run);
};


class LogStore {
	#logStore: [string, string][] = [];

	clearProjLogs(projUri: vscode.Uri) {
		this.#logStore = this.#logStore.filter(x => x[0] !== projUri.path);
	}

	get() {
		return this.#logStore;
	}
}

export const logStore = new LogStore();





