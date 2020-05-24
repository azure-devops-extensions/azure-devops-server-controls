
import ko = require("knockout");

import * as CommonBase from "TestManagement/Scripts/TestReporting/Common/Common";
import Common = require("TestManagement/Scripts/TestReporting/TestTabExtension/Common");
import * as DataProvider from "TestManagement/Scripts/TestReporting/Common/Extension.DataProvider"; 
import Resources = require("TestManagement/Scripts/Resources/TFS.Resources.TestManagement");
import ResultListVM = require("TestManagement/Scripts/TestReporting/TestTabExtension/TestResults.ResultListViewModel");
import TCMLicenseAndFeatureFlagUtils = require("TestManagement/Scripts/Utils/TFS.TestManagement.LicenseAndFeatureFlagUtils");
import TCMOM = require("TestManagement/Scripts/TFS.TestManagement");
import TMUtils = require("TestManagement/Scripts/TFS.TestManagement.Utils");
import TCMTelemetry = require("TestManagement/Scripts/TFS.TestManagement.Telemetry");
import TRACommonControls = require("TestManagement/Scripts/TFS.TestManagement.RunsView.Common.Controls");
import ValueMap = require("TestManagement/Scripts/TFS.TestManagement.RunsView.ValueMap");
import { TestReportViewSettings, UpdateUserSettings } from "TestManagement/Scripts/TestReporting/Common/View.Settings";
import * as ViewSettings from "TestManagement/Scripts/TestReporting/Common/View.Settings";
import ResultDetailsView = require("TestManagement/Scripts/TestReporting/TestTabExtension/TestResults.ResultDetails");
import { FilterState, areFilterStatesEqual } from "TestManagement/Scripts/Scenarios/Common/TestResultsFilter/TestResults.Filtering.Common";

import TCMConstants = require("Presentation/Scripts/TFS/Generated/TFS.TestManagement.Constants");

import Contracts = require("TFS/TestManagement/Contracts");

import HistogramControl = require("VSS/Controls/Histogram");
import Controls = require("VSS/Controls"); 
import Diag = require("VSS/Diag");
import Grids = require("VSS/Controls/Grids");
import { RichContentTooltip } from "VSS/Controls/PopupContent";
import Performance = require("VSS/Performance");
import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");


let delegate = Utils_Core.delegate;
let TelemetryService = TCMTelemetry.TelemetryService;
let LicenseAndFeatureFlagUtils = TCMLicenseAndFeatureFlagUtils.LicenseAndFeatureFlagUtils;

///--------------------- Results Grid section ----------------------------///

export interface IResultGridViewOptions extends Grids.IGridOptions {
    target: Common.TargetPage;
    viewModel: ResultListVM.ResultListViewModel;
}

export interface IResultViewModel {
    storage: string;
    test?: string;
    testTitle?: string;
    failingSince?: string;
    resolution?: string;
    activeBugs?: string[];
    isNewFailure?: boolean;
    runId?: number;
    resultId?: number;
    testCaseRefId?: number;
    failingContextId?: number;
    failingContextName?: string;
    isTestCaseRow?: boolean;
    outcome?: Contracts.TestOutcome;
    duration?: string;
    dateStarted?: string;
    dateCompleted?: string;
    owner?: string;
    environmentName?: string;
    isUnreliable?: boolean;
    resultState?: TCMConstants.TestResultState;
}

export interface IResultsProvider {
    getResults(): IPromise<Contracts.TestCaseResult[]>;
}

export interface IGetHyperlinkCellContentsForTestRow {
    rowInfo: any;
    dataIndex: number;
    expandedState: number;
    level: number;
    column: any;
    indentIndex: number;
    columnOrder: number;
    href: string;
    telemetryFeatureName?: string;
    className?: string;
}

/// This is used to store the fixed column "Test" width if someone:
/// 1.)Resizes the column width of Test column (because Test column is the one which is fixed and can be resized)
/// 2.)Click column option button
/// 3.)Clicks OK without removing test column
/// The width in this case cannot be applied through user setting as no page load occurs, so storing it here.
export class fixedColumnsWidthOnOkButtonClick {
    public static testWidth: number;
}

export class ResultsGridView extends Grids.GridO<IResultGridViewOptions>{

    public initializeOptions(options: IResultGridViewOptions) {
        options.columns = this._getDefaultColumns(options.target);
        options.gutter = {};
        options.asyncInit = false;
        options.payloadSize = 100;
        options.autoSort = false;
        options.extendViewportBy = options.payloadSize;

        this._viewModel = options.viewModel;
        this._columns = options.columns;
        this._viewModel.onDisplayedDelegate = () => {
            Utils_Core.delay(this, 10, () => {
                super.layout();

                if (Object.keys(this._viewModel.getHierarchicalDataSource()).length === 0 ||
                    this._viewModel.getResultCacheSize() > 0 ||
                    !this._fetchingInProgress) {
                    Performance.getScenarioManager().endScenario(TMUtils.TRAPerfScenarios.Area, TMUtils.TRAPerfScenarios.TestResultsInTestTab_WithResultDetails);
                }
            });
        };

        super.initializeOptions(options);
    }

    public initialize() {
        super.initialize();
        this._fetchingInProgress = false;
        this._disposalManager.addDisposable(this._viewModel.dataSource.subscribe((dataSource: Grids.IGridSource) => {
            this.setDataSource(dataSource.getSource(), dataSource.getExpandStates(), this._getColumns(), this._resultGridSortOrder);
            this._setFirstDataRowAsSelected();
        }));
    }

    //Getter for unit tests
    public getResultIdentifiersNotCached(): IDictionaryStringTo<boolean> {
        return this._resultIdentifiersNotCached;
    }

    //Getter for unit tests
    public getSelectedGroupByOption(): string {
        return this._viewModel.getSelectedGroupBy();
    }

    //Getter for unit tests;
    public getResultsGridPageSize(): number {
        return Common.TestResultConstants.PAGE_SIZE;
    }

