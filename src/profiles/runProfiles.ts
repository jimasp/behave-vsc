import * as vscode from 'vscode';
import { services } from "../common/services";
import { ITestRunHandler } from '../runners/testRunHandler';
import { RunProfile } from '../config/settings';
import { isIterable } from '../common/helpers';



const config = services.config;
const PREFIX = "Features";
const featureRunProfiles: vscode.TestRunProfile[] = [];


export function createRunProfiles(ctrl: vscode.TestController, runHandler: ITestRunHandler): vscode.TestRunProfile[] {

  let profileName: string;

  for (const debug of [false, true]) {

    const profileKind = debug ? vscode.TestRunProfileKind.Debug : vscode.TestRunProfileKind.Run;

    // CUSTOM SETTINGS.JSON RUN PROFILES

    if (config.instanceSettings.runProfiles) {
      if (!isIterable(config.instanceSettings.runProfiles)) {
        services.logger.showWarn(`"behave-vsc.runProfiles" must be an array of objects.`);
      }
      else {
        for (const profileSetting of config.instanceSettings.runProfiles) {
          // IIFEs are here to bind scope of profile variable in onDidChangeDefault event               
          (() => {
            const profileName = `${PREFIX}: ${profileSetting.name}`;
            const profile = ctrl.createRunProfile(profileName, profileKind,
              async (request: vscode.TestRunRequest) => {
                await runHandler(debug, request, profileSetting);
              });
            profile.onDidChangeDefault(() => onlyAllowOneDefault(PREFIX));
            featureRunProfiles.push(profile);
          })();
        }
      }
    }


    // STANDARD PROFILES

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
  // - as long as the profile names are the same for run and debug, vscode will set their defaults together

  if (featureRunProfiles.length === 2)
    return;

  // vscode currently seems to have a "hidden default" where it will automatically set the first profile as 
  // the default profile if there are none, but it won't show the profile as selected in the UI, so 
  // we'll set it again here to update the UI
  if (featureRunProfiles.filter(p => p.isDefault).length < 2) {
    featureRunProfiles.filter(x => x.label === PREFIX).forEach(x => x.isDefault = true);
    return;
  }

  // if more than one default profile was set, set them all false
  if (featureRunProfiles.filter(p => p.isDefault).length > 2) {
    featureRunProfiles.forEach(p => p.isDefault = false);
    featureRunProfiles.filter(x => x.label === PREFIX).forEach(x => x.isDefault = true);
    services.logger.showWarn(`Only one default Features run profile is allowed. Default has been reset to "${runOrDebugPrefix}".`);
  }
}
