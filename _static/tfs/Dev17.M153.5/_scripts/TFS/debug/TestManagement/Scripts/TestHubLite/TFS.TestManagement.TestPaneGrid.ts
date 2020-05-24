import Resources = require("TestManagement/Scripts/Resources/TFS.Resources.TestManagement");
import TestsOM = require("TestManagement/Scripts/TFS.TestManagement");
import TCMPointGrid = require("TestManagement/Scripts/TFS.TestManagement.TestPointsGrid");
import TMUtils = require("TestManagement/Scripts/TFS.TestManagement.Utils");
import TCMLite = require("TestManagement/Scripts/TFS.TestManagement.Lite");
import TCMMenuItems = require("TestManagement/Scripts/TFS.TestManagement.MenuItem");
import TCMTelemetry = require("TestManagement/Scripts/TFS.TestManagement.Telemetry");
import TCMLicenseAndFeatureFlagUtils = require("TestManagement/Scripts/Utils/TFS.TestManagement.LicenseAndFeatureFlagUtils");

import TFS_UI_Controls_Identities = require("Presentation/Scripts/TFS/TFS.UI.Controls.Identities");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import TFS_OM_Common = require("Presentation/Scripts/TFS/TFS.OM.Common");
import TFS_WebSettingsService = require("Presentation/Scripts/TFS/TFS.WebSettingsService");

import WITOM = require("WorkItemTracking/Scripts/TFS.WorkItemTracking");
import WITForm = require("WorkItemTracking/Scripts/Controls/WorkItemForm");
import { WitFormModeUtility } from "WorkItemTracking/Scripts/Utils/WitControlMode";
import { WorkItemManager } from "WorkItemTracking/Scripts/OM/WorkItemManager";

import Controls = require("VSS/Controls");
import Splitter = require("VSS/Controls/Splitter");
import Diag = require("VSS/Diag");
import Navigation = require("VSS/Controls/Navigation");
import Menus = require("VSS/Controls/Menus");
import Grids = require("VSS/Controls/Grids");
import { RichContentTooltip } from "VSS/Controls/PopupContent";
import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");
import Utils_UI = require("VSS/Utils/UI");
import VSS = require("VSS/VSS");

let domElem = Utils_UI.domElem;
let delegate = Utils_Core.delegate;
let TelemetryService = TCMTelemetry.TelemetryService;
let LicenseAndFeatureFlagUtils = TCMLicenseAndFeatureFlagUtils.LicenseAndFeatureFlagUtils;
let WITUtils = TMUtils.WorkItemUtils;

export class TestDetailsPaneHelper {

    private static _instance;

    public constructor(paneFilter: Navigation.PivotFilter, positionFilter: Navigation.PivotFilter,
        testPointsList: TCMPointGrid.TestPointsGrid, element: any, options: any, toolbar: Menus.MenuBar) {
        if (!TestDetailsPaneHelper._instance) {
            this._paneFilter = paneFilter;
            this._testPointList = testPointsList;
            this._splitter = <Splitter.Splitter>Controls.Enhancement.getInstance(Splitter.Splitter, $(TCMLite.Constants.testManagementSplitter));
            this._positionFilter = positionFilter;
            this._element = element;
            this._options = options;
            this._webSettingsService = TFS_OM_Common.Application.getConnection(this._options.tfsContext).getService<TFS_WebSettingsService.WebSettingsService>(TFS_WebSettingsService.WebSettingsService);
            this._pointsToolbar = toolbar;
            TestDetailsPaneHelper._instance = this;
        }
        return TestDetailsPaneHelper._instance;
    }

