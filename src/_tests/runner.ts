import * as path from 'path';
import * as Mocha from 'mocha';
import * as vscode from 'vscode';
import * as inspector from 'inspector';
import { globSync } from 'glob';
import { services } from '../common/services';


export function runner(globStr: string, ignore?: string[]): Promise<void> {

	const debuggerAttached = inspector.url() !== undefined;

	const mocha = new Mocha({
		ui: 'tdd',
		color: true,
		bail: true,
		timeout: debuggerAttached ? 900000 : 30000,
	});

	const testsRoot = __dirname;

	return new Promise((resolve, reject): void => {

		try {
			const files = globSync(globStr, { cwd: testsRoot, ignore: ignore });
			files.forEach(f => mocha.addFile(path.resolve(testsRoot, f)));

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

// note - this won't store logs in activate() when the extension host is initially fired up
// because when the extension host instance loads the extension, it calls activate() before we get here
const logInfo = services.logger.logInfo;
services.logger.logInfo = (text: string, projUri: vscode.Uri, run?: vscode.TestRun) => {
	logStore.get().push([projUri.path, text]);
	logInfo.call(services.logger, text, projUri, run);
};
