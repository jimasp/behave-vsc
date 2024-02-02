import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { services } from './services';
import { ProjectSettings } from './config/settings';
import { Scenario } from './parsers/testFile';



export function getRelativeBaseDirPath(projUri: vscode.Uri, projName: string, projRelativeWorkingDirPath: string,
  relativeBehaveConfigPaths: string[]): string | null {

  // this function will determine the baseDir
  // where the baseDir = the directory that contains the "steps" folder / environment.py file

  // NOTE: THIS FUNCTION MUST HAVE LOOSELY SIMILAR LOGIC TO THE 
  // BEHAVE SOURCE CODE FUNCTION "setup_paths()".
  // IF THAT FUNCTION LOGIC CHANGES IN BEHAVE, THEN IT IS LIKELY THIS FUNCTION WILL ALSO HAVE TO CHANGE.  
  // THIS IS BECAUSE THE BASE DIR IS USED TO CALCULATE (PREDICT) THE JUNIT FILENAME THAT BEHAVE WILL USE.

  const relativeBaseDir = relativeBehaveConfigPaths.length > 0
    ? relativeBehaveConfigPaths[0]
    : projRelativeWorkingDirPath + "/features";

  const project_parent_dir = path.dirname(projUri.fsPath);
  let new_base_dir = path.join(projUri.fsPath, relativeBaseDir);

  while (
    !(fs.existsSync(path.join(new_base_dir, "steps")) ||
      fs.existsSync(path.join(new_base_dir, "environment.py")) ||
      new_base_dir === project_parent_dir)
  ) {
    new_base_dir = path.dirname(new_base_dir);
  }


  if (new_base_dir === project_parent_dir) {
    if (relativeBehaveConfigPaths.length === 0) {
      services.logger.showWarn(`Could not find "steps" directory for project "${projName}". ` +
        'Please either: (a) specify a "paths" setting in your behave configuration file for this project, and/or ' +
        '(b) if your behave working directory is not the same as your project root then specify a "behave-vsc.relWorkingDir"' +
        'in settings.json', projUri);
    }
    else {
      services.logger.showWarn(`Could not find "steps" directory for project "${projName}". ` +
        `Using the first behave configuration paths value "${new_base_dir}"`, projUri);
    }
    return null;
  }

  return path.relative(projUri.fsPath, new_base_dir);
}



export function getJunitFeatureName(projSettings: ProjectSettings, scenario: Scenario): string {
  // NOTE: THIS FUNCTION MUST HAVE BASICALLY THE SAME LOGIC AS THE 
  // BEHAVE SOURCE CODE FUNCTION "make_feature_filename()".
  // IF THAT FUNCTION CHANGES IN BEHAVE, THEN IT IS LIKELY THIS WILL ALSO HAVE TO CHANGE.    
  // THIS IS BECAUSE THIS FUNCTION IS USED TO CALCULATE (PREDICT) THE JUNIT FILENAME THAT BEHAVE WILL USE.  
  let jFeatureName = "";
  const relFeatureFilePath = scenario.featureFileProjectRelativePath;

  for (const path of projSettings.rawBehaveConfigPaths) {
    // adjust path to account for behave's working directory
    const behaveRelPath = projSettings.projRelativeWorkingDirPath ? projSettings.projRelativeWorkingDirPath + "/" + path : path;
    if (relFeatureFilePath.startsWith(behaveRelPath)) {
      jFeatureName = relFeatureFilePath.slice(behaveRelPath.length + (behaveRelPath !== "" ? 1 : 0));
      break;
    }
  }

  if (!jFeatureName)
    jFeatureName = path.relative(projSettings.projRelativeBaseDirPath, relFeatureFilePath);

  jFeatureName = jFeatureName.split('.').slice(0, -1).join('.');
  jFeatureName = jFeatureName.replace(/\\/g, '/').replace(/\//g, '.');
  return jFeatureName;
}
