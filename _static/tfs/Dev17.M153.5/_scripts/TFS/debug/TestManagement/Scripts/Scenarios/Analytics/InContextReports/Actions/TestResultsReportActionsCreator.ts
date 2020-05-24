import * as Resources from "TestManagement/Scripts/Resources/TFS.Resources.TestManagement";
import { AnnouncementActions } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Actions/AnnouncementActions";
import { TestResultsReportActions } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Actions/TestResultsReportActions";
import { TrendChartHelper } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Actions/TrendChartHelper";
import { TestAnalyticsConstants } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Common/Constants";
import * as Definitions from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Common/Definitions";
import { FluxFactory } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Common/FluxFactory";
import * as CommonTypes from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Common/Types";
import { Utility } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Common/Utility";
import { CardMetricsSource } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Sources/CardMetricsSource";
import { ChartsReportSource } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Sources/ChartsReportSource";
import { DetailedTestListSource } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Sources/DetailedTestListSource";
import { TelemetryService } from "TestManagement/Scripts/TFS.TestManagement.Telemetry";
import { TcmPerfScenarios } from "TestManagement/Scripts/TFS.TestManagement.Utils";
import * as TCMContracts from "TFS/TestManagement/Contracts";
import * as Performance from "VSS/Performance";
import * as Utils_Core from "VSS/Utils/Core";
import * as Utils_String from "VSS/Utils/String";

export class TestResultsReportActionsCreator {

    constructor(private _instanceId?: string) {
        this._actions = TestResultsReportActions.getInstance(this._instanceId);
        this._announcementActions = AnnouncementActions.getInstance(this._instanceId);
        this._cardMetricsSource = CardMetricsSource.getInstance();
        this._chartsSource = ChartsReportSource.getInstance();
        this._detailedTestListSource = DetailedTestListSource.getInstance();
    }

    public static getInstance(instanceId?: string): TestResultsReportActionsCreator {
        return FluxFactory.instance().get(TestResultsReportActionsCreator, instanceId);
    }

    public static getKey(): string {
        return "TestResultsReportActionsCreator";
	}

    /*
    * Used by tests.
    */
    public getCardMetricsSource(): CardMetricsSource {
        return this._cardMetricsSource;
    }

    /*
    * Used by tests.
    */
    public getChartSource(): ChartsReportSource {
        return this._chartsSource;
    }

    /*
    * Used by tests.
    */
    public getDetailedListSource(): DetailedTestListSource {
        return this._detailedTestListSource;
    }

    public beginRenderingTestResultsReport(testResultContext: TCMContracts.TestResultsContext): IPromise<void> {
        let scenario: Performance.IScenarioDescriptor = Performance.getScenarioManager().startScenarioFromNavigation(TcmPerfScenarios.Area, TcmPerfScenarios.TestAX_FailuresReport, true);
        let reportConfDef = new Definitions.ReportConfigurationDefinition();
        this._confValues = reportConfDef.getDefaultConfigurationValues(testResultContext.contextType);

        //Update all report stores with configuration values.
        this.updateReportsWithConfiguration(this._confValues);

        //Invoke rendering card metrics report
        let passRatePromise: IPromise<void> = this.updatePassRateMetrics(testResultContext, this._confValues);

        //Invoke rendering failing tests metrics report
        let failingTestPromise: IPromise<void> = this.updateFailingTestsMetrics(testResultContext, this._confValues);

        //Invoke rendering of each section of report
        let trendChartPromise: IPromise<void> = this.updateTrendChart(testResultContext, this._confValues, reportConfDef.defaultChartMetricValue, CommonTypes.LoadType.PageLoad);

        //Invoke rendering detailed test list
        let detailedListPromise: IPromise<void> = this.updateDetailedTestList(testResultContext, this._confValues, reportConfDef.defaultDetailedTestListSortedColumn);

        Promise.all([passRatePromise, failingTestPromise, trendChartPromise]).then((result) => {
            // Telemetry
            let perfTelemetryData = { 
                [TestAnalyticsConstants.WorkFlow]: testResultContext.contextType === TCMContracts.TestResultsContextType.Build ? TestAnalyticsConstants.Build : TestAnalyticsConstants.Release 
            };
            
            this._populateDataForTelemetry(perfTelemetryData, this._totalTestResultsAnalyzed);

            scenario.addData(perfTelemetryData);
            scenario.end().then(() => {
                let telemetryData: IDictionaryStringTo<string | number> = {
                    [TestAnalyticsConstants.Duration]: CommonTypes.Period[this._confValues.period].toString(),
                    [TestAnalyticsConstants.GroupBy]: CommonTypes.GroupBy[this._confValues.groupBy].toString(),
                    [TestAnalyticsConstants.Outcome]: this._confValues.outcomes.join()
                };
                this._populateDataForTelemetry(telemetryData, this._totalTestResultsAnalyzed);
                Utility.publishTelemetry(TelemetryService.featureTestAX_FailuresReport, testResultContext, this._confValues, telemetryData, scenario.getTelemetry().elapsedTime);
            });
        }, (error) => {
            scenario.abort();
        });

        return Promise.all([passRatePromise, failingTestPromise, trendChartPromise, detailedListPromise]).then(() => {});
    }

