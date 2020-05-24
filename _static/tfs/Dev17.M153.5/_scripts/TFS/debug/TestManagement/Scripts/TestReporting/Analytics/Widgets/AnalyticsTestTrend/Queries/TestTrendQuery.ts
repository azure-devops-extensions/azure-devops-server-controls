import { AnalyticsTestTrendQueryBase } from "TestManagement/Scripts/TestReporting/Analytics/Widgets/AnalyticsTestTrend/Queries/AnalyticsTestTrendQueryBase";
import { AnalyticsTestTrendSettings } from "TestManagement/Scripts/TestReporting/Analytics/Widgets/AnalyticsTestTrend/AnalyticsTestTrendSettings";
import { AnalyticsODataVersions, ODataQueryOptions } from "Analytics/Scripts/OData";
import { getDefaultWebContext } from "VSS/Context";
import { getQueryEntityStrategy } from "TestManagement/Scripts/TestReporting/Analytics/Widgets/AnalyticsTestTrend/Queries/TestTrendQueryEntityStrategies";
import { getMetricClauses } from "TestManagement/Scripts/TestReporting/Analytics/Widgets/AnalyticsTestTrend/Queries/TestTrendQueryMetricStrategies";
import { TestMetricSettings } from "TestManagement/Scripts/TestReporting/Widgets/Config/Components/TestMetricPickerPropertyDefinition";
import { TestOutcome } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Common/Types";
import { TestOutcomeUtility } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Common/TestOutcomeUtility";
import * as ArrayUtils from 'VSS/Utils/Array';

export interface TestTrendResult {
    CompletedDateSK: number;
    /** This will only be populated if `TestResultCountQuery` is called with `ChartMetric.ResultCount` */
    Count?: number;
    /** These will only be populated if `TestResultCountQuery` is called with `ChartMetric.PassRate` */
    ResultCount?: number;
    ResultNotExecutedCount?: number;
    ResultPassCount?: number;
    ResultNotImpactedCount?: number;
    /** This will only be populated if `TestResultCountQuery` is called with `ChartMetric.AverageDuration` */
    AverageDuration?: number;
    Branch?: {
        BranchName: string
    };
    Title?: string;
    Test?: {
        ContainerName?: string,
        TestOwner?: string,
        Priority?: number
    }
}

interface TestResultsPassRateResult {
    Outcome: string;
    Count: number;
    TestRun: {
        CompletedDateSK: number;
    }
}

/**
 * A specialized OData query for AnalyticsTestTrendWidget
 */
export class TestTrendQuery extends AnalyticsTestTrendQueryBase<TestTrendResult[]> {

    constructor(
        settings: AnalyticsTestTrendSettings,
        chartMetric: TestMetricSettings,
    ) {
        super(TestTrendQuery.generateQueryOptions(settings, chartMetric));
    }

    // This method is public for testability and should never
    // be called directly in production
    public static generateQueryOptions(
        settings: AnalyticsTestTrendSettings,
        chartMetric: TestMetricSettings,
    ): ODataQueryOptions {
        const queryEntityStrategy = getQueryEntityStrategy(settings, chartMetric.groupBy, { metric: chartMetric });
        const filter = queryEntityStrategy.getFilterClause(settings.filters.workflows);

        return {
            entityType: queryEntityStrategy.getEntityTypeString(),
            oDataVersion: AnalyticsODataVersions.v2Preview,
            project: getDefaultWebContext().project.id,
            $apply: [filter, ...getMetricClauses(chartMetric, queryEntityStrategy, settings.workflow)].join("/"),
            $orderby: ` ${queryEntityStrategy.getDateProperty()} asc`,
            followNextLink: true
        } as ODataQueryOptions;
    }

    private shouldCalculateResultCounts(value: any[]): boolean {
        if(value.length === 0) return false;

        return value.every(item => Object.keys(item).indexOf("Outcome") > -1);
    }   

