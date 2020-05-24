
import { ODataQueryOptions } from "Analytics/Scripts/OData";

import { TestChartData } from "TestManagement/Scripts/TestReporting/Analytics/TestChartData";
import * as AnalyticsTypes from "TestManagement/Scripts/TestReporting/Analytics/Types";

import Contracts = require("TFS/TestManagement/Contracts");

export class TestRunAggregateChartData extends TestChartData {
    public getChartData(projectId: string, publishContextDetails: Contracts.TestResultsContext, repositoryId: string, branchName: string, chartOptions: AnalyticsTypes.ISingleChartOptions,
        periodGroup: AnalyticsTypes.Chart_PeriodGroup, periodGroupValue: number): AnalyticsTypes.IQueryODataOptions {
        switch (chartOptions.metric) {
            case AnalyticsTypes.Chart_Metric.Duration:
                return this._getTestDurationAggregates(projectId, publishContextDetails, repositoryId, branchName, chartOptions, periodGroup, periodGroupValue);
            case AnalyticsTypes.Chart_Metric.Rate:
                return this._getTestRateAggregates(projectId, publishContextDetails, repositoryId, branchName, chartOptions, periodGroup, periodGroupValue);
            case AnalyticsTypes.Chart_Metric.Count:
                return this._getTestCountAggregates(projectId, publishContextDetails, repositoryId, branchName, chartOptions, periodGroup, periodGroupValue);
        }

        return null;
    }

    private _getTestDurationAggregates(projectId: string, publishContextDetails: Contracts.TestResultsContext, repositoryId: string, branchName: string, chartOptions: AnalyticsTypes.ISingleChartOptions,
        periodGroup: AnalyticsTypes.Chart_PeriodGroup, periodGroupValue: number): AnalyticsTypes.IQueryODataOptions {
        let queryOptions = {
            entityType: this._entityName,
            project: projectId
        } as ODataQueryOptions;

        let filterStr: string = this._getFilterDetailsString(publishContextDetails, repositoryId, branchName, chartOptions, periodGroup, periodGroupValue);
        let groupByPublishContextStr: string = this._getGroupByPublishContextString(publishContextDetails.contextType);
        let groupByPeriodColumnStr: string = this._getGroupByPeriodColumnString(periodGroup);

        //Triage: Here we have taken RunDuration for aggregate. Ask PMs if Result duration required.
        if (chartOptions.aggregation === AnalyticsTypes.Chart_Aggregation.Average) {
            queryOptions.$apply = `filter(${filterStr})/groupby((${groupByPeriodColumnStr}, ${groupByPublishContextStr}),aggregate(RunDurationSeconds with sum as TotalDuration))
                                    /groupby((${groupByPeriodColumnStr}),aggregate(TotalDuration with average as AggregateDuration))`;
        }
        else if (chartOptions.aggregation === AnalyticsTypes.Chart_Aggregation.Sum) {
            queryOptions.$apply = `filter(${filterStr})/groupby((${groupByPeriodColumnStr}),aggregate(RunDurationSeconds with sum as AggregateDuration))`;
        }

        //Append orderBy clause
        queryOptions.$orderby = this._appendOrderByDateClause(periodGroup);

        return {
            queryOptions: queryOptions,
            onSuccess: (data: any) => {
                return data.value.map(record => {                //OData endpoint doesnt return of any type. The properties returned should match Odata model properties (case sensitive match) on AX serverside.
                    let chartData: AnalyticsTypes.IAnalyticsChartData = this._parseODataAPIReturnDateIntoDisplayForm(periodGroup, record);

                    chartData.metricValue = this._getDurationInTimespanFormat(record.AggregateDuration);

                    return chartData;
                });
            }
        } as AnalyticsTypes.IQueryODataOptions;
    }

