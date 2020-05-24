import Menus = require("VSS/Controls/Menus");
import Resources = require("TestManagement/Scripts/Resources/TFS.Resources.TestManagement");
import TCMConstants = require("Presentation/Scripts/TFS/Generated/TFS.TestManagement.Constants");
import TCMLite = require("TestManagement/Scripts/TFS.TestManagement.Lite");
import TCMMenuItems = require("TestManagement/Scripts/TFS.TestManagement.MenuItem");
import TCMPointGrid = require("TestManagement/Scripts/TFS.TestManagement.TestPointsGrid");
import TCMSuiteTree = require("TestManagement/Scripts/TFS.TestManagement.TestSuitesTree");

export class TestPointGridMenuCommandState {
    /**
     * Updates the states of toolbar buttons - refresh and open-test-case based on test case count and selection
     */
    public static UpdateTestPointsToolbarCommandStates(testPointsToolbar: Menus.MenuBar, testPointList: TCMPointGrid.TestPointsGrid,
        testSuitesTree: TCMSuiteTree.TestSuitesTree, showChildSuitesEnabled: boolean) {
        testPointsToolbar.updateCommandStates(
            [
                {
                    id: TCMMenuItems.TestPointToolbarItemIds.newTestCaseDropDown,
                    disabled: !this._canCreateTestCase(testSuitesTree),
                    hidden: !this._canShowAddAndRemoveTestCase(testSuitesTree)
                },
                {
                    id: TCMMenuItems.TestPointToolbarItemIds.newTestCase,
                    disabled: !this._canCreateTestCase(testSuitesTree),
                    hidden: !this._canShowAddAndRemoveTestCase(testSuitesTree)
                },
                {
                    id: TCMMenuItems.TestPointToolbarItemIds.newTestCaseWithGrid,
                    disabled: !this._canCreateTestCase(testSuitesTree),
                    hidden: !this._canShowAddAndRemoveTestCase(testSuitesTree)
                },
                {
                    id: TCMMenuItems.TestPointToolbarItemIds.editQuery,
                    hidden: this._canShowAddAndRemoveTestCase(testSuitesTree)
                },
                {
                    id: TCMMenuItems.TestPointToolbarItemIds.addTestCases,
                    disabled: !this._canCreateTestCase(testSuitesTree),
                    hidden: !this._canShowAddAndRemoveTestCase(testSuitesTree)
                },
                {
                    id: TCMMenuItems.TestPointToolbarItemIds.removeTestCase,
                    disabled: !this._canRemoveTestCase(testPointList, testSuitesTree),
                    hidden: !this._canShowAddAndRemoveTestCase(testSuitesTree)
                },
                {
                    id: TCMMenuItems.TestPointToolbarItemIds.refreshTestPoints,
                    disabled: !this._canRefreshTestPointList(testSuitesTree),
                    hidden: false
                },
                {
                    id: TCMMenuItems.TestPointToolbarItemIds.openTestCase,
                    disabled: !this._canOpenTestCase(testPointList),
                    hidden: false
                },
                {
                    id: TCMMenuItems.TestPointToolbarItemIds.runTestDropMenu,
                    disabled: !this._canRunTests(testPointList),
                    hidden: false
                },
                {
                    id: TCMMenuItems.TestPointToolbarItemIds.runTestPoints,
                    disabled: !this._canRunTests(testPointList),
                    hidden: false
                },
                {
                    id: TCMMenuItems.TestPointToolbarItemIds.runTestPointsUsingClient,
                    disabled: !this._canRunTests(testPointList),
                    hidden: false
                },
                {
                    id: TCMMenuItems.TestPointToolbarItemIds.runTestPointsWithOptions,
                    disabled: !this._canRunTests(testPointList),
                    hidden: false
                },
                {
                    id: TCMMenuItems.TestPointToolbarItemIds.runTestPointsWithDTR,
                    disabled: !this._canRunTests(testPointList),
                    hidden: false
                },
                {
                    id: TCMMenuItems.TestPointToolbarItemIds.blockTest,
                    disabled: !this._isAnyTestPointSelectedValid(testPointList),
                    hidden: false
                },
                {
                    id: TCMMenuItems.TestPointToolbarItemIds.resetTest,
                    disabled: !this._canResetTestPoints(testPointList),
                    hidden: false
                },
                {
                    id: TCMMenuItems.TestPointToolbarItemIds.passTest,
                    disabled: !this._canSetOutcome(testPointList),
                    hidden: false
                },
                {
                    id: TCMMenuItems.TestPointToolbarItemIds.failTest,
                    disabled: !this._canSetOutcome(testPointList),
                    hidden: false
                },
                {
                    id: TCMMenuItems.TestPointToolbarItemIds.saveTests,
                    disabled: !this._canSaveTests(testPointList),
                    hidden: false
                },
                {
                    id: TCMMenuItems.TestPointToolbarItemIds.notApplicableTest,
                    disabled: !this._canSetOutcome(testPointList),
                    hidden: false
                },
                {
                    id: TCMMenuItems.TestPointToolbarItemIds.resumeRun,
                    disabled: !this._canResumeRun(testPointList),
                    hidden: false
                },
                {
                    id: TCMMenuItems.TestPointToolbarItemIds.columnOptions,
                    disabled: !this._isAnySuiteSelected(testSuitesTree),
                    hidden: false
                },
                {
                    id: TCMMenuItems.TestPointToolbarItemIds.orderTests,
                    disabled: !this._isAnyTestPointPresent(testPointList) || showChildSuitesEnabled, //TODO: Handle show child suites
                    hidden: false
                }
            ]);
    }

