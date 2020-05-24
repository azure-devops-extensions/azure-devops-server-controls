import * as Resources from "TestManagement/Scripts/Resources/TFS.Resources.TestManagement";
import { AnnouncementActions } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Actions/AnnouncementActions";
import { ReportActions } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Actions/TestInsights/ReportActions";
import { TrendChartHelper } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Actions/TestInsights/TrendChartHelper";
import { TestAnalyticsConstants } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Common/Constants";
import { FluxFactory } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Common/FluxFactory";
import * as CommonTypes from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Common/Types";
import { Utility } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Common/Utility";
import { ChartsReportSource } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Sources/TestInsights/ChartsReportSource";
import { TestHistoryListSource } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Sources/TestInsights/TestHistoryListSource";
import { TestResultSource } from "TestManagement/Scripts/Scenarios/TestTabExtension/Sources/TestResultSource";
import * as Common from "TestManagement/Scripts/TestReporting/TestTabExtension/Common";
import { TelemetryService } from "TestManagement/Scripts/TFS.TestManagement.Telemetry";
import { TcmPerfScenarios } from "TestManagement/Scripts/TFS.TestManagement.Utils";
import * as TCMContracts from "TFS/TestManagement/Contracts";
import * as Performance from "VSS/Performance";
import * as Utils_String from "VSS/Utils/String";


export class ReportActionsCreator {
    constructor(private _instanceId?: string) {
        this._actions = ReportActions.getInstance(this._instanceId);
        this._announcementActions = AnnouncementActions.getInstance(this._instanceId);
        this._chartsSource = ChartsReportSource.getInstance();
        this._testHistorySource = TestHistoryListSource.getInstance();
        this._testResultSource = TestResultSource.getInstance();
    }

    public static getInstance(instanceId?: string): ReportActionsCreator {
        return FluxFactory.instance().get(ReportActionsCreator, instanceId);
    }

