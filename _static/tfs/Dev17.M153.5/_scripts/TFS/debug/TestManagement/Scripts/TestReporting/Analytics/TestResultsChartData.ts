
import { ODataQueryOptions } from "Analytics/Scripts/OData";

import { TestChartData } from "TestManagement/Scripts/TestReporting/Analytics/TestChartData";
import * as AnalyticsTypes from "TestManagement/Scripts/TestReporting/Analytics/Types";

import Contracts = require("TFS/TestManagement/Contracts");

export class TestResultAggregateChartData extends TestChartData {
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
        let groupByPublishContextStr: string = this._getGroupByPublishContextString(publishContextDetails.contextType);
        let groupByPeriodColumnStr: string = this._getGroupByPeriodColumnString(periodGroup);

        let groupByStackString: string = this._getGroupByStackString(chartOptions.stackBy);

        if (chartOptions.aggregation === AnalyticsTypes.Chart_Aggregation.Average) {
            queryOptions.$apply = `filter(${filterStr})/groupby((${groupByPeriodColumnStr}, ${groupByStackString}, ${groupByPublishContextStr}),aggregate(DurationSeconds with sum as TotalDuration))
                                    /groupby((${groupByPeriodColumnStr}, ${groupByStackString}),aggregate(TotalDuration with average as AggregateDuration))`;
        }
        else if (chartOptions.aggregation === AnalyticsTypes.Chart_Aggregation.Sum) {
            queryOptions.$apply = `filter(${filterStr})/groupby((${groupByPeriodColumnStr}, ${groupByStackString}),aggregate(DurationSeconds with sum as AggregateDuration))`;
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
        let groupByPublishContextStr: string = this._getGroupByPublishContextString(publishContextDetails.contextType);
        let groupByPeriodColumnStr: string = this._getGroupByPeriodColumnString(periodGroup);

        //Append outcome filter only when Stack by is not Outcome.
        if (chartOptions.stackBy != AnalyticsTypes.Chart_StackBy.Outcome) {
            filterStr = this._appendOutcomeFilter(filterStr, chartOptions.outcome);
        }

        let groupByStackString: string = this._getGroupByStackString(chartOptions.stackBy);

        //Triage: Here we are getting all count. Ask PM and AX team if this correct and wont impact perf.
        if (chartOptions.aggregation === AnalyticsTypes.Chart_Aggregation.Average) {
            queryOptions.$apply = `filter(${filterStr})/groupby((${groupByPeriodColumnStr}, ${groupByStackString}, ${groupByPublishContextStr}), aggregate($count as TestCount))
                        /groupby((${groupByPeriodColumnStr}, ${groupByStackString}), aggregate(TestCount with average as AggregateTestCount))`;
        }
        else if (chartOptions.aggregation === AnalyticsTypes.Chart_Aggregation.Sum) {
            queryOptions.$apply = `filter(${filterStr})/groupby((${groupByPeriodColumnStr}, ${groupByStackString}),aggregate($count as AggregateTestCount))`;
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

    private readonly _entityName: string = "TestResults";
}

export class TestResultGroupByAggregateChartData extends TestChartData {
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
            if (chartOptions.stackBy == AnalyticsTypes.Chart_StackBy.Test) {        //for test group by we can directly take average aggregation rather dual aggregation.
                queryOptions.$apply = `filter(${filterStr})/groupby((${groupByStackString}),aggregate(DurationSeconds with average as AggregateDuration))`;
            }
            else {
                queryOptions.$apply = `filter(${filterStr})/groupby((${groupByStackString}, ${groupByPublishContextStr}),aggregate(DurationSeconds with sum as TotalDuration))
                                    /groupby((${groupByStackString}),aggregate(TotalDuration with average as AggregateDuration))`;
            }
        }
        else if (chartOptions.aggregation === AnalyticsTypes.Chart_Aggregation.Sum) {
            queryOptions.$apply = `filter(${filterStr})/groupby((${groupByStackString}),aggregate(DurationSeconds with sum as AggregateDuration))`;
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

        // Add Outcome only when stack by is not Outcome.
        if (chartOptions.stackBy != AnalyticsTypes.Chart_StackBy.Outcome) {
            groupByStackString = groupByStackString.concat(", Outcome");
        }

        //Triage: Here we are getting all count. Ask PM and AX team if this correct and wont impact perf.
        if (chartOptions.aggregation === AnalyticsTypes.Chart_Aggregation.Average) {
            queryOptions.$apply = `filter(${filterStr})/groupby((${groupByStackString}, ${groupByPublishContextStr}), aggregate($count as TestCount))
                                    /groupby((${groupByStackString}),aggregate(TestCount with average as AggregateTestCount))`;
        }
        else if (chartOptions.aggregation === AnalyticsTypes.Chart_Aggregation.Sum) {
            queryOptions.$apply = `filter(${filterStr})/groupby((${groupByStackString}), aggregate($count as AggregateTestCount))`;
        }

        return {
            queryOptions: queryOptions,
            onSuccess: (data: any): AnalyticsTypes.IAnalyticsChartData[] => {

                // If stack by is Outcome we just need to calculate percentage.
                if (chartOptions.stackBy == AnalyticsTypes.Chart_StackBy.Outcome) {
                    let total: number = 0;
                    let results: IDictionaryStringTo<number> = {};
                    data.value.map(record => {

                        results[record.Outcome] = record.AggregateTestCount;
                        total += record.AggregateTestCount;
                    });

                    return Object.keys(results).map(stackBy => {

                        let chartData: AnalyticsTypes.IAnalyticsChartData = {} as AnalyticsTypes.IAnalyticsChartData;
                        chartData.stackByValue = stackBy;
                        chartData.metricValue = (results[stackBy] * 100) / total;
                        return chartData;
                    });
                }
                else {
                    //OData endpoint doesnt return of any type. The properties returned should match Odata model properties (case sensitive match) on AX serverside.
                    let stackByToOutcomeAggrMap: IDictionaryStringTo<{ PassedCount: number, FailedCount: number, TotalCount: number }> = {};
                    data.value.map(record => {
                        let stackByValue: string = this._getGroupByStackValue(chartOptions.stackBy, record);

                        if (!stackByToOutcomeAggrMap[stackByValue]) {
                            stackByToOutcomeAggrMap[stackByValue] = { PassedCount: 0, FailedCount: 0, TotalCount: 0 };
                        }

                        stackByToOutcomeAggrMap[stackByValue].TotalCount += 1;
                        switch (record.Outcome) {
                            case Contracts.TestOutcome[Contracts.TestOutcome.Passed]:
                                stackByToOutcomeAggrMap[stackByValue].PassedCount += 1;
                                break;
                            case Contracts.TestOutcome[Contracts.TestOutcome.Failed]:
                                stackByToOutcomeAggrMap[stackByValue].FailedCount += 1;
                                break;
                        }
                    });

                    return Object.keys(stackByToOutcomeAggrMap).map(stackBy => {
                        let chartData: AnalyticsTypes.IAnalyticsChartData = {} as AnalyticsTypes.IAnalyticsChartData;
                        chartData.stackByValue = stackBy;

                        switch (chartOptions.outcome) {
                            case AnalyticsTypes.Chart_Outcome.All:      //For all we will give pass percentage 
                                chartData.metricValue = (stackByToOutcomeAggrMap[stackBy].PassedCount * 100) / stackByToOutcomeAggrMap[stackBy].TotalCount;
                                break;
                            case AnalyticsTypes.Chart_Outcome.Pass:
                                chartData.metricValue = (stackByToOutcomeAggrMap[stackBy].PassedCount * 100) / stackByToOutcomeAggrMap[stackBy].TotalCount;
                                break;
                            case AnalyticsTypes.Chart_Outcome.Fail:
                                chartData.metricValue = (stackByToOutcomeAggrMap[stackBy].FailedCount * 100) / stackByToOutcomeAggrMap[stackBy].TotalCount;
                                break;
                        }

                        return chartData;
                    });
                }
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

        //Append outcome filter
        if (chartOptions.stackBy != AnalyticsTypes.Chart_StackBy.Outcome) {
            filterStr = this._appendOutcomeFilter(filterStr, chartOptions.outcome);
        }

        let groupByStackString: string = this._getGroupByStackString(chartOptions.stackBy);

        //Triage: Here we are getting all count. Ask PM and AX team if this correct and wont impact perf.
        if (chartOptions.aggregation === AnalyticsTypes.Chart_Aggregation.Average) {
            queryOptions.$apply = `filter(${filterStr})/groupby((${groupByStackString}, ${groupByPublishContextStr}), aggregate($count as TestCount))
                        /groupby((${groupByStackString}), aggregate(TestCount with average as AggregateTestCount))`;
        }
        else if (chartOptions.aggregation === AnalyticsTypes.Chart_Aggregation.Sum) {
            queryOptions.$apply = `filter(${filterStr})/groupby((${groupByStackString}),aggregate($count as AggregateTestCount))`;
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

    private readonly _entityName: string = "TestResults";
}