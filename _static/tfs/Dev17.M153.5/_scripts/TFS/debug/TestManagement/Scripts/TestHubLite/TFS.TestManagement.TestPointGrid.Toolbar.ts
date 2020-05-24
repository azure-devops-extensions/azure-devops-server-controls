import q = require("q");
import Controls = require("VSS/Controls");

import Dialogs = require("VSS/Controls/Dialogs");
import Navigation = require("VSS/Controls/Navigation");
import Menus = require("VSS/Controls/Menus");
import Utils_Array = require("VSS/Utils/Array");
import VSS = require("VSS/VSS");

import TCMBulkEditHelper_LAZY_LOAD = require("TestManagement/Scripts/TFS.TestManagement.BulkEditHelper");

import OrderTestsControl_LAZY_LOAD = require("TestManagement/Scripts/OrderTests/TFS.TestManagement.OrderTests.Control");
import RunWithOptions_LAZY_LOAD = require("TestManagement/Scripts/TFS.TestManagement.RunTestsWithOptions");
import RunWithOptionsHelper_LAZY_LOAD = require("TestManagement/Scripts/TestHubLite/TFS.TestManagement.RunWithOptionsHelper");
import RunWithDTRHelper_LAZY_LOAD = require("TestManagement/Scripts/TestHubLite/TFS.TestManagement.RunWithDTRHelper");
import SelectWorkItemView_LAZY_LOAD = require("TestManagement/Scripts/TFS.TestManagement.SelectWorkItemView");
import TestAssignConfig_LAZY_LOAD = require("TestManagement/Scripts/TFS.TestManagement.AssignConfigurationsToSuite");
import TestCaseBulkEdit_LAZY_LOAD = require("TestManagement/Scripts/TFS.TestManagement.TestCaseBulkEdit");

import MenuCommandState = require("TestManagement/Scripts/TestHubLite/TFS.TestManagement.TestPointGrid.MenuCommandState");
import PageHelper = require("TestManagement/Scripts/TestHubLite/TFS.TestManagement.PageHelper");
import Resources = require("TestManagement/Scripts/Resources/TFS.Resources.TestManagement");
import WITResources = require("WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking");
import TCMConstants = require("Presentation/Scripts/TFS/Generated/TFS.TestManagement.Constants");
import TCMFilterHelper = require("TestManagement/Scripts/TFS.TestManagement.FilterHelper");
import { FilterBarProvider } from "TestManagement/Scripts/TestHubLite/TFS.TestManagement.FilterBarProvider";
import TCMLite = require("TestManagement/Scripts/TFS.TestManagement.Lite");
import TCMMenuItems = require("TestManagement/Scripts/TFS.TestManagement.MenuItem");
import { LicenseAndFeatureFlagUtils } from "TestManagement/Scripts/Utils/TFS.TestManagement.LicenseAndFeatureFlagUtils";
import TCMPointGrid = require("TestManagement/Scripts/TFS.TestManagement.TestPointsGrid");
import TCMSuiteTree = require("TestManagement/Scripts/TFS.TestManagement.TestSuitesTree");
import TCMTelemetry = require("TestManagement/Scripts/TFS.TestManagement.Telemetry");
import TCMTestCaseHelper = require("TestManagement/Scripts/TFS.TestManagement.TestCaseHelper");
import TCMTestRunHelper = require("TestManagement/Scripts/TFS.TestManagement.TestRunHelper");
import TestsOM = require("TestManagement/Scripts/TFS.TestManagement");
import TMUtils = require("TestManagement/Scripts/TFS.TestManagement.Utils");
import TCMUtilHelper = require("TestManagement/Scripts/TFS.TestManagement.TestLiteView.Utils");
import TCMPaneGrid = require("TestManagement/Scripts/TestHubLite/TFS.TestManagement.TestPaneGrid");
import KeyboardShortcuts = require("TestManagement/Scripts/TestHubLite/TFS.TestManagement.KeyboardShortcutHelper");
import TCMShowChildSuitesHelper = require("TestManagement/Scripts/TestHubLite/TFS.TestManagement.ShowChildSuitesHelper");
import Utils_String = require("VSS/Utils/String");
import WITConstants = require("Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants");
import WITOM = require("WorkItemTracking/Scripts/TFS.WorkItemTracking");
import { Exceptions, WorkItemChangeType } from "WorkItemTracking/Scripts/OM/WorkItemConstants";
import WorkItemColumnHelper = require("TestManagement/Scripts/TestHubLite/TFS.TestManagement.WorkItem.ColumnHelper");
import { WorkItemManager } from "WorkItemTracking/Scripts/OM/WorkItemManager";
import { showColumnOptionsPanel } from "WorkItemTracking/Scripts/Queries/Components/ColumnOptions/ColumnOptionsPanel";
import { IColumnOptionsResult, IDisplayColumnResult, IColumnOptionsPanelDisplayColumn } from "WorkItemTracking/Scripts/OM/QueryInterfaces";

import ColumnOptionHelper_LAZY_LOAD = require("TestManagement/Scripts/TFS.TestManagement.ColumnOptionHelper");
import TCMIterationHelper_LAZY_LOAD = require("TestManagement/Scripts/TFS.TestManagement.IterationHelper");

import {TfsContext} from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import {delegate} from "VSS/Utils/Core";
let TelemetryService = TCMTelemetry.TelemetryService;
let WITUtils = TMUtils.WorkItemUtils;
let TestCaseCategoryUtils = TMUtils.TestCaseCategoryUtils;

export class TestPointGridToolbar {
    private _testPlanManager: TestsOM.TestPlanManager;
    private _filterHelper: TCMFilterHelper.FilterHelper;
    private _testPointOutcomeFilter: Navigation.PivotFilter;
    private _viewFilter: Navigation.PivotFilter;
    private _paneFilter: Navigation.PivotFilter;
    private _testerFilter: Navigation.PivotFilter;
    private _configurationFilter: Navigation.PivotFilter;
    private _testSuitesTree: TCMSuiteTree.TestSuitesTree;
    private _wereColumnsChanged: boolean;
    private _testPointList: TCMPointGrid.TestPointsGrid;
    private _currentPlan: any;
    private _orderTestsControl: OrderTestsControl_LAZY_LOAD.OrderTestsControl;
    private _element: JQuery;
    private _options: any;
    private _toolbarOptions: TCMLite.ITestPointToolbarOptions;
    private _bugCategoryTypeName: string;
    private _testSuitesToolbar: Menus.MenuBar;
    private _newTestCaseAddedToSuite: boolean = false;
    private _saving: boolean;
    private _filterBarProvider: FilterBarProvider;
    private _onErrorCallback: (errorMessage: string) => void;
    private _clearErrorCallback: () => void;
    public _testPointsToolbar: Menus.MenuBar;
    private _testPaneHelper: TCMPaneGrid.TestDetailsPaneHelper;
    private _iterationHelper: TCMIterationHelper_LAZY_LOAD.IterationHelper;
    private _testKeyboardShortcutHelper: KeyboardShortcuts.KeyboardShortcutHelper;
    private _showChildSuitesHelper: TCMShowChildSuitesHelper.ShowChildSuitesHelper;
    private _pagingInProgress: boolean = false;
    private _pageHelper: PageHelper.PageHelper;
    private pageFetched: () => void;
    private isInitalizationComplete: () => void;
    private static _instance;
    private _runWithOptionsHelper: RunWithOptionsHelper_LAZY_LOAD.RunWithOptionsHelper;
    private _runWithDTRHelper: RunWithDTRHelper_LAZY_LOAD.RunWithDTRHelper;

    constructor(options: TCMLite.ITestPointToolbarOptions) {
        this._toolbarOptions = options;
        this._currentPlan = options.currentPlan;
        this._element = options.parentElement;
        this._bugCategoryTypeName = options.bugCategoryTypeName;
        this._onErrorCallback = options.onError;
        this._clearErrorCallback = options.clearError;
        this._options = options.parentOptions;
        this.isInitalizationComplete = options.isInitializationComplete;
        this._testPointsToolbar = <Menus.MenuBar>Controls.Enhancement.getInstance(Menus.MenuBar, this._element.find(".hub-pivot-toolbar > .testpoints-toolbar"));
        this._testSuitesToolbar = <Menus.MenuBar>Controls.Enhancement.getInstance(Menus.MenuBar, this._element.find(".test-plans-suites-toolbar > .menu-bar"));
        this._testPointList = <TCMPointGrid.TestPointsGrid>TCMPointGrid.TestPointsGrid.getInstance(TCMPointGrid.TestPointsGrid, this._element.find(".test-view-grid-area > .testcases-grid"));
        this._testSuitesTree = <TCMSuiteTree.TestSuitesTree>TCMSuiteTree.TestSuitesTree.getInstance(TCMSuiteTree.TestSuitesTree, this._element.find(TCMLite.Constants.testManagementSuiteTreeSelector));
        this._iterationHelper = new TCMIterationHelper_LAZY_LOAD.IterationHelper();
        this._testPlanManager = TMUtils.getTestPlanManager();
        this._testKeyboardShortcutHelper = KeyboardShortcuts.KeyboardShortcutHelper.getInstance();
        this._showChildSuitesHelper = TCMShowChildSuitesHelper.ShowChildSuitesHelper.getInstance();
        this._initializeFilters();
        this._initializePaneFilters();

                
        TestPointGridToolbar._instance = this;
    }

    public static getInstance() {
        return TestPointGridToolbar._instance;
    }

