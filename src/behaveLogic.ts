import * as path from 'path';
import * as vscode from 'vscode';
import { services } from './common/services';
import { ProjectSettings } from './config/settings';
import { Scenario } from './parsers/testFile';
import { fileExists } from './common/helpers';
import { xRayLog } from './common/logger';


// =========================================================================================================
// THIS FILE CONTAINS FUNCTIONS AND CONSTANTS THAT MAY NEED TO CHANGE IF BEHAVE'S INTERNAL LOGIC CHANGES
// =========================================================================================================


// this array must have the same order of precedence as in the behave source code function "config_filenames",
export const BEHAVE_CONFIG_FILES_PRECEDENCE = ["behave.ini", ".behaverc", "setup.cfg", "tox.ini", "pyproject.toml"];


export function getJunitFeatureName(ps: ProjectSettings, scenario: Scenario): string {
  // this function should contain similar logic to the behave source code function "make_feature_filename".
  // this is needed to determine the junit filename that behave will use.

  let jName = "";
  const featureFilename = path.relative(ps.projRelativeBehaveWorkingDirPath, scenario.featureFileProjectRelativePath);

  for (const path of ps.rawBehaveConfigPaths) {
    if (featureFilename.startsWith(path)) {
      jName = featureFilename.slice(path.length + 1);
      break;
    }
  }

  if (!jName)
    jName = path.relative(ps.baseDirPath, featureFilename);

  jName = jName.split('.').slice(0, -1).join('.');
  jName = jName.replace(/\\/g, '/').replace(/\//g, '.');
  return jName;
}


export async function getBaseDirPath(ps: ProjectSettings, behaveWrkDirRelativeConfigPaths: string[]): Promise<string | null> {
  // this function should contain similar logic to the behave source code function "setup_paths"

  // the baseDir = the parent directory of the "steps" folder / environment.py file
  // (although baseDir is only ever used in getJunitFeatureName(), we don't want to call it every time that gets called,
  // but we do want to re-determine it if settings change, so this function is called from and stored in the ProjectSettings object.)

  const start = performance.now();

  const relativeBaseDir = behaveWrkDirRelativeConfigPaths.length > 0
    ? behaveWrkDirRelativeConfigPaths[0] // as per behave logic
    : "features";

  const project_parent_dir = path.dirname(ps.uri.fsPath);
  const initial_base_dir = vscode.Uri.joinPath(ps.behaveWorkingDirUri, relativeBaseDir).fsPath;
  let new_base_dir = initial_base_dir;

  while (
    !(await fileExists(path.join(new_base_dir, "steps")) ||
      await fileExists(path.join(new_base_dir, "environment.py")) ||
      await fileExists(path.join(new_base_dir, "*_environment.py")) ||
      new_base_dir === project_parent_dir)
  ) {
    new_base_dir = path.dirname(new_base_dir);
  }


  if (new_base_dir === project_parent_dir) {
    if (behaveWrkDirRelativeConfigPaths.length === 0) {
      services.logger.showWarn(`Could not find "steps" directory for project "${ps.name}".
        Please: 
        (a) add a steps folder, and/or
        (b) specify a "behave-vsc.behaveWorkingDirectory" setting (if it is not the same as you project root), and/or
        (c) specify a "paths" setting in your behave configuration file. 
        (If you have a behave configuration file, please ensure that it is in your project root or 
        "behave-vsc.behaveWorkingDirectory".)`, ps.uri);
    }
    else {
      services.logger.showWarn(`Could not find "steps" directory for project "${ps.name}". ` +
        `Using the first behave configuration paths value "${initial_base_dir}"`, ps.uri);
    }
    return null;
  }

  const waited = performance.now() - start;
  xRayLog(`PERF: getRelativeBaseDirPath() took ${waited}ms`, ps.uri);

  // adjust basedir path to a behave-working-dir-relative path
  return path.relative(ps.behaveWorkingDirUri.fsPath, new_base_dir);
}
