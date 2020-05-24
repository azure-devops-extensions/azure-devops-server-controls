import "VSS/LoaderPlugins/Css!TestManagement/Scripts/Scenarios/Analytics/InContextReports/ControllerViews/TestResultsReportView";

import { Fabric } from "OfficeFabric/Fabric";
import * as React from "react";
import * as Resources from "TestManagement/Scripts/Resources/TFS.Resources.TestManagement";
import { ReportActionsCreator } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Actions/TestInsights/ReportActionsCreator";
import { TestResultsReportActionsCreator } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Actions/TestResultsReportActionsCreator";
import { TestAnalyticsConstants } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Common/Constants";
import * as Definitions from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Common/Definitions";
import * as CommonTypes from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Common/Types";
import { Utility } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Common/Utility";
import { AggregateReports } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Components/AggregateReports";
import { AnalyticsUnavailableMessage } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Components/AnalyticsUnavailableMessage";
import { ConfigurationToolbar } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/ControllerViews/ConfigurationToolbar";
import { DetailedTestList } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/ControllerViews/DetailedTestList";
import { ReportView } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/ControllerViews/TestInsights/ReportView";
import { AnnouncementStore } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Stores/AnnouncementStore";
import { ConfigurationToolbarStore } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Stores/ConfigurationToolbarStore";
import { DetailedTestListStore } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Stores/DetailedTestListStore";
import { ChartStore } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Stores/TestInsights/ChartStore";
import { ConfigurationToolbarStore as TestInsightsConfigurationToolbarStore } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Stores/TestInsights/ConfigurationToolbarStore";
import { TestHistoryListStore } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Stores/TestInsights/TestHistoryListStore";
import { TestResultsChartsStore } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Stores/TestResultsChartsStore";
import { ITestResultsReportState, TestResultsReportStore } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Stores/TestResultsReportStore";
import { FilterValueItem } from "TestManagement/Scripts/Scenarios/Common/TestResultsFilter/TestResults.Filtering.Common";
import { TelemetryService } from "TestManagement/Scripts/TFS.TestManagement.Telemetry";
import { TcmPerfScenarios } from "TestManagement/Scripts/TFS.TestManagement.Utils";
import * as TCMContracts from "TFS/TestManagement/Contracts";
import * as ComponentBase from "VSS/Flux/Component";
import { getScenarioManager, getTimestamp } from "VSS/Performance";
import { announce } from "VSS/Utils/Accessibility";
import * as Utils_String from "VSS/Utils/String";


export interface ITestResultsReportViewProps extends CommonTypes.IReportComponentProps {
    testResultContext: TCMContracts.TestResultsContext;
}

export class TestResultsReportView extends ComponentBase.Component<ITestResultsReportViewProps, ITestResultsReportState> {
    constructor() {
        super();

        this._testInsightInstanceIdToReportMap = {};
    }

    public componentWillMount(): void {
        this._reportConfigurationDefinition = new Definitions.ReportConfigurationDefinition();
        this._testInsightsreportConfigurationDefinition = new Definitions.TestInsightsConfigurationDefinition();
        
        this._actioncreator = TestResultsReportActionsCreator.getInstance(this.props.instanceId);

        this._store = TestResultsReportStore.getInstance(this.props.instanceId);
        this._store.addChangedListener(this._onStoreUpdate);

        this._configToolbarStore = ConfigurationToolbarStore.getInstance(this._reportConfigurationDefinition.getDefaultConfigurationValues(this.props.testResultContext.contextType), this.props.instanceId);

        this._chartStore = TestResultsChartsStore.getInstance(this.props.instanceId);
        this._detailedTestListStore = DetailedTestListStore.getInstance(this.props.instanceId);

        this.setState(this._store.getState());

        this._announcementStore = AnnouncementStore.getInstance(this.props.instanceId);
        this._announcementStore.addChangedListener(this._onAnnouncementUpdate);
    }

    public componentWillUnmount(): void {
        this._store.removeChangedListener(this._onStoreUpdate);
    }