    /**
     * Handles the execution of the toolbar items
     * @param e: the execution event. 
     */
    public onTestPointsToolbarItemClick(command: string) {
        if (!this.isInitalizationComplete()) {
            return;
        }

        if (command === TCMMenuItems.TestPointToolbarItemIds.newTestCase) {
            this._createNewTestCase();
        }
        else if (command === TCMMenuItems.TestPointToolbarItemIds.saveTests) {
            this._saveTests(this._testPointList.getDirtyTests());
        }
        else if (command === TCMMenuItems.TestPointToolbarItemIds.runTestPoints) {
            this._runTestPoints(this._testPointList.getSelectedTestPoints());
        }
        else if (command === TCMMenuItems.TestPointToolbarItemIds.refreshTestPoints) {
            this.refreshTestPointsInSuite(this._testSuitesTree.getSelectedSuite().id, delegate(this, this._resumeRunAfterExtensionInstallation));
        }
        else if (command === TCMMenuItems.TestPointToolbarItemIds.toggleFilter) {
            this._filterBarProvider.toggleFilterBar();
            this.UpdateTestPointsToolbarCommandStates();
        }
        else if (command === TCMMenuItems.TestPointToolbarItemIds.newTestCaseWithGrid) {
            this._createTestCaseWithGrid();
        }
        else if (command === TCMMenuItems.TestPointToolbarItemIds.editQuery) {
            this._editQuery();
        }
        else if (command === TCMMenuItems.TestPointToolbarItemIds.addTestCases) {
            this._addTestCases();
        }
        else if (command === TCMMenuItems.TestPointToolbarItemIds.removeTestCase) {
            this._removeSelectedTestCases(this._testPointList.getSelectedTestPoints());
        }
        else if (command === TCMMenuItems.TestPointToolbarItemIds.openTestCase) {
            this._onOpenTestPointDetail();
        }
        else if (command === TCMMenuItems.TestPointToolbarItemIds.runTestPointsUsingClient) {
            this._runTestPointsUsingClient(this._testPointList.getSelectedTestPoints());
        }
        else if (command === TCMMenuItems.TestPointToolbarItemIds.runTestPointsWithOptions) {
            let suite = this._testSuitesTree.getSelectedSuite();
            this._runTestPointsWithOptions(this._testPointList.getSelectedTestPoints());
        }
        else if (command === TCMMenuItems.TestPointToolbarItemIds.runTestPointsWithDTR) {
            this._runTestPointsWithDTR(this._testPointList.getSelectedTestPoints());
        }
        else if (command === TCMMenuItems.TestPointToolbarItemIds.passTest) {
            this._setOutcome(this._testPointList.getSelectedTestPoints(), TCMConstants.TestOutcome.Passed);
        }
        else if (command === TCMMenuItems.TestPointToolbarItemIds.failTest) {
            this._setOutcome(this._testPointList.getSelectedTestPoints(), TCMConstants.TestOutcome.Failed);
        }
        else if (command === TCMMenuItems.TestPointToolbarItemIds.blockTest) {
            this._setOutcome(this._testPointList.getSelectedTestPoints(), TCMConstants.TestOutcome.Blocked);
        }
        else if (command === TCMMenuItems.TestPointToolbarItemIds.notApplicableTest) {
            this._setOutcome(this._testPointList.getSelectedTestPoints(), TCMConstants.TestOutcome.NotApplicable);
        }
        else if (command === TCMMenuItems.TestPointToolbarItemIds.resetTest) {
            this._resetTestPoints(this._testPointList.getSelectedTestPoints());
        }
        else if (command === TCMMenuItems.TestPointToolbarItemIds.columnOptions) {
            this._launchColumnOptions();
        }
        else if (command === TCMMenuItems.TestPointToolbarItemIds.resumeRun) {
            this._resumeRun(this._testPointList.getSelectedTestPoints());
        }
        else if (command === TCMMenuItems.TestPointToolbarItemIds.orderTests) {
            this._createOrderTestCasesControl();
        }
        else if (command === TCMMenuItems.TestPointToolbarItemIds.toggleTestCaseDetailsPane) {
            this._testPaneHelper.toggleTestCaseDetailsPane();
        }
    }

    private _onNewTestCaseCreated(sender: any, args?: any) {

        let workItem,
            workItemId;

        workItem = args.workItem;
        workItemId = workItem.id;
        if (workItemId <= 0) {
            // This means the work item has not been created yet.
            return;
        }

        if (args.change === WorkItemChangeType.SaveCompleted) {
            this._addTestCaseToCurrentSuiteIfNeeded(workItem);
            //Adding telemetry for creating test plan workitem. Area: TestManagement, Feature: CreateTestCase
            TelemetryService.publishEvent(TelemetryService.featureCreateTestCase, TelemetryService.createTestCaseUsingWit, 1);
        }
    }

    private _addTestCaseToCurrentSuiteIfNeeded(workItem: WITOM.WorkItem) {
        // basically 4 checks need to be performed here
        //1. The work item is not already addded to the suite
        //2. The selected suite is not a dynamic suite.
        //3. The work item is in test case category
        //4. The workitem has a related link to a work item already in test suite
        if (this._isTestCaseInCurrentSuite(workItem.id)) {
            return;
        }

        // If the current selected suite is dynamic type, then refresh and return with out adding test case.
        if (this._isSuiteDynamicType()) {
            this.refreshTestPointsInSuite(this._testSuitesTree.getSelectedSuite().id);
            return;
        }

        TestCaseCategoryUtils.getAllWorkItemTypeForTestCaseCategory((witNames) => {
            if ($.inArray(workItem.workItemType.name, witNames) !== -1 && this._hasRelatedLinkToWorkItemInCurrentSuite(workItem)) {
                this._addTestCasesToSelectedSuite([workItem.id], TMUtils.TestSuiteUtils.beginAddTestCasesToSuite);
            }
        });

    }

    private _hasRelatedLinkToWorkItemInCurrentSuite(workItem: WITOM.WorkItem): boolean {
        let witStore = WITUtils.getWorkItemStore();
        let links = workItem.getLinks();

        if (witStore.linkTypes && links && links.length > 0) {
            let linkId = witStore.findLinkTypeEnd("System.LinkTypes.Related-Forward").id,
                i: number,
                hasLink: boolean,
                tesCaseIdsInCurrentSuite = TCMPointGrid.TestPointsGrid.getTestCaseIdsFromTestPoints(this._testPointList.cachedTestPoints);

            for (i = 0; i < links.length; i++) {
                if ($.inArray(links[i].linkData.ID, tesCaseIdsInCurrentSuite) !== -1 && links[i].linkData.LinkType === linkId) {
                    return true;
                }
            }
            return false;
        }
        return false;
    }

    private _isTestCaseInCurrentSuite(id: number): boolean {
        let tesCaseIdsInCurrentSuite = TCMPointGrid.TestPointsGrid.getTestCaseIdsFromTestPoints(this._testPointList.cachedTestPoints);
        return ($.inArray(id, tesCaseIdsInCurrentSuite) !== -1);
    }

    private _isSuiteDynamicType() {
        let suite = this._testSuitesTree.getSelectedSuite();
        if (suite && suite.type === TCMConstants.TestSuiteType.DynamicTestSuite) {
            return true;
        }
    }

    private _resumeRunAfterExtensionInstallation(): void {
        if (window.sessionStorage.getItem("resumeTestSessionAfterClose") === "true") {
            window.sessionStorage.removeItem("resumeTestSessionAfterClose");
            this._resumeRun(this._testPointList.getSelectedTestPoints());
        }
    }

    private _createTestCaseWithGrid() {
        let bulkEditHelper = TCMBulkEditHelper_LAZY_LOAD.BulkEditHelper.getInstance();
        this._hideViewGrid();
        bulkEditHelper.showGridView([], false, this._testSuitesTree.getSelectedSuite(), this._currentPlan, this._testPointList.savedColumns, () => { this._setViewFilter("grid"); }, () => { this._setViewFilter("list"); });
    }

    private _hideViewGrid() {
        let filters: TCMLite.Filters = new TCMLite.Filters(this._testPointOutcomeFilter, this._testerFilter, this._configurationFilter, this._viewFilter);

        TCMUtilHelper.TestLiteViewUtils.hideViewGrid(filters, this._testPointsToolbar, this._iterationHelper, this._testPaneHelper, this._element);
    }

    private _setViewFilter(value: string) {
        // Hide the filter bar
        if (this._filterBarProvider) {
            this._filterBarProvider.clearAndHideFilterBar();
        }
        let viewFilterItem = this._viewFilter.getItem(value);
        if (viewFilterItem) {
            this._viewFilter.setSelectedItem(viewFilterItem);
        }
    }

    private _initializePaneFilters() {
        let paneFilter = this._getFilter(TCMLite.FilterSelectors.pane);
        let positionFilter = this._getFilter(TCMLite.FilterSelectors.workItemPanePosition);
        this._testPaneHelper = new TCMPaneGrid.TestDetailsPaneHelper(paneFilter, positionFilter, this._testPointList, this._element, this._options, this._testPointsToolbar);
    }

