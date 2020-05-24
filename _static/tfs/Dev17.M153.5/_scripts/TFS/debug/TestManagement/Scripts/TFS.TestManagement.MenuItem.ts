import Utils_String = require("VSS/Utils/String");
import TCMConstants = require("Presentation/Scripts/TFS/Generated/TFS.TestManagement.Constants");
import Menus = require("VSS/Controls/Menus");

import TCMLicenseAndFeatureFlagUtils = require("TestManagement/Scripts/Utils/TFS.TestManagement.LicenseAndFeatureFlagUtils");
import TCMSuiteTree = require("TestManagement/Scripts/TFS.TestManagement.TestSuitesTree");
import TCMLite = require("TestManagement/Scripts/TFS.TestManagement.Lite");
import Resources = require("TestManagement/Scripts/Resources/TFS.Resources.TestManagement");

let LicenseAndFeatureFlagUtils = TCMLicenseAndFeatureFlagUtils.LicenseAndFeatureFlagUtils;
let TestPlanAndSuitesCommandIds = TCMLite.TestPlanAndSuitesCommandIds;

export class MenuItems {

    /**
     * TestDetailsPane's updateToolbarTooltipsDelegate manages updating the title of the second menu item depending on the pane selected.
     * If any menu item is inserted here, update the this._$testDetailsPaneOpenMenuItem.
     */
    public static createFarRightPaneMenubarItems(): any[] {
        let items: any[] = [];
        items.push({
            id: TCMLite.TestDetailsPaneToolbarItemIds.refreshTestDetailsPane,
            title: Resources.RefreshToolTip,
            showText: false,
            icon: "bowtie-icon bowtie-navigate-refresh"
        });
        items.push({
            id: TCMLite.TestDetailsPaneToolbarItemIds.openTestDetailInNewTab,
            showText: false,
            icon: "bowtie-icon bowtie-arrow-open"
        });
        return items;
    }

    /**
     * Creates the items list for the test plan and suites toolbar
     * @returns Items list for the toolbar
     */
    public static getTestPlanAndSuitesMenubarItems(): MenuItems[] {
        let items: MenuItems[] = [];
        if (LicenseAndFeatureFlagUtils.AreAdvancedTestManagementFeaturesEnabled()) {
            items.push({
                id: "create-new-suite-plan",
                title: Resources.NewTestCaseCommandText,
                showText: false,
                icon: "bowtie-icon bowtie-math-plus-heavy bowtie-icon-small",
                childItems: this._createNewPlanSuiteSubMenuItems(),
                idIsAction: false
            });
            items.push({ separator: true });
        }

        items.push({
            id: TestPlanAndSuitesCommandIds.showTestsFromChildSuites,
            title: Resources.ShowTestsRecursive,
            showText: false,
            icon: "bowtie-icon bowtie-row-child"
        });
        items.push({
            id: TestPlanAndSuitesCommandIds.expand,
            title: Resources.ExpandSuites,
            showText: false,
            icon: "bowtie-icon bowtie-toggle-expand-all"
        });
        items.push({
            id: TestPlanAndSuitesCommandIds.collapse,
            title: Resources.CollapseSuites,
            showText: false,
            icon: "bowtie-icon bowtie-toggle-collapse"
        });

        if (LicenseAndFeatureFlagUtils.AreAdvancedTestManagementFeaturesEnabled()) {
            if (!LicenseAndFeatureFlagUtils.isNewTestPlanHubExperienceEnabled()) {
                items.push({
                    id: TestPlanAndSuitesCommandIds.openInClient,
                    title: Resources.OpenInClientTooltip,
                    showText: false,
                    icon: "bowtie-icon bowtie-brand-mtm bowtie-icon-large"
                });
            }
            items.push({
                id: TestPlanAndSuitesCommandIds.exportHtml,
                title: Resources.ExportHtmlTooltip,
                showText: false,
                icon: "bowtie-icon bowtie-print",
                showIcon: true
            });
            if (!LicenseAndFeatureFlagUtils.isNewTestPlanHubExperienceEnabled()) {
                items.push({
                    id: TestPlanAndSuitesCommandIds.openTestPlanOrSelectedSuite,
                    title: Resources.OpenTestPlan,
                    showText: false,
                    icon: "bowtie-icon bowtie-arrow-open"
                });
            }
        }

        return items;
    }