    public render(): JSX.Element {
        let areFiltersApplied = Utility.areFiltersApplied(this._configToolbarStore.getState().reportConfigurationValues.configuredFilters)
        return (
            <Fabric className="testresults-analytics-report-fabric" >
                {this.state.viewType === CommonTypes.ViewType.ReportView && !this.state.testContext && <div className={TestResultsReportView._analyticsReportViewClassName}>
                    <ConfigurationToolbar
                        instanceId={this.props.instanceId}
                        onConfigurationChange={this._onConfigurationToolbarChanged}
                        testResultsContext={this.props.testResultContext}
                        onToggleFilter={this._onToggleFilter}
                    />
                    <div className="testresults-analytics-report-view-content">
                        <AggregateReports
                            instanceId={this.props.instanceId}
                            onTrendChartMetricChanged={this._onTrendChartMetricChanged}
                        />

                        <DetailedTestList
                            instanceId={this.props.instanceId}
                            onGroupExpanded={this._onDetailedListGroupExpanded}
                            onGroupCollapsed={this._onDetailedListGroupCollapsed}
                            onItemInvoked={this._onDetailedListItemInvoked}
                            onColumnOrderChanged={this._onDetailedListColumnOrderChanged}
                            onDetailedListShowMore={this._onDetailedListShowMore}
                        />
                    </div>

                </div>}

                {this.state.viewType === CommonTypes.ViewType.TestInsightsReportView && this.state.testContext && <div className={TestResultsReportView._analyticsReportViewClassName}>
                    <ReportView
                        instanceId={Utility.getTestInsightsInstanceId(this.props.instanceId, this.state.testContext, this._configToolbarStore.getState().reportConfigurationValues)}
                        testResultsContext={this.props.testResultContext}
                        testContext={this.state.testContext}
                        onBackNavigation={this._onBackNavigation}
                        expandFilterBar={this._configToolbarStore.getState().isFilterBarVisible}
                    />
                </div>}

                {this.state.viewType === CommonTypes.ViewType.NoTestDataView && <div className={TestResultsReportView._analyticsReportViewClassName}>
                    <ConfigurationToolbar
                        instanceId={this.props.instanceId}
                        onConfigurationChange={this._onConfigurationToolbarChanged}
                        testResultsContext={this.props.testResultContext}
                        onToggleFilter={this._onToggleFilter}
                    />
                    <AnalyticsUnavailableMessage
                        imageName={Definitions.AnalyticsExtension.ImageTestResultsNotFound}
                        message={areFiltersApplied ? Resources.NoResultsMessage : Resources.AnalyticsTestResultsNotFoundMessage}
                        suggestion={areFiltersApplied ? Resources.NoResultsSuggestionMessage : Resources.AnalyticsTestResultsNotFoundSuggestion}
                        cssClass={TestResultsReportView._analyticsUnavailableMessageClassName}
                    />
                    {Utility.publishTelemetryForGettingStarted(TelemetryService.featureTestAX_NoTestResults, TestAnalyticsConstants.TestFailures, this.props.testResultContext)}
                </div>}

                {this.state.viewType === CommonTypes.ViewType.DataNotReadyView && <div className={TestResultsReportView._analyticsReportViewClassName}>
                    <AnalyticsUnavailableMessage
                        imageName={Definitions.AnalyticsExtension.ImageDataNotReady}
                        message={Resources.AnalyticsDataNotReadyMessage}
                        suggestion={Resources.AnalyticsDataNotReadySuggestion}
                        cssClass={TestResultsReportView._analyticsUnavailableMessageClassName}
                    />
                </div>}

                {this.state.viewType === CommonTypes.ViewType.ErrorView && <div className={TestResultsReportView._analyticsReportViewClassName}>
                    <AnalyticsUnavailableMessage
                        imageName={Definitions.AnalyticsExtension.ImageServiceError}
                        message={Resources.AnalyticsErrorMessage}
                        suggestion={this.state.errorText}
                        cssClass={TestResultsReportView._analyticsUnavailableMessageClassName}
                    />
                </div>}
            </Fabric>
        );
    }