    private _getTestRateAggregates(projectId: string, publishContextDetails: Contracts.TestResultsContext, repositoryId: string, branchName: string, chartOptions: AnalyticsTypes.ISingleChartOptions,
        periodGroup: AnalyticsTypes.Chart_PeriodGroup, periodGroupValue: number): AnalyticsTypes.IQueryODataOptions {
        let queryOptions = {
            entityType: this._entityName,
            project: projectId
        } as ODataQueryOptions;

        let filterStr: string = this._getFilterDetailsString(publishContextDetails, repositoryId, branchName, chartOptions, periodGroup, periodGroupValue);
        let groupByPublishContextStr: string = this._getGroupByPublishContextString(publishContextDetails.contextType);
        let groupByPeriodColumnStr: string = this._getGroupByPeriodColumnString(periodGroup);

        //Triage: Here we are getting all count. Ask PM and AX team if this correct and wont impact perf.
        if (chartOptions.aggregation === AnalyticsTypes.Chart_Aggregation.Average) {
            queryOptions.$apply = `filter(${filterStr})/groupby((${groupByPeriodColumnStr}, ${groupByPublishContextStr}),
                        aggregate(ResultCount with sum as TotalTests, ResultPassCount with sum as TotalPassedTests, ResultFailCount with sum as TotalFailedTests))
                                    /groupby((${groupByPeriodColumnStr}),aggregate(TotalTests with average as AggregateTotalTests, TotalPassedTests with average as AggregateTotalPassedTests,
                            TotalFailedTests with average as AggregateTotalFailedTests))`;
        }
        else if (chartOptions.aggregation === AnalyticsTypes.Chart_Aggregation.Sum) {
            queryOptions.$apply = `filter(${filterStr})/groupby((${groupByPeriodColumnStr}),aggregate(ResultCount with sum as AggregateTotalTests, ResultPassCount with sum as AggregateTotalPassedTests,
                            ResultFailCount with sum as AggregateTotalFailedTests))`;
        }

        //Append orderBy clause
        queryOptions.$orderby = this._appendOrderByDateClause(periodGroup);

        return {
            queryOptions: queryOptions,
            onSuccess: (data: any) => {
                return data.value.map(record => {                //OData endpoint doesnt return of any type. The properties returned should match Odata model properties (case sensitive match) on AX serverside.
                    let chartData: AnalyticsTypes.IAnalyticsChartData = this._parseODataAPIReturnDateIntoDisplayForm(periodGroup, record);

                    switch (chartOptions.outcome) {
                        case AnalyticsTypes.Chart_Outcome.All:      //For all we will give pass percentage 
                            chartData.metricValue = (record.AggregateTotalPassedTests * 100) / record.AggregateTotalTests;
                            break;
                        case AnalyticsTypes.Chart_Outcome.Pass:
                            chartData.metricValue = (record.AggregateTotalPassedTests * 100) / record.AggregateTotalTests;
                            break;
                        case AnalyticsTypes.Chart_Outcome.Fail:
                            chartData.metricValue = (record.AggregateTotalFailedTests * 100) / record.AggregateTotalTests;
                            break;
                    }

                    return chartData;
                });
            }
        } as AnalyticsTypes.IQueryODataOptions;
    }

