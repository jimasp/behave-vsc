import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { services } from '../common/services';
import { BEHAVE_CONFIG_FILES_PRECEDENCE } from '../behaveLogic';
import { ProjectSettings } from './settings';


type BehaveConfigPaths = {
  rawBehaveConfigPaths: string[];
  behaveWrkDirRelBehaveConfigPaths: string[];
  projRelBehaveConfigPaths: string[];
}


export function getBehaveConfigPaths(ps: ProjectSettings): BehaveConfigPaths {

  const { matchedConfigFile, paths } = getBehavePathsFromConfigFile(ps);

  if (!paths)
    return { rawBehaveConfigPaths: [], behaveWrkDirRelBehaveConfigPaths: [], projRelBehaveConfigPaths: [] };

  let relPaths: string[] = [];
  for (let biniPath of paths) {
    // the behave config "paths" setting may be either:
    // a) working-directory-relative paths,
    // b) absolute paths (that includes the working directory path),
    // c) a combination of both,
    // d) it may also be a paths to .feature files
    // we need to convert them all to project-relative paths, then check they exist

    if (biniPath.endsWith(".feature"))
      biniPath = path.dirname(biniPath);

    // first, convert any absolute paths to relative paths
    let behaveWrkRelPath = path.isAbsolute(biniPath) ? path.relative(ps.behaveWorkingDirUri.fsPath, biniPath) : biniPath;

    const projectRelPath = path.join(ps.projRelativeBehaveWorkingDirPath, behaveWrkRelPath);
    if (projectRelPath.startsWith("..") || path.isAbsolute(projectRelPath)) {
      services.logger.showWarn(`Ignoring path "${biniPath}" in config file ${matchedConfigFile} because it is outside the project.`, ps.uri);
      continue;
    }

    // use "" for consistency with behaviour elsewhere (i.e. path.relative() and path.replace())
    if (behaveWrkRelPath === "." || behaveWrkRelPath === "./")
      behaveWrkRelPath = "";

    // check path exists
    const fsPath = vscode.Uri.joinPath(ps.behaveWorkingDirUri, behaveWrkRelPath).fsPath;
    if (!fs.existsSync(fsPath)) {
      services.logger.showWarn(`Ignoring invalid path "${biniPath}" in config file ${matchedConfigFile}.`, ps.uri);
    }
    else {
      if (!fs.statSync(fsPath).isDirectory()) {
        services.logger.showWarn(`Ignoring non-directory path "${biniPath}" in config file ${matchedConfigFile}.`, ps.uri);
        continue;
      }
      relPaths.push(behaveWrkRelPath);
    }
  }

  // NOTE: do NOT sort either rawBehaveConfigPaths or behaveWrkDirRelBehaveConfigPaths paths. We must PRESERVE the order for 
  // when we use rawBehaveConfigPaths in getJunitFeatureName and behaveWrkDirRelativeConfigPaths in getBaseDirPath 
  // such that our logic does not differ from behave's in those functions, i.e. behaveWrkDirRelativeConfigPaths[0] and any looping order.
  relPaths = [...new Set(relPaths)];

  const projRelPaths = relPaths.map(p => path.join(ps.projRelativeBehaveWorkingDirPath, p).replace(/^\.$/g, ""));

  services.logger.logInfo(`Behave config file "${matchedConfigFile}" sets project-relative paths: ` +
    `${projRelPaths.map(p => `"${p}"`).join(", ")}`, ps.uri);

  return {
    rawBehaveConfigPaths: paths,
    behaveWrkDirRelBehaveConfigPaths: relPaths,
    projRelBehaveConfigPaths: projRelPaths
  };
}


function getBehavePathsFromConfigFile(ps: ProjectSettings) {
  let paths: string[] | null = null;
  let matchedConfigFile;
  let lastExistingConfigFile = null;

  // we DON'T need to reverse() BEHAVE_CONFIG_FILES like behave because we are only 
  // interested in the "paths" setting (not all cumulative settings), 
  // i.e. we can just break on the first file in the order that has a "paths" setting.  

  for (const configFile of BEHAVE_CONFIG_FILES_PRECEDENCE) {
    const configFilePath = path.join(ps.behaveWorkingDirUri.fsPath, configFile);
    if (fs.existsSync(configFilePath)) {
      lastExistingConfigFile = configFile;
      // TODO: for behave 1.2.7 we will also need to support pyproject.toml      
      if (configFile === "pyproject.toml")
        continue;
      const contents = fs.readFileSync(configFilePath, 'utf-8');
      paths = getBehavePathsFromIniContents(contents);
      if (paths) {
        matchedConfigFile = configFile;
        break;
      }
    }
  }

  if (!lastExistingConfigFile) {
    services.logger.logInfo(`No Behave config file found, using default paths.`, ps.uri);
  }
  else if (!paths) {
    services.logger.logInfo(`Behave config file "${lastExistingConfigFile}" did not set paths, using default paths.`, ps.uri);
  }

  return { matchedConfigFile, paths };
}

function getBehavePathsFromIniContents(iniFileContents: string): string[] | null {

  // WE HAVE TO FOLLOW BEHAVE'S OWN PATHS BEHAVIOUR HERE
  // (see "read_configuration" in behave's source code)
  //
  // example ini file #1 - becomes []
  // [behave]
  // paths =
  //
  // example #2 - becomes ["features"]
  //  [behave]
  // paths = ./features
  //
  // example #3 - becomes ["/home/me/project/features"] (will be converted to a relative path up the call stack)
  //  [behave]
  // paths=/home/me/project/features
  //
  // example #4 - becomes ["features", "features2"]
  //  [behave]
  // paths  =features
  //     features2
  // stdout_capture= true
  //
  // example #5 - ignored due to space in "[behave ]"
  //  [behave ]
  // paths  =features
  //

  const normalisePath = (p: string) => {
    if (p.startsWith("./"))
      return p.slice(2);
    return p.replaceAll("/./", "/");
  }

  const lines = iniFileContents.split('\n');
  let currentSection = '';
  let paths: string[] | null = null;

  for (let line of lines) {
    line = line.trim();
    if (line.startsWith('#') || line.startsWith(';'))
      continue;

    if (line.startsWith('[') && line.endsWith(']')) {
      // behave's config parser will only match "[behave]", 
      // e.g. it won't match "[behave ]", so we will do the same
      const newSection = line.slice(1, -1);
      if (newSection === "")
        continue;
      if (newSection !== "behave" && currentSection === "behave")
        break;
      currentSection = newSection;
      continue;
    }

    if (currentSection !== "behave")
      continue;

    if (line.includes('=')) {
      const [key, value] = line.split('=');
      if (key.trim() !== "paths")
        continue;
      const trimmed = value.trim();
      if (trimmed === "")
        continue;
      paths = [normalisePath(trimmed)];
      continue;
    }

    if (line.length > 0)
      paths?.push(normalisePath(line));
  }

  return paths;
}

