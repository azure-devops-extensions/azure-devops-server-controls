import { ODataQueryOptions } from "Analytics/Scripts/OData";
import * as Resources from "TestManagement/Scripts/Resources/TFS.Resources.TestManagement";
import { TrendChartOptions } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Common/Definitions";
import { FluxFactory } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Common/FluxFactory";
import * as CommonTypes from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Common/Types";
import { DataSourceHelper } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Sources/DataSourceHelper";
import { TestReportSource } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Sources/TestReportSource";
import * as TCMContracts from "TFS/TestManagement/Contracts";
import * as VssContext from "VSS/Context";
import * as Utils_Array from "VSS/Utils/Array";
import * as Utils_String from "VSS/Utils/String";

export class ChartsReportSource extends TestReportSource {
    constructor() {
        super("TestResultsAnalytics_InContext_ChartsReport");
    }
    
    public static getInstance(): ChartsReportSource {
        return FluxFactory.instance().get(ChartsReportSource);
    }

    public static getKey(): string {
        return "ChartsReportSource";
	}

    public dispose(): void {
    }

    public queryTrendChartData(testResultContext: TCMContracts.TestResultsContext, confValues: CommonTypes.IReportConfiguration, chartMetric: CommonTypes.Metric): IPromise<CommonTypes.ITrendChartData> {

        switch (chartMetric) {
            case CommonTypes.Metric.ResultCountAndPassRate:
                switch (DataSourceHelper.getTrendChartDataSourceTable(confValues)) {
                    case CommonTypes.DataSourceTable.TestResult:
                        return this._queryTestOutcomeCountAndPassRateTrendData_TestResultTable(testResultContext, confValues);
                    case CommonTypes.DataSourceTable.TestResultDaily:
                        return this._queryTestOutcomeCountAndPassRateTrendData_TestResultDailyTable(testResultContext, confValues);
                    case CommonTypes.DataSourceTable.TestRun:
                        return this._queryTestOutcomeCountAndPassRateTrendData_TestRunTable(testResultContext, confValues);
                }
                break;
            case CommonTypes.Metric.ResultCount:
                //TODO (akgup): Combine APIs for all groupBy into one.
                switch (confValues.groupBy) {
                    case CommonTypes.GroupBy.None:
                        switch (DataSourceHelper.getTrendChartDataSourceTable(confValues)) {
                            case CommonTypes.DataSourceTable.TestResult:
                                return this._queryTestOutcomeCountTrendData_TestResultTable(testResultContext, confValues);
                            case CommonTypes.DataSourceTable.TestResultDaily:
                                return this._queryTestOutcomeCountTrendData_TestResultDailyTable(testResultContext, confValues);
                            case CommonTypes.DataSourceTable.TestRun:
                                return this._queryTestOutcomeCountTrendData_TestRunTable(testResultContext, confValues);
                        }
                    default:
                        switch (DataSourceHelper.getTrendChartDataSourceTable(confValues)) {
                            case CommonTypes.DataSourceTable.TestResult:
                                return this._queryTestOutcomeCountStackedTrendData_TestResultTable(testResultContext, confValues);
                            case CommonTypes.DataSourceTable.TestResultDaily:
                                return this._queryTestOutcomeCountStackedTrendData_TestResultDailyTable(testResultContext, confValues);
                            case CommonTypes.DataSourceTable.TestRun:
                                return this._queryTestOutcomeCountStackedTrendData_TestRunTable(testResultContext, confValues);
                        }
                }
                break;
            case CommonTypes.Metric.AvgDuration:
                //TODO (akgup): Combine APIs for all groupBy into one.
                switch (confValues.groupBy) {
                    case CommonTypes.GroupBy.None:
                        switch (DataSourceHelper.getTrendChartDataSourceTable(confValues)) {
                            case CommonTypes.DataSourceTable.TestResult:
                                return this._queryTestDurationTrendData_TestResultTable(testResultContext, confValues);
                            case CommonTypes.DataSourceTable.TestResultDaily:
                                return this._queryTestDurationTrendData_TestResultDailyTable(testResultContext, confValues);
                            case CommonTypes.DataSourceTable.TestRun:
                                return this._queryTestDurationTrendData_TestRunTable(testResultContext, confValues);
                        }
                    default:
                        switch (DataSourceHelper.getTrendChartDataSourceTable(confValues)) {
                            case CommonTypes.DataSourceTable.TestResult:
                                return this._queryTestDurationStackedTrendData_TestResultTable(testResultContext, confValues);
                            case CommonTypes.DataSourceTable.TestResultDaily:
                                return this._queryTestDurationStackedTrendData_TestResultDailyTable(testResultContext, confValues);
                            case CommonTypes.DataSourceTable.TestRun:
                                return this._queryTestDurationStackedTrendData_TestRunTable(testResultContext, confValues);
                        }
                }
                break;
        }
        
        return null;
    }

