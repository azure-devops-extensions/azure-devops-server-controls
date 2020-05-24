import { ODataQueryOptions } from "Analytics/Scripts/OData";
import * as Resources from "TestManagement/Scripts/Resources/TFS.Resources.TestManagement";
import { FluxFactory } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Common/FluxFactory";
import * as CommonTypes from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Common/Types";
import { DataSourceHelper } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Sources/DataSourceHelper";
import { TestReportSource } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Sources/TestReportSource";
import { FilterValueItem } from "TestManagement/Scripts/Scenarios/Common/TestResultsFilter/TestResults.Filtering.Common";
import * as TCMContracts from "TFS/TestManagement/Contracts";
import * as VssContext from "VSS/Context";

export class ChartsReportSource extends TestReportSource {
    constructor() {
        super("TestResultsAnalytics_InContext_TestInsightsChartsReport");
    }

    public static getInstance(): ChartsReportSource {
        return FluxFactory.instance().get(ChartsReportSource);
    }

    public static getKey(): string {
        return "TestInsights.ChartsReportSource";
	}

    public dispose(): void {
    }

    public queryTrendChartData(testResultContext: TCMContracts.TestResultsContext, testContext: CommonTypes.ITestContext, confValues: CommonTypes.IReportConfiguration): IPromise<CommonTypes.ITrendChartData> {
        switch (DataSourceHelper.getTestInsightTrendChartDataSourceTable(confValues)) {
            case CommonTypes.DataSourceTable.TestResult:
                return this._queryTestOutcomeCountTrendDataStackedByTestOutcome_TestResultTable(testResultContext, testContext, confValues);
            case CommonTypes.DataSourceTable.TestResultDaily:
                return this._queryTestOutcomeCountTrendDataStackedByTestOutcome_TestResultDailyTable(testResultContext, testContext, confValues);
        }
    }

    private _queryTestOutcomeCountTrendDataStackedByTestOutcome_TestResultDailyTable(testResultContext: TCMContracts.TestResultsContext, testContext: CommonTypes.ITestContext, confValues: CommonTypes.IReportConfiguration): IPromise<CommonTypes.ITrendChartData> {
        let queryOptions = {
            entityType: this._testResultDailyEntityName,
            project: VssContext.getDefaultWebContext().project.id
        } as ODataQueryOptions;

        //When outcome filter present then remove it as this is not to be applied as filter predicates.
        let filters = Object.assign({}, confValues.configuredFilters);
        delete filters[CommonTypes.Filter.Outcome];

        const outcomeCountStrs = this._getOutcomeCountAggregateAndComputeStrings(confValues.configuredFilters && confValues.configuredFilters[CommonTypes.Filter.Outcome] ?
            confValues.configuredFilters[CommonTypes.Filter.Outcome].values.map((val: FilterValueItem) => Number(val.value)) :
            this._allOutcomes);

        const filterStr: string =
            `filter(${this._getTestResultsContextPipelineFilter(testResultContext)} and ${this._getDailyDateFilter(confValues.trendBy, confValues.period)} and ` +
            ` ${this._getTestContextFilter(testContext.testIdentifier)} ${this._getFilterByFieldsString(filters)})`;
        const groupByStr: string = `groupby((${this._getGroupByDailyPeriodColumnString(confValues.trendBy)}), aggregate(${outcomeCountStrs.outcomeAggregationStr}))`;

        queryOptions.$apply = `${filterStr}/${groupByStr}`;

        return this.queryOData(queryOptions).then((data: CommonTypes.IODataQueryResponse) => {
            if (!data || !data.value) {
                return null;
            }

            let chartData: CommonTypes.ITrendChartData = { primaryChartData: {}, confValues: confValues, metricSelected: CommonTypes.Metric.ResultCount, isCachedData: data.isCachedData };

            //Iterate over all data
            (data.value as any[]).forEach(d => {
                let date = this._parseReturnDailyDateIntoDisplayForm(confValues.trendBy, d);

                //Populate chart data for all outcomes
                this._populateStackedChartData(d.ResultPassCount, Resources.TestOutcome_Passed, date, chartData);
                this._populateStackedChartData(d.ResultFailCount, Resources.TestOutcome_Failed, date, chartData);
                this._populateStackedChartData(d.ResultAbortedCount, Resources.TestOutcome_Aborted, date, chartData);
                this._populateStackedChartData(d.ResultErrorCount, Resources.TestOutcome_Error, date, chartData);
                this._populateStackedChartData(d.ResultInconclusiveCount, Resources.TestOutcome_Inconclusive, date, chartData);
                this._populateStackedChartData(d.ResultNotExecutedCount, Resources.TestOutcome_NotExecuted, date, chartData);
                this._populateStackedChartData(d.ResultNotImpactedCount, Resources.TestOutcome_NotImpacted, date, chartData);                
            });

            return chartData;
        });
    } 

    private _queryTestOutcomeCountTrendDataStackedByTestOutcome_TestResultTable(testResultContext: TCMContracts.TestResultsContext, testContext: CommonTypes.ITestContext, confValues: CommonTypes.IReportConfiguration): IPromise<CommonTypes.ITrendChartData> {
        let queryOptions = {
            entityType: this._testResultEntityName,
            project: VssContext.getDefaultWebContext().project.id
        } as ODataQueryOptions;

        this._getTestRunTitlePropertyString = () => { return "TestRun/Title" };

        const filterStr: string =
            `filter(${this._getTestResultsContextFilter(testResultContext)} and ${this._getDateFilter(confValues.trendBy, confValues.period)} and ${this._getTestContextFilter(testContext.testIdentifier)} ` +
            ` ${this._getFilterByFieldsString(confValues.configuredFilters)})`;
        const groupByStr: string = `groupby((${this._getGroupByTestPropertiesString(CommonTypes.GroupBy.Outcome)}, ${this._getGroupByPeriodColumnString(confValues.trendBy)}), aggregate($count as AggregateValue))`;

        queryOptions.$apply = `${filterStr}/${groupByStr}`;

        return this.queryOData(queryOptions).then((data: CommonTypes.IODataQueryResponse) => {
            if (!data || !data.value) {
                return null;
            }

            let chartData: CommonTypes.ITrendChartData = { primaryChartData: {}, confValues: confValues, metricSelected: CommonTypes.Metric.ResultCount, isCachedData: data.isCachedData };

            //Iterate over all data
            (data.value as any[]).forEach(d => {
                let date = this._parseReturnDateIntoDisplayForm(confValues.trendBy, d);
                let stackByValue = this._parseTestProperties(CommonTypes.GroupBy.Outcome, d).displayValue;

                if (!chartData.primaryChartData[stackByValue]) {
                    chartData.primaryChartData[stackByValue] = [];
                }
                chartData.primaryChartData[stackByValue].push({
                    date: date,
                    aggrValue: d.AggregateValue
                });
            });

            return chartData;
        });
    } 

    private _populateStackedChartData(outcomeCount: number, outcomeName: string, date: string, chartData: CommonTypes.ITrendChartData): void {
        if (outcomeCount) {
            if (!chartData.primaryChartData[outcomeName]) {
                chartData.primaryChartData[outcomeName] = [];
            }
            chartData.primaryChartData[outcomeName].push({
                date: date,
                aggrValue: outcomeCount
            });
        }
    }
}
