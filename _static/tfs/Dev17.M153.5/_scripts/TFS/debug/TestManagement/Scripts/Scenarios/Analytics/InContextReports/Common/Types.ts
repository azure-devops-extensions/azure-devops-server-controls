import * as Common from "TestManagement/Scripts/Scenarios/Common/Common";
import { FilterState } from "TestManagement/Scripts/Scenarios/Common/TestResultsFilter/TestResults.Filtering.Common";
import * as TCMContracts from "TFS/TestManagement/Contracts";
import * as ComponentBase from "VSS/Flux/Component";

/* Enums region start */

export enum TrendBy {
    Days = 1,
    Weeks
}

export enum Period {
    Days_7 = 1,
    Days_14,
    Days_30
}

export enum GroupBy {
    None = 1,
    Branch,
    Container,
    Environment,
    Owner,
    Outcome,
    Priority,
    TestRun
}

export enum Filter {
    //Defining these as strings as filter fieldName is accepted as string.
    Workflow = "1",
    Branch = "2",
    Environment = "3",
    TestRun = "4",
    Container = "5",
    Owner = "6",
    Outcome = "7"
}

export enum GroupingProperty {
    None = 1,
    Branch,
    Container,
    Environment,
    Owner,
    Priority,
    TestRun,
    Workflow
}

export enum Metric {
    ResultCountAndPassRate,
    ResultCount,
    AvgDuration
}

export enum Workflow {
    Build = 1,
    Release
}

export enum TestOutcome {
    Failed = 1,
    Passed,
    Inconclusive,
    Aborted,
    NotExecuted,
    Error,
    NotImpacted,
    Total
}

/**
 * Determines metric(s) displayed on test trend chart. Similar to Metric above, but with Pass Rate being its own metric
 * instead of being paired with ResultCount.
 */
export enum ChartMetric {
    None,
    ResultCount,
    PassRate,
    AverageDuration,
}

/**
 * Determines which entity to query from AX
 */
export enum QueryEntity {
    TestRuns = 1,
    TestResultsDaily,
    TestResults
}

export enum ColumnIndices {
    Test = 1,
    Passrate,
    AvgDuration,
    TotalCount,
    FailedCount,
    PassedCount,
    InconclusiveCount,
    AbortedCount,
    NotExecutedCount,
    ErrorCount,
    NotImpactedCount,
}

export enum SortOrder {
    Ascending = 1,
    Descending
}

export enum TestHistoryColumnIndices {
    Outcome = 1,
    Date,
    Duration,
    Branch,
    Environment,
}

export enum LoadType {
    PageLoad,                       // New page loading (1st time page loading).
    ReportConfigurationChange,      // Chart loading due to confValue change.
    ChartMetricChange               // Chart loading due to chart pivot change.
}

export enum ViewType {
    NoTestDataView,
    ReportView,
    TestInsightsReportView,
    ErrorView,
    DataNotReadyView
}

export enum GridViewDisplayType {
    Loading,
    Initialized,
    Initializing
}

export enum DataSourceTable {
    TestRun = 1,
    TestResult,
    TestResultDaily
}

/* Enums region end */

/* Interface region start */

/**
 * TODO: Deprecate TCM Contract context and not extend it once no dependency on it. Rather use this interface.
 */
export interface ITestReportContext extends TCMContracts.TestResultsContext {
    contextType: TCMContracts.TestResultsContextType;
    definitionId: number;
    definitionSK?: number;
}

export interface IReportComponentProps extends ComponentBase.Props {
    instanceId?: string;
}

export interface ITestObjectReference {
    id: number;
    name: string;
}

export interface INextDataPageToken {
    token: string;
}

export interface IConfigurationProps {
    options: IDictionaryNumberTo<string>;
}

export interface IReportConfiguration {
    groupBy: GroupBy;
    trendBy: TrendBy;
    period: Period;
    outcomes: TestOutcome[];
    configuredFilters: FilterState;
}

export interface IReportData {
    confValues: IReportConfiguration;
    isCachedData: boolean;
}

export interface ICardMetricsData extends IReportData {
    passPercentage: number | string;
    passedCount: number;
    failedCount: number;
    totalCount: number;
    notExecutedCount: number;
    notImpactedCount: number;
    totalFailingTestsCount: number;
}

export interface ITrendChartAggregateData {
    date: string;
    aggrValue: number;
}

export interface ITrendChartData extends IReportData {
    primaryChartData: IDictionaryStringTo<ITrendChartAggregateData[]>;      //This will be stackby to aggr data
    secondaryChartData?: ITrendChartAggregateData[];
    metricSelected: Metric;
}

export interface IDetailedListData extends IReportData {
    detailedListItems: IDetailedListItem[];
    nextPageToken?: INextDataPageToken;
}

export interface IDetailedListItem extends Common.ITreeItem {
    itemkey: number | string;
    itemName: string;
    passPercentage: number | string;
    avgDuration: number | string;
    avgDurationAriaLabel: string;
    totalCount: number;
    failedCount: number;
    passedCount: number;
    inconclusiveCount: number;
    abortedCount: number;
    notExecutedCount: number;
    notImpactedCount: number;
    errorCount: number;
    parentItemKey?: number | string;
}

export interface IDetailedListGroupData extends IReportData {
    detailedListGroupItem: IDetailedListGroupItem;
}

export interface IDetailedListGroupItem {
    groupItem: IDetailedListItem;
    children: IDetailedListItem[];
    nextPageToken?: INextDataPageToken;
}

export interface IDetailedListColumn {
    column: ColumnIndices;
    sortOrder: SortOrder;
}

export interface ITestContext {
    testIdentifier: string;
    testName: string;
}

export interface ITestHistoryListData extends IReportData {
    testHistoryListItems: ITestHistoryListItem[];
    nextPageToken?: INextDataPageToken;
}

export interface ITestHistoryListItem extends Common.ITreeItem {
    itemkey: ITestResultIdentifier;
    itemName: string;
    outcome: string;
    date: string;
    duration: string | number;
    durationAriaLabel: string;
    branch: string;
    environmentRef: ITestObjectReference;
}

export interface ITestResultIdentifier {
    testRunId: number;
    testResultId: number;
}

export interface INormalizedDuration {
    durationUnitString: string;
    durationValues: number[][];
}

export interface IODataQueryResponse {
    value: any;
    "@odata.nextLink": string;
    isCachedData: boolean;
}

/* Interface region end */