    private _queryTestOutcomeCountAndPassRateTrendData_TestRunTable(testResultContext: TCMContracts.TestResultsContext, confValues: CommonTypes.IReportConfiguration): IPromise<CommonTypes.ITrendChartData> {
        let queryOptions = {
            entityType: this._testRunEntityName,
            project: VssContext.getDefaultWebContext().project.id
        } as ODataQueryOptions;

        this._getTestRunTitlePropertyString = () => { return "Title" };

        const filterStr: string = `filter(${this._getTestResultsContextFilter(testResultContext)} and ${this._getDateFilter(confValues.trendBy, confValues.period)} ${this._getFilterByFieldsString(confValues.configuredFilters)})`;

        let outcomeAggrStr: string =
            `${this._getOutcomeCountStringForAggregation(CommonTypes.TestOutcome.Passed)}, ${this._getOutcomeCountStringForAggregation(CommonTypes.TestOutcome.NotExecuted)}, ${this._getTotalCountStringForAggregation()}, 
${this._getOutcomeCountStringForAggregation(CommonTypes.TestOutcome.NotImpacted)}`;

        confValues.outcomes.forEach(o => {
            if (o !== CommonTypes.TestOutcome.Passed && o !== CommonTypes.TestOutcome.NotExecuted && o !== CommonTypes.TestOutcome.NotImpacted) {
                outcomeAggrStr += `, ${this._getOutcomeCountStringForAggregation(o)}`;
            }
        });

        const groupByStr: string = `groupby((${this._getGroupByPeriodColumnString(confValues.trendBy)}), aggregate(${outcomeAggrStr}))`;

        queryOptions.$apply = `${filterStr}/${groupByStr}`;
        queryOptions.$orderby = this._getOrderByDateClause(confValues.trendBy);

        return this._queryTestOutcomeCountAndPassRateTrendData(queryOptions, confValues);
    }

    private _queryTestOutcomeCountAndPassRateTrendData_TestResultDailyTable(testResultContext: TCMContracts.TestResultsContext, confValues: CommonTypes.IReportConfiguration): IPromise<CommonTypes.ITrendChartData> {
        let queryOptions = {
            entityType: this._testResultDailyEntityName,
            project: VssContext.getDefaultWebContext().project.id
        } as ODataQueryOptions;

        const requiredOutcomeFilters = [CommonTypes.TestOutcome.Passed, CommonTypes.TestOutcome.NotExecuted, CommonTypes.TestOutcome.NotImpacted];
        const outcomefilters = confValues.outcomes || [] as CommonTypes.TestOutcome[];
        const outcomeCountStrs = this._getOutcomeCountAggregateAndComputeStrings(Utils_Array.union(outcomefilters, requiredOutcomeFilters));
                
        let filterStr =
            `filter(${this._getTestResultsContextPipelineFilter(testResultContext)} and ${this._getDailyDateFilter(confValues.trendBy, confValues.period)} ${this._getFilterByFieldsString(confValues.configuredFilters)})`;
        
        let groupByStr =
            `groupby((${this._getGroupByDailyPeriodColumnString(confValues.trendBy)}), aggregate(ResultCount with sum as ResultCount, ${outcomeCountStrs.outcomeAggregationStr}))`;
        
        queryOptions.$apply = `${filterStr}/${groupByStr}`;
        queryOptions.$orderby = this._getDailyOrderByDateClause(confValues.trendBy);
        
        return this._queryTestOutcomeCountAndPassRateTrendData(queryOptions, confValues, this._parseReturnDailyDateIntoDisplayForm);
    }

    private _queryTestOutcomeCountAndPassRateTrendData_TestResultTable(testResultContext: TCMContracts.TestResultsContext, confValues: CommonTypes.IReportConfiguration): IPromise<CommonTypes.ITrendChartData> {
        let queryOptions = {
            entityType: this._testResultEntityName,
            project: VssContext.getDefaultWebContext().project.id
        } as ODataQueryOptions;

        this._getTestRunTitlePropertyString = () => { return "TestRun/Title" };

        const filterStr: string = `filter(${this._getTestResultsContextFilter(testResultContext)} and ${this._getDateFilter(confValues.trendBy, confValues.period)} ${this._getFilterByFieldsString(confValues.configuredFilters)})`;

        let outcomeAggrStr: string = `$count as TotalCount, ${this._getOutcomeCountCastedAggregationString(CommonTypes.TestOutcome.Passed)}, ${this._getOutcomeCountCastedAggregationString(CommonTypes.TestOutcome.NotExecuted)},
 ${this._getOutcomeCountCastedAggregationString(CommonTypes.TestOutcome.NotImpacted)}`;
        
        confValues.outcomes.forEach(o => {
            if (o !== CommonTypes.TestOutcome.Passed && o !== CommonTypes.TestOutcome.NotExecuted && o !== CommonTypes.TestOutcome.NotImpacted) {
                outcomeAggrStr += `, ${this._getOutcomeCountCastedAggregationString(o)}`;
            }
        });

        const groupByStr: string = `groupby((${this._getGroupByPeriodColumnString(confValues.trendBy)}), aggregate(${outcomeAggrStr}))`;
        queryOptions.$apply = `${filterStr}/${groupByStr}`;
        queryOptions.$orderby = this._getOrderByDateClause(confValues.trendBy);

        return this._queryTestOutcomeCountAndPassRateTrendData(queryOptions, confValues);
    }
    