    /**
     * Updates context menu items list
     * @param menu the menu to update
     */
    public static updateContextMenuCommandStates(menu: Menus.MenuItem, testPointList: TCMPointGrid.TestPointsGrid, testSuitesTree: TCMSuiteTree.TestSuitesTree) {
        let item = testPointList.getSelectedTestPoint();

        menu.updateCommandStates([{
            id: TCMMenuItems.TestPointToolbarItemIds.assignConfiguration,
            disabled: (testPointList.getSelectionCount() === 0)
        }]);

        menu.updateCommandStates([{
            id: TCMMenuItems.TestPointToolbarItemIds.openTestCase,
            disabled: !(item && testPointList.getSelectionCount() === 1)
        }]);

        menu.updateCommandStates([{
            id: TCMMenuItems.TestPointToolbarItemIds.bulkEditTests,
            disabled: (testPointList.getSelectionCount() === 0)
        }]);

        menu.updateCommandStates([{
            id: TCMMenuItems.TestPointToolbarItemIds.bulkEditTestsGrid,
            disabled: !(this._canShowAddAndRemoveTestCase(testSuitesTree) && testPointList.getSelectionCount() > 0)
        }]);

        menu.updateCommandStates([{
            id: TCMMenuItems.TestPointToolbarItemIds.removeTestCase,
            disabled: !this._canRemoveTestCase(testPointList, testSuitesTree),
            hidden: !this._canShowAddAndRemoveTestCase(testSuitesTree)
        }]);

        menu.updateCommandStates([{
            id: TCMMenuItems.TestPointToolbarItemIds.runTestPoints,
            disabled: !this._canRunTests(testPointList)
        }]);

        menu.updateCommandStates([{
            id: TCMMenuItems.TestPointToolbarItemIds.runTestPointsUsingClient,
            disabled: !this._canRunTests(testPointList)
        }]);

        menu.updateCommandStates([{
            id: TCMMenuItems.TestPointToolbarItemIds.runTestPointsWithOptions,
            disabled: !this._canRunTests(testPointList)
        }]);

        menu.updateCommandStates([{
            id: TCMMenuItems.TestPointToolbarItemIds.runTestPointsWithDTR,
            disabled: !this._canRunTests(testPointList)
        }]);

        menu.updateCommandStates([{
            id: TCMMenuItems.TestPointToolbarItemIds.passTest,
            disabled: !this._canSetOutcome(testPointList)
        }]);
        menu.updateCommandStates([{
            id: TCMMenuItems.TestPointToolbarItemIds.failTest,
            disabled: !this._canSetOutcome(testPointList)
        }]);

        menu.updateCommandStates([{
            id: TCMMenuItems.TestPointToolbarItemIds.blockTest,
            disabled: !this._canRunTests(testPointList)
        }]);

        menu.updateCommandStates([{
            id: TCMMenuItems.TestPointToolbarItemIds.resetTest,
            disabled: !this._canResetTestPoints(testPointList)
        }]);
        menu.updateCommandStates([{
            id: TCMMenuItems.TestPointToolbarItemIds.notApplicableTest,
            disabled: !this._canSetOutcome(testPointList)
        }]);
        menu.updateCommandStates([{
            id: TCMMenuItems.TestPointToolbarItemIds.resumeRun,
            disabled: !this._canResumeRun(testPointList)
        }]);

        menu.updateCommandStates([{
            id: TCMMenuItems.TestPointToolbarItemIds.viewLatestResult,
            disabled: !(item && item.mostRecentResultId > 0 && item.mostRecentRunId > 0 && testPointList.getSelectionCount() === 1 )
        }]);
    }

    private static _canCreateTestCase(testSuitesTree: TCMSuiteTree.TestSuitesTree) {
        return testSuitesTree.getSelectedSuite() &&
            testSuitesTree.getSelectedSuite().suiteType !== TCMConstants.TestSuiteType.DynamicTestSuite.toString() &&
            this._isAnySuiteSelected(testSuitesTree);
    }

    private static _isAnySuiteSelected(testSuitesTree: TCMSuiteTree.TestSuitesTree): boolean {
        if (testSuitesTree && testSuitesTree.getSelectedNode()) {
            return true;
        }
        else {
            return false;
        }
    }

    private static _canShowAddAndRemoveTestCase(testSuitesTree: TCMSuiteTree.TestSuitesTree): boolean {
        if (testSuitesTree.getSelectedSuite()) {
            return testSuitesTree.getSelectedSuite().suiteType !== TCMConstants.TestSuiteType.DynamicTestSuite.toString();
        }

        return true;
    }

