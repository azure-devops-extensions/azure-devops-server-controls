import TfsCommon_Shortcuts = require("TfsCommon/Scripts/KeyboardShortcuts");
import TfsCommon_Resources = require("TfsCommon/Scripts/Resources/TFS.Resources.TfsCommon");
import TestLiteView = require("TestManagement/Scripts/TFS.TestManagement.TestLiteView");

import TCM_MenuItems = require("TestManagement/Scripts/TFS.TestManagement.MenuItem");
import Resources = require("TestManagement/Scripts/Resources/TFS.Resources.TestManagement");
import WITResources = require("WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking");
import TMUtils = require("TestManagement/Scripts/TFS.TestManagement.Utils");
import TCMLicenseAndFeatureFlagUtils = require("TestManagement/Scripts/Utils/TFS.TestManagement.LicenseAndFeatureFlagUtils");

let LicenseAndFeatureFlagUtils = TCMLicenseAndFeatureFlagUtils.LicenseAndFeatureFlagUtils;

/**
 * Defines the shortcuts for the test
 */
export class TestShortcutGroup extends TfsCommon_Shortcuts.ShortcutGroupDefinition {

    constructor(private view: TestLiteView.TestHubView, private currentView: string) {
        super(Resources.TestShortcutGroupName);

        this.registerPageNavigationShortcut(
            "1",
            {
                description: Resources.TestsShortcutText,
                action: () => this._performAction(() => {
                    this.navigateToUrl(TMUtils.UrlHelper.getTestPlanLiteHubUrl("tests", this.view.getCurrentPlanId(), this.view.getCurrentSuiteId()));

                }),
                allowPropagation: true
            });
        this.registerPageNavigationShortcut(
            "2",
            {
                description: Resources.ChartsShortcutText,
                action: () => this._performAction(() => {
                    this.navigateToUrl(TMUtils.UrlHelper.getTestPlanLiteHubUrl("charts", this.view.getCurrentPlanId(), this.view.getCurrentSuiteId()));
                }),
                allowPropagation: true
            });
    }

    public removeGlobalShortcut() {
        this.shortcutManager.removeShortcutGroup(TfsCommon_Resources.KeyboardShortcutGroup_Global);
    }

    private _performAction(action: any) {

        if (this.view.allowKeyboardShortcuts(this.currentView)) {
            action();
        }
    }
}

export class ListViewShortcutGroup extends TfsCommon_Shortcuts.ShortcutGroupDefinition {

    constructor(private view: TestLiteView.TestHubView) {
        super(Resources.TestShortcutGroupName);
        let _isAdvanceUser = LicenseAndFeatureFlagUtils.AreAdvancedTestManagementFeaturesEnabled();
        this.registerShortcut(
            "e",
            {
                description: Resources.RunTestShortcutText,
                action: () => this.view.executeToolbarAction(TCM_MenuItems.TestPointToolbarItemIds.runTestPoints)
            });
        this.registerShortcut(
            "t b",
            {
                description: Resources.BlockTestsShortcutText,
                action: () => this.view.executeToolbarAction(TCM_MenuItems.TestPointToolbarItemIds.blockTest)
            });
        this.registerShortcut(
            "t f",
            {
                description: Resources.FailTestsShortcutText,
                action: () => this.view.executeToolbarAction(TCM_MenuItems.TestPointToolbarItemIds.failTest)
            });
        this.registerShortcut(
            "t n",
            {
                description: Resources.NotApplicableTestsShortcutText,
                action: () => this.view.executeToolbarAction(TCM_MenuItems.TestPointToolbarItemIds.notApplicableTest)
            });
        this.registerShortcut(
            "t p",
            {
                description: Resources.PassTestsShortcutText,
                action: () => this.view.executeToolbarAction(TCM_MenuItems.TestPointToolbarItemIds.passTest)
            });
        this.registerShortcut(
            "t r",
            {
                description: Resources.ResetTestsShortcutText,
                action: () => this.view.executeToolbarAction(TCM_MenuItems.TestPointToolbarItemIds.resetTest)
            });
        this.registerShortcut(
            "mod+shift+f",
            {
                description: WITResources.KeyboardShortcutDescription_FilterResults,
                action: () => {
                    this.view.activateFilterBar();
                },
                globalCombos: ["mod+shift+f"]
            }
        );

        if (_isAdvanceUser) {
            this.registerShortcut(
                "v g",
                {
                    description: Resources.GridViewShortcutText,
                    action: () => this.view._handleViewFilter("grid")
                });
        }
    }
}

export class GridViewShortcutGroup extends TfsCommon_Shortcuts.ShortcutGroupDefinition {

    constructor(private view: TestLiteView.TestHubView) {
        super(Resources.TestShortcutGroupName);

        this.registerShortcut(
            "v l",
            {
                description: Resources.ListViewShortcutText,
                action: () => this.view._handleViewFilter("list")
            });
    }
}