    private getResultCountsFromTestResultsQuery(
        results: TestResultsPassRateResult[]
    ): {[key: number]: Partial<TestTrendResult>} {
        /** 
         * The outcome counts are aggregated for each date.
         * dateSKToOutcomeCounts tracks the count for each outcome for each date
         */
        let dateSKToOutcomeCounts: {[key: number]: {[key: string]: number}} = {};
        
        /**
         * We're only interested in a subset of outcomes for calculating pass rate
         * outcomeCountsTemplate provides the outcomes of interest
         */
        const outcomeCountsTemplate: {[key: string]: number} = {
            [ TestOutcomeUtility.getPropertyString(TestOutcome.NotExecuted) ]: 0,
            [ TestOutcomeUtility.getPropertyString(TestOutcome.Passed) ]: 0,
            [ TestOutcomeUtility.getPropertyString(TestOutcome.NotImpacted) ]: 0,
            [ "Total" ]: 0
        };

        results.forEach(raw => {
            let outcomeCounts = dateSKToOutcomeCounts[raw.TestRun.CompletedDateSK];
            if(!outcomeCounts) {
                outcomeCounts = {...outcomeCountsTemplate};
            }

            // if this an outcome we're interested in, set the count for that outcome
            if(Object.keys(outcomeCounts).indexOf(raw.Outcome) > -1) {
                outcomeCounts[raw.Outcome] = raw.Count;
            }

            outcomeCounts[ "Total" ] += raw.Count;
            dateSKToOutcomeCounts[raw.TestRun.CompletedDateSK] = outcomeCounts;
        });

        // construct expected partial for each date using the outcome counts
        let dateSKToPartial: {[key: number]: Partial<TestTrendResult>} = {};
        Object.keys(dateSKToOutcomeCounts).forEach(dateSK => {
            let entry = dateSKToOutcomeCounts[dateSK];
            dateSKToPartial[dateSK] = {
                ResultCount: entry["Total"],
                ResultNotExecutedCount: entry[TestOutcomeUtility.getPropertyString(TestOutcome.NotExecuted)],
                ResultPassCount: entry[TestOutcomeUtility.getPropertyString(TestOutcome.Passed)],
                ResultNotImpactedCount: entry[TestOutcomeUtility.getPropertyString(TestOutcome.NotImpacted)],
            }
        });

        return dateSKToPartial;
    }

    protected testResultsComparer(a: TestResultsPassRateResult, b: TestResultsPassRateResult): number {
        const dateA = a.TestRun.CompletedDateSK;
        const dateB = b.TestRun.CompletedDateSK;
        return dateA - dateB;
    }

    protected interpretQueryResults(data: {
        value: any;
    }): TestTrendResult[] {
        if(this.shouldCalculateResultCounts(data.value as any[])) {
            const dateSKToResultCounts: {[key: number]: Partial<TestTrendResult>} = this.getResultCountsFromTestResultsQuery(data.value);
            return ArrayUtils.unique((data.value as any[]).map(
                raw => {
                    return {
                        // For a consistent data shape for callers, normalize the date property to CompletedDateSK
                        CompletedDateSK: raw.TestRun.CompletedDateSK, 
                        ...dateSKToResultCounts[raw.TestRun.CompletedDateSK],      
                        ...raw,
                    }
                }
            ), this.testResultsComparer
            );
        }
        return (data.value as any[]).map(
            raw => {
                const dateSK: number = raw.DateSK ? raw.DateSK : raw.TestRun ? raw.TestRun.CompletedDateSK : null;
                const title: string = raw.TestRun ? raw.TestRun.Title : null;
                return {
                    // For a consistent data shape for callers, normalize the date property to CompletedDateSK
                    CompletedDateSK: dateSK,
                    Title: title,
                    ...raw,
                }
            }
        );
    }

    public getQueryName(): string {
        return "TestRunsQuery";
    }
}