    public onContextMenuItemClick(command: string) {
        if (!this.isInitalizationComplete()) {
            return;
        }

        if (command === TCMMenuItems.TestPointToolbarItemIds.assignConfiguration) {
            this.assignConfigurationToTestCases();
        }
        if (command === TCMMenuItems.TestPointToolbarItemIds.openTestCase) {
            this._onOpenTestPointDetail();
        }
        else if (command === TCMMenuItems.TestPointToolbarItemIds.removeTestCase) {
            this._removeSelectedTestCases(this._testPointList.getSelectedTestPoints());
        }
        else if (command === TCMMenuItems.TestPointToolbarItemIds.runTestPoints) {
            this._runTestPoints(this._testPointList.getSelectedTestPoints());
        }
        else if (command === TCMMenuItems.TestPointToolbarItemIds.runTestPointsUsingClient) {
            this._runTestPointsUsingClient(this._testPointList.getSelectedTestPoints());
        }
        else if (command === TCMMenuItems.TestPointToolbarItemIds.runTestPointsWithOptions) {
            this._runTestPointsWithOptions(this._testPointList.getSelectedTestPoints());
        }
        else if (command === TCMMenuItems.TestPointToolbarItemIds.runTestPointsWithDTR) {
            this._runTestPointsWithDTR(this._testPointList.getSelectedTestPoints());
        }
        else if (command === TCMMenuItems.TestPointToolbarItemIds.passTest) {
            this._setOutcome(this._testPointList.getSelectedTestPoints(), TCMConstants.TestOutcome.Passed);
        }
        else if (command === TCMMenuItems.TestPointToolbarItemIds.failTest) {
            this._setOutcome(this._testPointList.getSelectedTestPoints(), TCMConstants.TestOutcome.Failed);
        }
        else if (command === TCMMenuItems.TestPointToolbarItemIds.blockTest) {
            this._setOutcome(this._testPointList.getSelectedTestPoints(), TCMConstants.TestOutcome.Blocked);
        }
        else if (command === TCMMenuItems.TestPointToolbarItemIds.resetTest) {
            this._resetTestPoints(this._testPointList.getSelectedTestPoints());
        }
        else if (command === TCMMenuItems.TestPointToolbarItemIds.notApplicableTest) {
            this._setOutcome(this._testPointList.getSelectedTestPoints(), TCMConstants.TestOutcome.NotApplicable);
        }
        else if (command === TCMMenuItems.TestPointToolbarItemIds.bulkEditTests) {
            this._bulkEditTestCases();
        }
        else if (command === TCMMenuItems.TestPointToolbarItemIds.bulkEditTestsGrid) {
            this._bulkEditTestCasesUsingGrid(this._getSelectedTestCaseIds());
        }
        else if (command === TCMMenuItems.TestPointToolbarItemIds.resumeRun) {
            this._resumeRun(this._testPointList.getSelectedTestPoints());
        }
        else if (command === TCMMenuItems.TestPointToolbarItemIds.viewLatestResult) {
            this._onViewLatestResultForSelectedPoint();
        }
    }

    private _bulkEditTestCasesUsingGrid(testCaseIds: number[]): void {
        let bulkEditHelper = TCMBulkEditHelper_LAZY_LOAD.BulkEditHelper.getInstance();
        this._hideViewGrid();
        bulkEditHelper.showGridView(testCaseIds, false, this._testSuitesTree.getSelectedSuite(), this._currentPlan,
            this._testPointList.savedColumns, () => { this._setViewFilter("grid"); }, () => { this._setViewFilter("list"); });
    }

    private _bulkEditTestCases() {
        VSS.using(["TestManagement/Scripts/TFS.TestManagement.TestCaseBulkEdit"], (Module: typeof TestCaseBulkEdit_LAZY_LOAD) => {
            TestCaseCategoryUtils.getAllWorkItemTypeForTestCaseCategory(
                (workItemTypes: string[]) => {
                    let bulkEdit = new Module.BulkEditTestCases();
                    let projectTypeMapping: IDictionaryStringTo<string[]> = {};
                    // test management is never cross project, so we're safe to use the current project.
                    // plus the call to getting the work item types is scoped to current project.
                    projectTypeMapping[TfsContext.getDefault().navigation.project] = workItemTypes;
                    bulkEdit._bulkEditTestCases(this._getSelectedTestCaseIds(), projectTypeMapping);
                });
        });
    }

    public fetchMoreTestPoints(callback?: () => void) {
        if (this._pagingInProgress) {
            this.pageFetched = () => {
                this.pageFetched = null;
                this._beginPageTestPoints(callback);
            };
        } else {
            this._beginPageTestPoints(callback);
        }
    }
    
    private _beginPageTestPoints(callback?: () => void) {
        let testpointIdsToFetch: number[];

        if (this._pagingInProgress) {
            return;
        }

        if (!this._pageHelper) {
            this._pageHelper = PageHelper.PageHelper.getInstance();
        }
        if (!this._pageHelper || !this._pageHelper.canPage()) {
            return;
        }

        testpointIdsToFetch = this._pageHelper.getIdsToFetch();
        this._pagingInProgress = true;

        this._fetchTestPoints(testpointIdsToFetch, false, null, () => {

            this._pagingInProgress = false;
            if (this._pageHelper) {
                this._pageHelper.pageFetchComplete();
            }
            if (this.pageFetched) {
                this.pageFetched();
            }
            if (callback) {
                callback();
            }
        });
    }

    private _getSelectedTestCaseIds(): number[] {
        let testPoints: TestsOM.ITestPointModel[] = this._testPointList.getSelectedTestPoints();
        return TCMPointGrid.TestPointsGrid.getTestCaseIdsFromTestPoints(testPoints);
    }

    private assignConfigurationToTestCases() {
        let testPoints = this._testPointList.getSelectedTestPoints();
        if (testPoints) {
            let testCaseAndSuiteList = this._getTestCaseAndSuiteListFromTestPoints(testPoints);
            this._assignConfigurationsToTestCases(testCaseAndSuiteList);
        }
    }

    /**
     * Return the list of unique testcaseids
     * @param testPoints
     */
    private _getTestCaseAndSuiteListFromTestPoints(testPoints) {
        if (!testPoints) {
            return [];
        }

        let index: number,
            testCaseList: TestsOM.ITestCaseWithParentSuite[] = [],
            len = testPoints.length;

        let getIfTestCaseIsAlreadyAdded = (testCaseList: TestsOM.ITestCaseWithParentSuite[], testCase: TestsOM.ITestCaseWithParentSuite) => {
            let result = testCaseList.filter(function (obj) {
                return obj.id === testCase.id && obj.suiteId === testCase.suiteId;
            });

            return result.length > 0;
        };

        for (index = 0; index < len; index++) {
            let testCase: TestsOM.ITestCaseWithParentSuite = {
                id: testPoints[index].testCaseId,
                suiteId: testPoints[index].suiteId,
                suiteName: testPoints[index].suiteName
            };

            if (!getIfTestCaseIsAlreadyAdded(testCaseList, testCase)) {
                testCaseList.push(testCase);
            }
        }

        return testCaseList;
    }

    private _assignConfigurationsToTestCases(testCaseAndSuiteList: TestsOM.ITestCaseWithParentSuite[]) {
        if (!testCaseAndSuiteList || testCaseAndSuiteList.length === 0) {
            return;
        }

        let selectedSuite = this._testSuitesTree.getSelectedSuite();
        VSS.using(["TestManagement/Scripts/TFS.TestManagement.AssignConfigurationsToSuite"], (Module: typeof TestAssignConfig_LAZY_LOAD) => {
            let assignConfigurationsToSuite = new Module.AssignConfigurationsToSuite(this._currentPlan.plan.id, selectedSuite);
            
            assignConfigurationsToSuite.AssignConfigurationsToTestCases(testCaseAndSuiteList, this._showChildSuitesHelper.isShowChildSuitesEnabled(),
                (assignedConfigurations: number[], changesSaved: boolean) => {
                    // refresh test points only when changes were saved
                    if (changesSaved) {
                        this.refreshTestPointsInSuite(this._currentPlan.selectedSuiteId);

                        //Adding telemetry for assign configuration to test cases. Area: TestManagement, Feature: AssignConfiguration. Property: Number of test cases selected.
                        TelemetryService.publishEvent(TelemetryService.featureAssignConfiguration, TelemetryService.numberOfTestCases, testCaseAndSuiteList.length);
                    }
                },
                (e) => {
                    this._onErrorCallback(VSS.getErrorMessage(e));
                });
        });

    }

    /**
     * Updates the states of toolbar buttons - refresh and open-test-case based on test case count and selection
     */
    public UpdateTestPointsToolbarCommandStates() {
        MenuCommandState.TestPointGridMenuCommandState.UpdateTestPointsToolbarCommandStates(
            this._testPointsToolbar, this._testPointList, this._testSuitesTree, this._showChildSuitesHelper.isShowChildSuitesEnabled());
    }

    /**
     * Updates test point grid context menu items list
     * @param menu the menu to update
     */
    public UpdateTestPointGridContextMenuCommandStates(menu: Menus.MenuItem) {
        MenuCommandState.TestPointGridMenuCommandState.updateContextMenuCommandStates(menu, this._testPointList, this._testSuitesTree);
    }

    /**
     * Refresh the passed test points in the test point grid
     * @param testPoints
     */
    public refreshTestPoints(testPoints: TCMLite.ITestPointModel[]) {
        let testPointInfoList,
            testPointIds: number[],
            testCaseList: number[] = [];

        testCaseList = TCMPointGrid.TestPointsGrid.getTestCaseIdsFromTestPoints(testPoints);
        testPointInfoList = this._getTestPointsForTestCases(testCaseList, this._testPointList.cachedTestPoints);
        testPointIds = this._getTestPointIds(testPointInfoList);
        if (this._testPointList.savedColumns) {
            for (let index = 0, length = this._testPointList.savedColumns.length; index < length; index++) {
                this._testPointList.savedColumns[index].width = Math.round(this._testPointList.savedColumns[index].width);
            }
        }

        this._fetchTestPoints(testPointIds, true, testPointInfoList, () => {
            if (this._showChildSuitesHelper.isShowChildSuitesEnabled()) {
                this.refreshSuitePointCounts(null);
            }
        });
    }