    private _queryTestOutcomeCountTrendData_TestRunTable(testResultContext: TCMContracts.TestResultsContext, confValues: CommonTypes.IReportConfiguration): IPromise<CommonTypes.ITrendChartData> {
        let queryOptions = {
            entityType: this._testRunEntityName,
            project: VssContext.getDefaultWebContext().project.id
        } as ODataQueryOptions;

        this._getTestRunTitlePropertyString = () => { return "Title" };

        const filterStr: string = `filter(${this._getTestResultsContextFilter(testResultContext)} and ${this._getDateFilter(confValues.trendBy, confValues.period)} ${this._getFilterByFieldsString(confValues.configuredFilters)})`;

        let outcomeAggrStr: string = Utils_String.empty;
        if (confValues.outcomes.length === 0) {
            outcomeAggrStr = this._getTotalCountStringForAggregation();
        }
        else {
            confValues.outcomes.forEach(o => {
                if (!outcomeAggrStr) {
                    outcomeAggrStr = this._getOutcomeCountStringForAggregation(o);
                }
                else {
                    outcomeAggrStr += `, ${this._getOutcomeCountStringForAggregation(o)}`;
                }
            });
        }

        let groupByStr: string = `groupby((${this._getGroupByPeriodColumnString(confValues.trendBy)}), aggregate(${outcomeAggrStr}))`;

        queryOptions.$apply = `${filterStr}/${groupByStr}`;
        queryOptions.$orderby = this._getOrderByDateClause(confValues.trendBy);

        return this._queryTestOutcomeCountTrendData(queryOptions, confValues);
    }

    private _queryTestOutcomeCountTrendData_TestResultDailyTable(testResultContext: TCMContracts.TestResultsContext, confValues: CommonTypes.IReportConfiguration): IPromise<CommonTypes.ITrendChartData> {
        let queryOptions = {
            entityType: this._testResultDailyEntityName,
            project: VssContext.getDefaultWebContext().project.id
        } as ODataQueryOptions;

        let outcomeAggrStr: string = Utils_String.empty;
        if (confValues.outcomes.length === 0) {
            outcomeAggrStr = this._getTotalCountStringForAggregation();
        }
        else {
            outcomeAggrStr = this._getOutcomeCountAggregateAndComputeStrings(confValues.outcomes).outcomeAggregationStr;
        }

        let filterStr: string =
            `filter(${this._getTestResultsContextPipelineFilter(testResultContext)} and ${this._getDailyDateFilter(confValues.trendBy, confValues.period)} ${this._getFilterByFieldsString(confValues.configuredFilters)})`;
        let groupByStr: string =
            `groupby((${this._getGroupByDailyPeriodColumnString(confValues.trendBy)}), aggregate(${outcomeAggrStr}))`;

        queryOptions.$apply = `${filterStr}/${groupByStr}`;
        queryOptions.$orderby = this._getDailyOrderByDateClause(confValues.trendBy);
    
        return this._queryTestOutcomeCountTrendData(queryOptions, confValues, this._parseReturnDailyDateIntoDisplayForm);
    }

    private _queryTestOutcomeCountTrendData_TestResultTable(testResultContext: TCMContracts.TestResultsContext, confValues: CommonTypes.IReportConfiguration): IPromise<CommonTypes.ITrendChartData> {
        let queryOptions = {
            entityType: this._testResultEntityName,
            project: VssContext.getDefaultWebContext().project.id
        } as ODataQueryOptions;

        this._getTestRunTitlePropertyString = () => { return "TestRun/Title" };

        const filterStr: string = `filter(${this._getTestResultsContextFilter(testResultContext)} and ${this._getDateFilter(confValues.trendBy, confValues.period)} ${this._getFilterByFieldsString(confValues.configuredFilters)})`;

        let outcomeAggrStr: string = Utils_String.empty;
        if (confValues.outcomes.length === 0) {
            outcomeAggrStr = "$count as TotalCount";
        }
        else {
            confValues.outcomes.forEach(o => {
                if (!outcomeAggrStr) {
                    outcomeAggrStr = this._getOutcomeCountCastedAggregationString(o);
                }
                else {
                    outcomeAggrStr += `, ${this._getOutcomeCountCastedAggregationString(o)}`;
                }
            });
        }
        
        const groupByStr: string = `groupby((${this._getGroupByPeriodColumnString(confValues.trendBy)}), aggregate(${outcomeAggrStr}))`;

        queryOptions.$apply = `${filterStr}/${groupByStr}`;
        queryOptions.$orderby = this._getOrderByDateClause(confValues.trendBy);

        return this._queryTestOutcomeCountTrendData(queryOptions, confValues);
    }