    public static getKey(): string {
        return "ReportActionsCreator";
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
    public getTestHistorySource(): TestHistoryListSource {
        return this._testHistorySource;
    }

    /*
    * Used by tests.
    */
    public getTestResultSource(): TestResultSource {
        return this._testResultSource;
    }

    public beginRenderingTestInsightReport(
        testResultContext: TCMContracts.TestResultsContext, 
        testContext: CommonTypes.ITestContext, 
        confValues: CommonTypes.IReportConfiguration, 
        scenario?: Performance.IScenarioDescriptor): IPromise<void> {

        //Copying all parent configuration values, so that they are populated in test insight conf store.
        this.updateConfigurationValues(confValues);

        //Invoke rendering of trend chart
        let trendChartPromise: IPromise<void> = this.updateTrendChart(testResultContext, testContext, confValues);

        //Invoke rendering test history.
        let testHistoryPromise: IPromise<void> = this.updateTestHistory(testResultContext, testContext, confValues);

        // Telemetry
        return Promise.all([trendChartPromise, testHistoryPromise]).then((result) => {
            // Telemetry
            scenario && scenario.end().then(() => {
                let telemetryData: { [property: string]: string | number; } = {
                    [TestAnalyticsConstants.Duration]: CommonTypes.Period[confValues.period].toString()
                };
                Utility.publishTelemetry(TelemetryService.featureTestAX_TestInsightsReport, testResultContext, confValues, telemetryData, scenario.getTelemetry().elapsedTime);
            });
        }, (error: Error) => {
            this._actions.onError.invoke(error);
            scenario && scenario.abort();
        });
    }

    public updateConfigurationValues(newConfValues: CommonTypes.IReportConfiguration): void {
        //Saving confValues so that it is available when logging telemetry for test debug pane.
        this._confValues = newConfValues;
        this._actions.updateConfigurationValuesAction.invoke(newConfValues);
    }

    public updateTrendChart(testResultContext: TCMContracts.TestResultsContext, testContext: CommonTypes.ITestContext, confValues: CommonTypes.IReportConfiguration): IPromise<void> {
        let trendChartHelper = new TrendChartHelper(confValues);
        let scenario: Performance.IScenarioDescriptor = Performance.getScenarioManager().startScenario(TcmPerfScenarios.Area, TcmPerfScenarios.TestAX_TestTrendChart);
        return this._chartsSource.queryTrendChartData(testResultContext, testContext, confValues).then((chartData: CommonTypes.ITrendChartData) => {
            trendChartHelper.updateChartData(chartData);
            this._actions.updateTrendChartAction.invoke(trendChartHelper);

            this._announcementActions.announceAction.invoke(Utils_String.localeFormat(Resources.TrendChartLoaded, CommonTypes.Metric[CommonTypes.Metric.ResultCount]));
            // Telemetry            
            scenario.end().then(() => {
                let telemetryData: { [property: string]: string | number; } = {
                    [TestAnalyticsConstants.Duration]: CommonTypes.Period[confValues.period].toString(),
                    [TestAnalyticsConstants.IsCached]: String(chartData.isCachedData)
                };
                Utility.publishTelemetry(TelemetryService.featureTestAX_TestTrendChart, testResultContext, confValues, telemetryData, scenario.getTelemetry().elapsedTime);
            });
        }, (error: Error) => {
            this._announcementActions.announceAction.invoke(Resources.AnalyticsErrorMessage);
            this._actions.onError.invoke(error);
            scenario.abort();
        });
    }

    public updateTestHistory(testResultContext: TCMContracts.TestResultsContext, testContext: CommonTypes.ITestContext, confValues: CommonTypes.IReportConfiguration): IPromise<void> {
        let scenario: Performance.IScenarioDescriptor = Performance.getScenarioManager().startScenario(TcmPerfScenarios.Area, TcmPerfScenarios.TestAX_TestHistoryGrid);
        return this._testHistorySource.queryTestHistoryList(testResultContext, testContext, confValues, null).then((testHistoryListData: CommonTypes.ITestHistoryListData) => {
            this._actions.updateTestHistoryListAction.invoke(testHistoryListData);

            this._announcementActions.announceAction.invoke(Utils_String.localeFormat(Resources.TestHistoryListLoaded, testHistoryListData.testHistoryListItems.length));
            // Telemetry
            scenario.end().then(() => {
                let telemetryData: { [property: string]: string | number; } = {
                    [TestAnalyticsConstants.Duration]: CommonTypes.Period[confValues.period].toString(),
                    [TestAnalyticsConstants.Rows]: testHistoryListData.testHistoryListItems.length,
                    [TestAnalyticsConstants.IsCached]: String(testHistoryListData.isCachedData)
                };
                Utility.publishTelemetry(TelemetryService.featureTestAX_TestHistoryGrid, testResultContext, confValues, telemetryData, scenario.getTelemetry().elapsedTime);
            });
        }, (error: Error) => {
            this._announcementActions.announceAction.invoke(Resources.AnalyticsErrorMessage);
            this._actions.onError.invoke(error);
            scenario.abort();
        });
    }

    public showMoreTestHistoryItems(testResultContext: TCMContracts.TestResultsContext, testContext: CommonTypes.ITestContext, confValues: CommonTypes.IReportConfiguration, nextPageToken: CommonTypes.INextDataPageToken): IPromise<void> {
        let scenario: Performance.IScenarioDescriptor = Performance.getScenarioManager().startScenario(TcmPerfScenarios.Area, TcmPerfScenarios.TestAX_TestHistoryGridLoadMore);
        return this._testHistorySource.queryTestHistoryList(testResultContext, testContext, confValues, nextPageToken).then((testHistoryListData: CommonTypes.ITestHistoryListData) => {
            this._actions.appendTestHistoryListAction.invoke(testHistoryListData);

            this._announcementActions.announceAction.invoke(Utils_String.localeFormat(Resources.TestHistoryListShowMore, testHistoryListData.testHistoryListItems.length));
            // Telemetry
            scenario.end().then(() => {
                let telemetryData: { [property: string]: string | number; } = {
                    [TestAnalyticsConstants.Duration]: CommonTypes.Period[confValues.period].toString(),
                    [TestAnalyticsConstants.Rows]: testHistoryListData.testHistoryListItems.length,
                    [TestAnalyticsConstants.IsCached]: String(testHistoryListData.isCachedData)
                };
                Utility.publishTelemetry(TelemetryService.featureTestAX_TestHistoryGridLoadMore, testResultContext, confValues, telemetryData, scenario.getTelemetry().elapsedTime);
            });
        }, (error: Error) => {
            this._announcementActions.announceAction.invoke(Resources.AnalyticsErrorMessage);
            this._actions.onError.invoke(error);
        });
    }

    public openDetailsPanel(item: CommonTypes.ITestHistoryListItem, viewContext: Common.IViewContextData, testResultContext: TCMContracts.TestResultsContext) {
        let testResultIdentifier: CommonTypes.ITestResultIdentifier = item.itemkey as CommonTypes.ITestResultIdentifier;
        this._actions.openDetailsPanelAction.invoke(null);

        let scenario: Performance.IScenarioDescriptor = Performance.getScenarioManager().startScenario(TcmPerfScenarios.Area, TcmPerfScenarios.TestAX_TestDetailsView);
        this._testResultSource.getSelectedTestCaseResult(viewContext, testResultIdentifier.testRunId, testResultIdentifier.testResultId).then(response => {
            this._actions.openDetailsPanelAction.invoke(response);

            // Telemetry
            scenario.end().then(() => {
                let telemetryData: { [property: string]: string | number; } = {
                    [TestAnalyticsConstants.Outcome]: response.outcome
                };
                Utility.publishTelemetry(TelemetryService.featureTestAX_TestDetailsView, testResultContext, this._confValues, telemetryData, scenario.getTelemetry().elapsedTime);
            });
        }, (error: Error) => {
            this._announcementActions.announceAction.invoke(Resources.AnalyticsErrorMessage);
            this._actions.onDetailsPanelError.invoke(error);
            scenario.abort();
        });
    }

    public toggleFilter() {
        this._actions.toggleFilter.invoke(null);
    }

    public closeDetailsPanel() {
        this._actions.closeDetailsPanelAction.invoke(null);
    }
    
    public expandFilterBar(isFilterBarVisible: boolean) {
        this._actions.expandFilterBar.invoke(isFilterBarVisible);
    }

    public dispose(): void {
    }

    private _actions: ReportActions;
    private _announcementActions: AnnouncementActions;
    private _chartsSource: ChartsReportSource;
    private _confValues: CommonTypes.IReportConfiguration;
    private _testHistorySource: TestHistoryListSource;
    private _testResultSource: TestResultSource;
}