    public onSort(sortOrder: Grids.IGridSortOrder[], sortColumns?: Grids.IGridColumn[]) {
        if (sortOrder && sortOrder.length > 0) {
            this._resultGridSortOrder = sortOrder;
            this._viewModel.setSortBy(Common.TestResultConstants.getTestResultPropertiesMap(sortOrder[0].index) + " " + sortOrder[0].order);
            this._viewModel.updateDataSource();

            //persist sort order in user settings
            let userSettings = TestReportViewSettings.getInstance().getViewSettings();
            userSettings.sortOrder = sortOrder;
            UpdateUserSettings.updateUserSpecificSettings(this._viewContext, userSettings);

            //telemetry for sorted column
            TelemetryService.publishEvents(TelemetryService.featureTestTabInBuildSummary_ColumnSorted, {
                "ColumnName": sortOrder[0].index,
                "Order": sortOrder[0].order,
                "Context": this._viewContext
            });
        }
    }

    /// <summary>
    /// Called by Grid0 base class to get the column value for a row and column index
    /// <param name="dataIndex" type="int">The index for the row data in the data source</param>
    /// <param name="columnIndex" type="int">The index of the column's data in the row's data array</param>
    /// <param name="columnOrder" type="int" optional="true">The index of the column in the grid's column array. This is the current visible order of the column</param>
    /// <returns type="any" />
    /// </summary>
    public getColumnValue(dataIndex: number, columnIndex: string, columnOrder?: number): string {
        let data: IResultViewModel;
        let sourceRowData: ResultListVM.IGridItem = this.getRowData(dataIndex);
        
        if (sourceRowData) {
            if (!sourceRowData.isTestCaseItem) {
                if (Utils_String.equals(columnIndex, Common.ColumnIndices.Test)) {
                    return sourceRowData.pivotValue;
                }
                else if (Utils_String.equals(columnIndex, Common.ColumnIndices.Duration)) {
                    return sourceRowData.payload.groupDuration;
                }
            } else if (sourceRowData.isTestCaseItem) {
                let selectedTestResultIdentifier = new TCMOM.TestCaseResultIdentifier(sourceRowData.runId, sourceRowData.resultId);
                data = this._viewModel.getResultFromCache(selectedTestResultIdentifier.toString());
                if (data) {
                    switch (columnIndex) {
                        case Common.ColumnIndices.Test:
                            return data.test;
                        case Common.ColumnIndices.FailingSince:
                            return data.failingSince;
                        case Common.ColumnIndices.FailingBuild:
                        case Common.ColumnIndices.FailingRelease:
                            return data.failingContextName;
                        case Common.ColumnIndices.Duration:
                            return data.duration;
                        case Common.ColumnIndices.DateStarted:
                            return data.dateStarted;
                        case Common.ColumnIndices.DateCompleted:
                            return data.dateCompleted;
                        case Common.ColumnIndices.Owner:
                            return data.owner;
                        case Common.ColumnIndices.EnvironmentName:
                            return data.environmentName;
                    }
                }
            }
        }
        return Utils_String.empty;
    }

    /// <summary>
    /// Called by Grid0 base class to cache the rows above and below the visible view port.
    /// </summary>
    public cacheRows(aboveRange: number[][], visibleRange: number[][], belowRange: number[][]) {
        let itemsNeeded = false;
        //Combined row ids from aboveRange, visibleRange and belowRange from grid source.
        let gridSourceRowIds: number[] = [];

        this._newColumnSelectedForRow = false;
        this._addToSourceRowIds(aboveRange, gridSourceRowIds);
        this._addToSourceRowIds(visibleRange, gridSourceRowIds);
        this._addToSourceRowIds(belowRange, gridSourceRowIds);

        //Clear this dictionary with every call to cacheRows.
        this._resultIdentifiersNotCached = {};

        gridSourceRowIds.forEach((gridSourceRowId) => {
            let gridSourceValue: ResultListVM.IGridItem = this.getRowData(gridSourceRowId);
            if (gridSourceValue.isTestCaseItem) {
                let selectedTestResultIdentifier = new TCMOM.TestCaseResultIdentifier(gridSourceValue.runId, gridSourceValue.resultId).toString();
                if (!this._viewModel.getResultFromCache(selectedTestResultIdentifier) || this._newColumnSelected() || this._newColumnSelectedForRow) {
                    this._resultIdentifiersNotCached[selectedTestResultIdentifier] = true;
                    itemsNeeded = true;
                }
            }
        });

        if (itemsNeeded) {
            //Executes this.fetchResults() after the specified amount of time. Cancels any pending requests with the name 'testResultGridPagination'. 
            this.delayExecute("testResultGridPagination", Common.TestResultConstants.PAGINATION_DELAY, true, () => {
                this.fetchResults();
            });
        }
    }

    public _onColumnResize(column) {
        super._onColumnResize(column);
        let userSettings = TestReportViewSettings.getInstance().getViewSettings(), indexForColumn: number;
        Diag.Debug.assert(userSettings != null);
        switch (column.index) {
            case Common.ColumnIndices.Test:
                if (this._viewContext === CommonBase.ViewContext.Build) {
                    userSettings.testColumnWidthForBuild = Math.round(column.width);
                }
                else if (this._viewContext === CommonBase.ViewContext.Release) {
                    userSettings.testColumnWidthForRelease = Math.round(column.width);
                }
                break;
            case Common.ColumnIndices.FailingSince:
            case Common.ColumnIndices.FailingBuild:
            case Common.ColumnIndices.FailingRelease:
            case Common.ColumnIndices.Duration:
            case Common.ColumnIndices.Owner:
            case Common.ColumnIndices.DateCompleted:
            case Common.ColumnIndices.DateStarted:
            case Common.ColumnIndices.EnvironmentName:
                indexForColumn = this._getColumnIndexInUserSettings(userSettings, column.text);
                userSettings.selectedColumns[indexForColumn].width = Math.round(column.width);
                break;
        }

        UpdateUserSettings.updateUserSpecificSettings(this._viewContext, userSettings);
    }