    /**
     * Refresh the test points for the suite
     * @param suiteId
     * @param callback
     */
    public refreshTestPointsInSuite(suiteId: number, callback?: IResultCallback, skipRefreshTestPointsCount?: boolean) {

        if (!suiteId) {
            suiteId = this._testSuitesTree.getSelectedSuite().id;
        }
        let outcomeFilter: string = null;
        let configurationFilter: number;
        let testerFilter: string = null;
        let selectedTestPointIds = this._testPointList.getSelectedTestPointIds();
        let restoreSelection: boolean = this._saveSelection(selectedTestPointIds);
        if (this._filterHelper && this._filterHelper.isFilterApplied()) {
            outcomeFilter = this._filterHelper.getOutcomeFilterValue();
            configurationFilter = this._filterHelper.getConfigurationFilterValue();
            testerFilter = this._filterHelper.getTesterFilterValue();
        }
        this._testPlanManager.getTestPointsForSuite(this._currentPlan.plan.id, suiteId, true, this._createDisplayColumns(), outcomeFilter, testerFilter, configurationFilter, (testPointResponse) => {
            this._testPointList.savedColumns = testPointResponse.columnOptions;
            this._testPointList.sortOrder = testPointResponse.columnSortOrder;
            this._testPointList.totalTestPoints = testPointResponse.sortedPointIds ? testPointResponse.sortedPointIds.length : testPointResponse.totalPointsCount;
            
            this._wereColumnsChanged = false;
            this._testPointList.cachedTestPoints = testPointResponse.testPoints;
            let testPoints = testPointResponse.testPoints;
            TCMUtilHelper.TestLiteViewUtils.modifySequenceNumber(testPoints);
            TCMPointGrid.TestPointsGrid.parseTestCaseFieldsInTestPoints(testPoints);
            this._clearErrorCallback();
            this._testPointList.setSource(testPoints, this._testPointList.savedColumns, this._testPointList.sortOrder, this._testPointList.pagedColumns);
            // Update the tester and configuration filters.
            this._filterHelper.updateFilterValues(testPointResponse.testPoints, testPointResponse.configurations);

            let totalPointCount = 0;
            if (testPointResponse.sortedPointIds){
                totalPointCount = testPointResponse.sortedPointIds.length;
            }
            TCMUtilHelper.TestLiteViewUtils.showCount(testPointResponse.totalPointsCount, totalPointCount, this._filterHelper.isFilterApplied());

            // Set the test page helper values.
            this.setPageHelperValue(testPointResponse.sortedPointIds);


            if (skipRefreshTestPointsCount) {
                return;
            }

            if (this._showChildSuitesHelper.isShowChildSuitesEnabled()) {
                this.refreshSuitePointCounts(null);
            } else {
                this.refreshSuitePointCounts(this._testSuitesTree.getSelectedSuite());
            }
            if (restoreSelection) {
                this._restoreSelection(this._testPointList, selectedTestPointIds);
            }
            if ($.isFunction(callback)) {
                callback();
            }

        }, (error) => {
                this._onErrorCallback(VSS.getErrorMessage(error));
            }, TCMLite.Constants.maxPageSize, this._showChildSuitesHelper.isShowChildSuitesEnabled());
    }

    public removeSelectedTestCases() {
        if (this._testSuitesTree.getSelectedSuite().suiteType !== TCMConstants.TestSuiteType.DynamicTestSuite.toString()) {
            this._removeSelectedTestCases(this._testPointList.getSelectedTestPoints());
        }
    }

    /**
     * Setting up the ids for pagination
     */
    public setPageHelperValue(sortedPointIds) {
        this._pageHelper = new PageHelper.PageHelper(sortedPointIds, TCMLite.Constants.maxPageSize, TCMLite.Constants.maxPageSize);
        //Skiping the 1st page as it is already fetched
        this._pageHelper.setStartingPage(1);
    }

    public refreshSuitePointCounts(selectedSuite: any) {
       if (LicenseAndFeatureFlagUtils.isPointCountFeatureDisabled()){
           return;
       }
        let outcome = this._filterHelper.getOutcomeFilterValue(),
            testerFilterValue: string = this._filterHelper.getTesterFilterValue(),
            testerId = this._filterHelper.getValueOfTesterFilter(),
            configurationId: number = this._filterHelper.getConfigurationFilterValue();

        if (!this._currentPlan.plan) {
            return;
        }

        TMUtils.getTestPlanManager().fetchFilteredSuitesTestPointCountInPlan(this._currentPlan.plan.id, outcome, testerId, configurationId, (data) => {
            let outcomeNow: string = this._getSelectedValueInFilter(this._testPointOutcomeFilter),
                testerNow: string = this._filterHelper.getTesterFilterValue(),
                configurationNow: string = this._getSelectedValueInFilter(this._configurationFilter),
                configurationIdNow: number = this._filterHelper.getConfigurationFilterValue(),
                selectedSuiteNow = this._testSuitesTree.getSelectedSuite();

            if (outcomeNow === this._filterHelper.ALL_FILTER) {
                outcomeNow = "";
            } else {
                TelemetryService.publishEvents(TelemetryService.featureTesterFilter, {});
            }

            if (configurationNow !== this._filterHelper.ALL_FILTER) {
                TelemetryService.publishEvents(TelemetryService.featureConfigurationFilter, {});
            }

            if (outcome === outcomeNow &&
                testerFilterValue === testerNow &&
                configurationId === configurationIdNow) {
                selectedSuite = this._testSuitesTree.getSelectedSuite();
                let pointsdata = this._parseSuitePointCountData(data);
                let totaldata = this._parseSuiteTotalPointCountData(data);

                this._testSuitesTree.updateNodes(pointsdata, totaldata);
            }

        }
        );
    }

    private _parseSuitePointCountData(data) {
        let suiteIdToPointCountMap = {};
        $.each(data, function (i, suite) {
            suiteIdToPointCountMap[suite.id] = suite.pointCount;
        });

        return this._getsuiteIdToPointCountMap(suiteIdToPointCountMap);
    }

    private _parseSuiteTotalPointCountData(data) {
        let suiteIdToPointCountMap = {};
        $.each(data, function (i, suite) {
            suiteIdToPointCountMap[suite.id] = suite.totalPointsCount;
        });

        return this._getsuiteIdToPointCountMap(suiteIdToPointCountMap);
    }

    private _getsuiteIdToPointCountMap(suiteIdToPointCountMap: any) {
        if (this._showChildSuitesHelper.isShowChildSuitesEnabled()) {

            let suites = this._testSuitesTree.GetDisplaySuites();
            let recursiveSuiteIdPointCountMap = {};
            let that = this;
            $.each(suites, function (i, suite) {
                let pointCount = that._getpointCountRecursive(suite.id, suites, suiteIdToPointCountMap);
                recursiveSuiteIdPointCountMap[suite.id] = pointCount;
            });
            suiteIdToPointCountMap = recursiveSuiteIdPointCountMap;
        }
        return suiteIdToPointCountMap;
    }

    private _getpointCountRecursive(suiteId: number, suites: any, suiteIdToPointCountMap: any): number {
        //Recursive method to get point count for a given suiteID and all its child suite 
        let pointCount = 0;
        let that = this;
        let currentSuite = suites[suiteId];
        pointCount = suiteIdToPointCountMap[suiteId] ? suiteIdToPointCountMap[suiteId] : 0;
        if (currentSuite.childSuiteIds.length > 0) {

            $.each(currentSuite.childSuiteIds, function (i, suiteId) {
                pointCount += that._getpointCountRecursive(suiteId, suites, suiteIdToPointCountMap);
            });
        }
        return pointCount;
    }

    private _updatePointCountForSuite(suite: any, count: number): boolean {
        if (suite) {
            suite.pointCount = count;
            return true;
        }
        return false;
    }

    private _updateTotalPointCountForSuite(suite: any, totalCount: number): boolean {
        if (suite) {
            suite.totalPointCount = totalCount;
            return true;
        }
        return false;
    }

    /**
     * Launch the column options dialog
     */
    private _launchColumnOptions() {
        VSS.using(["TestManagement/Scripts/TFS.TestManagement.ColumnOptionHelper"], (ColumnOptionHelperModule: typeof ColumnOptionHelper_LAZY_LOAD) => {
            const columnOptionsHelper = ColumnOptionHelperModule.ColumnOptions;
            const displayColumns = columnOptionsHelper.getDisplayColumns(this._testPointList.getColumns());

            showColumnOptionsPanel({
                displayColumns: displayColumns.map(dc => ({
                    fieldRefName: dc.name,
                    width: dc.width
                } as IColumnOptionsPanelDisplayColumn)),
                allowSort: false,
                getAvailableFields: delegate(this, columnOptionsHelper.getAvailableColumnsAsFieldDefinitions),
                onOkClick: (result: IColumnOptionsResult) => {
                    this._saveColumns(result.display, delegate(this, this.refreshTestPointsInSuite));
                }
            });
        });
    }

    /**
     * Persist the column state
     * @param columns : List of column definitions
     * @param callback : The callback to invoke on completion
     */
    private _saveColumns(columns: IDisplayColumnResult[], callback?: IResultCallback) {
        this._testPointList.savedColumns = columns.map(col => ({
            name: col.name,
            text: col.text,
            fieldId: col.id,
            canSortBy: false,
            width: Math.round(col.width),
            index: "",
            type: ""
        } as TCMLite.ITestPointGridDisplayColumn));
        this._wereColumnsChanged = true;
        this._testPointList.onColumnsChanged(this._testPointList.savedColumns);

        // Skip the refresh of test points count.
        callback(null, null, true);
    }

    private _createNewTestCase() {
        if (this._showChildSuitesHelper.isShowChildSuitesEnabled()) {
            alert(Resources.CannotAddExistingTestCases);
            return;
        }

        let currentDelegate = TMUtils.TestSuiteUtils.beginAddTestCasesToSuite;
        TCMTestCaseHelper.TestCaseHelper.createNewTestCase(this._currentPlan, this._testSuitesTree.getSelectedSuite(), this._testPlanManager, this._getNewTestCaseOptions(currentDelegate));
    }

    private _getNewTestCaseOptions(currentDelegate: any) {
        return {
            save: (workItem: WITOM.WorkItem) => {
                if (!this._newTestCaseAddedToSuite) {
                    this._addTestCasesToSelectedSuite([workItem.id], currentDelegate);
                    this._newTestCaseAddedToSuite = true;
                }
            },
            close: () => {
                this._newTestCaseAddedToSuite = false;
            }
        };
    }