    private _onConfigurationToolbarChanged = (changedConfValues: CommonTypes.IReportConfiguration, logTelemetryForFilters?: boolean) => {
        this._actioncreator.updateConfigurationValues(changedConfValues);

        let newConfValues = this._configToolbarStore.getState().reportConfigurationValues;
        
        //Communicate to testresult chart and detailed list that config has changed
        this._actioncreator.updateReportsWithConfiguration(newConfValues);

        //Invoke rendering card metrics report
        this._actioncreator.updatePassRateMetrics(this.props.testResultContext, newConfValues);

        //Invoke rendering card metrics report
        this._actioncreator.updateFailingTestsMetrics(this.props.testResultContext, newConfValues);

        //Initiate call to fetch data to populate appropriate report. 
        let selectedMetric = this._chartStore.getState().metricSelected;
        this._actioncreator.updateTrendChart(this.props.testResultContext, newConfValues, selectedMetric, CommonTypes.LoadType.ReportConfigurationChange);

        //Invoke rendering detailed test list
        this._actioncreator.updateDetailedTestList(this.props.testResultContext, newConfValues, this._detailedTestListStore.getState().sortedColumn, logTelemetryForFilters, true);
    }

    private _onTrendChartMetricChanged = (chartMetric: CommonTypes.Metric): void => {
        let configurationValues = this._configToolbarStore.getState().reportConfigurationValues;
        this._actioncreator.updateTrendChartMetric(chartMetric);
        this._actioncreator.updateTrendChart(this.props.testResultContext, configurationValues, chartMetric, CommonTypes.LoadType.ChartMetricChange);
    }

    private _onDetailedListGroupExpanded = (groupItem: CommonTypes.IDetailedListItem) => {
        let confValues = this._configToolbarStore.getState().reportConfigurationValues;

        if (this._detailedTestListStore.isListCompletelyFetched(groupItem.itemkey)) {
            //If list is completely fetched within group then sort can be done in-place rather making server call.
            this._actioncreator.detailedTestListExpandGroupAndSortByColumn(this.props.testResultContext, confValues, groupItem, this._detailedTestListStore.getState().sortedColumn);
        }
        else {
            this._actioncreator.detailedTestListGroupExpanded(this.props.testResultContext, confValues, groupItem, this._detailedTestListStore.getState().sortedColumn);
        }
    }

    private _onDetailedListGroupCollapsed = (groupItem: CommonTypes.IDetailedListItem) => {
        this._actioncreator.detailedTestListGroupCollapsed(groupItem);
    }

    private _onDetailedListItemInvoked = (item: CommonTypes.IDetailedListItem) => {
        let testContext = this._detailedTestListStore.getTestContext(item);
        if (testContext) {
            let scenario = getScenarioManager().startScenario(TcmPerfScenarios.Area, TcmPerfScenarios.TestAX_TestInsightsReport, getTimestamp(), true);
            this._actioncreator.showTestInsightsView(testContext, this.props.testResultContext);

            let confValues: CommonTypes.IReportConfiguration = this._configToolbarStore.getState().reportConfigurationValues;
            let testInsightInstanceId: string = Utility.getTestInsightsInstanceId(this.props.instanceId, testContext, confValues);

            if (!this._testInsightInstanceIdToReportMap[testInsightInstanceId]) {           //Avoid re-rendering report for same test if once already fetched.
                this._testInsightInstanceIdToReportMap[testInsightInstanceId] = true;
                this._initializeTestInsightsStore(testInsightInstanceId);

                //Take period and configured filters information to test insight page.
                const testInsightConfValues = this._testInsightsreportConfigurationDefinition.defaultConfigurationValues(this.props.testResultContext.contextType);
                testInsightConfValues.period = confValues.period;

                testInsightConfValues.configuredFilters = {};
                                
                Definitions.CommonFilters.filtersCommonWithTestInsights.forEach(filter => {
                    if (confValues.configuredFilters[filter] && 
                        confValues.configuredFilters[filter].values &&
                        confValues.configuredFilters[filter].values.length > 0
                    ) {
                        testInsightConfValues.configuredFilters[filter] = {
                            values: confValues.configuredFilters[filter].values.map((val: FilterValueItem) => new FilterValueItem(val.value, val.displayValue))
                        }
                    }
                });
                
                ReportActionsCreator.getInstance(testInsightInstanceId).beginRenderingTestInsightReport(this.props.testResultContext, testContext, testInsightConfValues, scenario);
            }
            else {
                scenario.end();
            }

            // Announce to the user which test method was selected
            announce(Utils_String.localeFormat(Resources.AnnounceTestMethodSelected, testContext.testName), true);
        }
    }

