import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import * as sinon from 'sinon';
import { getBehaveConfigPaths } from '../../../config/behaveConfig';
import { services } from '../../../common/services';
import { rndNumeric } from '../../../common/helpers';
import { BEHAVE_CONFIG_FILES_PRECEDENCE } from '../../../behaveLogic';



suite(`getBehaveConfigPaths - file order-of-precedence checks`, () => {
  let sandbox: sinon.SinonSandbox;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let logger: any;
  const projUri = vscode.Uri.file(rndNumeric());
  const workDirUri = vscode.Uri.file(projUri.fsPath + "/" + rndNumeric());
  const workDirRelPath = workDirUri.fsPath.replace(projUri.fsPath + "/", "");
  const fileContent = ' [behave]\n  paths =features';
  const resPaths = [path.join(workDirRelPath, "features")];
  const resPathsText = `"${resPaths.join('", "')}"`;

  setup(() => {
    sandbox = sinon.createSandbox();
    logger = { logInfo: sandbox.stub() };
    services.logger = logger;
  });

  teardown(() => {
    sandbox.restore();
    logger.logInfo.resetHistory();
  });


  // TODO: include pyproject.toml when we support behave 1.2.7
  const filePrecedence = BEHAVE_CONFIG_FILES_PRECEDENCE.slice(0, BEHAVE_CONFIG_FILES_PRECEDENCE.length - 1);

  for (let i = 0; i < filePrecedence.length; i++) {

    const filesPresent = filePrecedence.slice(i);

    test(`should get content from ${filesPresent[0]} when files present are: ${filesPresent}`, () => {

      sandbox.stub(fs, 'readFileSync').returns(fileContent);
      sandbox.stub(fs, 'statSync').returns({ isDirectory: () => true } as unknown as fs.Stats);

      const fsExistsStub = sandbox.stub(fs, 'existsSync').withArgs(path.join(workDirUri.fsPath, "features")).returns(true);

      for (const element of filesPresent) {
        const file = element;
        fsExistsStub.withArgs(path.join(workDirUri.fsPath, file)).returns(true);
      }

      const result = getBehaveConfigPaths(projUri, workDirUri, workDirRelPath);
      assert.deepStrictEqual(result.projRelBehaveConfigPaths, resPaths);
      assert(logger.logInfo.calledOnceWithExactly(`Behave config file "${filesPresent[0]}" sets project-relative paths: ${resPathsText}`, projUri));

    });
  }

});


suite("getBehaveConfigPaths - basic paths checks 1", () => {
  let sandbox: sinon.SinonSandbox;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let logger: any;
  const projUri = vscode.Uri.file("/home/me/project");

  setup(() => {
    sandbox = sinon.createSandbox();
    logger = { logInfo: sandbox.stub() };
    services.logger = logger;
    sandbox.stub(fs, 'existsSync').returns(true);
    sandbox.stub(fs, 'statSync').returns({ isDirectory: () => true } as unknown as fs.Stats);
  });

  teardown(() => {
    sandbox.restore();
    logger.logInfo.resetHistory();
  });

  const workDirUri = vscode.Uri.file(projUri.fsPath + "/working");


  test(`should return project-relative feature path when behave.ini paths is "." and ".." and workingDirUri is a level below`, () => {
    // [behave]
    // paths=..
    const fileContent = `[behave]\npaths=.\t\n..\n`;
    sandbox.stub(fs, 'readFileSync').returns(fileContent);
    const workDirRelPath = path.relative(projUri.fsPath, workDirUri.fsPath);
    const result = getBehaveConfigPaths(projUri, workDirUri, workDirRelPath);
    const resPaths = [workDirRelPath, ""];
    const resPathsText = `"${resPaths.join('", "')}"`;
    assert.deepStrictEqual(result.projRelBehaveConfigPaths, resPaths);
    assert(logger.logInfo.calledOnceWithExactly(`Behave config file "behave.ini" sets project-relative paths: ${resPathsText}`, projUri));
  });

  test(`should return project-relative feature path when behave.ini paths is "../" and workingDirUri is a level below`, () => {
    // [behave]
    // paths=..
    const fileContent = `[behave]\npaths=../\n`;
    sandbox.stub(fs, 'readFileSync').returns(fileContent);
    const workDirRelPath = path.relative(projUri.fsPath, workDirUri.fsPath);
    const result = getBehaveConfigPaths(projUri, workDirUri, workDirRelPath);
    const resPaths = [""];
    const resPathsText = `"${resPaths.join('", "')}"`;
    assert.deepStrictEqual(result.projRelBehaveConfigPaths, resPaths);
    assert(logger.logInfo.calledOnceWithExactly(`Behave config file "behave.ini" sets project-relative paths: ${resPathsText}`, projUri));
  });

});