    /**
    * Creates the items list for the new plan / suite dropdown
    */
    private static _createNewPlanSuiteSubMenuItems(): MenuItems[]{
        let items: any[] = [];

        if (!LicenseAndFeatureFlagUtils.isNewTestPlanHubExperienceEnabled()) {
            items.push({
                id: TestPlanAndSuitesCommandIds.newTestPlan,
                text: Resources.CreateTestPlanMenuItem,
                showText: true,
                showIcon: true,
                icon: "bowtie-icon bowtie-folder-plan"
            });

            items.push({ separator: true });
        }

        items.push({
            id: TCMSuiteTree.NewSuiteCommandIds.newStaticSuite,
            text: Resources.StaticSuiteTitle,
            showText: true,
            icon: "bowtie-icon bowtie-folder",
            showIcon: true
        });

        items.push({
            id: TCMSuiteTree.NewSuiteCommandIds.newRequirementSuite,
            text: Resources.RequirementSuite,
            showText: true,
            icon: "bowtie-icon bowtie-tfvc-change-list",
            showIcon: true
        });

        items.push({
            id: TCMSuiteTree.NewSuiteCommandIds.newQueryBasedSuite,
            text: Resources.QueryBasedSuiteTitle,
            showText: true,
            icon: "bowtie-icon bowtie-folder-query",
            showIcon: true
        });

        items.push({ separator: true });

        items.push({
            id: TestPlanAndSuitesCommandIds.newSharedStep,
            text: Resources.NewSharedStep,
            showText: true,
            showIcon: true,
            icon: "bowtie-icon bowtie-step-shared"
        });

        return items;
    }

    public static UpdateSuitesToolbarCommandStates(testPlanAndSuitesMenubar: Menus.MenuBar, suite: TCMLite.ITestSuiteModel) {
        let canAddNewSuite = suite && suite.suiteType === TCMConstants.TestSuiteType.StaticTestSuite.toString();

        if (!testPlanAndSuitesMenubar) {
            return;
        }

        testPlanAndSuitesMenubar.updateCommandStates(
            <Menus.ICommand[]>[
                {
                    id: TCMSuiteTree.NewSuiteCommandIds.newStaticSuite,
                    disabled: !canAddNewSuite
                },
                {
                    id: TCMSuiteTree.NewSuiteCommandIds.newRequirementSuite,
                    disabled: !canAddNewSuite
                },
                {
                    id: TCMSuiteTree.NewSuiteCommandIds.newQueryBasedSuite,
                    disabled: !canAddNewSuite
                },
                {
                    id: TestPlanAndSuitesCommandIds.newSharedStep,
                    disabled: !suite
                }]);
    }

