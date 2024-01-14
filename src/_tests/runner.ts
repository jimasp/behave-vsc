import * as path from 'path';
import * as Mocha from 'mocha';
import * as glob from 'glob';
import inspector = require('inspector');


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
