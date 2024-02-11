import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import * as sinon from 'sinon';
import * as vscode from 'vscode';
import { services } from '../../../common/services';
import { findFeatureFolders, getExcludedPathPatterns, getFeatureNodePath, getOptimisedFeatureParsingPaths, isExcludedPath } from '../../../common/helpers';
import { ProjectSettings } from '../../../config/settings';
import { TestWorkspaceConfig } from '../../integration/_helpers/testWorkspaceConfig';


suite("isExcludedPath", () => {
  const projUri = vscode.Uri.file("/home/me/src/myproj");

  const projSettings = {
    uri: projUri,
    excludedPathPatterns: { "**/.venv{,/**}": true },
  } as unknown as ProjectSettings;

  test(`should return [] for excluded paths`, () => {
    const paths = [
      '.venv',
      'folder/.venv',
      'folder/folder/.venv',
      'folder/folder/.venv/some.py',
      'folder/folder/.venv/something/some.py'];

    for (const path of paths) {
      const result = isExcludedPath(projSettings, path);
      const expected = true;
      assert.deepStrictEqual(result, expected, `path:"${path}", expected: ${expected}, got: ${result}`);
    }
  });

});


suite("findFeatureFolders", () => {
  let sandbox: sinon.SinonSandbox;
  let logger: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  const projUri = vscode.Uri.file("/home/me/src/myproj");

  const projSettings = {
    uri: projUri,
    excludedPathPatterns: getExcludedPathPatterns(new TestWorkspaceConfig()),
  } as ProjectSettings;

  setup(() => {
    sandbox = sinon.createSandbox();
    logger = { logInfo: sandbox.stub(), xRayLog: sandbox.stub() };
    services.logger = logger;

    const statStub = sandbox.stub(fs.promises, 'stat');
    statStub.callsFake((path: fs.PathLike) => {
      const isDirectory = !path.toString().includes(".");
      return Promise.resolve({ isDirectory: () => isDirectory } as fs.Stats);
    });

  });

  teardown(() => {
    sandbox.restore();
    logger.logInfo.resetHistory();
  });

  test(`should return [] for an ignored root folder`, async () => {
    // proj/
    // └── .mypy_cache/
    //     └── cache.feature    
    const ignoredFolder = path.join(projUri.fsPath, ".mypy_cache");
    sandbox.stub(fs.promises, 'readdir')
      .withArgs(ignoredFolder)
      .returns(Promise.resolve(["cache.feature"]) as unknown as Promise<fs.Dirent[]>);

    const result = await findFeatureFolders(false, projSettings, ignoredFolder, false);
    const expected: string[] = [];
    assert.deepStrictEqual(result, expected, `expected: ${expected}, got: ${result}`);
  });

  test(`should return [] for an ignored child folder`, async () => {
    // proj/
    // └── a/
    //     └── .mypy_cache/
    //         └── cache.feature    
    const ignoredFolder = path.join(projUri.fsPath, "a", ".mypy_cache");
    sandbox.stub(fs.promises, 'readdir')
      .withArgs(ignoredFolder)
      .returns(Promise.resolve(["cache.feature"]) as unknown as Promise<fs.Dirent[]>);

    const result = await findFeatureFolders(false, projSettings, ignoredFolder, false);
    const expected: string[] = [];
    assert.deepStrictEqual(result, expected, `expected: ${expected}, got: ${result}`);
  });

  test(`should return proj root path for root "my.feature"`, async () => {
    // proj/
    // ├── root.feature    
    sandbox.stub(fs.promises, 'readdir')
      .withArgs(projUri.fsPath)
      .returns(Promise.resolve(["root.feature"]) as unknown as Promise<fs.Dirent[]>);

    const result = await findFeatureFolders(false, projSettings, projUri.fsPath, false);
    const expected = [projUri.fsPath];
    assert.deepStrictEqual(result, expected, `expected: ${expected}, got: ${result}`)
  });

  test(`should return expected paths set`, async () => {
    // proj/
    // ├── root.feature
    // ├── a/
    // │   └── a.feature
    // ├── b/
    // │   └── b.feature   
    // ├── c/
    // │   ├── 1/
    // │   │   └── c1.feature
    // │   └── 2/
    // │       ├── c2.feature
    // │       └── 1/
    // │           └── c21.feature
    // ├── d/
    // │   └── 1/
    // │       └── d1.feature
    // ├── e/
    // │   ├── 1/
    // │   │   ├── 1/
    // │   │   │   └── e11.feature
    // │   │   └── 2/
    // │   │       ├── e12.feature
    // │   │       └── 1/
    // │   │           └── e121.feature
    // ├── f/
    //     └── 1/
    //         └── 1/
    //             └── 1/
    //                 └── f111.feature
    sandbox.stub(fs.promises, 'readdir')
      .withArgs(projUri.fsPath).returns(Promise.resolve(["root.feature", "a", "b", "c", "d", "e", "f"]) as unknown as Promise<fs.Dirent[]>)
      .withArgs(projUri.fsPath + "/a").returns(Promise.resolve(["a.feature"]) as unknown as Promise<fs.Dirent[]>)
      .withArgs(projUri.fsPath + "/b").returns(Promise.resolve(["b.feature"]) as unknown as Promise<fs.Dirent[]>)
      .withArgs(projUri.fsPath + "/c").returns(Promise.resolve(["1", "2"]) as unknown as Promise<fs.Dirent[]>)
      .withArgs(projUri.fsPath + "/c/1").returns(Promise.resolve(["c1.feature"]) as unknown as Promise<fs.Dirent[]>)
      .withArgs(projUri.fsPath + "/c/2").returns(Promise.resolve(["1", "c2.feature"]) as unknown as Promise<fs.Dirent[]>)
      .withArgs(projUri.fsPath + "/c/2/1").returns(Promise.resolve(["c21.feature"]) as unknown as Promise<fs.Dirent[]>)
      .withArgs(projUri.fsPath + "/d").returns(Promise.resolve(["1"]) as unknown as Promise<fs.Dirent[]>)
      .withArgs(projUri.fsPath + "/d/1").returns(Promise.resolve(["d1.feature"]) as unknown as Promise<fs.Dirent[]>)
      .withArgs(projUri.fsPath + "/e").returns(Promise.resolve(["1"]) as unknown as Promise<fs.Dirent[]>)
      .withArgs(projUri.fsPath + "/e/1").returns(Promise.resolve(["1", "2"]) as unknown as Promise<fs.Dirent[]>)
      .withArgs(projUri.fsPath + "/e/1/1").returns(Promise.resolve(["e11.feature"]) as unknown as Promise<fs.Dirent[]>)
      .withArgs(projUri.fsPath + "/e/1/2").returns(Promise.resolve(["e12.feature"]) as unknown as Promise<fs.Dirent[]>)
      .withArgs(projUri.fsPath + "/e/1/2/1").returns(Promise.resolve(["e121.feature"]) as unknown as Promise<fs.Dirent[]>)
      .withArgs(projUri.fsPath + "/f").returns(Promise.resolve(["1"]) as unknown as Promise<fs.Dirent[]>)
      .withArgs(projUri.fsPath + "/f/1").returns(Promise.resolve(["1"]) as unknown as Promise<fs.Dirent[]>)
      .withArgs(projUri.fsPath + "/f/1/1").returns(Promise.resolve(["f111.feature"]) as unknown as Promise<fs.Dirent[]>);

    const result = await findFeatureFolders(false, projSettings, projUri.fsPath, false);
    const expected = ["", "a", "b", "c/1", "c/2", "d/1", "e/1/1", "e/1/2", "f/1/1"].map(rel => path.join(projUri.fsPath, rel));
    assert.deepStrictEqual(result, expected, `expected: ${expected}, got: ${result}`)
  });

});

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


  test(`should return "" for ""`, () => {
    const paths = [""];
    const randomOrderedPaths = paths.sort(() => Math.random() - 0.5);
    const result = getOptimisedFeatureParsingPaths(randomOrderedPaths);
    const expected = [""];
    assert.deepStrictEqual(result, expected, `expected: ${expected}, got: ${result}`)
  });

  test(`should return expected paths set 1`, () => {
    const paths = ["", "a", "b", "b/c/d", "b/e", "f"];
    const randomOrderedPaths = paths.sort(() => Math.random() - 0.5);
    const result = getOptimisedFeatureParsingPaths(randomOrderedPaths);
    const expected = ["", "a", "b", "f"];
    assert.deepStrictEqual(result, expected, `expected: ${expected}, got: ${result}`)
  });


  test(`should return expected paths set 2`, () => {
    const paths = [
      'working folder',
      'working folder/features',
      'working folder/features/sub1',
      'working folder/features/sub1/sub2'
    ];
    const randomOrderedPaths = paths.sort(() => Math.random() - 0.5);
    const result = getOptimisedFeatureParsingPaths(randomOrderedPaths);
    const expected = ["working folder"];
    assert.deepStrictEqual(result, expected, `expected: ${expected}, got: ${result}`)
  });


  test(`should return expected paths set 3`, () => {
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
    const result = getOptimisedFeatureParsingPaths(randomOrderedPaths);

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