    /**
     * Creates the items list for the toolbar
     * @returns Items list for the toolbar
     */
    public static GetTestPointsToolbarItems(): MenuItems[] {
        let items = [];
        let isAdvancedLicenseEnabled = LicenseAndFeatureFlagUtils.AreAdvancedTestManagementFeaturesEnabled();

        if (isAdvancedLicenseEnabled){
             items.push({
                id: TestPointToolbarItemIds.newTestCaseDropDown,
                disabled: true,
                text: Resources.NewText,
                title: Resources.CreateTestCases,
                showText: true,
                icon: "bowtie-icon bowtie-math-plus-heavy bowtie-icon-small",
                groupId: "actions",
                childItems: this._createNewTestCaseSubMenuItems(),
                idIsAction: false
            });

            items.push({ id: TestPointToolbarItemIds.editQuery, hidden: true, text: Resources.EditQuery, showText: true, icon: "icon-tfs-query-edit", groupId: "actions" });
            items.push({ id: TestPointToolbarItemIds.addTestCases, disabled: true, text: Resources.Add, title: Resources.AddExistingTestCases, showText: true, noIcon: true, groupId: "actions" });
            items.push({ id: TestPointToolbarItemIds.removeTestCase, disabled: true, title: Resources.RemoveTestCaseText, showText: false, icon: "bowtie-icon bowtie-edit-delete", groupId: "actions" });
            items.push({ id: TestPointToolbarItemIds.saveTests, disabled: true, text: Resources.SaveTestsText, title: Resources.SaveTestsText, showText: false, icon: "bowtie-icon bowtie-save-all", groupId: "actions" });
        }

        items.push({ id: TestPointToolbarItemIds.refreshTestPoints, disabled: true, text: Resources.Refresh, title: Resources.RefreshToolTip, showText: false, icon: "bowtie-icon bowtie-navigate-refresh", groupId: "actions" });
        items.push({ id: TestPointToolbarItemIds.openTestCase, disabled: true, text: Resources.OpenTestCaseCommandText, title: Resources.OpenTestCaseToolTip, showText: false, icon: "bowtie-icon bowtie-arrow-open", groupId: "actions" });
        
        items.push({
            id: "run-test-points-dropdown-menu-item",
            disabled: true,
            text: Resources.RunText,
            title: Utils_String.format(Resources.TooltipTitleShortcutFormat, Resources.Run, Resources.RunShortcut),
            showText: true,
            icon: "bowtie-icon bowtie-media-play-fill",
            groupId: "execute",
            childItems: this._createRunTestsSubMenuItems(),
            idIsAction: false
        });

        items.push({ id: TestPointToolbarItemIds.resumeRun, disabled: true, title: Resources.ResumeTooltip, text: Resources.ResumeTestText, showText: false, icon: "bowtie-icon bowtie-play-resume-fill", groupId: "execute" });
        items.push({ id: TestPointToolbarItemIds.resetTest, disabled: true, text: Resources.ResetTestText, title: Resources.ResetTestText, showText: false, icon: "bowtie-icon bowtie-edit-redo", groupId: "analyze" });
        items.push({ id: TestPointToolbarItemIds.passTest, disabled: true, text: Resources.PassTestText, title: Resources.PassTestText, showText: false, icon: "bowtie-icon bowtie-status-success", groupId: "analyze" });
        items.push({ id: TestPointToolbarItemIds.failTest, disabled: true, text: Resources.FailTestText, title: Resources.FailTestText, showText: false, icon: "bowtie-icon bowtie-status-failure", groupId: "analyze" });
        items.push({ id: TestPointToolbarItemIds.blockTest, disabled: true, text: Resources.BlockTestText, title: Resources.BlockTestText, showText: false, icon: "bowtie-icon bowtie-math-minus-circle", groupId: "analyze" });
        items.push({ id: TestPointToolbarItemIds.notApplicableTest, disabled: true, text: Resources.TestOutcome_NotApplicable, title: Resources.TestOutcome_NotApplicable, showText: false, icon: "bowtie-icon bowtie-status-no-fill bowtie-no-fill-not-applicable", groupId: "analyze" });
        if (isAdvancedLicenseEnabled) {
            items.push({ id: TestPointToolbarItemIds.orderTests, disabled: true, text: Resources.OrderTests, showText: true, icon: "bowtie-icon bowtie-format-list-ordered", groupId: "orderTests" });
        }

        items.push({ id: TestPointToolbarItemIds.columnOptions, disabled: true, text: Resources.Columnoptions, noIcon: true, groupId: "options" });
        items.push({ id: TestPointToolbarItemIds.toggleTestCaseDetailsPane, disabled: true, text: Resources.TestCaseDetailsPaneToggleButtonTitle, title: Resources.TestDetailPaneToggleButtonTooltip, showText: false, icon: "bowtie-icon bowtie-details-pane", cssClass: "toggle-showDetails-bar" });
        items.push({ id: TestPointToolbarItemIds.toggleFilter, disabled: true, text: Resources.ToggleFilter, title: Resources.ToggleFilterToolTip, showText: false, icon: "bowtie-icon bowtie-search-filter-fill", cssClass: "toggle-filter-bar"});
        
        return items;
    }