    public updateConfigurationValues(newConfValues: CommonTypes.IReportConfiguration): void {
        //Saving confValues so that it is available when logging telemetry for click on test method.
        this._confValues = newConfValues;
        this._actions.updateConfigurationValuesAction.invoke(newConfValues);
    }

    public updateReportsWithConfiguration(newConfValues: CommonTypes.IReportConfiguration): void {
        //This is redundant action as above. We need to see if above can be used instead of this.
        this._actions.updateReportsWithConfigurationAction.invoke(newConfValues);
    }

    public updatePassRateMetrics(testResultContext: TCMContracts.TestResultsContext, newConfValues: CommonTypes.IReportConfiguration): IPromise<void> {
        let scenario: Performance.IScenarioDescriptor = Performance.getScenarioManager().startScenario(TcmPerfScenarios.Area, TcmPerfScenarios.TestAX_PassRateCard);
        //Only way to know how many test results are analyzed in this report is output from this API. This API is expected to be fast among all others and using its totalCount in telemetry.
        this._totalTestResultsAnalyzed = null;
        return this._cardMetricsSource.queryTestOutcomeCountMetricData(testResultContext, newConfValues).then((testOutcomeCountData: CommonTypes.ICardMetricsData) => {

            this._totalTestResultsAnalyzed = testOutcomeCountData.totalCount;

            this._actions.updateTestOutcomeMetricsAction.invoke(testOutcomeCountData);
            
            this._announcementActions.announceAction.invoke(Resources.PassRateMetricsLoaded);

            // Telemetry
            scenario.end().then(() => {
                let telemetryData: IDictionaryStringTo<string | number> = {
                    [TestAnalyticsConstants.Passed]: testOutcomeCountData.passedCount,
                    [TestAnalyticsConstants.Failed]: testOutcomeCountData.failedCount,
                    [TestAnalyticsConstants.NotExecuted]: testOutcomeCountData.notExecutedCount,
                    [TestAnalyticsConstants.IsCached]: String(testOutcomeCountData.isCachedData)
                };
                this._populateDataForTelemetry(telemetryData, this._totalTestResultsAnalyzed);
                Utility.publishTelemetry(TelemetryService.featureTestAX_PassRateCard, testResultContext, newConfValues, telemetryData, scenario.getTelemetry().elapsedTime);
            });
        }, (error: Error) => {
            this._announcementActions.announceAction.invoke(Resources.AnalyticsErrorMessage);
            this._actions.onError.invoke(error);
            scenario.abort();
        });
    }

    public updateFailingTestsMetrics(testResultContext: TCMContracts.TestResultsContext, newConfValues: CommonTypes.IReportConfiguration): IPromise<void> {
        let scenario: Performance.IScenarioDescriptor = Performance.getScenarioManager().startScenario(TcmPerfScenarios.Area, TcmPerfScenarios.TestAX_FailedTestsCard);
        return this._cardMetricsSource.queryTotalFailingTestsMetricData(testResultContext, newConfValues).then((topFailingTestsData: CommonTypes.ICardMetricsData) => {
            this._actions.updateTopFailingTestsMetricAction.invoke(topFailingTestsData);

            this._announcementActions.announceAction.invoke(Resources.FailingTestsMetricsLoaded);

            // Telemetry
            scenario.end().then(() => {
                let telemetryData: IDictionaryStringTo<string | number> = {
                    [TestAnalyticsConstants.FailedTests]: topFailingTestsData.totalFailingTestsCount,
                    [TestAnalyticsConstants.IsCached]: String(topFailingTestsData.isCachedData)
                };
                this._populateDataForTelemetry(telemetryData, this._totalTestResultsAnalyzed);
                Utility.publishTelemetry(TelemetryService.featureTestAX_FailedTestsCard, testResultContext, newConfValues, telemetryData, scenario.getTelemetry().elapsedTime);
            });            
        }, (error) => {
            this._announcementActions.announceAction.invoke(Resources.AnalyticsErrorMessage);
            this._actions.onError.invoke(error);
            scenario.abort();
        });
    }

