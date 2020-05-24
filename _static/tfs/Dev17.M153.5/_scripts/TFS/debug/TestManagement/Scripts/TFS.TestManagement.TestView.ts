//Auto converted from TestManagement/Scripts/TFS.TestManagement.TestView.debug.js

/// <reference types="jquery" />

import q = require("q");
import Agile_LAZY_LOAD = require("Agile/Scripts/Common/Agile");

import EngagementDispatcher_NO_REQUIRE = require("Engagement/Dispatcher");
import EngagementRegistrations_NO_REQUIRE = require("TestManagement/Scripts/TFS.TestManagement.Engagement.Registrations");
import TFS_EngagementRegistrations_NO_REQUIRE = require("Presentation/Scripts/TFS/TFS.Engagement.Registrations");

import Ajax = require("Presentation/Scripts/TFS/TFS.Legacy.Ajax");
import IdentityImage = require("Presentation/Scripts/TFS/TFS.IdentityImage");
import ServerConstants = require("Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants");
import TCMConstants = require("Presentation/Scripts/TFS/Generated/TFS.TestManagement.Constants");
import TFS_TeamAwarenessService = require("Presentation/Scripts/TFS/FeatureRef/TFS.TeamAwarenessService");
import TFS_Core_Utils = require("Presentation/Scripts/TFS/TFS.Core.Utils");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import TFS_OM_Common = require("Presentation/Scripts/TFS/TFS.OM.Common");
import TFS_WebSettingsService = require("Presentation/Scripts/TFS/TFS.WebSettingsService");
import TFS_OM_Identities = require("Presentation/Scripts/TFS/TFS.OM.Identities");
import TFS_Resources_Presentation = require("Presentation/Scripts/TFS/Resources/TFS.Resources.Presentation");
import TFS_UI_Controls_Identities = require("Presentation/Scripts/TFS/TFS.UI.Controls.Identities");
import Widgets = require("Presentation/Scripts/TFS/TFS.UI.Widgets");
import WITConstants = require("Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants");
import TfsCommon_Resources = require("TfsCommon/Scripts/Resources/TFS.Resources.TfsCommon");
import TfsCommon_Shortcuts = require("TfsCommon/Scripts/KeyboardShortcuts");
import TeamServices = require("TfsCommon/Scripts/Team/Services");
import { RecycleBinConstants } from "WorkItemTracking/Scripts/RecycleBinConstants";
import { WorkItemTypeColorAndIconsProvider } from "Presentation/Scripts/TFS/FeatureRef/WorkItemTypeColorAndIconsProvider";

import AssignTester_LAZY_LOAD = require("TestManagement/Scripts/TFS.TestManagement.AssignTesters");
import ExportHtml_LAZY_LOAD = require("TestManagement/Scripts/TFS.TestManagement.HtmlDocumentGenerator");
import SelectWorkItemView_LAZY_LOAD = require("TestManagement/Scripts/TFS.TestManagement.SelectWorkItemView");
import TCMControlsCharts_LAZY_LOAD = require("TestManagement/Scripts/TFS.TestManagement.Controls.Charts");
import TestAssignConfig_LAZY_LOAD = require("TestManagement/Scripts/TFS.TestManagement.AssignConfigurationsToSuite");
import TestCaseBulkEdit_LAZY_LOAD = require("TestManagement/Scripts/TFS.TestManagement.TestCaseBulkEdit");
import TMControls_LAZY_LOAD = require("TestManagement/Scripts/TFS.TestManagement.Controls");
import TestViewFilterBar_LAZY_LOAD = require("TestManagement/Scripts/TFS.TestManagement.TestViewFilterBar");
import WorkItemRelated_LAZY_LOAD = require("TestManagement/Scripts/TFS.TestManagement.ColumnOptions");
import OrderTestsControl_LAZY_LOAD = require("TestManagement/Scripts/OrderTests/TFS.TestManagement.OrderTests.Control");
import RunWithOptions_LAZY_LOAD = require("TestManagement/Scripts/TFS.TestManagement.RunTestsWithOptions");
import RunSettingsHelper_LAZY_LOAD = require("TestManagement/Scripts/TFS.TestManagement.TestSettingsHelper");
import TestWorkItemDeleteDialog_Async = require("WorkItemTracking/Scripts/TestWorkItemDelete/TFS.TestWorkItemDelete.Dialog");

import BulkEditTestsVM = require("TestManagement/Scripts/TFS.TestManagement.BulkEditTestsViewModel");
import PageHelper = require("TestManagement/Scripts/TFS.TestManagement.PageHelper");
import Resources = require("TestManagement/Scripts/Resources/TFS.Resources.TestManagement");
import WITResources = require("WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking");
import TestsOM = require("TestManagement/Scripts/TFS.TestManagement");
import TMTreeViewControls = require("TestManagement/Scripts/TFS.TestManagement.TreeView");
import TMShortcutsControls = require("TestManagement/Scripts/TFS.TestManagement.TestHubShortcutsControls");
import TMUtils = require("TestManagement/Scripts/TFS.TestManagement.Utils");
import TCMTelemetry = require("TestManagement/Scripts/TFS.TestManagement.Telemetry");
import TCMLicenseAndFeatureFlagUtils = require("TestManagement/Scripts/Utils/TFS.TestManagement.LicenseAndFeatureFlagUtils");

import Controls = require("VSS/Controls");
import Diag = require("VSS/Diag");
import Dialogs = require("VSS/Controls/Dialogs");
import Events_Action = require("VSS/Events/Action");
import Events_Document = require("VSS/Events/Document");
import Events_Handlers = require("VSS/Events/Handlers");
import Events_Services = require("VSS/Events/Services");
import FeatureAvailability_Services = require("VSS/FeatureAvailability/Services");
import Grids = require("VSS/Controls/Grids");
import Menus = require("VSS/Controls/Menus");
import Navigation = require("VSS/Controls/Navigation");
import Navigation_Services = require("VSS/Navigation/Services");
import Performance = require("VSS/Performance");
import Service = require("VSS/Service");
import Splitter = require("VSS/Controls/Splitter");
import Utils_Array = require("VSS/Utils/Array");
import Utils_Core = require("VSS/Utils/Core");
import Utils_Date = require("VSS/Utils/Date");
import Utils_String = require("VSS/Utils/String");
import Utils_UI = require("VSS/Utils/UI");
import Utils_Url = require("VSS/Utils/Url");
import VSS = require("VSS/VSS");
import VSS_Resources_Common = require("VSS/Resources/VSS.Resources.Common");

import TFS_UI_Tags_LAZY_LOAD = require("WorkItemTracking/Scripts/TFS.UI.Tags");
import WorkItemTrackingControlsAccessories = require("WorkItemTracking/Scripts/TFS.WorkItemTracking.Controls.Accessories");
import WITOM = require("WorkItemTracking/Scripts/TFS.WorkItemTracking");
import { Exceptions, WorkItemChangeType } from "WorkItemTracking/Scripts/OM/WorkItemConstants";
import { WorkItemManager } from "WorkItemTracking/Scripts/OM/WorkItemManager";
import WITControls_LAZY_LOAD = require("WorkItemTracking/Scripts/TFS.WorkItemTracking.Controls");
import WITForm_LAZY_LOAD = require("WorkItemTracking/Scripts/Controls/WorkItemForm");
import TCMContracts = require("TFS/TestManagement/Contracts");
import Utils_Culture = require("VSS/Utils/Culture");
import { FilterManager } from "WorkItemTracking/Scripts/Filtering/FilterManager";
import { WitFormModeUtility } from "WorkItemTracking/Scripts/Utils/WitControlMode";
import MessageArea = require("TestManagement/Scripts/TFS.TestManagement.MessageArea");

let TfsContext = TFS_Host_TfsContext.TfsContext;
let delegate = Utils_Core.delegate;
let domElem = Utils_UI.domElem;
let TestCaseCategoryUtils = TMUtils.TestCaseCategoryUtils;
let WITUtils = TMUtils.WorkItemUtils;
let DAUtils = TestsOM.DAUtils;
let TelemetryService = TCMTelemetry.TelemetryService;
let columnoptions = TMUtils.TestHubColumnOption;
let TestSuitesTree = TMTreeViewControls.TestSuitesTree;
let LicenseAndFeatureFlagUtils = TCMLicenseAndFeatureFlagUtils.LicenseAndFeatureFlagUtils;
let eventService = Service.getLocalService(Events_Services.EventService);

export class TestPivots {
    public static TESTS: string = "tests";
    public static CHARTS: string = "charts";
}

export class NewSuiteCommandIds {
    public static newStaticSuite = "new-static-suite";
    public static newRequirementSuite = "new-requirement-suite";
    public static newQueryBasedSuite = "new-query-based-suite";
}

export class TestPlanSelector extends Controls.BaseControl {

    public static enhancementTypeName: string = "tfs.testManagement.TestPlanSelector";
    private _selectedPlan: any;
    private _idToPlanTextMap: any;
    private _dropDownControl: any;

    constructor(options?: any) {
        /// <summary>Create a new TestPlanSelector Combobox</summary>
        /// <param name="options" type="Object">the options for this control</param>
        super(options);
    }

    public initialize() {
        /// <summary>creates a drop down control and initiates fetching of test plan</summary>
        super.initialize();
        Widgets.Dropdown(this._element, { watermarkText: Resources.SelectPlan });
        this._dropDownControl = this._element.data("TFS-Dropdown");
        this._dropDownControl.options._elements._noResults.text(Resources.NoPlansAvailable);
        this._element.bind("itemSelected", delegate(this, this._onSelectedPlanChanged));
        this._element.bind("startSearch", delegate(this, this._onSelectedPlanChanged));
        this._element.bind("completeSearch", delegate(this, this._onSelectedPlanChanged));
        this._element.bind("cancelSearch", delegate(this, this._onSelectedPlanChanged));
    }

    public setData(data: any, selectedPlanId: number) {
        /// <summary>Displays the passed data in comobox and takes care of initial selection</summary>
        /// <param name="data" type="Object">the data to show</param>
        /// <param name="selectedPlanId" type="Number">the planid to select</param>
        let selectedPlan;
        this._idToPlanTextMap = {};

        this._setDisplayTextAndCreateIdToTextMap(data);
        if (selectedPlanId) {
            selectedPlan = this._idToPlanTextMap[selectedPlanId];
        }

        if (data) {
            this._dropDownControl.add(data);
            if (selectedPlan) {
                this._setSelectedPlan(selectedPlan);
            }
        }
    }

    public clearDropDown() {
        this._dropDownControl.clear();
        this._dropDownControl.setValue("");
    }

    public updateData(plan: any, setSelectedPlan?: boolean, oldPlan?: any) {
        if (plan) {
            this._setDisplayTextAndCreateIdToTextMap([plan]);

            if (oldPlan) {
                //Updating plan in drop down list by removing and adding.
                this._dropDownControl.remove(oldPlan.text);
            }

            this._dropDownControl._addItem(plan);

            if (setSelectedPlan) {
                // always select the new plan
                this._setSelectedPlan(plan);
            }
        }        

        // this just sets the plan name text in the dropdown box
        // if does not re-fetch the plan data
        if (this._selectedPlan) {
            this._setSelectedPlan(this._selectedPlan);
        }
    }

    public selectPlanById(planId: number): any {
        /// <summary>disambiguates plans with similar name</summary>
        /// <param name="planId" type="Integer">the planid to  select</param>
        /// <returns type="Object" > the plan object coreesponding to planId</returns>
        let plan = this._idToPlanTextMap[planId];
        if (plan) {
            this._setSelectedPlan(plan);
        }
        return plan;
    }

    public removeDeletedPlanAndSetSelectedPlan(planId: number) {
        let plan = this._idToPlanTextMap[planId];

        // Remove deleted plan from dropdown and idToPlanText map
        if (plan) {
            this._dropDownControl.remove(plan.text);
            delete this._idToPlanTextMap[planId];
        }

        // Get next plan to be selected - first in the dropdown
        let selectedPlan;
        for (let i in this._idToPlanTextMap) {
            selectedPlan = this._idToPlanTextMap[i];
            break;
        }

        this._selectedPlan = selectedPlan;

        if (this._selectedPlan) {
            // change dropdown selection
            this._selectWithoutOpeningDropDown(this._selectedPlan.text);
        }
        else {
            // if selectedPlan is not defined, clear dropdown as no plans are left
            this.clearDropDown();
        }

        return this._selectedPlan;
    }

    private _selectWithoutOpeningDropDown(value: string) {
        this._dropDownControl.options.showListOnKeystroke = false;
        this._dropDownControl.select(value, false);
        this._dropDownControl.options.showListOnKeystroke = true;
    }

    private _setSelectedPlan(plan: any) {
        this._selectedPlan = plan;
        this._selectWithoutOpeningDropDown(this._selectedPlan.text);
    }

    private _setDisplayTextAndCreateIdToTextMap(plans: any) {
        /// <summary>sets the text to be dislpayed in the drop down combo boof plans</summary>
        /// <param name="plans" type="Object">the list of plans to disambiguate sorted by their name</param>
        ///asumes that the plans are sorted on names
        let currentPlan,
            iterationNameArray = [],
            i;

        if (plans) {
            for (i = 0; i < plans.length; i++) {
                // Adding iteration name and plan id to the plan name 
                currentPlan = plans[i];
                iterationNameArray = currentPlan.iteration.split("\\");
                currentPlan.text = Utils_String.format(Resources.TestPlanTitleFormat, iterationNameArray[iterationNameArray.length - 1], currentPlan.name, currentPlan.id);
                this._idToPlanTextMap[currentPlan.id] = currentPlan;
            }
        }
    }

    private _onSelectedPlanChanged(e?: any, selectedItemInfo?: any) {
        /// <summary>//BugFix 920266 -Takes care of remving autocomplete upon selection so that it does not interfere in actual text</summary>
        /// <param name="e" type="Object">event related info</param>
        /// <param name="selectedItemInfo" type="Object">has the information about the selected plan from the dropdown</param>
        this._dropDownControl.options._elements._autoComplete.hide();
    }
}

VSS.initClassPrototype(TestPlanSelector, {
    _selectedPlan: null,
    _idToPlanTextMap: null,
    _dropDownControl: null
});

VSS.classExtend(TestPlanSelector, TfsContext.ControlExtensions);

export class TestsGridHtmlTableFormatter extends Grids.TabDelimitedTableFormatter {
    constructor(grid, options?) {
        super(grid, options);
    }

    public getFormattedColumnValue(column: any, value: string): string {
        if (column.isIdentity) {
            let identity = TFS_OM_Identities.IdentityHelper.parseUniquefiedIdentityName(value);
            if (identity) {
                return identity.displayName;
            }
        }
        return value;
    }
}

export class TestPointsGrid extends Grids.GridO<any> {

    public static enhancementTypeName: string = "tfs.testmanager.TestPointsGrid";

    private _tfsContext: TFS_Host_TfsContext.TfsContext;
    private _workItemChangedDelegate: IEventHandler;
    private _dirtyWorkItems: WITOM.WorkItem[];
    private _controlKeyPressed: boolean;

    // Maintains all the unsaved changes made to the test points grid
    private _pageData: { [key: number]: any[]; };

    public refreshTestPointsEvent: any;
    public refreshSelectedTestSuiteEvent: any;
    public setOutcomeEvent: any;
    public resetTestPointsEvent: any;
    public assignTesterEvent: any;
    public assignConfigurationEvent: (testCaseAndSuiteList: TestsOM.ITestCaseWithParentSuite[]) => void;
    public removeTestCaseEvent: any;
    public canSetOutcomeDelegate: any;
    public canResetTestPointsDelegate: any;
    public canResumeTestsDelegate: any;
    public canRunTestsDelegate: any;
    public canRemoveTestsDelegate: any;
    public canShowRemoveTestsDelegate: () => boolean;
    public isTestNotApplicableDelegate: any;
    public testCaseModified: boolean;
    public runTestPointsEvent: any;
    public runTestPointsUsingClientEvent: any;
    public runTestPointsWithOptionsEvent: any;
    public resumeTestPointsEvent: any;
    public bulkEditTestCasesUsingGridEvent: (testCaseIds: number[]) => void;
    public isTestCaseDialogOpen: boolean;
    public resetFiltersEvent: () => void;
    public static hiddenRefNames = ["System.History"];
    private _filterApplied: boolean;
    private _filterManager: FilterManager;
    private _originalDataSource: any;
    private _unfilteredWorkItemIds: number[];
    private _workItemIds: number[];
    public sortOrder: TestsOM.IColumnSortOrderModel;
    private onMiddleRowVisible: () => void;
    private _rowIndexToScrollAfterFetch: number = -1;
    private _teamPermissions: TeamServices.ITeamPermissions;

    constructor(options?) {
        /// <summary>Create a new Test case grid</summary>
        super(options);

        this.testCaseModified = false;
        this._workItemChangedDelegate = delegate(this, this.workItemChanged);
        this._dirtyWorkItems = [];
        this.onMiddleRowVisible = (options && options.onMiddleRowVisible) ? options.onMiddleRowVisible : () => { };
    }

    public initializeOptions(options?: any) {
        /// <param name="options" type="any" />
        let draggableOption: any = false;
        draggableOption = {
            scope: TestSuitesTree.DropScope,
            scrollables: [".testmanagement-suites-tree"],  // a list of selectors to identify elements that the tile will scroll while dragging
            cursorAt: { left: -20, top: 0 },
            dropBehaviour: false,            // Override default set by base query results grid.  This is needed so droppables get invoked
            axis: "", // the default will set the axis to y, we need to make the tile move freely
            appendTo: document.body, // append to body to allow for free drag/drop
            helper: (event, ui) => { return this._draggableHelper(event, ui); },
        };

        super.initializeOptions($.extend({
            sharedMeasurements: false,
            allowMoveColumns: false,
            keepSelection: true,
            allowMultiSelect: true,
            autoSort: false,
            gutter: {
                contextMenu: true
            },
            contextMenu: {
                items: delegate(this, this.getContextMenuItems),
                updateCommandStates: delegate(this, this._updateContextMenuCommandStates),
                executeAction: delegate(this, this._onContextMenuItemClick),
                "arguments": delegate(this, this._getDefaultActionArguments),
                contributionIds: ["ms.vss-test-web.test-run-grid-menu"],
                contextInfo: {
                    item: { getContributionContext: this.getContributionContext.bind(this) }
                }
            },
            cssClass: "testcases-grid",
            initialSelection: false,
            draggable: draggableOption
        }, options));
    }

    public initialize() {
        /// <summary>Initialize the base </summary>
        let tfsContext = TFS_Host_TfsContext.TfsContext.getDefault();
        Service.getService(TeamServices.TeamPermissionService).beginGetTeamPermissions(tfsContext.navigation.projectId, tfsContext.navigation.teamId).then((permissions: TeamServices.ITeamPermissions) => {
            this._teamPermissions = permissions;
        });

        TMUtils.CommonIdentityPickerHelper.getFeatureFlagState();
        super.initialize();
        this.startTrackingWorkItems();
        this._bind("keydown", (e) => {
            // This is just an undocumented way to clear column and filter options. To be used for testing.
            // Pressing Ctrl + Alt + x clears the selection saved on the server.
            if (e.altKey && e.ctrlKey && e.which === 88) {
                TMUtils.getTestPlanManager().updateColumnOptions([], true);
                TMUtils.getTestPlanManager().updateColumnSortOrder({ index: "", order: "" });
                if (this.resetFiltersEvent) {
                    this.resetFiltersEvent();
                }
            }
        });

        let testCaseId = this._parseUrlToGetTestCaseId();
        if (testCaseId) {
            this._openWorkItem(testCaseId, null, null);
        }
    }

    private _parseUrlToGetTestCaseId() {
        let state = Navigation_Services.getHistoryService().getCurrentState();
        if (state.hasOwnProperty("testCaseId")) {
            let commandValue = state["testCaseId"];
            delete state["testCaseId"];
            Navigation_Services.getHistoryService().updateHistoryEntry(state.action, state, true, false, Utils_String.empty, true);
            return commandValue;
        }
        return undefined;
    }

    public startTrackingWorkItems(): void {
        WorkItemManager.get(WITUtils.getWorkItemStore()).attachWorkItemChanged(this._workItemChangedDelegate);
    }

    public stopTrackingWorkItems(): void {
        WorkItemManager.get(WITUtils.getWorkItemStore()).detachWorkItemChanged(this._workItemChangedDelegate);
    }

    public copySelectedItems(formatterType?: new (grid: Grids.Grid, options?: any) => Grids.ITableFormatter, copyAsHtml?: boolean, options?: any) {
        //override for Ctrl+C so that it defaults to CopyAsHtml
        super.copySelectedItems(formatterType ? formatterType : TestsGridHtmlTableFormatter, copyAsHtml, options);
    }

    public _onRowMouseDown(e?: JQueryEventObject): any {
        /// <param name="e" type="JQueryEvent" />
        /// <returns type="any" />

        let rowInfo = this._getRowInfoFromEvent(e, ".grid-row");
        if (!rowInfo) {
            return;
        }
        if ((this._selectedIndex === rowInfo.rowIndex && this._selectedRows.hasOwnProperty(rowInfo.rowIndex))
            && !e.ctrlKey && !e.shiftKey) {
        }
        else {
            super._onRowMouseDown(e);
        }
    }

    public _onCanvasScroll(e?: JQueryEventObject): any {
        let result = super._onCanvasScroll(e),
            row = this._rows[this._count - this._count / 2],
            lastRow = this._rows[this._count - 1];
        if (lastRow && this._isScrolledIntoView(lastRow.row)) {
            this._onMiddleRowVisible(lastRow.rowIndex);
        } else {
            if ((row && this._isScrolledIntoView(row.row))) {
                this._onMiddleRowVisible(row.rowIndex);
            }
        }
        return result;
    }

    public _onMiddleRowVisible(rowIndex: number) {
        Diag.logTracePoint("TestPoint.Grid.MiddlePoint.Visible");
        this._rowIndexToScrollAfterFetch = rowIndex;
        Diag.logVerbose("[_onMiddleRowVisible]Middle point of grid is visible. Fetch more testspoints. Index to scroll to after fetch = " + rowIndex);
        this.delayExecute("fetchMoreTestPoints", 1, true, () => {
            Diag.logVerbose("[_onMiddleRowVisible]Middle row visible. Starting to get more testpoints");
            if (this.onMiddleRowVisible) {
                this.onMiddleRowVisible();
            }
        });
    }

    public getVisibleRow(): number {
        let visibleRange = this._getVisibleRowIndices();
        this._getRowIntoView(visibleRange.first);
        return visibleRange.first;
    }

    public _clearGrid() {
        let options = this._options;
        options.source = [];
        this.initializeDataSource();
    }

    private getContributionContext(): any {
        return this.getSelectedTestPoints();
    }

    public _getDraggedRowsInfo(e?: any) {
        let testCaseIds = this._getSelectedTestCaseIds();
        if (testCaseIds && testCaseIds.length > 0) {
            return testCaseIds;
        }
        return null;
    }

    private _isScrolledIntoView($elem: JQuery) {
        let documentTop = $(window).scrollTop(),
            documentBottom = documentTop + $(window).height(),
            elemTop = $elem.offset().top,
            elemBottom = elemTop + $elem.height();
        return ((elemBottom <= documentBottom) && (elemTop >= documentTop));
    }

    private _draggableHelper(event: JQueryEventObject, ui: any): JQuery {
        /// <summary>Called to createist the draggable helper element</summary>
        /// <param name="event" type="Object">The event which initiated this call</param>
        /// <param name="ui" type="Object">jQuery droppable ui object - enhanced with draggingRowInfo</param>
        let numWorkItems: number = ui.draggingRowInfo ? ui.draggingRowInfo.length : 0,
            $outerDiv = $("<div/>"),
            $tile: JQuery,
            tileText = Utils_String.format(Resources.DraggedItemText, numWorkItems);

        if (numWorkItems > 1) {
            tileText = Utils_String.format(Resources.DraggedMultipleItemsText, numWorkItems);
        }

        $tile = $("<div />")
            .addClass("drag-testcase-tile drag-droppable")
            .text(tileText);
        $outerDiv.append("<div class='drag-not-droppable-icon bowtie-icon bowtie-status-no-fill'/>").append($tile);
        return $outerDiv;
    }

    // This is needed to show the fields of testpoints on the left side of the column options dialog.
    // We need to exactly know what fields of testpoints can be removed from the grid.
    public static getRemovableTestPointFields(): any[] {
        let testPointFields = [];
        testPointFields.push(columnoptions._testPointConfigurationField);
        testPointFields.push(columnoptions._testPointTesterField);
        testPointFields.push(columnoptions._testPointSuiteIdField);
        testPointFields.push(columnoptions._testPointSuiteNameField);
        testPointFields.push(columnoptions._testPointLastRunByField);
        testPointFields.push(columnoptions._testPointLastRunDurationField);
        testPointFields.push(columnoptions._testPointBuildField);
        return testPointFields;
    }

    public _createContextMenu(rowInfo: any, menuOptions: any): Menus.PopupMenu {
        if (LicenseAndFeatureFlagUtils.AreAdvancedTestManagementFeaturesEnabled()) {
            let menuItemCount: number = menuOptions.items.length;

            CommonContextMenuItemsWithSearch.contributeTestPointsGrid(menuOptions, {
                tfsContext: TFS_Host_TfsContext.TfsContext.getDefault(),
                enableTeamActions: !this._teamPermissions || this._teamPermissions.currentUserHasTeamPermission,
                executeAction: delegate(this, this._assignTester),
                title: Resources.AssignTesterTitle,
                tooltip: Resources.AssignTesterTooltip,
                maxTeamSize: 500,
                addSearchUserChildMenu: TMUtils.CommonIdentityPickerHelper.featureFlagEnabled
            });

            if (menuItemCount === menuOptions.items.length) {
                menuOptions.items.push({ rank: 13, separator: true });
            }
        }

        menuOptions.getContributionContext = delegate(this, this.getContributionContext);
        return super._createContextMenu(rowInfo, menuOptions);
    }

    // This is used to filter out the fixed fields in the 
    // left side of column options dialog. So we need to know exactly what fields of work items and
    // test point should not be shown on the left side.
    public static getFixedFields(): any[] {
        let workItemFields = [
            {
                id: WITConstants.CoreField.Id,
                text: Resources.TestPointGridColumnID,
                name: WITConstants.CoreFieldRefNames.Id
            },
            {
                id: WITConstants.CoreField.Title,
                text: Resources.TestPointGridColumnTitle,
                name: WITConstants.CoreFieldRefNames.Title
            }], fields = [];

        fields.push(columnoptions._testPointOutcomeField);
        fields.push(columnoptions._testPointOrderField);
        fields = fields.concat(workItemFields);
        return fields;
    }

    public setSource(rawSource: any, columns: any[], sortOrder: TestsOM.IColumnSortOrderModel) {
        /// <summary>Set the source for the grid and slect the first row as default</summary>
        /// <param name="rawSource" type="Object">source</param>
        let options = this._options;
        options.source = rawSource;
        this._originalDataSource = rawSource.slice(0);
        this._unfilteredWorkItemIds = this.getWorkItemIdsFromDataSource(this._originalDataSource);

        this._customizeColumns(columns);
        options.columns = columns;
        options.sortOrder = this._getSortOrder(sortOrder);

        if (!this._filterApplied) {
            this.initializeDataSource();
            this.onSort(options.sortOrder);
            if (rawSource && rawSource.length > 0) {
                this._selectRow(0);
            }
        }
    }

    public onSort(sortOrder: any, sortColumns?: any): any {

        let sortOrderForIdColumn = [],
            sortColumnsForIdColumn = [];

        super.onSort(sortOrder, sortColumns);

        if (sortOrder && sortOrder.length > 0) {
            this._fire("sortOrderChanged", { index: sortOrder[0].index, order: sortOrder[0].order }, false);
        }
    }

    private _getColumn(columnIndex: string) {
        let i: number,
            columns: any[] = this._columns,
            columnCount: number = this._columns.length;
        for (i = 0; i < columnCount; i++) {
            if (columns[i].index === columnIndex) {
                return columns[i];
            }
        }
    }

    private _openWorkItem(workItemId: string, testPoint: TestsOM.ITestPointModel, selectedRow: JQuery) {
        let handleFailure = (errorMessage: string) => {
            VSS.errorHandler.showError(errorMessage);
        };
        eventService.attachEvent(RecycleBinConstants.EVENT_DELETE_SUCCEEDED, this.refreshSelectedTestSuiteEvent);
        eventService.attachEvent(RecycleBinConstants.EVENT_DELETE_FAILED, handleFailure);

        Menus.menuManager.executeCommand(new Events_Handlers.CommandEventArgs("open-work-item", {
            id: workItemId,
            tfsContext: TFS_Host_TfsContext.TfsContext.getDefault(),
            options: {
                save: (workItem) => {
                    this.testCaseModified = true;
                },

                close: (workItem) => {
                    eventService.detachEvent(RecycleBinConstants.EVENT_DELETE_SUCCEEDED, this.refreshSelectedTestSuiteEvent);
                    eventService.detachEvent(RecycleBinConstants.EVENT_DELETE_FAILED, handleFailure);

                    try {
                        // Get refresh all test points that have the same test case. 
                        if (this.testCaseModified && this.refreshTestPointsEvent && testPoint) {
                            this.refreshTestPointsEvent([testPoint]);
                        }
                        //after form closes we want the focus back on the testpoint grid
                        this.focus(10);
                        this.testCaseModified = false;
                    }
                    finally {
                        this.isTestCaseDialogOpen = false;
                        if (selectedRow) {
                            this._updateRowStyle(selectedRow, workItem);
                        }
                        this._updatePageRow(workItem);
                        this._updateDirtyStatus(workItem);
                    }
                }
            }
        }, null));
    }

    public openSelectedTestCase() {

        if (!LicenseAndFeatureFlagUtils.AreAdvancedTestManagementFeaturesEnabled()) {
            return;
        }
        /// <summary>opens the selected test case</summary>
        let testPoint = this.getSelectedTestPoint(),
            $selectedRow: JQuery = this._getSelectedRow();

        DAUtils.trackAction("OpenTestCase", "/SuiteManagement");

        if (this.getSelectionCount() === 1 && testPoint) {
            this.isTestCaseDialogOpen = true;
            this._openWorkItem(testPoint.testCaseId, testPoint, $selectedRow);
        }


        TelemetryService.publishEvents(TelemetryService.featureOpenTestCaseWIT, {});
    }

    public onOpenRowDetail(): boolean {
        /// <summary>opens the selected test case</summary>
        /// <returns type="Boolean">returns false to stop event propagation</returns>
        this.openSelectedTestCase();
        return false;
    }

    public getSelectedTestPoint(): any {
        /// <summary>Get the selected test case from the data source</summary>
        /// <returns type="Object">selected test case</returns>
        let selectedDataIndex;
        if (this._selectedIndex >= 0) {
            selectedDataIndex = this._selectedRows[this._selectedIndex];
            return (typeof (selectedDataIndex) === "number") ? this._dataSource[selectedDataIndex] : null;
        }
    }

    public getSelectedTestPoints() {
        let selectedItems = [],
            rowIndex;

        for (rowIndex in this._selectedRows) {
            if (this._selectedRows.hasOwnProperty(rowIndex)) {
                selectedItems.push(this._dataSource[this._selectedRows[rowIndex]]);
            }
        }
        return selectedItems;
    }

    public getDirtyTests() {
        return this._dirtyWorkItems;
    }

    public selectedIndexChanged(selectedRowIndex, selectedDataIndex) {
        let testCaseId;
        super.selectedIndexChanged(selectedRowIndex, selectedDataIndex);
        testCaseId = this._dataSource[selectedDataIndex] ? this._dataSource[selectedDataIndex].testCaseId : 0;
        this._fire("selectedTestChanged", [testCaseId || 0]);
    }

    public workItemChanged(sender: any, args?: any) {
        /// <summary>Handles in-memory work item change events</summary>
        /// <param name="sender" type="Object">The sender</param>
        /// <param name="args" type="Object">Event arguments that include:
        /// {
        ///     change: <string> The type of change that is occurring on the work item
        ///     workItem: <Object> The work item that has changed
        /// }
        /// </param>
        let workItem,
            workItemId;

        Diag.Debug.assertParamIsObject(args, "args");
        Diag.Debug.assert(args.workItem, "workItem should be passed with work item changed arguments");
        Diag.Debug.assert(args.change, "change type should be passed with work item changed arguments");

        workItem = args.workItem;
        workItemId = workItem.getUniqueId();
        if (workItemId <= 0) {
            // This means the work item has not been created yet.
            return;
        }

        if (this.isTestCaseDialogOpen || args.change === WorkItemChangeType.Opened) {
            // There is no point refreshing the UI when the user is modifying the test case in the dialog.
            // We also do not need to track this because the user can never close the dialog with partially
            // saved test case.
            return;
        }

        Utils_Core.delay(this, 250, () => {
            let i,
                dataRows,
                dataRow;

            // TODO: If there are a lot of test points, this may cause a perf hit. If we do not do this,
            // handling multi-config data will be hard.
            dataRows = this._getDataRowsForWorkItem(workItemId);
            if (dataRows.length > 0) {
                for (i = 0; i < dataRows.length; i++) {
                    dataRow = dataRows[i];
                    this._updatePageRow(workItem);
                    this._updateDirtyStatus(workItem);
                    this._updateTestPointRow(dataRow, dataRow.rowIndex, dataRow.dataIndex, workItem);
                }
            }
            else {
                // Handle the case when the test point has been deleted from a different browser and the case when the 
                // the user has scrolled away the work item that is currently selected.
                this._updatePageRow(workItem);
                this._updateDirtyStatus(workItem);
            }
        });
    }

    public getColumnValue(dataIndex: number, columnIndex: any, columnOrder?: number): any {
        /// <summary>This overrides the base class implementation to show pending changes in the test points grid which were made with the inline work item view</summary>
        /// <param name="dataIndex" type="int">The index for the row data in the data source</param>
        /// <param name="columnIndex" type="int">The index of the column's data in the row's data array</param>
        /// <param name="columnOrder" type="int" optional="true">The index of the column in the grid's column array. This is the current visible order of the column</param>
        /// <returns type="any" />
        let workItemData,
            workitemId,
            columnValue = "";

        workitemId = this._dataSource[dataIndex].testCaseId;
        workItemData = this._pageData[workitemId];

        // Over-ride the base value if there is a work item and it has valid value.
        if (workItemData && workItemData[columnIndex] !== undefined) {
            columnValue = WITOM.Field.convertValueToDisplayString(workItemData[columnIndex]);
        }
        else {
            columnValue = super.getColumnValue(dataIndex, columnIndex, columnOrder);
        }

        return columnValue;
    }

    public resetDirtyItems() {
        let i = 0,
            dirtyWorkItems: WITOM.WorkItem[];
        dirtyWorkItems = Utils_Array.clone(this._dirtyWorkItems);

        for (i = 0; i < dirtyWorkItems.length; i++) {
            dirtyWorkItems[i].reset();
        }

        this._dirtyWorkItems = [];
    }

    public _onColumnResize(column) {
        TMUtils.getTestPlanManager().updateColumnOptions([{ refName: column.name, width: Math.round(column.width) }], false);
    }

    public static getTestCaseIdsFromTestPoints(testPoints: TestsOM.ITestPointModel[]) {
        /// <summary>Return the list of unique testcaseids</summary>
        if (!testPoints) {
            return [];
        }
        let index: number,
            testCaseList: number[] = [],
            testCaseIdMap = {},
            len = testPoints.length;

        for (index = 0; index < len; index++) {
            testCaseIdMap[testPoints[index].testCaseId] = true;
        }

        for (index = 0; index < len; index++) {
            if (testCaseIdMap[testPoints[index].testCaseId]) {
                testCaseList.push(testPoints[index].testCaseId);
                testCaseIdMap[testPoints[index].testCaseId] = false;
            }
        }

        return testCaseList;
    }

