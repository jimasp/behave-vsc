import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import * as sinon from 'sinon';
import { getProjectRelativeBehaveConfigPaths } from '../../config/behaveConfig';
import { rndNumeric } from '../../common/helpers';


suite("getProjectRelativeBehaveConfigPaths", () => {
  let sandbox: sinon.SinonSandbox;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let logger: any;
  let projUri: vscode.Uri;

  setup(() => {
    projUri = vscode.Uri.file(rndNumeric());
    sandbox = sinon.createSandbox();
    logger = { logInfo: sandbox.stub() };
  });

  teardown(() => {
    sandbox.restore();
  });

  test("should return empty array when no behave config file found", () => {
    sandbox.stub(fs, 'existsSync').returns(false);
    const result = getProjectRelativeBehaveConfigPaths(projUri, logger);
    assert.deepStrictEqual(result, []);
    assert(logger.logInfo.calledOnceWithExactly('No Behave config file found, using default paths.', projUri));
  });

  test("should return default paths when space in [ behave]", () => {
    // (ignored due to space in "[behave ]")
    // [behave ]
    // paths  =features  
    const fileContent = '[behave ]\n paths  =features\n';
    sandbox.stub(fs, 'existsSync').returns(true);
    sandbox.stub(fs, 'readFileSync').returns(fileContent);
    const result = getProjectRelativeBehaveConfigPaths(projUri, logger);
    assert.deepStrictEqual(result, []);
    assert(logger.logInfo.calledOnceWithExactly('Behave config file "pyproject.toml" did not set paths, using default paths.', projUri));
  });


  test("should return empty array when paths is empty", () => {
    // [behave]
    // paths =
    const fileContent = '[behave]\n  paths = \n';
    const filePath = path.join(projUri.fsPath, "tox.ini");
    sandbox.stub(fs, 'existsSync').withArgs(filePath).returns(true);
    sandbox.stub(fs, 'readFileSync').returns(fileContent);
    const result = getProjectRelativeBehaveConfigPaths(projUri, logger);
    assert.deepStrictEqual(result, []);
    assert(logger.logInfo.calledOnceWithExactly('Behave config file "tox.ini" did not set paths, using default paths.', projUri));
  });

  test("should return features when paths is ./features", () => {
    // [behave]
    // paths = ./features  
    const fileContent = '[behave]\n  paths = ./features\n';
    sandbox.stub(fs, 'existsSync').returns(true);
    sandbox.stub(fs, 'readFileSync').returns(fileContent);
    const result = getProjectRelativeBehaveConfigPaths(projUri, logger);
    assert.deepStrictEqual(result, ["features"]);
    assert(logger.logInfo.calledOnceWithExactly('Behave config file "behave.ini" sets relative paths: "features"', projUri));
  });


  test("should return relative feature path when behave.ini contains a full path", () => {
    // [behave]
    // paths=/home/me/project/features
    const projUri = vscode.Uri.file("/home/me/project");
    const fileContent = '[behave]\n  paths = /home/me/project/features\n';
    sandbox.stub(fs, 'existsSync').returns(true);
    sandbox.stub(fs, 'readFileSync').returns(fileContent);
    sandbox.stub(vscode.workspace, 'asRelativePath').returns("features");
    const result = getProjectRelativeBehaveConfigPaths(projUri, logger);
    assert.deepStrictEqual(result, ["features"]);
    assert(logger.logInfo.calledOnceWithExactly('Behave config file "behave.ini" sets relative paths: "features"', projUri));
  });


  test("should return 2 features paths when behave.ini file contains 2 paths and both paths exist", () => {
    //  [behave]
    //    paths =features
    //       features2   
    // stdout_capture= true
    const fileContent = ' [behave]\n  paths =features\n     features2\nstdout_capture= true';
    const filePath = path.join(projUri.fsPath, "setup.cfg");
    sandbox.stub(fs, 'existsSync')
      .withArgs(filePath).returns(true)
      .withArgs(path.join(projUri.fsPath, "features")).returns(true)
      .withArgs(path.join(projUri.fsPath, "features2")).returns(true);
    sandbox.stub(fs, 'readFileSync').returns(fileContent);
    const result = getProjectRelativeBehaveConfigPaths(projUri, logger);
    assert.deepStrictEqual(result, ["features", "features2"]);
    assert(logger.logInfo.calledOnceWithExactly('Behave config file "setup.cfg" sets relative paths: "features", "features2"', projUri));
  });


  test("should return correct order of precedence for config file paths setting", () => {
    const fileContent = ' [behave]\n  paths =features';
    const behaveIni = path.join(projUri.fsPath, "behave.ini");
    const behaveRc = path.join(projUri.fsPath, ".behaverc");
    const setupCfg = path.join(projUri.fsPath, "setup.cfg");
    const toxIni = path.join(projUri.fsPath, "tox.ini");
    const pyprojectToml = path.join(projUri.fsPath, "pyproject.toml");

    // behave.ini
    sandbox.stub(fs, 'readFileSync').returns(fileContent);
    sandbox.stub(vscode.workspace, 'asRelativePath').returns("features");
    sandbox.stub(fs, 'existsSync').returns(true);
    let result = getProjectRelativeBehaveConfigPaths(projUri, logger);
    assert.deepStrictEqual(result, ["features"]);
    assert(logger.logInfo.calledOnceWithExactly('Behave config file "behave.ini" sets relative paths: "features"', projUri));
    sandbox.restore();
    logger.logInfo.resetHistory();

    // .behaverc
    sandbox.stub(fs, 'readFileSync').returns(fileContent);
    sandbox.stub(vscode.workspace, 'asRelativePath').returns("features");
    sandbox.stub(fs, 'existsSync')
      .withArgs(path.join(projUri.fsPath, "features")).returns(true)
      .withArgs(behaveIni).returns(false)
      .withArgs(behaveRc).returns(true)
      .withArgs(setupCfg).returns(true)
      .withArgs(toxIni).returns(true)
      .withArgs(pyprojectToml).returns(true);
    result = getProjectRelativeBehaveConfigPaths(projUri, logger);
    assert.deepStrictEqual(result, ["features"]);
    assert(logger.logInfo.calledOnceWithExactly('Behave config file ".behaverc" sets relative paths: "features"', projUri));
    sandbox.restore();
    logger.logInfo.resetHistory();


    // setup.cfg
    sandbox.stub(fs, 'readFileSync').returns(fileContent);
    sandbox.stub(vscode.workspace, 'asRelativePath').returns("features");
    sandbox.stub(fs, 'existsSync')
      .withArgs(path.join(projUri.fsPath, "features")).returns(true)
      .withArgs(behaveIni).returns(false)
      .withArgs(behaveRc).returns(false)
      .withArgs(setupCfg).returns(true)
      .withArgs(toxIni).returns(true)
      .withArgs(pyprojectToml).returns(true);
    result = getProjectRelativeBehaveConfigPaths(projUri, logger);
    assert.deepStrictEqual(result, ["features"]);
    assert(logger.logInfo.calledOnceWithExactly('Behave config file "setup.cfg" sets relative paths: "features"', projUri));
    sandbox.restore();
    logger.logInfo.resetHistory();

    // tox.ini
    sandbox.stub(fs, 'readFileSync').returns(fileContent);
    sandbox.stub(vscode.workspace, 'asRelativePath').returns("features");
    sandbox.stub(fs, 'existsSync')
      .withArgs(path.join(projUri.fsPath, "features")).returns(true)
      .withArgs(behaveIni).returns(false)
      .withArgs(behaveRc).returns(false)
      .withArgs(setupCfg).returns(false)
      .withArgs(toxIni).returns(true)
      .withArgs(pyprojectToml).returns(true);
    result = getProjectRelativeBehaveConfigPaths(projUri, logger);
    assert.deepStrictEqual(result, ["features"]);
    assert(logger.logInfo.calledOnceWithExactly('Behave config file "tox.ini" sets relative paths: "features"', projUri));
    sandbox.restore();
    logger.logInfo.resetHistory();

  });


});