    public handleCommand(command: string): void {
        Diag.logInfo(Utils_String.format("[CommonView._handleCommand]: command: {0}", command));
        let telemetryFeature: string = null;
        switch (command) {
            case Common.TestResultDetailsCommands.ExpandAll:
                this.expandAll();
                telemetryFeature = TelemetryService.featureTestTabInBuildSummary_ExpandCollapseClicked;
                break;
            case Common.TestResultDetailsCommands.CollapseAll:
                this.collapseAll();
                telemetryFeature = TelemetryService.featureTestTabInBuildSummary_ExpandCollapseClicked;
                break;
            case Common.TestResultDetailsCommands.CreateBug:
                this._createBug();
                telemetryFeature = TelemetryService.featureTestTabInBuildSummary_CreateBugClicked;
                break;
            case Common.TestResultDetailsCommands.AddToExistingBug:
                this._addToExistingBug();
                break;
            default:
                Diag.logWarning(Utils_String.format("[CommonView._handleCommand]: Unsupported command : {0}", command));
                break;
        }

        if (telemetryFeature !== null) {
            TelemetryService.publishEvent(telemetryFeature, TelemetryService.eventClicked, command);
        }
    }

    public handleIndexChanged: (selectedItem: ResultListVM.IGridItem) => void;

    /// <summary>
    /// Handles group by and outcome filter event change.
    /// </summary>
    public handlePivotChanged(command: string, filterType: Common.Filters): void {

        switch (filterType) {
            case Common.Filters.GroupBy:
                this._viewModel.setSelectedGroupBy(Common.TestResultDetailsCommands.mapGroupByCommandToPivot[command]);
                Common.TelemetryWrapperService.publishEvent(this._viewContext, TelemetryService.featureTestTab_GroupByClicked, TelemetryService.dropDownSelected, command);
                break;
            case Common.Filters.Outcome:
                this._viewModel.setSelectedOutcomeFilter(Common.TestResultDetailsCommands.mapFilterByCommandToPivot[command]);
                Common.TelemetryWrapperService.publishEvent(this._viewContext, TelemetryService.featureTestTab_OutcomeFilterClicked, TelemetryService.dropDownSelected, command);
                break;
        }

        if (LicenseAndFeatureFlagUtils.isTestResultsFilterInCICDEnabled() || this._viewModel.isSelectedFilterPivotApplicable()) {
            this._updateResultsGridSource();
        } else {
            if (this.handleIndexChanged) {
                this.handleIndexChanged(null);
            }
        }
    }

    public handleFilterUpdated(filterState: FilterState) {
        // If the filter is not the same as the previously applied state i.e. in case of default filter
        if (!areFilterStatesEqual(filterState, this._viewModel.getSelectedFilterState())) {
            this._viewModel.setSelectedFilterState(filterState);
            this._updateResultsGridSource();
        }
    }

    public selectedIndexChanged(selectedRowIndex: number, selectedDataIndex: number) {
        // Abort any existing scenario. This can happen when user presses the down arrow.
        if (Performance.getScenarioManager().getScenarios(TMUtils.TRAPerfScenarios.Area, TMUtils.TRAPerfScenarios.TestResultsInTestTab_NavigateResultDetails)) {
            Performance.getScenarioManager().abortScenario(TMUtils.TRAPerfScenarios.Area, TMUtils.TRAPerfScenarios.TestResultsInTestTab_NavigateResultDetails);
        }

        Performance.getScenarioManager().startScenario(TMUtils.TRAPerfScenarios.Area, TMUtils.TRAPerfScenarios.TestResultsInTestTab_NavigateResultDetails);

        let showRunDetailsInContext = LicenseAndFeatureFlagUtils.isTriShowTestRunSummaryInContextEnabled();

        let selectedGridItem: ResultListVM.IGridItem = super.getRowData(selectedDataIndex);
        if (!this.histogram) {
            this._initializeHistogram();
        }

        if (selectedGridItem) {
            this.histogram._options.allowInteraction = !selectedGridItem.isTestCaseItem;
        }

        if (this.handleIndexChanged) {
            this.handleIndexChanged(selectedGridItem);
        }
        
        if (selectedGridItem && selectedGridItem.isTestCaseItem) {

            if (showRunDetailsInContext)
            {
                this.selectedRun(null);
            }

            this._viewModel.setSelectedTestCaseResult(selectedGridItem.runId, selectedGridItem.resultId);
            //Telemetry for Single click on the Test rows; Finding whether TestCase row selected or not
            TelemetryService.publishEvents(TelemetryService.featureTestTabInBuildSummary_TestRowVisited, {
                "Clicked": "1",
                "Context": this._viewContext
            });
        } else {

            if (showRunDetailsInContext && (this.getSelectedGroupByOption() === Common.TestResultsGroupPivots.Group_By_Test_Run) && (selectedGridItem))
            {
                this._viewModel.selectedTestCaseResult(null);
                this.selectedRun(parseInt(selectedGridItem.id));
                // For now using same telemetry for clicking run row
                TelemetryService.publishEvent(TelemetryService.featureTestTabInBuildSummary_TestRowVisited, TelemetryService.eventClicked, "1");
            }

            Performance.getScenarioManager().abortScenario(TMUtils.TRAPerfScenarios.Area, TMUtils.TRAPerfScenarios.TestResultsInTestTab_NavigateResultDetails);
        }
    }

    public onRowDoubleClick(eventArgs: any): void {
        this._openDetailsForTestRow(this._getEventData(eventArgs), TelemetryService.featureTestTabInBuildSummary_TestRowDoubleClicked, TelemetryService.eventDoubleClicked);
    }

    public onEnterKey(eventArgs: any): void {
        this._openDetailsForTestRow(this._getEventData(eventArgs), TelemetryService.featureTestTabInBuildSummary_TestRowEnterKeyPressed, TelemetryService.eventKeyPressed);
    }