    /**
     * Checks if the removing of TestCase is possible based on the selections in the test point list
     */
    private static _canRemoveTestCase(testPointList: TCMPointGrid.TestPointsGrid, testSuitesTree: TCMSuiteTree.TestSuitesTree): boolean {
        return this._isAnyTestPointSelectedValid(testPointList) &&
            testSuitesTree.getSelectedSuite().suiteType !== TCMConstants.TestSuiteType.DynamicTestSuite.toString();
    }

    /**
     * return true if one or more valid test points are selected in the grid
     * @param validationDelegate
     */
    private static _isAnyTestPointSelectedValid(testPointList: TCMPointGrid.TestPointsGrid, validationDelegate?: any): boolean {
        if (!testPointList || testPointList._dataSource.length === 0) {
            // if test point list is not initialized yet, return false;
            return false;
        }

        let selectedTestPoints;
        selectedTestPoints = testPointList.getSelectedTestPoints();
        if (selectedTestPoints && selectedTestPoints.length > 0) {
            if (validationDelegate) {
                return validationDelegate(selectedTestPoints);
            }
            else {
                return true;
            }
        }
        else {
            return false;
        }
    }

    /**
     * Checks if the Test Run is possible based on the selections in the test point list
     */
    private static _canRunTests(testPointList: TCMPointGrid.TestPointsGrid): boolean {
        let selectedTestPoints,
            selectionCount = 0;
        if (!testPointList || testPointList._dataSource.length === 0) {
            // if test point list is not initialized yet, return false;
            return false;
        }

        selectedTestPoints = testPointList.getSelectedTestPoints();
        selectionCount = testPointList.getSelectionCount();
        if (selectedTestPoints && selectionCount > 0) {
            return true;
        }
        else {
            return false;
        }
    }

    private static _canSetOutcome(testPointList: TCMPointGrid.TestPointsGrid) {
        return this._isAnyTestPointSelectedValid(testPointList, (selectedTestPoints: TCMLite.ITestPointModel[]) => {
            return !this._isThereAnyTestPointInState(selectedTestPoints, Resources.TestPointState_Paused);
        });
    }

    private static _isThereAnyTestPointNotInState(selectedTestPoints: TCMLite.ITestPointModel[], state: string): boolean {
        let index,
            length = selectedTestPoints.length;
        for (index = 0; index < length; index++) {
            if (selectedTestPoints[index].outcome.toString() !== state) {
                return true;
            }
        }

        return false;
    }

    private static _isThereAnyTestPointInState(selectedTestPoints: TCMLite.ITestPointModel[], state: string) {
        let index,
            length = selectedTestPoints.length;
        for (index = 0; index < length; index++) {
            if (selectedTestPoints[index].outcome.toString() === state) {
                return true;
            }
        }

        return false;
    }

    /**
     * checks whether test case list can be refreshed
     */
    private static _canRefreshTestPointList(testSuitesTree: TCMSuiteTree.TestSuitesTree): boolean {
        return this._isAnySuiteSelected(testSuitesTree);
    }

    /**
     * Checks if a row can be opened and returns false for no selection or multi selection
     */
    private static _canOpenTestCase(testPointList: TCMPointGrid.TestPointsGrid): boolean {
        if (!testPointList) {
            // if test point list is not initialized yet, return false;
            return false;
        }
        let selectionCount = testPointList.getSelectionCount();
        return (selectionCount === 1);
    }

    private static _canResetTestPoints(testPointList: TCMPointGrid.TestPointsGrid) {
        return this._isAnyTestPointSelectedValid(testPointList, (selectedTestPoints: TCMLite.ITestPointModel[]) => {
            return this._isThereAnyTestPointNotInState(selectedTestPoints, Resources.TestPointState_Ready);
        });
    }

    private static _canResumeRun(testPointList: TCMPointGrid.TestPointsGrid) {
        return this._isAnyTestPointSelectedValid(testPointList, (selectedTestPoints: TCMLite.ITestPointModel[]) => {
            return selectedTestPoints.length === 1 &&
                selectedTestPoints[0].state === TCMConstants.TestPointState.InProgress &&
                (selectedTestPoints[0].lastResultState === TCMConstants.TestResultState.Paused || selectedTestPoints[0].mostRecentResultOutcome === TCMConstants.TestOutcome.Paused);
        });
    }

    private static _canSaveTests(testPointList: TCMPointGrid.TestPointsGrid) {
        let dirtyTests = testPointList.getDirtyTests(),
            hasDirtyTests = dirtyTests && dirtyTests.length > 0;

        if (!testPointList || (testPointList._dataSource.length === 0 && !hasDirtyTests)) {
            // if test point list is not initialized yet, return false;
            return false;
        }

        return hasDirtyTests;
    }

    private static _isAnyTestPointPresent(testPointList: TCMPointGrid.TestPointsGrid) {
        return testPointList && testPointList._dataSource.length > 0;
    }
}