    private _getTestCountAggregates(projectId: string, publishContextDetails: Contracts.TestResultsContext, repositoryId: string, branchName: string, chartOptions: AnalyticsTypes.ISingleChartOptions,
        periodGroup: AnalyticsTypes.Chart_PeriodGroup, periodGroupValue: number): AnalyticsTypes.IQueryODataOptions {
        let queryOptions = {
            entityType: this._entityName,
            project: projectId
        } as ODataQueryOptions;

        let filterStr: string = this._getFilterDetailsString(publishContextDetails, repositoryId, branchName, chartOptions, periodGroup, periodGroupValue);
        let groupByPublishContextStr: string = this._getGroupByPublishContextString(publishContextDetails.contextType);
        let groupByPeriodColumnStr: string = this._getGroupByPeriodColumnString(periodGroup);
        let aggrOutcomeStr: string = this._getOutcomeCountFieldForAggregation(chartOptions.outcome);

        //Triage: Here we are getting all count. Ask PM and AX team if this correct and wont impact perf.
        if (chartOptions.aggregation === AnalyticsTypes.Chart_Aggregation.Average) {
            queryOptions.$apply = `filter(${filterStr})/groupby((${groupByPeriodColumnStr}, ${groupByPublishContextStr}), aggregate(${aggrOutcomeStr} with sum as TotalOutcomeCount))/
                                            groupby((${groupByPeriodColumnStr}),aggregate(TotalOutcomeCount with average as AggregateTotalOutcomeCount))`;
        }
        else if (chartOptions.aggregation === AnalyticsTypes.Chart_Aggregation.Sum) {
            queryOptions.$apply = `filter(${filterStr})/groupby((${groupByPeriodColumnStr}),aggregate(${aggrOutcomeStr} with sum as AggregateTotalOutcomeCount))`;
        }

        //Append orderBy clause
        queryOptions.$orderby = this._appendOrderByDateClause(periodGroup);

        return {
            queryOptions: queryOptions,
            onSuccess: (data: any) => {
                return data.value.map(record => {                //OData endpoint doesnt return of any type. The properties returned should match Odata model properties (case sensitive match) on AX serverside.
                    let chartData: AnalyticsTypes.IAnalyticsChartData = this._parseODataAPIReturnDateIntoDisplayForm(periodGroup, record);
                    chartData.metricValue = record.AggregateTotalOutcomeCount;
                    return chartData;
                });
            }
        } as AnalyticsTypes.IQueryODataOptions;
    }

    private readonly _entityName: string = "TestRuns";
}

export class TestRunStackByAggregateChartData extends TestChartData {
    public getChartData(projectId: string, publishContextDetails: Contracts.TestResultsContext, repositoryId: string, branchName: string, chartOptions: AnalyticsTypes.ISingleChartOptions,
        periodGroup: AnalyticsTypes.Chart_PeriodGroup, periodGroupValue: number, stackBy: AnalyticsTypes.Chart_StackBy): AnalyticsTypes.IQueryODataOptions {
        switch (chartOptions.metric) {
            case AnalyticsTypes.Chart_Metric.Duration:
                return this._getTestDurationAggregates(projectId, publishContextDetails, repositoryId, branchName, chartOptions, periodGroup, periodGroupValue, stackBy);
            case AnalyticsTypes.Chart_Metric.Count:
                return this._getTestCountAggregates(projectId, publishContextDetails, repositoryId, branchName, chartOptions, periodGroup, periodGroupValue, stackBy);
        }

        return null;
    }

    private _getTestDurationAggregates(projectId: string, publishContextDetails: Contracts.TestResultsContext, repositoryId: string, branchName: string, chartOptions: AnalyticsTypes.ISingleChartOptions,
        periodGroup: AnalyticsTypes.Chart_PeriodGroup, periodGroupValue: number, stackBy: AnalyticsTypes.Chart_StackBy): AnalyticsTypes.IQueryODataOptions {
        let queryOptions = {
            entityType: this._entityName,
            project: projectId
        } as ODataQueryOptions;

        let filterStr: string = this._getFilterDetailsString(publishContextDetails, repositoryId, branchName, chartOptions, periodGroup, periodGroupValue);
        let groupByPeriodColumnStr: string = this._getGroupByPeriodColumnString(periodGroup);
        let groupByStackString: string = this._getGroupByStackString(chartOptions.stackBy);

        if (chartOptions.aggregation === AnalyticsTypes.Chart_Aggregation.Average) {
            queryOptions.$apply = `filter(${filterStr})/groupby((${groupByPeriodColumnStr}, ${groupByStackString}),aggregate(ResultDurationSeconds with average as AggregateDuration))`;
        }
        else if (chartOptions.aggregation === AnalyticsTypes.Chart_Aggregation.Sum) {
            queryOptions.$apply = `filter(${filterStr})/groupby((${groupByPeriodColumnStr}, ${groupByStackString}),aggregate(ResultDurationSeconds with sum as AggregateDuration))`;
        }

        //Append orderBy clause
        queryOptions.$orderby = this._appendOrderByDateClause(periodGroup);

        return {
            queryOptions: queryOptions,
            onSuccess: (data: any) => {
                return data.value.map(record => {                //OData endpoint doesnt return of any type. The properties returned should match Odata model properties (case sensitive match) on AX serverside.
                    let chartData: AnalyticsTypes.IAnalyticsChartData = this._parseODataAPIReturnDateIntoDisplayForm(periodGroup, record);

                    chartData.stackByValue = this._getGroupByStackValue(chartOptions.stackBy, record);
                    chartData.metricValue = this._getDurationInTimespanFormat(record.AggregateDuration);

                    return chartData;
                });
            }
        } as AnalyticsTypes.IQueryODataOptions;
    }