    public getTestCellContentHyperlink(data: ResultListVM.IGridItem): string {
        let url: string = Utils_String.empty;
        if (data) {
            switch (this.getSelectedGroupByOption()) {
                case Common.TestResultsGroupPivots.Group_By_Test_Run:
                    if (!LicenseAndFeatureFlagUtils.isTriShowTestRunSummaryInContextEnabled())
                    {
                        let runId: number = parseInt(data.id);
                        if (runId > 0) {
                            url = TMUtils.UrlHelper.getRunsUrl("runCharts", [
                                {
                                    parameter: "runId",
                                    value: runId.toString()
                                }
                            ]);
                        }
                    }
                    break;

                case Common.TestResultsGroupPivots.Group_By_Test_Suite:
                    let suiteId: number = parseInt(data.id);
                    if (suiteId > 0) {
                        let suite = data.payload;                        
                        url = TMUtils.UrlHelper.getSuiteUrl(suite.planId, suite.suiteId);
                    }
                    break;

                case Common.TestResultsGroupPivots.Group_By_Requirement:
                    let workItemId: number = parseInt(data.id);
                    if (workItemId > 0) {
                        url = TMUtils.UrlHelper.getWorkItemUrl(workItemId);
                    }
                    break;
            }
        }        
        return url;
    }

    public fetchResults(): void {
        Diag.logInfo("[ResultsGridView.fetchResults] Called");
        let resultIdentifiersToFetch: string[] = [];

        if (!this._fetchingInProgress) {
            $.each(this._resultIdentifiersNotCached, (resultIdentifier) => {
                resultIdentifiersToFetch.push(resultIdentifier);
                //Stop the loop when the resultIdentifiersToFetch exceeds payload size.
                return resultIdentifiersToFetch.length < this.getResultsGridPageSize();
            });

            if (resultIdentifiersToFetch.length > 0) {
                this._fetchingInProgress = true;
                if(Performance.getScenarioManager().getScenarios(TMUtils.TRAPerfScenarios.Area, TMUtils.TRAPerfScenarios.TestResultsInBuild_PagedResultsFetchInGrid)) {
                    Performance.getScenarioManager().abortScenario(TMUtils.TRAPerfScenarios.Area, TMUtils.TRAPerfScenarios.TestResultsInBuild_PagedResultsFetchInGrid);
                }

                Performance.getScenarioManager().startScenario(TMUtils.TRAPerfScenarios.Area, TMUtils.TRAPerfScenarios.TestResultsInBuild_PagedResultsFetchInGrid);

                this._viewModel.getResultsForGrid(resultIdentifiersToFetch)
                    .then((pagedDataFromServer: IResultViewModel[]) => {
                        this._fetchingInProgress = false;
                        this._cacheDataRows(pagedDataFromServer);
                        this.redraw();
                        Diag.logTracePoint("[ResultsGridView.fetchResults]: grid redraw called");
                        Performance.getScenarioManager().endScenario(TMUtils.TRAPerfScenarios.Area, TMUtils.TRAPerfScenarios.TestResultsInBuild_PagedResultsFetchInGrid);
                        Performance.getScenarioManager().endScenario(TMUtils.TRAPerfScenarios.Area, TMUtils.TRAPerfScenarios.TestResultsInBuild_PopulateResultsInGrid);
                        Performance.getScenarioManager().endScenario(TMUtils.TRAPerfScenarios.Area, TMUtils.TRAPerfScenarios.TestResultsInTestTab_WithResultDetails);
                        this.fetchResults();
                    });
            }
        }
    }

    public createEmptyTestCaseResultObject(runId: number, resultId: number, testCaseRefId?: number) {
        let testRun = <Contracts.ShallowReference>{};
        testRun.id = runId.toString();
        let testCase = <Contracts.ShallowReference>{};
        testCase.name = Utils_String.empty;

        let testCaseResult = <Contracts.TestCaseResult>{};
        testCaseResult.testCase = testCase;
        testCaseResult.testRun = testRun;
        testCaseResult.id = resultId;
        testCaseResult.testCaseReferenceId = testCaseRefId || 0;
        return testCaseResult;
    }

    public applySettings(view: CommonBase.ViewContext) {

        this._viewContext = view;
        let viewSettingsInstance = TestReportViewSettings.getInstance();
        let selectedColumns = viewSettingsInstance.getViewSettings().selectedColumns;

        this._newColumns = [];
        this._newColumns.push({
            index: Common.ColumnIndices.Test,
            text: Resources.ResultGridTitle_Test,
            width: (view === CommonBase.ViewContext.Build) ? viewSettingsInstance.getViewSettings().testColumnWidthForBuild : viewSettingsInstance.getViewSettings().testColumnWidthForRelease,
            canSortBy: false,
            canMove: false,
            getCellContents: delegate(this, this._getTestCellContents)
        });

        let column: Grids.IGridColumn = {};
        for (let i = 0, len = selectedColumns.length; i < len; i++) {
            switch (selectedColumns[i].columnName) {
                case Resources.ResultGridHeader_FailingSince:
                        this._newColumns.push({
                            index: Common.ColumnIndices.FailingSince,
                            text: Resources.ResultGridHeader_FailingSince,
                            width: selectedColumns[i].width,
                            canSortBy: false
                        });
                    break;
                case Resources.ResultGridHeader_FailingBuild:
                    if (view === CommonBase.ViewContext.Build) {
                        this._newColumns.push({
                            index: Common.ColumnIndices.FailingBuild,
                            text: Resources.ResultGridHeader_FailingBuild,
                            width: selectedColumns[i].width,
                            canSortBy: false,
                            getCellContents: delegate(this, this._getFailingContextCellContents, view)
                        });
                    }
                    break;
                case Resources.ResultGridHeader_FailingRelease:
                    if (view === CommonBase.ViewContext.Release) {
                        this._newColumns.push({
                            index: Common.ColumnIndices.FailingRelease,
                            text: Resources.ResultGridHeader_FailingRelease,
                            width: selectedColumns[i].width,
                            canSortBy: false,
                            getCellContents: delegate(this, this._getFailingContextCellContents, view)
                        });
                    }
                    break;
                case Resources.ResultGridHeader_Duration:
                    this._newColumns.push({
                        index: Common.ColumnIndices.Duration,
                        text: Resources.ResultGridHeader_Duration,
                        width: selectedColumns[i].width,
                        canSortBy: false
                    });
                    break;
                case Resources.ResultGridHeader_DateStarted:
                    this._newColumns.push({
                        index: Common.ColumnIndices.DateStarted,
                        text: Resources.ResultGridHeader_DateStarted,
                        width: selectedColumns[i].width,
                        canSortBy: false
                    });
                    break;
                case Resources.ResultGridHeader_DateCompleted:
                    this._newColumns.push({
                        index: Common.ColumnIndices.DateCompleted,
                        text: Resources.ResultGridHeader_DateCompleted,
                        width: selectedColumns[i].width,
                        canSortBy: false
                    });
                    break;
                case Resources.ResultGridHeader_Owner:
                    this._newColumns.push({
                        index: Common.ColumnIndices.Owner,
                        text: Resources.ResultGridHeader_Owner,
                        width: selectedColumns[i].width,
                        canSortBy: false
                    });
                    break;

                case Resources.ResultGridHeader_StageName:
                    if (view === CommonBase.ViewContext.Release) {
                        this._newColumns.push({
                            index: Common.ColumnIndices.EnvironmentName,
                            text: Resources.ResultGridHeader_StageName,
                            width: selectedColumns[i].width,
                            canSortBy: false
                        });
                    }
                    break;
            }

            this._resultGridSortOrder = viewSettingsInstance.getViewSettings().sortOrder;
        }
    }

