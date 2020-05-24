import {ShortcutGroupDefinition} from "TfsCommon/Scripts/KeyboardShortcuts";

import TCMLicenseAndFeatureFlagUtils = require("TestManagement/Scripts/Utils/TFS.TestManagement.LicenseAndFeatureFlagUtils");
import Resources = require("TestManagement/Scripts/Resources/TFS.Resources.TestManagement");

let LicenseAndFeatureFlagUtils = TCMLicenseAndFeatureFlagUtils.LicenseAndFeatureFlagUtils;

/**
 * Defines the hub navigation shortcuts for test hub
 */
export class TestHubCommonShortcutGroup extends ShortcutGroupDefinition {

    constructor(allowActionDelgate?: any) {
        super(Resources.HubNavigationShortcutGroupText);
        this.allowAction = allowActionDelgate ? allowActionDelgate : () => { return true; };
        this.registerPageNavigationShortcut(
            "n",
            {
                description: Resources.GotoTestplanHubKeyboardShortcutText,
                action: () => this._performAction(() => {
                    this.navigateToAction("", TestHubCommonShortcutGroup.testManagemnetController);
                }),
                allowPropagation: true
            });
        if (LicenseAndFeatureFlagUtils.AreAdvancedTestManagementFeaturesEnabled()) {
            this.registerPageNavigationShortcut(
                "m",
                {
                    description: Resources.GotoParametersHubKeyboardShortcutText,
                    action: () => this._performAction(() => {
                        this.navigateToAction("sharedParameters", TestHubCommonShortcutGroup.testManagemnetController);
                    }),
                    allowPropagation: true
                });
        }
        this.registerPageNavigationShortcut(
            "r",
            {
                description: Resources.GotoRunsHubKeyboardShortcutText,
                action: () => this._performAction(() => {
                    this.navigateToAction("runs", TestHubCommonShortcutGroup.testManagemnetController);
                }),
                allowPropagation: true
            });
        this.registerPageNavigationShortcut(
            "h",
            {
                description: Resources.GotoMachinesHubKeyboardShortcutText,
                action: () => this._performAction(() => {
                    this.navigateToAction("", TestHubCommonShortcutGroup.machinesController);
                }),
                allowPropagation: true
            });
    }

    private _performAction(action: any) {
        if (this.allowAction && this.allowAction()) {
            action();
        }
    }

    private static testManagemnetController: string = "testManagement";
    private static machinesController: string = "machines";
    private static testManagementLiteController: string = "plans";
    private allowAction: any;
}