    /**
     * Creates test case pane toolbar and container.
     * Initializes the required delegates.
     */
    public createSuiteReferencePane() {
        this._viewPaneForm = this._splitter.rightPane.find(TCMLite.Constants.testManagementTestCasePane);
        this._viewPaneForm.hide();
        this._createSuiteReferencePaneToolbar();
        let viewPaneForm = this._viewPaneForm.find(TCMLite.TestCasePaneConstants.paneViewExplorer).find(TCMLite.TestCasePaneConstants.paneListContainer);
        this._viewPaneList = <TestDetailsPaneGrid>Controls.Enhancement.enhance(TestDetailsPaneGrid, viewPaneForm, { tfscontext: this._options.tfsContext });
        this._savedTestPointPaneColumns = this._viewPaneList.getTestPointColumns();

        this._initializeTestPaneCompleted = true;

        this._viewPaneList.getSelectedTestCaseDelegate = () => {
            let testCaseIds = this._getSelectedTestCaseIds();
            if (testCaseIds && testCaseIds.length > 0) {
                return testCaseIds[0];
            }
            return 0;
        };

        this._viewPaneList.getSelectedPaneModeDelegate = () => {
            return this._paneFilter.getSelectedItem().value;
        };

        this._viewPaneList.updatePaneToolbarTooltipsDelegate = () => {
            if (this._$testDetailsPaneOpenMenuItem && this._$testDetailsPaneOpenMenuItem.attr("command") === TCMLite.TestDetailsPaneToolbarItemIds.openTestDetailInNewTab) {
                if (this._paneFilter.getSelectedItem().value === TCMLite.TestPaneGridValues.paneMode_results) {
                    Diag.logTracePoint("TestHubView._createSuiteReferencePane.updatePaneToolbarTooltipsDelegate for Results pane");
                    this._$testDetailsPaneOpenMenuItem.attr("aria-label", Resources.Open);
                    if (this._testDetailsPaneOpenMenuItemTooltip) {
                        this._testDetailsPaneOpenMenuItemTooltip.setTextContent(Resources.Open);
                    } else {
                        this._testDetailsPaneOpenMenuItemTooltip = RichContentTooltip.add(Resources.Open, this._$testDetailsPaneOpenMenuItem);
                    }
                }
                else if (this._paneFilter.getSelectedItem().value === TCMLite.TestPaneGridValues.paneMode_suites) {
                    Diag.logTracePoint("TestHubView._createSuiteReferencePane.updatePaneToolbarTooltipsDelegate for Suites pane");
                    this._$testDetailsPaneOpenMenuItem.attr("aria-label", Resources.OpenInNewTab);
                    if (this._testDetailsPaneOpenMenuItemTooltip) {
                        this._testDetailsPaneOpenMenuItemTooltip.setTextContent(Resources.OpenInNewTab);
                    } else {
                        this._testDetailsPaneOpenMenuItemTooltip = RichContentTooltip.add(Resources.OpenInNewTab, this._$testDetailsPaneOpenMenuItem);
                    }
                }
            }
        };

        this._viewPaneList.updateOpenTestDetailCommandState = (disabled: boolean) => {
            this._updateFarRightPaneOpenTestDetailCommandState(disabled);
        };
        this._viewPaneList.updateRefreshTestDetailCommandState = (disabled: boolean) => {
            this._updateFarRightPaneRefreshTestDetailCommandState(disabled);
        };
    }

    /**
     * Saves the pane and position filter.
     * Hides the test case pane.
     */
    public saveAndClearPaneFilter() {
        this._paneFilter.hideElement();
        this._positionFilter.hideElement();
        this._savedPaneFilterItem = this._paneFilter.getSelectedItem().value;
        this._savedPanePosition = this._workItemPaneMode;
        this.showWorkItemPane("off", this._savedPaneFilterItem);
    }

    /**
     * Shows the test case pane with the previous pane and position values.
     */
    public showPaneFilterFromSavedState() {
        this._paneFilter.showElement();
        this._positionFilter.showElement();
        if (this._savedPanePosition && this._savedPaneFilterItem) {
            this._consumerWorkitemForm(() => { this.showWorkItemPane(this._savedPanePosition, this._savedPaneFilterItem); });
        }
        this._updateTestCasePanePointsToolbar();
    }

    /**
     * Toggles the test case detail pane state.
     */
    public toggleTestCaseDetailsPane() {
        if (!this._$farRightPaneHubPivot || this._$farRightPaneHubPivot.length < 1) {
            this._$farRightPaneHubPivot = this._element.find(".far-right-pane-pivot");
        }
        if (this._isTestCaseDetailsPaneOn()) {
            // Toggle the pane to off position
            this.showWorkItemPane("off", this._paneFilter.getSelectedItem().value);
            this._savedPanePosition = this._workItemPaneMode;
        }
        else {
            // Toggle the pane to "on" and position should be the one previously selected by the user
            if (this._previousPaneOnPosition) {
                this.showWorkItemPane(this._previousPaneOnPosition, this._paneFilter.getSelectedItem().value);
            }
            else {
                this._webSettingsService.beginReadSetting("/PreviousPaneOnPosition", TFS_WebSettingsService.WebSettingsScope.User, (prevPanePosition) => {
                    if (prevPanePosition && prevPanePosition.value) {
                        this._previousPaneOnPosition = prevPanePosition.value;
                    }
                    else {
                        this._previousPaneOnPosition = "right";
                    }
                    this.showWorkItemPane(this._previousPaneOnPosition, this._paneFilter.getSelectedItem().value);
                });
            }
        }
    }

    /**
     * Show the test case pane based on the test case selected.
     * @param id: the test case ID selected
     */
    public showWorkItemBasedOnSelection(id?: number) {
        // Show work item only if there is only one selected item.
        if (!this._workItemPaneMode || this._workItemPaneMode === "off") {
            return;
        }
        let selectionCount = this._testPointList.getSelectionCount();
        let paneFilter = this._paneFilter.getSelectedItem().value;
        id = (selectionCount >= 1) ? id : 0;
        if (paneFilter === TCMLite.TestPaneGridValues.paneMode_suites || paneFilter === TCMLite.TestPaneGridValues.paneMode_results) {
            // test Suites or test result is selected in paneFilter
            id = (selectionCount > 1) ? 0 : id;
            this._showAssociatedNodes(id, paneFilter, true);
        }
        else {
            // test case is selected in paneFilter
            if (selectionCount === 0) {
                this._showWorkItem(0, true);
            }
            else {
                this._showWorkItem(id);
            }
        }

        this._updateTestCasePanePointsToolbar();
    }