    public setNewColumns(target: Common.TargetPage, columns: Grids.IGridColumn[]): Grids.IGridColumn[] {
        let newColumns: Grids.IGridColumn[] = this._getFixedColumns(target);

        for (let i = 0, len = columns.length; i < len; i++) {
            switch (columns[i].index) {
                case Common.ColumnIndices.FailingSince:
                        columns[i].width = (columns[i].width) ? columns[i].width : 90;
                        columns[i].canSortBy = false;
                        newColumns.push(columns[i]);
                    break;
                case Common.ColumnIndices.FailingBuild:
                    if (target === Common.TargetPage.Build_Summary_Test_Tab) {
                        columns[i].width = (columns[i].width) ? columns[i].width : 90;
                        columns[i].canSortBy = false;
                        columns[i].getCellContents = delegate(this, this._getFailingContextCellContents, CommonBase.ViewContext.Build);
                        newColumns.push(columns[i]);
                    } break;
                case Common.ColumnIndices.FailingRelease:
                    if (target === Common.TargetPage.Release_Summary_Test_Tab) {
                        columns[i].width = (columns[i].width) ? columns[i].width : 100;
                        columns[i].canSortBy = false;
                        columns[i].getCellContents = delegate(this, this._getFailingContextCellContents, CommonBase.ViewContext.Release);
                        newColumns.push(columns[i]);
                    } break;
                case Common.ColumnIndices.Duration:
                    columns[i].width = (columns[i].width) ? columns[i].width : 80;
                    columns[i].canSortBy = false;
                    newColumns.push(columns[i]); break;
                case Common.ColumnIndices.DateStarted:
                    columns[i].width = (columns[i].width) ? columns[i].width : 120;
                    columns[i].canSortBy = true;
                    newColumns.push(columns[i]); break;
                case Common.ColumnIndices.DateCompleted:
                    columns[i].width = (columns[i].width) ? columns[i].width : 120;
                    columns[i].canSortBy = true;
                    newColumns.push(columns[i]); break;
                case Common.ColumnIndices.Owner:
                    columns[i].width = (columns[i].width) ? columns[i].width : 120;
                    columns[i].canSortBy = false;
                    newColumns.push(columns[i]); break;
                case Common.ColumnIndices.EnvironmentName:
                    if (target === Common.TargetPage.Release_Summary_Test_Tab) {
                        columns[i].width = (columns[i].width) ? columns[i].width : 140;
                        columns[i].canSortBy = false;
                        newColumns.push(columns[i]); break;
                    }
            }
        }

        this._newColumns = newColumns;
        return this._newColumns;
    }

    private _initializeHistogram()
    {
        // Histogram section
        let histogramElement: JQuery;
        histogramElement = $(".test-result-histogram");
        
        let histogramOptions: HistogramControl.IHistogramOptions = {
            renderDefaultBars: true,
            barCount: 10,
            barHeight: 37
        };

        this.histogram = <HistogramControl.Histogram>Controls.BaseControl.createIn(HistogramControl.Histogram, histogramElement,
            $.extend({
                cssClass: "test-results-histogram definition-histogram"
            }, histogramOptions));
    }

    private _newColumnSelected(): boolean {
        let newColumnsSelected: boolean = false;
        let selectedColumns = TestReportViewSettings.getInstance().getViewSettings().selectedColumns;
        let savedDefaultColumnsAtPageLoad: string[] = DataProvider.UserSettingsDataProvider.columns;
        for (let i = 0, len = selectedColumns.length; i < len; i++) {
            let j = 0;
            for (let length = savedDefaultColumnsAtPageLoad.length; j < length; j++) {
                if ((Utils_String.equals(savedDefaultColumnsAtPageLoad[j], selectedColumns[i].columnName, true))) {
                    break;
                }
            }
            if (j === savedDefaultColumnsAtPageLoad.length) {
                newColumnsSelected = true;
            }
            if (newColumnsSelected) {
                this._newColumnSelectedForRow = true;
                break;
            }
        }

        DataProvider.UserSettingsDataProvider.columns = [];
        selectedColumns.forEach((column) => {
            DataProvider.UserSettingsDataProvider.columns.push(column.columnName);
        });
        return newColumnsSelected;
    }

    private _getColumnIndexInUserSettings(userSettings: ViewSettings.IUserSettings, text: string): number {
        let selectedColumns: ViewSettings.IColumnByName[] = userSettings.selectedColumns;
        for (let i = 0, len = selectedColumns.length; i < len; i++) {
            if (Utils_String.equals(selectedColumns[i].columnName, text, true)) {
                return i;
            }
        }
    }