    private _queryTestOutcomeCountStackedTrendData_TestRunTable(testResultContext: TCMContracts.TestResultsContext, confValues: CommonTypes.IReportConfiguration): IPromise<CommonTypes.ITrendChartData> {
        let queryOptions = {
            entityType: this._testRunEntityName,
            project: VssContext.getDefaultWebContext().project.id
        } as ODataQueryOptions;

        this._getTestRunTitlePropertyString = () => { return "Title" };

        const outcomeCountStrs = this._getOutcomeCountAggregateAndComputeStrings(confValues.outcomes);

        const filterStr: string =
            `filter(${this._getTestResultsContextFilter(testResultContext)} and ${this._getDateFilter(confValues.trendBy, confValues.period)} ${this._getFilterByFieldsString(confValues.configuredFilters)})`;
        const groupByStr: string =
            `groupby((${this._getGroupByTestRunPropertiesString(confValues.groupBy)}, ${this._getGroupByPeriodColumnString(confValues.trendBy)}),aggregate(${outcomeCountStrs.outcomeAggregationStr}))`;

        if (!outcomeCountStrs.outcomeComputeStr) {
            queryOptions.$apply = `${filterStr}/${groupByStr}`;
        }
        else {
            const computeStr: string = `compute((${outcomeCountStrs.outcomeComputeStr}) as AggregateValue)`;
            queryOptions.$apply = `${filterStr}/${groupByStr}/${computeStr}`;
        }

        //Filter out groups that have 0 AggregateValue as that is not relevant to be shown in chart
        queryOptions.$apply += "/filter(AggregateValue gt 0)";

        return this.queryOData(queryOptions).then((data: CommonTypes.IODataQueryResponse) => {
            return this._getStackedChartData(confValues, data, CommonTypes.Metric.ResultCount);
        });
    }

    private _queryTestOutcomeCountStackedTrendData_TestResultDailyTable(testResultContext: TCMContracts.TestResultsContext, confValues: CommonTypes.IReportConfiguration): IPromise<CommonTypes.ITrendChartData> {
        let queryOptions = {
            entityType: this._testResultDailyEntityName,
            project: VssContext.getDefaultWebContext().project.id
        } as ODataQueryOptions;

        const outcomeCountStrs = this._getOutcomeCountAggregateAndComputeStrings(confValues.outcomes);

        let filterStr: string =
            `filter(${this._getTestResultsContextPipelineFilter(testResultContext)} and ${this._getDailyDateFilter(confValues.trendBy, confValues.period)} ${this._getFilterByFieldsString(confValues.configuredFilters)})`;
        let groupByStr: string =
            `groupby((${this._getGroupByTestPropertiesString(confValues.groupBy)}, ${this._getGroupByDailyPeriodColumnString(confValues.trendBy)}), aggregate(${outcomeCountStrs.outcomeAggregationStr}))`;

        if (!outcomeCountStrs.outcomeComputeStr) {
            queryOptions.$apply = `${filterStr}/${groupByStr}`;
        }
        else {
            let computeStr: string = `compute((${outcomeCountStrs.outcomeComputeStr}) as AggregateValue)`;
            queryOptions.$apply = `${filterStr}/${groupByStr}/${computeStr}`;
        }

        //Filter out groups that have 0 AggregateValue as that is not relevant to be shown in chart
        queryOptions.$apply += "/filter(AggregateValue gt 0)";

        return this.queryOData(queryOptions).then((data: CommonTypes.IODataQueryResponse) => {
            return this._getStackedChartData(confValues, data, CommonTypes.Metric.ResultCount, this._parseReturnDailyDateIntoDisplayForm);
        });
    }

    private _queryTestOutcomeCountStackedTrendData_TestResultTable(testResultContext: TCMContracts.TestResultsContext, confValues: CommonTypes.IReportConfiguration): IPromise<CommonTypes.ITrendChartData> {
        let queryOptions = {
            entityType: this._testResultEntityName,
            project: VssContext.getDefaultWebContext().project.id
        } as ODataQueryOptions;

        this._getTestRunTitlePropertyString = () => { return "TestRun/Title" };

        let outcomeFilterStr: string = Utils_String.empty;
        if (confValues.outcomes.length > 0) {
            confValues.outcomes.forEach(o => {
                if (!outcomeFilterStr) {
                    outcomeFilterStr = this._getOutcomeFilter(o);
                }
                else {
                    outcomeFilterStr += ` or ${this._getOutcomeFilter(o)}`;
                }
            });

            outcomeFilterStr = ` and ( ${outcomeFilterStr} ) `;
        }

        let filterStr: string =
            `filter(${this._getTestResultsContextFilter(testResultContext)} and ${this._getDateFilter(confValues.trendBy, confValues.period)} ${outcomeFilterStr} ${this._getFilterByFieldsString(confValues.configuredFilters)})`;
        let groupByStr: string = `groupby((${this._getGroupByTestPropertiesString(confValues.groupBy)}, ${this._getGroupByPeriodColumnString(confValues.trendBy)}), aggregate($count as AggregateValue))`;

        //Filter out groups that have 0 AggregateValue as that is not relevant to be shown in chart
        queryOptions.$apply = `${filterStr}/${groupByStr}/filter(AggregateValue gt 0)`;

        return this.queryOData(queryOptions).then((data: CommonTypes.IODataQueryResponse) => {
            return this._getStackedChartData(confValues, data, CommonTypes.Metric.ResultCount);
        });
    }