    /**
     * Show the test case pane in the given position for given pane filter.
     */
    public showWorkItemPane(position: string, pane: string) {
        let item;
        let previousPaneMode = this._workItemPaneMode;

        if (!this._initializeTestPaneCompleted) {
            return;
        }

        this._saveCurrentPanePosition(position);

        if (position !== "off" && position !== this._positionFilter.getSelectedItem().value) {
            item = this._positionFilter.getItem(position);
            this._positionFilter.setSelectedItem(item);
        }

        if (!this._$farRightPaneHubPivot || this._$farRightPaneHubPivot.length < 1) {
            this._$farRightPaneHubPivot = this._element.find(".far-right-pane-pivot");
        }

        //Show the pane as per desired
        this._showPane(previousPaneMode, position, pane);
        //Save the current user settings if needed
        this._saveUserSettingsForPane(previousPaneMode, position, pane);
        this._updateTestCasePanePointsToolbar();
    }


    public isTestCaseInPaneEdited(): boolean {
        let workItem: WITOM.WorkItem;
        if (this._workItemPaneMode !== "off") {
            workItem = WorkItemManager.get(WITUtils.getWorkItemStore()).getWorkItem(this.currentWorkItemId);
            return workItem && workItem.isDirty();
        }
        return false;
    }

    /**
     * Creates a work item form instance.
     */
    public _consumerWorkitemForm(callback: any) {
        if (this._workItemForm) {
            if (callback) {
                callback();
            }
        } else {
            let store = WITUtils.getWorkItemStore();
            WitFormModeUtility.ensureWitFormModeLoaded().then(() => {
                let $workItemForm: JQuery = this._splitter.rightPane.find(TCMLite.Constants.testManagementWorkItemForm);
                this._workItemForm = <WITForm.WorkItemForm>Controls.Enhancement.enhance(WITForm.WorkItemForm, $workItemForm, {
                    tfsContext: this._options.tfsContext,
                    toolbar: {
                        inline: true
                    },
                    close: function () {
                        return false;
                    }
                });

                if (callback) {
                    callback();
                }
            });
        }
    }

    private _updateTestCasePanePointsToolbar() {
        this._pointsToolbar.updateCommandStates([
            {
                id: "toggle-testcase-details-pane",
                toggled: this._isTestCaseDetailsPaneOn()
            }
        ]);
    }


    private _isTestCaseDetailsPaneOn(): boolean {
        if (this._workItemPaneMode && this._workItemPaneMode !== "off") {
            return true;
        }
        return false;
    }

    private _saveCurrentPanePosition(position: string) {
        if (this._workItemPaneMode !== position) {
            this._workItemPaneMode = position;
        }
        if (position !== "off") {
            //used when moving from grid view to other suite or other plan 
            this._savedPanePosition = this._workItemPaneMode;
        }
    }

    private _showPane(previousPaneMode: string, position: string, pane: string) {
        let selectedTestCaseId;
        if (position === "off") {
            this._$farRightPaneHubPivot.css("display", "none");
            this._splitter.noSplit();
            if (this._workItemForm) {
                this._workItemForm.unbind();
                this._workItemForm.hideElement();
            }
            this._viewPaneForm.unbind();
            this._viewPaneForm.hide();

            this._setShowDetailsPaneMenuItemExpanded("false");
        }
        else {
            if (position === "right") {
                this._splitter.horizontal();
                this._splitter.split();
            }
            else {
                //bottom
                this._splitter.vertical();
                this._splitter.split();
            }

            //If there is any change in filter or the filter was off previously than only read data from server
            if (this._savedPaneFilterItem !== pane || previousPaneMode === "off") {
                selectedTestCaseId = this._getSelectedTestCaseId();
                if (pane === TCMLite.TestPaneGridValues.paneMode_suites || pane === TCMLite.TestPaneGridValues.paneMode_results) {
                    selectedTestCaseId = (this._testPointList.getSelectionCount() <= 1) ? selectedTestCaseId : 0;
                    this._showAssociatedNodes(selectedTestCaseId, pane);
                }
                else {
                    //Test Case workitem pane
                    this._showWorkItem(selectedTestCaseId, true);
                }
            }
            this._$farRightPaneHubPivot.css("display", "block");

            this._setShowDetailsPaneMenuItemExpanded("true");
        }
    }

    private _setShowDetailsPaneMenuItemExpanded(isExpanded: string){
        let menuItem = this._element.find(".toggle-showDetails-bar");

        if (menuItem){
            menuItem.attr("aria-expanded", isExpanded);
        }
    }

    private _saveUserSettingsForPane(previousPaneMode: string, position: string, pane: string) {
        if (previousPaneMode && previousPaneMode !== position) {
            //Save Pane position if it got changed
            this._savePaneSetting("/PanePosition", position);
            if (position === "off" && previousPaneMode) {
                // If the new position is off, store the last on position - bottom or right
                this._previousPaneOnPosition = previousPaneMode;
                this._savePaneSetting("/PreviousPaneOnPosition", previousPaneMode);
            }
        }
        //if the pane mode changed than only save
        if (this._savedPaneFilterItem !== pane) {
            this._savePaneSetting("/PaneMode", pane);
            this._savedPaneFilterItem = pane;
        }
    }

