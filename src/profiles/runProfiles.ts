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
            profile.onDidChangeDefault(isDefault => onlyAllowOneDefault(isDefault, profileName, runProfiles));
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
      profile.onDidChangeDefault(isDefault => onlyAllowOneDefault(isDefault, profileName, runProfiles));
      runProfiles.push(profile);
    })();


    (() => {
      const profileName = "ad-hoc tags ( OR )";
      const profile = ctrl.createRunProfile(`${prefix}: ${profileName}`, profileKind,
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
      profile.onDidChangeDefault(isDefault => onlyAllowOneDefault(isDefault, profileName, runProfiles));
      runProfiles.push(profile);
    })();


    (() => {
      profileName = "ad-hoc tags (AND)";
      const profile = ctrl.createRunProfile(`${prefix}: ${profileName}`, profileKind,
        async (request: vscode.TestRunRequest) => {
          const tagString = await vscode.window.showInputBox({ placeHolder: "tag1,~tag2", prompt: "Logical AND. " });
          if (!tagString)
            return;
          if (tagString?.includes("--tags")) {
            services.logger.showWarn("Tags string should not include `--tags`.");
            return;
          }
          const tagExpression = "--tags=" + tagString.split(",").map(x => x.trim()).join(" --tags=");
          await runHandler(debug, request, new RunProfile(profileName, tagExpression));
        });
      profile.onDidChangeDefault(isDefault => onlyAllowOneDefault(isDefault, profileName, runProfiles));
      runProfiles.push(profile);
    })();


    (() => {
      const profileName = "ad-hoc tags (Expression)";
      const profile = ctrl.createRunProfile(`${prefix}: ${profileName}`, profileKind,
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
      profile.onDidChangeDefault(isDefault => onlyAllowOneDefault(isDefault, profileName, runProfiles));
      runProfiles.push(profile);
    })();

  }

  return runProfiles;
}


const defaultsTracker: string[] = [];

async function onlyAllowOneDefault(isDefault: boolean, profileName: string, featureProfiles: vscode.TestRunProfile[]) {
  // This function ensures that only one default run profile is set for Features profiles.
  // This is because default profiles run in parallel. This means that the same test can be hit twice with the same tags (or no tags). 
  // Equally a feature itself can be hit for multiple tags (e.g. @tag1 and @tag2 on the same scenario for 2x run profiles).
  // This would create various problems, including:
  //   a. the test running in parallel with itself (side-effects),
  //   b. the same test having its results overwritten immediately by the next run.


  // this function can get called multiple times (i.e. once for each selection), 
  // so we'll track/update the current state in our own variable
  if (isDefault)
    defaultsTracker.push(profileName);
  else
    defaultsTracker.splice(defaultsTracker.indexOf(profileName), 1);
  // add small delay to allow for defaultsTracker to be set on all calls
  await new Promise(resolve => setTimeout(resolve, 100));

  if (defaultsTracker.length > 1) {
    services.logger.showWarn(`Only one default Features run profile is allowed.`);
    defaultsTracker.length = 0;
  }

  // TODO: add boolean param to this function and set (use prefix) accordingly
  if (isDefault) {
    // set all other profiles to false
    for (const profile of featureProfiles) {
      profile.isDefault = profile.label === profileName || profile.label === `${RUN_PREFIX}: ${profileName}`;
      console.log(profile.label, profile.isDefault);
    }
  }

  // vscode currently has a bug where it will automatically set the first profile as the default profile if there are none, 
  // but it won't show in the UI, so we'll set it again here to update the UI
  if (!isDefault) {
    const haveDefault = featureProfiles.some(p => p.isDefault);
    if (!haveDefault) {
      const ootbDefault = featureProfiles.find(p => p.label === RUN_PREFIX);
      if (!ootbDefault)
        throw new Error(`${RUN_PREFIX} profile not found.`);
      ootbDefault.isDefault = true;
    }
  }


}