    public static getTestCaseAndSuiteListFromTestPoints(testPoints) {
        /// <summary>Return the list of unique testcaseids</summary>
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

    private _customizeColumns(columns: TestsOM.ITestPointGridDisplayColumn[]) {
        let column, tagCellRenderer, typeColorCellRenderer, $gridCell,
            typeName: string,
            $colorCell: JQuery,
            color;

        if (columns) {
            // Customize outcome and id because we override these columns.
            $.each(columns, (index: number, item: TestsOM.ITestPointGridDisplayColumn) => {
                if (Utils_String.ignoreCaseComparer(item.name, "TCM.TestPointOutcome") === 0) {
                    item["getCellContents"] = (rowInfo: any, dataIndex: number, expandedState: number, level: number, column: any, indentIndex: number, columnOrder: number) => {
                        return this._getOutcomeColumn(dataIndex, column, columnOrder);
                    };
                }
                else if ((Utils_String.ignoreCaseComparer(item.type, "System.Int32") === 0) ||
                    (Utils_String.ignoreCaseComparer(item.type, "System.DateTime") === 0)) {
                    item["comparer"] = function (column, order, item1, item2) {
                        return item1[column.name] - item2[column.name];
                    };
                }
                else if (Utils_String.ignoreCaseComparer(item.name, "System.Tags") === 0) {
                    VSS.using(["WorkItemTracking/Scripts/TFS.UI.Tags"], (Module: typeof TFS_UI_Tags_LAZY_LOAD) => {
                        tagCellRenderer = function (rowInfo, dataIndex, expandedState, level, column, indentIndex, columnOrder) {
                            // "this" is the grid instance
                            return TFS_UI_Tags_LAZY_LOAD.TagUtilities.renderTagCellContents(this, dataIndex, column, columnOrder);
                        };

                        typeColorCellRenderer = function (rowInfo, dataIndex, expandedState, level, column, indentIndex, columnOrder) {
                            // Have the grid generate the cell as normal.
                            $gridCell = this._drawCell(rowInfo, dataIndex, expandedState, level, column, indentIndex, columnOrder);

                            // get the work item type name
                            typeName = this.getWorkItemTypeNameByIndex(dataIndex);
                            if (typeName) {
                                const projectName = TFS_Host_TfsContext.TfsContext.getDefault().navigation.project;
                                const colorsProvider = WorkItemTypeColorAndIconsProvider.getInstance();
                                color = colorsProvider.getColor(projectName, typeName);
                                $colorCell = $("<div/>").addClass("work-item-color").css("background-color", color);
                                $colorCell.html("&nbsp;"); // for some reason html doesn't like empty divs when doing alignment, so we are adding a non breaking space.

                                $colorCell.prependTo($gridCell);
                            }
                            return $gridCell;
                        };

                        item["canSortBy"] = false;
                        item["getCellContents"] = tagCellRenderer;
                    });
                }
                else if (item.isIdentity) {
                    let identityCellRenderer = function (rowInfo, dataIndex, expandedState, level, column, indentIndex, columnOrder) {
                        return TFS_UI_Controls_Identities.IdentityViewControl.renderIdentityCellContents(this, rowInfo, dataIndex, expandedState, level, column, indentIndex, columnOrder);
                    };
                    item["getCellContents"] = identityCellRenderer;
                }
            });
        }
    }

    public getWorkitemIdAtDataIndex(dataIndex: number): number {
        if (this._dataSource[dataIndex]) {
            return this._dataSource[dataIndex].testCaseId;
        }
        return 0;
    }

    private _getDataRowsForWorkItem(workItemId: number) {
        let rows = this._rows,
            dataRowsForWorkItem = [],
            index,
            row;
        if (rows) {
            for (index in rows) {
                if (rows.hasOwnProperty(index)) {
                    row = rows[index];
                    if (this._dataSource[row.dataIndex].testCaseId === workItemId) {
                        dataRowsForWorkItem.push(row);
                    }
                }
            }
        }
        return dataRowsForWorkItem;
    }

    private _getSelectedRow(): JQuery {
        if (this._rows && this._selectedIndex >= 0 && this._rows[this._selectedIndex]) {
            return this._rows[this._selectedIndex].row;
        }
    }

    private _updateTestPointRow(rowInfo: any, rowIndex: number, dataIndex: number, workItem: WITOM.WorkItem) {
        super._updateRow(rowInfo, rowIndex, dataIndex, null, null);
        this._updateRowStyle(rowInfo.row, workItem);
    }

    public _updateRow(rowInfo: any, rowIndex: number, dataIndex: number, expandedState: number, level: number) {
        ///<summary>This overrides the base class implementation to set the row style whenever the layout is set</summary>
        let workItemId = this._dataSource[dataIndex].testCaseId;
        super._updateRow(rowInfo, rowIndex, dataIndex, null, null);

        // Do this only when we know that this work item is already fetched. Otherwise, this will endup doing a lot of web service calls.
        if (this._pageData[workItemId]) {
            WorkItemManager.get(WITUtils.getWorkItemStore()).beginGetWorkItem(workItemId, (workItem) => {
                this._updateRowStyle(rowInfo.row, workItem);
            });
        }
    }

    private _updateRowStyle(row: any, workItem: WITOM.WorkItem) {
        if (!row) {
            return;
        }

        row.removeClass("dirty-workitem-row invalid-workitem-row");

        if (workItem && workItem.isDirty()) {
            row.addClass("dirty-workitem-row");

            // If the work item is invalid or has an error associated with it, show the work item as invalid.
            if (!workItem.isValid() || workItem.hasError()) {
                row.addClass("invalid-workitem-row");
            }
        }
    }

    public onColumnsChanged(columns: any[]) {
        this._updatePagedData(columns);
    }

    private _updatePagedData(columns: any[]) {
        let i: number,
            workItemId, l: number, workItem: WITOM.WorkItem,
            workItemManager = WorkItemManager.get(WITUtils.getWorkItemStore());

        for (workItemId in this._pageData) {
            if (this._pageData.hasOwnProperty(workItemId)) {
                workItem = workItemManager.getWorkItem(workItemId);
                if (workItem && workItem.isDirty()) {
                    this._updatePageRow(workItem, columns);
                }
            }
        }
    }

    private _updatePageRow(workItem: WITOM.WorkItem, columns?: any[]) {
        /// <summary>Stores the page data with the current work item information to update the test points grid</summary>
        /// <param name="workItem" type="Object">The work item that we want to update in the grid</param>
        Diag.Debug.assertParamIsObject(workItem, "workItem");

        let i, l, pageColumns, field, workItemId = workItem.id, row, currenColumnRefName;

        if (!this._pageData[workItemId]) {
            this._pageData[workItemId] = [];
        }

        row = this._pageData[workItemId];
        pageColumns = this._columns;
        if (columns) {
            pageColumns = columns;
        }

        for (i = 0, l = pageColumns.length; i < l; i++) {
            currenColumnRefName = pageColumns[i].name;
            field = workItem.getField(currenColumnRefName);

            if (field) {
                if (field.fieldDefinition.id === WITConstants.CoreField.Id) {
                    row[currenColumnRefName] = workItem.getUniqueId();
                }
                else {
                    row[currenColumnRefName] = field.getValue();
                }
            }
            else {
                row[currenColumnRefName] = undefined;
            }
        }
    }

    private _updateDirtyStatus(workItem: WITOM.WorkItem) {
        if (workItem) {
            if (workItem.isDirty()) {
                if ($.inArray(workItem, this._dirtyWorkItems) === -1) {
                    this._dirtyWorkItems.push(workItem);
                }
            }
            else {
                this._updateGridDataSourceForWorkItem(workItem.id);

                delete this._pageData[workItem.id];

                if ($.inArray(workItem, this._dirtyWorkItems) !== -1) {
                    Utils_Array.remove(this._dirtyWorkItems, workItem);
                }
            }
            this._fire("dirtytestcaseschanged");
        }
    }

    private _updateGridDataSourceForWorkItem(id: number) {
        //updating the grid datasource once the Workitem is saved so that we have have the updated data in grid's datasource.
        let dataRows = this._getIndicesInDataSourceForWorkItem(id),
            witData,
            i: number,
            column,
            j: number,
            dataIndex: number;

        if (this._pageData.hasOwnProperty(id.toString())) {
            witData = this._pageData[id];

            for (i = 0; i < this._columns.length; i++) {
                column = this._columns[i];
                if (witData[column.index]) {
                    for (j = 0; j < dataRows.length; j++) {
                        dataIndex = dataRows[j];
                        this._dataSource[dataIndex][column.index] = witData[column.index];
                    }
                }
            }
        }
    }

    private _getIndicesInDataSourceForWorkItem(workItemId: number): number[] {
        let indices: number[] = [],
            i: number = 0,
            len = this._dataSource.length;

        for (i = 0; i < len; i++) {
            if (this._dataSource[i].testCaseId === workItemId) {
                indices.push(i);
            }
        }
        return indices;
    }

    public getContextMenuItems(): any[] {
        /// <summary>gets context menu items list</summary>
        /// <returns type="Object">new list of context menu items</returns>
        let items: any[] = [];
            
        if (LicenseAndFeatureFlagUtils.AreAdvancedTestManagementFeaturesEnabled()) {
            items.push({ rank: 5, id: "open-test-case", text: Resources.OpenTestCaseCommandText, icon: "bowtie-icon bowtie-arrow-open", groupId: "action" },
                { rank: 6, id: "remove-test-case", text: Resources.RemoveTestCaseText, icon: "bowtie-icon bowtie-edit-delete", groupId: "action" },
                { rank: 7, separator: true },
                { rank: 16, id: "bulk-edit-testcases", text: Resources.BulkEditSelectedTestCases, title: Resources.BulkEditSelectedTestCasesTooltip, icon: "bowtie-icon bowtie-edit", groupId: "edit" },
                { rank: 17, id: "bulk-edit-testcases-using-grid", text: Resources.EditTestCasesUsingGrid, title: Resources.EditTestCasesUsingGridTooltip, icon: "bowtie-icon bowtie-edit", groupId: "edit" },
                { rank: 24, id: "assign-configuration-to-test-case", groupId: "modify", text: Resources.AssignConfigurationToTestCases, icon: "bowtie-icon bowtie-server-remote" }
            );

            items.push({ rank: 12, id: "run-test-points-with-options", text: Resources.RunTestWithOptionsText, title: Resources.RunTestWithOptionsTooltip, icon: "bowtie-icon bowtie-media-play-fill", groupId: "execute" });
        }

        items.push(
            { rank: 11, id: "run-test-points", text: Resources.Run, icon: "bowtie-icon bowtie-media-play-fill", groupId: "execute" },
            { rank: 13, id: "resume-test-points", text: Resources.ResumeTestText, icon: "bowtie-icon bowtie-play-resume-fill", groupId: "execute" },
            { rank: 18, separator: true },
            { rank: 19, id: "reset-tests", text: Resources.ResetTestText, icon: "bowtie-icon bowtie-edit-redo", groupId: "status" },
            { rank: 20, id: "pass-tests", text: Resources.PassTestText, icon: "bowtie-icon bowtie-status-success", groupId: "status" },
            { rank: 21, id: "fail-tests", text: Resources.FailTestText, icon: "bowtie-icon bowtie-status-failure", groupId: "status" },
            { rank: 22, id: "block-tests", text: Resources.BlockTestText, icon: "bowtie-icon bowtie-math-minus-circle", groupId: "status" },
            { rank: 23, id: "not-applicable-tests", text: Resources.TestOutcome_NotApplicable, icon: "bowtie-icon bowtie-status-no-fill bowtie-no-fill-not-applicable", groupId: "status" });

        return items;
    }

    private _getDefaultActionArguments(contextInfo: any) {
        return {
            tfsContext: TFS_Host_TfsContext.TfsContext.getDefault(),
            selectedTestPoints: this.getSelectedTestPointIds()
        };
    }

    private getSelectedTestPointIds(): number[] {
        let selectedItems = [],
            rowIndex;

        for (rowIndex in this._selectedRows) {
            if (this._selectedRows.hasOwnProperty(rowIndex)) {
                selectedItems.push(this._dataSource[this._selectedRows[rowIndex]].testPointId);
            }
        }
        return selectedItems;

    }

    private _assignTester(args: any) {
        let tester: TestsOM.ITesterModel;
        if (args.identity) {

            /*if (FeatureAvailability_Services.FeatureAvailabilityService.isFeatureEnabled(ServerConstants.FeatureAvailabilityFlags.WebAccessAgileUseNewIdentityControls)) {
                tester = new TestsOM.ITesterModel(args.identity.localId,
                    args.identity.displayName,
                    args.identity.signInAddress,
                    TFS_OM_Identities.IdentityHelper.getUniquefiedIdentityName(args.identity)
                    );
            }
            else {
                tester = new TestsOM.ITesterModel(args.identity.id,
                    args.identity.displayName,
                    args.identity.uniqueName,
                    TFS_OM_Identities.IdentityHelper.getUniquefiedIdentityName(args.identity)
                    );
            }*/

            tester = new TestsOM.ITesterModel(args.identity.id,
                args.identity.displayName,
                args.identity.uniqueName,
                TFS_OM_Identities.IdentityHelper.getUniquefiedIdentityName(args.identity)
                );
            this.assignTesterEvent(args.selectedTestPoints, tester);
        }
        else if (TMUtils.CommonIdentityPickerHelper.featureFlagEnabled) {
            Diag.logTracePoint("[AssignTestersToSuite.LaunchDialogue]: method called");
            VSS.using(["TestManagement/Scripts/TFS.TestManagement.AssignTesters"], (Module: typeof AssignTester_LAZY_LOAD) => {
                Dialogs.show(Module.AssignTesterIdentityPickerDialog, $.extend({
                    width: AssignTester_LAZY_LOAD.AssignTesterIdentityPickerDialog.DIALOG_WIDTH,
                    height: AssignTester_LAZY_LOAD.AssignTesterIdentityPickerDialog.DIALOG_HEIGHT,
                    tableLabel: Resources.AssignTesterTitle, //text-box prompt
                    contentHeader: Resources.AssignTesterTitle, //titlebar
                    contentDescription: Resources.AssignTesterDialogDescription, //description of dialog
                    resizable: false,
                    saveCallback: (resolvedEntities) => {
                        if (resolvedEntities && resolvedEntities.length > 0) {
                            let tester = new TestsOM.ITesterModel(resolvedEntities[0].localId,
                                resolvedEntities[0].displayName,
                                resolvedEntities[0].signInAddress,
                                resolvedEntities[0].signInAddress
                                );
                        }

                        this.assignTesterEvent(args.selectedTestPoints, tester);
                    }
                }));
            });
        }
    }

    private _getSortOrder(sortOrder: TestsOM.IColumnSortOrderModel): any {
        /// <summary>gets default soring done</summary>
        /// <returns type="Object">list of cloumns to ge sorted by default</returns>
        let sortColumns = [];
        if (sortOrder) {
            sortColumns.push({ index: sortOrder.index, order: sortOrder.order });
        }

        return sortColumns;
    }

    private _updateContextMenuCommandStates(menu: any) {
        /// <summary>updates context menu items list</summary>
        /// <param name="menu" type="Object">the menu to update</param>
        let item = this.getSelectedTestPoint();

        menu.updateCommandStates([{
            id: "assign-configuration-to-test-case",
            disabled: (this.getSelectionCount() === 0)
        }]);

        menu.updateCommandStates([{
            id: "open-test-case",
            disabled: !(item && this.getSelectionCount() === 1)
        }]);

        menu.updateCommandStates([{
            id: "bulk-edit-testcases",
            disabled: (this.getSelectionCount() === 0)
        }]);

        menu.updateCommandStates([{
            id: "bulk-edit-testcases-using-grid",
            disabled: !(this.canShowRemoveTestsDelegate ? this.canShowRemoveTestsDelegate() && this.getSelectionCount() > 0 : true)
        }]);

        menu.updateCommandStates([{
            id: "remove-test-case",
            disabled: !(this.canRemoveTestsDelegate ? this.canRemoveTestsDelegate() : true),
            hidden: !(this.canShowRemoveTestsDelegate ? this.canShowRemoveTestsDelegate() : true)
        }]);

        menu.updateCommandStates([{
            id: "run-test-points",
            disabled: !(this.canRunTestsDelegate ? this.canRunTestsDelegate() : true)
        }]);

        menu.updateCommandStates([{
            id: "run-test-points-using-client",
            disabled: !(this.canRunTestsDelegate ? this.canRunTestsDelegate() : true)
        }]);

        menu.updateCommandStates([{
            id: "run-test-points-with-options",
            disabled: !(this.canRunTestsDelegate ? this.canRunTestsDelegate() : true)
        }]);

        menu.updateCommandStates([{
            id: "pass-tests",
            disabled: !(this.canSetOutcomeDelegate ? this.canSetOutcomeDelegate() : true)
        }]);
        menu.updateCommandStates([{
            id: "fail-tests",
            disabled: !(this.canSetOutcomeDelegate ? this.canSetOutcomeDelegate() : true)
        }]);

        menu.updateCommandStates([{
            id: "block-tests",
            disabled: !(this.canRunTestsDelegate ? this.canRunTestsDelegate() : true)
        }]);

        menu.updateCommandStates([{
            id: "reset-tests",
            disabled: !(this.canResetTestPointsDelegate ? this.canResetTestPointsDelegate() : true)
        }]);
        menu.updateCommandStates([{
            id: "not-applicable-tests",
            disabled: !(this.isTestNotApplicableDelegate ? this.isTestNotApplicableDelegate() : true)
        }]);
        menu.updateCommandStates([{
            id: "resume-test-points",
            disabled: !(this.canResumeTestsDelegate ? this.canResumeTestsDelegate() : true)
        }]);

    }

    private _onContextMenuItemClick(e?: any) {
        /// <summary>executes upon executing a right click command from the context menu</summary>
        /// <param name="e" type="Object">event related info</param>
        let command = e.get_commandName();
        if (command === "assign-configuration-to-test-case") {
            this.assignConfigurationToTestCases();
        }
        if (command === "open-test-case") {
            this.openSelectedTestCase();
        }
        else if (command === "remove-test-case") {
            this._removeTestCase();
        }
        else if (command === "run-test-points") {
            this.runTestPointsEvent();
        }
        else if (command === "run-test-points-using-client") {
            this.runTestPointsUsingClientEvent();
        }
        else if (command === "run-test-points-with-options") {
            this.runTestPointsWithOptionsEvent();
        }
        else if (command === "pass-tests") {
            this._setOutcome(TCMConstants.TestOutcome.Passed);
        }
        else if (command === "fail-tests") {
            this._setOutcome(TCMConstants.TestOutcome.Failed);
        }
        else if (command === "block-tests") {
            this._setOutcome(TCMConstants.TestOutcome.Blocked);
        }
        else if (command === "reset-tests") {
            this._resetTestPoints();
        }
        else if (command === "not-applicable-tests") {
            this._setOutcome(TCMConstants.TestOutcome.NotApplicable);
        }
        else if (command === "bulk-edit-testcases") {
            this._bulkEditTestCases();
        }
        else if (command === "bulk-edit-testcases-using-grid") {
            this.bulkEditTestCasesUsingGridEvent(this._getSelectedTestCaseIds());
        }
        else if (command === "resume-test-points") {
            this.resumeTestPointsEvent();
        }
    }

    private _bulkEditTestCases() {
        VSS.using(["TestManagement/Scripts/TFS.TestManagement.TestCaseBulkEdit"], (Module: typeof TestCaseBulkEdit_LAZY_LOAD) => {
            TestCaseCategoryUtils.getAllWorkItemTypeForTestCaseCategory(
                (workItemTypes: string[]) => {
                    let bulkEdit = new Module.BulkEditTestCases();
                    let projectTypeMapping: IDictionaryStringTo<string[]> = {};
                    // test management is never cross project, so we're safe to use the current project.
                    // plus the call to getting the work item types is scoped to current project.
                    projectTypeMapping[TFS_Host_TfsContext.TfsContext.getDefault().navigation.project] = workItemTypes;
                    bulkEdit._bulkEditTestCases(this._getSelectedTestCaseIds(), projectTypeMapping);
                });
        });
    }

    private _getSelectedTestCaseIds(): number[] {
        let testPoints: TestsOM.ITestPointModel[] = this.getSelectedTestPoints();
        return TestPointsGrid.getTestCaseIdsFromTestPoints(testPoints);
    }

    private _removeTestCase() {
        let testPoints = this.getSelectedTestPoints();

        if ($.isFunction(this.removeTestCaseEvent)) {
            this.removeTestCaseEvent(testPoints);
        }
    }

    private _setOutcome(outCome) {
        let testPoints = this.getSelectedTestPoints();
        if (testPoints && this.setOutcomeEvent) {
            this.setOutcomeEvent(testPoints, outCome);
        }
    }

    private _resetTestPoints() {
        let testPoints = this.getSelectedTestPoints();

        if (testPoints && this.resetTestPointsEvent) {
            this.resetTestPointsEvent(testPoints);
        }
    }

    private _getOutcomeColumn(dataIndex: number, column: any, columnOrder: number) {
        let $div: JQuery = $(domElem("div", "grid-cell")),
            $outcomeElement: JQuery,
            outcomeText: string,
            $outcomeTextElement: JQuery,
            width: any = Math.round(column.width) || 20;

        $div.css("width", (isNaN(width) ? width : width + "px"));

        outcomeText = super.getColumnText(dataIndex, column, columnOrder);
        $outcomeTextElement = $(domElem("span", "outcome-text"));
        $outcomeTextElement.text(outcomeText)
            .addClass("test-outcome-column-text")
            .css("max-width", $div.css("width"));

        $outcomeElement = $(domElem("div", "outcome-container"));
        $outcomeElement.addClass("testpoint-outcome-shade icon")
            .addClass(TestPointsGrid.getOutcomeShadeClassNameFromOutcomeText(outcomeText));

        //set the title property to have the tooltip set properly
        $div.attr("title", outcomeText)
            .append($outcomeElement)
            .append($outcomeTextElement);
        return $div;
    }

    public static getOutcomeShadeClassNameFromOutcomeText(outcomeText: string): string {
        Diag.Debug.assertIsNotNull(outcomeText, "outcomeText is a required parameter");

        let className: string;

        switch (outcomeText) {
            case Resources.TestOutcome_Blocked:
                className = "bowtie-icon bowtie-math-minus-circle bowtie-icon-small";
                break;
            case Resources.TestOutcome_Passed:
            case Resources.TestPointState_Completed:
                className = "bowtie-icon bowtie-status-success bowtie-icon-small";
                break;
            case Resources.TestOutcome_Failed:
            case Resources.TestOutcome_Aborted:
            case Resources.TestOutcome_Error:
            case Resources.TestOutcome_NotExecuted:
            case Resources.TestOutcome_Timeout:
            case Resources.TestOutcome_Warning:
                className = "bowtie-icon bowtie-status-failure bowtie-icon-small";
                break;
            case Resources.TestPointState_Ready:
                className = "bowtie-icon bowtie-dot bowtie-icon-small";
                break;
            case Resources.TestPointState_InProgress:
                className = "bowtie-icon bowtie-status-run bowtie-icon-small";
                break;
            case Resources.TestOutcome_NotApplicable:
            case Resources.TestOutcome_Inconclusive:
                className = "bowtie-icon bowtie-status-no-fill bowtie-no-fill-not-applicable bowtie-icon-small";
                break;
            case Resources.TestPointState_Paused:
                className = "bowtie-icon bowtie-status-pause bowtie-icon-small";
                break;
            default:
                className = "bowtie-icon bowtie-dot bowtie-icon-small";
                break;
        }
        return className;
    }

    private assignConfigurationToTestCases() {
        let testPoints = this.getSelectedTestPoints();
        if (testPoints && this.assignConfigurationEvent) {
            let testCaseAndSuiteList = TestPointsGrid.getTestCaseAndSuiteListFromTestPoints(testPoints);
            this.assignConfigurationEvent(testCaseAndSuiteList);
        }
    }

    public bindFilterManager(filterManager: FilterManager) {
        /// <summary>Couples the filterManager's filtering actions to this grid.</summary>
        /// <param name="filterManager" type="FilterManager">The filterManager that should be binded with this grid.</param>
        let workitemStore;

        Diag.Debug.assert(!this._filterManager, "FilterManager has already been set");
        this._filterManager = filterManager;

        this.bindFilterManagerEvents(filterManager);
    }

    public bindFilterManagerEvents(filterManager: FilterManager) {
        /// <summary>Couples the filterManager's filtering events to this grid.</summary>
        /// <param name="filterManager" type="Object">The filterManager that should affect this grid.</param>
        Diag.Debug.assertParamIsType(filterManager, FilterManager, "filterManager");

        // Attach to filter changed event
        filterManager.attachEvent(FilterManager.EVENT_FILTER_CHANGED, () => {
            this.filterWorkItems(filterManager.filter());
        });

        // Attach to filter cleared event
        filterManager.attachEvent(FilterManager.EVENT_FILTER_CLEARED, () => {
            this.restoreUnfilteredState();
        });
    }

    public filterWorkItems(ids: number[]) {
        /// <summary> Filters down the grid to only the specified workitem ids</summary>
        /// <param name="ids" type="Array">Array of workitem ids that can still be shown</param>
        Diag.Debug.assertParamIsArray(ids, "ids");

        let dataSource: any;

        dataSource = this._getFilteredTestPointsData(ids);

        // overwrite the testpoints data for the grid
        this._options.source = dataSource;

        this._filterApplied = true;

        this.initializeDataSourceAndSort();
    }

    public restoreUnfilteredState() {
        /// <summary>Returns the grid to its unfiltered state.</summary>
        let previouslySelectedTestPointId: number;

        if (this._filterApplied && this._unfilteredWorkItemIds) {
            this._reinstateUnfilteredData();
            this.cleanUpTagsFilter();

            this.initializeDataSourceAndSort();
        }
    }

    public initializeDataSourceAndSort() {
        //If the sort order was changed by the user, update the the _options.sortOrder for the grid
        if (this.sortOrder) {
            this._options.sortOrder = this._getSortOrder(this.sortOrder);
        }
        this.initializeDataSource();
        this.onSort(this._options.sortOrder);
    }

    public cleanUpTagsFilter() {
        // Clear filter values
        this._filterApplied = false;
    }

    private _reinstateUnfilteredData() {
        /// <summary>Reinstates the unfiltered values that were cached when filters were applied.</summary>

        // revert the workitems back to the unfiltered state
        this._options.source = this._originalDataSource;
    }


    public getUnfilteredWorkItemIds(): number[] {
        //// <summary>Returns the workitems for the grid prior to filtering.  If no filter is applied, returns all the work item ids in the grid.</summary>
        if (this._unfilteredWorkItemIds) {
            return this._unfilteredWorkItemIds.slice(0);
        }
        return [];
    }

    public getWorkItemIdsFromDataSource(dataSource: any): number[] {
        let i: number,
            length: number = dataSource.length,
            workitemIds: number[] = [];
        for (i = 0; i < length; i++) {
            workitemIds.push(dataSource[i].testCaseId);
        }
        return workitemIds;
    }

    private _getFilteredTestPointsData(filteredIds: number[]): any {
        /// <summary>Gets the filtered testPoints data based on the order of the originalIds, maintaining order</summary>
        /// <param name="filteredIds" type="Array" innerType="number">An array of work item ids that are filtered</param>
        /// <returns>The ordered array of testpoints. </returns>

        let sortedTestPointsData: any[] = [],
            filteredIdsHash: { [index: number]: boolean } = {},
            unfilteredWorkItemIds = this.getWorkItemIdsFromDataSource(this._originalDataSource);

        filteredIds = Utils_Array.unique<number>(filteredIds);

        // build lookup table
        $.each(filteredIds, (i, filteredId) => {
            filteredIdsHash[filteredId] = true;
        });

        // Go through the original ids in order and keep them if they are part of the filtered set
        sortedTestPointsData = $.map(unfilteredWorkItemIds, (workItemId, i) => {
            if (filteredIdsHash[workItemId]) {
                return this._originalDataSource[i];
            }
        });

        return sortedTestPointsData;
    }
}

VSS.initClassPrototype(TestPointsGrid, {
    _tfsContext: null,
    refreshTestPointsEvent: null,
    refreshSelectedTestSuiteEvent: null,
    setOutcomeEvent: null,
    resetTestPointsEvent: null,
    removeTestCaseEvent: null,
    canSetOutcomeDelegate: null,
    canResetTestPointsDelegate: null,
    canResumeTestsDelegate: null,
    canRunTestsDelegate: null,
    canRemoveTestsDelegate: null,
    testCaseModified: false,
    runTestPointsEvent: null,
    runTestPointsUsingClientEvent: null,
    runTestPointsWithOptionsEvent: null,
    resetFiltersEvent: null,
    resumeTestPointsEvent: null,
    bulkEditTestCasesUsingGridEvent: null,
    assignTesterEvent: null,
    _workItemChangedDelegate: null,
    _pageData: {},
    _unfilteredWorkItemIds: null,
    _workItemIds: null,
    _filterApplied: false,
    _originalDataSource: null
});

export class FilterHelper {

    private static _getUniqueFilterValues(records: any[], key: string, currentFilterValue: string, defaultValues: string[]) {
        let uniqueValues = [];
        uniqueValues = uniqueValues.concat(defaultValues);
        // Always add the currently selected item to the values.
        // This is to ensure that after we have filtered, if we
        // perform operations which results in records not having the
        // selected filtered value, then the filter will be reset.
        if (currentFilterValue && currentFilterValue !== FilterHelper.ALL_FILTER && $.inArray(currentFilterValue, uniqueValues) === -1) {
            uniqueValues.push(currentFilterValue);
        }

        // Get the unique record values for the key and sort it.
        $(records).each(function (i, record) {
            if (!Utils_Array.contains(uniqueValues, record[key])) {
                if (!record[key]) {
                    if (!Utils_Array.contains(uniqueValues, FilterHelper.NONE_FILTER)) {
                        uniqueValues.push(FilterHelper.NONE_FILTER);
                    }
                }
                else {
                    uniqueValues.push(record[key]);
                }
            }
        });

        return uniqueValues;
    }

    private static _removeUnwantedFilters(filters) {
        let valueFilters = [];

        $(filters).each(function (i, item: any) {
            if (item.value !== FilterHelper.ALL_FILTER) {
                if (item.value === FilterHelper.NONE_FILTER) {
                    item.value = null;
                }

                valueFilters.push(item);
            }
        });

        return valueFilters;
    }

    public static ALL_FILTER: any = Resources.FilterItemAll;
    public static NONE_FILTER: any = Resources.NoneFilterValue;

    public static getUniqueFilterValues(records: any[], key: string, currentFilterValue: string, defaultValues: string[]) {
        ///<summary>Gets unique filter values in the records for the specfied key</summary>
        let uniqueValues = [];

        uniqueValues = this._getUniqueFilterValues(records, key, currentFilterValue, defaultValues);

        return this.getFilterItemsFromUniqueValues(uniqueValues, currentFilterValue);
    }

    public static getFilterItemsFromUniqueValues(values, currentFilterValue: string) {

        let filterValues = [];
        // Add "All" as the first filter value.
        filterValues.push({
            text: FilterHelper.ALL_FILTER,
            value: FilterHelper.ALL_FILTER,
            selected: !currentFilterValue || currentFilterValue === FilterHelper.ALL_FILTER,
            title: FilterHelper.ALL_FILTER
        });

        values.sort((a: string, b: string) => {
            return Utils_String.localeIgnoreCaseComparer(a, b);
        });
        // Populate the filter item values.
        $(values).each(function (i, item) {
            filterValues.push({
                text: item,
                value: item,
                selected: (currentFilterValue && currentFilterValue === <any>item) ? true : false,
                title: item
            });
        });

        return filterValues;
    }

    public static filter(records, filterSpec) {
        /// <summary> Filters the records based on the filter spec. The filter spec is an array of objects in the following 
        /// format:
        /// [{
        ///      key: key1,
        ///      value: value1
        ///  },
        ///  {
        ///      key: key2,
        ///      value: value2
        ///  },
        ///  ...
        ///  ]
        /// The function filters records so that all filered records match the values for the specified keys.
        /// </summary>
        let filteredItems = [],
            valueFilters = null,
            i = 0,
            matchFound = true;

        if (!filterSpec) {
            return records;
        }

        // Remove all filters whose value matches "All" as they do not play a role in filtering.
        valueFilters = this._removeUnwantedFilters(filterSpec);
        if (valueFilters.length === 0) {
            return records;
        }

        // Do the actual filtering.
        $(records).each(function (index, item) {
            matchFound = true;
            // Ensure that we match the value for every key specified in the filter.
            for (i = 0; i < valueFilters.length; i++) {
                matchFound = matchFound && item[valueFilters[i].key] === valueFilters[i].value;
                if (!matchFound) {
                    break;
                }
            }

            if (matchFound) {
                filteredItems.push(item);
            }
        });

        return filteredItems;
    }

    constructor() {
    }
}

class FilterSelectors {
    public static tester = ".tester-filter";
    public static outcome = ".testpoint-outcome-filter";
    public static configuration = ".configuration-filter";
    public static workItemPanePosition = ".work-items-pane-filter";
    public static view = ".view-filter";
    public static pane = ".pane-filter";
}

export class GridAreaSelectors {
    public static viewGrid = ".test-view-grid-area";
    public static editGrid = ".test-edit-grid-area";
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