    private _addTestCasesToSelectedSuite(testCaseIds: number[], currentDelegate: any) {
        let testCaseIdsInCurrentSuite: number[] = TCMPointGrid.TestPointsGrid.getTestCaseIdsFromTestPoints(this._testPointList.cachedTestPoints),
            testCaseMap = {},
            testCasesToInsert: number[] = [];

        for (let i = 0, length = testCaseIdsInCurrentSuite.length; i < length; i++) {
            testCaseMap[testCaseIdsInCurrentSuite[i]] = true;
        }

        for (let i = 0, length = testCaseIds.length; i < length; i++) {
            if (!testCaseMap[testCaseIds[i]]) {
                testCasesToInsert.push(testCaseIds[i]);
            }
        }

        if (testCasesToInsert.length > 0) {
            // TODO: Need to use more cleaner way for mapping operation.
            let currentSuite = TCMUtilHelper.TestLiteViewUtils.mapSuitesToLegacyModel(this._testSuitesTree.getSelectedSuite());
            
            currentDelegate(testCasesToInsert,
                this._currentPlan.plan.id,
                currentSuite,
                (suiteUpdate: any) => {
                    if (suiteUpdate) {
                        this._testSuitesTree.updateSuitesRevisionAndPointCount([suiteUpdate]);
                    }
                    this.refreshTestPointsInSuite(this._testSuitesTree.getSelectedSuite().id);
                },
                (error) => {
                    if (error.type && error.type === TCMLite.Exceptions.TestObjectNotFoundException) {
                        this._onErrorCallback(Utils_String.format(Resources.TestCannotBeAddedToSuite, currentSuite.id));
                    }
                    else {
                        this._onErrorCallback(VSS.getErrorMessage(error));
                    }
                });
        }
    }

    /**
     * Returns the column options. 
     */
    private _createDisplayColumns(): TCMLite.ITestPointGridDisplayColumn[] {
        let displayColumns: TCMLite.ITestPointGridDisplayColumn[] = [],
            col: TCMLite.ITestPointGridDisplayColumn;

        if (!this._testPointList.savedColumns || this._testPointList.savedColumns.length === 0 || !this._wereColumnsChanged) {
            return displayColumns;
        }

        $.each(this._testPointList.savedColumns, function (index, entry: any) {
            displayColumns.push({
                name: entry.name,
                text: entry.text,
                fieldId: entry.id ? entry.id : entry.fieldId,
                canSortBy: entry.canSortBy ? entry.canSortBy : false,
                width: Math.round(entry.width),
                index: entry.index ? entry.index : "",
                type: "",
                isIdentity: entry.isIdentity
            });
        });

        return displayColumns;
    }

    /**
     * Function that executes upon double clicking an item in grid
     */
    private _onOpenTestPointDetail() {
        this._testPointList.openSelectedTestCase(this._testCaseCloseCallback);
        WorkItemManager.get(WITUtils.getWorkItemStore()).attachWorkItemChanged(delegate(this, this._onNewTestCaseCreated));
        TelemetryService.publishEvents(TelemetryService.featureOpenTestCaseWIT, {});
    }

    private _testCaseCloseCallback()
    {
        WorkItemManager.get(WITUtils.getWorkItemStore()).detachWorkItemChanged(delegate(this, this._onNewTestCaseCreated));
    }

    private _onViewLatestResultForSelectedPoint() {
        let testPoint = this._testPointList.getSelectedTestPoint();
        let link = TestsOM.UriHelper.getTestResultUri(testPoint.mostRecentRunId, testPoint.mostRecentResultId, 0);
        window.open(link, "_blank");
    } 

    private _resumeRun(testPoints: TCMLite.ITestPointModel[]) {
        TCMTestRunHelper.TestRunHelper.resumeRun(testPoints, this._testSuitesTree.getSelectedSuite(), this._bugCategoryTypeName, this._onErrorCallback);
    }

    private _runTestPoints(selectedTestPoints: TCMLite.ITestPointModel[]) {
        if (TCMTestRunHelper.TestRunHelper.areAllTestsAutomated(selectedTestPoints)) {
            TCMTestRunHelper.TestRunHelper.runAutomatedTestsUsingTestPlanSettings(
                selectedTestPoints,
                this._currentPlan.plan,
                () => {
                    this.refreshTestPoints(selectedTestPoints);
                });

            TelemetryService.publishEvents(TelemetryService.featureAutomatedRunTriggered, {});
        } else {
            // Check if the test cases can be run manually before running them
            TCMTestRunHelper.TestRunHelper.validateSelectedTestPointsforRunningManually(selectedTestPoints).then(() => {
                this._runTestPointsUsingWebRunner(selectedTestPoints);
            });
        }
    }

    private _runTestPointsUsingWebRunner(testPoints: TCMLite.ITestPointModel[], selectedBuildUri?: string) {
        TCMTestRunHelper.TestRunHelper.runTestPointsUsingWebRunner(
            testPoints,
            this._testSuitesTree.getSelectedSuite(),
            this._currentPlan.plan,
            this._bugCategoryTypeName,
            TfsContext.getDefault().currentIdentity.id,
            this._onErrorCallback,
            selectedBuildUri);
    }

    private _runTestPointsUsingClient(testPoints: TCMLite.ITestPointModel[]) {
        TCMTestRunHelper.TestRunHelper.runTestPointsUsingClient(this._currentPlan.plan.id, testPoints);
    }

    private _runTestPointsUsingNewClient(testPoints: TCMLite.ITestPointModel[], selectedBuildUri: string, selectedDataCollectors: any, isDtr: boolean) {
        TCMTestRunHelper.TestRunHelper.runTestPointsUsingNewClient(testPoints,
            this._testSuitesTree.getSelectedSuite(), this._currentPlan.plan, TfsContext.getDefault().currentIdentity.id, selectedBuildUri, selectedDataCollectors, isDtr, this._onErrorCallback);
    }

    private _setOutcome(testPointList, outcome) {
        if (!this._testPlanManager) {
            this._testPlanManager = TMUtils.getTestPlanManager();
        }

        let plan = this._currentPlan.plan,
            selectedSuite = this._testSuitesTree.getSelectedSuite(),
            testPointIds = this._getTestPointIdsFromTestPoints(testPointList);

        this._enableFilters(false);
        this._testPlanManager.bulkMarkTestPoints(plan.id, selectedSuite.id, testPointIds, outcome, () => {
            if (testPointList.length > 0) {
                this.refreshTestPoints(testPointList);
            }
        },

            (error) => {
                this.handleTestPointError(Resources.BulkMarkError, error);
            });

        //Adding telemetry for creating test plan workitem. Area: TestManagement, Feature: BulkMarkOutcome. Outcome property has the value if the outcome is changed to Pass, Fail, Not applicable, Blocked.   
        TelemetryService.publishEvents(TCMTelemetry.TelemetryService.featureBulkMarkOutcome, {
            "Outcome": outcome,
            "NumberOfPoints": testPointList.length
        });
    }

    /**
     * Enable/Disable filters.
     * @param enable If enable is false, filter is disabled, if it is true it is enabled.
     */
    private _enableFilters(enable: boolean) {
        this._enableFilter(this._testPointOutcomeFilter, enable);
        this._enableFilter(this._testerFilter, enable);
        this._enableFilter(this._configurationFilter, enable);
        this._enableFilter(this._paneFilter, enable);

        if (LicenseAndFeatureFlagUtils.AreAdvancedTestManagementFeaturesEnabled()) {
            this._enableFilter(this._viewFilter, enable);
        }
    }

    /**
     * Enable/Disable filters.
     * @param filter The filter to be enabled/disabled.
     * @param enable If enable is false, filter is disabled, if it is true it is enabled.
     */
    private _enableFilter(filter: any, enable: boolean) {
        if (filter) {
            if (enable === false) {
                filter.showBusyOverlay();
            }
            else {
                filter.hideBusyOverlay();
            }
        }
    }

    /**
     * Updates the pivot filter with possible values.
     * @param testCases List of test cases
     * @param testPointList List of Test Points
     */
    private _getTestPointsForTestCases(testCases: number[], testPointList: TCMLite.ITestPointModel[]): any {
        let testPointsForTestCase = {},
            index = 0,
            testPoint,
            testCaseListIndex;
        for (index = 0; index < testPointList.length; index++) {
            testPoint = testPointList[index];
            for (testCaseListIndex = 0; testCaseListIndex < testCases.length; testCaseListIndex++) {
                if (testPoint.testCaseId === testCases[testCaseListIndex]) {
                    testPointsForTestCase[testPoint.testPointId] = { testPoint: testPoint, rowIndex: index };
                }
            }
        }

        return testPointsForTestCase;
    }

    private _getTestPointIds(testPointInfoList): number[] {
        let testPointIds: number[] = [],
            testPointId;
        for (testPointId in testPointInfoList) {
            if (testPointInfoList.hasOwnProperty(testPointId)) {
                testPointIds.push(testPointId);
            }
        }

        return testPointIds;
    }