    private _showAssociatedNodes(testCaseId: number, paneFilter: string, forceRefresh?: boolean) {
        (<any>this._viewPaneForm).bind(); // todo: bind with no args?
        this._viewPaneForm.show();
        if (this._workItemForm) {
            this._workItemForm.hideElement();
        }
        if (this._workItemPaneMode && this._workItemPaneMode !== "off") {
            this._setListHeaderText(paneFilter);
            this._viewPaneList.refreshList(testCaseId, paneFilter, this._workItemPaneMode, forceRefresh);
        }
    }

    private _setListHeaderText(paneFilter ?: string) {
        if (paneFilter === TCMLite.TestPaneGridValues.paneMode_suites) {
            this._splitter.rightPane.find(TestDetailsPaneGrid.farRightPaneTitle).text(Resources.ReferencedTestSuitesPaneStatusTitle);
        }
        else if (paneFilter === TCMLite.TestPaneGridValues.paneMode_results) {
            this._splitter.rightPane.find(TestDetailsPaneGrid.farRightPaneTitle).text(Resources.TestResultsPaneTitle);
        }
        else {
            this._splitter.rightPane.find(TestDetailsPaneGrid.farRightPaneTitle).text('');
        }
    }

    private _showWorkItem(id, forceShow?: boolean) {
        /// <param name="forceShow" type="boolean" optional="true" />
        this._viewPaneForm.hide();
        this._setListHeaderText();
        let that = this;
        function start(id) {
            that._workItemForm.beginShowWorkItem(id, function () {
                that.currentWorkItemId = id;
            }, () => { }, { forceShow : true});
        }

        if ((this.currentWorkItemId !== id || forceShow) && id >= 0) {
            this.currentWorkItemId = id;
            if (this._workItemPaneMode && this._workItemPaneMode !== "off") {
                if (id !== 0) {
                    this._workItemForm.showElement();
                    start(id);
                }
                else {
                    if (this._workItemForm) {
                        this._workItemForm.unbind();
                        this._workItemForm.hideElement();
                    }
                }
            }
        }
    }

    private _savePaneSetting(option: string, value: string) {
        //Save required option
        new TMUtils.DelayedExecutionHelper().executeAfterLoadComplete(this, () => {
            this._webSettingsService.beginWriteSetting(option, value);
        });
    }

    private _updateFarRightPaneOpenTestDetailCommandState(disabled: boolean = false) {
        this._farRightPaneToolbar.updateCommandStates(
            [
                {
                    id: TCMLite.TestDetailsPaneToolbarItemIds.openTestDetailInNewTab,
                    disabled: disabled
                }
            ]);
    }

    private _updateFarRightPaneRefreshTestDetailCommandState(disabled: boolean = false) {
        this._farRightPaneToolbar.updateCommandStates(
            [
                {
                    id: TCMLite.TestDetailsPaneToolbarItemIds.refreshTestDetailsPane,
                    disabled: disabled
                }
            ]);
    }

    private _createSuiteReferencePaneToolbar() {
        let toolbarElement: JQuery = this._viewPaneForm.find(".far-right-pane-view-explorer").find(".far-right-pane-toolbar"),
            menuItems;

        this._farRightPaneToolbar = <Menus.MenuBar>Controls.BaseControl.createIn(Menus.MenuBar, toolbarElement, {
            items: TCMMenuItems.MenuItems.createFarRightPaneMenubarItems(),
            executeAction: delegate(this, this._onFarRightPaneToolbarItemClick)
        });

        menuItems = toolbarElement.find(".menu-bar li");
        if (menuItems.length > 1) {
            this._$testDetailsPaneOpenMenuItem = $(menuItems[1]);
        }
    }

    private _onFarRightPaneToolbarItemClick(e?: any) {
        let command = e.get_commandName();
        if (command === TCMLite.TestDetailsPaneToolbarItemIds.refreshTestDetailsPane) {
            this._setListHeaderText(this._paneFilter.getSelectedItem().value);        
            this._viewPaneList.refreshList(this._getSelectedTestCaseId(), this._paneFilter.getSelectedItem().value, this._workItemPaneMode, true);
            TelemetryService.publishEvents(TelemetryService.featureDetailsPaneRefresh, { "PaneFilter": this._paneFilter.getSelectedItem().value });
        }
        else if (command === TCMLite.TestDetailsPaneToolbarItemIds.openTestDetailInNewTab) {
            this._viewPaneList.onOpenRowDetail();
            TelemetryService.publishEvents(TelemetryService.featureDetailsPaneOpenInNewTab, { "PaneFilter": this._paneFilter.getSelectedItem().value });
        }
    }

    private _getSelectedTestCaseId() {
        let selectedTestPoint = this._testPointList.getSelectedTestPoint(),
            selectedTestCaseId = selectedTestPoint ? selectedTestPoint.testCaseId : 0;

        return selectedTestCaseId;
    }

    private _getSelectedTestCaseIds(): number[] {
        let testPoints: TestsOM.ITestPointModel[] = this._testPointList.getSelectedTestPoints();
        return TCMPointGrid.TestPointsGrid.getTestCaseIdsFromTestPoints(testPoints);
    }

