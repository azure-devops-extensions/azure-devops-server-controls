import { ODataQueryOptions } from "Analytics/Scripts/OData";
import { FluxFactory } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Common/FluxFactory";
import * as CommonTypes from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Common/Types";
import { DataSourceHelper } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Sources/DataSourceHelper";
import { TestReportSource } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Sources/TestReportSource";
import * as TCMContracts from "TFS/TestManagement/Contracts";
import * as VssContext from "VSS/Context";

export class CardMetricsSource extends TestReportSource {
    constructor() {
        super("TestResultsAnalytics_InContext_CardMetricsReport");
    }

    public static getInstance(): CardMetricsSource {
        return FluxFactory.instance().get(CardMetricsSource);
    }

    public static getKey(): string {
        return "CardMetricsSource";
	}

    public dispose(): void {
    }

    public queryTestOutcomeCountMetricData(testResultContext: TCMContracts.TestResultsContext, confValues: CommonTypes.IReportConfiguration): IPromise<CommonTypes.ICardMetricsData> {
        switch (DataSourceHelper.getPassRateCardDataSourceTable(confValues)) {
            case CommonTypes.DataSourceTable.TestResult:
                return this._queryTestOutcomeCountMetricData_TestResultTable(testResultContext, confValues);
            case CommonTypes.DataSourceTable.TestResultDaily:
                return this._queryTestOutcomeCountMetricData_TestResultDailyTable(testResultContext, confValues);
            case CommonTypes.DataSourceTable.TestRun:
                return this._queryTestOutcomeCountMetricData_TestRunTable(testResultContext, confValues);
        }
    }

    private _queryTestOutcomeCountMetricData_TestResultDailyTable(testResultContext: TCMContracts.TestResultsContext, confValues: CommonTypes.IReportConfiguration): IPromise<CommonTypes.ICardMetricsData> {
        let queryOptions = {
            entityType: this._testResultDailyEntityName,
            project: VssContext.getDefaultWebContext().project.id
        } as ODataQueryOptions;

        const requiredOutcomeFilters: CommonTypes.TestOutcome[] = [CommonTypes.TestOutcome.Failed, CommonTypes.TestOutcome.Passed, CommonTypes.TestOutcome.NotExecuted, CommonTypes.TestOutcome.NotImpacted];
        const outcomeCountStrs = this._getOutcomeCountAggregateAndComputeStrings(requiredOutcomeFilters);

        const filterStr: string = `filter(${this._getTestResultsContextPipelineFilter(testResultContext)} and ${this._getDailyDateFilter(confValues.trendBy, confValues.period)} ${this._getFilterByFieldsString(confValues.configuredFilters)})`;
        
        const aggrStr: string = `aggregate(ResultCount with sum as ResultCount, ${outcomeCountStrs.outcomeAggregationStr})`;
    
        queryOptions.$apply = `${filterStr}/${aggrStr}`;

        return this._queryTestOutcomeCountMetricData(queryOptions, confValues);
    }

    private _queryTestOutcomeCountMetricData_TestResultTable(testResultContext: TCMContracts.TestResultsContext, confValues: CommonTypes.IReportConfiguration): IPromise<CommonTypes.ICardMetricsData> {
        let queryOptions = {
            entityType: this._testResultEntityName,
            project: VssContext.getDefaultWebContext().project.id
        } as ODataQueryOptions;

        this._getTestRunTitlePropertyString = () => { return "TestRun/Title" };

        const filterStr: string = `filter(${this._getTestResultsContextFilter(testResultContext)} and ${this._getDateFilter(confValues.trendBy, confValues.period)} ${this._getFilterByFieldsString(confValues.configuredFilters)})`;

        const aggrStr: string = `aggregate($count as TotalCount, ${this._getOutcomeCountCastedAggregationString(CommonTypes.TestOutcome.Passed)}, ${this._getOutcomeCountCastedAggregationString(CommonTypes.TestOutcome.Failed)}, 
${this._getOutcomeCountCastedAggregationString(CommonTypes.TestOutcome.NotExecuted)}, ${this._getOutcomeCountCastedAggregationString(CommonTypes.TestOutcome.NotImpacted)})`;
        
        queryOptions.$apply = `${filterStr}/${aggrStr}`;

        return this._queryTestOutcomeCountMetricData(queryOptions, confValues);
    }

    private _queryTestOutcomeCountMetricData_TestRunTable(testResultContext: TCMContracts.TestResultsContext, confValues: CommonTypes.IReportConfiguration): IPromise<CommonTypes.ICardMetricsData> {
        let queryOptions = {
            entityType: this._testRunEntityName,
            project: VssContext.getDefaultWebContext().project.id
        } as ODataQueryOptions;

        this._getTestRunTitlePropertyString = () => { return "Title" };

        const filterStr: string = `filter(${this._getTestResultsContextFilter(testResultContext)} and ${this._getDateFilter(confValues.trendBy, confValues.period)} ${this._getFilterByFieldsString(confValues.configuredFilters)})`;

        const aggrStr: string = `aggregate(${this._getTotalCountStringForAggregation()}, ${this._getOutcomeCountStringForAggregation(CommonTypes.TestOutcome.Passed)},
${this._getOutcomeCountStringForAggregation(CommonTypes.TestOutcome.Failed)}, ${this._getOutcomeCountStringForAggregation(CommonTypes.TestOutcome.NotExecuted)}, ${this._getOutcomeCountStringForAggregation(CommonTypes.TestOutcome.NotImpacted)})`;

        queryOptions.$apply = `${filterStr}/${aggrStr}`;

        return this._queryTestOutcomeCountMetricData(queryOptions, confValues);
    }