    private _fetchTestPoints(testPointIds: number[], pointsVisibleOnGrid: boolean, testPointInfoList: TCMLite.ITestPointModel[], callback?: () => void) {
        let initialCount = this._testPointList.getLastRowDataIndex();
        this._testPlanManager.fetchTestPoints(this._currentPlan.plan.id, testPointIds, this._testPointList.savedColumns, (testPoints) => {
            let selectedTestPointIds: number[] = [];
            let restoreSelection: boolean = this._saveSelection(selectedTestPointIds);
            let selectedSuite = this._testSuitesTree.getSelectedSuite();
            this._increaseSeqNumberToRemoveZeroIndex(testPoints);
            let getSelectedRowIntoView: boolean = false;
            this._parseTestCaseFieldsInTestPoints(testPoints);
            if (pointsVisibleOnGrid) {
                this._updateTestPointInfoList(testPointInfoList, testPoints);
                this._updateTestPointsData(testPointInfoList, this._testPointList.cachedTestPoints);
                getSelectedRowIntoView = true;
            } else {
                this._testPointList.cachedTestPoints = this._testPointList.cachedTestPoints.concat(testPoints);
                getSelectedRowIntoView = false;
            }

            TCMUtilHelper.TestLiteViewUtils.modifySequenceNumber(this._testPointList.cachedTestPoints);
            this._filterHelper._updateTesterFilterValues(this._testPointList.cachedTestPoints);
            let filteredItemLength = this._filter(this._testPointList.cachedTestPoints, undefined, getSelectedRowIntoView);
            let pointsRemoved = initialCount - filteredItemLength;
            let visiblePoints = pointsVisibleOnGrid ? selectedSuite.pointCount - pointsRemoved : selectedSuite.pointCount;
            this._updatePointCountForSuite(selectedSuite, visiblePoints);

            this._testSuitesTree.updateSelectedSuite();

            if (this._filterHelper.isFilterApplied()){
                 let util = TCMUtilHelper.TestLiteViewUtils;
                 let currentPoints = pointsVisibleOnGrid ? util.cachedPointsCount - pointsRemoved : util.cachedPointsCount;

                 util.showCount(util.cachedTotalPointsCount, currentPoints, true);
            }

            this._enableFilters(true);
            //TODO: uncomment after view pane list enable
            let selectedTestPoint = this._testPointList.getSelectedTestPoint(),
                selectedTestCaseId = selectedTestPoint ? selectedTestPoint.testCaseId : 0;
            this._testPaneHelper.showWorkItemBasedOnSelection(selectedTestCaseId);

            if (callback) {
                callback();
            }

            if (restoreSelection) {
                this._restoreSelection(this._testPointList, selectedTestPointIds);
            }
        },
            (error) => {
                if (error.type && error.type === TestsOM.Exceptions.WiqlSyntaxException) {
                    alert(VSS.getErrorMessage(error));
                    this.UpdateTestPointsToolbarCommandStates();
                }
                else {
                    this._onErrorCallback(VSS.getErrorMessage(error));
                }

            });
    }

    private _increaseSeqNumberToRemoveZeroIndex(testPoints: TestsOM.ITestPointModel[]) {
        for (let i = 0, length = testPoints.length; i < length; i++) {
            testPoints[i].sequenceNumber = testPoints[i].sequenceNumber + 1;
        }
    }

    private _restoreSelection(testPointGrid, selectedTestPointIds, suppressFocusChange?: boolean) {
        let index,
            testPoint,
            selectionDone,
            firstSelection = true;

        testPointGrid._clearSelection();

        if (!this._showChildSuitesHelper.isShowChildSuitesEnabled()) {
            for (index = 0; index < testPointGrid._dataSource.length; index++) {
                testPoint = testPointGrid._dataSource[index];
                if (Utils_Array.contains(selectedTestPointIds, testPoint.testPointId)) {
                    if (!firstSelection) {
                        testPointGrid._addSelection(index, index, {
                            doNotFireEvent: true,
                            keepSelectionStart: true
                        });
                    }
                    else {
                        // Fire selection changed event for the first selection only.
                        testPointGrid._selectRow(index);
                        firstSelection = false;
                    }

                    selectionDone = true;
                }
            }
        }

        if (selectionDone === true) {
            testPointGrid._selectionChanged();
            if (!suppressFocusChange) {
                testPointGrid.focus(10);
            }
        }

        // If no selection was done and there was some data, select the first row.
        if (!selectionDone && testPointGrid._dataSource.length > 0) {
            testPointGrid._addSelection(0, 0);
            if (!suppressFocusChange) {
                testPointGrid.focus(10);
            }
        }
    }

    private _parseTestCaseFieldsInTestPoints(testPoints: any[]) {
        let i: number,
            key: string,
            value: string;

        testPoints = $.map(testPoints, (item) => {
            if (item.workItemProperties && item.workItemProperties.length > 0) {
                for (i = 0; i < item.workItemProperties.length; i++) {
                    key = item.workItemProperties[i].Key;
                    value = item.workItemProperties[i].Value;

                    if (key === WITConstants.CoreFieldRefNames.AreaPath || key === WITConstants.CoreFieldRefNames.IterationPath) {
                        if (value) {

                            value = this._parseAreaAndIterationPathFields(value);
                        }
                    }

                    item[key] = value;
                }
            }
            return item;
        });
    }

    private _parseAreaAndIterationPathFields(value: string): string {
        let i: number, c;
        value = $.trim(value);
        for (i = 0; i < value.length; i++) {
            c = value.charAt(i);
            if (c !== "\\") {
                break;
            }
        }
        value = value.substr(i);
        return value;
    }

    private _updateTestPointInfoList(testPointInfoList, testPoints) {
        let index;
        for (index = 0; index < testPoints.length; index++) {
            testPointInfoList[testPoints[index].testPointId].testPoint = testPoints[index];
        }
    }

    /**
     * Updates the Test Points
     * @param testPointInfoList Info of Test Points (specially rowindex of cachedTestPointsData)
     * @param cachedTestPoints testPoint list to be Updated
     */
    private _updateTestPointsData(testPointInfoList: any, cachedTestPoints: any) {
        let rowIndex,
            testPointId;
        for (testPointId in testPointInfoList) {
            if (testPointInfoList.hasOwnProperty(testPointId)) {
                rowIndex = testPointInfoList[testPointId].rowIndex;
                cachedTestPoints[rowIndex] = testPointInfoList[testPointId].testPoint;
            }
        }
    }

    private _filter(testPoints, suppressFocus?: boolean, getSeletcedRowIntoView: boolean = true): number {
        let filteredItems = this._filterHelper.filter(testPoints,
            [
                {
                    key: "outcome",
                    value: this._getSelectedValueInFilter(this._testPointOutcomeFilter)
                },
                {
                    key: "tester",
                    value: this._getSelectedValueInFilter(this._testerFilter)
                },
                {
                    key: "configurationName",
                    value: this._getSelectedValueInFilter(this._configurationFilter)
                }
            ]),
            selectedTestPointIds = [],
            showPaneItem: string,
            panePosition,
            restoreSelection = this._saveSelection(selectedTestPointIds);

        let visibleRow = this._testPointList.getVisibleRow();
        this._testPointList.setSource(filteredItems, this._testPointList.savedColumns, this._testPointList.sortOrder, this._testPointList.pagedColumns);

        if (restoreSelection) {
            this._restoreSelection(this._testPointList, selectedTestPointIds, suppressFocus);
        }

        //If the exiting points are getting refreshed get the selected row into view
        if (getSeletcedRowIntoView) {
            this._testPointList.getSelectedRowIntoView();
            this._testPointList._getRowIntoView(visibleRow, true);
        } else {
            // If the user is scrolling and new points are getting added dont get the selected row into view
            this._testPointList._getRowIntoView(visibleRow + 10, true);
        }

        return filteredItems ? filteredItems.length : 0;
    }

    private _getSelectedValueInFilter(filter: Navigation.PivotFilter): string {
        let selectedItem: Navigation.IPivotFilterItem = filter.getSelectedItem();
        return !selectedItem ? null : selectedItem.id;
    }

    private _saveSelection(selectedTestPointIds: number[]): boolean {
        let selectedTestPoints: TCMLite.ITestPointModel[] = this._testPointList.getSelectedTestPoints(),
            isSelectionSaved = false,
            index;

        if (selectedTestPoints && selectedTestPoints.length > 0) {
            for (index = 0; index < selectedTestPoints.length; index++) {
                if (selectedTestPoints[index] && selectedTestPoints[index] !== null) {
                    selectedTestPointIds.push(selectedTestPoints[index].testPointId);
                }
            }

            isSelectionSaved = true;
        }

        return isSelectionSaved;
    }

    private _getTestPointIdsFromTestPoints(testPointList: TCMLite.ITestPointModel[]): number[] {
        let testPointIds: number[] = [];

        for (let index = 0, length = testPointList.length; index < length; index++) {
            testPointIds.push(testPointList[index].testPointId);
        }

        return testPointIds;
    }

    private _resetTestPoints(testPointList) {

        let filteredTestPoints = this._filterOutActiveTestPoints(testPointList);
        if (filteredTestPoints.length > 0) {
            let testPointIds = this._getTestPointIdsFromTestPoints(filteredTestPoints);

            this._testPlanManager.resetTestPoints(this._currentPlan.plan.id, testPointIds, () => {
                this.refreshTestPoints(filteredTestPoints);
            },
                (error) => {
                    this.handleTestPointError(Resources.ResetTestError, error);
                });

            //Adding telemetry for creating test plan workitem. Area: TestManagement, Feature: BulkResetPointsToActive. 
            TelemetryService.publishEvents(TelemetryService.featureBulkResetPointsToActive, {
                "NumberOfPoints": testPointList.length
            });
        }
    }

    private _filterOutActiveTestPoints(testPoints: TCMLite.ITestPointModel[]) {
        let filteredTestPoints: TCMLite.ITestPointModel[] = [];

        for (let index = 0, length = testPoints.length; index < length; index++) {
            if (testPoints[index].outcome.toString() !== Resources.TestPointState_Ready) {
                filteredTestPoints.push(testPoints[index]);
            }
        }

        return filteredTestPoints;
    }

