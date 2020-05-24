import { ODataQueryOptions } from "Analytics/Scripts/OData";

import { ChartConfigurationOptions as ChartConfigurationBase } from "TestManagement/Scripts/TestReporting/Charts/ChartBase";

/* Enums*/
export enum Chart_Category {
    PRIMARY = 0,
    SECONDARY
}

export enum Chart_Metric {
    Duration = 0,
    Rate,
    Count
}

export enum Chart_Outcome {
    All = 0,
    Pass,
    Fail
}

export enum Chart_StackBy {
    Container = 0,
    Test = 1,
    Owner = 2,
    Outcome = 3,
    Priority = 4, 
    TestRun = 5
}

export enum Chart_PeriodGroup {
    Days = 0,
    Weeks
}

export enum Chart_Aggregation {
    Average = 0,
    Sum
}


/* Interfaces */
export interface IAnalyticsBranchReference {
    branchSK: number;
    branchName: string;
    repositoryId: string;
}

export interface ISingleChartOptions {
    metric?: Chart_Metric;
    stackBy?: Chart_StackBy;
    outcome?: Chart_Outcome;    
    aggregation?: Chart_Aggregation;
}

export interface IAnalyticsChartConfigurationOptions extends ChartConfigurationBase {
    branch?: IAnalyticsBranchReference;
    primaryChartOptions?: ISingleChartOptions;
    secondaryChartOptions?: ISingleChartOptions;
    periodGroup?: Chart_PeriodGroup;
    periodGroupValue?: number;
}

//Triage: Not sure if this will be generic type for all kind of charts that we will bring out from AX.
export interface IAnalyticsChartData {
    date: string;
    stackByValue?: string;
    metricValue: string | number;
}

export interface IAnalyticsGroupChartData {
    primaryChartData: IAnalyticsChartData[];
    secondaryChartData: IAnalyticsChartData[];
}

export interface IAnalyticsChartRenderingOptions {
    chartConfigOptions: IAnalyticsChartConfigurationOptions;
    chartData: IAnalyticsGroupChartData;
}

export interface IQueryODataOptions {
    queryOptions: ODataQueryOptions;
    onSuccess?: (data: any) => IAnalyticsChartData[];
}

export class ChartConstants {
    public static readonly MaxDaysToLookback: number = 30;
    public static readonly MaxWeeksToLookback: number = 12;
    public static readonly BranchAll: string = "<All>";
}