import Menus = require("VSS/Controls/Menus");
import TCMConstants = require("Presentation/Scripts/TFS/Generated/TFS.TestManagement.Constants");
import TCMLite = require("TestManagement/Scripts/TFS.TestManagement.Lite");
import TCMSuiteTree = require("TestManagement/Scripts/TFS.TestManagement.TestSuitesTree");

let TestPlanAndSuitesCommandIds = TCMLite.TestPlanAndSuitesCommandIds;

export class TestSuiteMenuCommandState {
    /**
     * Updates the states of suite toolbar buttons
     */
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
     * Update the state of suite tree context menu
     * @param menu
     */
    public static UpdateTestSuiteTreeContextMenuCommandStates(menu: Menus.MenuItem) {
        let context: any,
            suite: TCMLite.ITestSuiteModel,
            canAddNewSuite: boolean;

        context = this._getPopupMenuContextInfo(menu);
        suite = context.item.suite;
        canAddNewSuite = suite && suite.suiteType === TCMConstants.TestSuiteType.StaticTestSuite.toString();

        menu.updateCommandStates(
            [
                {
                    id: TCMSuiteTree.TestSuitesTree.TestSuitesTreeCommands.CMD_NEWSUITE,
                    disabled: !canAddNewSuite
                },
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
                }]);

    }

    private static _getPopupMenuContextInfo(menu: any) {
        let popupMenu = menu;

        while (popupMenu && !popupMenu._options.contextInfo) {
            popupMenu = popupMenu._parent;
        }
        return popupMenu._options.contextInfo;
    }
}