    private _getTestCountAggregates(projectId: string, publishContextDetails: Contracts.TestResultsContext, repositoryId: string, branchName: string, chartOptions: AnalyticsTypes.ISingleChartOptions,
        periodGroup: AnalyticsTypes.Chart_PeriodGroup, periodGroupValue: number, stackBy: AnalyticsTypes.Chart_StackBy): AnalyticsTypes.IQueryODataOptions {
        let queryOptions = {
            entityType: this._entityName,
            project: projectId
        } as ODataQueryOptions;

        let filterStr: string = this._getFilterDetailsString(publishContextDetails, repositoryId, branchName, chartOptions, periodGroup, periodGroupValue);
        let groupByPeriodColumnStr: string = this._getGroupByPeriodColumnString(periodGroup);
        let aggrOutcomeStr: string = this._getOutcomeCountFieldForAggregation(chartOptions.outcome);
        let groupByStackString: string = this._getGroupByStackString(chartOptions.stackBy);

        //Triage: Here we are getting all count. Ask PM and AX team if this correct and wont impact perf.
        if (chartOptions.aggregation === AnalyticsTypes.Chart_Aggregation.Average) {
            queryOptions.$apply = `filter(${filterStr})/groupby((${groupByPeriodColumnStr}, ${groupByStackString}), aggregate(${aggrOutcomeStr} with average as AggregateTestCount))`;
        }
        else if (chartOptions.aggregation === AnalyticsTypes.Chart_Aggregation.Sum) {
            queryOptions.$apply = `filter(${filterStr})/groupby((${groupByPeriodColumnStr}, ${groupByStackString}),aggregate(${aggrOutcomeStr} with sum as AggregateTestCount))`;
        }

        //Append orderBy clause
        queryOptions.$orderby = this._appendOrderByDateClause(periodGroup);

        return {
            queryOptions: queryOptions,
            onSuccess: (data: any) => {
                return data.value.map(record => {                //OData endpoint doesnt return of any type. The properties returned should match Odata model properties (case sensitive match) on AX serverside.
                    let chartData: AnalyticsTypes.IAnalyticsChartData = this._parseODataAPIReturnDateIntoDisplayForm(periodGroup, record);
                    chartData.stackByValue = this._getGroupByStackValue(chartOptions.stackBy, record);
                    chartData.metricValue = record.AggregateTestCount;
                    return chartData;
                });
            }
        } as AnalyticsTypes.IQueryODataOptions;
    }

    private readonly _entityName: string = "TestRuns";
}

export class TestRunGroupByAggregateChartData extends TestChartData {
    public getChartData(projectId: string, publishContextDetails: Contracts.TestResultsContext, repositoryId: string, branchName: string, chartOptions: AnalyticsTypes.ISingleChartOptions,
        periodGroup: AnalyticsTypes.Chart_PeriodGroup, periodGroupValue: number): AnalyticsTypes.IQueryODataOptions {
        switch (chartOptions.metric) {
            case AnalyticsTypes.Chart_Metric.Duration:
                return this._getTestDurationAggregates(projectId, publishContextDetails, repositoryId, branchName, chartOptions, periodGroup, periodGroupValue);
            case AnalyticsTypes.Chart_Metric.Rate:
                return this._getTestRateAggregates(projectId, publishContextDetails, repositoryId, branchName, chartOptions, periodGroup, periodGroupValue);
            case AnalyticsTypes.Chart_Metric.Count:
                return this._getTestCountAggregates(projectId, publishContextDetails, repositoryId, branchName, chartOptions, periodGroup, periodGroupValue);
        }

        return null;
    }

