import * as fs from 'fs';
import * as path from 'path';
import { services } from './common/services';
import { ProjectSettings } from './config/settings';
import { Scenario } from './parsers/testFile';


// =========================================================================================================
// THIS FILE CONTAINS FUNCTIONS AND CONSTANTS THAT MAY NEED TO CHANGE IF BEHAVE'S INTERNAL LOGIC CHANGES
// =========================================================================================================


// this array must have the same order of precedence as in the behave source code function "config_filenames()",
export const BEHAVE_CONFIG_FILES_PRECEDENCE = ["behave.ini", ".behaverc", "setup.cfg", "tox.ini", "pyproject.toml"];


export function getJunitFeatureName(ps: ProjectSettings, scenario: Scenario): string {
  // this function should contain similar logic to the behave source code function "make_feature_filename()".
  // this is needed to determine the junit filename that behave will use.

  let jFeatureName = "";
  const projRelFeatureFilePath = scenario.featureFileProjectRelativePath;

  for (const path of ps.rawBehaveConfigPaths) {
    // adjust path to account for behave's working directory
    const behaveRelPath = ps.projRelativeWorkingDirPath ? ps.projRelativeWorkingDirPath + "/" + path : path;
    if (projRelFeatureFilePath.startsWith(behaveRelPath)) {
      jFeatureName = projRelFeatureFilePath.slice(behaveRelPath.length + (behaveRelPath !== "" ? 1 : 0));
      break;
    }
  }

  if (!jFeatureName)
    jFeatureName = path.relative(ps.projRelativeBaseDirPath, projRelFeatureFilePath);

  jFeatureName = jFeatureName.split('.').slice(0, -1).join('.');
  jFeatureName = jFeatureName.replace(/\\/g, '/').replace(/\//g, '.');
  return jFeatureName;
}


export function getRelativeBaseDirPath(ps: ProjectSettings, relativeBehaveConfigPaths: string[]): string | null {
  // this function should contain similar logic to the behave source code function "setup_paths()"

  // the baseDir = the parent directory of the "steps" folder / environment.py file
  // (although baseDir is only ever used in getJunitFeatureName(), we don't want to call it every time that gets called,
  // but we do want to re-determine it if settings change, so this function is called from and stored in the ProjectSettings object.)

  const relativeBaseDir = relativeBehaveConfigPaths.length > 0
    ? relativeBehaveConfigPaths[0] // as per behave logic
    : path.join(ps.projRelativeWorkingDirPath, "features");

  const project_parent_dir = path.dirname(ps.uri.fsPath);
  let new_base_dir = path.join(ps.uri.fsPath, relativeBaseDir);

  while (
    !(fs.existsSync(path.join(new_base_dir, "steps")) ||
      fs.existsSync(path.join(new_base_dir, "environment.py")) ||
      new_base_dir === project_parent_dir)
  ) {
    new_base_dir = path.dirname(new_base_dir);
  }


  if (new_base_dir === project_parent_dir) {
    if (relativeBehaveConfigPaths.length === 0) {
      services.logger.showWarn(`Could not find "steps" directory for project "${ps.name}". `, ps.uri)// +
      // 'Please either: (a) specify a "paths" setting in your behave configuration file for this project, and/or ' +
      // '(b) if your behave working directory is not the same as your project root then specify a "behave-vsc.relWorkingDir"' +
      // 'in settings.json', ps.uri);
    }
    else {
      services.logger.showWarn(`Could not find "steps" directory for project "${ps.name}". ` +
        `Using the first behave configuration paths value "${new_base_dir}"`, ps.uri);
    }
    return null;
  }

  // adjust basedir path to a project-relative path
  return path.relative(ps.uri.fsPath, new_base_dir);
}