    private _queryTestOutcomeCountMetricData(queryOptions: ODataQueryOptions, confValues: CommonTypes.IReportConfiguration): IPromise<CommonTypes.ICardMetricsData> {
        
        let entityWiseOutcomeParseFunction: Function = this._getEntityWiseOutcomeCountParseFunction(queryOptions.entityType);
        let entityWiseTotalCountParseFunction: Function = this._getEntityWiseTotalCountParseFunction(queryOptions.entityType);

        return this.queryOData(queryOptions).then((data: CommonTypes.IODataQueryResponse) => {
            if (!data || !data.value) {
                return null;
            }
            let metricsData: CommonTypes.ICardMetricsData = {
                passedCount: 0,
                failedCount: 0,
                notExecutedCount: 0,
                notImpactedCount: 0,
                passPercentage: 0, 
                totalCount: 0,
                confValues: confValues,
                isCachedData: data.isCachedData
            } as CommonTypes.ICardMetricsData;
    
            //Iterate over all data. There should be only item in list as we are fetching aggregates and not group.
            (data.value as any[]).forEach(d => {
                metricsData.totalCount = entityWiseTotalCountParseFunction(d);
                metricsData.notImpactedCount = entityWiseOutcomeParseFunction(CommonTypes.TestOutcome.NotImpacted, d);
                metricsData.passedCount = entityWiseOutcomeParseFunction(CommonTypes.TestOutcome.Passed, d);
                metricsData.failedCount = entityWiseOutcomeParseFunction(CommonTypes.TestOutcome.Failed, d);
                metricsData.notExecutedCount = entityWiseOutcomeParseFunction(CommonTypes.TestOutcome.NotExecuted, d);
    
                metricsData.passPercentage = this._getPassPercentage(metricsData.totalCount, metricsData.passedCount, metricsData.notExecutedCount, metricsData.notImpactedCount);
            });
            return metricsData;
        });
    }

    public queryTotalFailingTestsMetricData(testResultContext: TCMContracts.TestResultsContext, confValues: CommonTypes.IReportConfiguration): IPromise<CommonTypes.ICardMetricsData> {
        switch (DataSourceHelper.getFailingTestCardDataSourceTable(confValues)) {
            case CommonTypes.DataSourceTable.TestResult:
                return this._queryTotalFailingTestsMetricData_TestResultTable(testResultContext, confValues);
            case CommonTypes.DataSourceTable.TestResultDaily:
                return this._queryTotalFailingTestsMetricData_TestResultDailyTable(testResultContext, confValues);
        }
    } 

    private _queryTotalFailingTestsMetricData_TestResultDailyTable(testResultContext: TCMContracts.TestResultsContext, confValues: CommonTypes.IReportConfiguration): IPromise<CommonTypes.ICardMetricsData> {
        let queryOptions = {
            entityType: this._testResultDailyEntityName,
            project: VssContext.getDefaultWebContext().project.id
        } as ODataQueryOptions;

        const filterStr: string = `filter(${this._getTestResultsContextPipelineFilter(testResultContext)} and ${this._getDailyDateFilter(confValues.trendBy, confValues.period)} and ` +
            `${this._getOutcomeCountFilter(CommonTypes.TestOutcome.Failed)} ${this._getFilterByFieldsString(confValues.configuredFilters)})`;        

        return this._queryTotalFailingTestsMetricData(queryOptions, filterStr, confValues);
    }

    private _queryTotalFailingTestsMetricData_TestResultTable(testResultContext: TCMContracts.TestResultsContext, confValues: CommonTypes.IReportConfiguration): IPromise<CommonTypes.ICardMetricsData> {
        let queryOptions = {
            entityType: this._testResultEntityName,
            project: VssContext.getDefaultWebContext().project.id
        } as ODataQueryOptions;

        this._getTestRunTitlePropertyString = () => { return "TestRun/Title" };

        const filterStr: string = `filter(${this._getTestResultsContextFilter(testResultContext)} and ${this._getDateFilter(confValues.trendBy, confValues.period)} and 
${this._getOutcomeFilter(CommonTypes.TestOutcome.Failed)} ${this._getFilterByFieldsString(confValues.configuredFilters)})`;

        return this._queryTotalFailingTestsMetricData(queryOptions, filterStr, confValues);
    }

    private _queryTotalFailingTestsMetricData(queryOptions: ODataQueryOptions, filterStr: string, confValues: CommonTypes.IReportConfiguration): IPromise<CommonTypes.ICardMetricsData> {

        let groupByStr: string = `groupby((${this._isAnalyticsGroupByAndFilterOnTestSKEnabled() ? "TestSK" : "Test/FullyQualifiedTestName"}))`;
        let aggrStr: string = `aggregate($count as TotalFailingTestsCount)`;

        queryOptions.$apply = `${filterStr}/${groupByStr}/${aggrStr}`;

        return this.queryOData(queryOptions).then((data: CommonTypes.IODataQueryResponse) => {
            if (!data || !data.value) {
                return null;
            }

            let metricsData: CommonTypes.ICardMetricsData = { totalFailingTestsCount: 0, confValues: confValues, isCachedData: data.isCachedData } as CommonTypes.ICardMetricsData;

            //Iterate over all data. There should be only item in list as we are fetching aggregates and not group.
            (data.value as any[]).forEach(d => {
                metricsData.totalFailingTestsCount = d.TotalFailingTestsCount as number;
            });

            return metricsData;
        });
    }
}