    /**
     * Remove the corresponding test cases of selected test points from the suite
     * @param testPointList
     */
    private _removeSelectedTestCases(testPointList) {
        if (this._showChildSuitesHelper.isShowChildSuitesEnabled()) {
            alert(Resources.CannotRemoveTestCases);
            return;
        }

        if (!testPointList || testPointList.length === 0) {
            // if test point list is empty then return
            return;
        }

        TMUtils.removeSelectedTestCases(TCMPointGrid.TestPointsGrid.getTestCaseIdsFromTestPoints(testPointList), this._testPlanManager, this._testSuitesTree.getSelectedSuite(),
            (suiteUpdate: TCMLite.ITestSuiteModel) => {
                if (suiteUpdate) {
                    this._testSuitesTree.updateSuitesRevisionAndPointCount([suiteUpdate]);
                }
                this.refreshTestPointsInSuite(this._testSuitesTree.getSelectedSuite().id);
            },
            (error) => {
                this._onErrorCallback(VSS.getErrorMessage(error));
            });

        //Adding telemetry for creating test plan workitem. Area: TestManagement, Feature: RemoveTestsFromSuites. NumberOfPointsSelected property has number of points deleted.
        TelemetryService.publishEvent(TelemetryService.featureRemoveTestsFromSuites, TelemetryService.numberOfPointsSelected, testPointList.length);
    }

    private _editQuery() {
        let selectedSuite = this._testSuitesTree.getSelectedSuite();
        VSS.using(["TestManagement/Scripts/TFS.TestManagement.SelectWorkItemView"], (Module: typeof SelectWorkItemView_LAZY_LOAD) => {
            Dialogs.show(Module.CreateQueryBasedSuiteDialog, {
                width: $(window).width() * 0.8,
                height: $(window).height() * 0.8,
                attachResize: true,
                okText: Resources.SaveQueryText,
                okCallback: (queryName: string, queryText: string) => {
                    this._saveQueryForSuite(selectedSuite, queryText);
                },
                title: Resources.EditQuery.toLocaleUpperCase(),
                workItemCategories: [TestsOM.WorkItemCategories.TestCase],
                hideQueryType: false,
                persistenceId: Module.PersistenceIds.CREATE_QUERY_BASED_SUITE_ID,
                supportWorkItemOpen: true,
                queryText: selectedSuite.queryText,
                areaPath: this._currentPlan.plan.areaPath
            });
        });
    }

    private _saveQueryForSuite(suite: TestsOM.ITestSuiteModel, queryText: string) {
        TMUtils.getTestPlanManager().updateQueryBasedSuite(suite, queryText, (revision: number) => {
            this._updateQueryForSuite(suite, queryText, revision);
            if (revision === TMUtils.conflictRevisionNumber) {
                this._testSuitesTree._fire("refreshSelectedSuite", { selectedSuiteId: suite.id });
                alert(Resources.SuiteRenameErrorMessage);
            }
            else {
                this.refreshTestPointsInSuite(this._testSuitesTree.getSelectedSuite().id);
            }
        },
            (e) => {
                this._onErrorCallback(VSS.getErrorMessage(e));
            });
    }

    private _updateQueryForSuite(suite: TestsOM.ITestSuiteModel, queryText: string, revision: number) {
        if (suite) {
            suite.queryText = queryText;
            suite.revision = revision;
        }
    }

    private _addTestCases() {
        if (this._showChildSuitesHelper.isShowChildSuitesEnabled()) {
           alert(Resources.CannotAddExistingTestCases);
           return;
       }
        VSS.using(["TestManagement/Scripts/TFS.TestManagement.SelectWorkItemView"], (Module: typeof SelectWorkItemView_LAZY_LOAD) => {
            Dialogs.show(Module.SelectWorkItemsDialog, {
                width: $(window).width() * 0.8,
                height: $(window).height() * 0.8,
                attachResize: true,
                okText: Resources.AddTestCases,
                okCallback: (testCaseIds: number[]) => {
                    this._addTestCasesToSelectedSuite(testCaseIds, TMUtils.TestSuiteUtils.beginAddTestCasesToSuite);

                    //Adding telemetry for creating test plan workitem. Area: TestManagement, Feature: TestCase. Property: AddExistingTestCase
                    TelemetryService.publishEvent(TelemetryService.featureAddExistingTestCases, TelemetryService.numberOfTestCases, testCaseIds.length);
                },
                title: Resources.AddTestCasesToSuite.toLocaleUpperCase(),
                workItemCategories: [TestsOM.WorkItemCategories.TestCase],
                hideQueryType: false,
                persistenceId: Module.PersistenceIds.ADD_TEST_CASES_ID,
                supportWorkItemOpen: true,
                areaPath: this._currentPlan.plan.areaPath
            });
        });
    }

    private _saveTests(dirtyTestCases: WITOM.WorkItem[]) {
        if (!this._saving) {
            if (dirtyTestCases.length > 0) {
                this._saving = true;
                WITUtils.getWorkItemStore().beginSaveWorkItemsBatch(dirtyTestCases, () => {
                    this._saving = false;
                },
                    (error) => {
                        this._saving = false;
                        this._handleBulkSaveTestCaseError(error, dirtyTestCases);
                    });
            }
        }
    }

    private _handleBulkSaveTestCaseError(error, dirtyTestCases: WITOM.WorkItem[]) {
        if (error && error.name === Exceptions.WorkItemBulkSaveException) {
            let errorHtml = TMUtils.getBulkSaveErrorMessageHtml(error, dirtyTestCases.length);
            Dialogs.MessageDialog.showMessageDialog(errorHtml, {
                title: WITResources.TriageViewSaveErrorTitle,
                buttons: [Dialogs.MessageDialog.buttons.ok]
            });
        }
        else {
            this._onErrorCallback(VSS.getErrorMessage(error));
        }
    }

    private _runTestPointsWithOptions(testPoints: TestsOM.ITestPointModel[], requirementId: number = -1, showXTRunner: boolean = false) {
        if (LicenseAndFeatureFlagUtils.isReactBasedRunWithOptionsEnabled()) {
            VSS.using(["TestManagement/Scripts/TestHubLite/TFS.TestManagement.RunWithOptionsHelper"], (
                RunWithOptionsHelperModule: typeof RunWithOptionsHelper_LAZY_LOAD
            ) => {
                if (!this._runWithOptionsHelper) {
                    this._runWithOptionsHelper = new RunWithOptionsHelperModule.RunWithOptionsHelper();
                }
                this._runWithOptionsHelper.openRunWithOptionsDialog({
                    requirementId: requirementId,
                    showXTRunner: showXTRunner,
                    testPoints: testPoints,
                    oldmtrCallBack: delegate(this, this._launchOldMtrWithOptions),
                    newmtrCallBack: delegate(this, this._launchNewMtrWithOptions),
                    dtrCallBack: delegate(this, this._launchDtrWithOptions),
                    webRunnerCallBack: delegate(this, this._launchWebRunnerWithOptions),
                    xtRunnerCallBack: delegate(this, this._launchXTRunnerWithOptions),
                    automatedTestRunnerCallBack: delegate(this, this._launchAutomatedTestRunnerWithOptions)
                });
            });
        } else {
            VSS.using(["TestManagement/Scripts/TFS.TestManagement.RunTestsWithOptions"], (
                RunWithOptionsModule: typeof RunWithOptions_LAZY_LOAD
            ) => {
                Dialogs.show(RunWithOptionsModule.RunWithOptionsDialog, {
                    requirementId: requirementId,
                    showXTRunner: showXTRunner,
                    testPoints: testPoints,
                    oldmtrCallBack: delegate(this, this._launchOldMtrWithOptions),
                    newmtrCallBack: delegate(this, this._launchNewMtrWithOptions),
                    dtrCallBack: delegate(this, this._launchDtrWithOptions),
                    webRunnerCallBack: delegate(this, this._launchWebRunnerWithOptions),
                    xtRunnerCallBack: delegate(this, this._launchXTRunnerWithOptions),
                    automatedTestRunnerCallBack: delegate(this, this._launchAutomatedTestRunnerWithOptions),
                    minWidth: 533,
                    minHeight: 542
                });
            });
        }
    }

    /**
     * Same as the one present in TestSuite.Toolbar.ts
     * @param testPoints 
     * @param requirementId 
     * @param showXTRunner 
     */
    private _runTestPointsWithDTR(testPoints: TestsOM.ITestPointModel[], requirementId: number = -1, showXTRunner: boolean = false) {
        // Launch the DTR Dialog
        VSS.using(["TestManagement/Scripts/TestHubLite/TFS.TestManagement.RunWithDTRHelper"], (
            RunWithDTRHelperModule: typeof RunWithDTRHelper_LAZY_LOAD
        ) => {
            if (!this._runWithDTRHelper) {
                this._runWithDTRHelper = new RunWithDTRHelperModule.RunWithDTRHelper();
            }
            this._runWithDTRHelper.runWithDTR({
                requirementId: requirementId,
                showXTRunner: showXTRunner,
                dtrCallBack: delegate(this, () => {this._launchDTR(testPoints)})
            });
        });
    }

    private _launchAutomatedTestRunnerWithOptions(dialogViewModel: RunWithOptions_LAZY_LOAD.RunWithOptionsDialogViewModel) {
        TCMTestRunHelper.TestRunHelper.startValidationAndRunAutomatedTestPoints(
            dialogViewModel.testPoints,
            dialogViewModel.getSelectedBuild(),
            dialogViewModel.getSelectedReleaseDefinition(),
            dialogViewModel.getSelectedReleaseEnvironment().id,
            this._currentPlan.plan,
            () => {
                this.refreshTestPoints(dialogViewModel.testPoints);
            });

        TelemetryService.publishEvents(TelemetryService.featureAutomatedRunTriggeredFromRunWithOptions, {});
    }
     
    private _launchXTRunnerWithOptions(dialogViewModel: any) {
        let requirementId = dialogViewModel.getRequirementId();
        let selectedDataCollectors = dialogViewModel.getEnabledDataCollectors();
        TCMTestRunHelper.TestRunHelper.runXT(this._testSuitesTree.getSelectedSuite(), requirementId, selectedDataCollectors, this._currentPlan.plan, this._onErrorCallback);
    }

