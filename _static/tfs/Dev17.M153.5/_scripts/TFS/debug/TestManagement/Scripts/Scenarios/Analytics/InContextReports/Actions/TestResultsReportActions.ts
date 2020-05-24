import { TrendChartHelper } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Actions/TrendChartHelper";
import { FluxFactory } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Common/FluxFactory";
import * as CommonTypes from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Common/Types";
import { Action } from "VSS/Flux/Action";


export class TestResultsReportActions {
    constructor() {
        this._updateConfigurationValuesAction = new Action<CommonTypes.IReportConfiguration>();
        this._updateReportsWithConfigurationAction = new Action<CommonTypes.IReportConfiguration>();
        this._updateTestOutcomeMetricsAction = new Action<CommonTypes.ICardMetricsData>();
        this._updateTopFailingTestsMetricAction = new Action<CommonTypes.ICardMetricsData>();
        this._updateTrendChartMetricAction = new Action<CommonTypes.Metric>();
        this._updateTrendChartAction = new Action<TrendChartHelper>();
        this._updateDetailedTestListAction = new Action<CommonTypes.IDetailedListData>();
        this._detailedTestListGroupExpandedAction = new Action<CommonTypes.IDetailedListGroupData>();
        this._detailedTestListGroupCollapsedAction = new Action<CommonTypes.IDetailedListItem>();
        this._detailedTestListColumnOrderChangedAction = new Action<CommonTypes.IDetailedListColumn>();
        this._detailedTestListSortByColumnAction = new Action<void>();
        this._detailedTestListExpandGroupAndSortByColumnAction = new Action<CommonTypes.IDetailedListItem>();
        this._detailedListShowMoreAction = new Action<CommonTypes.IDetailedListData>();
        this._detailedListShowMoreInsideGroupAction = new Action<CommonTypes.IDetailedListGroupData>();
        this._showTestInsightsViewInvoked = new Action<CommonTypes.ITestContext>();
        this._navigateBackToReportViewClicked = new Action<void>();
        this._initializingTestResultsAction = new Action<void>();
        this._toggleFilterAction = new Action<void>();
        this._onError = new Action<Error>();
    }

    public static getInstance(instanceId?: string): TestResultsReportActions {
        return FluxFactory.instance().get(TestResultsReportActions, instanceId);
    }

    public static getKey(): string {
        return "TestResultsReportActions";
	}

    /**
     * Configuration toolbar change is carried on this action
     */
    public get updateConfigurationValuesAction(): Action<CommonTypes.IReportConfiguration> {
        return this._updateConfigurationValuesAction;
    }

    /**
     * Notify reports and detailed list that configuration changed so report needs to be updated.
     */
    public get updateReportsWithConfigurationAction(): Action<CommonTypes.IReportConfiguration> {
        return this._updateReportsWithConfigurationAction;
    }

    /**
     * Update test outcome count metric with aggregate data.
     */
    public get updateTestOutcomeMetricsAction(): Action<CommonTypes.ICardMetricsData> {
        return this._updateTestOutcomeMetricsAction;
    }

    /**
     * Update card metrics with aggregate data.
     */
    public get updateTopFailingTestsMetricAction(): Action<CommonTypes.ICardMetricsData> {
        return this._updateTopFailingTestsMetricAction;
    }

    /**
     * Trend chart metric changed so this action will notify stores.
     */
    public get updateTrendChartMetricAction(): Action<CommonTypes.Metric> {
        return this._updateTrendChartMetricAction;
    }

    /**
     * Action that carries chart data to store.
     */
    public get updateTrendChartAction(): Action<TrendChartHelper> {
        return this._updateTrendChartAction;
    }

    /**
     * Action that carries detailed list items to store
     */
    public get updateDetailedTestListAction(): Action<CommonTypes.IDetailedListData> {
        return this._updateDetailedTestListAction;
    }

    /**
     * Action that notify that a group is expanded and carries expanded data to store
     */
    public get detailedTestListGroupExpandedAction(): Action<CommonTypes.IDetailedListGroupData> {
        return this._detailedTestListGroupExpandedAction;
    }

