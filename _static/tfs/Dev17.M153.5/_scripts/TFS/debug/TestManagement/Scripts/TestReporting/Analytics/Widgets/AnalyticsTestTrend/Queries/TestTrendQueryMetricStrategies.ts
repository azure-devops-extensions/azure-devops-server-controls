import { ChartMetric, TestOutcome, GroupingProperty, Workflow, QueryEntity } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Common/Types";
import { QueryUtility } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Common/QueryUtility";
import { GroupingPropertyUtility } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Common/GroupingPropertyUtility";
import { IQueryEntity } from "TestManagement/Scripts/TestReporting/Analytics/Widgets/AnalyticsTestTrend/Queries/TestTrendQueryEntityStrategies";
import { TestMetricSettings } from "TestManagement/Scripts/TestReporting/Widgets/Config/Components/TestMetricPickerPropertyDefinition";


/**
 * Algorithms which vary based on the `ChartMetric` used by `TestTrendQuery`
 */
interface IQueryMetric {
    getClauses(chartMetric: TestMetricSettings): string[];
}

/**
 * Common logic used by implementors of `IQueryMetric`
 */
export abstract class QueryMetricBase implements IQueryMetric {
    protected chartMetric: TestMetricSettings;
    protected queryEntityStrategy: IQueryEntity;

    constructor(chartMetric: TestMetricSettings, queryEntityStrategy: IQueryEntity) {
        this.chartMetric = chartMetric;
        this.queryEntityStrategy = queryEntityStrategy;
    }

    abstract getClauses(): string[];
    abstract getFilterNullResultsClause(): string;

    protected getGroupByClause(groupBy: GroupingProperty, groupingProperties: string[], aggregationExpressions: string[]): string {
        if (groupBy != GroupingProperty.None) {
            let propertyName: string = GroupingPropertyUtility.getPropertyName(groupBy);
            if(groupBy === GroupingProperty.TestRun) {
                propertyName = this.queryEntityStrategy.getTestRunProperty();
            }
            groupingProperties.push(propertyName);
        }
        return (
            `groupby(` +
                `(${groupingProperties.join(', ')}), ` +
                `aggregate(` +
                    aggregationExpressions.join(', ') +
                `)` +
            `)`
        );
    }

    protected getGroupClauseForSumOfTestOutcomes(
        testOutcomes: TestOutcome[],
    ): string {
        const testOutcomesExpressions = testOutcomes.map(QueryUtility.getOutcomeCountStringForAggregation);
        return this.getGroupByClause(
            this.chartMetric.groupBy,
            [ this.queryEntityStrategy.getDateProperty() ],
            testOutcomesExpressions,
        );
    }
}

/**
 * Algorithms for `ChartMetric.ResultCount`
 */
class ResultCountQueryMetric extends QueryMetricBase {

    getClauses(): string[] {
        return [
            this.getGroupClause(),
            this.getComputeClause(),
            this.getFilterNullResultsClause(),
        ].filter(clause => clause !== null);
    }

    protected getTestOutcomesToSum(): TestOutcome[] {
        if (this.chartMetric.testOutcomes.length > 0) {
            return this.chartMetric.testOutcomes;
        }
        return [ TestOutcome.Total ];
    }

    private getGroupClause(): string {
        return this.getGroupClauseForSumOfTestOutcomes(
            this.getTestOutcomesToSum()
        );
    }

    protected getComputeClause(): string {
        // Result Count = Sum of all selected outcome counts.
        const sumClauses = this.getTestOutcomesToSum().map(QueryUtility.getOutcomeCountString).join(" add ");
        return `compute(${sumClauses} as Count)`;
    }

    getFilterNullResultsClause() {
        if(this.queryEntityStrategy.getQueryEntity() === QueryEntity.TestResultsDaily) {
            return "filter(Count gt 0)";
        }

        return null;
    }
}

/**
 * Algorithms for `ChartMetric.PassRate`
 */
class PassRateQueryMetric extends ResultCountQueryMetric {

    constructor(chartMetric: TestMetricSettings, queryEntityStrategy: IQueryEntity) {
        if (chartMetric.groupBy != GroupingProperty.None) {
            throw Error("PassRate doesn't support GroupBy");
        }
        super(chartMetric, queryEntityStrategy);
    }

    protected getTestOutcomesToSum(): TestOutcome[] {
        return [TestOutcome.Total, TestOutcome.NotExecuted, TestOutcome.Passed, TestOutcome.NotImpacted];
    }