    private _getColumns(): Grids.IGridColumn[] {
        return this._newColumns;
    }

    private _updateResultsGridSource(): void {
        this._viewModel.updateDataSource();
    }

    private _addToSourceRowIds(range: number[][], gridSourceRowIds: number[]): void {
        if (range && gridSourceRowIds) {
            for (let i = 0, len = range.length; i < len; i++) {
                gridSourceRowIds.push(range[i][1]);
            }
        }
    }

    private _cacheDataRows(dataRows: IResultViewModel[]) {
        if (dataRows) {
            let testCaseResultIdentifier: string;
            dataRows.forEach((dataRow: IResultViewModel) => {
                testCaseResultIdentifier = new TCMOM.TestCaseResultIdentifier(dataRow.runId, dataRow.resultId).toString();
                this._viewModel.addResultToCache(testCaseResultIdentifier, dataRow);
                delete this._resultIdentifiersNotCached[testCaseResultIdentifier];
            });
        }
    }

    private _setFirstDataRowAsSelected(): void {
        if (this._dataSource.length != 0) {
            if (this.getSelectedGroupByOption() === Common.TestResultsGroupPivots.Group_By_None) {
                this.setSelectedRowIndex(0);
            } else {
                this.setSelectedRowIndex(1);
            }
        }
    }

    private _openDetailsForTestRow(gridItem: ResultListVM.IGridItem, feature?: string, event?: string): void {
        if (gridItem && gridItem.isTestCaseItem) {
            this._openResultsSummaryPage(gridItem);
            TelemetryService.publishEvents(feature, {
                event: 1,
                "Context": this._viewContext
            });
        }
    }

    private _getEventData(eventArgs: any): ResultListVM.IGridItem {
        let data: ResultListVM.IGridItem;
        if (eventArgs && eventArgs.rowInfo) {
            data = super.getRowData(eventArgs.rowInfo.dataIndex);
        }
        return data;
    }

    private _openResultsSummaryPage(result: ResultListVM.IGridItem): void {
        let actionUrl = TMUtils.UrlHelper.getRunsUrl("resultSummary", [
            {
                parameter: "runId",
                value: result.runId.toString()
            },
            {
                parameter: "resultId",
                value: result.resultId.toString()
            }]);
        window.open(actionUrl, "_blank");
    }

    private _getFixedColumns(target: Common.TargetPage): Grids.IGridColumn[] {
        let columns: Grids.IGridColumn[] = [];
        let userSettings: ViewSettings.IUserSettings = TestReportViewSettings.getInstance().getViewSettings();
        Diag.Debug.assert(userSettings != null);

        columns.push({
            index: Common.ColumnIndices.Test,
            text: Resources.ResultGridTitle_Test,
            width: (target === Common.TargetPage.Build_Summary_Test_Tab) ? userSettings.testColumnWidthForBuild : userSettings.testColumnWidthForRelease,
            canMove: false,
            canSortBy: false,
            getCellContents: delegate(this, this._getTestCellContents)
        });

        return columns;
    }

    private _getDefaultColumns(target: Common.TargetPage): Grids.IGridColumn[] {
        let columns: Grids.IGridColumn[] = this._getFixedColumns(target);
        
        columns.push({
            index: Common.ColumnIndices.FailingSince,
            text: Resources.ResultGridHeader_FailingSince,
            width: 90,
            canSortBy: false
        });

        if (target === Common.TargetPage.Build_Summary_Test_Tab) {
            columns.push({
                index: Common.ColumnIndices.FailingBuild,
                text: Resources.ResultGridHeader_FailingBuild,
                width: 90,
                canSortBy: false,
                getCellContents: delegate(this, this._getFailingContextCellContents, CommonBase.ViewContext.Build)
            });
        }
        else if (target === Common.TargetPage.Release_Summary_Test_Tab) {
            columns.push({
                index: Common.ColumnIndices.FailingRelease,
                text: Resources.ResultGridHeader_FailingRelease,
                width: 100,
                canSortBy: false,
                getCellContents: delegate(this, this._getFailingContextCellContents, CommonBase.ViewContext.Release)
            });
        }

        columns.push({
            index: Common.ColumnIndices.Duration,
            text: Resources.QueryColumnNameDuration,
            width: 80,
            canSortBy: false
        });

        return columns;
    }

    private _getTestCellContents(rowInfo: any, dataIndex: number, expandedState: number, level: number, column: any, indentIndex: number, columnOrder: number): JQuery {
        let rowData: ResultListVM.IGridItem = super.getRowData(dataIndex);
        let resultModel: IResultViewModel;
        let url: string;

        if (rowData.isTestCaseItem) {
            let resultIdentifier: string = new TCMOM.TestCaseResultIdentifier(rowData.runId, rowData.resultId).toString();
            resultModel = this._viewModel.getResultFromCache(resultIdentifier);
        }
        else {
            url = this.getTestCellContentHyperlink(rowData);
        }

        let hyperlinkContent: IGetHyperlinkCellContentsForTestRow = {
            rowInfo: rowInfo,
            dataIndex: dataIndex,
            expandedState: expandedState,
            level: level,
            column: column,
            indentIndex: indentIndex,
            columnOrder: columnOrder,
            href: url,
            telemetryFeatureName: Utils_String.empty,
            className: "results-details-link"
        };

        hyperlinkContent.telemetryFeatureName = TelemetryService.featureTestTabInBuildSummary_TestRunTitleClick;
        
        let cell: JQuery = this._getHyperlinkCellContentsForTestRow(hyperlinkContent);

        if (resultModel) {
            if (resultModel.isNewFailure) {
                // Append new failures for result row
                $("<span />").text(Resources.NewFailureIndicator).addClass("new-failure-indicator").appendTo(cell);
            }
            if (resultModel.isNewFailure && resultModel.isUnreliable) {
                // Append separator
                $("<span />").text(Resources.TestIndicatorSeparator).addClass("result-indicator-separator").appendTo(cell);
            }
            if (resultModel.isUnreliable) {
                // Append flaky test indicator for result
                $("<span />").text(Resources.FlakyResultIndicator).addClass("flaky-result-indicator").appendTo(cell);
            }
        }
        
        return cell;
    }

