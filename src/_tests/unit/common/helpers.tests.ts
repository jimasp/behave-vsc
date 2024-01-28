import * as assert from 'assert';
import * as sinon from 'sinon';
import * as vscode from 'vscode';
import { services } from '../../../services';
import { getFeatureNodePath, getSmallestSetOfLongestCommonRelativePaths } from '../../../common/helpers';
import { ProjectSettings } from '../../../config/settings';

suite("getLongestCommonPathsFromRelativePaths", () => {
  let sandbox: sinon.SinonSandbox;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let logger: any;

  setup(() => {
    sandbox = sinon.createSandbox();
    logger = { logInfo: sandbox.stub() };
    services.logger = logger;
  });

  teardown(() => {
    sandbox.restore();
    logger.logInfo.resetHistory();
  });


  test(`should return expected paths set 1`, () => {

    const paths = [
      "tests/features",
      "tests/features/db",
      "tests/features/db/more",
      "tests/features/db/more2",
      "tests/features/web",
      "tests/features/web/more",
      "tests/features2",
      "tests/subdir/features",
      "tests/subdir/features/db",
      "tests/subdir/features/db/more",
      "tests/subdir/features/db2",
      "tests/subdir/features2",
    ];

    const randomOrderedPaths = paths.sort(() => Math.random() - 0.5);

    const result = getSmallestSetOfLongestCommonRelativePaths(randomOrderedPaths);

    // smallest set of longest paths that contain all paths
    const expected = [
      "tests/features",
      "tests/features2",
      "tests/subdir/features",
      "tests/subdir/features2",
    ];

    assert.deepStrictEqual(result, expected, `expected: ${expected}, got: ${result}`)

  });

});


suite("getFeatureNodePath", () => {
  let sandbox: sinon.SinonSandbox;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let logger: any;

  setup(() => {
    sandbox = sinon.createSandbox();
    logger = { logInfo: sandbox.stub() };
    services.logger = logger;
  });

  teardown(() => {
    sandbox.restore();
    logger.logInfo.resetHistory();
  });


  const pathsAndExpectations1 = {
    "/home/me/src/myproj/features/my.feature": "my.feature",
  }

  for (const featureFilePath of Object.keys(pathsAndExpectations1)) {
    test(`should return expected tree paths 1`, () => {

      const featureFolders = ["features"];

      const expected = pathsAndExpectations1[featureFilePath as keyof typeof pathsAndExpectations1];
      const projUri = vscode.Uri.file("/home/me/src/myproj");
      const featFileUri = vscode.Uri.file(featureFilePath);

      const projSettings = {
        uri: projUri,
        projRelativeFeatureFolders: featureFolders,
      } as ProjectSettings;

      const result = getFeatureNodePath(featFileUri, projSettings);

      assert.deepStrictEqual(result, expected, `expected: ${expected}, got: ${result}`)
    });
  }


  const pathsAndExpectations2 = {
    "/home/me/src/myproj/folder 1/subfolder 1/features/my.feature": "my.feature",
  }

  for (const featureFilePath of Object.keys(pathsAndExpectations2)) {
    test(`should return expected tree paths 2`, () => {

      const featureFolders = ["folder 1/subfolder 1/features"];

      const expected = pathsAndExpectations2[featureFilePath as keyof typeof pathsAndExpectations2];
      const projUri = vscode.Uri.file("/home/me/src/myproj");
      const featFileUri = vscode.Uri.file(featureFilePath);

      const projSettings = {
        uri: projUri,
        projRelativeFeatureFolders: featureFolders,
      } as ProjectSettings;

      const result = getFeatureNodePath(featFileUri, projSettings);

      assert.deepStrictEqual(result, expected, `expected: ${expected}, got: ${result}`)
    });
  }


  const pathsAndExpectations3 = {
    "/home/me/src/myproj/features/my.feature": "features/my.feature",
    "/home/me/src/myproj/features2/my.feature": "features2/my.feature",
  }

  for (const featureFilePath of Object.keys(pathsAndExpectations3)) {
    test(`should return expected tree paths 3`, () => {

      const featureFolders = [
        "features",
        "features2"
      ];

      const expected = pathsAndExpectations3[featureFilePath as keyof typeof pathsAndExpectations3];
      const projUri = vscode.Uri.file("/home/me/src/myproj");
      const featFileUri = vscode.Uri.file(featureFilePath);

      const projSettings = {
        uri: projUri,
        projRelativeFeatureFolders: featureFolders,
      } as ProjectSettings;

      const result = getFeatureNodePath(featFileUri, projSettings);

      assert.deepStrictEqual(result, expected, `expected: ${expected}, got: ${result}`)
    });
  }


  const pathsAndExpectations4 = {
    "/home/me/src/myproj/folder 1/features/my.feature": "features/my.feature",
    "/home/me/src/myproj/folder 1/features2/my.feature": "features2/my.feature",
    "/home/me/src/myproj/folder 1/subfolder 1/features/my.feature": "subfolder 1/features/my.feature",
  }

  for (const featureFilePath of Object.keys(pathsAndExpectations4)) {
    test(`should return expected tree paths 4`, () => {

      const featureFolders = [
        "folder 1/features",
        "folder 1/features2",
        "folder 1/subfolder 1/features",
      ];

      const expected = pathsAndExpectations4[featureFilePath as keyof typeof pathsAndExpectations4];
      const projUri = vscode.Uri.file("/home/me/src/myproj");
      const featFileUri = vscode.Uri.file(featureFilePath);

      const projSettings = {
        uri: projUri,
        projRelativeFeatureFolders: featureFolders,
      } as ProjectSettings;

      const result = getFeatureNodePath(featFileUri, projSettings);

      assert.deepStrictEqual(result, expected, `expected: ${expected}, got: ${result}`)
    });
  }


  const pathsAndExpectations5 = {
    "/home/me/src/myproj/folder 1/features/my.feature": "folder 1/features/my.feature",
    "/home/me/src/myproj/folder 1/features2/my.feature": "folder 1/features2/my.feature",
    "/home/me/src/myproj/folder 1/subfolder 1/features/my.feature": "folder 1/subfolder 1/features/my.feature",
    "/home/me/src/myproj/folder 2/my.feature": "folder 2/my.feature",
  }

  for (const featureFilePath of Object.keys(pathsAndExpectations5)) {
    test(`should return expected tree paths 5`, () => {

      const featureFolders = [
        "folder 1/features",
        "folder 1/features2",
        "folder 1/subfolder 1/features",
        "folder 2"
      ];

      const expected = pathsAndExpectations5[featureFilePath as keyof typeof pathsAndExpectations5];
      const projUri = vscode.Uri.file("/home/me/src/myproj");
      const featFileUri = vscode.Uri.file(featureFilePath);

      const projSettings = {
        uri: projUri,
        projRelativeFeatureFolders: featureFolders,
      } as ProjectSettings;

      const result = getFeatureNodePath(featFileUri, projSettings);

      assert.deepStrictEqual(result, expected, `expected: ${expected}, got: ${result}`)
    });
  }


});