    private _savedPanePosition: string;
    private _viewPaneList: TestDetailsPaneGrid;
    private _viewPaneForm: JQuery;
    private _paneFilter: Navigation.PivotFilter;
    private _positionFilter: Navigation.PivotFilter;
    private _$testDetailsPaneOpenMenuItem: JQuery;
    private _testDetailsPaneOpenMenuItemTooltip: RichContentTooltip;
    private _farRightPaneToolbar: Menus.MenuBar;
    private _workItemPaneMode: string;
    private _testPointList: TCMPointGrid.TestPointsGrid;
    private _splitter: Splitter.Splitter;
    private _savedTestPointPaneColumns: TestsOM.LatestTestOutcomeColumnIds[] = [];
    private _webSettingsService: TFS_WebSettingsService.WebSettingsService;
    private _$farRightPaneHubPivot: JQuery;
    private _element: any;
    private _options: any;
    private _savedPaneFilterItem: string;
    private _previousPaneOnPosition: string;
    private _workItemForm: WITForm.WorkItemForm;
    private _pointsToolbar: Menus.MenuBar;
    private _initializeTestPaneCompleted: boolean = false;
    public currentWorkItemId: number;
}

export class TestDetailsPaneGrid extends Grids.GridO<any> {

    public static enhancementTypeName: string = "tfs.testmanager.TestDetailsPaneGrid";

    private static _testSuiteTitleColumn = {
        index: TestsOM.SuitesPaneColumnIds.SuiteTitle,
        text: Resources.TestPointGridColumnTitle,
        width: 180
    };

    private static _testSuitePlanColumn = {
        index: TestsOM.SuitesPaneColumnIds.TestPlan,
        text: Resources.CreateTestPlanMenuItem,
        width: 80
    };

    private static _testSuiteProjectColumn = {
        index: TestsOM.SuitesPaneColumnIds.TeamProject,
        text: Resources.TestSuitePaneProjectColumnHeader,
        width: 90
    };

    private static _testSuiteStatusColumn = {
        index: TestsOM.SuitesPaneColumnIds.SuiteStatus,
        text: Resources.TestSuitePaneStatusColumnHeader,
        width: 80
    };

    private static _testResultConfigurationColumn = {
        index: TestsOM.ResultsPaneColumnIds.Configuration,
        text: Resources.TestPointGridColumnConfiguration,
        width: 90
    };

    private static _testResultOutcomeColumn = {
        index: TestsOM.ResultsPaneColumnIds.Outcome,
        text: Resources.TestPointGridColumnOutcome,
        width: 80
    };

    private static _testResultRunByColumn = {
        index: TestsOM.ResultsPaneColumnIds.RunBy,
        text: Resources.TestResultsPaneRunByColumnHeader,
        width: 80
    };

    private static _testResultPlanIdColumn = {
        index: TestsOM.ResultsPaneColumnIds.PlanId,
        text: Resources.PlanIdColumnHeader,
        type: "System.Int32",
        width: 70
    };

    private static _testResultPlanNameColumn = {
        index: TestsOM.ResultsPaneColumnIds.PlanName,
        text: Resources.PlanNameColumnHeader,
        width: 90
    };

    private static _testResultSuiteIdColumn = {
        index: TestsOM.ResultsPaneColumnIds.SuiteId,
        text: Resources.TestPointGridColumnSuiteId,
        type: "System.Int32",
        width: 70
    };

    private static _testResultSuiteNameColumn = {
        index: TestsOM.ResultsPaneColumnIds.SuiteName,
        text: Resources.TestPointGridColumnSuiteName,
        width: 90
    };

    private static _testResultDurationColumn = {
        index: TestsOM.ResultsPaneColumnIds.Duration,
        text: Resources.TestResultsPaneDurationColumnHeader,
        tooltip: Resources.TestResultsPaneDurationColumnHeaderTooltip,
        type: "System.Int32",
        width: 80
    };

    private static _testResultDateColumn = {
        index: TestsOM.ResultsPaneColumnIds.ResultDate,
        text: Resources.TestResultsPaneDateColumnHeader,
        type: "System.DateTime",
        width: 140
    };

    public static farRightPaneTitle: string = ".far-right-pane-title";

    private _testPlanManager: TestsOM.TestPlanManager;
    public _tfscontext: TFS_Host_TfsContext.TfsContext;
    private _testResultManager: TestsOM.TestResultManager;
    private _pane: string;
    public getSelectedTestCaseDelegate: () => number;
    public getSelectedPaneModeDelegate: () => string;
    public updatePaneToolbarTooltipsDelegate: () => void;
    public updateOpenTestDetailCommandState: (disabled: boolean) => void;
    public updateRefreshTestDetailCommandState: (disabled: boolean) => void;
    private _$errorDiv: any;
    private _lastTestCaseId: number;
    private _lastPaneMode: string;
    private _lastPanePosition: string;
    private _testPointColumns: TestsOM.LatestTestOutcomeColumnIds[];

    constructor(options?) {
        /// <summary>Create a new Test case details grid</summary>
        super(options);
        this._tfscontext = options.tfscontext;
    }