    public updateTrendChartMetric(metric: CommonTypes.Metric): void {
        this._actions.updateTrendChartMetricAction.invoke(metric);
    }

    public updateTrendChart(testResultContext: TCMContracts.TestResultsContext, confValues: CommonTypes.IReportConfiguration, chartMetric: CommonTypes.Metric, loadType: CommonTypes.LoadType): IPromise<void> {
        let trendChartHelper = new TrendChartHelper(confValues, chartMetric);
        let scenario: Performance.IScenarioDescriptor = Performance.getScenarioManager().startScenario(TcmPerfScenarios.Area, TcmPerfScenarios.TestAX_AggregateTrendChart);
        return this._chartsSource.queryTrendChartData(testResultContext, confValues, chartMetric).then((chartData: CommonTypes.ITrendChartData) => {
            trendChartHelper.updateChartData(chartData);
            this._actions.updateTrendChartAction.invoke(trendChartHelper);

            this._announcementActions.announceAction.invoke(Utils_String.localeFormat(Resources.TrendChartLoaded, CommonTypes.Metric[chartMetric]));

            // Telemetry
            scenario.end().then(() => {
                let filtersApplied: string[] = confValues.configuredFilters ? Object.keys(confValues.configuredFilters) : [];
                let telemetryData: IDictionaryStringTo<string | number> = {
                    [TestAnalyticsConstants.ChartType]: CommonTypes.Metric[chartMetric].toString(),
                    [TestAnalyticsConstants.GroupBy]: CommonTypes.GroupBy[confValues.groupBy].toString(),
                    [TestAnalyticsConstants.Duration]: CommonTypes.Period[confValues.period].toString(),
                    [TestAnalyticsConstants.LoadType]: CommonTypes.LoadType[loadType].toString(),
                    [TestAnalyticsConstants.IsCached]: String(chartData.isCachedData),
                    [TestAnalyticsConstants.Filters]: filtersApplied.length ? filtersApplied.toString() : this._clearFilterString,
                    [TestAnalyticsConstants.FiltersCount]: filtersApplied.length
                };
                this._populateDataForTelemetry(telemetryData, this._totalTestResultsAnalyzed);
                Utility.publishTelemetry(TelemetryService.featureTestAX_AggregateTrendChart, testResultContext, confValues, telemetryData, scenario.getTelemetry().elapsedTime);
            });
        }, (error) => {
            this._announcementActions.announceAction.invoke(Resources.AnalyticsErrorMessage);
            this._actions.onError.invoke(error);
            scenario.abort();
        });
    }

    public updateDetailedTestList(
        testResultContext: TCMContracts.TestResultsContext, 
        confValues: CommonTypes.IReportConfiguration, 
        orderByColumn: CommonTypes.IDetailedListColumn, 
        logTelemetryForFilters?: boolean, 
        isUserAction?: boolean): IPromise<void> {
        
        let scenario = Performance.getScenarioManager().startScenario(
            TcmPerfScenarios.Area, 
            TcmPerfScenarios.TestAX_ResultsGrid, 
            Performance.getTimestamp(), 
            isUserAction);

        let detailedListPromise: IPromise<CommonTypes.IDetailedListData> = this._detailedTestListSource.queryGroupedDetailedList(testResultContext, confValues, orderByColumn, null);

        Utils_Core.delay(null, this.getGridViewLoadTimeout(), (data: any) => {
            this._actions.initializingTestResultsAction.invoke(null);
        });

        return detailedListPromise.then((detailedListData: CommonTypes.IDetailedListData) => {
            this._actions.updateDetailedTestListAction.invoke(detailedListData);

            let groupByConfigurationProps = new Definitions.GroupByConfigurationProps();
            switch (confValues.groupBy) {
                case CommonTypes.GroupBy.None:
                    this._announcementActions.announceAction.invoke(Utils_String.localeFormat(Resources.DetailedTestListLoaded, detailedListData.detailedListItems.length));
                    break;
                default:
                    this._announcementActions.announceAction.invoke(Utils_String.localeFormat(Resources.DetailedTestListLoadedWithGroupBy, groupByConfigurationProps.options[confValues.groupBy], detailedListData.detailedListItems.length));
            }

            let telemetryData = this._createTelemetryForDetailedTestList(
                confValues, orderByColumn, 
                detailedListData.detailedListItems.length, 
                detailedListData.isCachedData, 
                isUserAction);
                
            scenario.addData(telemetryData);

            // Telemetry
            scenario.end().then(() => {
                
                this._populateDataForTelemetry(telemetryData, this._totalTestResultsAnalyzed);
                Utility.publishTelemetry(TelemetryService.featureTestAX_ResultsGrid, testResultContext, confValues, telemetryData, scenario.getTelemetry().elapsedTime);
                
                //Log telemetry for filters if detailed test list updated by changing filters.
                if (logTelemetryForFilters) {
                    this._publishTelemetryForFilters(testResultContext, confValues, detailedListData.detailedListItems.length, scenario.getTelemetry().elapsedTime);
                }
            });            
        }, (error) => {
            this._announcementActions.announceAction.invoke(Resources.AnalyticsErrorMessage);
            this._actions.onError.invoke(error);
            scenario.abort();
        });
    }