suite("getBehaveConfigPaths - basic paths checks 2", () => {
  let sandbox: sinon.SinonSandbox;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let logger: any;
  const projUri = vscode.Uri.file("/home/me/project");

  setup(() => {
    sandbox = sinon.createSandbox();
    logger = { logInfo: sandbox.stub() };
    services.logger = logger;
    sandbox.stub(fs, 'existsSync').returns(true);
    sandbox.stub(fs, 'statSync').returns({ isDirectory: () => true } as unknown as fs.Stats);
  });

  teardown(() => {
    sandbox.restore();
    logger.logInfo.resetHistory();
  });

  const workDirUris = [
    projUri,
    vscode.Uri.file(projUri.fsPath + "/working")
  ];

  for (const workDirUri of workDirUris) {

    test(`should return project-relative feature paths in same (preserved) order`, () => {
      // [behave]
      // paths=.
      const fileContent = `[behave]\npaths=z\n\ta\n\tm\n`;
      sandbox.stub(fs, 'readFileSync').returns(fileContent);
      const workDirRelPath = path.relative(projUri.fsPath, workDirUri.fsPath);
      const result = getBehaveConfigPaths(projUri, workDirUri, workDirRelPath);
      const resPaths = workDirRelPath === "" ? ["z", "a", "m"] : [workDirRelPath + "/z", workDirRelPath + "/a", workDirRelPath + "/m"];
      const resPathsText = `"${resPaths.join('", "')}"`;
      assert.deepStrictEqual(result.projRelBehaveConfigPaths, resPaths);
      assert(logger.logInfo.calledOnceWithExactly(`Behave config file "behave.ini" sets project-relative paths: ${resPathsText}`, projUri));
    });


    test(`should return project-relative feature path when behave.ini paths is "."`, () => {
      // [behave]
      // paths=.
      const fileContent = `[behave]\npaths=.\n`;
      sandbox.stub(fs, 'readFileSync').returns(fileContent);
      const workDirRelPath = path.relative(projUri.fsPath, workDirUri.fsPath);
      const result = getBehaveConfigPaths(projUri, workDirUri, workDirRelPath);
      const resPaths = workDirRelPath === "" ? [""] : [workDirRelPath];
      const resPathsText = `"${resPaths.join('", "')}"`;
      assert.deepStrictEqual(result.projRelBehaveConfigPaths, resPaths);
      assert(logger.logInfo.calledOnceWithExactly(`Behave config file "behave.ini" sets project-relative paths: ${resPathsText}`, projUri));
    });



    test(`should return project-relative feature path when behave.ini paths is "./features" and workingDirUri is "${workDirUri}`, () => {
      // [behave]
      // paths=./features
      const fileContent = `[behave]\npaths=./features\n`;
      sandbox.stub(fs, 'readFileSync').returns(fileContent);
      const workDirRelPath = path.relative(projUri.fsPath, workDirUri.fsPath);
      const result = getBehaveConfigPaths(projUri, workDirUri, workDirRelPath);
      const resPaths = [path.join(workDirRelPath, "./features")];
      const resPathsText = `"${resPaths.join('", "')}"`;
      assert.deepStrictEqual(result.projRelBehaveConfigPaths, resPaths);
      assert(logger.logInfo.calledOnceWithExactly(`Behave config file "behave.ini" sets project-relative paths: ${resPathsText}`, projUri));
    });

    test(`should return project-relative feature path when behave.ini paths is relative path and workingDirUri is "${workDirUri}`, () => {
      // [behave]
      // paths=features
      const fileContent = '[behave]\npaths=features\n';
      sandbox.stub(fs, 'readFileSync').returns(fileContent);
      const workDirRelPath = path.relative(projUri.fsPath, workDirUri.fsPath);
      const result = getBehaveConfigPaths(projUri, workDirUri, workDirRelPath);
      const resPaths = [path.join(workDirRelPath, "features")];
      const resPathsText = `"${resPaths.join('", "')}"`;
      assert.deepStrictEqual(result.projRelBehaveConfigPaths, resPaths);
      assert(logger.logInfo.calledOnceWithExactly(`Behave config file "behave.ini" sets project-relative paths: ${resPathsText}`, projUri));
    });

    test(`should return project-relative feature path when behave.ini paths is full path and workingDirUri is "${workDirUri}`, () => {
      // [behave]
      // paths=/home/me/project/working/features
      const fileContent = `[behave]\npaths=${workDirUri.fsPath}/features\n`;
      sandbox.stub(fs, 'readFileSync').returns(fileContent);
      const workDirRelPath = path.relative(projUri.fsPath, workDirUri.fsPath);
      const result = getBehaveConfigPaths(projUri, workDirUri, workDirRelPath);
      const resPaths = [path.join(workDirRelPath, "features")];
      const resPathsText = `"${resPaths.join('", "')}"`;
      assert.deepStrictEqual(result.projRelBehaveConfigPaths, resPaths);
      assert(logger.logInfo.calledOnceWithExactly(`Behave config file "behave.ini" sets project-relative paths: ${resPathsText}`, projUri));
    });
  }

});