    public initializeOptions(options?: any) {
        /// <param name="options" type="any" />

        super.initializeOptions($.extend({
            sharedMeasurements: false,
            allowMoveColumns: false,
            keepSelection: true,
            allowMultiSelect: false,
            cssClass: TCMLite.TestCasePaneConstants.paneCssClass,
            initialSelection: false,
            draggable: false
        }, options));
    }

    /**
     * Initialize the base
     */
    public initialize() {
        Diag.logTracePoint("TestDetailsPaneGrid.initialize.start");
        super.initialize();
        this._testPointColumns = [TestsOM.LatestTestOutcomeColumnIds.Outcome, TestsOM.LatestTestOutcomeColumnIds.Tester, TestsOM.LatestTestOutcomeColumnIds.Configuration, TestsOM.LatestTestOutcomeColumnIds.RunBy, TestsOM.LatestTestOutcomeColumnIds.ResultDate, TestsOM.LatestTestOutcomeColumnIds.Duration, TestsOM.LatestTestOutcomeColumnIds.BuildNumber];
        Diag.logTracePoint("TestDetailsPaneGrid.initialize.end");
    }

    public setSource(rawSource: any, columns: any[]) {
        /// <summary>Set the source for the grid</summary>
        Diag.logTracePoint("TestDetailsPaneGrid.setSource.start");
        let options = this._options;

        this._customizeColumns(columns);
        options.columns = columns;
        options.source = rawSource;
        this.initializeDataSource();
        if (rawSource && rawSource.length > 0) {
            this._selectRow(0);
        }
        Diag.logTracePoint("TestDetailsPaneGrid.setSource.end");
    }

    public getTestPointColumns(): TestsOM.LatestTestOutcomeColumnIds[] {
        return this._testPointColumns;
    }

    private _customizeColumns(columns: any[]) {
        if (columns) {
            // Customize outcome and suite title columns to show icons along with the text.
            $.each(columns, (index: number, item: any) => {
                if ((Utils_String.ignoreCaseComparer(item.index, TestsOM.ResultsPaneColumnIds.Outcome) === 0) ||
                    (Utils_String.ignoreCaseComparer(item.index, TestsOM.SuitesPaneColumnIds.SuiteTitle) === 0)) {
                    item["getCellContents"] = (rowInfo: any, dataIndex: number, expandedState: number, level: number, column: any, indentIndex: number, columnOrder: number) => {
                        return this._getColumnWithIcon(dataIndex, column, columnOrder);
                    };
                }
                else if (Utils_String.ignoreCaseComparer(item.index, TestsOM.ResultsPaneColumnIds.RunBy) === 0) {
                    let identityCellRenderer = function (rowInfo, dataIndex, expandedState, level, column, indentIndex, columnOrder) {
                        return TFS_UI_Controls_Identities.IdentityViewControl.renderIdentityCellContents(this, rowInfo, dataIndex, expandedState, level, column, indentIndex, columnOrder);
                    };
                    item["getCellContents"] = identityCellRenderer;
                }
                if ((Utils_String.ignoreCaseComparer(item.type, "System.Int32") === 0) ||
                    (Utils_String.ignoreCaseComparer(item.type, "System.DateTime") === 0)) {
                    item["comparer"] = function (column, order, item1, item2) {
                        return item1[column.index] - item2[column.index];
                    };
                }
            });
        }
    }

    /**
     * opens the selected test detail item
     */
    public onOpenRowDetail(): boolean {
        let selectedDataIndex: number,
            link: any,
            openInNewTab: boolean;
        if (this._selectedIndex >= 0) {
            selectedDataIndex = this._selectedRows[this._selectedIndex];
            link = this._dataSource[selectedDataIndex].link,
                openInNewTab = this._dataSource[selectedDataIndex].openInNewTab;
            if (openInNewTab) {
                window.open(link, "_blank");
            }
            else {
                window.open(link, "_self");
            }
        }
        return false;
    }

    private _getColumnWithIcon(dataIndex: number, column: any, columnOrder: number) {
        let $div: JQuery = $(domElem("div", "grid-cell")),
            $outcomeElement: JQuery,
            outcomeText: string,
            $outcomeTextElement: JQuery,
            width: any = Math.round(column.width) || 20,
            iconClass: string = "",
            suiteType: string;

        $div.css("width", (isNaN(width) ? width : width + "px"));

        outcomeText = super.getColumnText(dataIndex, column, columnOrder);
        $outcomeTextElement = $(domElem("span", TCMLite.TestCasePaneConstants.outcomeText));
        $outcomeTextElement.text(outcomeText)
            .addClass(TCMLite.TestCasePaneConstants.testOutcomeColumnText)
            .css("max-width", $div.css("width"));

        if (column.index === TCMLite.TestCasePaneConstants.outcomeColumnName) {
            iconClass = TCMPointGrid.TestPointsGrid.getOutcomeShadeClassNameFromOutcomeText(outcomeText);
        }
        else if (column.index === TCMLite.TestCasePaneConstants.suiteTitleColumnName) {
            suiteType = this._dataSource[dataIndex].suiteType;
            iconClass = TMUtils.getSuiteIcon(suiteType);
        }
        $outcomeElement = $(domElem("div", TCMLite.TestCasePaneConstants.outcomeContainer));
        $outcomeElement.addClass(TCMLite.TestCasePaneConstants.testPointIconClass)
            .addClass(iconClass);

        //set the title property to have the tooltip set properly
        $div.attr("title", outcomeText)
            .append($outcomeElement)
            .append($outcomeTextElement);
        return $div;
    }