    private _queryTestDurationTrendData_TestRunTable(testResultContext: TCMContracts.TestResultsContext, confValues: CommonTypes.IReportConfiguration): IPromise<CommonTypes.ITrendChartData> {
        let queryOptions = {
            entityType: this._testRunEntityName,
            project: VssContext.getDefaultWebContext().project.id
        } as ODataQueryOptions;

        this._getTestRunTitlePropertyString = () => { return "Title" };

        const filterStr: string = `filter(${this._getTestResultsContextFilter(testResultContext)} and ${this._getDateFilter(confValues.trendBy, confValues.period)} ${this._getFilterByFieldsString(confValues.configuredFilters)})`;
        let groupByContextAggregationStr: string = `groupby((${this._getGroupByPeriodColumnString(confValues.trendBy)}, ${this._getGroupByTestResultsContext(testResultContext)})
, aggregate(ResultDurationSeconds with sum as ResultDurationSeconds))`;
        let groupByAggregationStr: string = `groupby((${this._getGroupByPeriodColumnString(confValues.trendBy)}), aggregate(ResultDurationSeconds with average as AvgDuration))`;

        queryOptions.$apply = `${filterStr}/${groupByContextAggregationStr}/${groupByAggregationStr}`;
        queryOptions.$orderby = this._getOrderByDateClause(confValues.trendBy);

        return this._queryTestDurationTrendData(queryOptions, confValues);
    }

    private _queryTestDurationTrendData_TestResultDailyTable(testResultContext: TCMContracts.TestResultsContext, confValues: CommonTypes.IReportConfiguration): IPromise<CommonTypes.ITrendChartData> { 
        let queryOptions = {
            entityType: this._testResultDailyEntityName,
            project: VssContext.getDefaultWebContext().project.id
        } as ODataQueryOptions;

        let filterStr: string = `filter(${this._getTestResultsContextPipelineFilter(testResultContext)} and ${this._getDailyDateFilter(confValues.trendBy, confValues.period)} ${this._getFilterByFieldsString(confValues.configuredFilters)})`;
        let groupByContextAggregationStr: string =
            `groupby((TestSK, ${this._getGroupByDailyPeriodColumnString(confValues.trendBy)}), aggregate(ResultDurationSeconds div ResultCount with sum as TestAvgDuration))`;
        let groupByAggregationStr: string = 
            `groupby((${this._getGroupByDailyPeriodColumnString(confValues.trendBy)}), aggregate(TestAvgDuration with sum as AvgDuration))`;

        queryOptions.$apply = `${filterStr}/${groupByContextAggregationStr}/${groupByAggregationStr}`;

        queryOptions.$orderby = this._getDailyOrderByDateClause(confValues.trendBy);

        return this._queryTestDurationTrendData(queryOptions, confValues, this._parseReturnDailyDateIntoDisplayForm);
    }
    
    private _queryTestDurationTrendData_TestResultTable(testResultContext: TCMContracts.TestResultsContext, confValues: CommonTypes.IReportConfiguration): IPromise<CommonTypes.ITrendChartData> {
        let queryOptions = {
            entityType:  this._testResultEntityName,
            project: VssContext.getDefaultWebContext().project.id
        } as ODataQueryOptions;

        this._getTestRunTitlePropertyString = () => { return "TestRun/Title" };

        const filterStr: string = `filter(${this._getTestResultsContextFilter(testResultContext)} and ${this._getDateFilter(confValues.trendBy, confValues.period)} ${this._getFilterByFieldsString(confValues.configuredFilters)})`;
        let groupByContextAggregationStr: string = `groupby((${this._getGroupByPeriodColumnString(confValues.trendBy)}, ${this._getGroupByTestResultsContext(testResultContext)})
, aggregate(DurationSeconds with sum as DurationSeconds))`;
        let groupByAggregationStr: string = `groupby((${this._getGroupByPeriodColumnString(confValues.trendBy)}), aggregate(DurationSeconds with average as AvgDuration))`;

        queryOptions.$apply = `${filterStr}/${groupByContextAggregationStr}/${groupByAggregationStr}`;
        queryOptions.$orderby = this._getOrderByDateClause(confValues.trendBy);

        return this._queryTestDurationTrendData(queryOptions, confValues);
    }

