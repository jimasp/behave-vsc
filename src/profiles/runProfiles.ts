import * as vscode from 'vscode';
import { services } from "../common/services";
import { ITestRunHandler } from '../runners/testRunHandler';
import { RunProfile } from '../config/settings';
import { isIterable } from '../common/helpers';



const config = services.config;
const DEBUG_PREFIX = "Debug Features";
const RUN_PREFIX = "Run Features";
const featureRunProfiles: vscode.TestRunProfile[] = [];


export function createRunProfiles(ctrl: vscode.TestController, runHandler: ITestRunHandler): vscode.TestRunProfile[] {

  let profileName: string;

  for (const debug of [false, true]) {

    const prefix = debug ? DEBUG_PREFIX : RUN_PREFIX;
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
            const profileName = `${prefix}: ${profileSetting.name}`;
            const profile = ctrl.createRunProfile(profileName, profileKind,
              async (request: vscode.TestRunRequest) => {
                await runHandler(debug, request, profileSetting);
              });
            profile.onDidChangeDefault(() => onlyAllowOneDefault(prefix));
            featureRunProfiles.push(profile);
          })();
        }
      }
    }


    // STANDARD PROFILES

    (() => {
      const profileName = prefix;
      const profile = ctrl.createRunProfile(profileName, profileKind,
        async (request: vscode.TestRunRequest) => {
          await runHandler(debug, request, new RunProfile(profileName));
        });
      profile.onDidChangeDefault(() => onlyAllowOneDefault(prefix));
      featureRunProfiles.push(profile);
    })();


    (() => {
      const profileName = `${prefix}: ad-hoc tags ( OR )`;
      const profile = ctrl.createRunProfile(profileName, profileKind,
        async (request: vscode.TestRunRequest) => {
          const tagString = await vscode.window.showInputBox({ placeHolder: "tag1,tag2", prompt: "Logical OR. " });
          if (!tagString)
            return;
          if (tagString?.includes("--tags")) {
            services.logger.showWarn("Tags string should not include `--tags`.");
            return;
          }
          const tagExpression = "--tags=" + tagString.split(",").map(x => x.trim());
          await runHandler(debug, request, new RunProfile(profileName, tagExpression));
        });
      profile.onDidChangeDefault(() => onlyAllowOneDefault(prefix));
      featureRunProfiles.push(profile);
    })();


    (() => {
      profileName = `${prefix}: ad-hoc tags (AND)`;
      const profile = ctrl.createRunProfile(profileName, profileKind,
        async (request: vscode.TestRunRequest) => {
          const tagString = await vscode.window.showInputBox({ placeHolder: "tag1,~tag2,-tag3", prompt: "Logical AND. " });
          if (!tagString)
            return;
          if (tagString?.includes("--tags")) {
            services.logger.showWarn("Tags string should not include `--tags`.");
            return;
          }
          const tagExpression = "--tags=" + tagString.split(",").map(x => x.trim()).join(" --tags=");
          await runHandler(debug, request, new RunProfile(profileName, tagExpression));
        });
      profile.onDidChangeDefault(() => onlyAllowOneDefault(prefix));
      featureRunProfiles.push(profile);
    })();


    (() => {
      const profileName = `${prefix}: ad-hoc tags (Expression)`;
      const profile = ctrl.createRunProfile(profileName, profileKind,
        async (request: vscode.TestRunRequest) => {
          const tagExpression = await vscode.window.showInputBox({ placeHolder: "--tags=tag1 --tags=tag2", prompt: "Tag Expression. " });
          if (!tagExpression)
            return;
          if (!tagExpression?.startsWith("--tags=")) {
            services.logger.showWarn("Tag expression must start with `--tags=`.");
            return;
          }
          await runHandler(debug, request, new RunProfile(profileName, tagExpression));
        });
      profile.onDidChangeDefault(() => onlyAllowOneDefault(prefix));
      featureRunProfiles.push(profile);
    })();

  }

  return featureRunProfiles;
}


function onlyAllowOneDefault(runOrDebugPrefix: string) {
  // This function ensures that only one default run profile is set for Features profiles.
  // This is because default profiles run in parallel. This means that the same test can be hit twice with the same tags (or no tags). 
  // Equally a feature itself can be hit for multiple tags (e.g. @tag1 and @tag2 on the same scenario for 2x run profiles).
  // This would create various problems, including:
  //   a. the test running in parallel with itself (side-effects),
  //   b. the same test having its results updated immediately by the next run.

  if (featureRunProfiles.filter(x => x.isDefault).length > 1) {
    for (const profile of featureRunProfiles) {
      // matching only the appropriate prefix (run or debug), set the 
      // standard profile to true, and set all other profiles to false
      if (profile.label.startsWith(runOrDebugPrefix))
        profile.isDefault = profile.label === runOrDebugPrefix;
    }
    services.logger.showWarn(`Only one default Features run profile is allowed. Default has been reset to "${runOrDebugPrefix}".`);
    return;
  }

  // vscode currently seems to have a bug where it will automatically set the first profile as the default profile if there are none, 
  // but it won't show the profile as selected in the UI, so we'll set it again here to update the UI
  if (featureRunProfiles.filter(x => x.isDefault).length === 0) {
    const standardProfile = featureRunProfiles.find(x => x.label === runOrDebugPrefix);
    if (!standardProfile)
      throw new Error(`Could not find profile with label "${runOrDebugPrefix}".`);
    standardProfile.isDefault = true;
  }

}