    private _getTestDurationAggregates(projectId: string, publishContextDetails: Contracts.TestResultsContext, repositoryId: string, branchName: string, chartOptions: AnalyticsTypes.ISingleChartOptions,
        periodGroup: AnalyticsTypes.Chart_PeriodGroup, periodGroupValue: number): AnalyticsTypes.IQueryODataOptions {
        let queryOptions = {
            entityType: this._entityName,
            project: projectId
        } as ODataQueryOptions;

        let filterStr: string = this._getFilterDetailsString(publishContextDetails, repositoryId, branchName, chartOptions, periodGroup, periodGroupValue);
        let groupByPublishContextStr: string = this._getGroupByPublishContextString(publishContextDetails.contextType);
        let groupByStackString: string = this._getGroupByStackString(chartOptions.stackBy);

        if (chartOptions.aggregation === AnalyticsTypes.Chart_Aggregation.Average) {
            queryOptions.$apply = `filter(${filterStr})/groupby((${groupByStackString}, ${groupByPublishContextStr}),aggregate(ResultDurationSeconds with sum as TotalDuration))
                                    /groupby((${groupByStackString}),aggregate(TotalDuration with average as AggregateDuration))`;
        }
        else if (chartOptions.aggregation === AnalyticsTypes.Chart_Aggregation.Sum) {
            queryOptions.$apply = `filter(${filterStr})/groupby((${groupByStackString}),aggregate(ResultDurationSeconds with sum as AggregateDuration))`;
        }

        //Append orderBy clause
        queryOptions.$orderby = "AggregateDuration desc";

        return {
            queryOptions: queryOptions,
            onSuccess: (data: any) => {
                return data.value.map(record => {                //OData endpoint doesnt return of any type. The properties returned should match Odata model properties (case sensitive match) on AX serverside.
                    return {
                        stackByValue: this._getGroupByStackValue(chartOptions.stackBy, record),
                        metricValue: this._getDurationInTimespanFormat(record.AggregateDuration)
                    } as AnalyticsTypes.IAnalyticsChartData;
                });
            }
        } as AnalyticsTypes.IQueryODataOptions;
    }