    /**
     * Action that notify a group is collapsed.
     */
    public get detailedTestListGroupCollapsedAction(): Action<CommonTypes.IDetailedListItem> {
        return this._detailedTestListGroupCollapsedAction;
    }  

    /**
     * Action that notify a column order is changed.
     */
    public get detailedTestListColumnOrderChangedAction(): Action<CommonTypes.IDetailedListColumn> {
        return this._detailedTestListColumnOrderChangedAction;
    }

    /**
     * Action that notify the store to re-arrange list sorted by a column.
     */
    public get detailedTestListSortByColumnAction(): Action<void> {
        return this._detailedTestListSortByColumnAction;
    }

    /**
     * Action that notify the store to expand a group and sort it's childrens by a column.
     */
    public get detailedTestListExpandGroupAndSortByColumnAction(): Action<CommonTypes.IDetailedListItem> {
        return this._detailedTestListExpandGroupAndSortByColumnAction;
    }


    /**
     * Action that passes data when 'Show more' is clicked for outer list.
     */
    public get detailedListShowMoreAction(): Action<CommonTypes.IDetailedListData> {
        return this._detailedListShowMoreAction;
    }

    /**
     * Action that passes data when 'Show more' is clicked for test list in a group.
     */
    public get detailedListShowMoreInsideGroupAction(): Action<CommonTypes.IDetailedListGroupData> {
        return this._detailedListShowMoreInsideGroupAction;
    }
    
    /**
     * Action that notify a test case item is invoked.
     */
    public get showTestInsightsViewAction(): Action<CommonTypes.ITestContext> {
        return this._showTestInsightsViewInvoked;
    }

    /**
     * Action that notify navigate back to report view is clicked.
     */
    public get navigateBackToReportViewAction(): Action<void> {
        return this._navigateBackToReportViewClicked;
    }

    /**
     * Action that notify to display Initializing Test Results Action
     */
    public get initializingTestResultsAction(): Action<void> {
        return this._initializingTestResultsAction;
    }

    /**
     * Action that notify to toggle the visibility of filters.
     */
    public get toggleFilter(): Action<void> {
        return this._toggleFilterAction;
    }

    /**
     * Action that notifies error during test outcome metrics fetch
     */
    public get onError(): Action<Error> {
        return this._onError;
    }

    public dispose(): void {
    }

    private _updateConfigurationValuesAction: Action<CommonTypes.IReportConfiguration>;
    private _updateReportsWithConfigurationAction: Action<CommonTypes.IReportConfiguration>;
    private _updateTestOutcomeMetricsAction: Action<CommonTypes.ICardMetricsData>;
    private _updateTopFailingTestsMetricAction: Action<CommonTypes.ICardMetricsData>;
    private _updateTrendChartMetricAction: Action<CommonTypes.Metric>;
    private _updateTrendChartAction: Action<TrendChartHelper>;
    private _updateDetailedTestListAction: Action<CommonTypes.IDetailedListData>;
    private _detailedTestListGroupExpandedAction: Action<CommonTypes.IDetailedListGroupData>;
    private _detailedTestListGroupCollapsedAction: Action<CommonTypes.IDetailedListItem>;
    private _detailedTestListColumnOrderChangedAction: Action<CommonTypes.IDetailedListColumn>;
    private _detailedTestListSortByColumnAction: Action<void>;
    private _detailedTestListExpandGroupAndSortByColumnAction: Action<CommonTypes.IDetailedListItem>;
    private _detailedListShowMoreAction: Action<CommonTypes.IDetailedListData>;
    private _detailedListShowMoreInsideGroupAction: Action<CommonTypes.IDetailedListGroupData>;
    private _showTestInsightsViewInvoked: Action<CommonTypes.ITestContext>;
    private _navigateBackToReportViewClicked: Action<void>;
    private _initializingTestResultsAction: Action<void>;
    private _toggleFilterAction: Action<void>;
    private _onError: Action<Error>;
}