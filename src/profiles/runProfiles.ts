import * as vscode from 'vscode';
import { services } from "../common/services";
import { ITestRunHandler } from '../runners/testRunHandler';
import { RunProfile } from '../config/settings';
import { isIterable } from '../common/helpers';


const config = services.config;
const featureRunProfiles: vscode.TestRunProfile[] = [];
const PREFIX = "Features";


export function createRunProfiles(ctrl: vscode.TestController, runHandler: ITestRunHandler): vscode.TestRunProfile[] {

  let profileName: string;

  for (const debug of [false, true]) {

    const profileKind = debug ? vscode.TestRunProfileKind.Debug : vscode.TestRunProfileKind.Run;

    // USER'S CUSTOM SETTINGS.JSON RUN PROFILES

    if (!isIterable(config.instanceSettings.runProfiles)) {
      services.logger.showWarn(`"behave-vsc.runProfiles" must be an array of objects.`);
    }
    else {
      for (const runProfile of config.instanceSettings.runProfiles) {
        // IIFEs are here to bind profile variable to onDidChangeDefault event
        (() => {
          const profileName = `${PREFIX}: ${runProfile.name}`;
          const profile = ctrl.createRunProfile(profileName, profileKind,
            async (request: vscode.TestRunRequest) => {
              await runHandler(debug, request, runProfile);
            });
          profile.onDidChangeDefault(() => onlyAllowOneDefault(PREFIX));
          featureRunProfiles.push(profile);
        })();
      }
    }


    // OUT-OF-THE-BOX PROFILES

    (() => {
      const profileName = PREFIX;
      const profile = ctrl.createRunProfile(profileName, profileKind,
        async (request: vscode.TestRunRequest) => {
          await runHandler(debug, request, new RunProfile(profileName));
        });
      profile.onDidChangeDefault(() => onlyAllowOneDefault(PREFIX));
      featureRunProfiles.push(profile);
    })();


    (() => {
      const profileName = `${PREFIX}: ad-hoc tags ( OR )`;
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
      profile.onDidChangeDefault(() => onlyAllowOneDefault(PREFIX));
      featureRunProfiles.push(profile);
    })();


    (() => {
      profileName = `${PREFIX}: ad-hoc tags (AND)`;
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
      profile.onDidChangeDefault(() => onlyAllowOneDefault(PREFIX));
      featureRunProfiles.push(profile);
    })();


    (() => {
      const profileName = `${PREFIX}: ad-hoc tags (Params)`;
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
      profile.onDidChangeDefault(() => onlyAllowOneDefault(PREFIX));
      featureRunProfiles.push(profile);
    })();

  }

  return featureRunProfiles;
}


function onlyAllowOneDefault(runOrDebugPrefix: string) {
  // THIS FUNCTION ENSURES THAT ONLY ONE DEFAULT RUN PROFILE IS SET FOR FEATURES PROFILES (ONE EACH FOR RUN AND DEBUG).
  // This is because default profiles run one after the other, so allowing multiple defaults would mean that the same test 
  // could be hit twice with the same tags (or no tags). 
  // Equally a scenario itself could have multiple tags (so we couldn't stop overlap via selected run profiles by just looking at their tags).
  // This would create various problems, including the same test having its results updated immediately by the next run.

  // NOTES: 
  // - if e.g. you select (or deselect) 3 profiles, this function will be called 3 times, once for each profile
  // - as long as the profile names are the same for run and debug (which they are), vscode will set their defaults together

  const noOfSelectedDefaults = featureRunProfiles.filter(p => p.isDefault).length;
  if (noOfSelectedDefaults === 2) {
    // 1 default profile was set, i.e. 2 = 1 run default + 1 debug default 
    // nothing to do
    return;
  }

  // if more than one default profile was set, then set them all false, and set the normal default ("Features")
  if (noOfSelectedDefaults > 2) {
    featureRunProfiles.forEach(p => p.isDefault = false);
    featureRunProfiles.filter(x => x.label === PREFIX).forEach(x => x.isDefault = true);
    services.logger.showWarn(`Only one default Features run profile is supported. Default has been reset to "${runOrDebugPrefix}".`);
    return;
  }

  // noOfSelectedDefaults < 2 if we got here.
  // vscode currently (March 2024) seems to have a "hidden default" bug where it will automatically set the first profile as 
  // the default profile if there are none for ANY test extension (e.g. if no default selected for EITHER pytest or behave-vsc), 
  // but it won't show the profile as selected in the UI, so we'll set it again here to update the UI to unhide the default
  const normalDefaults = featureRunProfiles.filter(x => x.label === PREFIX);
  if (normalDefaults.some(x => x.isDefault))
    normalDefaults.forEach(x => x.isDefault = true);

}