suite("getBehaveConfigPaths - more path checks", () => {
  let sandbox: sinon.SinonSandbox;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let logger: any;

  class Params {
    projUri: vscode.Uri;
    workDirUri: vscode.Uri;
    workDirRelPath: string;

    constructor(projUri: vscode.Uri, workDirUri: vscode.Uri, workDirRelPath: string) {
      this.projUri = projUri;
      this.workDirUri = workDirUri;
      this.workDirRelPath = workDirRelPath;
    }

    toString(): string {
      return `projUriFsPath: ${this.projUri.fsPath}, workDirUriFsPath: ${this.workDirUri.fsPath}, workDirRelPath: ${this.workDirRelPath}`;
    }
  }

  const getParams = (): Params[] => {
    const params: Params[] = [];
    for (let i = 0; i < 2; i++) {
      const projUri = vscode.Uri.file(rndNumeric());
      const workDirUri = i === 0
        ? vscode.Uri.file(projUri.fsPath + "/" + rndNumeric())
        : vscode.Uri.file(projUri.fsPath);
      const workDirRelPath = path.relative(projUri.fsPath, workDirUri.fsPath);
      params.push(new Params(projUri, workDirUri, workDirRelPath));
    }
    return params;
  };


  getParams().forEach(p => {

    setup(() => {
      sandbox = sinon.createSandbox();
      logger = { logInfo: sandbox.stub() };
      services.logger = logger;
      if (!(fs.statSync as any)['isSinonProxy'])
        sandbox.stub(fs, 'statSync').returns({ isDirectory: () => true } as unknown as fs.Stats);
    });

    teardown(() => {
      sandbox.restore();
      logger.logInfo.resetHistory();
    });


    test(`should return empty array when no behave config file found, params: ${p}`, () => {
      sandbox.stub(fs, 'existsSync').returns(false);
      const result = getBehaveConfigPaths(p.projUri, p.workDirUri, p.workDirRelPath);
      assert.deepStrictEqual(result.projRelBehaveConfigPaths, []);
      assert(logger.logInfo.calledOnceWithExactly('No Behave config file found, using default paths.', p.projUri));
    });

    test(`should return default paths when space in [ behave], params: ${p}`, () => {
      // (ignored due to space in "[behave ]")
      // [behave ]
      // paths  =features  
      const fileContent = '[behave ]\n paths  =features\n';
      sandbox.stub(fs, 'existsSync').returns(true);
      sandbox.stub(fs, 'readFileSync').returns(fileContent);
      const result = getBehaveConfigPaths(p.projUri, p.workDirUri, p.workDirRelPath);
      assert.deepStrictEqual(result.projRelBehaveConfigPaths, []);
      assert(logger.logInfo.calledOnceWithExactly('Behave config file "pyproject.toml" did not set paths, using default paths.', p.projUri));
    });

    test(`should return empty array when paths is empty, params: ${p}`, () => {
      // [behave]
      // paths =
      const fileContent = '[behave]\n  paths = \n';
      const filePath = path.join(p.workDirUri.fsPath, "tox.ini");
      sandbox.stub(fs, 'existsSync').withArgs(filePath).returns(true);
      sandbox.stub(fs, 'readFileSync').returns(fileContent);
      const result = getBehaveConfigPaths(p.projUri, p.workDirUri, p.workDirRelPath);
      assert.deepStrictEqual(result.projRelBehaveConfigPaths, []);
      assert(logger.logInfo.calledOnceWithExactly('Behave config file "tox.ini" did not set paths, using default paths.', p.projUri));
    });

    test(`should return working dir features when paths is ./features, params: ${p}`, () => {
      // [behave]
      // paths = ./features  
      const fileContent = '[behave]\n  paths = ./features\n';
      sandbox.stub(fs, 'existsSync').returns(true);
      sandbox.stub(fs, 'readFileSync').returns(fileContent);
      const result = getBehaveConfigPaths(p.projUri, p.workDirUri, p.workDirRelPath);
      const resPaths = [path.join(p.workDirRelPath, "features")];
      const resPathsText = `"${resPaths.join('", "')}"`;
      assert.deepStrictEqual(result.projRelBehaveConfigPaths, resPaths);
      assert(logger.logInfo.calledOnceWithExactly(`Behave config file "behave.ini" sets project-relative paths: ${resPathsText}`, p.projUri));
    });

    test(`should return working dir features when paths is features/my.feature, params: ${p}`, () => {
      // [behave]
      // paths = ./features  
      const fileContent = '[behave]\n  paths =features/my.feature\n';
      sandbox.stub(fs, 'existsSync').returns(true);
      sandbox.stub(fs, 'readFileSync').returns(fileContent);
      const result = getBehaveConfigPaths(p.projUri, p.workDirUri, p.workDirRelPath);
      const resPaths = [path.join(p.workDirRelPath, "features")];
      const resPathsText = `"${resPaths.join('", "')}"`;
      assert.deepStrictEqual(result.projRelBehaveConfigPaths, resPaths);
      assert(logger.logInfo.calledOnceWithExactly(`Behave config file "behave.ini" sets project-relative paths: ${resPathsText}`, p.projUri));
    });

    test(`should return 2 features paths when behave.ini file contains 2 paths and both paths exist, params: ${p}`, () => {
      //  [behave]
      //    paths =features
      //       features2   
      // stdout_capture= true
      const fileContent = ' [behave]\n  paths =features\n     features2\nstdout_capture= true';
      const filePath = path.join(p.workDirUri.fsPath, "setup.cfg");
      sandbox.stub(fs, 'existsSync')
        .withArgs(filePath).returns(true)
        .withArgs(path.join(p.workDirUri.fsPath, "features")).returns(true)
        .withArgs(path.join(p.workDirUri.fsPath, "features2")).returns(true);
      sandbox.stub(fs, 'readFileSync').returns(fileContent);
      const result = getBehaveConfigPaths(p.projUri, p.workDirUri, p.workDirRelPath);
      const resPaths = [path.join(p.workDirRelPath, "features"), path.join(p.workDirRelPath, "features2")];
      const resPathsText = `"${resPaths.join('", "')}"`;
      assert.deepStrictEqual(result.projRelBehaveConfigPaths, resPaths);
      assert(logger.logInfo.calledOnceWithExactly(`Behave config file "setup.cfg" sets project-relative paths: ${resPathsText}`, p.projUri));
    });

  });




});