    public refreshList(testCaseID: number, paneFilter: string, positionFilter: string, forceRefresh = false) {
        Diag.logTracePoint("TestDetailsPaneGrid.refreshList invoked");
        this._pane = paneFilter;
        if (positionFilter === "off" || (!testCaseID && testCaseID != 0)) {
            return;
        }

        if (forceRefresh || paneFilter !== this._lastPaneMode || positionFilter !== this._lastPanePosition || testCaseID !== this._lastTestCaseId) {
            Diag.logTracePoint("TestDetailsPaneGrid.refreshList actually starting to refresh");
            this._cleanupTestDetailsPaneGrid();
            this._lastPaneMode = paneFilter;
            this._lastPanePosition = positionFilter;
            this._lastTestCaseId = testCaseID;
            if (paneFilter === TCMLite.TestPaneGridValues.paneMode_suites) {
                this._refreshListForTestSuitesPaneMode(testCaseID, paneFilter);
            }
            else if (paneFilter === TCMLite.TestPaneGridValues.paneMode_results) {
                this._refreshListForTestResultsPaneMode(testCaseID, paneFilter);
            }

            if (this.updatePaneToolbarTooltipsDelegate) {
                this.updatePaneToolbarTooltipsDelegate();
            }
        }
        else {
            //When the pane is toggled off and then on again, the base grid does not draw the rows correctly if the grid view requires a scroll.
            //So drawing the layout again even when we are not refreshing the actual data.
            this.layout();
        }
    }

    private _refreshListForTestResultsPaneMode(testCaseID: number, paneFilter: string) {
        Diag.logTracePoint("TestDetailsPaneGrid.refreshList initializing Results pane");

        if (testCaseID != 0) {
            Diag.logTracePoint("getTestCaseResultForTestCaseId.begin");
            let testResultManager = this._getTestResultsManager();

            testResultManager.getTestCaseResultForTestCaseId(testCaseID, (results: any) => {
                Diag.logTracePoint("getTestCaseResultForTestCaseId.end");
                if (this.getSelectedTestCaseDelegate && this.getSelectedTestCaseDelegate() === testCaseID &&
                    this.getSelectedPaneModeDelegate && this.getSelectedPaneModeDelegate() === TCMLite.TestPaneGridValues.paneMode_results) {
                    Diag.logTracePoint("TestDetailsPaneGrid.refreshList starting to populate results data");
                    this.populateGridData(results, paneFilter, testCaseID);
                }
            },
                (error) => {
                    alert(VSS.getErrorMessage(error));
                });
        }
    }

    private _refreshListForTestSuitesPaneMode(testCaseID: number, paneFilter: string) {
        Diag.logTracePoint("TestDetailsPaneGrid.refreshList initializing Suites pane");
        
        if (testCaseID !== 0) {
            Diag.logTracePoint("getSuitesForTestCase.begin");
            let testPlanManager = this._getTestPlanManager();

            testPlanManager.getSuitesForTestCase(testCaseID, (testSuite) => {
                Diag.logTracePoint("getSuitesForTestCase.end");
                if (this.getSelectedTestCaseDelegate && this.getSelectedTestCaseDelegate() === testCaseID &&
                    this.getSelectedPaneModeDelegate && this.getSelectedPaneModeDelegate() === TCMLite.TestPaneGridValues.paneMode_suites) {
                    Diag.logTracePoint("TestDetailsPaneGrid.refreshList starting to populate suites data");
                    this.populateGridData(testSuite, paneFilter, testCaseID);
                }
            },
                (error) => {
                    alert(VSS.getErrorMessage(error));
                });
        }
    }

    private _getTestPlanManager(): TestsOM.TestPlanManager {
        if (!this._testPlanManager) {
            this._testPlanManager = TFS_OM_Common.ProjectCollection.getConnection(this._tfscontext).getService<TestsOM.TestPlanManager>(TestsOM.TestPlanManager);
        }
        return this._testPlanManager;
    }

    private _getTestResultsManager(): TestsOM.TestResultManager {
        if (!this._testResultManager) {
            this._testResultManager = TFS_OM_Common.ProjectCollection.getConnection(this._tfscontext).getService<TestsOM.TestResultManager>(TestsOM.TestResultManager);
        }
        return this._testResultManager;
    }

    private _cleanupTestDetailsPaneGrid() {
        this.setSource([], []);
        this.updateOpenTestDetailCommandState(true);
        this.updateRefreshTestDetailCommandState(true);
        this._clearError();
    }