    /**
     * Gets test point grid context menu items list
     * @returns new list of context menu items
     */
    public static getTestPointGridContextMenuItems(): Menus.IMenuItemSpec[] {
        let items: Menus.IMenuItemSpec[] = [];
        items.push({ rank: 5, id: TestPointToolbarItemIds.openTestCase, text: Resources.OpenTestCaseCommandText, icon: "bowtie-icon bowtie-arrow-open", groupId: "action" },
            { rank: 25, id: TestPointToolbarItemIds.viewLatestResult, text: Resources.ViewLatestResultText, icon: "bowtie-icon bowtie-arrow-open", groupId: "action" });
        
        if (LicenseAndFeatureFlagUtils.AreAdvancedTestManagementFeaturesEnabled()) {
            items.push({ rank: 6, id: TestPointToolbarItemIds.removeTestCase, text: Resources.RemoveTestCaseText, icon: "bowtie-icon bowtie-edit-delete", groupId: "action" },
                { rank: 7, separator: true },
                { rank: 16, id: TestPointToolbarItemIds.bulkEditTests, text: Resources.BulkEditSelectedTestCases, icon: "bowtie-icon bowtie-edit", groupId: "edit" },
                { rank: 17, id: TestPointToolbarItemIds.bulkEditTestsGrid, text: Resources.EditTestCasesUsingGrid, icon: "bowtie-icon bowtie-edit", groupId: "edit" },
                { rank: 24, id: TestPointToolbarItemIds.assignConfiguration, groupId: "modify", text: Resources.AssignConfigurationToTestCases, icon: "bowtie-icon bowtie-server-remote" }
            );
        }
        
        if (LicenseAndFeatureFlagUtils.isDesktopTestRunnerOptionEnabled()) {
            items.push({ rank: 12, id: TestPointToolbarItemIds.runTestPointsWithDTR, text: Resources.RunTestWithDTRText, icon: "bowtie-icon bowtie-media-play-fill", groupId: "execute" });
        }
        items.push({ rank: 13, id: TestPointToolbarItemIds.runTestPointsWithOptions, text: Resources.RunTestWithOptionsText, icon: "bowtie-icon bowtie-media-play-fill", groupId: "execute" });
        
        if (LicenseAndFeatureFlagUtils.isDesktopTestRunnerOptionEnabled()) {
            items.push({ rank: 11, id: TestPointToolbarItemIds.runTestPoints, text: Resources.RunTestForWebAppsText, icon: "bowtie-icon bowtie-media-play-fill", groupId: "execute" });
        }
        else {
            items.push({ rank: 11, id: TestPointToolbarItemIds.runTestPoints, text: Resources.Run, icon: "bowtie-icon bowtie-media-play-fill", groupId: "execute" });
        }

        items.push(
            { rank: 14, id: TestPointToolbarItemIds.resumeRun, text: Resources.ResumeTestText, icon: "bowtie-icon bowtie-play-resume-fill", groupId: "execute" },
            { rank: 18, separator: true },
            { rank: 19, id: TestPointToolbarItemIds.resetTest, text: Resources.ResetTestText, icon: "bowtie-icon bowtie-edit-redo", groupId: "status" },
            { rank: 20, id: TestPointToolbarItemIds.passTest, text: Resources.PassTestText, icon: "bowtie-icon bowtie-status-success", groupId: "status" },
            { rank: 21, id: TestPointToolbarItemIds.failTest, text: Resources.FailTestText, icon: "bowtie-icon bowtie-status-failure", groupId: "status" },
            { rank: 22, id: TestPointToolbarItemIds.blockTest, text: Resources.BlockTestText, icon: "bowtie-icon bowtie-math-minus-circle", groupId: "status" },
            { rank: 23, id: TestPointToolbarItemIds.notApplicableTest, text: Resources.TestOutcome_NotApplicable, icon: "bowtie-icon bowtie-status-no-fill bowtie-no-fill-not-applicable", groupId: "status" });
        return items;
    }