    // This is show more method for both plain test list and grouped list.
    public detailedListShowMore(testResultContext: TCMContracts.TestResultsContext, confValues: CommonTypes.IReportConfiguration,
        orderByColumn: CommonTypes.IDetailedListColumn, nextPageToken: CommonTypes.INextDataPageToken): IPromise<void> {
        let scenario: Performance.IScenarioDescriptor = Performance.getScenarioManager().startScenario(TcmPerfScenarios.Area, TcmPerfScenarios.TestAX_ResultsGridLoadMore);
        return this._detailedTestListSource.queryGroupedDetailedList(testResultContext, confValues, orderByColumn, nextPageToken).then((detailedTestListData: CommonTypes.IDetailedListData) => {
            this._actions.detailedListShowMoreAction.invoke(detailedTestListData);

            this._announcementActions.announceAction.invoke(Utils_String.localeFormat(Resources.DetailedListShowMore, detailedTestListData.detailedListItems.length));

            // Telemetry
            scenario.end().then(() => {
                let telemetryData: IDictionaryStringTo<string | number> = this._createTelemetryForDetailedTestList(confValues, orderByColumn, detailedTestListData.detailedListItems.length, detailedTestListData.isCachedData);
                telemetryData[TestAnalyticsConstants.Type] = confValues.groupBy === CommonTypes.GroupBy.None ? TestAnalyticsConstants.Test : TestAnalyticsConstants.Group;                
                this._populateDataForTelemetry(telemetryData, this._totalTestResultsAnalyzed);
                Utility.publishTelemetry(TelemetryService.featureTestAX_ResultsGridLoadMore, testResultContext, confValues, telemetryData, scenario.getTelemetry().elapsedTime);
            });
        }, (error) => {
            //TODO: handle exception. How we need to show exception to user.
        });
    }

    // This is show more method inside a group.
    public detailedListShowMoreInsideGroup(testResultContext: TCMContracts.TestResultsContext, confValues: CommonTypes.IReportConfiguration,
        orderByColumn: CommonTypes.IDetailedListColumn, nextPageToken: CommonTypes.INextDataPageToken, parentItemKey: number | string): IPromise<void> {

        let scenario: Performance.IScenarioDescriptor = Performance.getScenarioManager().startScenario(TcmPerfScenarios.Area, TcmPerfScenarios.TestAX_ResultsGridLoadMore);

        return this._detailedTestListSource.queryDetailedList(testResultContext, confValues, orderByColumn, nextPageToken, parentItemKey).then((detailedListData: CommonTypes.IDetailedListData) => {
            let detailedListGroupData: CommonTypes.IDetailedListGroupData = {
                detailedListGroupItem: {
                    groupItem: { itemkey: parentItemKey } as CommonTypes.IDetailedListItem,
                    children: detailedListData.detailedListItems,
                    nextPageToken: detailedListData.nextPageToken
                } as CommonTypes.IDetailedListGroupItem,
                confValues: detailedListData.confValues,
                isCachedData: detailedListData.isCachedData
            };
            this._actions.detailedListShowMoreInsideGroupAction.invoke(detailedListGroupData);

            this._announcementActions.announceAction.invoke(Utils_String.localeFormat(Resources.DetailedListShowMoreInsideGroup, detailedListGroupData.detailedListGroupItem.children.length, parentItemKey));

            // Telemetry
            scenario.end().then(() => {
                let telemetryData: IDictionaryStringTo<string | number> = this._createTelemetryForDetailedTestList(confValues, orderByColumn, detailedListData.detailedListItems.length, detailedListGroupData.isCachedData);
                telemetryData[TestAnalyticsConstants.Type] = TestAnalyticsConstants.Test;
                this._populateDataForTelemetry(telemetryData, this._totalTestResultsAnalyzed);                
                Utility.publishTelemetry(TelemetryService.featureTestAX_ResultsGridLoadMore, testResultContext, confValues, telemetryData, scenario.getTelemetry().elapsedTime);
            });            
        }, (error) => {
            //TODO: handle exception. How we need to show exception to user.
        });
    }