    public populateGridData(payloadData: any, paneFilter: string, testCaseId: number) {
        let i, l, length: number,
            suite: any,
            row: any,
            result: TestsOM.ITestCaseResultModel,
            rawSource: any[] = [],
            columns: any[];

        this.updateRefreshTestDetailCommandState(false);

        if (payloadData) {
            length = payloadData.length;
        }

        if (paneFilter === TCMLite.TestPaneGridValues.paneMode_results && length === 0 && testCaseId !== 0) {
            this._selectedIndex = -1;
            this.updateOpenTestDetailCommandState(true);
            this.showError(Resources.NoTestResultForTestCase);
            return;
        }
        this.updateOpenTestDetailCommandState(false);
        this._clearError();

        if (paneFilter === TCMLite.TestPaneGridValues.paneMode_suites) {
            for (i = 0, l = length; i < l; i++) {
                row = this._populateSuitePaneGridRow(payloadData[i]);
                rawSource.push(row);
            }
            columns = [TestDetailsPaneGrid._testSuiteTitleColumn,
                TestDetailsPaneGrid._testSuiteStatusColumn,
                TestDetailsPaneGrid._testSuitePlanColumn,
                TestDetailsPaneGrid._testSuiteProjectColumn];
        }
        else if (paneFilter === TCMLite.TestPaneGridValues.paneMode_results) {
            for (i = 0, l = length; i < l; i++) {
                row = this._populateResultsPaneGridRow(payloadData[i]);
                if (row[TestsOM.ResultsPaneColumnIds.Outcome] !== "") {
                    rawSource.push(row);
                }
            }
            columns = [TestDetailsPaneGrid._testResultOutcomeColumn,
                TestDetailsPaneGrid._testResultConfigurationColumn,
                TestDetailsPaneGrid._testResultRunByColumn,
                TestDetailsPaneGrid._testResultDurationColumn,
                TestDetailsPaneGrid._testResultDateColumn,
                TestDetailsPaneGrid._testResultPlanIdColumn,
                TestDetailsPaneGrid._testResultPlanNameColumn,
                TestDetailsPaneGrid._testResultSuiteIdColumn,
                TestDetailsPaneGrid._testResultSuiteNameColumn];
        }
        this.setSource(rawSource, columns);
    }

    private _populateSuitePaneGridRow(suite: any): any {
        let link: string = TMUtils.UrlHelper.getSuiteUrl(suite.plan.id, suite.id, false, suite.project.name),
            suiteType: string = suite.suiteType,
            row: any = {};
        row[TestsOM.SuitesPaneColumnIds.SuiteTitle] = suite.name;
        row[TestsOM.SuitesPaneColumnIds.TestPlan] = suite.plan.name;
        row[TestsOM.SuitesPaneColumnIds.TeamProject] = suite.project.name;
        row[TestsOM.SuitesPaneColumnIds.Link] = link;
        row[TestsOM.SuitesPaneColumnIds.SuiteType] = suiteType;
        row[TestsOM.SuitesPaneColumnIds.OpenInNewTab] = true;
        row[TestsOM.SuitesPaneColumnIds.SuiteStatus] = suite.state;
        return row;
    }

    private _populateResultsPaneGridRow(result: TestsOM.ITestCaseResultModel): any {
        let link = TestsOM.UriHelper.getTestResultUri(result.testRunId, result.testResultId, 0),
            row = {};

        row[TestsOM.ResultsPaneColumnIds.Outcome] = TMUtils.setResultOutcomeText(result.outcome, result.state);
        row[TestsOM.ResultsPaneColumnIds.Configuration] = result.configurationName;
        row[TestsOM.ResultsPaneColumnIds.Link] = link;
        row[TestsOM.ResultsPaneColumnIds.OpenInNewTab] = true;
        row[TestsOM.ResultsPaneColumnIds.RunBy] = result.runByName;
        row[TestsOM.ResultsPaneColumnIds.ResultDate] = result.dateStarted;
        /*duration in ticks. dividing by 10000 as method setIterationResultOutcomeLocally in 
        TFS.Testmanagement.Utils.ts.  10000 ticks in 1 miliseconds 
        and then converting to seconds */
        row[TestsOM.ResultsPaneColumnIds.Duration] = Math.round((result.duration / 10000) / 1000);
        row[TestsOM.ResultsPaneColumnIds.PlanId] = result.planId;
        row[TestsOM.ResultsPaneColumnIds.PlanName] = result.planName;

        if (result.suiteId === 0) {
            row[TestsOM.ResultsPaneColumnIds.SuiteId] = Resources.DeletedSuiteIdText;
            row[TestsOM.ResultsPaneColumnIds.SuiteName] = Resources.DeletedSuiteNameText;
        }
        else {
            row[TestsOM.ResultsPaneColumnIds.SuiteId] = result.suiteId;
            row[TestsOM.ResultsPaneColumnIds.SuiteName] = result.suiteName;
        }

        return row;
    }

    public showError(message: string) {
        /// <summary>shows an error mesage</summary>
        /// <param name="message" type="String">the message to be displayed</param>
        if (!this._$errorDiv) {
            let container = this._element;
            this._$errorDiv = $("<div class='inline-error' />").text(message).insertBefore(container);
            container.hide();
        }
    }

    private _clearError() {
        /// <summary>clears the error mesage</summary>
        let $errorDiv = this._$errorDiv || this._element.find(".inline-error");
        if ($errorDiv) {
            $errorDiv.remove();
            this._$errorDiv = null;
        }
        this._element.show();
    }
}

VSS.initClassPrototype(TestDetailsPaneGrid, {
    _tfsContext: null
});