    /**
     * Creates the items list for the run tests in web / client dropdown
     * @returns Items list for the toolbar
     */
    private static _createRunTestsSubMenuItems(): MenuItems[] {
        let items: MenuItems[] = [];

        if (LicenseAndFeatureFlagUtils.isDesktopTestRunnerOptionEnabled()) {
            items.push({
                id: TestPointToolbarItemIds.runTestPoints,
                text: Resources.RunTestForWebAppsText,
                title: Utils_String.format(Resources.TooltipTitleShortcutFormat, Resources.Run, Resources.RunShortcut),
                showText: true,
                icon: "bowtie-icon bowtie-media-play-fill"
            });
        }
        else{            
            items.push({
                id: TestPointToolbarItemIds.runTestPoints,
                text: Resources.Run,
                title: Utils_String.format(Resources.TooltipTitleShortcutFormat, Resources.Run, Resources.RunShortcut),
                showText: true,
                icon: "bowtie-icon bowtie-media-play-fill"
            });
        }

        if (LicenseAndFeatureFlagUtils.isDesktopTestRunnerOptionEnabled()) {
            items.push({
                id: TestPointToolbarItemIds.runTestPointsWithDTR,
                text: Resources.RunTestWithDTRText,
                showText: true,
                icon: "bowtie-icon bowtie-media-play-fill"
            });
        }

        items.push({
            id: TestPointToolbarItemIds.runTestPointsWithOptions,
            text: Resources.RunTestWithOptionsText,
            showText: true,
            icon: "bowtie-icon bowtie-media-play-fill"
        });

        return items;
    }

    private static _createNewTestCaseSubMenuItems(): MenuItems[] {
        let items: MenuItems[] = [];

        items.push({
            id: TestPointToolbarItemIds.newTestCase,
            text: Resources.NewTestCaseText,
            title: Utils_String.format(Resources.TooltipTitleShortcutFormat, Resources.NewTestCaseCommandTooltip, Resources.NewTestCaseCommandShortcut),
            showText: true,
            icon: "bowtie-icon bowtie-math-plus-heavy bowtie-icon-small"
        });

        items.push({
            id: TestPointToolbarItemIds.newTestCaseWithGrid,
            text: Resources.NewUsingGrid,
            title: Resources.CreateTestCasesUsingGrid,
            showText: true,
            icon: "bowtie-icon bowtie-math-plus-heavy bowtie-icon-small"
        });

        return items;
    }
}

//TODO: Rename this class as it is used by both context and toolbar menu items
// will do in next PR as it will have many update
export class TestPointToolbarItemIds {
    public static newTestCaseDropDown = "new-test-case-dropdown-menu-item";
    public static newTestCase = "new-test-case";
    public static newTestCaseWithGrid = "new-test-case-with-grid";
    public static editQuery = "edit-suite-query";
    public static addTestCases = "add-test-cases";
    public static removeTestCase = "remove-test-case";
    public static refreshTestPoints = "refresh-test-points";
    public static openTestCase = "open-test-case";
    public static runTestPoints = "run-test-points";
    public static runTestPointsUsingClient = "run-test-points-using-client";
    public static runTestPointsWithOptions = "run-test-points-with-options";
    public static runTestPointsWithDTR = "run-test-points-with-dtr";
    public static viewLatestResult = "view-latest-result";
    public static runTestDropMenu = "run-test-points-dropdown-menu-item";
    public static blockTest = "block-tests";
    public static resetTest = "reset-tests";
    public static passTest = "pass-tests";
    public static failTest = "fail-tests";
    public static saveTests = "save-tests";
    public static notApplicableTest = "not-applicable-tests";
    public static columnOptions = "column-options-test";
    public static resumeRun = "resume-run";
    public static toggleTestCaseDetailsPane = "toggle-testcase-details-pane";
    public static toggleFilter = "toggle-filter";
    public static orderTests = "order-tests";
    public static bulkEditTests = "bulk-edit-testcases";
    public static bulkEditTestsGrid = "bulk-edit-testcases-using-grid";
    public static assignConfiguration = "assign-configuration-to-test-case";
}
