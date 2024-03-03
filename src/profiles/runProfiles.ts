import * as vscode from 'vscode';
import { services } from "../common/services";
import { ITestRunHandler } from '../runners/testRunHandler';
import { RunProfile } from '../config/settings';
import { isIterable } from '../common/helpers';


const config = services.config;

export function createRunProfiles(ctrl: vscode.TestController, runHandler: ITestRunHandler): vscode.TestRunProfile[] {

  const runProfiles = [];

  for (const debug of [false, true]) {

    const prefix = debug ? 'Debug' : 'Run';
    const profileKind = debug ? vscode.TestRunProfileKind.Debug : vscode.TestRunProfileKind.Run;

    // custom settings.json run profiles

    if (config.instanceSettings.runProfiles) {
      if (!isIterable(config.instanceSettings.runProfiles)) {
        services.logger.showWarn(`"behave-vsc.runProfiles" must be an array of objects.`);
      }
      else {
        for (const profile of config.instanceSettings.runProfiles) {
          runProfiles.push(ctrl.createRunProfile(`${prefix} Features: ` + profile.name, profileKind,
            async (request: vscode.TestRunRequest) => {
              await runHandler(debug, request, profile);
            }));
        }
      }
    }


    // standard profiles

    let profileName = `${prefix} Features`;
    runProfiles.push(ctrl.createRunProfile(`${prefix} Features`, profileKind,
      async (request: vscode.TestRunRequest) => {
        await runHandler(debug, request, new RunProfile(profileName));
      }));


    profileName = `${prefix} Features: ad-hoc tags ( OR )`;
    const adHocMatchingRunProfile = ctrl.createRunProfile(profileName, profileKind,
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
    // currently, running an ad-hoc profile as default will wipe results from other running default profiles, so we don't allow it
    adHocMatchingRunProfile.isDefault = false;
    adHocMatchingRunProfile.onDidChangeDefault(() => {
      adHocMatchingRunProfile.isDefault = false;
      services.logger.showWarn("Ad-hoc run profile cannot be set as a default.");
    });
    runProfiles.push(adHocMatchingRunProfile);


    profileName = `${prefix} Features: ad-hoc tags (AND)`;
    const adHocAndRunProfile = ctrl.createRunProfile(profileName, profileKind,
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
    // currently, running an ad-hoc profile as default will wipe results from other running default profiles, so we don't allow it
    adHocAndRunProfile.isDefault = false;
    adHocAndRunProfile.onDidChangeDefault(() => {
      adHocAndRunProfile.isDefault = false;
      services.logger.showWarn("Ad-hoc run profile cannot be set as a default.");
    });
    runProfiles.push(adHocAndRunProfile);


    profileName = `${prefix} Features: ad-hoc tags (Expression)`;
    const adHocExpressionRunProfile = ctrl.createRunProfile(profileName, profileKind,
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
    // currently, running an ad-hoc profile as default will wipe results from other running default profiles, so we don't allow it
    adHocExpressionRunProfile.isDefault = false;
    adHocExpressionRunProfile.onDidChangeDefault(() => {
      adHocExpressionRunProfile.isDefault = false;
      services.logger.showWarn("Ad-hoc run profile cannot be set as a default.");
    });
    runProfiles.push(adHocExpressionRunProfile);

  }


  return runProfiles;
}