    private _queryTestDurationStackedTrendData_TestRunTable(testResultContext: TCMContracts.TestResultsContext, confValues: CommonTypes.IReportConfiguration): IPromise<CommonTypes.ITrendChartData> {
        let queryOptions = {
            entityType: this._testRunEntityName,
            project: VssContext.getDefaultWebContext().project.id
        } as ODataQueryOptions;

        this._getTestRunTitlePropertyString = () => { return "Title" };

        let filterStr: string = `filter(${this._getTestResultsContextFilter(testResultContext)} and ${this._getDateFilter(confValues.trendBy, confValues.period)} ${this._getFilterByFieldsString(confValues.configuredFilters)})`;
        let groupByContextAggregationStr: string = `groupby((${this._getGroupByTestRunPropertiesString(confValues.groupBy)}, ${this._getGroupByPeriodColumnString(confValues.trendBy)}, ${this._getGroupByTestResultsContext(testResultContext)})
, aggregate(ResultDurationSeconds with sum as ResultDurationSeconds))`;
        let groupByAggregationStr: string = `groupby((${this._getGroupByTestRunPropertiesString(confValues.groupBy)}, ${this._getGroupByPeriodColumnString(confValues.trendBy)}), aggregate(ResultDurationSeconds with average as AggregateValue))`;

        //Filter out groups that have 0d(0.0) AggregateValue as that is not relevant to be shown in chart
        queryOptions.$apply = `${filterStr}/${groupByContextAggregationStr}/${groupByAggregationStr}/filter(AggregateValue gt 0d)`;

        return this.queryOData(queryOptions).then((data: CommonTypes.IODataQueryResponse) => {
            return this._getStackedChartData(confValues, data, CommonTypes.Metric.AvgDuration);
        });
    }

    private _queryTestDurationStackedTrendData_TestResultDailyTable(testResultContext: TCMContracts.TestResultsContext, confValues: CommonTypes.IReportConfiguration): IPromise<CommonTypes.ITrendChartData> {
        let queryOptions = {
            entityType: this._testResultDailyEntityName,
            project: VssContext.getDefaultWebContext().project.id
        } as ODataQueryOptions;

        let filterStr: string = `filter(${this._getTestResultsContextPipelineFilter(testResultContext)} and ${this._getDailyDateFilter(confValues.trendBy, confValues.period)} ${this._getFilterByFieldsString(confValues.configuredFilters)})`;
        let groupByContextAggregationStr: string =
            `groupby((${this._getGroupByTestPropertiesString(confValues.groupBy)}, ${this._getGroupByDailyPeriodColumnString(confValues.trendBy)}), aggregate(ResultDurationSeconds div ResultCount with sum as AggregateValue))`;

        //Filter out groups that have 0d(0.0) AggregateValue as that is not relevant to be shown in chart
        queryOptions.$apply = `${filterStr}/${groupByContextAggregationStr}/filter(AggregateValue gt 0d)`;

        return this.queryOData(queryOptions).then((data: CommonTypes.IODataQueryResponse) => {
            return this._getStackedChartData(confValues, data, CommonTypes.Metric.AvgDuration, this._parseReturnDailyDateIntoDisplayForm);
        });
    }

    private _queryTestDurationStackedTrendData_TestResultTable(testResultContext: TCMContracts.TestResultsContext, confValues: CommonTypes.IReportConfiguration): IPromise<CommonTypes.ITrendChartData> {
        let queryOptions = {
            entityType: this._testResultEntityName,
            project: VssContext.getDefaultWebContext().project.id
        } as ODataQueryOptions;

        this._getTestRunTitlePropertyString = () => { return "TestRun/Title" };

        const filterStr: string = `filter(${this._getTestResultsContextFilter(testResultContext)} and ${this._getDateFilter(confValues.trendBy, confValues.period)} ${this._getFilterByFieldsString(confValues.configuredFilters)})`;
        const groupByContextAggregationStr: string = `groupby((${this._getGroupByTestPropertiesString(confValues.groupBy)}, ${this._getGroupByPeriodColumnString(confValues.trendBy)}, ${this._getGroupByTestResultsContext(testResultContext)})
, aggregate(DurationSeconds with sum as DurationSeconds))`;
        let groupByAggregationStr: string = `groupby((${this._getGroupByTestPropertiesString(confValues.groupBy)}, ${this._getGroupByPeriodColumnString(confValues.trendBy)}), aggregate(DurationSeconds with average as AggregateValue))`;

        //Filter out groups that have 0d(0.0) AggregateValue as that is not relevant to be shown in chart
        queryOptions.$apply = `${filterStr}/${groupByContextAggregationStr}/${groupByAggregationStr}/filter(AggregateValue gt 0d)`;

        return this.queryOData(queryOptions).then((data: CommonTypes.IODataQueryResponse) => {
            return this._getStackedChartData(confValues, data, CommonTypes.Metric.AvgDuration);
        });
    }       

