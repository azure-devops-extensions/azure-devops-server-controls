import { AnalyticsTestTrendSettings, AnalyticsTestTrendCoreSettings } from "TestManagement/Scripts/TestReporting/Analytics/Widgets/AnalyticsTestTrend/AnalyticsTestTrendSettings";
import { GroupingPropertyUtility } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Common/GroupingPropertyUtility";
import * as Utils_Date from "VSS/Utils/Date";
import { DateSKParser } from "Analytics/Scripts/DateSKParser";
import { QueryUtilities } from 'Widgets/Scripts/DataServices/QueryUtilities';
import { GroupingProperty, QueryEntity, TestOutcome, ChartMetric } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Common/Types";
import { Filters } from "TestManagement/Scripts/TestReporting/Widgets/Config/Components/Filters";
import { Workflow } from 'TestManagement/Scripts/Scenarios/Analytics/InContextReports/Common/Types';
import { TestMetricSettings } from "TestManagement/Scripts/TestReporting/Widgets/Config/Components/TestMetricPickerPropertyDefinition";
import { TestOutcomeUtility } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Common/TestOutcomeUtility";

export interface IQueryEntity {
    getDateProperty(): string;
    getTestRunProperty(): string;
    getReleaseSKProperty(): string;
    getEntityTypeString(): string;
    getQueryEntity(): QueryEntity;
    getFilterClause(workflowFilters: Workflow[]): string;
    getDurationSecondsProperty(): string
}

/**
 * Common logic used by implementors of IQueryEntity.
 * Each implementor is responsible for providing the appropriate
 * filter clauses and equivalent property strings given a particular entity.
 */
abstract class QueryEntityBase implements IQueryEntity {
    protected settings: AnalyticsTestTrendCoreSettings;
    protected options: {
        metric: TestMetricSettings
    }

    constructor(settings: AnalyticsTestTrendCoreSettings, options?: {metric: TestMetricSettings}) {
        this.settings = settings;
        this.options = options;
    }

    abstract getDateProperty(): string;
    abstract getTestRunProperty(): string;
    abstract getQueryEntity(): QueryEntity;

    getReleaseSKProperty(): string {
        return "ReleasePipelineSK";
    }

    protected getBuildPipelineProperty(): string {
        return "BuildPipeline/BuildPipelineId";
    }

    protected getReleasePipelineProperty(): string {
        return "ReleasePipeline/ReleasePipelineId";
    }

    // Generate query fragment for lookback date.
    protected getDateFilterClause(): string {
        const now: Date = Utils_Date.shiftToLocal(new Date());
        const lookBackDate: Date = Utils_Date.addDays(now, -(this.settings.timePeriodInDays - 1));
        const lookBackDateSK = DateSKParser.dateStringToDateSK(Utils_Date.format(lookBackDate, DateSKParser.dateStringFormat));
        return `${this.getDateProperty()} ge ${lookBackDateSK}`;
    }

    // Generate build definitions filter clause.
    protected getBuildFilterClause(): string {
        if (this.settings.buildPipelines.length > 0) {
            let buildDefinitionIds = this.settings.buildPipelines
                .map(buildPipeline => String(buildPipeline.BuildDefinitionId));
            const buildDefinitionsClause = QueryUtilities.isInArray('BuildPipeline/BuildPipelineId', buildDefinitionIds, false /* useQuotes */);
            return `(${buildDefinitionsClause})`;
        }
    }

    // Generate release definitions filter clause.
    protected getReleaseFilterClause(): string {
        if (this.settings.releasePipelines.length > 0) {
            let releaseDefinitionIds = this.settings.releasePipelines
                .map(releasePipeline => String(releasePipeline.ReleaseDefinitionId));
            const releaseDefinitionsClause = QueryUtilities.isInArray(this.getReleasePipelineProperty(), releaseDefinitionIds, false /* useQuotes */);
            return `(${releaseDefinitionsClause})`;
        }
    }

    protected getSelectedFilterClauses(): string[] {
        const settingsWithFilters: AnalyticsTestTrendSettings = this.settings as AnalyticsTestTrendSettings;
        const filters: Filters = settingsWithFilters.filters;

        let filterClauses: string[] = [];
        if(filters) {
            Object.keys(filters).forEach(key => {
                if (key === "workflows") {
                    // This is already handled in getWorkflowFilterClause
                    return;
                }
                if(filters[key].length > 0) {
                    const groupingProperty: GroupingProperty = GroupingPropertyUtility.getGroupingPropertyFromFilterPropertyName(key);
                    let propertyName: string = GroupingPropertyUtility.getPropertyName(groupingProperty);
                    if(groupingProperty === GroupingProperty.TestRun) {
                        propertyName = this.getTestRunProperty();
                    }          
                    const filterClause = QueryUtilities.isInArray(propertyName, filters[key].map(entry => entry.name), true /* useQuotes */)
                    filterClauses.push(`(${filterClause})`);
                }
            });
        }
        return filterClauses;
    }