    private _onDetailedListColumnOrderChanged = (orderedColumn: CommonTypes.IDetailedListColumn) => {
        //Invoke action to broadcast column changed.
        this._actioncreator.detailedTestListColumnOrderChanged(orderedColumn);

        let confValues = this._configToolbarStore.getState().reportConfigurationValues;
        if (this._detailedTestListStore.isListCompletelyFetched()) {
            this._actioncreator.detailedTestListSortByColumn(this.props.testResultContext, confValues, orderedColumn);
        }
        else {
            //Invoke action to start fetching new data for list ordered by this ordered column.
            this._actioncreator.updateDetailedTestList(this.props.testResultContext, confValues, orderedColumn);
        }
    }

    private _onDetailedListShowMore = (item: CommonTypes.IDetailedListItem) => {
        let confValues = this._configToolbarStore.getState().reportConfigurationValues;
        if (item.depth) {      /* For items inside group */
            this._actioncreator.detailedListShowMoreInsideGroup(this.props.testResultContext, confValues, this._detailedTestListStore.getState().sortedColumn,
                this._detailedTestListStore.getNextPageToken(item.parentItemKey), item.parentItemKey);
        } else {
            this._actioncreator.detailedListShowMore(this.props.testResultContext, confValues, this._detailedTestListStore.getState().sortedColumn,
                this._detailedTestListStore.getNextPageToken(item.parentItemKey));
        }        
    }

    private _onBackNavigation = () => {
        //When re-rendering main view report, test insight report components will get unmounted so we dont need explicit unmount here.
        this._actioncreator.navigateBackToReportView();
    }

    private _initializeTestInsightsStore(testInsightInstanceId: string): void {
        // Initialization of stores is required because action to populate test insights stores
        // (by beginRenderingTestInsightReport method) is raised before stores are initialzed by TestInsights component rendering.
        TestInsightsConfigurationToolbarStore.getInstance(this._testInsightsreportConfigurationDefinition.defaultConfigurationValues(this.props.testResultContext.contextType), testInsightInstanceId);
        ChartStore.getInstance(testInsightInstanceId);
        TestHistoryListStore.getInstance(testInsightInstanceId);
    }

    private _onToggleFilter = () => {
        this._actioncreator.toggleFilter();
    }

    private _onStoreUpdate = () => {
        this.setState(this._store.getState());
    }

    private _onAnnouncementUpdate = () => {
        announce(this._announcementStore.getState().announcementText);
    }

    private _actioncreator: TestResultsReportActionsCreator;
    private _announcementStore: AnnouncementStore;
    private _configToolbarStore: ConfigurationToolbarStore;
    private _chartStore: TestResultsChartsStore;
    private _detailedTestListStore: DetailedTestListStore;
    private _store: TestResultsReportStore;
    private _testInsightInstanceIdToReportMap: IDictionaryStringTo<boolean>;
    private _reportConfigurationDefinition: Definitions.ReportConfigurationDefinition;
    private _testInsightsreportConfigurationDefinition: Definitions.TestInsightsConfigurationDefinition;

    private static readonly _analyticsReportViewClassName: string = "testresults-analytics-report-view";
    private static readonly _analyticsUnavailableMessageClassName: string = "testresults-notfound-message-div";
}