    private _getStackedChartData(confValues: CommonTypes.IReportConfiguration, data: any, metricSelected: CommonTypes.Metric,
        dateParsingMethod?: (trendBy: CommonTypes.TrendBy, record: any) => string): CommonTypes.ITrendChartData {
        if (!data || !data.value) {
            return null;
        }

        let chartData: CommonTypes.ITrendChartData = { primaryChartData: {}, confValues: confValues, metricSelected: metricSelected, isCachedData: data.isCachedData };
        let stackByToTotalAggrValueMap: IDictionaryStringTo<number> = {};

        //Iterate over all data
        (data.value as any[]).forEach(d => {
            let date = dateParsingMethod ? dateParsingMethod(confValues.trendBy, d) : this._parseReturnDateIntoDisplayForm(confValues.trendBy, d);
            let stackByValue = this._parseTestProperties(confValues.groupBy, d).displayValue;

            if (!chartData.primaryChartData[stackByValue]) {
                chartData.primaryChartData[stackByValue] = [];
            }

            let aggrValue: number = d.AggregateValue as number;
            chartData.primaryChartData[stackByValue].push({
                date: date,
                aggrValue: aggrValue
            } as CommonTypes.ITrendChartAggregateData);

            stackByToTotalAggrValueMap[stackByValue] = stackByToTotalAggrValueMap[stackByValue] ? stackByToTotalAggrValueMap[stackByValue] + aggrValue : aggrValue;
        });

        //Only select top artifacts by their aggregate values and club others into one group.
        return this._reduceAndCombineStackedChartSeries(chartData, stackByToTotalAggrValueMap, metricSelected);
    }

    private _reduceAndCombineStackedChartSeries(chartData: CommonTypes.ITrendChartData, stackByToTotalAggrValueMap: IDictionaryStringTo<number>, metricSelected: CommonTypes.Metric): CommonTypes.ITrendChartData {
        let filteredChartData: CommonTypes.ITrendChartData = { primaryChartData: {}, confValues: chartData.confValues, metricSelected: metricSelected, isCachedData: chartData.isCachedData };

        //Creating array from dictionary as sorting can be done on array and sort list by aggrvalue in descending order.
        let stackByTotalAggrValueList = Object.keys(stackByToTotalAggrValueMap).map(stackBy => {
            return { stackByValue: stackBy, aggrValue: stackByToTotalAggrValueMap[stackBy] };
        });
        stackByTotalAggrValueList.sort((aggr1, aggr2) => {
            return aggr2.aggrValue - aggr1.aggrValue;
        });

        //Populate top (n) stacked data.
        let count = 0;
        while (count < TrendChartOptions.maxStackedSeriesCount && count < stackByTotalAggrValueList.length) {
            let stackByValue: string = stackByTotalAggrValueList[count].stackByValue;

            //Sort a stacked series by date
            chartData.primaryChartData[stackByValue].sort((aggrData1, aggrData2) => Utils_String.defaultComparer(aggrData1.date, aggrData2.date));

            filteredChartData.primaryChartData[stackByValue] = chartData.primaryChartData[stackByValue];

            count++;
        }

        if (count < stackByTotalAggrValueList.length) {
            //Populate remaining chart data as Others in new chart data.
            let remainingStackDateToAggrDataMap: IDictionaryStringTo<CommonTypes.ITrendChartAggregateData> = {};
            let otherStackedDataCount: number = 0;

            Object.keys(chartData.primaryChartData).forEach((stackByValue: string) => {
                //Populate stack data if not populated in filtered list.
                if (!filteredChartData.primaryChartData[stackByValue]) {
                    otherStackedDataCount++;

                    chartData.primaryChartData[stackByValue].forEach((aggrData: CommonTypes.ITrendChartAggregateData) => {
                        if (!remainingStackDateToAggrDataMap[aggrData.date]) {
                            remainingStackDateToAggrDataMap[aggrData.date] = { date: aggrData.date, aggrValue: 0 };
                        }

                        remainingStackDateToAggrDataMap[aggrData.date].aggrValue += aggrData.aggrValue;
                    });
                }
            });

            //Populate trend data for other stackByValues and sort trend data by date.
            let remainingStackedTrendChartAggrData = Object.keys(remainingStackDateToAggrDataMap).map(date => remainingStackDateToAggrDataMap[date]);
            remainingStackedTrendChartAggrData.sort((aggrData1, aggrData2) => Utils_String.defaultComparer(aggrData1.date, aggrData2.date));
            filteredChartData.primaryChartData[Utils_String.format(Resources.OthersArtifactWithCountText, otherStackedDataCount)] = remainingStackedTrendChartAggrData;
        }

        return filteredChartData;
    }
    