    private _getTestRateAggregates(projectId: string, publishContextDetails: Contracts.TestResultsContext, repositoryId: string, branchName: string, chartOptions: AnalyticsTypes.ISingleChartOptions,
        periodGroup: AnalyticsTypes.Chart_PeriodGroup, periodGroupValue: number): AnalyticsTypes.IQueryODataOptions {
        let queryOptions = {
            entityType: this._entityName,
            project: projectId
        } as ODataQueryOptions;

        let filterStr: string = this._getFilterDetailsString(publishContextDetails, repositoryId, branchName, chartOptions, periodGroup, periodGroupValue);
        let groupByPublishContextStr: string = this._getGroupByPublishContextString(publishContextDetails.contextType);
        let groupByStackString: string = this._getGroupByStackString(chartOptions.stackBy);

        //Triage: Here we are getting all count. Ask PM and AX team if this correct and wont impact perf.
        if (chartOptions.aggregation === AnalyticsTypes.Chart_Aggregation.Average) {
            queryOptions.$apply = `filter(${filterStr})/groupby((${groupByStackString}, ${groupByPublishContextStr}),aggregate(ResultCount with sum as TotalTests, ResultPassCount with sum as TotalPassedTests,
                                        ResultFailCount with sum as TotalFailedTests))/groupby((${groupByStackString}),
                                        aggregate(TotalTests with average as AggregateTotalTests, TotalPassedTests with average as AggregateTotalPassedTests, TotalFailedTests with average as AggregateTotalFailedTests))`;
        }
        else if (chartOptions.aggregation === AnalyticsTypes.Chart_Aggregation.Sum) {
            queryOptions.$apply = `filter(${filterStr})/groupby((${groupByStackString}),aggregate(ResultCount with sum as AggregateTotalTests, ResultPassCount with sum as AggregateTotalPassedTests,
                                        ResultFailCount with sum as AggregateTotalFailedTests))`;
        }

        return {
            queryOptions: queryOptions,
            onSuccess: (data: any): AnalyticsTypes.IAnalyticsChartData[] => {
                return data.value.map(record => {                //OData endpoint doesnt return of any type. The properties returned should match Odata model properties (case sensitive match) on AX serverside.
                    let chartData: AnalyticsTypes.IAnalyticsChartData = {} as AnalyticsTypes.IAnalyticsChartData;
                    chartData.stackByValue = this._getGroupByStackValue(chartOptions.stackBy, record);

                    switch (chartOptions.outcome) {
                        case AnalyticsTypes.Chart_Outcome.All:      //For all we will give pass percentage 
                            chartData.metricValue = (record.AggregateTotalPassedTests * 100) / record.AggregateTotalTests;
                            break;
                        case AnalyticsTypes.Chart_Outcome.Pass:
                            chartData.metricValue = (record.AggregateTotalPassedTests * 100) / record.AggregateTotalTests;
                            break;
                        case AnalyticsTypes.Chart_Outcome.Fail:
                            chartData.metricValue = (record.AggregateTotalFailedTests * 100) / record.AggregateTotalTests;
                            break;
                    }

                    return chartData;
                });
            }
        } as AnalyticsTypes.IQueryODataOptions;
    }

    private _getTestCountAggregates(projectId: string, publishContextDetails: Contracts.TestResultsContext, repositoryId: string, branchName: string, chartOptions: AnalyticsTypes.ISingleChartOptions,
        periodGroup: AnalyticsTypes.Chart_PeriodGroup, periodGroupValue: number): AnalyticsTypes.IQueryODataOptions {
        let queryOptions = {
            entityType: this._entityName,
            project: projectId
        } as ODataQueryOptions;

        let filterStr: string = this._getFilterDetailsString(publishContextDetails, repositoryId, branchName, chartOptions, periodGroup, periodGroupValue);
        let groupByPublishContextStr: string = this._getGroupByPublishContextString(publishContextDetails.contextType);
        let aggrOutcomeStr: string = this._getOutcomeCountFieldForAggregation(chartOptions.outcome);
        let groupByStackString: string = this._getGroupByStackString(chartOptions.stackBy);

        //Triage: Here we are getting all count. Ask PM and AX team if this correct and wont impact perf.
        if (chartOptions.aggregation === AnalyticsTypes.Chart_Aggregation.Average) {
            queryOptions.$apply = `filter(${filterStr})/groupby((${groupByStackString}), aggregate(${aggrOutcomeStr} with average as AggregateTestCount))`;
        }
        else if (chartOptions.aggregation === AnalyticsTypes.Chart_Aggregation.Sum) {
            queryOptions.$apply = `filter(${filterStr})/groupby((${groupByStackString}),aggregate(${aggrOutcomeStr} with sum as AggregateTestCount))`;
        }

        //Append orderBy clause
        queryOptions.$orderby = "AggregateTestCount desc";

        return {
            queryOptions: queryOptions,
            onSuccess: (data: any) => {
                return data.value.map(record => {                //OData endpoint doesnt return of any type. The properties returned should match Odata model properties (case sensitive match) on AX serverside.
                    return {
                        stackByValue: this._getGroupByStackValue(chartOptions.stackBy, record),
                        metricValue: record.AggregateTestCount
                    } as AnalyticsTypes.IAnalyticsChartData;
                });
            }
        } as AnalyticsTypes.IQueryODataOptions;
    }

    private readonly _entityName: string = "TestRuns";
}