import * as path from 'path';
import * as Mocha from 'mocha';
import * as glob from 'glob';
import * as vscode from 'vscode';
import inspector = require('inspector');
import { services } from '../services';


export async function runner(globStr: string, ignore?: string[]): Promise<void> {

	const debugging = inspector.url() !== undefined;

	const mocha = new Mocha({
		ui: 'tdd',
		color: true,
		bail: true,
		timeout: debugging ? 900000 : 30000,
	});

	const testsRoot = __dirname;

	return new Promise((c, e) => {

		glob(globStr, { cwd: testsRoot, ignore: ignore }, (err, files) => {
			if (err) {
				return e(err);
			}

			files.forEach(f => mocha.addFile(path.resolve(testsRoot, f)));

			try {
				mocha.run(failures => {
					if (failures > 0) {
						e(new Error(`${failures} tests failed.`));
					} else {
						c();
					}
				});
			}
			catch (err) {
				console.error(err);
				e(err);
				debugger; // eslint-disable-line no-debugger
			}
		});
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