    private _getOutcomeIconElement(rowData: ResultListVM.IGridItem): JQuery {
        let $icon: JQuery = $("<span />").addClass("testresult-outcome-shade bowtie-icon icon");

        if (rowData) {
            if (!rowData.isTestCaseItem) {
                switch (rowData.state) {
                    case Common.GroupState.Passed:
                        $icon.addClass("bowtie-status-success bowtie-icon-small");
                        RichContentTooltip.add(Resources.PassedText, $icon);
                        break;
                    case Common.GroupState.PartiallySucceeded:
                        $icon.addClass("partially-succeeded bowtie-status-warning bowtie-icon-small");
                        RichContentTooltip.add(Resources.PartiallySucceededText, $icon);
                        break;
                    case Common.GroupState.Failed:
                        $icon.addClass("bowtie-status-failure bowtie-icon-small");
                        RichContentTooltip.add(Resources.FailedText, $icon);
                        break;
                    case Common.GroupState.InProgress:
                        $icon.addClass("bowtie-status-run bowtie-icon-small");
                        break;
                }
            }
            else {
                let resultIdentifier: string = new TCMOM.TestCaseResultIdentifier(rowData.runId, rowData.resultId).toString();
                let resultData: IResultViewModel = this._viewModel.getResultFromCache(resultIdentifier);
                if (resultData) { 
                    let iconClassName: string = ValueMap.TestOutcome.getIconClassName(resultData.outcome);
                    if (LicenseAndFeatureFlagUtils.isInProgressFeatureEnabled() && !resultData.outcome) {
                        if (resultData.resultState === TCMConstants.TestResultState.InProgress) {
                            iconClassName = "bowtie-status-run bowtie-icon-small";
                        } else if (!resultData.resultState || resultData.resultState === TCMConstants.TestResultState.Queued || resultData.resultState === TCMConstants.TestResultState.Pending) {
                            iconClassName = "bowtie-status-waiting bowtie-icon-small";
                        }
                    }
                    $icon.addClass(iconClassName);
                    RichContentTooltip.add(ValueMap.TestOutcome.getFriendlyName(resultData.outcome), $icon, { setAriaDescribedBy: true });
                }
            }
        }

        return $icon;
    }

    private _getFailingContextCellContents(rowInfo: any, dataIndex: number, expandedState: number, level: number, column: any, indentIndex: number, columnOrder: number, view: CommonBase.ViewContext) {
        let rowData: ResultListVM.IGridItem = super.getRowData(dataIndex);
        let resultModel: IResultViewModel;

        if (rowData.isTestCaseItem) {
            let resultIdentifier: string = new TCMOM.TestCaseResultIdentifier(rowData.runId, rowData.resultId).toString();
            resultModel = this._viewModel.getResultFromCache(resultIdentifier);
        }

        let actionUrl = Utils_String.empty;

        if (resultModel && resultModel.failingContextId > 0) {
            switch (view) {
                case CommonBase.ViewContext.Build:
                    actionUrl = TMUtils.UrlHelper.getBuildSummaryUrl(resultModel.failingContextId);
                    break;
                case CommonBase.ViewContext.Release:
                    actionUrl = TMUtils.UrlHelper.getReleaseSummaryUrl(resultModel.failingContextId);
                    break;
            }
        }

        let hyperlinkContent: IGetHyperlinkCellContentsForTestRow = {
            rowInfo: rowInfo,
            dataIndex: dataIndex,
            expandedState: expandedState,
            level: level,
            column: column,
            indentIndex: indentIndex,
            columnOrder: columnOrder,
            href: actionUrl,
            telemetryFeatureName: Utils_String.empty,
            className: Utils_String.empty
        };

        switch (view) {
            case CommonBase.ViewContext.Build:
                hyperlinkContent.className = "build-details-link";
                hyperlinkContent.telemetryFeatureName = TelemetryService.featureTestTabInBuildSummary_BuildLinkClicked;
                break;
            case CommonBase.ViewContext.Release:
                hyperlinkContent.className = "release-details-link";
                hyperlinkContent.telemetryFeatureName = TelemetryService.featureTestTabInReleaseSummary_ReleaseLinkClicked;
                break;
        } 

        let cell = this._getHyperlinkCellContentsForTestRow(hyperlinkContent);
        return cell;
    }

    private _getHyperlinkCellContentsForTestRow(data: IGetHyperlinkCellContentsForTestRow): JQuery {
        let content: JQuery;
        let cell: JQuery = super._drawCell(data.rowInfo, data.dataIndex, data.expandedState, data.level, data.column, data.indentIndex, data.columnOrder);
        let cellValue = super.getColumnText(data.dataIndex, data.column, data.columnOrder);

        // 'rowData' can either be an object containing result identifier or a sub-grid in case of hierarchical grid
        let rowData: ResultListVM.IGridItem = super.getRowData(data.dataIndex);
        let model: IResultViewModel;

        if (rowData.isTestCaseItem) {
            let resultIdentifier: string = new TCMOM.TestCaseResultIdentifier(rowData.runId, rowData.resultId).toString();
            model = this._viewModel.getResultFromCache(resultIdentifier);
        }

        if (cell) {
            // 'group' row
            if (data.href) {
                content = $("<a />").text(cellValue).addClass(data.className).attr("href", data.href).attr("target", "_blank").attr("rel", "nofollow noopener noreferrer").attr("tabindex", -1); // Setting tabindex to -1 as the links inside grid should not be tabbable

                let suiteTitle = this._getTitleForGroupBySuite(rowData);
                if (!Utils_String.equals(suiteTitle, Utils_String.empty)) {
                    RichContentTooltip.add(suiteTitle, content, { setAriaDescribedBy: true });
                    data.telemetryFeatureName = TelemetryService.featureTestTabInBuildSummary_TestSuiteTitleClick;
                }

                let requirementTitle = this._getTitleForGroupByRequirement(rowData);
                if (!Utils_String.equals(requirementTitle, Utils_String.empty)) {
                    RichContentTooltip.add(requirementTitle, content, { setAriaDescribedBy: true });
                    data.telemetryFeatureName = TelemetryService.featureTestTabInBuildSummary_RequirementTitleClick;
                }
                
                if ($.trim(data.telemetryFeatureName) !== Utils_String.empty) {
                    content.on("click", () => {
                        TelemetryService.publishEvent(data.telemetryFeatureName, TelemetryService.eventClicked, 1);
                    });
                }
            }
            else {
                // 'result' row
                content = $("<span />").text(cellValue).addClass(data.className);
                if (model) {
                    RichContentTooltip.add(model.testTitle, content, { setAriaDescribedBy: true });
                }
            }

            cell.contents().filter((index: number, elem: Element) => {
                return elem.nodeType === 3;
            }).replaceWith(content);

            if (data.column.index === Common.ColumnIndices.Test) {
                // Add icon only on 'Test' cell
                let $icon: JQuery = this._getOutcomeIconElement(rowData);
                cell.prepend($icon);

                // Add class for text indentation based on level
                let level: number = data.level;
                cell.addClass("testresult-testCell-level" + level);
            }
        }

        return cell;
    }