    public detailedTestListGroupExpanded(testResultContext: TCMContracts.TestResultsContext, confValues: CommonTypes.IReportConfiguration, item: CommonTypes.IDetailedListItem,
        orderByColumn: CommonTypes.IDetailedListColumn): IPromise<void> {
        let scenario: Performance.IScenarioDescriptor = Performance.getScenarioManager().startScenario(TcmPerfScenarios.Area, TcmPerfScenarios.TestAX_ResultsGridElement);
        return this._detailedTestListSource.queryDetailedList(testResultContext, confValues, orderByColumn, null, item.itemkey).then((testsListData: CommonTypes.IDetailedListData) => {
            let detailedListGroupData: CommonTypes.IDetailedListGroupData = {
                detailedListGroupItem: {
                    groupItem: item,
                    children: testsListData.detailedListItems,
                    nextPageToken: testsListData.nextPageToken
                } as CommonTypes.IDetailedListGroupItem,
                confValues: testsListData.confValues
            } as CommonTypes.IDetailedListGroupData;
            this._actions.detailedTestListGroupExpandedAction.invoke(detailedListGroupData);

            this._announcementActions.announceAction.invoke(Utils_String.localeFormat(Resources.DetailedListGroupExpanded, item.itemName, detailedListGroupData.detailedListGroupItem.children.length));

            // Telemetry            
            scenario.end().then(() => {
                let telemetryData: IDictionaryStringTo<string | number> = this._createTelemetryForDetailedTestList(confValues, orderByColumn, testsListData.detailedListItems.length, detailedListGroupData.isCachedData);                
                this._populateDataForTelemetry(telemetryData, this._totalTestResultsAnalyzed);
                Utility.publishTelemetry(TelemetryService.featureTestAX_ResultsGridElement, testResultContext, confValues, telemetryData, scenario.getTelemetry().elapsedTime);
            });            
        }, (error) => {
            //TODO: handle exception. How we need to show exception to user.
            scenario.abort();
        });
    }

    public detailedTestListGroupCollapsed(item: CommonTypes.IDetailedListItem) {
        this._actions.detailedTestListGroupCollapsedAction.invoke(item);
    }

    public detailedTestListColumnOrderChanged(orderedColumn: CommonTypes.IDetailedListColumn) {
        this._actions.detailedTestListColumnOrderChangedAction.invoke(orderedColumn);

        if (orderedColumn.sortOrder === CommonTypes.SortOrder.Descending) {
            this._announcementActions.announceAction.invoke(Utils_String.localeFormat(Resources.DetailedListSortedDesc, CommonTypes.ColumnIndices[orderedColumn.column]));
        }
        else {
            this._announcementActions.announceAction.invoke(Utils_String.localeFormat(Resources.DetailedListSortedAsc, CommonTypes.ColumnIndices[orderedColumn.column]));
        }
    }

    public detailedTestListSortByColumn(testResultContext: TCMContracts.TestResultsContext, confValues: CommonTypes.IReportConfiguration, sortByColumn: CommonTypes.IDetailedListColumn) {
        this._actions.detailedTestListSortByColumnAction.invoke(null);

        //Log telemetry on same feature as fetching list from server.
        let telemetryData: IDictionaryStringTo<string | number> = {
            [TestAnalyticsConstants.SortBy]: CommonTypes.ColumnIndices[sortByColumn.column].toString(),
            [TestAnalyticsConstants.GroupBy]: CommonTypes.GroupBy[confValues.groupBy].toString(),
            [TestAnalyticsConstants.Duration]: CommonTypes.Period[confValues.period].toString()
        };
        this._populateDataForTelemetry(telemetryData, this._totalTestResultsAnalyzed);
        Utility.publishTelemetry(TelemetryService.featureTestAX_ResultsGrid, testResultContext, confValues, telemetryData, 0);
    }