    private static farRightPaneTitle: string = ".far-right-pane-title";

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
    private _lastPaneMode: any;
    private _lastPanePosition: any;
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
            cssClass: "test-details-pane-grid",
            initialSelection: false,
            draggable: false
        }, options));
    }

    public initialize() {
        /// <summary>Initialize the base </summary>
        Diag.logTracePoint("TestDetailsPaneGrid.initialize.start");
        super.initialize();
        this._testPlanManager = TFS_OM_Common.ProjectCollection.getConnection(this._tfscontext).getService<TestsOM.TestPlanManager>(TestsOM.TestPlanManager);
        this._testResultManager = TFS_OM_Common.ProjectCollection.getConnection(this._tfscontext).getService<TestsOM.TestResultManager>(TestsOM.TestResultManager);
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

    public onOpenRowDetail(): boolean {
        /// <summary>opens the selected test detail item</summary>
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
        $outcomeTextElement = $(domElem("span", "outcome-text"));
        $outcomeTextElement.text(outcomeText)
            .addClass("test-outcome-column-text")
            .css("max-width", $div.css("width"));

        if (column.index === "outcome") {
            iconClass = TestPointsGrid.getOutcomeShadeClassNameFromOutcomeText(outcomeText);
        }
        else if (column.index === "suiteTitle") {
            suiteType = this._dataSource[dataIndex].suiteType;
            iconClass = TMUtils.getSuiteIcon(suiteType);
        }
        $outcomeElement = $(domElem("div", "outcome-container"));
        $outcomeElement.addClass("testpoint-outcome-shade icon")
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
        if (positionFilter === "off") {
            return;
        }
        if (forceRefresh || paneFilter !== this._lastPaneMode || positionFilter !== this._lastPanePosition || testCaseID !== this._lastTestCaseId) {
            Diag.logTracePoint("TestDetailsPaneGrid.refreshList actually starting to refresh");
            this._cleanupTestDetailsPaneGrid();
            this._lastPaneMode = paneFilter;
            this._lastPanePosition = positionFilter;
            this._lastTestCaseId = testCaseID;
            if (paneFilter === TestHubView.paneMode_suites) {
                Diag.logTracePoint("TestDetailsPaneGrid.refreshList initializing Suites pane");
                this._element.parent().parent().find(TestDetailsPaneGrid.farRightPaneTitle).text(Resources.ReferencedTestSuitesPaneStatusTitle);
                if (testCaseID !== 0) {
                    Diag.logTracePoint("getSuitesForTestCase.begin");
                    this._testPlanManager.getSuitesForTestCase(testCaseID, (testSuite) => {
                        Diag.logTracePoint("getSuitesForTestCase.end");
                        if (this.getSelectedTestCaseDelegate && this.getSelectedTestCaseDelegate() === testCaseID &&
                            this.getSelectedPaneModeDelegate && this.getSelectedPaneModeDelegate() === TestHubView.paneMode_suites) {
                            Diag.logTracePoint("TestDetailsPaneGrid.refreshList starting to populate suites data");
                            this.populateGridData(testSuite, paneFilter, testCaseID);
                        }
                    },
                        (error) => {
                            alert(VSS.getErrorMessage(error));
                        });
                }
            }
            else if (paneFilter === TestHubView.paneMode_results) {
                Diag.logTracePoint("TestDetailsPaneGrid.refreshList initializing Results pane");
                this._element.parent().parent().find(TestDetailsPaneGrid.farRightPaneTitle).text(Resources.TestResultsPaneTitle);
                if (testCaseID != 0) {
                    Diag.logTracePoint("getTestCaseResultForTestCaseId.begin");
                    this._testResultManager.getTestCaseResultForTestCaseId(testCaseID, (results: any) => {
                        Diag.logTracePoint("getTestCaseResultForTestCaseId.end");
                        if (this.getSelectedTestCaseDelegate && this.getSelectedTestCaseDelegate() === testCaseID &&
                            this.getSelectedPaneModeDelegate && this.getSelectedPaneModeDelegate() === TestHubView.paneMode_results) {
                            Diag.logTracePoint("TestDetailsPaneGrid.refreshList starting to populate results data");
                            this.populateGridData(results, paneFilter, testCaseID);
                        }
                    },
                        (error) => {
                            alert(VSS.getErrorMessage(error));
                        });
                }
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

        if (paneFilter === TestHubView.paneMode_results && length === 0 && testCaseId !== 0) {
            this._selectedIndex = -1;
            this.updateOpenTestDetailCommandState(true);
            this.showError(Resources.NoTestResultForTestCase);
            return;
        }
        this.updateOpenTestDetailCommandState(false);
        this._clearError();

        if (paneFilter === TestHubView.paneMode_suites) {
            for (i = 0, l = length; i < l; i++) {
                row = this._populateSuitePaneGridRow(payloadData[i]);
                rawSource.push(row);
            }
            columns = [TestDetailsPaneGrid._testSuiteTitleColumn, TestDetailsPaneGrid._testSuiteStatusColumn, TestDetailsPaneGrid._testSuitePlanColumn, TestDetailsPaneGrid._testSuiteProjectColumn];
        }
        else if (paneFilter === TestHubView.paneMode_results) {
            for (i = 0, l = length; i < l; i++) {
                row = this._populateResultsPaneGridRow(payloadData[i]);
                if (row[TestsOM.ResultsPaneColumnIds.Outcome] !== "") {
                    rawSource.push(row);
                }
            }
            columns = [TestDetailsPaneGrid._testResultOutcomeColumn, TestDetailsPaneGrid._testResultConfigurationColumn, TestDetailsPaneGrid._testResultRunByColumn, TestDetailsPaneGrid._testResultDurationColumn, TestDetailsPaneGrid._testResultDateColumn, TestDetailsPaneGrid._testResultPlanIdColumn, TestDetailsPaneGrid._testResultPlanNameColumn, TestDetailsPaneGrid._testResultSuiteIdColumn, TestDetailsPaneGrid._testResultSuiteNameColumn];
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

/**
 * Defines the shortcuts for the test
 */
export class TestShortcutGroup extends TfsCommon_Shortcuts.ShortcutGroupDefinition {

    constructor(private view: TestHubView) {
        super(Resources.TestShortcutGroupName);

        this.registerPageNavigationShortcut(
            "1",
            {
                description: Resources.TestsShortcutText,
                action: () => this._performAction(() => {
                    this.navigateToUrl(TMUtils.UrlHelper.getTestPlanHubUrl("tests", this.view.getCurrentPlanId(), this.view.getCurrentSuiteId()));
                }),
                allowPropagation: true
            });
        this.registerPageNavigationShortcut(
            "2",
            {
                description: Resources.ChartsShortcutText,
                action: () => this._performAction(() => {
                    this.navigateToUrl(TMUtils.UrlHelper.getTestPlanHubUrl("charts", this.view.getCurrentPlanId(), this.view.getCurrentSuiteId()));
                }),
                allowPropagation: true
            });
    }

    public removeGlobalShortcut() {
        this.shortcutManager.removeShortcutGroup(TfsCommon_Resources.KeyboardShortcutGroup_Global);
    }

    private _performAction(action: any) {

        if (this.view.allowKeyboardShortcuts()) {
            action();
        }
    }
}

export class ListViewShortcutGroup extends TfsCommon_Shortcuts.ShortcutGroupDefinition {

    constructor(private view: TestHubView) {
        super(Resources.TestShortcutGroupName);
        let _isAdvanceUser = LicenseAndFeatureFlagUtils.AreAdvancedTestManagementFeaturesEnabled();
        this.registerShortcut(
            "e",
            {
                description: Resources.RunTestShortcutText,
                action: () => this.view.rightPaneOptions(this.view._testPointToolbarItemIds.runTestPoints)
            });
        this.registerShortcut(
            "t b",
            {
                description: Resources.BlockTestsShortcutText,
                action: () => this.view.rightPaneOptions(this.view._testPointToolbarItemIds.blockTest)
            });
        this.registerShortcut(
            "t f",
            {
                description: Resources.FailTestsShortcutText,
                action: () => this.view.rightPaneOptions(this.view._testPointToolbarItemIds.failTest)
            });
        this.registerShortcut(
            "t n",
            {
                description: Resources.NotApplicableTestsShortcutText,
                action: () => this.view.rightPaneOptions(this.view._testPointToolbarItemIds.notApplicableTest)
            });
        this.registerShortcut(
            "t p",
            {
                description: Resources.PassTestsShortcutText,
                action: () => this.view.rightPaneOptions(this.view._testPointToolbarItemIds.passTest)
            });
        this.registerShortcut(
            "t r",
            {
                description: Resources.ResetTestsShortcutText,
                action: () => this.view.rightPaneOptions(this.view._testPointToolbarItemIds.resetTest)
            });

        if (_isAdvanceUser) {
            this.registerShortcut(
                "v g",
                {
                    description: Resources.GridViewShortcutText,
                    action: () => this.view.handleViewFilter("grid")
                });
        }
    }
}

export class GridViewShortcutGroup extends TfsCommon_Shortcuts.ShortcutGroupDefinition {

    constructor(private view: TestHubView) {
        super(Resources.TestShortcutGroupName);

        this.registerShortcut(
            "v l",
            {
                description: Resources.ListViewShortcutText,
                action: () => this.view.handleViewFilter("list")
            });
    }
}

export class TestHubView extends Navigation.NavigationView {

    public static enhancementTypeName: string = "tfs.testManager.TestHubView";
    public static paneMode_suites: string = "referencedSuites";
    public static paneMode_results: string = "resultsPane";

    public _testPointToolbarItemIds: any;

    private _currentPlan: any;
    private _savedColumns: TestsOM.ITestPointGridDisplayColumn[] = [];
    private _savedTestPointPaneColumns: TestsOM.LatestTestOutcomeColumnIds[] = [];
    private _sortOrder: TestsOM.IColumnSortOrderModel;
    private _wereColumnsChanged: boolean = false;
    private _tagFilterProvider: any;
    private _filterBar: any;
    private _filterManager: FilterManager;
    private _testPlanAndSuitesCommandIds: any;
    private _testPointList: any;
    private _bulkEditGrid: any;
    private _orderTestsControl: any;
    private _bulkEditTestsViewModel: BulkEditTestsVM.BulkEditTestsViewModel;
    private _plansSelector: any;
    private _testPlanManager: any;
    private _testRunManager: any;
    private _$errorDiv: any;
    private _$iterationDatesSpan: JQuery;
    private _testSuitesTree: any;
    private _testPointsToolbar: any;
    private _testPlanAndSuitesMenubar: Menus.MenuBar;
    private _$testDetailsPaneOpenMenuItem: JQuery;
    private _$toolbar: JQuery;
    private _$farRightPaneHubPivot: JQuery;
    private _farRightPaneToolbar: any;
    private _testPointOutcomeFilter: any;
    private _testerFilter: any;
    private _configurationFilter: any;
    private _viewFilter: any;
    private _cachedTestPointData: any;
    private _cachedTotalTestPointCount: any;
    private _splitter: any;
    private _workItemForm: any;
    private _viewPaneForm: any;
    private _viewPaneList: TestDetailsPaneGrid;
    private _workItemPaneMode: string;
    private _previousPaneOnPosition: string;
    private _savedPanePosition: string;
    private _savedPaneFilterItem: string;
    private _positionFilter: any;
    private _paneFilter: any;
    private _testersInPlan: TestsOM.ITesterModel[];
    private _configurationsInPlan: TestsOM.ITestConfigurationModel[];
    private _selectedPlanIdAndSuiteId: any;
    private _bugCategoryTypeName: string;
    private _saving: boolean;
    private _testPlanCreationHelper: TMUtils.PlanCreationHelper;
    private _teamHelper: TeamHelper;
    private _newTestCaseAddedToSuite: boolean;
    private _testViewRightPaneGrid: any;
    private _currentTeamFieldInfo: TestsOM.TeamFieldModel;
    private _testCaseHasTeamField: boolean;
    private _webSettingsService: TFS_WebSettingsService.WebSettingsService;
    private _webSettingsCollectionService: TFS_WebSettingsService.WebSettingsService;
    private _testDetailsPaneToolbarItemIds: any;
    private _testPlansFilterIds: any;
    private _testPlanFilterMenubar: Menus.MenuBar;

    private _testPointFieldsMap: any;
    private _inEditMode: boolean;
    public currentWorkItemId: any;
    private _exportHtmlWindow: any;

    private _tabs: Navigation.PivotView;
    private _testManagementChartsView: any;
    private _testManagementChartsInfoBar: any;
    private _selectedPivot: string;
    private _$requirementToolBar: JQuery;
    private _requirementId: number;

    private _gridGroupName = "grid";
    private _listGroupName = "list";
    private _chartsGroupName = "charts";
    private _currentView: string = "list";
    private _testhubCommonShortcutGroup: TMShortcutsControls.TestHubCommonShortcutGroup;
    private _testShortcutGroup: TestShortcutGroup;
    private _listViewShortcutGroup: ListViewShortcutGroup;
    private _gridViewShortcutGroup: GridViewShortcutGroup;
    private _messageArea: MessageArea.MessageAreaView;
    private _messageAreaViewModel: MessageArea.MessageAreaViewModel;

    private _showTestsFromChild: boolean = false;
    private _pageHelper: PageHelper.PageHelper;
    private _pagingInProgress: boolean = false;
    private _rowIndexToScrollAfterFetch: number = -1;
    private pageFetched: () => void;
    private _outcomeFilterApplied: boolean = false;
    private _testerFilterApplied: boolean = false;
    private _configurationFilterApplied: boolean = false;
    private _runWithOptionsDialog: any;

    constructor(options?: any) {
        /// <summary>Construct the test manager object . This handles the interaction and fetching data for plans combobox, testsuite treeview and testcase</summary> 
        /// <param name="options" type="Object">the options for this control</param>
        super(options);
        this._newTestCaseAddedToSuite = false;
        this._messageAreaViewModel = new MessageArea.MessageAreaViewModel();
    }

    public initialize() {

        /// <summary>Initalilizes the control. Creates plans combobox and test suites tree. Also does the work of hookung up navigation</summary>
        Diag.logTracePoint("TestHubView.initialize.start");

        super.initialize();

        this._currentPlan = {};
        this._testPlanManager = TFS_OM_Common.ProjectCollection.getConnection(this._options.tfsContext).getService<TestsOM.TestPlanManager>(TestsOM.TestPlanManager);
        this._testViewRightPaneGrid = this._element.find(".test-view-right-pane");

        this._webSettingsCollectionService = TFS_OM_Common.ProjectCollection.getConnection(this._options.tfsContext).getService<TFS_WebSettingsService.WebSettingsService>(TFS_WebSettingsService.WebSettingsService);

        this._bindFocusOut();

        this._testPlanCreationHelper = new TMUtils.PlanCreationHelper();

        this._teamHelper = new TeamHelper();

        // Create plans drop down
        this._createPlansDropDown();

        // Create Test plans filter for simplified selection
        this._createTestPlansFilter();

        // create the test plan and suites toolbar
        this._createPlansAndSuitesToolbar();

        // Create suites section
        this._createSuitesSection();

        this._enhancePaneSelectionFilter();

        this._testPointList = <TestPointsGrid>Controls.BaseControl.createIn(TestPointsGrid, this._element.find(GridAreaSelectors.viewGrid), {
            onMiddleRowVisible: delegate(this, this.fetchMoreTestPoints)
        });

        this._createBulkEditGrid();

        this._createSuiteReferencePane();

        this._initializeEvents();

        this._createTestPointsToolbar();

        this._createTagFilterBar();

        // Create filteres.
        this._createFilters();

        this._updateTesterFilterOnUrl();


        //setup keyborad shortcuts
        this._testhubCommonShortcutGroup = new TMShortcutsControls.TestHubCommonShortcutGroup(delegate(this, this.allowKeyboardShortcuts));
        this._testShortcutGroup = new TestShortcutGroup(this);
        this._listViewShortcutGroup = new ListViewShortcutGroup(this);

        // Setup navigation.
        this._setupNavigation();


        $("<div />").addClass(TMUtils.TcmPerfScenarios.LoadManualTestsPerfMarkerClass).click(() => {
            Performance.getScenarioManager().endScenario(TMUtils.TcmPerfScenarios.Area, TMUtils.TcmPerfScenarios.LoadManualTests);
        }).appendTo(this.getElement());

        this._initializeEngagementControls();

        let $div = $("<div />").addClass("error-message-holder");
        this._messageArea = <MessageArea.MessageAreaView>Controls.BaseControl.enhance(MessageArea.MessageAreaView, $div, {
            viewModel: this._messageAreaViewModel
        });
        $div.insertBefore(".hub-content");

        Diag.logTracePoint("TestHubView.initialize.complete");
    }

    private _initializeEngagementControls(): void {
        let isXtPromotionQuickStartEnabled: boolean = FeatureAvailability_Services.FeatureAvailabilityService.isFeatureEnabled(ServerConstants.FeatureAvailabilityFlags.QuickStartXTPromotion2, false);
        if (isXtPromotionQuickStartEnabled) {
            let tfsContext: TFS_Host_TfsContext.TfsContext = this._options.tfsContext || TfsContext.getDefault();
            if (tfsContext.isHosted) {
                VSS.using(["Engagement/Dispatcher", "TestManagement/Scripts/TFS.TestManagement.Engagement.Registrations", "Presentation/Scripts/TFS/TFS.Engagement.Registrations"], (EngagementDispatcher: typeof EngagementDispatcher_NO_REQUIRE, EngagementRegistrations: typeof EngagementRegistrations_NO_REQUIRE, TFS_EngagementRegistrations: typeof TFS_EngagementRegistrations_NO_REQUIRE) => {
                    EngagementRegistrations.registerTestManagementQuickStart();
                    EngagementRegistrations.registerXtQuickStart();
                    TFS_EngagementRegistrations.registerNewFeature();
                    EngagementDispatcher.Dispatcher.getInstance().start("TestHub");
                });
            }
        }
    }

    public allowKeyboardShortcuts(): boolean {
        let allowShortcut: boolean = true;

        if (this._currentView === this._listGroupName || this._currentView === this._chartsGroupName) {
            allowShortcut = true;
        }
        else if (this._currentView === this._gridGroupName) {
            let currentEditRowIndex = this._bulkEditGrid.getCurrentEditRowIndex();
            if (currentEditRowIndex < 0) {
                allowShortcut = true;
            } else {
                allowShortcut = false;
            }
        }
        return allowShortcut;
    }

    private _bindFocusOut() {
        //Remove/Add keyboard shortcut when focus changes from grid
        let $element = this._element.find(".test-edit-grid-area");
        $element.bind("focusout", delegate(this, this._enableGlobalShortcuts));
        $element.bind("focusin", delegate(this, this._disableGlobalShortcuts));
    }

    private _enableGlobalShortcuts() {
        //Remove the Test shortcutgroup and navigation shortucts
        this._testShortcutGroup.removeShortcutGroup();
        this._testhubCommonShortcutGroup.removeShortcutGroup();
        //Reinitilalize the grid view shortcuts
        new TfsCommon_Shortcuts.GlobalShortcutGroup();
        this._testhubCommonShortcutGroup = new TMShortcutsControls.TestHubCommonShortcutGroup(delegate(this, this.allowKeyboardShortcuts));
        this._testShortcutGroup = new TestShortcutGroup(this);
        this._gridViewShortcutGroup = new GridViewShortcutGroup(this);

    }

    private _disableGlobalShortcuts() {
        this._testShortcutGroup.removeShortcutGroup();
        this._testhubCommonShortcutGroup.removeShortcutGroup();
        this._testShortcutGroup.removeGlobalShortcut();
    }

    private _beginGetAdditionalFieldsToShowAndCreateGridView(callback: IResultCallback, errorCallback?: IErrorCallback) {
        let fieldsToShow: any[] = [];

        this._getAvailableColumns((fields: WITOM.FieldDefinition[]) => {
            $.each(fields, (i, field) => {
                if (field.hasOwnProperty("referenceName") &&
                    this._isSelectedInColumnOptions(field.referenceName)) {
                    fieldsToShow.push(field);
                }
            });

            callback(fieldsToShow);
        }, errorCallback);
    }

    private _isSelectedInColumnOptions(fieldReferenceName: string): boolean {
        let length = this._savedColumns.length,
            i: number;

        for (i = 0; i < length; i++) {
            if (fieldReferenceName === this._savedColumns[i].name) {
                return true;
            }
        }

        return false;
    }

    private _createBulkEditGrid() {
        this._bulkEditTestsViewModel = new BulkEditTestsVM.BulkEditTestsViewModel();
        this._bulkEditTestsViewModel.testCasesAdded = (suiteUpdate: TestsOM.ITestSuiteModel) => {
            if (suiteUpdate) {
                this._testSuitesTree.updateSuitesRevisionAndPointCount([suiteUpdate]);
            }

            this._refresh();
        };

        this._bulkEditTestsViewModel.refresh = () => {
            this._refresh();
        };

        this._bulkEditGrid = <BulkEditTestsVM.BulkEditTestsGrid>Controls.BaseControl.createIn(BulkEditTestsVM.BulkEditTestsGrid, this._element.find(GridAreaSelectors.editGrid), {
            bulkEditTestsViewModel: this._bulkEditTestsViewModel,
            parent: this._element,
            containerClassName: GridAreaSelectors.editGrid
        });

        this._bulkEditGrid.hide();
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

    public onSelectedTestCaseChanged(e?, id?) {
        // Show work item only if there is only one selected item.
        this._showWorkItemBasedOnSelection(id);
    }

    private _showWorkItemBasedOnSelection(id?: number) {
        // Show work item only if there is only one selected item.
        let selectionCount = this._testPointList.getSelectionCount();
        let paneFilter = this._paneFilter.getSelectedItem().value;
        id = (selectionCount >= 1) ? id : 0;
        if (paneFilter === TestHubView.paneMode_suites || paneFilter === TestHubView.paneMode_results) {
            // test Suites or test result is selected in paneFilter
            id = (selectionCount > 1) ? 0 : id;
            this._showAssociatedNodes(id, paneFilter);
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
    }

    public ensurePlansLoaded(planId: any, callback?: IResultCallback, errorCallback?: IErrorCallback) {
        /// <summary>Fetches and displays all the plans inside the combobox, if not already fetched and displayed.</summary>
        /// <param name="planId" type="Object">the plan Id to select in combobox </param>
        /// <param name="callback" type="IResultCallback" optional="true" >The function to callback upon successful completion</param>
        /// <param name="errorCallback" type="IErrorCallback" optional="true">The function to callback upon error</param>
        let that = this,
            errorCallback1: IErrorCallback = (e) => { this.showError(VSS.getErrorMessage(e)); };
        VSS.queueRequest(this, this, "_plansLoaded", callback, errorCallback1,
            function (succeeded, failed) {
                that._testPlanManager.fetchTestPlansIncludingSpecifiedPlan(planId, function (plansWithSelection) {
                    Performance.getScenarioManager().split(TMUtils.TcmPerfScenarios.AllPlansLoaded);

                    if (!planId) {
                        planId = plansWithSelection.selectedTestPlan;
                    }

                    that._selectedPlanIdAndSuiteId.selectedPlan = plansWithSelection.selectedTestPlan;
                    that._selectedPlanIdAndSuiteId.selectedSuite = plansWithSelection.selectedTestSuite;
                    that._plansSelector.setData(plansWithSelection.testPlans);
                    if ($.isFunction(succeeded)) {
                        succeeded(that._selectedPlanIdAndSuiteId);
                    }
                },
                    function (e) {
                        that.showError(VSS.getErrorMessage(e));
                    });
            });
    }

    public parseStateInfo(state: any, isInitializing: boolean, successCallback: IResultCallback) {
        /// <summary>Parse the state info and fetch any artificacts necessary to render the view</summary>
        /// <param name="state" type="Object">The state info for the new navigation</param>
        /// <param name="successCallback" type="IResultCallback">Callback that should be issued when the state was successfully parsed</param>
        /// <param name="isInitializing" type="Boolean">The flag indiciating if we are here for the first time</param>

        let plan: any,
            planId: number = parseInt(state.planId, 10),
            currentStateString: string,
            loadedStateString: string,
            teamFieldRefName: string,
            teamFieldValue: string,
            i: number;

        if (this._currentPlan && this._currentPlan.plan && this._currentPlan.plan.id && this._currentPlan.selectedSuiteId) {
            loadedStateString = Utils_String.format("planId={0}&suiteId={1}", this._currentPlan.plan.id, this._currentPlan.selectedSuiteId);
            currentStateString = Navigation_Services.getHistoryService().getCurrentFragment();
            if (currentStateString && loadedStateString && (currentStateString === loadedStateString)) {
                return;
            }
            else if (this._shouldCancelPlanOrSuiteSelectionChange()) {
                window.location.hash = loadedStateString;
                return;
            }
            else if (this._checkAndNotifyUserAboutDirtyTests()) {
                window.location.hash = loadedStateString;
                return;
            }
        }

        this._enableFilters(false);
        this._clearError();
        this._clearIterationDatesSpan();

        if (isInitializing) {
            Performance.getScenarioManager().split(TMUtils.TcmPerfScenarios.LoadTestPlans);
        }

        this.ensurePlansLoaded(planId, (lastSelectedPlanAndSuite) => {

            // If the user did not explicitly pass the plan id in the URL, try to pickup the last selected plan id.
            if (!planId) {
                planId = lastSelectedPlanAndSuite.selectedPlan;

                // If the user did not explicitly pass the suite Id, try to pickup the last selected suite id.
                if (!state.suiteId) {
                    state.suiteId = lastSelectedPlanAndSuite.selectedSuite;
                }

                // Add a history point if the plan id and suite id are valid and if this is not the current plan.
                if (planId && planId !== 0 && state.suiteId && state.suiteId !== 0 && !isInitializing &&
                    !(this._currentPlan.plan && this._currentPlan.plan.id === planId)) {
                    Navigation_Services.getHistoryService().addHistoryPoint(this._selectedPivot, { planId: planId, suiteId: state.suiteId });
                }
            }

            if (!planId) {
                if (!this._currentPlan || !this._currentPlan.plan) {
                    this._showPlanHubTitle();
                }
            }
            else if (isNaN(planId)) {
                this.showError(Resources.InvalidParameterPlanId);
            }
            else if (this._currentPlan && this._currentPlan.plan && this._currentPlan.plan.id === planId && this._currentPlan.suites) {
                Diag.logTracePoint("TestHubView.SelectPlan.MessageShowsUp");
                //if current suite id is different from the selected than fetch the testpoints for  the current suite
                if (isInitializing && this._selectedPivot === TestPivots.TESTS) {
                    this._refreshAndPopulatetestPointList(this._currentPlan.plan.id, parseInt(state.suiteId, 10), true);
                }
                successCallback.call(this, state, isInitializing);
            }
            else {
                Diag.logTracePoint("TestHubView.SelectPlan.MessageShowsUp");
                this.setViewTitle("");
                plan = this._plansSelector.selectPlanById(planId);
                if (!plan) {
                    this.showError(Utils_String.format(Resources.NoPlanWithIdExists, planId));
                    return false;
                }

                this._currentPlan.plan = plan;
                if (plan && plan.rootSuiteId === 0) {
                    this._testPlanManager.beginCreateTestPlanFromWorkItem(plan.id, (promotedTestPlan) => {
                        this._currentPlan.plan.rootSuiteId = promotedTestPlan.rootSuiteId;
                        this._refreshTestSuitesForPlan(promotedTestPlan.id, promotedTestPlan.rootSuiteId, false, () => {
                            successCallback.call(this, state, isInitializing);
                        });
                        //fetch the test points only during initialization
                        if (isInitializing && this._selectedPivot === TestPivots.TESTS) {
                            this._refreshAndPopulatetestPointList(promotedTestPlan.id, promotedTestPlan.rootSuiteId, true);
                        }
                    },
                        (e) => {
                            this.showError(VSS.getErrorMessage(e));
                        });
                }
                else {
                    let suiteId = 0;
                    if (isInitializing && this._selectedPivot === TestPivots.TESTS) {
                        let suiteId = parseInt(state.suiteId, 10);
                        if (!suiteId) {
                            suiteId = plan.rootSuiteId;
                        }
                    }
                    this._refreshTestSuitesForPlan(plan.id, suiteId, false, () => {
                        successCallback.call(this, state, isInitializing);
                    });
                    //fetch the test points during initialization or when we are moving from one plan to other
                    if (isInitializing && this._selectedPivot === TestPivots.TESTS) {
                        this._refreshAndPopulatetestPointList(plan.id, suiteId, true);
                    }
                }

                if (plan) {
                    this._testPlanManager.getTeamFieldForTestPlans([plan.id],
                        (teamFields: TestsOM.ITeamFieldModel[]) => {
                            this._fetchAndUpdateTeamFieldInfoForPlan(teamFields, plan.id);
                        },
                        () => { this._currentTeamFieldInfo = null; });
                }
            }

            // Get the nane of the default work item of the bug category. This is an asynch call and should not impact the perf of loading the test plan.
            // We pass this string when we run a test in Web MTR. This ensures that Web MTR does not make additional web service call to get this string.
            try {
                //Delay execute for getting this as it is needed only for MTR scenarios
                new TMUtils.DelayedExecutionHelper().executeAfterLoadComplete(this, () => {
                    WITUtils.getDefaultWorkItemTypeNameForCategory("Microsoft.BugCategory", (bugCategoryTypeName) => {
                        if (bugCategoryTypeName) {
                            this._bugCategoryTypeName = bugCategoryTypeName;
                        }
                    });
                });
            }
            catch (e) {
            }
        });
    }

    private _showPlanHubTitle() {
        if (LicenseAndFeatureFlagUtils.AreAdvancedTestManagementFeaturesEnabled()) {
            this.setViewTitleContent("", Resources.SelectPlanHubTitle);
            this._element.find(".create-test-plan-hyperlink").click(() => { this._onClickCreateNewTestPlan(); });
            this._element.find(".hub-title").attr("style", "margin-right : 20px;");
            Diag.logTracePoint("TestHubView.SelectPlan.MessageShowsUp");
            Performance.getScenarioManager().abortScenario(TMUtils.TcmPerfScenarios.Area, TMUtils.TcmPerfScenarios.GotoTestHub);
        }
    }

    private _fetchAndUpdateTeamFieldInfoForPlan(teamFields: TestsOM.ITeamFieldModel[], planId: number, onTeamConfigured?: IResultCallback, onTeamUnconfigured?: IResultCallback) {
        let teamFieldRefName: string,
            teamFieldValue: string;

        if (teamFields && teamFields.length === 1 && teamFields[0].ownerId === planId) {
            teamFieldRefName = teamFields[0].teamFieldRefName;
            teamFieldValue = teamFields[0].teamFieldValue;

            this._currentTeamFieldInfo = new TestsOM.TeamFieldModel(teamFieldRefName, teamFieldValue, true);

            this._fetchAndUpdateTeamFieldInfoForTestCase(teamFieldRefName, teamFieldValue, onTeamConfigured, onTeamUnconfigured);
        }
        else {
            this._currentTeamFieldInfo = new TestsOM.TeamFieldModel("", "", false);
            if (onTeamUnconfigured) {
                onTeamUnconfigured();
            }
        }
    }

    private _fetchAndUpdateTeamFieldInfoForTestCase(teamFieldRefName: string, teamFieldValue: string,
        onTeamConfigured?: IResultCallback, onTeamUnconfigured?: IResultCallback) {
        let length: number,
            i: number;

        TestCaseCategoryUtils.getAllTestCaseCategoryWorkItemFields((witFields: WITOM.FieldDefinition[]) => {
            this._testCaseHasTeamField = false;
            length = witFields.length;
            for (i = 0; i < length; i++) {
                if (Utils_String.ignoreCaseComparer(witFields[i].referenceName, teamFieldRefName) === 0) {
                    this._testCaseHasTeamField = true;
                    break;
                }
            }

            if (onTeamConfigured) {
                onTeamConfigured(teamFieldRefName, teamFieldValue);
            }
        },
            () => {
                if (onTeamUnconfigured) {
                    onTeamUnconfigured();
                }
            });
    }

    private _refreshTestSuitesForPlan(planId: number, suiteIdToSelect?: number, makeEditable?: boolean, callback?: IResultCallback) {
        let suite: TestsOM.ITestSuiteModel;
        this._testPlanManager.getTestSuitesForPlan(planId, suiteIdToSelect, (data: TestsOM.ITestSuiteQueryResultModel) => {
            if (data) {
                this._storeSuites(data.testSuites);
                this._loadFilters(data);
                this._testSuitesTree.setData(this._currentPlan);
                if ($.isFunction(callback)) {
                    callback();
                    if (LicenseAndFeatureFlagUtils.AreAdvancedTestManagementFeaturesEnabled()) {
                        this._updateSuitesToolBarItems();
                        this._updateSuitesToolbarCommandStates();
                    }
                }
                if (suiteIdToSelect) {
                    this._testSuitesTree.setSelectedSuite(suiteIdToSelect);
                    suite = this._testSuitesTree.getSelectedSuite();
                    if (suite) {
                        this.setViewTitle(Utils_String.format(Resources.TestPointsGridSuiteHeader, suite.title, suite.id));
                    }
                }
                if (makeEditable) {
                    this._testSuitesTree.makeSelectedSuiteEditable();
                }
                if (this._showTestsFromChild) {
                    this._refreshSuitePointCounts(null);
                }

                Performance.getScenarioManager().split(TMUtils.TcmPerfScenarios.AllSuitesLoadedForPlan);
            }
        });
    }

    private _loadFilters(data: TestsOM.ITestSuiteQueryResultModel) {
        this._testersInPlan = data.testers;
        this._configurationsInPlan = data.configurations;

        this._updateFilterSelection(this._testerFilter, "tester", TFS_OM_Identities.IdentityHelper.getUniquefiedIdentityName(<any>data.selectedTester));
        this._updateFilterSelection(this._testPointOutcomeFilter, "outcome", data.selectedOutcome);
        this._updateFilterSelection(this._configurationFilter, "configuration", this._getSelectedConfigurationName(data.selectedConfiguration));
    }

    private _getSelectedConfigurationName(selectedConfiguration: TestsOM.ITestConfigurationModel) {
        let selectedConfigurationName: string = "";
        if (selectedConfiguration) {
            selectedConfigurationName = selectedConfiguration.name;
        }

        return selectedConfigurationName;
    }

    public handleTestPointError(message: string, error) {
        this.showError(Utils_String.format("{0} {1}", message, VSS.getErrorMessage(error)));
    }

    public resetColumnSettings() {
        TMUtils.getTestPlanManager().updateColumnOptions([], true);
        TMUtils.getTestPlanManager().updateColumnSortOrder({ index: "", order: "" });
    }

    private _getTestRunManager() {
        if (!this._testRunManager) {
            this._testRunManager = TFS_OM_Common.ProjectCollection.getConnection(this._options.tfsContext).getService<TestsOM.TestRunManager>(TestsOM.TestRunManager);
        }

        return this._testRunManager;
    }

    private _consumerWorkitemForm(callback: any) {
        if (this._workItemForm) {
            if (callback) {
                callback();
            }
        } else {
            VSS.using(["WorkItemTracking/Scripts/Controls/WorkItemForm"], (Module: typeof WITForm_LAZY_LOAD) => {
                let store = WITUtils.getWorkItemStore();
                WitFormModeUtility.ensureWitFormModeLoaded().then(() => {
                    let $workItemForm: JQuery = this._splitter.rightPane.find(".work-item-form");
                    this._workItemForm = Controls.Enhancement.enhance(Module.WorkItemForm, $workItemForm, {
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
            });
        }
    }

    private _createSuiteReferencePane() {
        this._viewPaneForm = this._splitter.rightPane.find(".test-case-details-pane");
        this._viewPaneForm.hide();
        this._createSuiteReferencePaneToolbar();
        this._viewPaneList = <TestDetailsPaneGrid>Controls.Enhancement.enhance(TestDetailsPaneGrid, this._viewPaneForm.find(".far-right-pane-view-explorer").find(".far-right-pane-list-container"), { tfscontext: this._options.tfsContext });
        this._savedTestPointPaneColumns = this._viewPaneList.getTestPointColumns();
        this._viewPaneList.getSelectedTestCaseDelegate = () => {
            let testCaseIds = this._testPointList._getSelectedTestCaseIds();
            if (testCaseIds && testCaseIds.length > 0) {
                return testCaseIds[0];
            }
            return 0;
        };

        this._viewPaneList.getSelectedPaneModeDelegate = () => {
            return this._paneFilter.getSelectedItem().value;
        };

        this._viewPaneList.updatePaneToolbarTooltipsDelegate = () => {
            if (this._$testDetailsPaneOpenMenuItem && this._$testDetailsPaneOpenMenuItem.attr("command") === this._testDetailsPaneToolbarItemIds.openTestDetailInNewTab) {
                if (this._paneFilter.getSelectedItem().value === TestHubView.paneMode_results) {
                    Diag.logTracePoint("TestHubView._createSuiteReferencePane.updatePaneToolbarTooltipsDelegate for Results pane");
                    this._$testDetailsPaneOpenMenuItem.attr("title", Resources.Open);
                }
                else if (this._paneFilter.getSelectedItem().value === TestHubView.paneMode_suites) {
                    Diag.logTracePoint("TestHubView._createSuiteReferencePane.updatePaneToolbarTooltipsDelegate for Suites pane");
                    this._$testDetailsPaneOpenMenuItem.attr("title", Resources.OpenInNewTab);
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

    private _createSuiteReferencePaneToolbar() {
        let toolbarElement: JQuery = this._viewPaneForm.find(".far-right-pane-view-explorer").find(".far-right-pane-toolbar"),
            menuItems;

        this._farRightPaneToolbar = <Menus.MenuBar>Controls.BaseControl.createIn(Menus.MenuBar, toolbarElement, {
            items: this._createFarRightPaneMenubarItems(),
            executeAction: delegate(this, this._onFarRightPaneToolbarItemClick),
        });

        menuItems = toolbarElement.find(".menu-bar li");
        if (menuItems.length > 1) {
            this._$testDetailsPaneOpenMenuItem = $(menuItems[1]);
        }
    }

    private _createFarRightPaneMenubarItems(): any[] {
        let items: any[] = [];
        items.push({
            id: this._testDetailsPaneToolbarItemIds.refreshTestDetailsPane,
            text: Resources.Refresh,
            title: Resources.RefreshToolTip,
            showText: false,
            icon: "bowtie-icon bowtie-navigate-refresh"
        });
        // TestDetailsPane's updateToolbarTooltipsDelegate manages updating the title of the second menu item depending on the pane selected.
        // If any menu item is inserted here, update the this._$testDetailsPaneOpenMenuItem.
        items.push({
            id: this._testDetailsPaneToolbarItemIds.openTestDetailInNewTab,
            text: Resources.OpenInNewTab,
            title: Resources.OpenInNewTab,
            showText: false,
            icon: "bowtie-icon bowtie-arrow-open"
        });
        return items;
    }

    private _updateFarRightPaneOpenTestDetailCommandState(disabled: boolean = false) {
        this._farRightPaneToolbar.updateCommandStates(
            [
                {
                    id: this._testDetailsPaneToolbarItemIds.openTestDetailInNewTab,
                    disabled: disabled
                }
            ]);
    }

    private _updateFarRightPaneRefreshTestDetailCommandState(disabled: boolean = false) {
        this._farRightPaneToolbar.updateCommandStates(
            [
                {
                    id: this._testDetailsPaneToolbarItemIds.refreshTestDetailsPane,
                    disabled: disabled
                }
            ]);
    }

    private _onFarRightPaneToolbarItemClick(e?: any) {
        let command = e.get_commandName();
        if (command === this._testDetailsPaneToolbarItemIds.refreshTestDetailsPane) {
            this._viewPaneList.refreshList(this._getSelectedTestCaseId(), this._paneFilter.getSelectedItem().value, this._workItemPaneMode, true);
            TelemetryService.publishEvents(TelemetryService.featureDetailsPaneRefresh, { "PaneFilter": this._paneFilter.getSelectedItem().value });
        }
        else if (command === this._testDetailsPaneToolbarItemIds.openTestDetailInNewTab) {
            this._viewPaneList.onOpenRowDetail();
            TelemetryService.publishEvents(TelemetryService.featureDetailsPaneOpenInNewTab, { "PaneFilter": this._paneFilter.getSelectedItem().value });
        }
    }

    private _enhancePaneSelectionFilter() {
        this._splitter = <Splitter.Splitter>Controls.Enhancement.ensureEnhancement(Splitter.Splitter, this._element.find(".right-hub-splitter"));
        this._splitter.removeExpand();
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
    private _showWorkItemPane(position: string, pane: string) {
        let item;
        let previousPaneMode = this._workItemPaneMode;

        this._saveCurrentPanePosition(position);

        if (this._inEditMode) {
            // Do not show work item pane in edit mode.
            return;
        }
        if (!LicenseAndFeatureFlagUtils.AreAdvancedTestManagementFeaturesEnabled()) {
            position = "off";
        }
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
                if (pane === TestHubView.paneMode_suites || pane === TestHubView.paneMode_results) {
                    selectedTestCaseId = (this._testPointList.getSelectionCount() <= 1) ? selectedTestCaseId : 0;
                    this._showAssociatedNodes(selectedTestCaseId, pane);
                }
                else {
                    //Test Case workitem pane
                    this._showWorkItem(selectedTestCaseId, true);
                }
            }
            this._$farRightPaneHubPivot.css("display", "block");
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

    private _savePaneSetting(option: string, value: string) {
        if (!this._webSettingsService) {
            this._webSettingsService = TFS_OM_Common.Application.getConnection(this._options.tfsContext).getService<TFS_WebSettingsService.WebSettingsService>(TFS_WebSettingsService.WebSettingsService);
        }
        //Save required option
        new TMUtils.DelayedExecutionHelper().executeAfterLoadComplete(this, () => {
            this._webSettingsService.beginWriteSetting(option, value);
        });
    }

    private _getSelectedTestCaseId() {
        let selectedTestPoint = this._testPointList.getSelectedTestPoint(),
            selectedTestCaseId = selectedTestPoint ? selectedTestPoint.testCaseId : 0;

        return selectedTestCaseId;
    }

    private _showWorkItem(id, forceShow?: boolean) {
        /// <param name="forceShow" type="boolean" optional="true" />
        this._viewPaneForm.hide();
        let that = this;
        function start(id) {
            that._workItemForm.beginShowWorkItem(id, function () {
                that.currentWorkItemId = id;

                // Changing the delay focus to 300 ms because
                // the work item form moves focus to the title 
                // after 200ms
                that._testPointList.focus(300);
            });
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

    private _showAssociatedNodes(testCaseId: number, paneFilter: string) {
        this._viewPaneForm.bind();
        this._viewPaneForm.show();
        if (this._workItemForm) {
            this._workItemForm.hideElement();
        }
        if (this._workItemPaneMode && this._workItemPaneMode !== "off") {
            this._viewPaneList.refreshList(testCaseId, paneFilter, this._workItemPaneMode);
        }
    }

    private _initializeEvents() {

        WorkItemManager.get(WITUtils.getWorkItemStore()).attachWorkItemChanged(delegate(this, this._onNewTestCaseCreated));

        this._testPointList._bind("selectionchanged", delegate(this, this._onTestPointSelectionChanged))
            ._bind("deletekey", delegate(this, this._onRemoveTestPoints))
            ._bind("dirtytestcaseschanged", delegate(this, this._updateTestPointsToolbarCommandStates))
            ._bind("sortOrderChanged", delegate(this, this._onSortOrderChanged))
            ._bind("focus", delegate(this, this._removeHighlightOnRefreshMenu));

        this._testPointList.refreshTestPointsEvent = (testPoints) => {
            if (testPoints !== undefined && testPoints !== null && testPoints.length > 0) {
                this._refreshTestPoints(testPoints);
            }
        };

        this._testPointList.refreshSelectedTestSuiteEvent = () => {
            this._refreshSelectedSuite();
        };

        this._testPointList.removeTestCaseEvent = (testPointList) => {
            this._removeSelectedTestCases(testPointList);
        };

        this._testPointList.setOutcomeEvent = (testPointList, outCome) => {
            this._setOutcome(testPointList, outCome);
        };

        this._testPointList.resetTestPointsEvent = (testPointList) => {
            this._resetTestPoints(testPointList);
        };

        this._testPointList.runTestPointsEvent = () => {
            this._runTestPoints(this._testPointList.getSelectedTestPoints());
        };

        this._testPointList.runTestPointsUsingClientEvent = () => {
            this._runTestPointsUsingClient(this._testPointList.getSelectedTestPoints());
        };

        this._testPointList.runTestPointsWithOptionsEvent = () => {
            this._runTestPointsWithOptions(this._testPointList.getSelectedTestPoints());
        };

        this._testPointList.resumeTestPointsEvent = () => {
            this._resumeRun();
        };

        this._testPointList.bulkEditTestCasesUsingGridEvent = (testCaseIds: number[]) => {
            this._bulkEditTestCasesUsingGrid(testCaseIds);
        };

        this._testPointList.assignTesterEvent = (testPointIds: number[], tester: TestsOM.ITesterModel) => {
            this._assignTesters(testPointIds, tester);
        };

        this._testPointList.assignConfigurationEvent = (testCaseAndSuiteList: TestsOM.ITestCaseWithParentSuite[]) => {
            this._assignConfigurationsToTestCases(testCaseAndSuiteList);
        };

        this._testPointList.canSetOutcomeDelegate = () => {
            return this._canSetOutcome();
        };

        this._testPointList.canResumeTestsDelegate = () => {
            return this._canResumeRun();
        };

        this._testPointList.canResetTestPointsDelegate = () => {
            return this._canResetTestPoints();
        };

        this._testPointList.canRunTestsDelegate = () => {
            return this._canRunTests();
        };

        this._testPointList.canRemoveTestsDelegate = () => {
            return this._canRemoveTestCase();
        };

        this._testPointList.canShowRemoveTestsDelegate = () => {
            return this._canShowAddAndRemoveTestCase();
        };

        this._testPointList.isTestNotApplicableDelegate = () => {
            return this._canSetOutcome();
        };

        this._testPointList.resetFiltersEvent = () => {
            this._resetFilters();
        };

        this._bind("keydown", delegate(this, this._onKeyDown));

        this._testPointList._bind("selectedTestChanged", delegate(this, this.onSelectedTestCaseChanged));
    }

    private _bulkEditTestCasesUsingGrid(testCaseIds: number[]): void {
        DAUtils.trackAction("EditTestCasesWithGrid", "/SuiteManagement");
        this._beginTryShowEditGrid(testCaseIds, false, () => {
            this._setViewFilter("grid");
        },
            (error) => {
                this._setViewFilter("list");
            });
    }

    private _onKeyDown(e?: JQueryEventObject) {

        switch (e.keyCode) {
            case 78: //N
                if (e.altKey) {
                    if (this._canCreateTestCase()) {
                        this._createNewTestCase();
                    }
                }
                break;
            case 82: //R
                if (e.altKey) {
                    if (this._canRunTests()) {
                        this._runTestPoints(this._testPointList.getSelectedTestPoints());
                    }
                }
                break;
        }
    }

    private _assignTesters(testPointIds: number[], tester: TestsOM.ITesterModel) {
        if (!testPointIds || testPointIds.length === 0) {
            return;
        }

        TMUtils.getTestPlanManager().assignTester(this._currentPlan.plan.id, testPointIds, tester.id, () => {
            this._addToTestersInPlan(tester);
            this._refresh();
        }, (e) => {
            this.showError(VSS.getErrorMessage(e));
        });

        //Adding telemetry for creating test plan workitem. Area: TestManagement, Feature: AssignTester. Property: Number of points selected.
        TelemetryService.publishEvent(TelemetryService.featureAssignTester, TelemetryService.numberOfPointsSelected, testPointIds.length);
    }

    private _assignConfigurationsToTestCases(testCaseAndSuiteList: TestsOM.ITestCaseWithParentSuite[]) {
        if (!testCaseAndSuiteList || testCaseAndSuiteList.length === 0) {
            return;
        }

        let selectedSuite = this._testSuitesTree.getSelectedSuite();
        VSS.using(["TestManagement/Scripts/TFS.TestManagement.AssignConfigurationsToSuite"], (Module: typeof TestAssignConfig_LAZY_LOAD) => {
            let assignConfigurationsToSuite = new Module.AssignConfigurationsToSuite(this._currentPlan.plan.id, selectedSuite);
            assignConfigurationsToSuite.AssignConfigurationsToTestCases(testCaseAndSuiteList, this._showTestsFromChild,
                (assignedConfigurations: number[], changesSaved: boolean) => {
                    // refresh test points only when changes were saved
                    if (changesSaved) {
                        this._refreshAndPopulatetestPointList(this._currentPlan.plan.id, this._currentPlan.selectedSuiteId, true);

                        //Adding telemetry for assign configuration to test cases. Area: TestManagement, Feature: AssignConfiguration. Property: Number of test cases selected.
                        TelemetryService.publishEvent(TelemetryService.featureAssignConfiguration, TelemetryService.numberOfTestCases, testCaseAndSuiteList.length);
                    }
                },
                (e) => {
                    this.showError(VSS.getErrorMessage(e));
                });
        });

    }

    private _addToTestersInPlan(tester: TestsOM.ITesterModel) {
        // find if the entry already exists
        let existingTesterIds = $.map(this._testersInPlan, (t) => {
            return t.id;
        });

        if (!Utils_Array.contains(existingTesterIds, tester.id)) {
            this._testersInPlan.push(tester);
        }
    }

    private _onNewTestCaseCreated(sender: any, args?: any) {

        let workItem,
            workItemId;

        Diag.Debug.assertParamIsObject(args, "args");
        Diag.Debug.assert(args.workItem, "workItem should be passed with work item changed arguments");
        Diag.Debug.assert(args.change, "change type should be passed with work item changed arguments");

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
            this._refresh();
            return;
        }

        TestCaseCategoryUtils.getAllWorkItemTypeForTestCaseCategory((witNames) => {
            if ($.inArray(workItem.workItemType.name, witNames) !== -1 && this._hasRelatedLinkToWorkItemInCurrentSuite(workItem)) {
                this._addtestCaseToCurrentSuite(workItem);
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
                tesCaseIdsInCurrentSuite = TestPointsGrid.getTestCaseIdsFromTestPoints(this._cachedTestPointData);

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
        let tesCaseIdsInCurrentSuite = TestPointsGrid.getTestCaseIdsFromTestPoints(this._cachedTestPointData);
        return ($.inArray(id, tesCaseIdsInCurrentSuite) !== -1);
    }

    private _createFilters() {
        let position: string;
        this._testPointOutcomeFilter = this._createFilter(FilterSelectors.outcome);
        this._testerFilter = this._createFilter(FilterSelectors.tester);
        this._configurationFilter = this._createFilter(FilterSelectors.configuration);
        this._viewFilter = this._createFilter(FilterSelectors.view);
        this._positionFilter = this._createFilter(FilterSelectors.workItemPanePosition);
        if (this._positionFilter) {
            this._positionFilter.getElement().attr("title", Resources.PanePositionToolTip);
        }
        this._paneFilter = this._createFilter(FilterSelectors.pane);
        if (this._paneFilter) {
            this._paneFilter.getElement().attr("title", Resources.PaneToolTip);
        }
        //update values for outcome filter right away as we know them now
        let outcomeFilterValues = FilterHelper.getFilterItemsFromUniqueValues(TMUtils.TestOutcomes, "");
        if (this._testPointOutcomeFilter) {
            this._testPointOutcomeFilter.updateItems(outcomeFilterValues);
        }

        if (!this._webSettingsService) {
            this._webSettingsService = TFS_OM_Common.Application.getConnection(this._options.tfsContext).getService<TFS_WebSettingsService.WebSettingsService>(TFS_WebSettingsService.WebSettingsService);
        }

        //set pane and position for the first time
        this._readPanePosition((intialPanePosition) => {
            if (intialPanePosition && intialPanePosition.value) {
                position = intialPanePosition.value;
            }
            else {
                position = "off";
            }
            if (this._paneFilter) {
                this._consumerWorkitemForm(() => { this._showWorkItemPane(position, this._paneFilter.getSelectedItem().value); });
            }
        });
    }

    private _readPanePosition(callback?: IResultCallback, errorCallback?: IErrorCallback) {
        let data = Utils_Core.parseJsonIsland($(document), ".__panePositionSetting", true);
        if (data && callback) {
            let response = { value: data };
            callback(response);
        }
        else {
            this._webSettingsService.beginReadSetting("/PanePosition", TFS_WebSettingsService.WebSettingsScope.User, callback);
        }
    }

    private _createFilter(selector: string) {
        let filter = <Navigation.PivotFilter>Controls.Enhancement.ensureEnhancement(Navigation.PivotFilter, $(selector));
        this._bind(this._element.find(selector), "changed", (sender, item) => {
            this._filterValueChanged(selector, item.value);

            if (item.value === TestHubView.paneMode_suites) {
                TelemetryService.publishEvents(TelemetryService.featureDetailsPaneTestSuites, {});
            }
            else if (item.value === TestHubView.paneMode_results) {
                TelemetryService.publishEvents(TelemetryService.featureDetailsPaneTestResults, {});
            }
            else {
                TelemetryService.publishEvents(TelemetryService.featureDetailsPaneTestCases, {});
            }
        });

        return filter;
    }

    private _filterValueChanged(selector: string, value: string) {
        /// <summary> Handle any change in the filter</summary>
        Diag.logTracePoint("TestHub.Filter.Start");

        if (selector === FilterSelectors.tester || selector === FilterSelectors.outcome || selector === FilterSelectors.configuration) {
            this._clearAndHideTagsFilter();
            this._updateIsFilterApplied(selector, value);
            let selectedSuiteFilteredItemLength: number = this._filter(this._cachedTestPointData),
                selectedSuite = this._testSuitesTree.getSelectedSuite();
            this._updatePointCountForSuite(selectedSuite, selectedSuiteFilteredItemLength);
            if (this._currentPlan.plan && this._currentPlan.plan.id && this._currentPlan.selectedSuiteId) {
                this._refreshAndPopulatetestPointList(this._currentPlan.plan.id, this._currentPlan.selectedSuiteId, this._showTestsFromChild, null, null, () => {
                    // If filters are applied then refreshAndPopulateTestPointsList will update the test point count. Else in callback we are updating the points count.
                    if (!this._isFilterApplied()) {
                        this._refreshSuitePointCounts(selectedSuite);
                    }
                });
            }

            if (selector === FilterSelectors.tester) {
                DAUtils.trackAction("TesterFilter", "/SuiteManagement");
            } else if (selector === FilterSelectors.outcome) {
                DAUtils.trackAction("OutcomeFilter", "/SuiteManagement", { value: value });
            } else {
                DAUtils.trackAction("ConfigurationFilter", "/SuiteManagement", { value: value });
            }
        } else if (selector === FilterSelectors.view) {
            DAUtils.trackAction("ViewFilter", "/SuiteManagement", { value: value });
            this._handleViewFilter(value);
        } else if (selector === FilterSelectors.workItemPanePosition) {
            DAUtils.trackAction("WorkItemPaneFilter", "/SuiteManagement", { value: value });
            this._showWorkItemPane(value, this._paneFilter.getSelectedItem().value);
        } else if (selector === FilterSelectors.pane) {
            DAUtils.trackAction("PaneFilter", "/SuiteManagement", { value: value });
            this._showWorkItemPane(this._positionFilter.getSelectedItem().value, value);
        }

        //Adding telemetry for creating test plan workitem. Area: TestManagement, Feature: TestSuiteViewFilter. Property View Mode as the value if the selected mode is grid or list.
        TelemetryService.publishEvents(TelemetryService.featureTestSuiteFilter, {
            "FilterName": selector,
            "FilterValue": value
        });

        Diag.logTracePoint("TestHub.Filter.Complete");
    }

    private _updateIsFilterApplied(selector: string, value: string) {

        if (selector === FilterSelectors.tester) {
            if (value === FilterHelper.ALL_FILTER) {
                this._testerFilterApplied = false;
            } else {
                this._testerFilterApplied = true;
            }
        }
        if (selector === FilterSelectors.outcome) {
            if (value === FilterHelper.ALL_FILTER) {
                this._outcomeFilterApplied = false;
            } else {
                this._outcomeFilterApplied = true;
            }
        }
        if (selector === FilterSelectors.configuration) {
            if (value === FilterHelper.ALL_FILTER) {
                this._configurationFilterApplied = false;
            } else {
                this._configurationFilterApplied = true;
            }
        }
    }

    private _tryShowViewGrid(setViewFilter: boolean): boolean {
        if (this._bulkEditTestsViewModel.cleanup()) {
            this._showViewGrid(setViewFilter);
            this._fetchAndShowIterationDates();
            this._currentView = this._listGroupName;
            return true;
        }
        else {
            return false;
        }
    }

    private _hideViewGridFilters() {
        this._testPointOutcomeFilter.hideElement();
        this._testerFilter.hideElement();
        this._configurationFilter.hideElement();
        this._paneFilter.hideElement();
        this._positionFilter.hideElement();
        this._savedPaneFilterItem = this._paneFilter.getSelectedItem().value;
        this._savedPanePosition = this._workItemPaneMode;
        this._showWorkItemPane("off", this._savedPaneFilterItem);
    }

    private _showViewGridFilters() {
        this._testPointOutcomeFilter.showElement();
        this._testerFilter.showElement();
        this._configurationFilter.showElement();
        this._paneFilter.showElement();
        this._positionFilter.showElement();
    }

    private _hideTestViewFilters() {
        this._hideViewGridFilters();
        this._viewFilter.hideElement();
    }

    private _showTestViewFilters() {
        this._showViewGridFilters();
        if (LicenseAndFeatureFlagUtils.AreAdvancedTestManagementFeaturesEnabled()) {
            this._viewFilter.showElement();
        }
    }

    private _hideTestView() {
        this._bulkEditGrid.hide();
        this._hideViewGrid();
    }

    private _hideViewGrid() {
        Diag.logVerbose("[_hideViewGrid]Hide grid view called");
        this._testViewRightPaneGrid.hide();
        this._testPointsToolbar.hideElement();
        this._clearAndHideTagsFilter();
        this._setVisibility(GridAreaSelectors.viewGrid, false);
    }

    private _showViewGrid(setViewFilter: boolean, skipRefresh?: boolean) {
        this._reRegisterShortcutGroup(this._listGroupName);
        Diag.logVerbose("[_showViewGrid]Show grid view called");
        this._testPointList.resetDirtyItems();
        this._hideTestChartsView();     // Hide Test charts view
        this._bulkEditGrid.hide();      // Hide bulkedit grid view
        this._disposeOrderTestCasesControl();
        this._testViewRightPaneGrid.show();
        this._setVisibility(GridAreaSelectors.viewGrid, true);
        this._testPointsToolbar.showElement();
        this._showTestViewFilters();
        this._testPointList.layout();
        this._inEditMode = false;
        this._testPointList.startTrackingWorkItems();
        if (this._savedPanePosition && this._savedPaneFilterItem) {
            this._consumerWorkitemForm(() => { this._showWorkItemPane(this._savedPanePosition, this._savedPaneFilterItem); });
        }

        if (setViewFilter) {
            Diag.logVerbose("[_showViewGrid]list filter is set.");
            this._setViewFilter("list");
        }

        if (!skipRefresh) {
            this._refresh();
        }

        // Enable show child suites
        this._testPlanAndSuitesMenubar.updateCommandStates([{ id: this._testPlanAndSuitesCommandIds.showTestsFromChildSuites, toggled: this._showTestsFromChild }]);
    }

    private _disposeOrderTestCasesControl() {
        if (this._orderTestsControl) {
            this._orderTestsControl.dispose();
            this._orderTestsControl = null;
        }

        this._showTestViewFilters();
        this._testPlanAndSuitesMenubar.updateCommandStates([{ id: this._testPlanAndSuitesCommandIds.showTestsFromChildSuites, toggled: this._showTestsFromChild, disabled: false }]);
    }

    private _getTestCaseIdsInSuite(): number[] {
        return TestPointsGrid.getTestCaseIdsFromTestPoints(this._cachedTestPointData);
    }

    private _isTestCaseInPaneEdited(): boolean {
        let workItem: WITOM.WorkItem;
        if (this._workItemPaneMode !== "off") {
            this._testSuitesTree.focus();
            workItem = WorkItemManager.get(WITUtils.getWorkItemStore()).getWorkItem(this.currentWorkItemId);
            return workItem && workItem.isDirty();
        }
        return false;
    }

    private _beginTryShowEditGrid(testCaseIds: number[], isSuiteLevel: boolean, callback: IResultCallback, errorCallback: IErrorCallback): void {
        if (!this._checkAndNotifyUserAboutDirtyTests()) {

            let witStore = WITUtils.getWorkItemStore();

            this._hideTestChartsView();         // Hide Chartview
            this._hideViewGrid();       // Hide normal grid view
            this._hideViewGridFilters();        // Hide normal grid view filters
            this._testViewRightPaneGrid.show();

            if (this._showTestsFromChild) {
                this._toggleShowTestsFromChildSuites();
            }
            this._gridViewShortcutGroup = new GridViewShortcutGroup(this);

            // Show bulkedit grid view
            this._bulkEditGrid.show();
            this._bulkEditGrid.showBusyOverlay();
            this._testPointList.stopTrackingWorkItems();
            this._clearIterationDatesSpan();

            this._testPlanAndSuitesMenubar.updateCommandStates([{ id: this._testPlanAndSuitesCommandIds.showTestsFromChildSuites, toggled: this._showTestsFromChild, disabled: true }]);

            this._beginGetAdditionalFieldsToShowAndCreateGridView((additionalFields: WITOM.FieldDefinition[]) => {
                let selectedSuite = this._testSuitesTree.getSelectedSuite();
                additionalFields = this._updateOrderAsColumns(additionalFields);
                if (selectedSuite && selectedSuite.type === TCMConstants.TestSuiteType.RequirementTestSuite) {
                    WorkItemManager.get(witStore).beginGetWorkItem(selectedSuite.requirementId, (requirementWorkItem: WITOM.WorkItem) => {
                        this._bulkEditTestsViewModel.initialize(testCaseIds,
                            this._currentPlan.plan,
                            this._currentTeamFieldInfo,
                            selectedSuite,
                            isSuiteLevel,
                            this._getTestCaseIdsInSuite().length,
                            additionalFields);

                        this._bulkEditTestsViewModel.setRequirement(requirementWorkItem);
                        this._inEditMode = true;
                        if (callback) {
                            callback(true);
                        }
                    },
                        (error) => {
                            this.showError(VSS.getErrorMessage(error));
                            if (errorCallback) {
                                errorCallback(error);
                            }
                        });
                }
                else {
                    this._bulkEditTestsViewModel.initialize(testCaseIds,
                        this._currentPlan.plan,
                        this._currentTeamFieldInfo,
                        selectedSuite,
                        isSuiteLevel,
                        this._currentSuiteTestCaseIds.length,
                        additionalFields);

                    this._bulkEditTestsViewModel.setRequirement(null);
                    this._inEditMode = true;
                    if (callback) {
                        callback(true);
                    }
                }
                this._reRegisterShortcutGroup(this._gridGroupName);
                this._currentView = this._gridGroupName;
            },
                (error) => {
                    this.showError(VSS.getErrorMessage(error));
                    if (errorCallback) {
                        errorCallback(error);
                    }
                });
        }
        else {
            if (errorCallback) {
                errorCallback(null);
            }
        }
    }

    private _updateOrderAsColumns(additionalFields: WITOM.FieldDefinition[]): WITOM.FieldDefinition[] {
        let fieldNameToFieldMap: { [key: string]: WITOM.FieldDefinition; } = {},
            i: number,
            len: number,
            fieldsArray: WITOM.FieldDefinition[] = [],
            field: WITOM.FieldDefinition;

        for (i = 0, len = additionalFields.length; i < len; i++) {
            fieldNameToFieldMap[additionalFields[i].referenceName] = additionalFields[i];
        }

        for (i = 0, len = this._savedColumns.length; i < len; i++) {
            field = fieldNameToFieldMap[this._savedColumns[i].name];
            if (field) {
                fieldsArray.push(field);
            }
        }
        return fieldsArray;
    }

    private _handleViewFilter(mode: string) {
        let testCases: number[] = [];
        if (mode === "list") {
            if (!this._tryShowViewGrid(false)) {
                this._setViewFilter("grid");
            }
        }
        else if (mode === "grid") {
            if (this._showTestsFromChild) {
                this._toggleShowTestsFromChildSuites(() => {
                    testCases = this._currentSuiteTestCaseIds;
                    this._beginTryShowEditGrid(testCases, true, $.noop, () => {
                        this._setViewFilter("list");
                    });
                });
            } else {
                testCases = this._currentSuiteTestCaseIds;
                this._beginTryShowEditGrid(testCases, true, $.noop, () => {
                    this._setViewFilter("list");
                });
            }
        }
    }

    private _setViewFilter(value: string) {
        let viewFilterItem = this._viewFilter.getItem(value);
        if (viewFilterItem) {
            this._viewFilter.setSelectedItem(viewFilterItem);
        }
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

    private _updateQueryForSuite(suite: TestsOM.ITestSuiteModel, queryText: string, revision: number) {
        if (suite) {
            suite.queryText = queryText;
            suite.revision = revision;
        }
    }

    private _getValueOfTesterFilter() {
        let testerFilterValue: string = this._getSelectedValueInFilter(this._testerFilter);
        // If the tester filter is not applied then we pass "All" as filter.
        if (testerFilterValue === FilterHelper.ALL_FILTER) {
            return testerFilterValue;
        } else {
            return this._getTesterFilterUniqueId(this._getTesterFilterValue());
        }
    }

    private _refreshSuitePointCounts(selectedSuite: any) {
        let outcome = this._getOutcomeFilterValue(),
            testerFilterValue: string = this._getTesterFilterValue(),
            testerId = this._getValueOfTesterFilter(),
            configurationFilterValue: string = this._getConfigurationFilterValue(),
            configurationId = this._getIdOfConfigurationInFilter(configurationFilterValue);

        if (!this._currentPlan.plan) {
            return;
        }

        TMUtils.getTestPlanManager().fetchFilteredSuitesTestPointCountInPlan(this._currentPlan.plan.id, outcome, testerId, configurationId, (data) => {
            let outcomeNow: string = this._getSelectedValueInFilter(this._testPointOutcomeFilter),
                testerNow: string = this._getSelectedValueInFilter(this._testerFilter),
                configurationNow: string = this._getSelectedValueInFilter(this._configurationFilter),
                selectedSuiteNow = this._testSuitesTree.getSelectedSuite();

            if (outcomeNow === FilterHelper.ALL_FILTER) {
                outcomeNow = "";
            } else {
                TelemetryService.publishEvents(TelemetryService.featureTesterFilter, {});
            }

            if (testerNow === FilterHelper.ALL_FILTER) {
                testerNow = "";
            } else {
                TelemetryService.publishEvents(TelemetryService.featureOutcomeFilter, {});
            }

            if (configurationNow !== FilterHelper.ALL_FILTER) {
                TelemetryService.publishEvents(TelemetryService.featureConfigurationFilter, {});
            }

            if (outcome === outcomeNow &&
                testerFilterValue === testerNow &&
                configurationFilterValue === configurationNow) {
                selectedSuite = this._testSuitesTree.getSelectedSuite();
                let pointsdata = this._parseSuitePointCountData(data);
                let totaldata = this._parseSuiteTotalPointCountData(data);

                this._testSuitesTree.updateNodes(pointsdata, totaldata);
            }

        }
            );
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
        if (this._showTestsFromChild) {
            let suites = this._testSuitesTree.GetDisplaySuites();
            let that = this;
            $.each(suites, function (i, suite) {
                let pointCount = that._getpointCountRecursive(suite.id, suites, suiteIdToPointCountMap);
                suiteIdToPointCountMap[suite.id] = pointCount;
            });
        }
        return suiteIdToPointCountMap;
    }

    private _filter(testPoints, suppressFocus?: boolean, getSeletcedRowIntoView: boolean = true): number {
        let filteredItems = FilterHelper.filter(testPoints,
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
            restoreSelection = this._saveSelection(this._testPointList, selectedTestPointIds);

        let visibleRow = this._testPointList.getVisibleRow();
        this._testPointList.setSource(filteredItems, this._savedColumns, this._sortOrder);
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

    private _getTesterFilterValue(): string {
        let testerFilterValue: string = this._getSelectedValueInFilter(this._testerFilter);
        if (!testerFilterValue || testerFilterValue === FilterHelper.ALL_FILTER) {
            return "";
        }
        return testerFilterValue;
    }

    private _getTesterFilterUniqueId(testerFilterValue: string): string {
        if (!testerFilterValue) {
            return "";
        }
        else {
            let index = Utils_Array.findIndex(this._testersInPlan, (val: TestsOM.ITesterModel) => {
                return (Utils_String.ignoreCaseComparer(val.filterValue, testerFilterValue) === 0);
            });

            if (index >= 0) {
                return this._testersInPlan[index].id;
            }
        }
        return "";
    }

    private _getOutcomeFilterValue(): string {
        let outcome: string = this._getSelectedValueInFilter(this._testPointOutcomeFilter);

        if (!outcome || outcome === FilterHelper.ALL_FILTER) {
            outcome = "";
        }
        return outcome;
    }

    private _getConfigurationFilterValue(): string {
        let config: string = this._getSelectedValueInFilter(this._configurationFilter);
        return config;
    }

    private _saveSelection(testPointGrid, selectedTestPointIds) {
        let selectedTestPoints = testPointGrid.getSelectedTestPoints(),
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

    private _restoreSelection(testPointGrid, selectedTestPointIds, suppressFocusChange?: boolean) {
        let index,
            testPoint,
            selectionDone,
            firstSelection = true;

        testPointGrid._clearSelection();

        if (!this._showTestsFromChild) {
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

    private _getSelectedValueInFilter(filter) {
        let selectedItem = filter.getSelectedItem();
        return !selectedItem ? null : selectedItem.id;
    }

    private _updateFilterSelection(filter, key: string, value: string) {
        if (value) {
            let item = filter.getItem(value);
            if (item) {
                filter.setSelectedItem(item);
            }
            else if (key === "tester" || key === "configuration") {
                filter.updateItems([{
                    text: value,
                    value: value,
                    selected: true,
                    title: value
                }]);
                if (key === "tester" && value !== FilterHelper.ALL_FILTER) {
                    this._testerFilterApplied = true;
                }
                else if (key === "configuration" && value !== FilterHelper.ALL_FILTER) {
                    this._configurationFilterApplied = true;
                }
            }
        }
    }

    public _resetFilters() {
        this._updateFilterSelection(this._testerFilter, "tester", FilterHelper.ALL_FILTER);
        this._updateFilterSelection(this._testPointOutcomeFilter, "outcome", FilterHelper.ALL_FILTER);
        this._updateFilterSelection(this._configurationFilter, "configuration", FilterHelper.ALL_FILTER);
        this._updateFilterSelection(this._positionFilter, "PanePosition", "right");
        this._updateFilterSelection(this._paneFilter, "PaneMode", "testCasePane");
        this._showWorkItemPane("off", this._paneFilter.getSelectedItem().value);
    }

    private _showTestCharts() {
        Diag.logVerbose("[_showTestCharts] _showTestCharts method called");

        this._hideTestView();       // Hide test grid view
        this._hideTestViewFilters();        // Hide test grid view filters
        let suite = this._testSuitesTree.getSelectedSuite();
        if (suite) {
            this.setViewTitle(Utils_String.format(Resources.TestPointsGridSuiteHeader, suite.title, suite.id));
        }
        this._testManagementChartsInfoBar.showElement();
        this._testManagementChartsView.showElement();
        this._reRegisterShortcutGroup(this._chartsGroupName);
        this._currentView = this._chartsGroupName;

        Diag.logVerbose("[_showTestCharts] _showTestCharts method exit");
    }

    public getCurrentSuiteId() {
        return this._currentPlan.selectedSuiteId;
    }

    public getCurrentPlanId() {
        return this._currentPlan.plan.id;
    }

    public handleViewFilter(mode: string) {
        this._handleViewFilter(mode);
        this._setViewFilter(mode);
    }

    public showCharts(command: string) {
        let chartsView = this._testManagementChartsView;
        if (chartsView) {
            chartsView.showChart(command);
        }
    }

    public rightPaneOptions(command: string) {
        //Execute the specific Menu command
        if (command === this._testPointToolbarItemIds.toggleFilter) {
            Diag.Debug.assertIsNotNull(this._filterBar.tagFilterProvider, "No TagFilterProvider found. So, cannot toggle.");
            this._filterBar.tagFilterProvider.toggleFilterActivation();
            this._updateTestPointsToolbarCommandStates();
        }
        else if (command === this._testPointToolbarItemIds.newTestCase) {
            this._createNewTestCase();
        }
        else if (command === this._testPointToolbarItemIds.newTestCaseWithGrid) {
            this._createNewTestCaseWithGrid();
        }
        else if (command === this._testPointToolbarItemIds.editQuery) {
            this._editQuery();
        }
        else if (command === this._testPointToolbarItemIds.addTestCases) {
            this._addTestCases();
        }
        else if (command === this._testPointToolbarItemIds.removeTestCase) {
            this._removeSelectedTestCases(this._testPointList.getSelectedTestPoints());
        }
        else if (command === this._testPointToolbarItemIds.refreshTestPoints) {
            this._refresh(Utils_Core.delegate(this, this._resumeRunAfterExtensionInstallation));

            //Adding telemetry for creating test plan workitem. Area: TestManagement, Feature: TestSuite. Property Action has value Refresh
            TelemetryService.publishEvent(TelemetryService.featureTestSuite, TelemetryService.suiteActions, TelemetryService.refresh);
        }
        else if (command === this._testPointToolbarItemIds.openTestCase) {
            this._onOpenTestPointDetail();
        }
        else if (command === this._testPointToolbarItemIds.runTestPoints) {
            this._runTestPoints(this._testPointList.getSelectedTestPoints());
        }
        else if (command === this._testPointToolbarItemIds.runTestPointsUsingClient) {
            this._runTestPointsUsingClient(this._testPointList.getSelectedTestPoints());
        }
        else if (command === this._testPointToolbarItemIds.runTestPointsWithOptions) {
            this._runTestPointsWithOptions(this._testPointList.getSelectedTestPoints());
        }
        else if (command === this._testPointToolbarItemIds.passTest) {
            this._setOutcome(this._testPointList.getSelectedTestPoints(), TCMConstants.TestOutcome.Passed);
        }
        else if (command === this._testPointToolbarItemIds.failTest) {
            this._setOutcome(this._testPointList.getSelectedTestPoints(), TCMConstants.TestOutcome.Failed);
        }
        else if (command === this._testPointToolbarItemIds.blockTest) {
            this._setOutcome(this._testPointList.getSelectedTestPoints(), TCMConstants.TestOutcome.Blocked);
        }
        else if (command === this._testPointToolbarItemIds.notApplicableTest) {
            this._setOutcome(this._testPointList.getSelectedTestPoints(), TCMConstants.TestOutcome.NotApplicable);
        }
        else if (command === this._testPointToolbarItemIds.resetTest) {
            this._resetTestPoints(this._testPointList.getSelectedTestPoints());
        }
        else if (command === this._testPointToolbarItemIds.orderTests) {
            this._createOrderTestCasesControl();
        }
        else if (command === this._testPointToolbarItemIds.columnOptions) {
            this._launchColumnOptionsDialog();

            //Adding telemetry for creating test plan workitem. Area: TestManagement, Feature: CloumnOptionsForTestView
            TelemetryService.publishEvents(TelemetryService.featureColumnOptionsForTestView, {});
        }
        else if (command === this._testPointToolbarItemIds.saveTests) {
            this._saveTests(this._testPointList.getDirtyTests());
        }
        else if (command === this._testPointToolbarItemIds.resumeRun) {
            this._resumeRun();
        }
        else if (command === this._testPointToolbarItemIds.toggleTestCaseDetailsPane) {
            this._toggleTestCaseDetailsPane();
        }
    }

    private _resumeRunAfterExtensionInstallation(): void {
        if (window.sessionStorage.getItem("resumeTestSessionAfterClose") === "true") {
            window.sessionStorage.removeItem("resumeTestSessionAfterClose");
            this._resumeRun();
        }
    }

    private _createOrderTestCasesControl() {
        VSS.using(["TestManagement/Scripts/OrderTests/TFS.TestManagement.OrderTests.Control"], (
            OrderTestsModule: typeof OrderTestsControl_LAZY_LOAD

        ) => {
            let testViewPane = this._element.find(".test-view-right-pane .leftPane");
            if (testViewPane) {
                this._setVisibility(GridAreaSelectors.viewGrid, false);
                this._hideTestViewFilters();
                this._clearAndHideTagsFilter();
                this._updateToolbarCommandStatesAfterOrderTests();
                let suiteId: number = this.getCurrentSuiteId();

                // Dispose the ordertests control if present
                if (this._orderTestsControl) {
                    this._disposeOrderTestCasesControl();
                }

                this._orderTestsControl = new OrderTestsModule.OrderTestsControl({
                    container: testViewPane,
                    suiteId: suiteId,
                    orderTestControlDispose: delegate(this, this._onOrderTestControlDispose),
                    onError: delegate(this, this._onOrderTestsControlError)
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
                            this._listViewShortcutGroup.removeShortcutGroup();
                        })
                            .fail((error) => {
                                this.showError(VSS.getErrorMessage(error));
                            });
                    });
            }
        });
    }

    private _getAdditionalWitColumnsForOrderTests(): IPromise<WITOM.FieldDefinition[]> {
        let deferred: Q.Deferred<WITOM.FieldDefinition[]> = q.defer<WITOM.FieldDefinition[]>();
        this._beginGetAdditionalFieldsToShowAndCreateGridView((additionalFields) => {
            let updatedColumns = this._updateOrderAsColumns(additionalFields);
            return deferred.resolve(updatedColumns);
        }, (error) => {
            deferred.reject(null);
        });

        return deferred.promise;
    }

    private _onOrderTestControlDispose(refreshGrid: boolean) {
        let suiteId: number = this.getCurrentSuiteId();
        this._disposeOrderTestCasesControl();

        this._setVisibility(GridAreaSelectors.viewGrid, true);

        if (refreshGrid) {
            this._onSortOrderChanged(this._testPointList, { index: "sequenceNumber", order: "asc" }, true);
        }
        else {
            //we have to reinitialize the source as the grid was showing only 3 rows as the canvas of grid was coming zero.
            let visibleRange = this._testPointList._getVisibleRowIndices();
            this._testPointList.initializeDataSource();
            this._testPointList._getRowIntoView(visibleRange.last);
        }
        this._reRegisterShortcutGroup(this._listGroupName);
    }

    private _onOrderTestsControlError(error: string) {
        this.showError(VSS.getErrorMessage(error));
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

        this._testPlanAndSuitesMenubar.updateCommandStates([{ id: this._testPlanAndSuitesCommandIds.showTestsFromChildSuites, toggled: this._showTestsFromChild, disabled: true }]);
    }

    private _reRegisterShortcutGroup(groupName: string) {
        if (this._testShortcutGroup) {
            this._testShortcutGroup.removeShortcutGroup();
        }
        this._testShortcutGroup = new TestShortcutGroup(this);
        if (groupName === this._listGroupName) {
            this._listViewShortcutGroup = new ListViewShortcutGroup(this);
        }
        else if (groupName === this._gridGroupName) {
            this._gridViewShortcutGroup = new GridViewShortcutGroup(this);
        } else if (groupName === this._chartsGroupName) {
            VSS.using(["TestManagement/Scripts/TFS.TestManagement.Controls.Charts"], (Module: typeof TCMControlsCharts_LAZY_LOAD) => {
                this._testManagementChartsView.chartsShortcutGroup = new Module.TestChartsShortcutGroup(this._testManagementChartsView);
            });
        }
    }

    private _initializeAndShowTestCharts() {
        VSS.using(["TestManagement/Scripts/TFS.TestManagement.Controls.Charts"], (Module: typeof TCMControlsCharts_LAZY_LOAD) => {
            Diag.logVerbose("[_initializeAndShowTestCharts] _initializeAndShowTestCharts method called");

            if (!this._testManagementChartsView) {
                this._testManagementChartsView = Controls.BaseControl.createIn(Module.TestManagementChartsView, this._element.find(".hub-pivot-content"), {
                    tfsContext: this._options.tfsContext,
                    suite: this._testSuitesTree.getSelectedSuite(),
                    plan: this._currentPlan.plan
                });
                this._testManagementChartsView.hideElement();
            } else {
                this._testManagementChartsView.setFilterContext(this._currentPlan.plan, this._testSuitesTree.getSelectedSuite());
            }

            if (!this._testManagementChartsInfoBar) {
                this._element.find(".hub-title").empty();
                this._testManagementChartsInfoBar = Controls.BaseControl.createIn(Module.TestManagementChartsInfoBar, this._element.find(".hub-title").eq(0),
                    {
                        tfsContext: this._options.tfsContext
                    });
                this._testManagementChartsInfoBar.hideElement();
                this._testManagementChartsInfoBar.bind(this._testManagementChartsView);
            }

            this._showTestCharts();

            Diag.logVerbose("[_initializeAndShowTestCharts] _initializeAndShowTestCharts method exit");
        });
    }


    private _hideTestChartsView() {
        Diag.logVerbose("[_hideTestChartsView] hideTestChartsView method called");
        if (this._testManagementChartsView) {
            this._testManagementChartsView.hideElement();
        }
        if (this._testManagementChartsInfoBar) {
            this._testManagementChartsInfoBar.hideElement();
        }

        Diag.logVerbose("[_hideTestChartsView] hideTestChartsView method exit");
    }

    private _setupNavigation() {
        /// <summary>Setup all of the navigation events and perform the initial navigation.</summary>
        let historySvc = Navigation_Services.getHistoryService();
        let state = historySvc.getCurrentState();
        this._tabs = <Navigation.PivotView>Controls.Enhancement.ensureEnhancement(Navigation.PivotView, this._element.find(".test-items-tabs"));

        historySvc.attachNavigate(TestPivots.TESTS, (sender, state) => {
            this._navigate(TestPivots.TESTS, state, false);
        });

        // Attaching the navigate method for Test chart

        historySvc.attachNavigate(TestPivots.CHARTS, (sender, state) => {
            this._navigate(TestPivots.CHARTS, state, false);
        });

        if (state.action === "charts") {
            this._navigate(TestPivots.CHARTS, state, true);
        }
        else {
            this._navigate(TestPivots.TESTS, state, true);
        }
    }

    /// <summary>Called whenever url changes and takes care of setting up selection based on url state</summary>
    /// <param name="state" type="Object">The state info for the new navigation</param>
    /// <param name="isInitializing" type="Boolean">The flag indiciating if we are here for the first time</param>
    private _navigate(action: string, state: any, isInitializing: boolean) {
        let view;

        // Check for bulkedit cleanup in case of grid view before navigating
        if ((this._viewFilter && this._viewFilter.getSelectedItem().value === "grid") && (this._bulkEditTestsViewModel && !this._bulkEditTestsViewModel.cleanup())) {
            return;
        }

        if (this._tabs) {
            view = this._tabs.getView(TestPivots.TESTS);
            view.selected = (action === TestPivots.TESTS) ? true : false;

            view = this._tabs.getView(TestPivots.CHARTS);
            view.selected = (action === TestPivots.CHARTS) ? true : false;

            this._tabs.updateItems();
        }
        this._selectedPivot = action;

        if (action === TestPivots.TESTS) {
            if (isInitializing) {
                Performance.getScenarioManager().startScenarioFromNavigation(TMUtils.TcmPerfScenarios.Area, TMUtils.TcmPerfScenarios.GotoTestHub, true);
            }
            else {
                if (this._testSuitesTree) {
                    let selectedSuite = this._testSuitesTree.getSelectedSuite();
                }
            }
        }

        this.parseStateInfo(state, isInitializing, delegate(this, this._onParseStateInfoSuccess));
    }

    private _updateTabUrls(planId: number, suiteId: number) {
        let tabview,
            actionlink;

        if (this._tabs) {
            let historySvc = Navigation_Services.getHistoryService();
            actionlink = historySvc.getFragmentActionLink(TestPivots.TESTS);
            tabview = this._tabs.getView(TestPivots.TESTS);
            tabview.link = TMUtils.UrlHelper.getPivotUrl(actionlink, planId, suiteId);

            actionlink = historySvc.getFragmentActionLink(TestPivots.CHARTS);
            tabview = this._tabs.getView(TestPivots.CHARTS);
            tabview.link = TMUtils.UrlHelper.getPivotUrl(actionlink, planId, suiteId);

            this._tabs.updateItems();
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

    private _currentSuiteTestCaseIds: number[] = [];

    private _refreshAndPopulatetestPointList(planId: number, suiteId: number, repopulateSuite: boolean, suppressFocusChange?: boolean,
        pageSize: number = TMUtils.maxPageSize, callback?: IResultCallback) {
        /// <summary>Fetches the testpoints for the selected suiteId and planId and resets the source of the TestPoints grid.</summary>
        /// <param name="planId" type="Number">the planid whose points are to be fetched</param>
        /// <param name="suiteId" type="Number">the suiteId whose points are to be fetched</param>
        /// <param name="repopulateSuite" type="boolean">Repopulate the test suite on server in case of dynamic test suites</param>
        Diag.logTracePoint("TestHubView._refreshAndPopulatetestPointList.start");
        let selectedSuite;
        this._enableFilters(false);
        pageSize = PageHelper.PageHelper.getPageSize();
        let outcomeFilter = this._getOutcomeFilterValue();
        let testerFilter = this._getValueOfTesterFilter();
        let configurationFilter = this._getIdOfConfigurationInFilter(this._getConfigurationFilterValue());
        this._testPlanManager.getTestPointsForSuite(planId, suiteId, repopulateSuite, this._createDisplayColumns(), outcomeFilter, testerFilter, configurationFilter, (testPointsQueryResult: TestsOM.ITestPointQueryResultModel) => {
            let testPoints: TestsOM.ITestPointModel[] = testPointsQueryResult.testPoints;

            //Modify SequnceNumber
            this._modifySequenceNumber(testPoints);

            //Setting up the ids for pagination
            this._pageHelper = new PageHelper.PageHelper(testPointsQueryResult.sortedPointIds, pageSize, pageSize);
            //Skiping the 1st page as it is already fetched
            this._pageHelper.setStartingPage(1);

            this._parseTestCaseFieldsInTestPoints(testPoints);
            selectedSuite = this._testSuitesTree.getSelectedSuite();
            this._currentSuiteTestCaseIds = testPointsQueryResult.testCaseIds;
            this._savedColumns = testPointsQueryResult.columnOptions;
            this._sortOrder = testPointsQueryResult.columnSortOrder;
            this._wereColumnsChanged = false;
            this._cachedTestPointData = testPoints;
            this._cachedTotalTestPointCount = testPointsQueryResult.totalPointsCount;
            let totalPointsCount = this._cachedTotalTestPointCount;
            let configurations = testPointsQueryResult.configurations;

            if (selectedSuite && suiteId === selectedSuite.id) {
                // if ShowChildSuites is enabled or any filter is set, we do not update test points
                // this is because, filtering on filtered cached data gives wrong results
                // and we are anyways refreshing suite points in the next call
                if (this._showTestsFromChild || this._isFilterApplied()) {
                    this._updateTestPointsAndFilters(selectedSuite, suiteId, this._cachedTestPointData, totalPointsCount, suppressFocusChange, false, configurations);
                }
                else {
                    this._updateTestPointsAndFilters(selectedSuite, suiteId, this._cachedTestPointData, totalPointsCount, suppressFocusChange, true, configurations);
                }
            }
            // If show child suites is enabled then refresh the points count of all the test suites.
            if (this._showTestsFromChild) {
                this._refreshSuitePointCounts(null);
            } else {
                if (this._isFilterApplied()) {
                    this._refreshSuitePointCounts(selectedSuite);
                }
            }
            if (callback) {
                callback();
            }
        },
            (error) => {
                if (error.type && error.type === TestsOM.Exceptions.WiqlSyntaxException) {
                    alert(VSS.getErrorMessage(error));
                    this._updateTestPointsToolbarCommandStates();
                }
                else {
                    this.showError(VSS.getErrorMessage(error));
                }
                
            }, pageSize, this._showTestsFromChild);
    }

    private _modifySequenceNumber(testPoints: TestsOM.ITestPointModel[]) {
        let sequenceNumbers: number[] = [];
        let i: number;
        let length = testPoints ? testPoints.length : 0;
        if (testPoints && length > 0) {

            for (i = 0; i < length; i++) {
                if (sequenceNumbers.indexOf(testPoints[i].sequenceNumber) < 0) {
                    sequenceNumbers.push(testPoints[i].sequenceNumber);
                }
            }

            //sort the sequence numbers in ascending orders
            sequenceNumbers.sort(function (a, b) { return a - b; });

            //Create a map of original sequnce number and sequence number to store
            let map = {};
            for (i = 0; i < length; i++) {
                map[sequenceNumbers[i]] = i + 1;
            }

            for (i = 0; i < length; i++) {
                testPoints[i].sequenceNumber = map[testPoints[i].sequenceNumber];
            }
        }
    }

    private _beginPageTestpoints() {
        let testpointIdsToFetch: number[];

        if (this._pagingInProgress) {
            Diag.logVerbose("[_beginPageTestPoints]There is a paging currently in progress. Will not attempt paging.");
            return;
        }

        if (!this._pageHelper || !this._pageHelper.canPage()) {
            return;
        }

        testpointIdsToFetch = this._pageHelper.getIdsToFetch();
        this._pagingInProgress = true;
        let that = this;

        this._fetchTestPoints(testpointIdsToFetch, false, null, () => {

            that._pagingInProgress = false;
            if (that._pageHelper) {
                that._pageHelper.pageFetchComplete();
            }
            if (that.pageFetched) {
                that.pageFetched();
            }
        });
    }

    public fetchMoreTestPoints() {
        Diag.logVerbose("Requesting to fetch more test points");

        if (this._pagingInProgress) {
            Diag.logVerbose("[fetchMoreTests]Paging is in progress. Queue the request to page complete.");
            this.pageFetched = () => {
                this.pageFetched = null;
                this._beginPageTestpoints();
            };
        } else {
            Diag.logVerbose("[fetchMoreTests]Fetch more test cases from the server.");
            this._beginPageTestpoints();
        }
    }

    private _updateTestPointsAndFilters(selectedSuite: any, suiteId: number, testPoints, totalPointCount: number, suppressFocusChange?: boolean, updateTestPoints?: boolean, configurations?: TestsOM.ITestConfigurationModel[]) {
        this._updateTesterFilterValues(testPoints);
        this._updateConfigurationFilterValues(configurations);

        let initialCount = testPoints.length;
        let filteredItemLength = this._filter(testPoints, suppressFocusChange);
        if (updateTestPoints && selectedSuite && this._updatePointCountForSuite(selectedSuite, selectedSuite.pointCount)) {
            this._updateTotalPointCountForSuite(selectedSuite, totalPointCount);
            this._testSuitesTree.updateSelectedSuite();
        }

        this._enableFilters(true);
        this._removeHighlightOnRefreshMenu();
        Performance.getScenarioManager().endScenario(TMUtils.TcmPerfScenarios.Area, TMUtils.TcmPerfScenarios.GotoTestHub);
        Diag.logTracePoint("TestHubView._refreshAndPopulatetestPointList.complete");
    }

    private _removeHighlightOnRefreshMenu() {
        let $menuItem: JQuery = TMUtils.getRefreshMenuItem($(document));
        if ($menuItem) {
            $menuItem.removeClass("hover");
        }
    }

    private _createDisplayColumns(): TestsOM.ITestPointGridDisplayColumn[] {
        let displayColumns: TestsOM.ITestPointGridDisplayColumn[] = [],
            col: TestsOM.ITestPointGridDisplayColumn;

        if (!this._savedColumns || this._savedColumns.length === 0 || !this._wereColumnsChanged) {
            return displayColumns;
        }

        $.each(this._savedColumns, function (index, entry: any) {
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

    private _enableFilters(enable: boolean) {
        /// <summary>Enable/Disable filters.</summary>
        /// <param name="enable" type="Boolean">If enable is false, filter is disabled, if it is true it is enabled.</param>
        this._enableFilter(this._testPointOutcomeFilter, enable);
        this._enableFilter(this._testerFilter, enable);
        this._enableFilter(this._configurationFilter, enable);
        this._enableFilter(this._viewFilter, enable);
        this._enableFilter(this._paneFilter, enable);
    }

    private _enableFilter(filter: any, enable: boolean) {
        /// <summary>Enable/Disable filters.</summary>
        /// <param name="filter" type="Object">The filter to be enabled/disabled.</param>
        /// <param name="enable" type="Boolean">If enable is false, filter is disabled, if it is true it is enabled.</param>
        if (filter) {
            if (enable === false) {
                filter.showBusyOverlay();
            }
            else {
                filter.hideBusyOverlay();
            }
        }
    }

    private _onTestPointSelectionChanged(sender: any, e?: any) {
        /// <summary>Event handler for selectionchanged event in test point list.</summary>
        /// <param name="sender" type="Object">sender object</param>
        /// <param name="e" type="Object">event arguments</param>
        this._updateTestPointsToolbarCommandStates();
    }

    private _onRemoveTestPoints(sender, e?: any) {
        /// <summary>Event handler for delete key pressed event in test point list.</summary>
        /// <param name="e" type="Object">event arguments</param>
        if (this._canRemoveTestCase()) {
            this._removeSelectedTestCases(this._testPointList.getSelectedTestPoints());
        }
    }

    private _isSortOrderChanged(sortOrder: TestsOM.IColumnSortOrderModel, oldSortOrder: TestsOM.IColumnSortOrderModel): boolean {
        if (oldSortOrder.index === sortOrder.index && oldSortOrder.order === sortOrder.order) {
            return false;
        } else {
            return true;
        }
    }

    private _onSortOrderChanged(sender: TestPointsGrid, sortOrder: TestsOM.IColumnSortOrderModel, forceRefresh: boolean) {
        let testPoint: TestsOM.ITestPointModel;
        let that = this;
        let oldSortOrder = this._sortOrder;

        // Return if sort order is not changed.
        if (!this._isSortOrderChanged(sortOrder, oldSortOrder) && !forceRefresh) {
            return;
        }

        this._testPointList._clearGrid();

        //delay the call
        new TMUtils.DelayedExecutionHelper().executeAfterLoadComplete(this, () => {
            TMUtils.getTestPlanManager().updateColumnSortOrder({ index: sortOrder.index, order: sortOrder.order }, () => {
                this._refreshAndPopulatetestPointList(that._currentPlan.plan.id, that._currentPlan.selectedSuiteId, true, false, TMUtils.maxPageSize, () => {
                    this._testPointList.setSelectedRowIndex(0);
                    this._testPointList.getSelectedRowIntoView();
                });
            });
        });
        this._sortOrder = sortOrder;
        this._testPointList.sortOrder = sortOrder;
        testPoint = this._testPointList.getSelectedTestPoint();
        this._showWorkItemBasedOnSelection(testPoint ? testPoint.testCaseId : 0);
    }

    private _canCreateTestCase() {
        return this._testSuitesTree.getSelectedSuite() && this._testSuitesTree.getSelectedSuite().type !== TCMConstants.TestSuiteType.DynamicTestSuite && this._isAnySuiteSelected();
    }

    private _canOpenTestCase(): boolean {
        /// <summary>Checks if a row can be opened and returns false for no selection or multi selection</summary>
        /// <returns type="Boolean">true if test case open button should be enabled</returns>
        if (!this._testPointList) {
            // if test point list is not initialized yet, return false;
            return false;
        }
        let selectionCount = this._testPointList.getSelectionCount();
        return (selectionCount === 1);
    }

    private _isAnySuiteSelected(): boolean {
        ///<summary> Checks if there is a suite selected in the suite tree</summary>
        /// <returns type="Boolean">true if no suite is selected or the tree does not display</returns>
        return (this._testSuitesTree && this._testSuitesTree.getSelectedNode());
    }

    private _canRefreshTestPointList(): boolean {
        /// <summary>checks whether test case list can be refreshed</summary>
        /// <returns type="Boolean">true if no suite is selected or the tree does not display</returns>
        return this._isAnySuiteSelected();
    }

    private _canRunTests(): boolean {
        /// <summary>Checks if the Test Run is possible based on the selections in the test point list</summary>
        /// <returns type="Boolean">true if test Run is posssible</returns>
        let selectedTestPoints,
            selectionCount = 0;
        if (!this._testPointList || this._testPointList._dataSource.length === 0) {
            // if test point list is not initialized yet, return false;
            return false;
        }

        selectedTestPoints = this._testPointList.getSelectedTestPoints();
        selectionCount = this._testPointList.getSelectionCount();
        if (selectedTestPoints && selectionCount > 0) {
            return true;
        }
        else {
            return false;
        }
    }

    private _canRemoveTestCase(): boolean {
        /// <summary>Checks if the removing of TestCase is possible based on the selections in the test point list</summary>
        /// <returns type="Boolean">true if testCase remove is posssible</returns>
        let selectedSuite = this._testSuitesTree.getSelectedSuite();
        return this._isAnyTestPointSelectedValid() && selectedSuite && selectedSuite.type !== TCMConstants.TestSuiteType.DynamicTestSuite;
    }

    private _canShowAddAndRemoveTestCase(): boolean {
        if (this._testSuitesTree.getSelectedSuite()) {
            return this._testSuitesTree.getSelectedSuite().type !== TCMConstants.TestSuiteType.DynamicTestSuite;
        }

        return true;
    }

    private _areThereAutomatedTests(testPoints): boolean {
        /// <summary>Returns true if any of the testPoints passed as parameter are automated.</summary>
        let index = 0,
            testPoint;
        for (index = 0; index < testPoints.length; index++) {
            testPoint = testPoints[index];
            if (testPoint.automated) {
                return true;
            }
        }

        return false;
    }

    private _canSetOutcome() {

        return this._isAnyTestPointSelectedValid((selectedTestPoints) => {
            return !this._isThereAnyTestPointInState(selectedTestPoints, Resources.TestPointState_Paused);
        });
    }

    private _canResetTestPoints() {
        return this._isAnyTestPointSelectedValid((selectedTestPoints) => {
            return this._isThereAnyTestPointNotInState(selectedTestPoints, Resources.TestPointState_Ready);
        });
    }

    private _isThereAnyTestPointNotInState(selectedTestPoints, state: string): boolean {
        let index,
            length = selectedTestPoints.length;
        for (index = 0; index < length; index++) {
            if (selectedTestPoints[index].outcome !== state) {
                return true;
            }
        }

        return false;
    }

    private _isThereAnyTestPointInState(selectedTestPoints, state: string) {
        let index,
            length = selectedTestPoints.length;
        for (index = 0; index < length; index++) {
            if (selectedTestPoints[index].outcome === state) {
                return true;
            }
        }

        return false;
    }

    private _canSaveTests() {
        let dirtyTests = this._testPointList.getDirtyTests(),
            hasDirtyTests = dirtyTests && dirtyTests.length > 0;

        if (!this._testPointList || (this._testPointList._dataSource.length === 0 && !hasDirtyTests)) {
            // if test point list is not initialized yet, return false;
            return false;
        }

        return hasDirtyTests;
    }

    private _areTestCasesDirty(ids: number[]) {
        let dirtyTests = this._testPointList.getDirtyTests(),
            i: number,
            numDirtyTest = dirtyTests ? dirtyTests.length : 0;
        for (i = 0; i < numDirtyTest; i++) {
            if (ids.indexOf(dirtyTests[i].id) !== -1) {
                return true;
            }
        }
        return false;
    }

    private _isAnyTestPointSelectedValid(validationDelegate?: any): boolean {
        /// <summary>return true if one or more valid test points are selected in the grid</summary>
        /// <param name="validationDelegate" type="any" optional="true" />
        /// <returns type="boolean" />

        if (!this._testPointList || this._testPointList._dataSource.length === 0) {
            // if test point list is not initialized yet, return false;
            return false;
        }

        let selectedTestPoints;
        selectedTestPoints = this._testPointList.getSelectedTestPoints();
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

    private _isAnyTestPointPresent() {
        return this._testPointList && this._testPointList._dataSource.length > 0;
    }

    private _updateTestPointsToolbarCommandStates() {
        /// <summary>Updates the states of toolbar buttons - refresh and open-test-case based on test case count and selection</summary>
        this._testPointsToolbar.updateCommandStates(
            [
                {
                    id: this._testPointToolbarItemIds.newTestCaseDropDown,
                    disabled: !this._canCreateTestCase(),
                    hidden: !this._canShowAddAndRemoveTestCase()
                },
                {
                    id: this._testPointToolbarItemIds.newTestCase,
                    disabled: !this._canCreateTestCase(),
                    hidden: !this._canShowAddAndRemoveTestCase()
                },
                {
                    id: this._testPointToolbarItemIds.newTestCaseWithGrid,
                    disabled: !this._canCreateTestCase(),
                    hidden: !this._canShowAddAndRemoveTestCase()
                },
                {
                    id: this._testPointToolbarItemIds.editQuery,
                    hidden: this._canShowAddAndRemoveTestCase()
                },
                {
                    id: this._testPointToolbarItemIds.addTestCases,
                    disabled: !this._canCreateTestCase(),
                    hidden: !this._canShowAddAndRemoveTestCase()
                },
                {
                    id: this._testPointToolbarItemIds.removeTestCase,
                    disabled: !this._canRemoveTestCase(),
                    hidden: !this._canShowAddAndRemoveTestCase()
                },
                {
                    id: this._testPointToolbarItemIds.refreshTestPoints,
                    disabled: !this._canRefreshTestPointList(),
                    hidden: false
                },
                {
                    id: this._testPointToolbarItemIds.openTestCase,
                    disabled: !this._canOpenTestCase(),
                    hidden: false
                },
                {
                    id: this._testPointToolbarItemIds.runTestDropMenu,
                    disabled: !this._canRunTests(),
                    hidden: false
                },
                {
                    id: this._testPointToolbarItemIds.runTestPoints,
                    disabled: !this._canRunTests(),
                    hidden: false
                },
                {
                    id: this._testPointToolbarItemIds.runTestPointsUsingClient,
                    disabled: !this._canRunTests(),
                    hidden: false
                },
                {
                    id: this._testPointToolbarItemIds.runTestPointsWithOptions,
                    disabled: !this._canRunTests(),
                    hidden: false
                },
                {
                    id: this._testPointToolbarItemIds.blockTest,
                    disabled: !this._isAnyTestPointSelectedValid(),
                    hidden: false
                },
                {
                    id: this._testPointToolbarItemIds.resetTest,
                    disabled: !this._canResetTestPoints(),
                    hidden: false
                },
                {
                    id: this._testPointToolbarItemIds.passTest,
                    disabled: !this._canSetOutcome(),
                    hidden: false
                },
                {
                    id: this._testPointToolbarItemIds.failTest,
                    disabled: !this._canSetOutcome(),
                    hidden: false
                },
                {
                    id: this._testPointToolbarItemIds.saveTests,
                    disabled: !this._canSaveTests(),
                    hidden: false
                },
                {
                    id: this._testPointToolbarItemIds.notApplicableTest,
                    disabled: !this._canSetOutcome(),
                    hidden: false
                },
                {
                    id: this._testPointToolbarItemIds.resumeRun,
                    disabled: !this._canResumeRun(),
                    hidden: false
                },
                {
                    id: this._testPointToolbarItemIds.columnOptions,
                    disabled: !this._isAnySuiteSelected(),
                    hidden: false
                },
                {
                    id: this._testPointToolbarItemIds.toggleTestCaseDetailsPane,
                    toggled: this._isTestCaseDetailsPaneOn()
                },
                {
                    id: this._testPointToolbarItemIds.toggleFilter,
                    toggled: this._tagFilterProvider && this._tagFilterProvider.isActive()
                }
            ]);

            this._testPointsToolbar.updateCommandStates([{ id: this._testPointToolbarItemIds.orderTests, disabled: this._showTestsFromChild || !this._isAnyTestPointPresent(), hidden: false }]);
    }

    private _isTestNotApplicable(): boolean {
        return this._testPointList.getSelectedTestPoints().length > 0;
    }

    private _updateTesterFilterValues(testPoints) {
        /// <summary>Updates the pivot filter with possible values.</summary>
        //for tester filter
        let selectedTester = this._getSelectedValueInFilter(this._testerFilter),
            testerFilterValues: string[] = [],
            testersMap = new TFS_Core_Utils.Dictionary<string>(),
            index: number;

        $.each(testPoints, (i, testPoint) => {
            if (!testersMap.containsKey(testPoint["assignedTo"])) {
                testersMap.add(testPoint["assignedTo"], testPoint["tester"]);
                testerFilterValues.push(testPoint["tester"]);

                index = Utils_Array.findIndex(this._testersInPlan, (t: TestsOM.ITesterModel) => {
                    return (Utils_String.ignoreCaseComparer(t.id, testPoint["assignedTo"]) === 0);
                });

                if (index >= 0) {
                    this._testersInPlan[index].filterValue = testPoint["tester"];
                }
            }
        });

        $.each(this._testersInPlan, (i, tester) => {
            if (!testersMap.containsKey(tester.id)) {
                if (!tester.filterValue) {
                    tester.filterValue = TFS_OM_Identities.IdentityHelper.getUniquefiedIdentityName(tester);
                }
                testerFilterValues.push(tester.filterValue);
            }
        });

        testerFilterValues = FilterHelper.getUniqueFilterValues([], "tester", selectedTester, testerFilterValues);
        $.each(testerFilterValues, (i: number, value: any) => {
            if (value && value.text) {
                let identity = TFS_OM_Identities.IdentityHelper.parseUniquefiedIdentityName(value.text);
                let getIdentityImage = function () {
                    return IdentityImage.identityImageElementByIdentifier(identity, null, value.title, identity.displayName);
                };

                value.id = value.text;
                value.text = identity.displayName;
                value.icon = identity.uniqueName ? getIdentityImage : null;
            }
        });

        this._testerFilter.updateItems(testerFilterValues, { showItemIcons: true });
    }

    private _updateConfigurationFilterValues(configurations: TestsOM.ITestConfigurationModel[]) {
        let selectedConfiguration = this._getSelectedValueInFilter(this._configurationFilter);

        let configFilterValues = [],
            configsMap = [],
            index: number;
        // Add "All" as the first filter value.
        configFilterValues.push({
            text: FilterHelper.ALL_FILTER,
            value: FilterHelper.ALL_FILTER,
            selected: !selectedConfiguration || selectedConfiguration === FilterHelper.ALL_FILTER,
            title: FilterHelper.ALL_FILTER
        });

        $.each(configurations, (i, configuration) => {
            if (configsMap.indexOf(configuration.name) === -1) {
                configsMap.push(configuration.name);

                index = Utils_Array.findIndex(this._configurationsInPlan, (t: TestsOM.ITestConfigurationModel) => {
                    return (t.id === configuration.id);
                });

                if (index < 0) {
                    this._configurationsInPlan.push({
                        id: configuration.id,
                        name: configuration.name,
                        variables: null
                    });
                }
            }
        });

        this._configurationsInPlan = this._configurationsInPlan.sort((a: TestsOM.ITestConfigurationModel, b: TestsOM.ITestConfigurationModel) => {
            return Utils_String.localeIgnoreCaseComparer(a.name, b.name);

        });

        // Populate the filter item values.
        for (let i = 0, length = this._configurationsInPlan.length; i < length; i++) {
            configFilterValues.push({
                text: this._configurationsInPlan[i].name,
                value: this._configurationsInPlan[i].name,
                selected: (selectedConfiguration && selectedConfiguration === this._configurationsInPlan[i].name) ? true : false,
                title: this._configurationsInPlan[i].name
            });
        }

        this._configurationFilter.updateItems(configFilterValues);
    }

    private _onOpenTestPointDetail() {
        /// <summary>function that executes upon double clicking an item in grid</summary>
        this._testPointList.openSelectedTestCase();
    }

    private _removeSelectedTestCases(testPointList) {
        /// <summary>Remove the corresponding test cases of selected test points from the suite</summary>

        if (this._showTestsFromChild) {
            alert(Resources.CannotRemoveTestCases);
            return;
        }
        if (!testPointList || testPointList.length === 0) {
            // if test point list is empty then return
            return;
        }

        DAUtils.trackAction("DeleteTest", "/SuiteManagement");

        TMUtils.removeSelectedTestCases(TestPointsGrid.getTestCaseIdsFromTestPoints(testPointList), this._testPlanManager, this._testSuitesTree.getSelectedSuite(),
            (suiteUpdate: TestsOM.ITestSuiteModel) => {
                if (suiteUpdate) {
                    this._testSuitesTree.updateSuitesRevisionAndPointCount([suiteUpdate]);
                }
                this._refreshAndPopulatetestPointList(this._currentPlan.plan.id, this._currentPlan.selectedSuiteId, true);
            },
            (error) => {
                this.showError(VSS.getErrorMessage(error));
            });

        //Adding telemetry for creating test plan workitem. Area: TestManagement, Feature: RemoveTestsFromSuites. NumberOfPointsSelected property has number of points deleted.
        TelemetryService.publishEvent(TelemetryService.featureRemoveTestsFromSuites, TelemetryService.numberOfPointsSelected, testPointList.length);
    }

    private _refreshSelectedSuite() {
        this._refresh();
    }

    private _refreshTestPoints(testPoints) {
        let testPointInfoList,
            testPointIds,
            testCaseList = [],
            index = 0;

        testCaseList = TestPointsGrid.getTestCaseIdsFromTestPoints(testPoints);
        testPointInfoList = this._getTestPointsForTestCases(testCaseList, this._cachedTestPointData);
        testPointIds = this._getTestPointIds(testPointInfoList);
        if (this._savedColumns) {
            for (index = 0; index < this._savedColumns.length; index++) {
                this._savedColumns[index].width = Math.round(this._savedColumns[index].width);
            }
        }

        this._fetchTestPoints(testPointIds, true, testPointInfoList);
    }

    private _fetchTestPoints(testPointIds: number[], pointsVisibleOnGrid: boolean, testPointInfoList: TestsOM.ITestPointModel[], callback?: () => void) {
        if (testPointIds && testPointIds.length > 0) {
            let initialCount = this._testPointList.getLastRowDataIndex();
            this._testPlanManager.fetchTestPoints(this._currentPlan.plan.id, testPointIds, this._savedColumns, (testPoints: TestsOM.ITestPointModel[]) => {
                let selectedTestPointIds = [];
                this._increaseSeqNumberToRemoveZeroIndex(testPoints);
                let restoreSelection = this._saveSelection(this._testPointList, selectedTestPointIds);
                let selectedSuite = this._testSuitesTree.getSelectedSuite();
                let getSelectedRowIntoView: boolean = false;
                this._parseTestCaseFieldsInTestPoints(testPoints);
                if (pointsVisibleOnGrid) {
                    this._updateTestPointInfoList(testPointInfoList, testPoints);
                    this._updateTestPointsData(testPointInfoList, this._cachedTestPointData);
                    getSelectedRowIntoView = true;
                } else {
                    this._cachedTestPointData = this._cachedTestPointData.concat(testPoints);
                    getSelectedRowIntoView = false;
                }

                this._modifySequenceNumber(this._cachedTestPointData);
                this._updateTesterFilterValues(this._cachedTestPointData);
                let filteredItemLength = this._filter(this._cachedTestPointData, undefined, getSelectedRowIntoView);
                let pointsRemoved = initialCount - filteredItemLength;
                let visiblePoints = pointsVisibleOnGrid ? selectedSuite.pointCount - pointsRemoved : selectedSuite.pointCount;
                this._updatePointCountForSuite(selectedSuite, visiblePoints);
                this._testSuitesTree.updateSelectedSuite();
                this._enableFilters(true);
                this._viewPaneList.refreshList(this._getSelectedTestCaseId(), this._paneFilter.getSelectedItem().value, this._workItemPaneMode, true);
                if (callback) {
                    callback();
                }
                if (restoreSelection) {
                    this._restoreSelection(this._testPointList, selectedTestPointIds);
                }
            },

                (error) => {
                    this.showError(VSS.getErrorMessage(error));
                });
        }
    }

    private _increaseSeqNumberToRemoveZeroIndex(testPoints: TestsOM.ITestPointModel[]) {
        for (let i = 0, length = testPoints.length; i < length; i++) {
            testPoints[i].sequenceNumber = testPoints[i].sequenceNumber + 1;
        }
    }

    private _populateAndGetTestRunDetails(selectedBuildUri?: string, testSettingsId?: number): TestsOM.ITestRunDetails{
        let plan = this._currentPlan.plan,
            selectedSuite = this._testSuitesTree.getSelectedSuite();

        let buildUri = selectedBuildUri ? selectedBuildUri : plan.buildUri;
        let testRunDetails: any = {
            owner: this._options.tfsContext.currentIdentity.id,
            title: selectedSuite ? Utils_String.format(Resources.BulkMarkRunTitle, selectedSuite.title) : "",
            iteration: plan.iteration,
            buildUri: buildUri,
            state: TCMConstants.TestRunState.InProgress,
            isAutomated: false,
            testPlanId: plan.id
        };

        if (testSettingsId > 0) {
            testRunDetails.testSettingsId = testSettingsId;
        }
        return testRunDetails;
    }

    private _populateAndGetTestSession(requirementId: number, testSettingsId?: number): TCMContracts.TestSession {
        let plan = this._currentPlan.plan,
            selectedSuite = this._testSuitesTree.getSelectedSuite();
        let areaName = plan.areaPath;

        //TODO: change source after pankaj change
        let testSession: TCMContracts.TestSession = {
            area: { name: areaName, id: "", url: "" },
            comment: null,
            endDate: null,
            id: 0,
            lastUpdatedBy: null,
            lastUpdatedDate: null,
            owner: null,
            project: null,
            propertyBag: null,
            revision: 0,
            source: TCMContracts.TestSessionSource.XTDesktop2,
            startDate: null,
            state: TCMContracts.TestSessionState.NotStarted,
            title: "Session - " + Utils_Date.localeFormat(new Date(), Utils_Culture.getDateTimeFormat().FullDateTimePattern, true),
            url: null
        };

        testSession.propertyBag = { bag: {} };
        testSession.propertyBag.bag[TCMConstants.TestSessionPropertyBagKeys.testSettingsId] = testSettingsId.toString();
        testSession.propertyBag.bag[TCMConstants.TestSessionPropertyBagKeys.requirementId] = requirementId.toString();
        testSession.propertyBag.bag[TCMConstants.TestSessionPropertyBagKeys.testPlanId] = plan.id;
        return testSession;
    }

    private _setOutcome(testPointList, outcome) {
        let plan = this._currentPlan.plan,
            selectedSuite = this._testSuitesTree.getSelectedSuite(),
            testPointIds = this._getTestPointIdsFromTestPoints(testPointList);

        DAUtils.trackAction("SetOutcome", "/Execution", { outcome: outcome, testPointCount: testPointIds.length });

        this._enableFilters(false);
        this._testPlanManager.bulkMarkTestPoints(plan.id, selectedSuite.id, testPointIds, outcome, () => {
            if (testPointList.length > 0) {
                this._refreshTestPoints(testPointList);
            }

            Diag.logTracePoint("TestHub.SetOutCome.Complete");
        },

            (error) => {
                this.handleTestPointError(Resources.BulkMarkError, error);
            });

        //Adding telemetry for creating test plan workitem. Area: TestManagement, Feature: BulkMarkOutcome. Outcome property has the value if the outcome is changed to Pass, Fail, Not applicable, Blocked.   
        TelemetryService.publishEvents(TelemetryService.featureBulkMarkOutcome, {
            "Outcome": outcome,
            "NumberOfPoints": testPointList.length
        });
    }

    private _resetTestPoints(testPointList) {

        let filteredTestPoints = this._filterOutActiveTestPoints(testPointList);
        DAUtils.trackAction("ResetTests", "/Execution");
        if (filteredTestPoints.length > 0) {
            let testPointIds = this._getTestPointIdsFromTestPoints(filteredTestPoints);

            this._testPlanManager.resetTestPoints(this._currentPlan.plan.id, testPointIds, () => {
                this._refreshTestPoints(filteredTestPoints);
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

    private _filterOutActiveTestPoints(testPoints) {
        let filteredTestPoints = [],
            index = 0,
            length = testPoints.length;

        for (index = 0; index < length; index++) {
            if (testPoints[index].outcome !== Resources.TestPointState_Ready) {
                filteredTestPoints.push(testPoints[index]);
            }
        }

        return filteredTestPoints;
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
            Dialogs.MessageDialog.showMessageDialog($(errorHtml), {
                title: WITResources.TriageViewSaveErrorTitle,
                buttons: [Dialogs.MessageDialog.buttons.ok]
            });
        }
        else {
            this.showError(VSS.getErrorMessage(error));
        }
    }

    private _getTestPointIdsFromTestPoints(testPointList) {
        let testPointIds = [],
            index;

        for (index = 0; index < testPointList.length; index++) {
            testPointIds.push(testPointList[index].testPointId);
        }

        return testPointIds;
    }

    private _canResumeRun() {

        return this._isAnyTestPointSelectedValid((selectedTestPoints: TestsOM.ITestPointModel[]) => {

            return selectedTestPoints.length === 1 &&
                selectedTestPoints[0].state === TCMConstants.TestPointState.InProgress &&
                (selectedTestPoints[0].lastResultState === TCMConstants.TestResultState.Paused || selectedTestPoints[0].mostRecentResultOutcome === TCMConstants.TestOutcome.Paused);
        });
    }

    private _resumeRun() {
        /// <summary> The manual test runner will be launched in a new window and the selected Test points will become available for execution </summary>
        let selectedTestPoints = this._testPointList.getSelectedTestPoints(),
            testRunDetails;
        let webRunner = new TMUtils.WebRunner();

        DAUtils.trackAction("ResumeRun", "/Execution");
        if (webRunner._checkForExistingMtrWindow()) {
            TMUtils.getTestRunManager().getTestRun(selectedTestPoints[0].mostRecentRunId, selectedTestPoints[0], (testRunAndResults) => {
                testRunAndResults = TMUtils.TestCaseResultUtils.getIterationAndStepResultAttachments(testRunAndResults);
                testRunAndResults.bugCategoryName = this._bugCategoryTypeName;
                webRunner._openRunInNewWindow(testRunAndResults, this._testSuitesTree.getSelectedSuite());
            },

                (error) => {
                    this.showError(Utils_String.format("{0} {1}", Resources.TestRunnerStartResumeError, VSS.getErrorMessage(error)));
                });
        }
    }

    private _runTestPoints(testPoints: TestsOM.ITestPointModel[], selectedBuildUri?: string) {
        /// <summary> The manual test runner will be launched in a new window and the selected Test points will become available for execution </summary>
        let webRunner = new TMUtils.WebRunner();
        DAUtils.trackAction("RunTestUsingWeb", "/Execution");
        if (webRunner._checkForExistingMtrWindow()) {
            let isChrome: boolean = Utils_UI.BrowserCheckUtils.isChrome();
            let settingName: string = isChrome ? Resources.ChromeBrowserSettingsName : Resources.NonChromeBrowserSettingsName;
            Performance.getScenarioManager().startScenario(TMUtils.TcmPerfScenarios.Area, TMUtils.TcmPerfScenarios.LoadManualTests);
            this._createTestSettings(settingName, [], (testSettingsId: number) => {

                this._createTestRun(testPoints, selectedBuildUri, testSettingsId, (testRunAndResults) => {
                    testRunAndResults.bugCategoryName = this._bugCategoryTypeName;
                    webRunner._openRunInNewWindow(testRunAndResults, this._testSuitesTree.getSelectedSuite());
                },
                    (error) => {
                        this.handleTestPointError(Resources.TestRunError, error);
                    });

            });
            TelemetryService.publishEvents(TelemetryService.featureRunTest, {});
        }
    }

    private _createTestRun(testPoints: TestsOM.ITestPointModel[], selectedBuildUri: string, testSettingsId: number, callback, errorCallback?) {

        if (!this._validateSelectedTestPoints(testPoints)) {
            return;
        }
        let testRunDetails: any = this._populateAndGetTestRunDetails(selectedBuildUri, testSettingsId);
        TMUtils.getTestRunManager().create(testRunDetails, testPoints, callback, errorCallback);
    }

    private _createXTClientSession(requirementId: number, testSettingsId: number, callback, errorCallback?) {
        let testSesion: any = this._populateAndGetTestSession(requirementId, testSettingsId);
        TMUtils.getTestSessionManager().createTestSession(testSesion).then((session) => {
            callback(session);
        }, (error) => {
            errorCallback(error);
        });
    }

    private _runTestPointsUsingClient(testPoints: TestsOM.ITestPointModel[]) {
        let testPointIds: number[] = [],
            clientUrl: string,
            i: number,
            len: number;

        if (this._validateSelectedTestPoints(testPoints, true)) {

            DAUtils.trackAction("RunTestUsingClient", "/Execution");
            for (i = 0, len = testPoints.length; i < len; i++) {
                testPointIds.push(testPoints[i].testPointId);
            }

            clientUrl = TestsOM.UriHelper.getClientMTRUri(testPointIds, this._currentPlan.plan.id);

            if (Utils_Url.isSafeProtocol(clientUrl)) {
                Events_Action.getService().performAction(Events_Action.CommonActions.ACTION_WINDOW_OPEN, {
                    url: clientUrl,
                    target: "_self"
                });
            }

            TelemetryService.publishEvents(TelemetryService.featureRunTestUsingClient, {});
        }
    }


    private _runXT(requirementId: number, selectedDataCollectors: string[]) {
        DAUtils.trackAction("RunTestUsingClient", "/Execution");
        let settingName: string = (selectedDataCollectors && selectedDataCollectors.length > 0) ? selectedDataCollectors.join(Resources.CommaSeparator + " ") : Resources.EmptyDataCollectorsSettings;
        this._createTestSettings(settingName, selectedDataCollectors, (testSettingsId: number) => {
            this._createXTClientSession(requirementId, testSettingsId, (session) => {
                let sessionId: number = session.id;
                let clientUrl: string = TestsOM.UriHelper.getNewXTClientUri(sessionId);

                if (Utils_Url.isSafeProtocol(clientUrl)) {
                    Events_Action.getService().performAction(Events_Action.CommonActions.ACTION_WINDOW_OPEN, {
                        url: clientUrl,
                        target: "_self"
                    });
                }
            },
                (error) => {
                    this.showError(VSS.getErrorMessage(error));
                });

        });
        TelemetryService.publishEvents(TelemetryService.featureExploreUsingXTClient, {});
    }

    private _runTestPointsUsingNewClient(testPoints: TestsOM.ITestPointModel[], selectedBuild: string, selectedDataCollectors: string[]) {
        DAUtils.trackAction("RunTestUsingClient", "/Execution");
        let settingName: string = (selectedDataCollectors && selectedDataCollectors.length > 0) ? selectedDataCollectors.join() : Resources.EmptyDataCollectorsSettings;
        this._createTestSettings(settingName, selectedDataCollectors, (testSettingsId: number) => {
            this._createTestRun(testPoints, selectedBuild, testSettingsId, (testRunAndResult) => {
                let testRunId: number = testRunAndResult.testRun.testRunId;
                let clientUrl: string = TestsOM.UriHelper.getNewClientMTRUri(testRunId);

                if (Utils_Url.isSafeProtocol(clientUrl)) {
                    Events_Action.getService().performAction(Events_Action.CommonActions.ACTION_WINDOW_OPEN, {
                        url: clientUrl,
                        target: "_self"
                    });
                }
            },
                (error) => {
                    this.handleTestPointError(Resources.TestRunError, error);
                });

        });
        TelemetryService.publishEvents(TelemetryService.featureRunTestUsingClient, {});
    }

    private _createTestSettings(name: string, dataCollectors: string[], callback: any): void {
        VSS.using(["TestManagement/Scripts/TFS.TestManagement.TestSettingsHelper"], (
            RunWithOptionsModule: typeof RunSettingsHelper_LAZY_LOAD
        ) => {
            let testSettingsManager = new RunWithOptionsModule.TestSettingsManager();
            testSettingsManager.createTestSettings(this._currentPlan.plan.areaPath, dataCollectors, name).then((runSettingId: number) => {
                callback(runSettingId);
            },
                (error) => {
                    this.handleTestPointError(Resources.TestRunError, error);
                }
            );
        });
    }

    private _runTestPointsWithOptions(testPoints: TestsOM.ITestPointModel[], requirementId: number = -1, showXTRunner: boolean = false) {
        VSS.using(["TestManagement/Scripts/TFS.TestManagement.RunTestsWithOptions"], (
            RunWithOptionsModule: typeof RunWithOptions_LAZY_LOAD
        ) => {
            this._runWithOptionsDialog = Dialogs.show(RunWithOptionsModule.RunWithOptionsDialog, {
                requirementId: requirementId,
                showXTRunner: showXTRunner,
                testPoints: testPoints,
                oldmtrCallBack: delegate(this, this._launchOldMtrWithOptions),
                newmtrCallBack: delegate(this, this._launchNewMtrWithOptions),
                webRunnerCallBack: delegate(this, this._launchWebRunnerWithOptions),
                xtRunnerCallBack: delegate(this, this._launchXTRunnerWithOptions)
            });
        });
    }

    private _launchXTRunnerWithOptions(dialogViewModel: any) {
        let requirementId = dialogViewModel.getRequirementId();
        let selectedDataCollectors = dialogViewModel.getEnabledDataCollectors();
        this._runXT(requirementId, selectedDataCollectors);
    }

    private _launchWebRunnerWithOptions(dialogViewModel: any) {
        let selectedBuild = dialogViewModel.getBuildUri();
        let selectedPoints: TestsOM.ITestPointModel[] = dialogViewModel.testPoints;
        this._runTestPoints(selectedPoints, selectedBuild);
    }

    private _launchOldMtrWithOptions(dialogViewModel: any) {
        let selectedPoints: TestsOM.ITestPointModel[] = dialogViewModel.testPoints;
        this._runTestPointsUsingClient(selectedPoints);
    }

    private _launchNewMtrWithOptions(dialogViewModel: any) {
        let selectedBuild = dialogViewModel.getBuildUri();
        let selectedPoints: TestsOM.ITestPointModel[] = dialogViewModel.testPoints;
        let selectedDataCollectors = dialogViewModel.getEnabledDataCollectors();
        this._runTestPointsUsingNewClient(selectedPoints, selectedBuild, selectedDataCollectors);
    }

    private _validateSelectedTestPoints(testPoints: TestsOM.ITestPointModel[], blockAutomatedTestPoints?: boolean) {
        if (testPoints.length > 100) {
            confirm(Resources.TestCasesOverLoadError);
            return false;
        }

        if (this._areThereAutomatedTests(testPoints)) {
            if (blockAutomatedTestPoints) {
                confirm(Resources.RunContainsAutomatedPointsError);
                return false;
            }
            else if (!confirm(Resources.RunContainsAutomatedPointsWarning)) {
                return false;
            }
        }

        return true;
    }

    private _getTestPointsForTestCases(testCases, testPointList: any): any {
        ///<summary>Updates the pivot filter with possible values.</summary>
        ///<param name="testCaseId" type="Array">List of test cases</param> 
        ///<param name="testPointList" type="Object">List of Test Points</param>  
        ///<returns type="Object">returns the test points for given testcaseId</returns>
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

    private _updateTestPointInfoList(testPointInfoList, testPoints) {
        let index;
        for (index = 0; index < testPoints.length; index++) {
            testPointInfoList[testPoints[index].testPointId].testPoint = testPoints[index];
        }
    }

    private _updateTestPointsData(testPointInfoList: any, cachedTestPoints: any) {
        /// <summary>Updates the Test Points </summary>
        /// <param name="testPointInfoList" type="Object">Info of Test Points (specially rowindex of cachedTestPointsData)</param>
        /// <param name="cachedTestPoints" type="Object">testPoint list to be Updated</param>
        let rowIndex,
            testPointId;
        for (testPointId in testPointInfoList) {
            if (testPointInfoList.hasOwnProperty(testPointId)) {
                rowIndex = testPointInfoList[testPointId].rowIndex;
                cachedTestPoints[rowIndex] = testPointInfoList[testPointId].testPoint;
            }
        }
    }

    private _getTestPointIds(testPointInfoList) {
        let testPointIds = [],
            testPointId;
        for (testPointId in testPointInfoList) {
            if (testPointInfoList.hasOwnProperty(testPointId)) {
                testPointIds.push(testPointId);
            }
        }

        return testPointIds;
    }

    private _refresh(callback?: IResultCallback) {
        /// <summary>Handler for the refresh action</summary>
        if (this._currentPlan && this._currentPlan.plan) {
            this._refreshAndPopulatetestPointList(this._currentPlan.plan.id, this._currentPlan.selectedSuiteId, true, null, TMUtils.maxPageSize, callback);
        }
        this._viewPaneList.refreshList(this._getSelectedTestCaseId(), this._paneFilter.getSelectedItem().value, this._workItemPaneMode, true);
    }

    private _createNewTestCase() {
        VSS.using(["WorkItemTracking/Scripts/TFS.WorkItemTracking.Controls"], (Module: typeof WITControls_LAZY_LOAD) => {
            let that = this,
                TfsContext = TFS_Host_TfsContext.TfsContext.getDefault(),
                options = this._getNewTestCaseOptions(),
                witStore = WITUtils.getWorkItemStore(),
                teamFieldRefName: string,
                teamFieldValue: string,
                i: number;

            DAUtils.trackAction("NewTestCase", "/SuiteManagement");
            TestCaseCategoryUtils.getDefaultWorkItemTypeInfoForTestCaseCategory(function (wit) {

                let workItem = WorkItemManager.get(witStore).createWorkItem(wit),
                    selectedSuite = that._testSuitesTree.getSelectedSuite(),
                    plan;

                Diag.Debug.assertIsNotNull(workItem);

                // For a RBS, set the test case's area path and iteration path from the requirement
                if (selectedSuite && selectedSuite.type === TCMConstants.TestSuiteType.RequirementTestSuite) {
                    WorkItemManager.get(witStore).beginGetWorkItem(selectedSuite.requirementId, function (requirementWorkItem) {
                        Diag.Debug.assertIsNotNull(requirementWorkItem);
                        WITUtils.setAreaAndIterationPaths(workItem, requirementWorkItem.getFieldValue(WITConstants.CoreField.AreaPath), requirementWorkItem.getFieldValue(WITConstants.CoreField.IterationPath));
                    });
                }
                else {
                    // For static suite populate area and iteration path from the test plan.
                    plan = that._currentPlan.plan;
                    Diag.Debug.assertIsNotNull(plan);
                    WITUtils.setAreaAndIterationPaths(workItem, plan.areaPath, plan.iteration);
                }

                // get the team field info for test plan and populate that in test case
                if (!that._currentTeamFieldInfo) {
                    that._testPlanManager.getTeamFieldForTestPlans([that._currentPlan.plan.id],
                        (teamFields: TestsOM.ITeamFieldModel[]) => {
                            that._fetchAndUpdateTeamFieldInfoForPlan(teamFields, that._currentPlan.plan.id,
                                (refName: string, value: string) => {
                                    if (that._testCaseHasTeamField) {
                                        workItem.setFieldValue(refName, value);
                                        Module.WorkItemFormDialog.showWorkItem(workItem, options);
                                    }
                                },
                                () => { Module.WorkItemFormDialog.showWorkItem(workItem, options); });
                        },
                        () => {
                            this._currentTeamFieldInfo = null;
                            Module.WorkItemFormDialog.showWorkItem(workItem, options);
                        });
                }
                else if (that._currentTeamFieldInfo.isConfigured) {
                    if (that._testCaseHasTeamField === undefined) {
                        that._fetchAndUpdateTeamFieldInfoForTestCase(teamFieldRefName, teamFieldValue,
                            (refName: string, value: string) => {
                                if (that._testCaseHasTeamField) {
                                    workItem.setFieldValue(refName, value);
                                    Module.WorkItemFormDialog.showWorkItem(workItem, options);
                                }
                            },
                            () => { Module.WorkItemFormDialog.showWorkItem(workItem, options); });
                    }
                    else {
                        if (that._testCaseHasTeamField) {
                            workItem.setFieldValue(that._currentTeamFieldInfo.refName, that._currentTeamFieldInfo.value);
                        }

                        Module.WorkItemFormDialog.showWorkItem(workItem, options);
                    }
                }
                else {
                    Module.WorkItemFormDialog.showWorkItem(workItem, options);
                }
            });
        });
    }
    private _createNewTestCaseWithGrid() {
        DAUtils.trackAction("NewTestCaseWithGrid", "/SuiteManagement");
        this._beginTryShowEditGrid([], false, () => {
            this._setViewFilter("grid");

            //Adding telemetry for creating test plan workitem. Area: TestManagement, Feature: CreateTestCase. Property is TestCaseUsingGrid when test case is created using grid.
            TelemetryService.publishEvent(TelemetryService.featureCreateTestCase, TelemetryService.createTestCaseUsinfeatureExploreUsingClientgGrid, 1);
        },
            (error) => {
                this._setViewFilter("list");
            });
    }

    private _createNewSharedStep() {
        VSS.using(["WorkItemTracking/Scripts/TFS.WorkItemTracking.Controls"], (Module: typeof WITControls_LAZY_LOAD) => {
            let TfsContext = TFS_Host_TfsContext.TfsContext.getDefault(),
                witStore = WITUtils.getWorkItemStore();

            DAUtils.trackAction("CreateSharedStep", "/SuiteManagement");
            TMUtils.SharedStepCreationHelper.getDefaultWorkItemTypeInfoForSharedStepCategory((wit) => {

                let workItem = WorkItemManager.get(witStore).createWorkItem(wit),
                    plan: any;

                Diag.Debug.assertIsNotNull(workItem);

                // populate area and iteration path from the test plan.
                plan = this._currentPlan.plan;
                Diag.Debug.assertIsNotNull(plan);
                WITUtils.setAreaAndIterationPaths(workItem, plan.areaPath, plan.iteration);

                Module.WorkItemFormDialog.showWorkItem(workItem, {
                    close: (workItem) => {
                        if (workItem.getUniqueId() > 0) {
                            this._showSharedStepLink(workItem);

                            TelemetryService.publishEvent(TelemetryService.featureSharedSteps, TelemetryService.addSharedSteps, 1);
                        }
                    }
                });
            });
        });
    }
    private _addtestCaseToCurrentSuite(workItem: WITOM.WorkItem) {
        this._addTestCasesToSelectedSuite([workItem.id]);
    }

    private _getNewTestCaseOptions() {
        return {
            save: (workItem: WITOM.WorkItem) => {
                if (!this._newTestCaseAddedToSuite) {
                    this._addtestCaseToCurrentSuite(workItem);
                    this._newTestCaseAddedToSuite = true;
                }
            },

            close: () => {
                this._newTestCaseAddedToSuite = false;
            }
        };
    }

    private _createTestPointsToolbar() {
        /// <summary>Creates the testPointsToolbar</summary>
        this._$toolbar = this._element.find(".hub-pivot-toolbar");
        this._testPointsToolbar = <Menus.MenuBar>Controls.BaseControl.createIn(Menus.MenuBar, this._$toolbar, {
            items: this._createTestPointsToolbarItems(),
            executeAction: delegate(this, this._onTestPointsToolbarItemClick),
            cssClass: "testpoints-toolbar",
            contributionIds: ["ms.vss-test-web.test-run-toolbar-menu"],
            contextInfo: {
                item: { getContributionContext: this.getContributionContext.bind(this) }
            },
        });

        this._updateTestPointsToolbarCommandStates();

    }

    private getContributionContext(forSuites: boolean = false): any {
        if (forSuites && this._testSuitesTree) {
            let suite = this._testSuitesTree.getSelectedSuite();
            let node = this._testSuitesTree.getSelectedNode();
            let plan = node.plan;
            while (!plan && node.parent) {
                node = node.parent;
                plan = node.plan;
            }
            return { suite: suite, plan: plan };
        } else {
            if (this._testPointList) {
                let data = this._testPointList.getSelectedTestPoints();
                return data ? data : [];
            } else {
                return [];
            }
        }
    }

    private _createTagFilterBar() {
        VSS.using(["TestManagement/Scripts/TFS.TestManagement.TestViewFilterBar"], (Module: typeof TestViewFilterBar_LAZY_LOAD) => {
            let $filterbar = this._element.find(".test-view-filter-bar");
            this._filterBar = Controls.BaseControl.createIn(Module.TestViewFilterBar, $filterbar);
            this._filterManager = this._filterBar.filterManager;
            this._tagFilterProvider = this._filterBar.tagFilterProvider;

            this._testPointList.bindFilterManager(this._filterManager);

            this._filterManager.attachEvent(FilterManager.EVENT_FILTER_CHANGED, () => {
                this._updateTestPointsToolbarCommandStates();
            });

            this._filterManager.attachEvent(FilterManager.EVENT_FILTER_CLEARED, () => {
                this._updateTestPointsToolbarCommandStates();
            });
        });

    }

    private _createTestPlanAndSuitesMenubarItems(): any[] {
        /// <summary>Creates the items list for the test plan and suites toolbar</summary>
        /// <returns type="Object">Items list for the toolbar</returns>
        let items: any[] = [];
        if (LicenseAndFeatureFlagUtils.AreAdvancedTestManagementFeaturesEnabled()) {
            items.push({
                id: "create-new-suite-plan",
                text: Resources.NewTestCaseCommandText,
                title: Resources.NewTestCaseCommandText,
                showText: false,
                icon: "bowtie-icon bowtie-math-plus-heavy bowtie-icon-small",
                childItems: this._createNewPlanSuiteSubMenuItems()
            });
            items.push({ separator: true });
        }

        items.push({
            id: this._testPlanAndSuitesCommandIds.showTestsFromChildSuites,
            title: Resources.ShowTestsRecursive,
            showText: false,
            icon: "bowtie-icon bowtie-row-child"
        });

        items.push({
            id: this._testPlanAndSuitesCommandIds.expand,
            title: Resources.ExpandSuites,
            showText: false,
            icon: "bowtie-icon bowtie-toggle-expand-all"
        });
        items.push({
            id: this._testPlanAndSuitesCommandIds.collapse,
            title: Resources.CollapseSuites,
            showText: false,
            icon: "bowtie-icon bowtie-toggle-collapse"
        });
        if (LicenseAndFeatureFlagUtils.AreAdvancedTestManagementFeaturesEnabled()) {
            items.push({
                id: this._testPlanAndSuitesCommandIds.openInClient,
                title: Resources.OpenInClientTooltip,
                showText: false,
                icon: "bowtie-icon bowtie-brand-mtm bowtie-icon-large"
            });
            items.push({
                id: this._testPlanAndSuitesCommandIds.exportHtml,
                title: Resources.ExportHtmlTooltip,
                showText: false,
                icon: "bowtie-icon bowtie-print",
                showIcon: true
            });

            items.push({
                id: this._testPlanAndSuitesCommandIds.openTestPlanOrSelectedSuite,
                title: Resources.OpenTestPlan,
                showText: false,
                icon: "bowtie-icon bowtie-arrow-open"
            });
        }

        return items;
    }

    private _createNewPlanSuiteSubMenuItems(): any[] {
        /// <summary>Creates the items list for the new plan / suite dropdown</summary>
        /// <returns type="Object">Items list for the toolbar</returns>
        let items: any[] = [];

        items.push({
            id: this._testPlanAndSuitesCommandIds.newTestPlan,
            text: Resources.CreateTestPlanMenuItem,
            title: Resources.CreateTestPlanDialogTitle,
            showText: true,
            showIcon: true,
            icon: "bowtie-icon bowtie-folder-plan"
        });

        items.push({ separator: true });

        items.push({
            id: NewSuiteCommandIds.newStaticSuite,
            text: Resources.StaticSuiteTitle,
            title: Resources.CreateStaticSuite,
            showText: true,
            icon: "bowtie-icon bowtie-folder",
            showIcon: true
        });

        items.push({
            id: NewSuiteCommandIds.newRequirementSuite,
            text: Resources.RequirementSuite,
            title: Resources.CreateRequirementSuite,
            showText: true,
            icon: "bowtie-icon bowtie-tfvc-change-list",
            showIcon: true
        });

        items.push({
            id: NewSuiteCommandIds.newQueryBasedSuite,
            text: Resources.QueryBasedSuiteTitle,
            title: Resources.CreateQueryBasedSuiteTitle,
            showText: true,
            icon: "bowtie-icon bowtie-folder-query",
            showIcon: true
        });

        items.push({ separator: true });

        items.push({
            id: this._testPlanAndSuitesCommandIds.newSharedStep,
            text: Resources.NewSharedStep,
            title: Resources.CreateSharedStep,
            showText: true,
            showIcon: true,
            icon: "bowtie-icon bowtie-step-shared"
        });

        return items;
    }

    private _onPlansAndSuitesMenubarItemClick(e?: any) {
        /// <summary>Handles the execution of the plans and suites toolbar items</summary>
        /// <param name="e" type="Object">The execution event</param>
        let command = e.get_commandName(),
            parentSuite = this._testSuitesTree.getSelectedSuite();

        if (command === this._testPlanAndSuitesCommandIds.expand) {
            this._testSuitesTree.expandAll();

            //Adding telemetry for creating test plan workitem. Area: TestManagement, Feature: TestSuite. Property Action has value Expand
            TelemetryService.publishEvent(TelemetryService.featureTestSuite, TelemetryService.suiteActions, TelemetryService.expand);
        }
        else if (command === this._testPlanAndSuitesCommandIds.collapse) {
            this._testSuitesTree.collapseAll();

            //Adding telemetry for creating test plan workitem. Area: TestManagement, Feature: TestSuite. Property Action has value Collapse
            TelemetryService.publishEvent(TelemetryService.featureTestSuite, TelemetryService.suiteActions, TelemetryService.collapse);
        }
        else if (command === this._testPlanAndSuitesCommandIds.newSharedStep) {
            this._createNewSharedStep();
        }
        else if (command === this._testPlanAndSuitesCommandIds.openInClient) {
            this._openTestPlanInClient();
        }
        else if (command === this._testPlanAndSuitesCommandIds.exportHtml) {
            VSS.using(["TestManagement/Scripts/TFS.TestManagement.HtmlDocumentGenerator"], (Module: typeof ExportHtml_LAZY_LOAD) => {
                let isChildSuitesCountExceededForExportFeature = this._testSuitesTree.checkIfThresholdExceededForExportFeature();
                this._exportHtmlWindow = new Module.HtmlDocumentGenerator({ columnOptions: this._savedColumns, testPointPaneColumnOptions: this._savedTestPointPaneColumns, plan: this._currentPlan, suiteHierarchy: this._testSuitesTree.rootNode });
                this._exportHtmlWindow.launchExportHtmlDialog(parentSuite, isChildSuitesCountExceededForExportFeature);
            });
        }
        else if (command === this._testPlanAndSuitesCommandIds.openTestPlanOrSelectedSuite) {
            if (parentSuite.parentSuiteId > 0) {
                this._openTestSuite(parentSuite);
            }
            else {
                this._openTestPlan();
            }
        }
        else if (command === this._testPlanAndSuitesCommandIds.showTestsFromChildSuites) {
            this._toggleShowTestsFromChildSuites();
        }
        else {
            if (this._shouldCancelPlanOrSuiteSelectionChange()) {
                return;
            }
            if (command === this._testPlanAndSuitesCommandIds.newTestPlan) {
                this._onClickCreateNewTestPlan();
            } else if (command === NewSuiteCommandIds.newStaticSuite ||
                command === NewSuiteCommandIds.newRequirementSuite ||
                command === NewSuiteCommandIds.newQueryBasedSuite) {
                this._createNewSuite(parentSuite, command);
            }
        }
    }

    private _toggleShowTestsFromChildSuites(callback?: IResultCallback) {
        if (this._showTestsFromChild) {
            this._showTestsFromChild = false;

        } else {
            this._showTestsFromChild = true;
        }
        this._refreshSuitePointCounts(null);
        this._refreshAndPopulatetestPointList(this._currentPlan.plan.id, this._currentPlan.selectedSuiteId, true, false, 0, callback);
        this._testPlanAndSuitesMenubar.updateCommandStates([{ id: this._testPlanAndSuitesCommandIds.showTestsFromChildSuites, toggled: this._showTestsFromChild }]);
    }

    private _shouldCancelPlanOrSuiteSelectionChange(): boolean {
        let shouldCancel = false;

        if (this._inEditMode) {
            shouldCancel = !this._bulkEditTestsViewModel.cleanup();
        }
        else if (this._orderTestsControl && this._orderTestsControl.isDirty()) {
            shouldCancel = !this._orderTestsControl.continueAndLoseOrderTestsGridChange();
        }
        else {
            shouldCancel = this._checkAndNotifyUserAboutDirtyTests();
        }
        return shouldCancel;
    }

    private _createTestPointsToolbarItems(): any[] {
        /// <summary>Creates the items list for the toolbar</summary>
        /// <returns type="Object">Items list for the toolbar</returns>
        let items = [];
        if (LicenseAndFeatureFlagUtils.AreAdvancedTestManagementFeaturesEnabled()) {
            items.push({ id: this._testPointToolbarItemIds.toggleTestCaseDetailsPane, text: Resources.TestCaseDetailsPaneToggleButtonTitle, title: Resources.TestDetailPaneToggleButtonTooltip, showText: false, icon: "bowtie-icon bowtie-details-pane", cssClass: "right-align", groupId: "actions" });
            items.push({ id: this._testPointToolbarItemIds.toggleFilter, text: VSS_Resources_Common.Filter, title: VSS_Resources_Common.FilterToolTip, showText: false, icon: "bowtie-icon bowtie-search-filter", cssClass: "right-align toggle-filter-bar", groupId: "actions" });
            items.push({ id: this._testPointToolbarItemIds.editQuery, text: Resources.EditQuery, title: Resources.EditQuery, showText: true, icon: "icon-tfs-query-edit", groupId: "actions" });
            items.push({
                id: this._testPointToolbarItemIds.newTestCaseDropDown,
                text: Resources.NewText,
                title: Resources.CreateTestCases,
                showText: true,
                icon: "bowtie-icon bowtie-math-plus-heavy bowtie-icon-small",
                groupId: "actions",
                childItems: this._createNewTestCaseSubMenuItems()
            });

            items.push({ id: this._testPointToolbarItemIds.addTestCases, text: Resources.Add, title: Resources.AddExistingTestCases, showText: true, noIcon: true, groupId: "actions" });
            items.push({ id: this._testPointToolbarItemIds.removeTestCase, title: Resources.RemoveTestCaseText, showText: false, icon: "bowtie-icon bowtie-edit-delete", groupId: "actions" });
            items.push({ id: this._testPointToolbarItemIds.saveTests, text: Resources.SaveTestsText, title: Resources.SaveTestsText, showText: false, icon: "bowtie-icon bowtie-save-all", groupId: "actions" });
            items.push({ id: this._testPointToolbarItemIds.refreshTestPoints, text: Resources.Refresh, title: Resources.RefreshToolTip, showText: false, icon: "bowtie-icon bowtie-navigate-refresh", groupId: "actions" });
            items.push({ id: this._testPointToolbarItemIds.openTestCase, text: Resources.OpenTestCaseCommandText, title: Resources.OpenTestCaseToolTip, showText: false, icon: "bowtie-icon bowtie-arrow-open", groupId: "actions" });
        }
        else {
            items.push({ id: this._testPointToolbarItemIds.refreshTestPoints, text: Resources.Refresh, title: Resources.RefreshToolTip, showText: false, icon: "bowtie-icon bowtie-navigate-refresh", groupId: "actions" });
            items.push({ id: this._testPointToolbarItemIds.toggleFilter, text: VSS_Resources_Common.Filter, title: VSS_Resources_Common.FilterToolTip, showText: false, icon: "bowtie-icon bowtie-search-filter", cssClass: "right-align toggle-filter-bar", groupId: "actions" });
        }

        items.push({
            id: this._testPointToolbarItemIds.runTestDropMenu,
            text: Resources.RunText,
            title: Utils_String.format(Resources.TooltipTitleShortcutFormat, Resources.Run, Resources.RunShortcut),
            showText: true,
            icon: "bowtie-icon bowtie-media-play-fill",
            groupId: "execute",
            childItems: this._createRunTestsSubMenuItems()
        });

        items.push({ id: this._testPointToolbarItemIds.resumeRun, title: Resources.ResumeTooltip, text: Resources.ResumeTestText, showText: false, icon: "bowtie-icon bowtie-play-resume-fill", groupId: "execute" });
        items.push({ id: this._testPointToolbarItemIds.resetTest, text: Resources.ResetTestText, title: Resources.ResetTestText, showText: false, icon: "bowtie-icon bowtie-edit-redo", groupId: "analyze" });
        items.push({ id: this._testPointToolbarItemIds.passTest, text: Resources.PassTestText, title: Resources.PassTestText, showText: false, icon: "bowtie-icon bowtie-status-success", groupId: "analyze" });
        items.push({ id: this._testPointToolbarItemIds.failTest, text: Resources.FailTestText, title: Resources.FailTestText, showText: false, icon: "bowtie-icon bowtie-status-failure", groupId: "analyze" });
        items.push({ id: this._testPointToolbarItemIds.blockTest, text: Resources.BlockTestText, title: Resources.BlockTestText, showText: false, icon: "bowtie-icon bowtie-math-minus-circle", groupId: "analyze" });
        items.push({ id: this._testPointToolbarItemIds.notApplicableTest, text: Resources.TestOutcome_NotApplicable, title: Resources.TestOutcome_NotApplicable, showText: false, icon: "bowtie-icon bowtie-status-no-fill bowtie-no-fill-not-applicable", groupId: "analyze" });
        if (LicenseAndFeatureFlagUtils.AreAdvancedTestManagementFeaturesEnabled()) {
            items.push({ id: this._testPointToolbarItemIds.orderTests, title: Resources.OrderTests, text: Resources.OrderTests, showText: true, icon: "bowtie-icon bowtie-format-list-ordered", groupId: "orderTests" });
        }

        items.push({ id: this._testPointToolbarItemIds.columnOptions, title: Resources.Columnoptions, text: Resources.Columnoptions, noIcon: true, groupId: "options" });

        return items;
    }

    private _createRunTestsSubMenuItems(): any[] {
        /// <summary>Creates the items list for the run tests in web / client dropdown</summary>
        /// <returns type="Object">Items list for the toolbar</returns>
        let items: any[] = [];

        items.push({
            id: this._testPointToolbarItemIds.runTestPoints,
            text: Resources.Run,
            title: Utils_String.format(Resources.TooltipTitleShortcutFormat, Resources.Run, Resources.RunShortcut),
            showText: true,
            icon: "bowtie-icon bowtie-media-play-fill"
        });

        if (LicenseAndFeatureFlagUtils.AreAdvancedTestManagementFeaturesEnabled()) {
            items.push({
                id: this._testPointToolbarItemIds.runTestPointsWithOptions,
                text: Resources.RunTestWithOptionsText,
                title: Resources.RunTestWithOptionsTooltip,
                showText: true,
                icon: "bowtie-icon bowtie-media-play-fill"
            });
        }

        return items;
    }

    private _createNewTestCaseSubMenuItems(): any[] {
        let items: any[] = [];

        items.push({
            id: this._testPointToolbarItemIds.newTestCase,
            text: Resources.NewTestCaseText,
            title: Utils_String.format(Resources.TooltipTitleShortcutFormat, Resources.NewTestCaseCommandTooltip, Resources.NewTestCaseCommandShortcut),
            showText: true,
            icon: "bowtie-icon bowtie-math-plus-heavy bowtie-icon-small"
        });

        items.push({
            id: this._testPointToolbarItemIds.newTestCaseWithGrid,
            text: Resources.NewUsingGrid,
            title: Resources.CreateTestCasesUsingGrid,
            showText: true,
            icon: "bowtie-icon bowtie-math-plus-heavy bowtie-icon-small"
        });

        return items;
    }

    private _onTestPointsToolbarItemClick(e?: any) {
        /// <summary>Handles the execution of the toolbar items</summary>
        /// <param name="e" type="Object">The execution event</param>
        let command = e.get_commandName();

        Diag.logTracePoint("TestHub.testPointsToolbarItemClick.Start");
        //Execute the specific Menu command
        this.rightPaneOptions(command);
    }

    private _toggleTestCaseDetailsPane() {
        if (!this._$farRightPaneHubPivot || this._$farRightPaneHubPivot.length < 1) {
            this._$farRightPaneHubPivot = this._element.find(".far-right-pane-pivot");
        }
        if (this._isTestCaseDetailsPaneOn()) {
            // Toggle the pane to off position
            this._showWorkItemPane("off", this._paneFilter.getSelectedItem().value);
            this._savedPanePosition = this._workItemPaneMode;
        }
        else {
            // Toggle the pane to "on" and position should be the one previously selected by the user
            if (this._previousPaneOnPosition) {
                this._showWorkItemPane(this._previousPaneOnPosition, this._paneFilter.getSelectedItem().value);
            }
            else {
                this._webSettingsService.beginReadSetting("/PreviousPaneOnPosition", TFS_WebSettingsService.WebSettingsScope.User, (prevPanePosition) => {
                    if (prevPanePosition && prevPanePosition.value) {
                        this._previousPaneOnPosition = prevPanePosition.value;
                    }
                    else {
                        this._previousPaneOnPosition = "right";
                    }
                    this._showWorkItemPane(this._previousPaneOnPosition, this._paneFilter.getSelectedItem().value);
                });
            }
        }
        this._updateTestPointsToolbarCommandStates();
    }

    private _isTestCaseDetailsPaneOn(): boolean {
        if (this._workItemPaneMode && this._workItemPaneMode !== "off") {
            return true;
        }
        return false;
    }

    private _addTestCases() {
        if (this._showTestsFromChild) {
            alert(Resources.CannotAddExistingTestCases);
            return;
        }

        DAUtils.trackAction("AddExistingTestCases", "/SuiteManagement");
        VSS.using(["TestManagement/Scripts/TFS.TestManagement.SelectWorkItemView"], (Module: typeof SelectWorkItemView_LAZY_LOAD) => {
            Dialogs.show(Module.SelectWorkItemsDialog, {
                width: $(window).width() * 0.8,
                height: $(window).height() * 0.8,
                attachResize: true,
                okText: Resources.AddTestCases,
                okCallback: (testCaseIds: number[]) => {
                    this._addTestCasesToSelectedSuite(testCaseIds);

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

    private _isSuiteDynamicType() {
        let suite = this._testSuitesTree.getSelectedSuite();
        if (suite && suite.type === TCMConstants.TestSuiteType.DynamicTestSuite) {
            return true;
        }
    }

    private _addTestCasesToSelectedSuite(testCaseIds: number[]) {
        let testCaseIdsInCurrentSuite = TestPointsGrid.getTestCaseIdsFromTestPoints(this._cachedTestPointData),
            i = 0,
            len = testCaseIdsInCurrentSuite.length,
            testCaseMap = {},
            testCasesToInsert: number[] = [];

        for (i = 0; i < len; i++) {
            testCaseMap[testCaseIdsInCurrentSuite[i]] = true;
        }

        for (i = 0, len = testCaseIds.length; i < len; i++) {
            if (!testCaseMap[testCaseIds[i]]) {
                testCasesToInsert.push(testCaseIds[i]);
            }
        }

        if (testCasesToInsert.length > 0) {
            TMUtils.TestSuiteUtils.beginAddTestCasesToSuite(testCasesToInsert,
                this._currentPlan.plan.id,
                this._testSuitesTree.getSelectedSuite(),
                (suiteUpdate: TestsOM.ITestSuiteModel) => {
                    if (suiteUpdate) {
                        this._testSuitesTree.updateSuitesRevisionAndPointCount([suiteUpdate]);
                    }
                    this._refreshAndPopulatetestPointList(this._currentPlan.plan.id, this._currentPlan.selectedSuiteId, true);
                },
                (error) => {
                    if (error.type && error.type === TestsOM.Exceptions.TestObjectNotFoundException) {
                        this.showError(Utils_String.format(Resources.TestCannotBeAddedToSuite, this._currentPlan.selectedSuiteId));
                    }
                    else {
                        this.showError(VSS.getErrorMessage(error));
                    }
                });
        }
    }

    private _launchColumnOptionsDialog() {
        /// <summary>Launch the column options dialog</summary>
        DAUtils.trackAction("LaunchColumnOptions", "/SuiteManagement");
        TestHubView.showColumnOptions({
            tfsContext: this._options.tfsContext,
            simpleMode: true,
            allowSort: false,
            displayColumns: this._getDisplayColumns(),
            getAvailableColumns: delegate(this, this._getAvailableColumns),
            okCallback: (result) => {
                this._saveColumns(result.display, delegate(this, this._refresh));
            }
        });
    }

    public static showColumnOptions(options?) {
        VSS.using(["TestManagement/Scripts/TFS.TestManagement.ColumnOptions"], (Module: typeof WorkItemRelated_LAZY_LOAD) => {
            Dialogs.show(Module.TestManagementColumnOptionsDialog, $.extend(options, {
                width: 560,
                minHeight: 300,
                height: 350,
                simpleMode: true,
                getAvailableColumns: options.getAvailableColumns,
                cssClass: "column-options-host simple",
                initialFocusSelector: "select",
                okCallback: options.okCallback,
                url: options.tfsContext.getActionUrl("columnOptions", "wit", { area: "api", simpleMode: true, includeLanguage: true })
            }));
        });
    }

    private _getDisplayColumns(): any[] {
        /// <summary>Gets the list of columns that are being displayed on the Grid</summary>
        /// <returns type="Array" elementType="Object">List of column objects (properties vary)</returns>
        let allGridColumns = this._testPointList.getColumns(); // this will include hidden & static columns

        return $.map(allGridColumns, (column) => {
            if (!column.hidden && !this._isFixedField(column)) {
                return column;
            }
        });
    }

    private _getAvailableColumns(callback: IResultCallback, errorCallback?: IErrorCallback) {
        /// <summary>Gets the available columns based on the work item types that are displayed in the grid.</summary>
        /// <param name="callback" type="IResultCallback">The callback that will be fired when the column information is successfully retrieved</param>

        let additionalFields,
            fields,
            that = this;

        TestCaseCategoryUtils.getAllTestCaseCategoryWorkItemFields(function (witFields: WITOM.FieldDefinition[]) {
            additionalFields = TestPointsGrid.getRemovableTestPointFields(),
                fields = $.map(witFields, function (item: any) {
                    item.fieldId = item.id;
                    if (!that._isFixedField(item) && !that._isHiddenField(item)) {
                        return item;
                    }
                });
            fields = additionalFields.concat(fields);
            callback(fields);
        }, errorCallback);
    }

    public _saveColumns(columns: any[], callback?: IResultCallback) {
        /// <summary>Persist the column state</summary>
        /// <param name="columns" type="Array" elementType="Object">List of column definitions</param>
        /// <param name="callback" type="IResultCallback" optional="true">The callback to invoke on completion</param>
        let that = this;
        this._savedColumns = columns;
        this._wereColumnsChanged = true;
        this._testPointList.onColumnsChanged(this._savedColumns);
        callback();
    }

    private _isFixedField(field): boolean {
        let fixedFields = TestPointsGrid.getFixedFields(), i;

        for (i = 0; i < fixedFields.length; i++) {
            if (field.fieldId === fixedFields[i].id) {
                return true;
            }
        }
        return false;
    }

    private _isHiddenField(field: any): boolean {
        let i: number,
            length = TestPointsGrid.hiddenRefNames.length;

        if (field.type === WITConstants.FieldType.Html) {
            return true;
        }

        for (i = 0; i < length; i++) {
            if (field.referenceName === TestPointsGrid.hiddenRefNames[i]) {
                return true;
            }
        }
        return false;
    }

    private _clearError() {
        /// <summary>clears the error mesage</summary>
        let $errorDiv = this._$errorDiv || this._element.find(".inline-error");
        if ($errorDiv) {
            $errorDiv.remove();
            this._$errorDiv = null;
        }
        this._element.find(".hub-title, .right-hub-content").show();
    }

    private _showIterationDates(iterationDates: TestsOM.IterationDates) {
        let iterationDatesText: string = Resources.NoIterationDatesSet,
            iterationId: string;

        this._createIterationDatesDOMElements();

        if (iterationDates.getStartDate() && iterationDates.getEndDate()) {
            iterationDatesText = Utils_String.format(Resources.IterationDurationFormat,
                Utils_Date.localeFormat(iterationDates.getStartDate(), "M", true),
                Utils_Date.localeFormat(iterationDates.getEndDate(), "M", true));

            // fetch (if needed) iteration work days remaining if needed 
            // and show the data
            iterationId = this._testPlanCreationHelper.getIterationId(this._currentPlan.plan.iteration);
            this._teamHelper.beginGetTeamCapacity(iterationId,
                (data) => {
                    this._teamHelper.getAndshowRemainingWorkDaysInIteration(iterationId,
                        iterationDates.getStartDate(),
                        iterationDates.getEndDate(),
                        this._$iterationDatesSpan,
                        this._teamHelper.todayIsInCurrentIteration(iterationId, iterationDates.getStartDate(), iterationDates.getEndDate()));
                });
        }

        this._populateIterationDatesSpan(iterationDatesText);
    }

    private _clearIterationDatesSpan() {
        let $div: JQuery;

        if (this._$iterationDatesSpan) {
            this._$iterationDatesSpan.removeClass("hub-title-right");

            $div = this._$iterationDatesSpan.find(".test-plan-iteration-dates");
            $div.removeAttr("title");
            $div.text("");

            $div = this._$iterationDatesSpan.find(".test-plan-iteration-remaining-days");
            $div.removeAttr("title");
            $div.text("");
        }
    }

    private _createIterationDatesDOMElements() {
        if (!this._$iterationDatesSpan) {
            this._$iterationDatesSpan = $("<span class='test-plan-iteration-dates-info' />")
                .append("<div class='test-plan-iteration-dates' />")
                .append("<div class='test-plan-iteration-remaining-days' />")
                .insertBefore(".hub-title");
        }
    }

    private _populateIterationDatesSpan(iterationDatesText: string) {
        let $iterationDatesDiv: JQuery;

        if (this._$iterationDatesSpan) {
            this._$iterationDatesSpan.addClass("hub-title-right");

            // set the dates div
            $iterationDatesDiv = this._$iterationDatesSpan.find(".test-plan-iteration-dates");
            $iterationDatesDiv.attr("title", iterationDatesText)
                .text(iterationDatesText);
        }
    }

    public showError(message: string) {
        /// <summary>shows an error mesage</summary>
        /// <param name="message" type="String">the message to be displayed</param>
        if (!this._$errorDiv) {
            this._$errorDiv = $("<div class='inline-error' />").text(message).insertBefore(this._element.find(".hub-title")[0]);
            this._element.find(".hub-title, .right-hub-content").hide();
        }

        if (this._$requirementToolBar) {
            this._$requirementToolBar.hide();
        }
    }

    private _storeSuites(suites: any) {
        /// <summary>store suites in the form of " id to suite " dictionary for quick lookup</summary>
        /// <param name="suites" type="Object">the list of suites</param>
        let that = this;
        this._currentPlan.suites = {};
        $.each(suites, function (i, suite) {
            if (!that._currentPlan.suites[suite.id]) {
                //This method gets called when we fetch all suites in a plan. So totalPointCount will be equal to point count as no filtering is applied in response from server.
                suite.totalPointCount = suite.pointCount;
                that._currentPlan.suites[suite.id] = suite;
            }
        });
    }

    private _onParseStateInfoSuccess(state: any, isInitializing: boolean) {
        /// <summary>performs loading of testcases upon sucessful parsing of url and retrieving of plans and suites</summary>
        /// <param name="state" type="Object">the state object containg parameters of url</param>
        /// <param name="isInitializing" type="Boolean">The flag indiciating if we are here for the first time</param>
        if (state.suiteId) {
            if (isNaN(state.suiteId)) {
                this.showError(Resources.InvalidParameterSuiteId);
            }
            this._loadSuite(parseInt(state.suiteId, 10), isInitializing);
        }
        else if (this._currentPlan && this._currentPlan.plan) {
            this._loadSuite(this._currentPlan.plan.rootSuiteId, false);
        }

        // fetch (if needed) and update iteration dates for the plan
        this._fetchAndShowIterationDates();

        // always load Test/Charts pivot views after suites pane on LHS is loaded
        // This ensures that data corresponding to current selected suite is loaded in the RHS
        this._loadSelectedPivotView(isInitializing);
    }

    private _loadSelectedPivotView(isInitializing: boolean) {
        Diag.logTracePoint("TestHubView._loadSelectedPivotView.started");
        /// <summary>loads the data under Test/Charts pivots based on suite selected on LHS </summary>
        this._updateTabUrls(this._currentPlan.plan.id, this._currentPlan.selectedSuiteId);
        let suite = this._testSuitesTree.getSelectedSuite();
        switch (this._selectedPivot) {
            case TestPivots.CHARTS:
                this._initializeAndShowTestCharts();
                Diag.logTracePoint("TestHubView._loadSelectedPivotView.Charts.Loaded");
                break;
            case TestPivots.TESTS:
            default:
                //other than initialization suite and point refresh happens serially so we need to fetch the points only when not initialization state
                if (!isInitializing) {
                    // In rest of the case (Not in case of initialization), bring up the Test pivot explicitly.
                    this._showViewGrid(true);
                }
                // For initilization refresh of testpoint happens parallelly with suite fetch, so only show the testpoint and filters when testpoints were fetched
                else if (this._cachedTestPointData) {
                    let selectedSuite = this._testSuitesTree.getSelectedSuite();
                    let totalPointsCount = this._cachedTotalTestPointCount;
                    this._updateTestPointsAndFilters(selectedSuite, selectedSuite.id, totalPointsCount, this._cachedTotalTestPointCount, true, true);
                }
                break;
        }
        Diag.logTracePoint("TestHubView._loadSelectedPivotView.exit");
    }

    private _fetchAndShowIterationDates() {

        new TMUtils.DelayedExecutionHelper().executeAfterLoadComplete(this, () => {
            // if iterationsData is not available then fetch iterations data
            // and cache it for future use. This will generally not be the case 
            // since we fetch this data while fetching plans too.
            this._testPlanCreationHelper.beginGetIterationsData((data) => {
                if (this._currentPlan && this._currentPlan.plan) {
                    this._showIterationDates(this._testPlanCreationHelper.getIterationDates(this._currentPlan.plan.iteration));
                }
            });
        });
    }

    private _loadSuite(suiteId: number, isInitializing: boolean) {
        /// <summary>performs slection of the suite id passed in url ,with error handling id needed .
        ///Also passes the starts the ajax call to load the test points related .</summary>
        /// <param name="suiteId" type="Number">the suiteId to select</param>
        /// <param name="isInitializing" type="Boolean">The flag indiciating if we are here for the first time</param>
        let suite;

        this._testSuitesTree.setSelectedSuite(suiteId, true);

        suite = this._testSuitesTree.getSelectedSuite();
        if (!suite || (suite.id !== suiteId)) {
            this.showError(Utils_String.format(Resources.NoSuiteWithIdExists, suiteId));
        }
        else {
            //save currently selected suite id .
            this._currentPlan.selectedSuiteId = suite.id;

            // switch to list view if required            
            if (this._inEditMode) {
                Diag.logVerbose("[_loadSuite]Show grid view called on load suite");
                this._showViewGrid(true, true);
            }

            //update the title of view as the suite title
            this.setViewTitle(Utils_String.format(Resources.TestPointsGridSuiteHeader, suite.title, suite.id));

            // Remove the existing requirement id
            this._element.find("#testsuite-requirementid").remove();

            // show requirement id if the suite is requirement based
            if (suite.requirementId > 0) {
                this._showRequirement(suite.requirementId);
            }
            else if (this._$requirementToolBar) {
                this._$requirementToolBar.hide();
            }

            this._updateViewFilter(suite);
        }
    }

    private _showRequirement(requirementId: number) {
        /// <summary>Create the requirement id link and show</summary>
        /// <param name="requirementId" type="Number">the corresponding requirement id for the suite</param>
        this._requirementId = requirementId;
        if (!this._$requirementToolBar) {
            this._$requirementToolBar = this._createRequirementIdToolBar();
        }
        else {
            this._$requirementToolBar.show();
        }
    }

    private _createRequirementIdToolBar(): JQuery {
        let _$requirement = $("<span class='requirement-toolbar' />")
            .append("<div class='requirement-icon' />")
            .insertBefore(".hub-title");

        let items = [];
        items.push({ id: "show-requirement", title: Resources.OpenRequirement, showTitle: false, icon: "icon-tfs-query-flat" });
        let $requirementIcon = this._element.find(".requirement-icon");

        let _requirementToolBarControl = <Menus.MenuBar>Controls.BaseControl.createIn(Menus.MenuBar, $requirementIcon, {
            items: items,
            executeAction: delegate(this, this._launchRequirementWorkItem),
        });

        return _$requirement;
    }

    private _launchRequirementWorkItem() {
        if (this._requirementId) {
            Menus.menuManager.executeCommand(new Events_Handlers.CommandEventArgs("open-work-item", {
                id: this._requirementId,
                tfsContext: this._options.tfsContext
            }, null));
        }
    }

    private _showSharedStepLink(sharedStep: WITOM.WorkItem): void {
        let $viewElement: JQuery = this._element.find(".views"),
            $sharedStepElement: JQuery,
            $sharedStepText1: JQuery,
            $sharedStepText2: JQuery,
            $sharedStepLink: JQuery,
            sharedStepContainerText: string;

        $viewElement.find("div.shared-step-link").remove();

        $sharedStepElement = $("<div>").addClass("shared-step-link");

        $sharedStepText1 = $("<span>").text(sharedStep.workItemType.name);

        $sharedStepLink = $("<a>").text(Utils_String.format(" {0} ", sharedStep.getField(WITConstants.CoreFieldRefNames.Title).getValue()))
            .attr("title", Utils_String.format("{0}", sharedStep.getField(WITConstants.CoreFieldRefNames.Title).getValue()))
            .attr("href", "#")
            .attr("Id", "shared-step-link")
            .click(delegate(this, this._workItemLinkClick, sharedStep.id));

        $sharedStepText2 = $("<span>").text(Resources.SharedStepCreatedText.toLowerCase());
        $sharedStepElement.append($sharedStepText1);
        $sharedStepElement.append($sharedStepLink);
        $sharedStepElement.append($sharedStepText2);

        sharedStepContainerText = $sharedStepText1.text() + $sharedStepLink.text() + $sharedStepText2.text();
        $sharedStepElement.attr("title", sharedStepContainerText);

        $viewElement.append($sharedStepElement);
        $viewElement.find(".shared-step-link").fadeOut(10000);
    }

    private _workItemLinkClick(e?: any, requirementId?: number) {
        /// <summary>Handles the click event of the Find button.</summary>
        /// <param name="e" type="Object">event related info</param>
        /// <param name="requirementId" type="Number">the corresponding requirement id for the suite</param>
        Menus.menuManager.executeCommand(new Events_Handlers.CommandEventArgs("open-work-item", {
            id: requirementId,
            tfsContext: this._options.tfsContext
        }, null));
        return false;
    }

    private _createPlansDropDown() {
        /// <summary>Create the plans combobox .</summary>
        let planComboElement = this._element.find(".testmanagement-plans-combo");
        Diag.Debug.assertIsNotNull(planComboElement);
        this._plansSelector = <TestPlanSelector>Controls.Enhancement.enhance(TestPlanSelector, planComboElement);
        this._bind("itemSelected", delegate(this, this._onSelectedPlanChanged));
        this._bind("itemSelecting", delegate(this, this._onSelectedPlanChanging));
    }

    private _createTestPlansFilter() {
        /// <summary>Create the test plans filter .</summary>
        let testPlansFilterElement = this._element.find(".testmanagement-testplans-filter");
        Diag.Debug.assertIsNotNull(testPlansFilterElement);
        this._testPlanFilterMenubar = <Menus.MenuBar>Controls.BaseControl.createIn(Menus.MenuBar, testPlansFilterElement, {
            items: this._createFilterMenubarItems(),
            executeAction: delegate(this, this._testPlansFilterQuery)
        });

        new TMUtils.DelayedExecutionHelper().executeAfterLoadComplete(this, () => {
            this._updateTestPlanFilterButton();
        });
    }

    private _createFilterMenubarItems(): any[] {
        let items: any[] = [];
        items.push({
            id: this._testPlansFilterIds.testPlansFilter,
            text: Resources.FilterTestPlans,
            title: Resources.FilterTestPlans,
            showText: false,
            icon: "bowtie-icon bowtie-search-filter-fill",
            cssClass: "right-align testplan-filter"
        });

        return items;
    }

    private _testPlansFilterQuery() {
        let areaPath;
        if (this._currentPlan.plan) {
            areaPath = this._currentPlan.plan.areaPath;
        }

        VSS.using(["TestManagement/Scripts/TFS.TestManagement.SelectWorkItemView"], (Module: typeof SelectWorkItemView_LAZY_LOAD) => {
            Dialogs.show(Module.FilterTestPlansDialog, {
                width: $(window).width() * 0.8,
                height: $(window).height() * 0.8,
                minWidth: $(window).width() * 0.2,
                attachResize: true,
                okText: Resources.OkText,
                okCallback: (queryText: string) => {
                    this._filterPlans(queryText);
                },
                title: Resources.FilterTestPlans.toLocaleUpperCase(),
                workItemCategories: [TestsOM.WorkItemCategories.TestPlan],
                hideQueryType: true,
                persistenceId: Module.PersistenceIds.SELECT_TEST_PLANS_ID,
                supportWorkItemOpen: true,
                areaPath: areaPath,
                callback: () => {
                    this._resetTestPlansFilter();
                }
            });
        });
    }

    private _filterPlans(queryText: string) {
        this.setTestPlanFilterStateAndPopulateDropDown(queryText);
        TelemetryService.publishEvents(TelemetryService.featureTestPlansFilter, {});
    }

    private _resetTestPlansFilter() {
        TelemetryService.publishEvents(TelemetryService.featureTestPlansResetFilter, {});
    }

    private setTestPlanFilterStateAndPopulateDropDown(queryText: string) {
        let that = this;
        this._testPlanManager.saveAndFetchTestPlansByQueryFilter(queryText, (plansWithSelection) => {
            this._plansSelector.clearDropDown();
            this._plansSelector.setData(plansWithSelection.testPlans, plansWithSelection.selectedTestPlan);
            this._updateTestPlanFilterButton();
            if (plansWithSelection.testPlans.length < 1) {
                this._updatePage();
            }
        },
            function (e) {
                that.showError(VSS.getErrorMessage(e));
            });
    }

    private _updatePage() {
        this._resetState();
        this._resetTreeViewPane();
        this._resetTestPointPane();
        this._resetChildSuiteSelection();
    }

    private _resetState() {
        this._tryShowViewGrid(true);
        let url = TMUtils.UrlHelper.getTestManagementUrl();
        window.history.replaceState(null, null, url);
        let historySvc = Navigation_Services.getHistoryService();
        historySvc.addHistoryPoint(this._selectedPivot, null);
        this._currentPlan = {};
        if (this._selectedPlanIdAndSuiteId) {
            this._selectedPlanIdAndSuiteId.selectedPlan = 0;
            this._selectedPlanIdAndSuiteId.selectedSuite = 0;
        }
    }

    private _resetTestPointPane() {
        if (this._testManagementChartsView) {
            this._testManagementChartsView.hideElement();
        }
        this._setVisibility(GridAreaSelectors.viewGrid, false);
        if (this._testPointList) {
            this._testPointList._clearGrid();
        }
        this._updateTestPointsToolbarCommandStates();
        this._enableFilters(false);
        this._clearIterationDatesSpan();
        this._clearError();
        this._showPlanHubTitle();

        // Updating Tests and Charts tab url so that it doesn't point to any plan
        this._updateTabUrls(NaN, NaN);
    }

    private _resetTreeViewPane() {
        if (this._testSuitesTree) {
            this._testSuitesTree._selectedNode = null;
            this._testSuitesTree.clearTreeView();
        }

        if (LicenseAndFeatureFlagUtils.AreAdvancedTestManagementFeaturesEnabled()) {
            this._updateSuitesToolbarCommandStates();
        }
    }

    private _resetChildSuiteSelection() {
        // Disable show child suites button if enabled
        if (this._showTestsFromChild) {
            this._showTestsFromChild = false;
            this._testPlanAndSuitesMenubar.updateCommandStates([{
                id: this._testPlanAndSuitesCommandIds.showTestsFromChildSuites, toggled: this._showTestsFromChild
            }]);
        }
    }

    private _updateTestPlanFilterButton() {
        let that = this;
        this._testPlanManager.getConvertedFilteredTestPlanQueryFromRegistry(TestsOM.TestPlanSelectionHelper.getDefaultQuery(), (filterQuery) => {
            if (filterQuery && filterQuery.toUpperCase() !== TestsOM.TestPlanSelectionHelper.getDefaultQuery().toUpperCase()) {
                this._setTestPlanFilterState(true);
            } else {
                this._setTestPlanFilterState(false);
            }
        },
            function (e) {
                that._setTestPlanFilterState(false);
                that.showError(VSS.getErrorMessage(e));
            });
    }

    private _setTestPlanFilterState(state: any) {
        this._testPlanFilterMenubar.updateCommandStates([{ id: this._testPlansFilterIds.testPlansFilter, toggled: state }]);
    }

    private _createPlansAndSuitesToolbar() {
        /// <summary>Create the plans and suites toolbar.</summary>
        let toolbarElement = this._element.find(".test-plans-suites-toolbar");
        this._testPlanAndSuitesMenubar = <Menus.MenuBar>Controls.BaseControl.createIn(Menus.MenuBar, toolbarElement, {
            items: this._createTestPlanAndSuitesMenubarItems(),
            executeAction: delegate(this, this._onPlansAndSuitesMenubarItemClick),
            contributionIds: ["ms.vss-test-web.test-plans-suites-toolbar"],
            contextInfo: {
                item: { getContributionContext: this.getContributionContext.bind(this, true) }
            }
        });
        if (LicenseAndFeatureFlagUtils.AreAdvancedTestManagementFeaturesEnabled()) {
            this._updateSuitesToolBarItems();
            this._updateSuitesToolbarCommandStates();
        }
    }

    private _createSuitesSection() {
        /// <summary>Create the suites treeview section.</summary>
        //first creating the toolbar above suites and then the suites tree
        let suitesTreeElement: JQuery;

        suitesTreeElement = this._element.find(".testmanagement-suites-tree");
        Diag.Debug.assertIsNotNull(suitesTreeElement);
        this._testSuitesTree = <TMTreeViewControls.TestSuitesTree>Controls.Enhancement.enhance(TestSuitesTree, suitesTreeElement, { isFilterAppliedDelegate: delegate(this, this._isFilterApplied) });
        this._testSuitesTree.deleteTestSuiteDelegate = (suite: TestsOM.ITestSuiteModel) => {
            this.deleteTestSuite(suite.parentSuiteId, 0, suite.id, suite.type);
        };

        this._testSuitesTree.renameTestSuiteDelegate = (suite: TestsOM.ITestSuiteModel, title: string, errorCallback?: IErrorCallback) => {
            this.renameTestSuite(suite, title, errorCallback);
        };

        this._testSuitesTree.moveTestSuiteEntryDelegate = (toSuite: TestsOM.ITestSuiteModel, fromSuite?: TestsOM.ITestSuiteModel, suite?: TestsOM.ITestSuiteModel, position?: number, errorCallback?: IErrorCallback) => {
            if (fromSuite && suite) {
                this.moveTestSuite(fromSuite, toSuite, suite, position, errorCallback);
            }
            else {
                this.moveTestCase(toSuite);
            }

        };

        this._testSuitesTree.testPointDroppableAcceptDelegate = () => {
            return this.isTestPointBeingDragged();
        };

        this._testSuitesTree.openTestPlanInClientDelegate = delegate(this, this._openTestPlanInClient);

        this._testSuitesTree.deleteTestPlanDelegate = delegate(this, this._deleteTestPlan);

        this._testSuitesTree.assignConfigurationsToSuiteDelegate = delegate(this, this._assignConfigurationsToSuite);

        this._testSuitesTree.runTestSuiteDelegate = (suite: TestsOM.ITestSuiteModel, runWithOptions: boolean) => {

            DAUtils.trackAction("RunTestSuite", "/Execution");

            this._testPlanManager.getTestPointsForSuite(this._currentPlan.plan.id, suite.id, false, this._createDisplayColumns(), this._getOutcomeFilterValue(), this._getTesterFilterUniqueId(this._getTesterFilterValue()), this._getIdOfConfigurationInFilter(this._getConfigurationFilterValue()), (testPointsQueryResult: TestsOM.ITestPointQueryResultModel) => {
                // filter only the ready test points
                let filteredTestPoints: TestsOM.ITestPointModel[] = [];
                $.each(testPointsQueryResult.testPoints, (index, item: any) => {
                    if (item.outcome === Resources.TestPointState_Ready) {
                        filteredTestPoints.push(item);
                    }
                });

                if (filteredTestPoints.length > 0) {
                    // run test points.
                    if (runWithOptions) {
                        this._runTestPointsWithOptions(filteredTestPoints, suite.requirementId, suite.type === TCMConstants.TestSuiteType.RequirementTestSuite);
                    } else {
                        this._runTestPoints(filteredTestPoints);
                    }
                }
                else {
                    confirm(Resources.NoActiveTestPointsInSuite);
                }
            },
                (error) => {
                    this.showError(VSS.getErrorMessage(error));
                }, PageHelper.PageHelper.getPageSize(), this._showTestsFromChild);
        };

        this._testSuitesTree.launchExportHtmlDialogDelegate = (suite: TestsOM.ITestSuiteModel) => {
            VSS.using(["TestManagement/Scripts/TFS.TestManagement.HtmlDocumentGenerator"], (Module: typeof ExportHtml_LAZY_LOAD) => {
                let isChildSuitesCountExceededForExportFeature = this._testSuitesTree.checkIfThresholdExceededForExportFeature();
                this._exportHtmlWindow = new Module.HtmlDocumentGenerator({ columnOptions: this._savedColumns, testPointPaneColumnOptions: this._savedTestPointPaneColumns, plan: this._currentPlan, suiteHierarchy: this._testSuitesTree.rootNode });
                this._exportHtmlWindow.launchExportHtmlDialog(suite, isChildSuitesCountExceededForExportFeature);
                this._exportHtmlWindow.setErrorDelegate(delegate(this, this.showError));
            });
        };

        this._testSuitesTree.createNewSuiteDelegate = (suite: TestsOM.ITestSuiteModel, command: string) => {
            if (!this._shouldCancelPlanOrSuiteSelectionChange()) {
                this._createNewSuite(suite, command);
            }
        };

        this._testSuitesTree.openTestPlanDelegate = delegate(this, this._openTestPlan);
        this._testSuitesTree.openTestSuiteDelegate = delegate(this, this._openTestSuite);
        this._testSuitesTree.showErrorDelegate = delegate(this, this.showError);
        this._bind("selectedSuiteChanged", delegate(this, this._onSelectedSuiteChanged));
        this._bind("selectedSuiteChanging", delegate(this, this._onSelectedSuiteChanging));
        this._bind("selectedSuiteUpdated", delegate(this, this._onSelectedSuiteUpdated));
    }

    private _isFilterApplied(): boolean {
        return this._outcomeFilterApplied || this._testerFilterApplied || this._configurationFilterApplied;
    }

    private _createNewSuite(suite: TestsOM.ITestSuiteModel, command: string) {
        if (command === NewSuiteCommandIds.newStaticSuite) {
            this._createNewStaticSuite(suite);
        }
        else if (command === NewSuiteCommandIds.newRequirementSuite) {
            this._createNewRequirementSuite(suite);
        }
        else if (command === NewSuiteCommandIds.newQueryBasedSuite) {
            this._createNewQueryBasedSuite(suite);
        }

    }

    public isTestPointBeingDragged(): boolean {
        let workItemIds = this._testPointList.getDraggingRowInfo();
        if (workItemIds && workItemIds.length > 0) {
            return true;
        }

        return false;
    }

    public moveTestSuite(fromSuite: TestsOM.ITestSuiteModel, toSuite: TestsOM.ITestSuiteModel, suite: TestsOM.ITestSuiteModel, position: number, errorCallback?: IErrorCallback) {

        TMUtils.getTestPlanManager().moveTestSuiteEntry(this._currentPlan.plan.id, fromSuite.id, fromSuite.revision, toSuite.id, toSuite.revision, [suite.id], false, position, (suiteId: number) => {
            this._refreshTestSuitesForPlan(this._currentPlan.plan.id, this._currentPlan.selectedSuiteId);
        },
            (e) => {
                if ($.isFunction(errorCallback)) {
                    errorCallback(e);
                }
                this._showErrorOnSuiteHeirarchyUpdated(suite.id, e);
            });
    }

    public moveTestCase(toSuite: TestsOM.ITestSuiteModel) {

        let fromSuite = this._testSuitesTree.getSelectedSuite(),
            idsOfTestCasesToMove = this._testPointList.getDraggingRowInfo(),
            store = TMUtils.WorkItemUtils.getWorkItemStore();

        if (this._showTestsFromChild) {
            alert(Resources.CannotMoveTestCases);
            return;
        }

        if (idsOfTestCasesToMove && idsOfTestCasesToMove.length > 0) {
            if (this._areTestCasesDirty(idsOfTestCasesToMove)) {
                alert(Resources.DragDirtyTestCases);
                return;
            }
            TMUtils.getTestPlanManager().moveTestSuiteEntry(this._currentPlan.plan.id, fromSuite.id, fromSuite.revision, toSuite.id, toSuite.revision, idsOfTestCasesToMove, true, 0, (updatedSuites: TestsOM.ITestSuiteModel[]) => {
                let workItemManager = WorkItemManager.get(store);
                this._testSuitesTree.updateSuitesRevisionAndPointCount(updatedSuites);
                this._refreshAndPopulatetestPointList(this._currentPlan.plan.id, this._currentPlan.selectedSuiteId, false, true);
                if (fromSuite.type === TCMConstants.TestSuiteType.RequirementTestSuite ||
                    toSuite.type === TCMConstants.TestSuiteType.RequirementTestSuite) {
                    workItemManager.invalidateCache(idsOfTestCasesToMove);
                }
                workItemManager.invalidateCache([fromSuite.requirementId, toSuite.requirementId]);
            },
                (e) => {
                    if (e.type === TestsOM.Exceptions.TestObjectNotFoundException) {
                        this._refreshAndPopulatetestPointList(this._currentPlan.plan.id, this._currentPlan.selectedSuiteId, false, true);
                        alert(Resources.SuiteEntryMoveFailed);
                    }
                    else {
                        this.showError(VSS.getErrorMessage(e));
                    }
                });
        }
    }

    private _createNewStaticSuite(parentSuite: TestsOM.ITestSuiteModel) {
        let newSuiteNameIndex = this._testSuitesTree.getUniqueNameIndexInCurrentSuite(Resources.NewSuite, Resources.NewSuiteDefaultFormat),
            suiteCreationModel: TestsOM.ITestSuiteCreationRequestModel = {
                startIndex: newSuiteNameIndex,
                title: Resources.NewSuite,
                parentSuiteId: parentSuite.id,
                parentSuiteRevision: parentSuite.revision
            };

        DAUtils.trackAction("CreateStaticSuite", "/SuiteManagement");
        if (parentSuite.type === TCMConstants.TestSuiteType.StaticTestSuite) {
            TMUtils.getTestPlanManager().createStaticTestSuite(suiteCreationModel, (suiteId: number) => {
                this._refreshTestSuitesForPlan(this._currentPlan.plan.id, suiteId, true);

                //Adding telemetry for creating test plan workitem. Area: TestManagement, Feature: TestSuite. Property: AddStaticSuite.
                TelemetryService.publishEvent(TelemetryService.featureTestSuite, TelemetryService.addStaticSuite, 1);
            },
                (e) => {
                    this._showErrorOnSuiteHeirarchyUpdated(suiteCreationModel.parentSuiteId, e);
                });
        }
    }

    private _createNewRequirementSuite(parentSuite: TestsOM.ITestSuiteModel) {
        TelemetryService.publishEvents(TelemetryService.featureOpenRequirementWIT, {});
        VSS.using(["TestManagement/Scripts/TFS.TestManagement.SelectWorkItemView"], (Module: typeof SelectWorkItemView_LAZY_LOAD) => {
            Dialogs.show(Module.SelectWorkItemsDialog, {
                width: $(window).width() * 0.8,
                height: $(window).height() * 0.8,
                attachResize: true,
                okText: Resources.CreateSuites,
                okCallback: (requirementIds: number[]) => {
                    this._createRequirementSuites(new TestsOM.IdAndRevision(parentSuite.id, parentSuite.revision), requirementIds);
                },
                title: Resources.CreateRequirementSuite.toLocaleUpperCase(),
                workItemCategories: [TestsOM.WorkItemCategories.Requirement, TestsOM.WorkItemCategories.Bug, TestsOM.WorkItemCategories.Feature, TestsOM.WorkItemCategories.Epic],
                hideQueryType: false,
                persistenceId: Module.PersistenceIds.ADD_REQUIREMENTS_ID,
                supportWorkItemOpen: true,
                areaPath: this._currentPlan.plan.areaPath
            });
        });
    }

    private _createRequirementSuites(parentSuiteIdAndRevision: TestsOM.IdAndRevision, requirementIds: number[]) {
        DAUtils.trackAction("CreateRequirementSuites", "/SuiteManagement", { requirementsCount: requirementIds.length });
        TMUtils.getTestPlanManager().createRequirementSuites(parentSuiteIdAndRevision, requirementIds, (suiteId: number) => {
            if (suiteId !== 0) {
                this._refreshTestSuitesForPlan(this._currentPlan.plan.id, suiteId, false);

                //Adding telemetry for creating test plan workitem. Area: TestManagement, Feature: TestSuite. Property: AddRequirementBasedSuite.
                TelemetryService.publishEvent(TelemetryService.featureTestSuite, TelemetryService.addRequirementBasedSuite, 1);
            }
        },
            (e) => {
                this._showErrorOnSuiteHeirarchyUpdated(parentSuiteIdAndRevision.id, e);
            });
    }

    private _createNewQueryBasedSuite(parentSuite: TestsOM.ITestSuiteModel) {
        VSS.using(["TestManagement/Scripts/TFS.TestManagement.SelectWorkItemView"], (Module: typeof SelectWorkItemView_LAZY_LOAD) => {
            Dialogs.show(Module.CreateQueryBasedSuiteDialog, {
                width: $(window).width() * 0.8,
                height: $(window).height() * 0.8,
                attachResize: true,
                okText: Resources.CreateSuite,
                okCallback: (queryName: string, queryText: string) => {
                    this._createQueryBasedSuite(parentSuite, queryName, queryText);
                },
                title: Resources.CreateQueryBasedSuiteTitle.toLocaleUpperCase(),
                workItemCategories: [TestsOM.WorkItemCategories.TestCase],
                hideQueryType: false,
                persistenceId: Module.PersistenceIds.CREATE_QUERY_BASED_SUITE_ID,
                supportWorkItemOpen: true,
                newSuiteMode: true,
                areaPath: this._currentPlan.plan.areaPath
            });
        });
    }

    private _createQueryBasedSuite(parentSuite: TestsOM.ITestSuiteModel, queryName: string, queryText: string) {
        let newSuiteNameIndex = this._testSuitesTree.getUniqueNameIndexInCurrentSuite(queryName, Resources.NewSuiteDefaultFormat),
            suiteCreationModel: TestsOM.IQueryBasedSuiteCreationRequestModel = {
                startIndex: newSuiteNameIndex,
                title: queryName,
                parentSuiteId: parentSuite.id,
                parentSuiteRevision: parentSuite.revision,
                queryText: queryText
            };

        DAUtils.trackAction("CreateQueryBasedSuite", "/SuiteManagement");

        if (parentSuite.type === TCMConstants.TestSuiteType.StaticTestSuite) {
            TMUtils.getTestPlanManager().createQueryBasedSuite(suiteCreationModel, (suiteId: number) => {
                if (suiteId !== 0) {
                    this._refreshTestSuitesForPlan(this._currentPlan.plan.id, suiteId, false);

                    //Adding telemetry for creating test plan workitem. Area: TestManagement, Feature: TestSuite. Property: AddQueryBasedSuite.
                    TelemetryService.publishEvent(TelemetryService.featureTestSuite, TelemetryService.addQueryBasedSuite, 1);
                }
            },
                (e) => {
                    this._showErrorOnSuiteHeirarchyUpdated(suiteCreationModel.parentSuiteId, e);
                });
        }
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

        DAUtils.trackAction("EditQueryForQuerBasedSuite", "/SuiteManagement");

        TMUtils.getTestPlanManager().updateQueryBasedSuite(suite, queryText, (revision: number) => {
            this._updateQueryForSuite(suite, queryText, revision);
            if (revision === TMUtils.conflictRevisionNumber) {
                this._refreshTestSuitesForPlan(this._currentPlan.plan.id, suite.id);
                alert(Resources.SuiteRenameErrorMessage);
            }
            else {
                this._refreshAndPopulatetestPointList(this._currentPlan.plan.id, this._currentPlan.selectedSuiteId, true);
            }
        },
            (e) => {
                this.showError(VSS.getErrorMessage(e));
            });
    }

    public deleteTestSuite(parentSuiteId: number, parentSuiteRevision: number, suiteId: number, suiteType: TCMConstants.TestSuiteType) {
        this.deleteTestSuiteV2(parentSuiteId, parentSuiteRevision, suiteId, suiteType);
        return;
    }

    /**
     * Delete the test suite, it will launch the test suite deletion dialog which cleans up suite
     * and its child suites
     * @param parentSuiteId
     * @param parentSuiteRevision
     * @param suiteId
     * @param suiteType
     */
    public deleteTestSuiteV2(parentSuiteId: number, parentSuiteRevision: number, suiteId: number, suiteType: TCMConstants.TestSuiteType) {
        let shouldProceed: boolean = true;

        DAUtils.trackAction("DeleteTestSuite", "/SuiteManagement");
        if (!this._inEditMode) {
            shouldProceed = !this._checkAndNotifyUserAboutDirtyTests();
        }

        if (shouldProceed) {
            VSS.using(["WorkItemTracking/Scripts/TestWorkItemDelete/TFS.TestWorkItemDelete.Dialog"], (dialog: typeof TestWorkItemDeleteDialog_Async) => {
                let tfsContext: TFS_Host_TfsContext.TfsContext = this._options.tfsContext || TfsContext.getDefault();
                let testSuiteDeleteDialog = new dialog.TestSuiteDeleteConfirmationDialog({projectId: tfsContext.navigation.projectId} as TestWorkItemDeleteDialog_Async.ITestDeleteConfirmationDialogOptions);
                let workItemId = suiteId;

                let successCallback = () => {
                    this._onTestSuiteDeletionSuccess(parentSuiteId, suiteId);
                };

                let errorCallback: IErrorCallback = (e) => { this._showErrorOnSuiteHeirarchyUpdated(parentSuiteId, e); };

                // Get the work item type before launching the dialog
                let store = TMUtils.WorkItemUtils.getWorkItemStore();
                store.beginGetWorkItem(workItemId, (workItem: WITOM.WorkItem) => {
                    testSuiteDeleteDialog.showDialog(workItemId, workItem.workItemType.name, () => {
                        if (this._inEditMode) {
                            shouldProceed = this._bulkEditTestsViewModel.cleanup();
                        }

                        if (shouldProceed) {
                            testSuiteDeleteDialog.deleteTestWorkItem(
                                TCMTelemetry.TelemetryService.testHubPage,
                                TCMTelemetry.TelemetryService.areaTestManagement,
                                workItemId,
                                false,
                                successCallback,
                                errorCallback);
                        }
                    });
                });
            });
        }
    }

    public renameTestSuite(suite: TestsOM.ITestSuiteModel, title: string, errorCallback?: IErrorCallback) {
        TMUtils.getTestPlanManager().renameTestSuite(suite,
            title,
            (revision) => {
                this._refreshTestSuitesForPlan(this._currentPlan.plan.id, suite.id);
                if (revision == TMUtils.conflictRevisionNumber) {
                    alert(Resources.SuiteRenameErrorMessage);
                }

                //Adding telemetry for creating test plan workitem. Area: TestManagement, Feature: TestSuite. Property: RenameSuite.
                TelemetryService.publishEvent(TelemetryService.featureTestSuite, TelemetryService.renameSuite, 1);
            },
            (e) => {
                if ($.isFunction(errorCallback)) {
                    errorCallback(e);
                }
                this._showErrorOnSuiteHeirarchyUpdated(suite.id, e);
            }
        );
    }

    private _onTestSuiteDeletionSuccess(parentSuiteId: number, suiteId: number) {
        this._refreshTestSuitesForPlan(this._currentPlan.plan.id, parentSuiteId);
        // Since suite deletion is successful, delete charts for the suite, if any.
        if (this._testManagementChartsView) {
            this._testManagementChartsView.deleteChart(this._currentPlan.plan.id, suiteId);
        }

        //Adding telemetry for deleting test suite. Area: TestManagement, Feature: TestSuite. Property: DeleteSuite.
        TelemetryService.publishEvent(TelemetryService.featureTestSuite, TelemetryService.deleteSuite, 1);
    }

    private _showErrorOnSuiteHeirarchyUpdated(suiteId: number, e) {
        if (e.type === TestsOM.Exceptions.TestObjectNotFoundException) {
            this._refreshTestSuitesForPlan(this._currentPlan.plan.id, suiteId);
            alert(Resources.SuiteRenameErrorMessage);
        }
        else {
            this.showError(VSS.getErrorMessage(e));
        }
    }

    private _onSelectedPlanChanged(e?: any, selectedItemInfo?: any) {
        /// <summary>Takes care of maintaining state in the url on selected plan change</summary>
        /// <param name="e" type="Object">event related info</param>
        /// <param name="selectedItemInfo" type="Object">has the information about the selected plan from the dropdown</param>
        if (selectedItemInfo.item &&
            ((this._selectedPlanIdAndSuiteId && this._selectedPlanIdAndSuiteId.selectedPlan === 0)
                || (this._currentPlan && this._currentPlan.plan && this._currentPlan.plan.id !== selectedItemInfo.item.id))) {
            let historySvc = Navigation_Services.getHistoryService();
            let currentState = historySvc.getCurrentState();
            if (!(currentState && (parseInt(currentState.planId, 10) === selectedItemInfo.item.id))) {
                // Add a history point only if the url does not have the planid
                if (selectedItemInfo.item.rootSuiteId === 0) {
                    this._testPlanManager.beginCreateTestPlanFromWorkItem(selectedItemInfo.item.id, (promotedTestPlan) => {
                        selectedItemInfo.item.rootSuiteId = promotedTestPlan.rootSuiteId;
                        historySvc.addHistoryPoint(this._selectedPivot, { planId: selectedItemInfo.item.id, suiteId: selectedItemInfo.item.rootSuiteId });
                    },
                        (e) => {
                            this.showError(VSS.getErrorMessage(e));
                        });
                }
                else {
                    historySvc.addHistoryPoint(this._selectedPivot, { planId: selectedItemInfo.item.id, suiteId: selectedItemInfo.item.rootSuiteId });
                }
            }
        }
    }

    private _onSelectedPlanChanging(e?: any, eventArgs?: any) {
        if (eventArgs && this._currentPlan.plan && eventArgs.item.id !== this._currentPlan.plan.id) {
            eventArgs.canceled = this._shouldCancelPlanOrSuiteSelectionChange();
        }
    }

    private _onClickCreateNewTestPlan() {
        DAUtils.trackAction("CreateTestPlan", "/SuiteManagement");
        VSS.using(["TestManagement/Scripts/TFS.TestManagement.Controls"], (Module: typeof TMControls_LAZY_LOAD) => {

            Module.TestDialogs.createTestPlan({
                owner: this._options.tfsContext.currentIdentity.id,
                planCreationHelper: this._testPlanCreationHelper,
                onCreate: delegate(this._testPlanManager, this._testPlanManager.createTestPlan),
                onSucceeded: delegate(this._plansSelector, this._plansSelector.updateData),
                onFailed: (e) => {
                    this.showError(VSS.getErrorMessage(e));
                    this._plansSelector.updateData(null);
                    this._clearIterationDatesSpan();
                }
            });
        });
    }

    private _updateSuitesToolBarItems() {
        let suite: TestsOM.ITestSuiteModel = this._testSuitesTree ? this._testSuitesTree.getSelectedSuite() : null,
            menuItem = this._testPlanAndSuitesMenubar.getItem(this._testPlanAndSuitesCommandIds.openTestPlanOrSelectedSuite);

        if (suite && suite.parentSuiteId > 0) {
            menuItem.updateTitle(Resources.OpenTestSuite);
        }
        else {
            menuItem.updateTitle(Resources.OpenTestPlan);
        }
    }

    private _updateSuitesToolbarCommandStates() {
        let suite: TestsOM.ITestSuiteModel = this._testSuitesTree ? this._testSuitesTree.getSelectedSuite() : null,
            canAddNewSuite = suite && suite.type === TCMConstants.TestSuiteType.StaticTestSuite;

        if (!this._testPlanAndSuitesMenubar) {
            return;
        }

        this._testPlanAndSuitesMenubar.updateCommandStates(
            <Menus.ICommand[]>[
                {
                    id: NewSuiteCommandIds.newStaticSuite,
                    disabled: !canAddNewSuite
                },
                {
                    id: NewSuiteCommandIds.newRequirementSuite,
                    disabled: !canAddNewSuite
                },
                {
                    id: NewSuiteCommandIds.newQueryBasedSuite,
                    disabled: !canAddNewSuite
                },
                {
                    id: this._testPlanAndSuitesCommandIds.newSharedStep,
                    disabled: !suite
                }]);
    }

    private _onSelectedSuiteChanged(e?: any, selectedItemInfo?: any) {
        /// <summary>Takes care of maintaining state in the url on selected suite change</summary>
        /// <param name="e" type="Object">event related info</param>
        /// <param name="selectedItemInfo" type="Object">has the information about the selected suite</param>
        let suite = selectedItemInfo.suite;
        this._clearAndHideTagsFilter();
        if (LicenseAndFeatureFlagUtils.AreAdvancedTestManagementFeaturesEnabled()) {
            this._updateSuitesToolBarItems();
            this._updateSuitesToolbarCommandStates();
        }
        this._updateTestPointsToolbarCommandStates();
        if (suite) {
            Navigation_Services.getHistoryService().addHistoryPoint(this._selectedPivot, { planId: this._currentPlan.plan.id, suiteId: suite.id });
            this._updateViewFilter(suite);
        }
    }

    private _onSelectedSuiteUpdated(e?: any) {
        /// <summary> repopulates the testpoint list for the suite
        if (this._currentPlan && this._currentPlan.plan) {
            this._refreshAndPopulatetestPointList(this._currentPlan.plan.id, this._currentPlan.selectedSuiteId, true);
        }
    }

    private _clearAndHideTagsFilter() {
        if (this._tagFilterProvider) {
            this._tagFilterProvider.deactivateFilter(true);
        }
        this._testPointList.cleanUpTagsFilter();
        if (this._filterBar) {
            this._filterBar.hideElement();
        }
    }

    private _updateViewFilter(suite: TestsOM.ITestSuiteModel) {
        if (this._viewFilter) {
            if (suite.type === TCMConstants.TestSuiteType.DynamicTestSuite || this._selectedPivot === TestPivots.CHARTS || !LicenseAndFeatureFlagUtils.AreAdvancedTestManagementFeaturesEnabled()) {
                // Hide view filter for Query based suite.
                this._viewFilter.hideElement();
            }
            else {
                this._viewFilter.showElement();
            }
        }
    }

    private _onSelectedSuiteChanging(e?: any, eventArgs?: any) {
        if (eventArgs && eventArgs.suite && eventArgs.suite.id !== this._currentPlan.selectedSuiteId) {
            eventArgs.canceled = this._shouldCancelPlanOrSuiteSelectionChange();
        }
    }

    private _checkAndNotifyUserAboutDirtyTests(): boolean {
        let message = "";
        if (this._canSaveTests() || this._isTestCaseInPaneEdited()) {
            message = Service.getLocalService(Events_Document.RunningDocumentsTable).getUnsavedItemsMessage() + "\r\n\r\n" + Resources.ContinueAndLoseChanges;
            if (!confirm(message)) {
                return true;
            }
            else {
                this._testPointList.resetDirtyItems();
                return false;
            }
        }

        return false;
    }

    private _openTestPlanInClient(): void {
        let clientUrl = this._currentPlan.plan.clientUrl;
        DAUtils.trackAction("OpenInClient", "/SuiteManagement");
        if (Utils_Url.isSafeProtocol(clientUrl)) {
            //Adding telemetry for creating test plan workitem. Area: TestManagement, Feature: OpenInMTM.
            TelemetryService.publishEvents(TelemetryService.featureOpenInMTM, {});

            Events_Action.getService().performAction(Events_Action.CommonActions.ACTION_WINDOW_OPEN, {
                url: clientUrl,
                target: "_self"
            });
        }
    }

    private _deleteTestPlan(): void {
        let deleteTestPlanConfirmation: string,
            shouldProceed: boolean = true;

        this._deleteTestPlanV2();
        return;

        DAUtils.trackAction("DeleteTestPlan", "/SuiteManagement");
        if (!this._inEditMode) {
            shouldProceed = !this._checkAndNotifyUserAboutDirtyTests();
        }

        if (shouldProceed) {
            deleteTestPlanConfirmation = Resources.DeletePlanConfirmation;
            if (confirm(deleteTestPlanConfirmation)) {
                if (this._inEditMode) {
                    shouldProceed = this._bulkEditTestsViewModel.cleanup();
                }
                if (shouldProceed) {
                    TMUtils.getTestPlanManager().deleteTestPlan(this._currentPlan.plan.id,
                        () => {
                            let selectedPlan = this._plansSelector.removeDeletedPlanAndSetSelectedPlan(this._currentPlan.plan.id);

                            if (!selectedPlan) {
                                // No plan left after deletion. So reset currentPlan an selectedPlanAndSuiteId to indicate no selection and update the page 
                                this._currentPlan = {};
                                if (this._selectedPlanIdAndSuiteId) {
                                    this._selectedPlanIdAndSuiteId.selectedPlan = 0;
                                    this._selectedPlanIdAndSuiteId.selectedSuite = 0;
                                }
                                this._updatePage();
                            }

                            //Adding telemetry for deleting test plan workitem. Area: TestManagement, Feature: TestPlan. Property: DeleteTestPlan.
                            TelemetryService.publishEvent(TelemetryService.featureDeleteTestPlan, TelemetryService.deleteTestPlan, 1);
                        },
                        (e) => {
                            this.showError(VSS.getErrorMessage(e));
                        });
                }
            }
        }
    }

    /**
     * Delete the test plan, it will launch the test plan deletion dialog which cleans up plan
     * and its child suites
     */
    private _deleteTestPlanV2(): void {
        let shouldProceed: boolean = true;

        DAUtils.trackAction("DeleteTestPlan", "/SuiteManagement");
        if (!this._inEditMode) {
            shouldProceed = !this._checkAndNotifyUserAboutDirtyTests();
        }

        if (shouldProceed) {
            VSS.using(["WorkItemTracking/Scripts/TestWorkItemDelete/TFS.TestWorkItemDelete.Dialog"], (dialog: typeof TestWorkItemDeleteDialog_Async) => {
                let tfsContext: TFS_Host_TfsContext.TfsContext = this._options.tfsContext || TfsContext.getDefault();
                let testPlanDeleteDialog = new dialog.TestPlanDeleteConfirmationDialog({projectId: tfsContext.navigation.projectId} as TestWorkItemDeleteDialog_Async.ITestDeleteConfirmationDialogOptions);
                let workItemId = this._currentPlan.plan.id;

                let successCallback = Utils_Core.delegate(this, this._onPlanDeletionSuccess);

                let errorCallback: IErrorCallback = (e) => { this.showError(VSS.getErrorMessage(e)); };

                let store = TMUtils.WorkItemUtils.getWorkItemStore();
                store.beginGetWorkItem(workItemId, (workItem: WITOM.WorkItem) => {
                    testPlanDeleteDialog.showDialog(workItemId, workItem.workItemType.name, () => {
                        if (this._inEditMode) {
                            shouldProceed = this._bulkEditTestsViewModel.cleanup();
                        }
                        if (shouldProceed) {
                            testPlanDeleteDialog.deleteTestWorkItem(
                                TelemetryService.testHubPage,
                                TelemetryService.areaTestManagement,
                                workItemId,
                                false,
                                successCallback,
                                errorCallback);
                        }
                    });
                });
            });
        }
    }

    private _onPlanDeletionSuccess() {
        let selectedPlan = this._plansSelector.removeDeletedPlanAndSetSelectedPlan(this._currentPlan.plan.id);

        if (!selectedPlan) {
            // No plan left after deletion. So reset currentPlan an selectedPlanAndSuiteId to indicate no selection and update the page 
            this._currentPlan = {};
            if (this._selectedPlanIdAndSuiteId) {
                this._selectedPlanIdAndSuiteId.selectedPlan = 0;
                this._selectedPlanIdAndSuiteId.selectedSuite = 0;
            }
            this._updatePage();
        }

        //Adding telemetry for deleting test plan workitem. Area: TestManagement, Feature: TestPlan. Property: DeleteTestPlan.
        TelemetryService.publishEvent(TelemetryService.featureDeleteTestPlan, TelemetryService.deleteTestPlan, 1);
    }

    private _HandleFailure(errorMessage: string) {
        this.showError(errorMessage);
    }

    private _openTestPlan(): void {
        /// <summary>opens the selected test plan</summary>
        let testPlan = this._currentPlan.plan;
        let testPlanModified = false;
        let suiteData = {};
        let suiteTotalData = {};
        let rootNode: any;
        let currentSelectedSuite: any;

        eventService.attachEvent(RecycleBinConstants.EVENT_DELETE_SUCCEEDED, this._onPlanDeletionSuccess);
        eventService.attachEvent(RecycleBinConstants.EVENT_DELETE_FAILED, this._HandleFailure);

        Menus.menuManager.executeCommand(new Events_Handlers.CommandEventArgs("open-work-item", {
            id: testPlan.id,
            tfsContext: TFS_Host_TfsContext.TfsContext.getDefault(),
            options: {
                save: (workItem: WITOM.WorkItem) => {
                    testPlanModified = true;
                },

                close: (workItem: WITOM.WorkItem) => {
                    eventService.detachEvent(RecycleBinConstants.EVENT_DELETE_SUCCEEDED, this._onPlanDeletionSuccess);
                    eventService.detachEvent(RecycleBinConstants.EVENT_DELETE_FAILED, this._HandleFailure);
                    if (testPlanModified) {
                        this._testPlanManager.getTestPlansById([testPlan.id], (fetchedTestPlans: any) => {
                            if (fetchedTestPlans && fetchedTestPlans.length === 1) {

                                this._currentPlan.plan = fetchedTestPlans[0];

                                //Update plan in combo-box                              
                                this._plansSelector.updateData(fetchedTestPlans[0], true, testPlan);

                                //update rootsuite name as plan name in suite tree.
                                rootNode = this._testSuitesTree.rootNode.children[0];
                                rootNode.suite.title = fetchedTestPlans[0].name;
                                suiteData[rootNode.suite.id] = rootNode.suite.pointCount;
                                suiteTotalData[rootNode.suite.id] = rootNode.suite.totalPointCount;
                                this._testSuitesTree.updateNodes(suiteData, suiteTotalData);

                                //update view title if root suite selected.
                                currentSelectedSuite = this._testSuitesTree.getSelectedSuite();
                                if (currentSelectedSuite.id === rootNode.suite.id) {
                                    this.setViewTitle(Utils_String.format(Resources.TestPointsGridSuiteHeader, rootNode.suite.title, rootNode.suite.id));
                                }

                                this._testPlanManager.getTeamFieldForTestPlans([this._currentPlan.plan.id],
                                    (teamFields) => {
                                        if (teamFields && teamFields.length === 1 && teamFields[0].ownerId === this._currentPlan.plan.id) {
                                            this._currentTeamFieldInfo =
                                                new TestsOM.TeamFieldModel(teamFields[0].teamFieldRefName, teamFields[0].teamFieldValue, true);
                                        }
                                        else {
                                            this._currentTeamFieldInfo = new TestsOM.TeamFieldModel("", "", false);
                                        }
                                    },
                                    () => { this._currentTeamFieldInfo = null; });
                            }
                        });
                    }

                    testPlanModified = false;
                }
            }
        }, null));

        try {
            //Adding telemetry for open test plan workitem. Area: TestManagement, Feature: OpenTestPlanWIT
            TelemetryService.publishEvents(TelemetryService.featureOpenTestPlanWIT, {});
        }
        catch (e) {
            Diag.logError(Utils_String.format("[TestHubView._openTestPlan]: Error in logging Customer Intelligence data. Error: {0}", e.message));
        }
    }

    private _openTestSuite(suite: TestsOM.ITestSuiteModel): void {
        /// <summary>opens the selected test suite</summary>
        let testSuiteModified = false;
        let testSuiteDeleteSuccessDelegate = () => {
            this._onTestSuiteDeletionSuccess(suite.parentSuiteId, suite.id);
        };
        let testSuiteDeleteFailureDelegate = () => {
            this._showErrorOnSuiteHeirarchyUpdated(suite.parentSuiteId, suite.id);
        };
        eventService.attachEvent(RecycleBinConstants.EVENT_DELETE_SUCCEEDED, testSuiteDeleteSuccessDelegate);
        eventService.attachEvent(RecycleBinConstants.EVENT_DELETE_FAILED, testSuiteDeleteFailureDelegate);

        Menus.menuManager.executeCommand(new Events_Handlers.CommandEventArgs("open-work-item", {
            id: suite.id,
            tfsContext: TFS_Host_TfsContext.TfsContext.getDefault(),
            options: {
                save: (workItem: WITOM.WorkItem) => {
                    testSuiteModified = true;
                },

                close: (workItem: WITOM.WorkItem) => {
                    eventService.detachEvent(RecycleBinConstants.EVENT_DELETE_SUCCEEDED, testSuiteDeleteSuccessDelegate);
                    eventService.detachEvent(RecycleBinConstants.EVENT_DELETE_FAILED, testSuiteDeleteFailureDelegate);
                    if (testSuiteModified) {
                        this._refreshTestSuitesForPlan(this._currentPlan.plan.id, suite.id);
                    }

                    testSuiteModified = false;
                }
            }
        }, null));

        try {
            //Adding telemetry for open test suite workitem. Area: TestManagement, Feature: OpenTestSuiteWIT
            TelemetryService.publishEvents(TelemetryService.featureOpenTestSuiteWIT, {});
        }
        catch (e) {
            Diag.logError(Utils_String.format("[TestHubView._openTestSuite]: Error in logging Customer Intelligence data. Error: {0}", e.message));
        }
    }

    private _updateTesterFilterOnUrl() {
        // This method is required for AssignTestersToSuite scenario
        // If URL contains action='filterByTesters', then update Tester filters
        let state = Navigation_Services.getHistoryService().getCurrentState();
        let currentUserInAssignedTesterList = false;

        if (state.action === TestsOM.TestViewActions.FilterByTester) {
            let currentIdentity = TfsContext.getDefault().currentIdentity;

            TMUtils.getTestPlanManager().getTestersAssignedToSuite(state.suiteId, (testersList: any[]) => {
                for (let i = 0, len = testersList.length; i < len; i++) {
                    if (currentIdentity.id === testersList[i].id) {
                        currentUserInAssignedTesterList = true;
                        currentIdentity.uniqueName = testersList[i].uniqueName;
                        break;
                    }
                }

                if (currentUserInAssignedTesterList) {
                    // Filter by current user
                    this._updateFilterSelection(this._testerFilter, "tester", TFS_OM_Identities.IdentityHelper.getUniquefiedIdentityName(currentIdentity));
                }
                else {
                    // Show all
                    this._updateFilterSelection(this._testerFilter, "tester", FilterHelper.ALL_FILTER);
                }
            });
        }
    }

    private _assignConfigurationsToSuite(node: any): void {
        VSS.using(["TestManagement/Scripts/TFS.TestManagement.AssignConfigurationsToSuite"], (Module: typeof TestAssignConfig_LAZY_LOAD) => {
            let assignConfigurationToSuite = new Module.AssignConfigurationsToSuite(this._currentPlan.id, node.suite);

            assignConfigurationToSuite.AssignConfigurations(
                (assignedConfigurations: number[], changesSaved: boolean) => {

                    // refresh test points only when changes were saved
                    if (changesSaved) {
                        node.suite.configurations = assignedConfigurations;
                        this._refreshSuitePointCounts(null);
                        this._refreshAndPopulatetestPointList(this._currentPlan.plan.id, this._currentPlan.selectedSuiteId, true);

                        //Adding telemetry for assigning Test Configuration. Area: TestManagement, Feature: AssignTestConfiguration
                        TelemetryService.publishEvent(TelemetryService.featureAssignConfiguration, TelemetryService.assignConfiguration, 1);
                    }
                },
                (e) => {
                    this.showError(VSS.getErrorMessage(e));
                });
        });
    }

    private _getNameOfConfigurationInFilter(configurationId: number) {
        if (!configurationId) {
            return "";
        }

        for (let i = 0, length = this._configurationsInPlan.length; i < length; i++) {
            if (this._configurationsInPlan[i].id === configurationId) {
                return this._configurationsInPlan[i].name;
            }
        }
    }

    private _getIdOfConfigurationInFilter(name: string) {
        if (!name) {
            return null;
        }

        if (name === FilterHelper.ALL_FILTER) {
            return -1;
        }

        for (let i = 0, length = this._configurationsInPlan.length; i < length; i++) {
            if (this._configurationsInPlan[i].name === name) {
                return this._configurationsInPlan[i].id;
            }
        }
    }

}

VSS.initClassPrototype(TestHubView, {
    _currentPlan: null,
    _testPlanAndSuitesCommandIds: {
        newTestPlan: "new-test-plan",
        newSharedStep: "new-shared-step",
        collapse: "collapse-all",
        expand: "expand-all",
        openInClient: "open-in-client",
        openTestPlanOrSelectedSuite: "open-test-plan-or-selected-suite",
        exportHtml: "export-to-html",
        showTestsFromChildSuites: "show-tests-from-child-suites"
    },

    _testPointToolbarItemIds: {
        newTestCaseDropDown: "new-test-case-dropdown-menu-item",
        newTestCase: "new-test-case",
        newTestCaseWithGrid: "new-test-case-with-grid",
        editQuery: "edit-suite-query",
        addTestCases: "add-test-cases",
        removeTestCase: "remove-test-case",
        refreshTestPoints: "refresh-test-points",
        openTestCase: "open-test-case",
        runTestPoints: "run-test-points",
        runTestPointsUsingClient: "run-test-points-using-client",
        runTestPointsWithOptions: "run-test-points-with-options",
        blockTest: "block-tests",
        resetTest: "reset-tests",
        passTest: "pass-tests",
        failTest: "fail-tests",
        saveTests: "save-tests",
        notApplicableTest: "not-applicable-tests",
        columnOptions: "column-options-test",
        resumeRun: "resume-run",
        toggleTestCaseDetailsPane: "toggle-testcase-details-pane",
        toggleFilter: "toggle-filter",
        runTestDropMenu: "run-test-points-dropdown-menu-item",
        orderTests: "order-tests"
    },

    _testDetailsPaneToolbarItemIds: {
        refreshTestDetailsPane: "refresh-test-details-pane-list",
        openTestDetailInNewTab: "open-test-detail-item"
    },

    _testPlansFilterIds: {
        testPlansFilter: "test-plans-filter"
    },

    //TODO: Dangerous member initialization on prototype. Get rid of it.
    _testPointList: null,
    _plansSelector: null,
    _testPlanManager: null,
    _testRunManager: null,
    _testResultManager: null,
    _$errorDiv: null,
    _testSuitesTree: null,
    _testPointsToolbar: null,
    _testPointOutcomeFilter: null,
    _testerFilter: null,
    _cachedTestPointData: null,
    _splitter: null,
    _workItemForm: null,
    _viewPaneForm: null,
    _workItemPaneMode: null,
    _previousPaneOnPosition: null,
    _webSettingsService: null,
    _webSettingsCollectionService: null,
    _positionFilter: null,
    _paneFilter: null,
    _selectedPlanIdAndSuiteId: {},
    //TODO: Dangerous member initialization on prototype. Get rid of it.
    currentWorkItemId: null,
    _inEditMode: false,
    _$farRightPaneHubPivot: null,
    _farRightPaneToolbar: null
});

export module CommonContextMenuItemsWithSearch {
    export function getAssignToContextMenuItem(tfsContext: TFS_Host_TfsContext.TfsContext, options?: any, errorHandler?: (...args: any[]) => any): Menus.IMenuItemSpec {
        /// <summary>Constructs and returns the Assign To context menu item</summary>
        /// <param name="tfsContext" type="Object">TFS context</param>
        /// <param name="options" type="object" optional="true">OPTIONAL: additional options</param>
        /// <param name="errorHandler" type="function" optional="true">OPTIONAL: Handler for errors</param>

        
        return {
            id: WorkItemTrackingControlsAccessories.CommonContextMenuItems.ASSIGN_TO_ACTION_NAME,
            rank: options.assignedToRank || 1,
            text: options.title ? options.title : TFS_Resources_Presentation.TeamAwarenessAssignTo,
            title: options.tooltip ? options.tooltip : TFS_Resources_Presentation.TeamAwarenessAssignToTooltip,
            icon: "bowtie-icon bowtie-users",
            childItems: AssignTester_LAZY_LOAD.AssignTestersChildItems.getAssignTesterChildItems(tfsContext, options, errorHandler),
            groupId: "modify"
        };
    }

    export function contributeTestPointsGrid(menuOptions: any, options?: any) {
        /// <summary>Contributes context menu items for the Test Points Grid</summary>
        /// <param name="menuOptions" type="Object">Context menu options</param>
        /// <param name="options" type="Object">{ tfsContext, enableTeamActions }</param>

        Diag.Debug.assertParamIsObject(menuOptions, "menuOptions");
        Diag.Debug.assertParamIsObject(options, "options");

        if (TFS_TeamAwarenessService.TeamAwarenessService.contextSupports(options.tfsContext) && options.enableTeamActions) {
            menuOptions.items = menuOptions.items.concat(<any[]>[
                CommonContextMenuItemsWithSearch.getAssignToContextMenuItem(options.tfsContext, options),
                { rank: 2, separator: true }]);
        }
    }
}

export class TeamHelper {
    private _iterationTeamDaysOffData: any;

    constructor() {
        this._iterationTeamDaysOffData = [];
    }

    public beginGetTeamCapacity(iterationId: string, callback?: IResultCallback, errorCallback?: IErrorCallback) {
        let actionUrl;

        if (this._iterationTeamDaysOffData[iterationId]) {
            if ($.isFunction(callback)) {
                callback(this._iterationTeamDaysOffData[iterationId]);
            }
        }

        actionUrl = TFS_Host_TfsContext.TfsContext.getDefault().getActionUrl(
            "getteamdaysoffforiteration",
            "testManagement",
            {
                area: "api"
            });

        Ajax.getMSJSON(actionUrl,
            { iterationId: iterationId },
            (data) => {
                this._iterationTeamDaysOffData[iterationId] = data;

                if ($.isFunction(callback)) {
                    callback(data);
                }
            }, errorCallback);
    }

    public getAndshowRemainingWorkDaysInIteration(iterationId: string, iterationStartDate: Date, iterationEndDate: Date, iterationDatesSpan: any, isInCurrentIteration: boolean) {

        VSS.using(["Agile/Scripts/Common/Agile"], (Module: typeof Agile_LAZY_LOAD) => {
            let startDate = this._getCurrentDateInIteration(iterationId, iterationStartDate, iterationEndDate);
            let remainingDays: number;

            if (this._iterationTeamDaysOffData[iterationId]) {
                if (startDate) {
                    let filteredDaysOffDates,
                        dateBreakdown;

                    filteredDaysOffDates = Module.CapacityDateUtils.getMergedDateRangeList(
                        this._iterationTeamDaysOffData[iterationId].TeamDaysOffDates || [],
                        [],
                        startDate,
                        iterationEndDate);

                    dateBreakdown = Module.CapacityDateUtils.getDateBreakdown(
                        startDate,
                        iterationEndDate,
                        filteredDaysOffDates,
                        this._iterationTeamDaysOffData[iterationId].Weekends || []);

                    remainingDays = dateBreakdown.workingDays;
                }
            }

            this._showRemainingWorkDaysInIteration(remainingDays, iterationDatesSpan, isInCurrentIteration);
        });
    }

    private _showRemainingWorkDaysInIteration(remainingDays: number, iterationDatesSpan: any, isInCurrentIteration: boolean) {
        let iterationRemainingDaysText: string = Utils_String.empty,
            $iterationDaysRemainingDiv: JQuery,
            messageFormat: string = Utils_String.empty;

        if (remainingDays === 1) {
            messageFormat = isInCurrentIteration ? Resources.IterationDayRemainingFormat : Resources.IterationWorkDayFormat;
        } else if (remainingDays > 1) {
            messageFormat = isInCurrentIteration ? Resources.IterationDaysRemainingFormat : Resources.IterationWorkDaysFormat;
        }

        iterationRemainingDaysText = Utils_String.format(messageFormat, remainingDays);

        if (iterationDatesSpan) {
            // set the remaining days div
            $iterationDaysRemainingDiv = iterationDatesSpan.find(".test-plan-iteration-remaining-days");
            $iterationDaysRemainingDiv.attr("title", iterationRemainingDaysText)
                .addClass("hub-title-right-secondary")
                .text(iterationRemainingDaysText);
        }
    }


    public todayIsInCurrentIteration(iterationId: string, iterationStartDate: Date, iterationEndDate: Date) {
        let today = Utils_Date.stripTimeFromDate(new Date());
        return (today >= iterationStartDate && today <= iterationEndDate);
    }

    private _getCurrentDateInIteration(iterationId: string, iterationStartDate: Date, iterationEndDate: Date) {
        return this.todayIsInCurrentIteration(iterationId, iterationStartDate, iterationEndDate) ?
            Utils_Date.stripTimeFromDate(new Date()) : iterationStartDate;
    }
}

VSS.classExtend(TestHubView, TfsContext.ControlExtensions);

Controls.Enhancement.registerEnhancement(TestHubView, ".test-hub-view");

// TFS plugin model requires this call for each tfs module.
VSS.tfsModuleLoaded("TFS.TestManagement.TestView", exports);

