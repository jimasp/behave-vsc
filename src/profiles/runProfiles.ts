import * as vscode from 'vscode';
import { services } from "../common/services";
import { RunProfile, getUserRunProfiles } from '../config/settings';
import { ProjMapEntry } from '../extension';
import { uriId } from '../common/helpers';


const featureRunProfiles: vscode.TestRunProfile[] = [];

export function createRunProfilesForProject(multiProject: boolean, projUri: vscode.Uri, projName: string,
  projMapEntry: ProjMapEntry): vscode.TestRunProfile[] {

  let profileName: string;

  // note: this will read from settings.json (i.e. reload latest changes)
  const userProfiles = getUserRunProfiles(projUri);
  const ctrl = projMapEntry.ctrl;
  const runHandler = projMapEntry.runHandler;
  const projId = uriId(projUri);

  const prefix = multiProject ? `${projName}: ` : "";
  const standardProfile = multiProject ? `${projName}:  all features` : " all features"; // extra spaces are for alphabetical sorting

  for (const debug of [false, true]) {

    const profileKind = debug ? vscode.TestRunProfileKind.Debug : vscode.TestRunProfileKind.Run;

    // USER'S CUSTOM SETTINGS.JSON RUN PROFILES

    for (const runProfile of userProfiles) {
      // IIFEs are here to bind profile variable to onDidChangeDefault event
      (() => {
        const profileName = `${prefix}${runProfile.name}`;
        const profile = ctrl.createRunProfile(profileName, profileKind,
          async (request: vscode.TestRunRequest) => {
            await runHandler(debug, request, runProfile);
          });
        profile.onDidChangeDefault(isDefault => onlyAllowOneDefaultPerProject(isDefault, projId, standardProfile));
        profile.tag = new vscode.TestTag(projId);
        featureRunProfiles.push(profile);
      })();
    }


    // OUT-OF-THE-BOX PROFILES

    (() => {
      const profileName = standardProfile;
      const profile = ctrl.createRunProfile(profileName, profileKind,
        async (request: vscode.TestRunRequest) => {
          await runHandler(debug, request, new RunProfile(profileName));
        });
      profile.onDidChangeDefault(isDefault => onlyAllowOneDefaultPerProject(isDefault, projId, standardProfile));
      profile.tag = new vscode.TestTag(projId);
      featureRunProfiles.push(profile);
    })();


    (() => {
      const profileName = `${prefix}ad-hoc tags ( OR )`;
      const profile = ctrl.createRunProfile(profileName, profileKind,
        async (request: vscode.TestRunRequest) => {
          const tagsString = await vscode.window.showInputBox({ placeHolder: "tag1,tag2", prompt: "Logical OR. " });
          if (!tagsString)
            return;
          if (tagsString?.includes("--tags")) {
            services.logger.showWarn("Tags string should not include `--tags`.");
            return;
          }
          const tagsParameters = "--tags=" + tagsString.split(",").map(x => x.trim());
          await runHandler(debug, request, new RunProfile(profileName, tagsParameters));
        });
      profile.onDidChangeDefault(isDefault => onlyAllowOneDefaultPerProject(isDefault, projId, standardProfile));
      profile.tag = new vscode.TestTag(projId);
      featureRunProfiles.push(profile);
    })();


    (() => {
      profileName = `${prefix}ad-hoc tags (AND)`;
      const profile = ctrl.createRunProfile(profileName, profileKind,
        async (request: vscode.TestRunRequest) => {
          const tagsString = await vscode.window.showInputBox({ placeHolder: "tag1,~tag2", prompt: "Logical AND. " });
          if (!tagsString)
            return;
          if (tagsString?.includes("--tags")) {
            services.logger.showWarn("Tags string should not include `--tags`.");
            return;
          }
          const tagsParameters = "--tags=" + tagsString.split(",").map(x => x.trim()).join(" --tags=");
          await runHandler(debug, request, new RunProfile(profileName, tagsParameters));
        });
      profile.onDidChangeDefault(isDefault => onlyAllowOneDefaultPerProject(isDefault, projId, standardProfile));
      profile.tag = new vscode.TestTag(projId);
      featureRunProfiles.push(profile);
    })();


    (() => {
      const profileName = `${prefix}ad-hoc tags (Params)`;
      const profile = ctrl.createRunProfile(profileName, profileKind,
        async (request: vscode.TestRunRequest) => {
          const tagsParameters = await vscode.window.showInputBox({
            placeHolder: "--tags=tag1,~tag2 --tags=tag3", prompt: "Specify full tags parameters."
          });
          if (!tagsParameters)
            return;
          if (!tagsParameters?.startsWith("--tags=")) {
            services.logger.showWarn("Parameters must start with `--tags=`.");
            return;
          }
          await runHandler(debug, request, new RunProfile(profileName, tagsParameters));
        });
      profile.onDidChangeDefault(isDefault => onlyAllowOneDefaultPerProject(isDefault, projId, standardProfile));
      profile.tag = new vscode.TestTag(projId);
      featureRunProfiles.push(profile);
    })();

  }

  // checkAtLeastOneDefaultSet(projId, standardProfile);

  return featureRunProfiles;
}

// async function checkAtLeastOneDefaultSet(projId: string, standardProfile: string) {

//   await new Promise(resolve => setTimeout(resolve, 1000)); // wait for vscode

//   const featureRunProfilesForProject = featureRunProfiles.filter(p => p.tag?.id === projId);
//   const noOfSelectedDefaults = featureRunProfilesForProject.filter(p => p.isDefault).length;

//   if (noOfSelectedDefaults === 0)
//     featureRunProfilesForProject.filter(x => x.label === standardProfile).forEach(x => x.isDefault = true);
// }


function onlyAllowOneDefaultPerProject(isDefault: boolean, projId: string, standardProfile: string) {
  // THIS FUNCTION ENSURES THAT ONLY ONE DEFAULT RUN PROFILE IS SET PER PROJECT FOR FEATURES PROFILES (ONE EACH FOR RUN AND DEBUG).
  // We don't want more than one default because default profiles run one after the other, so allowing multiple defaults 
  // would mean that the same test could be hit twice with the same behave tags (or no behave tags). 
  // Equally a scenario itself could have multiple tags (so we couldn't stop overlap via selected run profiles by just looking at their tags).
  // This would create various problems, including the same test having its results updated immediately by the next run.

  if (!isDefault)
    return;

  const featureRunProfilesForProject = featureRunProfiles.filter(p => p.tag?.id === projId);
  const noOfSelectedDefaults = featureRunProfilesForProject.filter(p => p.isDefault).length;

  // if more than one default profile was set, then set them all false, and set the normal default ("Features")
  if (noOfSelectedDefaults > 2) {
    featureRunProfilesForProject.forEach(p => p.isDefault = false);
    featureRunProfilesForProject.filter(x => x.label === standardProfile).forEach(x => x.isDefault = true);
    services.logger.showWarn(`Only one default Features run profile is supported. Default has been reset to "${standardProfile}".`);
    return;
  }

}