    public getWorkflowFilter(workflowFilters: Workflow[]): Workflow {
        switch (this.settings.workflow) {
            case Workflow.Build:
                if (workflowFilters.length === 1) {
                    return workflowFilters[0];
                }
                return 0; // No filter
            case Workflow.Release:
                return this.settings.workflow;
            default:
                throw new Error(`Unsupported workflow: ${Workflow[this.settings.workflow]}`);
        }
    }

    private getWorkflowFilterClause(workflowFilters: Workflow[]): string {
        const workflowFilter = this.getWorkflowFilter(workflowFilters);
        if (!workflowFilter) {
            return null; // No filter
        }
        const workflowFilterPropertyValue = (workflowFilter === Workflow.Build) ? `Build` : `Release`;
        const workflowFilterClause = `Workflow eq '${workflowFilterPropertyValue}'`;
        return workflowFilterClause;
    }

    public getFilterClauses(workflowFilters: Workflow[]): string[] {
        let filterClauses: string[] = [];
        filterClauses.push(this.getDateFilterClause());

        let workflowFilterClause = this.getWorkflowFilterClause(workflowFilters);
        if (workflowFilterClause) {
            filterClauses.push(workflowFilterClause);
        }

        const pipelineFilterClause = (this.settings.workflow === Workflow.Build) ? this.getBuildFilterClause() : this.getReleaseFilterClause();
        filterClauses.push(pipelineFilterClause);

        if(Object.keys(this.settings).indexOf("filters") > -1) {
            filterClauses = [...filterClauses, ...this.getSelectedFilterClauses()];
        }

        return filterClauses;
    }

    public getFilterClause(workflowFilters: Workflow[]): string {
        return QueryUtilities.getQueryFragmentFromClauses(`filter`, this.getFilterClauses(workflowFilters), `and`);
    }

    public getDurationSecondsProperty(): string {
        return "ResultDurationSeconds";
    }

    public getEntityTypeString(): string {
        return QueryEntity[this.getQueryEntity()];
    }

}

class TestRunsQueryEntity extends QueryEntityBase {
    getDateProperty(): string {
        return "CompletedDateSK";
    }

    getTestRunProperty(): string {
        return GroupingPropertyUtility.getPropertyName(GroupingProperty.TestRun);
    }

    getQueryEntity(): QueryEntity {
        return QueryEntity.TestRuns;
    }
}

class TestResultsDailyQueryEntity extends QueryEntityBase {
    getDateProperty(): string {
        return "DateSK";
    }

    getReleaseSKProperty(): string {
        return "ReleasePipelineSK";
    }
    getTestRunProperty(): string {
        return null;
    }

    getQueryEntity(): QueryEntity {
        return QueryEntity.TestResultsDaily;
    }
}

class TestResultsQueryEntity extends TestRunsQueryEntity {
    getDateProperty(): string {
        return `TestRun/${super.getDateProperty()}`;
    }

    getTestRunProperty(): string {
        return `TestRun/${super.getTestRunProperty()}`;
    }

    getQueryEntity(): QueryEntity {
        return QueryEntity.TestResults;
    }

    getFilterClause(workflowFilters: Workflow[]): string {
        let filterClauses: string[] = this.getFilterClauses(workflowFilters);
        if (this.options.metric.metric !== ChartMetric.PassRate) {
            const testOutcomes: string[] = this.options.metric.testOutcomes.map(testOutcome => TestOutcomeUtility.getPropertyString(testOutcome));
            filterClauses = [
                ...filterClauses,
                QueryUtilities.isInArray("Outcome", testOutcomes, true /* useQuotes */)
            ];
        }
        return QueryUtilities.getQueryFragmentFromClauses(`filter`, filterClauses, `and`);
    }

    getDurationSecondsProperty(): string {
        return "DurationSeconds";
    }
}

export const getQueryEntityStrategy = (settings: AnalyticsTestTrendCoreSettings, groupingProperty: GroupingProperty, options?: {metric: TestMetricSettings}): IQueryEntity => {
    const queryEntity = GroupingPropertyUtility.getQueryEntity(settings, groupingProperty);
    switch(queryEntity) {
        case QueryEntity.TestRuns: {
            return new TestRunsQueryEntity(settings, options);
        }
        case QueryEntity.TestResultsDaily: {
            return new TestResultsDailyQueryEntity(settings, options);
        }
        case QueryEntity.TestResults: {
            return new TestResultsQueryEntity(settings, options);
        }
        default: {
            throw new Error(`Unsupported query entity: ${queryEntity}`);
        }
    }
}