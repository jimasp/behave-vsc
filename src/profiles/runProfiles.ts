import * as vscode from 'vscode';
import { services } from "../common/services";
import { ProjectSettings, RunProfile } from '../config/settings';
import { ITestRunHandler } from '../runners/testRunHandler';
import { HAIR_SPACE, THIN_SPACE } from '../common/helpers';



export function createRunProfilesForProject(ps: ProjectSettings, multiRoot: boolean, ctrl: vscode.TestController,
  runHandler: ITestRunHandler): vscode.TestRunProfile[] {

  let profileName: string;
  const projRunProfiles: vscode.TestRunProfile[] = [];

  // note: this will read from settings.json (i.e. reload latest changes)
  const userProfiles = ps.userRunProfiles;
  const projName = ps.name;

  const projPrefix = multiRoot ? `${projName}: ` : "";
  // add low-order spaces for alpha ordering (so that "all features" is first when no default profile is set)
  const standardProfile = multiRoot ? `${projName}:${THIN_SPACE}${HAIR_SPACE}all features` : `${HAIR_SPACE}all features`;

  for (const debug of [false, true]) {

    const profileKind = debug ? vscode.TestRunProfileKind.Debug : vscode.TestRunProfileKind.Run;

    // USER'S CUSTOM SETTINGS.JSON RUN PROFILES

    for (const runProfile of userProfiles) {
      // IIFEs are here to bind profile variable to onDidChangeDefault event
      (() => {
        const profileName = `${projPrefix}${runProfile.name}`;
        const profile = ctrl.createRunProfile(profileName, profileKind,
          async (request: vscode.TestRunRequest) => {
            await runHandler(debug, request, runProfile);
          });
        profile.onDidChangeDefault(isDefault => onlyAllowOneDefaultPerProject(isDefault, projRunProfiles, standardProfile));
        projRunProfiles.push(profile);
      })();
    }


    // OUT-OF-THE-BOX PROFILES

    (() => {
      const profileName = standardProfile;
      const profile = ctrl.createRunProfile(profileName, profileKind,
        async (request: vscode.TestRunRequest) => {
          await runHandler(debug, request, new RunProfile(profileName));
        }, true);
      profile.onDidChangeDefault(isDefault => onlyAllowOneDefaultPerProject(isDefault, projRunProfiles, standardProfile));
      projRunProfiles.push(profile);
    })();


    (() => {
      const profileName = `${projPrefix}ad-hoc tags ( OR )`;
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
      profile.onDidChangeDefault(isDefault => onlyAllowOneDefaultPerProject(isDefault, projRunProfiles, standardProfile));
      projRunProfiles.push(profile);
    })();


    (() => {
      profileName = `${projPrefix}ad-hoc tags (AND)`;
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
      profile.onDidChangeDefault(isDefault => onlyAllowOneDefaultPerProject(isDefault, projRunProfiles, standardProfile));
      projRunProfiles.push(profile);
    })();


    (() => {
      const profileName = `${projPrefix}ad-hoc tags (Params)`;
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
      profile.onDidChangeDefault(isDefault => onlyAllowOneDefaultPerProject(isDefault, projRunProfiles, standardProfile));
      projRunProfiles.push(profile);
    })();

  }

  return projRunProfiles;
}


function onlyAllowOneDefaultPerProject(isDefault: boolean, projRunProfiles: vscode.TestRunProfile[], standardProfile: string) {
  // THIS FUNCTION ENSURES THAT ONLY ONE DEFAULT RUN PROFILE IS SET PER PROJECT FOR FEATURES PROFILES (ONE EACH FOR RUN AND DEBUG).
  // We don't want more than one default because default profiles run one after the other, so allowing multiple defaults 
  // would mean that the same test could be hit twice with the same behave tags (or no behave tags). 
  // Equally a scenario itself could have multiple tags (so we couldn't stop overlap via selected run profiles by just looking at their tags).
  // This would create various problems, including the same test having its results updated immediately by the next run.

  if (!isDefault)
    return;

  const selectedDefaultsForThisProject = projRunProfiles.filter(p => p.isDefault);

  // if more than one default profile was set, then set them all false, and set the normal default ("Features")
  if (selectedDefaultsForThisProject.length > 2) {
    projRunProfiles.forEach(p => p.isDefault = false);
    projRunProfiles.filter(x => x.label === standardProfile).forEach(x => x.isDefault = true);
    services.logger.showWarn(`Only one default Features run profile is supported. Default has been reset to "${standardProfile}".`);
    return;
  }

}