    protected getComputeClause(): string {
        return null;
    }

    getFilterNullResultsClause() {
        return null;
    }
}

/**
 * Algorithms for `ChartMetric.AverageDuration`
 */
class AverageDurationQueryMetric extends QueryMetricBase {

    private workflow: Workflow;

    constructor(chartMetric: TestMetricSettings, queryEntityStrategy: IQueryEntity, workflow: Workflow) {
        super(chartMetric, queryEntityStrategy);
        this.workflow = workflow;
    }

    getClauses(): string[] {
        const dateProperty = this.queryEntityStrategy.getDateProperty();
        const durationSecondsProperty = this.queryEntityStrategy.getDurationSecondsProperty();
        const workflowSKString = (this.workflow === Workflow.Build) ? 'BuildPipelineSK' : this.queryEntityStrategy.getReleaseSKProperty();
        let clauses = this.queryEntityStrategy.getEntityTypeString() === "TestResultsDaily" ?
            [
                this.getGroupByClause(
                    this.chartMetric.groupBy,
                    [dateProperty, workflowSKString],
                    [`${durationSecondsProperty} div ResultCount with sum as AverageDuration`]
                ),
                this.getFilterNullResultsClause(),
            ].filter(clause => clause !== null) :
            [
                this.getGroupByClause(
                    this.chartMetric.groupBy,
                    [dateProperty, workflowSKString],
                    [`${durationSecondsProperty} with sum as ResultDurationSeconds`]
                ),
                this.getGroupByClause(
                    this.chartMetric.groupBy,
                    [dateProperty],
                    ['ResultDurationSeconds with average as AverageDuration']
                )
            ];

        return clauses;
    }

    getFilterNullResultsClause() {
        if(this.queryEntityStrategy.getEntityTypeString() === "TestResultsDaily") {
            return "filter(AverageDuration gt 0d)";
        }

        return null;
    }
}

/**
 * Algorithms for `ChartMetric.ResultCount` when querying TestResults entity
 */
class ResultCountTestResultsQueryMetric extends QueryMetricBase {

    getClauses(): string[] {
        const groupByClause: string = this.getGroupByClause(
            this.chartMetric.groupBy,
            this.getAdditionalGroupingProperties(),
            [ "$count as Count" ]
        );

        return [
            groupByClause,
            "filter(Count gt 0)"
        ];
    }

    protected getAdditionalGroupingProperties(): string[] {
        return [ this.queryEntityStrategy.getDateProperty() ];
    }

    getFilterNullResultsClause() {
        return "filter(Count gt 0)";
    }
}

/**
 * Algorithms for `ChartMetric.PassRate` when querying TestResults entity
 */
class PassRateTestResultsQueryMetric extends ResultCountTestResultsQueryMetric {

    constructor(chartMetric: TestMetricSettings, queryEntityStrategy: IQueryEntity) {
        if (chartMetric.groupBy != GroupingProperty.None) {
            throw Error("PassRate doesn't support GroupBy");
        }
        super(chartMetric, queryEntityStrategy);
    }

    protected getAdditionalGroupingProperties(): string[] {
        return [ this.queryEntityStrategy.getDateProperty(), "Outcome" ];
    }
}

export const getMetricClauses = (chartMetric: TestMetricSettings, queryEntityStrategy: IQueryEntity, workflow: Workflow) => {
    const queriesTestResultsEntity = queryEntityStrategy.getQueryEntity() === QueryEntity.TestResults;
    let queryMetric = null;
    switch(chartMetric.metric) {
        case(ChartMetric.PassRate): {
            if(queriesTestResultsEntity) {
                queryMetric = new PassRateTestResultsQueryMetric(chartMetric, queryEntityStrategy);
            } else {
                queryMetric = new PassRateQueryMetric(chartMetric, queryEntityStrategy);
            }
            break;
        }
        case(ChartMetric.ResultCount): {
            if(queriesTestResultsEntity) {
                queryMetric = new ResultCountTestResultsQueryMetric(chartMetric, queryEntityStrategy);
            } else {
                queryMetric = new ResultCountQueryMetric(chartMetric, queryEntityStrategy);
            }
            break;
        }
        case(ChartMetric.AverageDuration): {
            queryMetric = new AverageDurationQueryMetric(chartMetric, queryEntityStrategy, workflow);
            break;
        }
        default: {
            throw new Error(`Unexpected metric: ${chartMetric.metric}`);
        }
    }

    return queryMetric.getClauses(chartMetric);
}