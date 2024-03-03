import * as vscode from 'vscode';
import { services } from "../common/services";
import { ITestRunHandler } from '../runners/testRunHandler';
import { RunProfile } from '../config/settings';
import { isIterable } from '../common/helpers';


const config = services.config;
const DEBUG_PREFIX = "Debug Features";
const RUN_PREFIX = "Run Features";

export function createRunProfiles(ctrl: vscode.TestController, runHandler: ITestRunHandler): vscode.TestRunProfile[] {

  const runProfiles: vscode.TestRunProfile[] = [];
  let profileName: string;

  for (const debug of [false, true]) {

    const prefix = debug ? DEBUG_PREFIX : RUN_PREFIX;
    const profileKind = debug ? vscode.TestRunProfileKind.Debug : vscode.TestRunProfileKind.Run;

    // custom settings.json run profiles

    if (config.instanceSettings.runProfiles) {
      if (!isIterable(config.instanceSettings.runProfiles)) {
        services.logger.showWarn(`"behave-vsc.runProfiles" must be an array of objects.`);
      }
      else {
        for (const profileSetting of config.instanceSettings.runProfiles) {
          (() => {
            // IIFE to bind scope for profileName variable for onDidChangeDefault event           
            const profileName = profileSetting.name;
            const profile = ctrl.createRunProfile(`${prefix}: ${profileSetting.name}`, profileKind,
              async (request: vscode.TestRunRequest) => {
                await runHandler(debug, request, profileSetting);
              });
            profile.onDidChangeDefault(isDefault => onlyOneDefault(isDefault, profileName, runProfiles));
            runProfiles.push(profile);
          })();
        }
      }
    }


    // standard profiles

    (() => {
      const profileName = prefix;
      const profile = ctrl.createRunProfile(profileName, profileKind,
        async (request: vscode.TestRunRequest) => {
          await runHandler(debug, request, new RunProfile(profileName));
        });
      profile.onDidChangeDefault(isDefault => onlyOneDefault(isDefault, profileName, runProfiles));
      runProfiles.push(profile);
    })();


    (() => {
      const profileName = "ad-hoc tags ( OR )";
      const profile = ctrl.createRunProfile(`${prefix}: ${profileName}`, profileKind,
        async (request: vscode.TestRunRequest) => {
          const tagString = await vscode.window.showInputBox({ placeHolder: "tag1,tag2" });
          if (!tagString)
            return;
          if (tagString?.includes("--tags")) {
            services.logger.showWarn("Tags string should not include `--tags`.");
            return;
          }
          const tagExpression = "--tags=" + tagString.split(",").map(x => x.trim());
          await runHandler(debug, request, new RunProfile(profileName, tagExpression));
        });
      profile.onDidChangeDefault(isDefault => onlyOneDefault(isDefault, profileName, runProfiles));
      runProfiles.push(profile);
    })();


    (() => {
      profileName = "ad-hoc tags (AND)";
      const profile = ctrl.createRunProfile(`${prefix}: ${profileName}`, profileKind,
        async (request: vscode.TestRunRequest) => {
          const tagString = await vscode.window.showInputBox({ placeHolder: "tag1,~tag2`" });
          if (!tagString)
            return;
          if (tagString?.includes("--tags")) {
            services.logger.showWarn("Tags string should not include `--tags`.");
            return;
          }
          const tagExpression = "--tags=" + tagString.split(",").map(x => x.trim()).join(" --tags=");
          await runHandler(debug, request, new RunProfile(profileName, tagExpression));
        });
      profile.onDidChangeDefault(isDefault => onlyOneDefault(isDefault, profileName, runProfiles));
      runProfiles.push(profile);
    })();


    (() => {
      const profileName = "ad-hoc tags (Expression)";
      const profile = ctrl.createRunProfile(`${prefix}: ${profileName}`, profileKind,
        async (request: vscode.TestRunRequest) => {
          const tagExpression = await vscode.window.showInputBox({ placeHolder: "--tags=tag1 --tags=tag2" });
          if (!tagExpression)
            return;
          if (!tagExpression?.startsWith("--tags=")) {
            services.logger.showWarn("Tag expression must start with `--tags=`.");
            return;
          }
          await runHandler(debug, request, new RunProfile(profileName, tagExpression));
        });
      profile.onDidChangeDefault(isDefault => onlyOneDefault(isDefault, profileName, runProfiles));
      runProfiles.push(profile);
    })();

  }

  return runProfiles;
}


async function onlyOneDefault(isDefault: boolean, profileName: string, featureProfiles: vscode.TestRunProfile[]) {
  // This function ensures that only one default run profile is set for Features profiles.
  // Default profiles run in parallel. This means that the same test can be hit twice with the same tags (or no tags). 
  // Equally a feature itself can be hit for multiple tags (e.g. @tag1 and @tag2 on the same scenario for 2x run profiles).
  // This would create various issues, including:
  //   a. the test running in parallel with itself (side-effects),
  //   b. the same test having its results overwritten immediately by the next run.

  if (!isDefault) {
    // set isDefault to false NOW for deselected profiles, so that the runProfiles array is in sync 
    // before the parallel call to this function by the new default profile completes the delay further down in this function
    let profile = featureProfiles.find(x => x.label === `${DEBUG_PREFIX}: ${profileName}`);
    if (profile)
      profile.isDefault = false;
    profile = featureProfiles.find(x => x.label === `${RUN_PREFIX}: ${profileName}`);
    if (profile)
      profile.isDefault = false;

    return; // done
  }

  // add slight delay to allow for isDefault to be set to false above
  await new Promise(resolve => setTimeout(resolve, 100));

  let userSelectedTwo = false;
  let selections = 0;

  for (const p of featureProfiles) {
    if (p.label === profileName // Debug Features/Run Features
      || p.label === `${DEBUG_PREFIX}: ${profileName}`
      || p.label === `${RUN_PREFIX}: ${profileName}`) {

      p.isDefault = true; // sync debug and run profiles
      continue;
    }

    if (p.isDefault) {
      selections++;
      if (selections > 1) {
        userSelectedTwo = true;
      }
    }

    // only allow one default Features run profile (i.e. one for run + one for debug)          
    p.isDefault = false;
  }

  if (userSelectedTwo) {
    // vscode requires one default (even if you can't see it in the UI)
    // reset to "Run Features" (and "Debug Features")
    for (const p of featureProfiles) {
      if (p.label === DEBUG_PREFIX || p.label === RUN_PREFIX) {
        p.isDefault = true;
      }
      else {
        p.isDefault = false;
      }
    }

    services.logger.showWarn(`Only one default Features run profile is allowed.`);
  }

}