    private _queryTestOutcomeCountAndPassRateTrendData(queryOptions: ODataQueryOptions, confValues: CommonTypes.IReportConfiguration, dateParsingMethod?: (trendBy: CommonTypes.TrendBy, record: any) => string): IPromise<CommonTypes.ITrendChartData> {
        
        let entityWiseOutcomeParseFunction: Function = this._getEntityWiseOutcomeCountParseFunction(queryOptions.entityType);
        let entityWiseTotalCountParseFunction: Function = this._getEntityWiseTotalCountParseFunction(queryOptions.entityType);

        return this.queryOData(queryOptions).then((data: CommonTypes.IODataQueryResponse) => {
            if (!data || !data.value) {
                return null;
            }
            
            let chartData: CommonTypes.ITrendChartData = { primaryChartData: { [Utils_String.empty]: [] }, secondaryChartData: [], confValues: confValues, metricSelected: CommonTypes.Metric.ResultCountAndPassRate, isCachedData: data.isCachedData };

            //Iterate over all data
            (data.value as any[]).forEach(d => {
                let date = dateParsingMethod ? dateParsingMethod(confValues.trendBy, d) : this._parseReturnDateIntoDisplayForm(confValues.trendBy, d);

                let outcomeCount: number = 0;
                if (confValues.outcomes.length === 0) {
                    outcomeCount = entityWiseTotalCountParseFunction(d);
                }
                else {
                    confValues.outcomes.forEach(o => {
                        outcomeCount += entityWiseOutcomeParseFunction(o, d);
                    });
                }

                chartData.primaryChartData[Utils_String.empty].push({ date: date, aggrValue: outcomeCount });

                const totalCount: number = entityWiseTotalCountParseFunction(d);
                const notExecutedCount: number = entityWiseOutcomeParseFunction(CommonTypes.TestOutcome.NotExecuted, d);
                const passedCount: number = entityWiseOutcomeParseFunction(CommonTypes.TestOutcome.Passed, d);
                const notImpactedCount: number = entityWiseOutcomeParseFunction(CommonTypes.TestOutcome.NotImpacted, d);

                chartData.secondaryChartData.push({
                    date: date,
                    aggrValue: this._getPassPercentage(totalCount, passedCount, notExecutedCount, notImpactedCount)
                });
            });

            return chartData;
        });
    }

    private _queryTestOutcomeCountTrendData(queryOptions: ODataQueryOptions, confValues: CommonTypes.IReportConfiguration, dateParsingMethod?: (trendBy: CommonTypes.TrendBy, record: any) => string): IPromise<CommonTypes.ITrendChartData> {

        let entityWiseOutcomeParseFunction: Function = this._getEntityWiseOutcomeCountParseFunction(queryOptions.entityType);
        let entityWiseTotalCountParseFunction: Function = this._getEntityWiseTotalCountParseFunction(queryOptions.entityType);

        return this.queryOData(queryOptions).then((data: CommonTypes.IODataQueryResponse) => {
            if (!data || !data.value) {
                return null;
            }

            let chartData: CommonTypes.ITrendChartData = { primaryChartData: { [Utils_String.empty]: [] }, confValues: confValues, metricSelected: CommonTypes.Metric.ResultCount, isCachedData: data.isCachedData };

            //Iterate over all data
            (data.value as any[]).forEach(d => {
                let date = dateParsingMethod ? dateParsingMethod(confValues.trendBy, d) : this._parseReturnDateIntoDisplayForm(confValues.trendBy, d);

                let outcomeCount: number = 0;
                if (confValues.outcomes.length === 0) {
                    outcomeCount = entityWiseTotalCountParseFunction(d);
                }
                else {
                    confValues.outcomes.forEach(o => {
                        outcomeCount += entityWiseOutcomeParseFunction(o, d);
                    });
                }
                chartData.primaryChartData[Utils_String.empty].push({ date: date, aggrValue: outcomeCount });
            });

            return chartData;
        });
    }

    private _queryTestDurationTrendData(queryOptions: ODataQueryOptions, confValues: CommonTypes.IReportConfiguration, dateParsingMethod?: (trendBy: CommonTypes.TrendBy, record: any) => string): IPromise<CommonTypes.ITrendChartData> {
        
        return this.queryOData(queryOptions).then((data: CommonTypes.IODataQueryResponse) => {
            if (!data || !data.value) {
                return null;
            }

            let chartData: CommonTypes.ITrendChartData = { primaryChartData: { [Utils_String.empty]: [] }, confValues: confValues, metricSelected: CommonTypes.Metric.AvgDuration, isCachedData: data.isCachedData };

            //Iterate over all data
            (data.value as any[]).forEach(d => {
                let date = dateParsingMethod ? dateParsingMethod(confValues.trendBy, d) : this._parseReturnDateIntoDisplayForm(confValues.trendBy, d);
                chartData.primaryChartData[Utils_String.empty].push({ date: date, aggrValue: d.AvgDuration as number });
            });

            return chartData;
        });
    }
}
