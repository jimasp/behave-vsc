import * as assert from 'assert';
import * as sinon from 'sinon';
import * as vscode from 'vscode';
import * as mockFs from 'mock-fs';
import * as helpers from '../../../common/helpers';
import { ProjectSettings } from '../../../config/settings';
import {
  findFeatureFoldersInWorkingDir, getExcludedPathPatterns, getFeatureNodePath,
  getOptimisedFeatureParsingPaths, isExcludedPath, isStepsFile
} from '../../../common/helpers';


suite("isExcludedPath", () => {
  const excludedPathPatterns = ["**/.venv{,/**}"];

  test(`should return [] for excluded paths`, () => {
    const paths = [
      '.venv',
      'folder/.venv',
      'folder/folder/.venv',
      'folder/folder/.venv/some.py',
      'folder/folder/.venv/something/some.py'];

    for (const path of paths) {
      const result = isExcludedPath(excludedPathPatterns, path);
      const expected = true;
      assert.deepStrictEqual(result, expected, `path:"${path}", expected: ${expected}, got: ${result}`);
    }
  });

});


suite("findFeatureFoldersInWorkingDir", () => {
  const projUri = vscode.Uri.file("/home/me/src/myproj");

  const projSettings = {
    uri: projUri,
    excludedPathPatterns: getExcludedPathPatterns(projUri),
    behaveWorkingDirUri: projUri,
  } as ProjectSettings;


  teardown(() => {
    mockFs.restore();
  });


  test(`should return [] for an ignored child folder`, async () => {
    mockFs({
      "/home/me/src/myproj": {
        'a': {
          '.mypy_cache': {
            'cache.feature': '',
          },
        },
      }
    });

    const result = await findFeatureFoldersInWorkingDir(projSettings);
    const expected: string[] = [];
    assert.deepStrictEqual(result, expected, `expected: ${expected}, got: ${result}`);
  });

  test(`should NOT return work dir root path for "root.feature"`, async () => {

    mockFs({
      "/home/me/src/myproj": {
        'root.feature': '',
        'some_features': {
          'a.feature': '',
        },
      },
    });

    const result = await findFeatureFoldersInWorkingDir(projSettings);
    const expected = ["some_features"];
    assert.deepStrictEqual(result, expected, `expected: ${expected}, got: ${result}`)
  });

  test(`should return expected paths set`, async () => {
    mockFs({
      "/home/me/src/myproj": {
        'root.feature': '',
        'a': {
          'a.feature': '',
        },
        'b': {
          'b.feature': '',
        },
        'c': {
          '1': {
            'c1.feature': '',
          },
          '2': {
            '1': {
              'c21.feature': '',
            },
            'c2.feature': '',
          },
        },
        'd': {
          '1': {
            'd1.feature': '',
          },
        },
        'e': {
          '1': {
            '1': {
              'e11.feature': '',
            },
            '2': {
              '1': {
                'e121.feature': '',
              },
              'e12.feature': '',
            },
          },
        },
        'f': {
          '1': {
            '1': {
              '1': {
                'f111.feature': '',
              },
            },
          },
        },
      }
    });


    const result = await findFeatureFoldersInWorkingDir(projSettings);
    const expected = ["a", "b", "c/1", "c/2", "d/1", "c/2/1", "e/1/1", "e/1/2", "e/1/2/1", "f/1/1/1"];
    assert.deepStrictEqual(result, expected, `expected: ${expected}, got: ${result}`)
  });

});

suite("getOptimisedFeatureParsingPaths", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any

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



suite('isStepsFile', () => {
  test('should return false for non-file URIs', async () => {
    const uri = vscode.Uri.parse('http://example.com');
    const result = await isStepsFile(uri);
    assert.strictEqual(result, false);
  });

  test('should return false for non-Python files', async () => {
    const uri = vscode.Uri.file('/path/to/file.feature');
    const result = await isStepsFile(uri);
    assert.strictEqual(result, false);
  });

  test('should return false for files outside of projRelativeStepsFolders', async () => {
    const uri = vscode.Uri.file('/path/to/project/steps/step_file.py');
    const getProjectSettingsForFileStub = sinon.stub(helpers, 'getProjectSettingsForFile').resolves({
      uri: vscode.Uri.file('/path/to/project'),
      projRelativeStepsFolders: ['notsteps'],
      importedSteps: [],
    } as unknown as ProjectSettings);
    const result = await isStepsFile(uri);
    assert.strictEqual(result, false);
    getProjectSettingsForFileStub.restore();
  });

  test('should return false for python files not in "steps" and matching importedSteps setting folder but not regex', async () => {
    const uri = vscode.Uri.file('/path/to/project/my_steps_lib/step_file.py');
    const getProjectSettingsForFileStub = sinon.stub(helpers, 'getProjectSettingsForFile').resolves({
      uri: vscode.Uri.file('/path/to/project'),
      projRelativeStepsFolders: ['steps', 'my_steps_lib'], // (importedSteps folders are always included in projRelativeStepsFolders)
      importedSteps: [
        {
          relativePath: 'my_steps_lib',
          stepFilesRx: 'step_filex\\.py',
        },
      ],
    } as unknown as ProjectSettings);
    const result = await isStepsFile(uri);
    assert.strictEqual(result, false);
    getProjectSettingsForFileStub.restore();
  });

  test('should return true for python files in a "steps" folder', async () => {
    const uri = vscode.Uri.file('/path/to/project/steps/step_file.py');
    const getProjectSettingsForFileStub = sinon.stub(helpers, 'getProjectSettingsForFile').resolves({
      uri: vscode.Uri.file('/path/to/project'),
      projRelativeStepsFolders: ['steps'],
      importedSteps: [],
    } as unknown as ProjectSettings);
    const result = await isStepsFile(uri);
    assert.strictEqual(result, true);
    getProjectSettingsForFileStub.restore();
  });

  test('should return true for python files not in "steps" but matches step library settings regex', async () => {
    const uri = vscode.Uri.file('/path/to/project/my_steps_lib/step_file.py');
    const getProjectSettingsForFileStub = sinon.stub(helpers, 'getProjectSettingsForFile').resolves({
      uri: vscode.Uri.file('/path/to/project'),
      projRelativeStepsFolders: ['steps', 'my_steps_lib'], // (importedSteps folders are always included in projRelativeStepsFolders)
      importedSteps: [
        {
          relativePath: 'my_steps_lib',
          stepFilesRx: 'step_file\\.py',
        },
      ],
    } as unknown as ProjectSettings);
    const result = await isStepsFile(uri);
    assert.strictEqual(result, true);
    getProjectSettingsForFileStub.restore();
  });


});