    private _launchWebRunnerWithOptions(dialogViewModel: any) {
        let selectedBuild = dialogViewModel.getBuildUri();
        let selectedPoints: TCMLite.ITestPointModel[] = dialogViewModel.testPoints;
        this._runTestPointsUsingWebRunner(selectedPoints, selectedBuild);
    }

    private _launchOldMtrWithOptions(dialogViewModel: any) {
        let selectedPoints: TCMLite.ITestPointModel[] = dialogViewModel.testPoints;
        this._runTestPointsUsingClient(selectedPoints);
    }

    private _launchNewMtrWithOptions(dialogViewModel: any) {
        this._getRunDataAndLaunchNewClient(dialogViewModel, false);
    }

    private _launchDtrWithOptions(dialogViewModel: any) {
        this._getRunDataAndLaunchNewClient(dialogViewModel, true);
    }

    private _launchDTR(testPoints: TestsOM.ITestPointModel[]) {
        // The selection of Build and data collectors should come from test settings. Have to confirm this behavior.
        let selectedBuild: string = "";
        let selectedPoints: TCMLite.ITestPointModel[] = testPoints;
        let selectedDataCollectors: string[] = [];
        this._runTestPointsUsingNewClient(selectedPoints, selectedBuild, selectedDataCollectors, true);
    }

    private _getRunDataAndLaunchNewClient(dialogViewModel: any, isDtr: boolean) {
        let selectedBuild: string = dialogViewModel.getBuildUri();
        let selectedPoints: TCMLite.ITestPointModel[] = dialogViewModel.testPoints;
        let selectedDataCollectors = dialogViewModel.getEnabledDataCollectors();
        this._runTestPointsUsingNewClient(selectedPoints, selectedBuild, selectedDataCollectors, isDtr);
    }

    private _createOrderTestCasesControl() {
        VSS.using(["TestManagement/Scripts/OrderTests/TFS.TestManagement.OrderTests.Control"], (
            OrderTestsModule: typeof OrderTestsControl_LAZY_LOAD

        ) => {
            let testViewPane = this._element.find(TCMLite.Constants.testviewRightPane);
            if (testViewPane) {
                this._setVisibility(TCMLite.GridAreaSelectors.viewGrid, false);
                this._hideTestViewFilters();

                this._filterBarProvider.clearAndHideFilterBar();
                this._updateToolbarCommandStatesAfterOrderTests();
                let suiteId: number = this._testSuitesTree.getSelectedSuite().id;

                // Dispose the ordertests control if present
                if (this._orderTestsControl) {
                    this.disposeOrderTestCasesControl();
                }

                this._orderTestsControl = new OrderTestsModule.OrderTestsControl({
                    container: testViewPane,
                    suiteId: suiteId,
                    orderTestControlDispose: delegate(this, this._onOrderTestControlDispose),
                    onError: delegate(this, this._onErrorCallback)
                });

                // Get the additional WIT columns which got added in the test points grid, if call get
                // fail somehow then initialize the ordertests control with empty fields
                this._getAdditionalWitColumnsForOrderTests().then((fields) => {
                    this._orderTestsControl._initialize(fields);
                },
                    (error) => {
                        this._orderTestsControl._initialize();
                    })
                    .then(() => {
                        this._orderTestsControl.render().then(() => {
                            this._testKeyboardShortcutHelper.disableListViewShortcuts();
                        },
                            (error) => {
                                this._onErrorCallback(VSS.getErrorMessage(error));
                            });
                    });
            }
        });
    }

    private _hideTestViewFilters() {
        this._hideViewGridFilters();
        this._viewFilter.hideElement();
    }

    private _hideViewGridFilters() {
        this._testPointOutcomeFilter.hideElement();
        this._testerFilter.hideElement();
        this._configurationFilter.hideElement();
        this._testPaneHelper.saveAndClearPaneFilter();
    }

    private _showViewGridFilters() {
        this._testPointOutcomeFilter.showElement();
        this._testerFilter.showElement();
        this._configurationFilter.showElement();
        this._testPaneHelper.showPaneFilterFromSavedState();
    }

    private _showTestViewFilters() {
        this._showViewGridFilters();
        if (LicenseAndFeatureFlagUtils.AreAdvancedTestManagementFeaturesEnabled()) {
            this._viewFilter.showElement();
        }
    }

    private _getAdditionalWitColumnsForOrderTests(): IPromise<WITOM.FieldDefinition[]> {
        let deferred: Q.Deferred<WITOM.FieldDefinition[]> = q.defer<WITOM.FieldDefinition[]>();
        WorkItemColumnHelper.WorkItemColumnHelper.beginGetAdditionalWorkItemFields(this._testPointList.savedColumns, (additionalFields) => {
            return deferred.resolve(additionalFields);
        }, (error) => {
            deferred.reject(null);
        });

        return deferred.promise;
    }

    private _updateToolbarCommandStatesAfterOrderTests() {
        let self = this;
        if (self._testPointsToolbar) {
            let menuBar = self._testPointsToolbar.getElement();
            if (menuBar) {
                let menuItems = menuBar.children();
                menuItems.each(function (index, item) {
                    if (!$(item).hasClass("invisible")) {
                        self._testPointsToolbar.updateCommandStates([{ id: $(item).attr("command"), disabled: true }]);
                    }
                });
            }
        }

        this._testSuitesToolbar.updateCommandStates([{ id: TCMLite.TestPlanAndSuitesCommandIds.showTestsFromChildSuites, disabled: true }]);
    }

    public disposeOrderTestCasesControl(skipFilterStateUpdate?: boolean) {
        if (this._orderTestsControl) {
            this._orderTestsControl.dispose();
            this._orderTestsControl = null;
        }

        if (skipFilterStateUpdate) {
            return;
        }

        this._showTestViewFilters();
        this._testSuitesToolbar.updateCommandStates([{ id: TCMLite.TestPlanAndSuitesCommandIds.showTestsFromChildSuites, disabled: false }]);
        this._filterBarProvider.updateFilterMenuItem();
    }

    /**
     * Updates filter command state.
     */
    public updateFilterMenuItem() {
        this._filterBarProvider.updateFilterMenuItem();
    }

    private _onOrderTestControlDispose(refreshGrid: boolean) {
        let suiteId: number = this._testSuitesTree.getSelectedSuite().id;
        this.disposeOrderTestCasesControl();

        this._setVisibility(TCMLite.GridAreaSelectors.viewGrid, true);

        if (refreshGrid) {
            this._onSortOrderChanged(this._testPointList, { index: "sequenceNumber", order: "asc" }, true);
        }
        else {
            //we have to reinitialize the source as the grid was showing only 3 rows as the canvas of grid was coming zero.
            let visibleRange = this._testPointList._getVisibleRowIndices();
            this._testPointList.initializeDataSource();
            this._testPointList._getRowIntoView(visibleRange.last);
        }
        this._testKeyboardShortcutHelper.reRegisterShortcutGroup(TCMLite.KeyboardShortcutGroups.listGroupName);
    }

    private _setVisibility(selector: string, visible: boolean) {
        let $control = this._element.find(selector);
        if (visible) {
            $control.show();
        }
        else {
            $control.hide();
        }
    }

    private _onSortOrderChanged(sender: TCMPointGrid.TestPointsGrid, sortOrder: TestsOM.IColumnSortOrderModel, forceRefresh: boolean) {
        let testPoint: TestsOM.ITestPointModel;
        let that = this;
        let oldSortOrder = this._testPointList.sortOrder;

        // Return if sort order is not changed.
        if (!this._isSortOrderChanged(sortOrder, oldSortOrder) && !forceRefresh) {
            return;
        }

        this._testPointList.clearGrid();

        //delay the call
        new TMUtils.DelayedExecutionHelper().executeAfterLoadComplete(this, () => {
            TMUtils.getTestPlanManager().updateColumnSortOrder({ index: sortOrder.index, order: sortOrder.order }, () => {
                this.refreshTestPointsInSuite(this._testSuitesTree.getSelectedSuite().id, () => {
                    this._testPointList.setSelectedRowIndex(0);
                    this._testPointList.getSelectedRowIntoView();
                });
            });
        });
        this._testPointList.sortOrder = sortOrder;
        testPoint = this._testPointList.getSelectedTestPoint();
        this._testPaneHelper.showWorkItemBasedOnSelection(testPoint ? testPoint.testCaseId : 0);
    }

    private _isSortOrderChanged(sortOrder: TestsOM.IColumnSortOrderModel, oldSortOrder: TestsOM.IColumnSortOrderModel): boolean {
        if (oldSortOrder.index === sortOrder.index && oldSortOrder.order === sortOrder.order) {
            return false;
        } else {
            return true;
        }
    }

    /**
     * Initialize filters
     */
    private _initializeFilters() {
        this._testPointOutcomeFilter = this._getFilter(TCMLite.FilterSelectors.outcome);
        this._testerFilter = this._getFilter(TCMLite.FilterSelectors.tester);
        this._configurationFilter = this._getFilter(TCMLite.FilterSelectors.configuration);
        this._viewFilter = this._getFilter(TCMLite.FilterSelectors.view);
        this._paneFilter = this._getFilter(TCMLite.FilterSelectors.pane);
        this._filterHelper = new TCMFilterHelper.FilterHelper(this._testPlanManager, this._testerFilter, this._testPointOutcomeFilter, this._configurationFilter);
        this._filterBarProvider = new FilterBarProvider(this._element, this._testPointList, this._testPointsToolbar, TfsContext.getDefault().navigation.project);
    }

    private _getFilter(selector: string): Navigation.PivotFilter {
        let filter = <Navigation.PivotFilter>Controls.Enhancement.getInstance(Navigation.PivotFilter, this._element.find(selector));
        return filter;
    }

    private handleTestPointError(message: string, error) {
        this._onErrorCallback(Utils_String.format("{0} {1}", message, VSS.getErrorMessage(error)));
    }
}