    private _getTitleForGroupByRequirement(rowData: ResultListVM.IGridItem): string {
        if (this.getSelectedGroupByOption() === Common.TestResultsGroupPivots.Group_By_Requirement && !rowData.isTestCaseItem && parseInt(rowData.id) > 0) {
            let requirement = rowData.payload;
            return Utils_String.format(Resources.WorkItemGroupValueFormat, requirement.name, requirement.id);
        }
        else {
            return Utils_String.empty;
        }
    }

    private _getTitleForGroupBySuite(rowData: ResultListVM.IGridItem): string {
        if (this.getSelectedGroupByOption() === Common.TestResultsGroupPivots.Group_By_Test_Suite && !rowData.isTestCaseItem && parseInt(rowData.id) > 0) {
            let suite = rowData.payload;
            return Utils_String.format(Resources.WorkItemGroupValueFormat, suite.suiteName, suite.suiteId);
        }
        else {
            return Utils_String.empty;
        }
    }

    private _createBug(): void {
        let countOfResultsLinked: number = 0;

        let option: TRACommonControls.IWorkItemOption = {
            save: delegate(this, this._saveBug),
            close: delegate(this, this._closeBug)
        };

        let testResults: Contracts.TestCaseResult[] = this._getTestResultsFromGridData();

        if (testResults.length > 0) {
                //Showing but work item form for only the rows which were clicked 
                TRACommonControls.BugWorkItemHelper.createAndShowWorkItem(null, testResults, option);
                countOfResultsLinked = testResults.length;
        } else {
            //If test result not found then  create default work item
            TRACommonControls.BugWorkItemHelper.createAndShowWorkItem(null, null, option);
        }

        //Publish telemetry data. Counting the number of test results linked to a single bug
        TelemetryService.publishEvent(TelemetryService.featureTestTabInBuildSummary_CreateBugClicked,
            TelemetryService.countOfTestsLinkedToBug, countOfResultsLinked);
    }

    private _addToExistingBug(): void {
        let countOfResultsLinked: number = 0;

        let option: TRACommonControls.IWorkItemOption = {
            save: delegate(this, this._saveBug),
            close: delegate(this, this._closeBug)
        };

        let testResults: Contracts.TestCaseResult[] = this._getTestResultsFromGridData();

        if (testResults.length > 0) {
            TRACommonControls.BugWorkItemHelper.addToExistingBug(testResults, option);
            countOfResultsLinked = testResults.length;
        } else {
            TRACommonControls.BugWorkItemHelper.addToExistingBug([], option);
        }

        //Publish telemetry data. Counting the number of test results linked to a single bug
        TelemetryService.publishEvent(TelemetryService.featureTestTabInBuildSummary_AddBugToExistingClicked,
            TelemetryService.countOfTestsLinkedToBug, countOfResultsLinked);
    }

    private _getTestResultsFromGridData(): Contracts.TestCaseResult[] {
        let indices: number[] = this.getSelectedDataIndices();
        let selectedGridItem: ResultListVM.IGridItem;
        let testResults: Contracts.TestCaseResult[] = [];
        let data: Contracts.TestCaseResult;
        let indexFill: number = 0;

        for (let index in indices) {
            selectedGridItem = this.getRowData(indices[index]);
            //Check if this is a result identifier string.
            if (selectedGridItem && selectedGridItem.isTestCaseItem) {
                data = this._viewModel.getTestCaseResult(selectedGridItem.runId, selectedGridItem.resultId);
                if (data) {
                    testResults[indexFill++] = data;
                } else {
                    testResults[indexFill++] = this.createEmptyTestCaseResultObject(selectedGridItem.runId, selectedGridItem.resultId, selectedGridItem.testCaseRefId);
                }
            }
        }

        return testResults;
    }

    private _saveBug(): void {
        Diag.logInfo("[ResultsGridView._saveBug]: save button clicked on bug form.");
    }

    private _closeBug(): void {
        this._viewModel.selectedTestCaseResult.valueHasMutated();
    }

    public selectedResultViewModel: KnockoutObservable<IResultViewModel> = ko.observable(null);
    public selectedRun: KnockoutObservable<number> = ko.observable(null);
    public histogram: HistogramControl.Histogram;
    private _fetchingInProgress: boolean;
    private _newColumns: Grids.IGridColumn[];
    private _resultIdentifiersNotCached: IDictionaryStringTo<boolean>;
    private _viewModel: ResultListVM.ResultListViewModel;
    private _disposalManager: Utils_Core.DisposalManager = new Utils_Core.DisposalManager();
    private _viewContext: CommonBase.ViewContext;
    private _resultGridSortOrder: Grids.IGridSortOrder[];
    private _newColumnSelectedForRow: boolean = false;
    private _resultDetail: ResultDetailsView.ResultsDetailView;
}

///--------------------- End of Results Grid section ----------------------------///