    public detailedTestListExpandGroupAndSortByColumn(testResultContext: TCMContracts.TestResultsContext, confValues: CommonTypes.IReportConfiguration, groupItem: CommonTypes.IDetailedListItem,
        sortByColumn: CommonTypes.IDetailedListColumn) {
        this._actions.detailedTestListExpandGroupAndSortByColumnAction.invoke(groupItem);

        //Log telemetry on same feature as expanding a group and fetching list of tests from server.
        let telemetryData: IDictionaryStringTo<string | number> = {
            [TestAnalyticsConstants.SortBy]: CommonTypes.ColumnIndices[sortByColumn.column].toString(),
            [TestAnalyticsConstants.GroupBy]: CommonTypes.GroupBy[confValues.groupBy].toString(),
            [TestAnalyticsConstants.Duration]: CommonTypes.Period[confValues.period].toString()
        };
        this._populateDataForTelemetry(telemetryData, this._totalTestResultsAnalyzed);
        Utility.publishTelemetry(TelemetryService.featureTestAX_ResultsGridElement, testResultContext, confValues, telemetryData, 0);
    }

    public showTestInsightsView(testContext: CommonTypes.ITestContext, testResultContext: TCMContracts.TestResultsContext) {
        this._actions.showTestInsightsViewAction.invoke(testContext);

        // Telemetry
        Utility.publishTelemetry(TelemetryService.featureTestAX_ViewTest, testResultContext, this._confValues, {}, 0);
    }

    public navigateBackToReportView() {
        this._actions.navigateBackToReportViewAction.invoke(null);
    }

    public toggleFilter() {
        this._actions.toggleFilter.invoke(null);
    }

    /*
    * Used by tests.
    */
    public getGridViewLoadTimeout() {
        return this._timeoutInMilliseconds;
    }

    public dispose(): void {
    }

    private _populateDataForTelemetry(telemetryData: IDictionaryStringTo<string | number>, totalTestResultCount: number) {
        if (totalTestResultCount !== null) {
            telemetryData[TestAnalyticsConstants.TotalTestResults] = totalTestResultCount;
        }
    }

    private _createTelemetryForDetailedTestList(confValues: CommonTypes.IReportConfiguration, orderByColumn: CommonTypes.IDetailedListColumn, testsListLength: number, isCached: boolean, isUserAction?: boolean): IDictionaryStringTo<string | number>{
        let filtersApplied: string[] = confValues.configuredFilters ? Object.keys(confValues.configuredFilters) : [];
        isUserAction = isUserAction || false;
        let telemetryData: IDictionaryStringTo<string | number> = {
            [TestAnalyticsConstants.SortBy]: CommonTypes.ColumnIndices[orderByColumn.column].toString(),
            [TestAnalyticsConstants.GroupBy]: CommonTypes.GroupBy[confValues.groupBy].toString(),
            [TestAnalyticsConstants.Duration]: CommonTypes.Period[confValues.period].toString(),
            [TestAnalyticsConstants.Rows]: testsListLength,
            [TestAnalyticsConstants.IsCached]: String(isCached),
            [TestAnalyticsConstants.Filters]: filtersApplied.length ? filtersApplied.toString() : this._clearFilterString,
            [TestAnalyticsConstants.FiltersCount]: filtersApplied.length,
            [TestAnalyticsConstants.IsUserAction]: String(isUserAction)
        };

        return telemetryData;
    }

    private _publishTelemetryForFilters(testResultContext: TCMContracts.TestResultsContext, confValues: CommonTypes.IReportConfiguration, rowsCount: number, elapsedTime: number){
        let filtersApplied: string[] = Object.keys(confValues.configuredFilters);
        let telemetryData: IDictionaryStringTo<string | number> = {            
            [TestAnalyticsConstants.Filters]: filtersApplied.length ? filtersApplied.toString() : this._clearFilterString,
            [TestAnalyticsConstants.FiltersCount]: filtersApplied.length,
            [TestAnalyticsConstants.Rows]: rowsCount
        };

        Utility.publishTelemetry(TelemetryService.featureTestAX_Filter, testResultContext, confValues, telemetryData, elapsedTime);
    }

    private _actions: TestResultsReportActions;
    private _announcementActions: AnnouncementActions;
    private _cardMetricsSource: CardMetricsSource;
    private _chartsSource: ChartsReportSource;
    private _confValues: CommonTypes.IReportConfiguration;
    private _detailedTestListSource: DetailedTestListSource;
    private _timeoutInMilliseconds: number = 5000;
    private _totalTestResultsAnalyzed: number = null;
    private _clearFilterString = "Clear";
}