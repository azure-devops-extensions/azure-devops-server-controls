import { ODataQueryOptions } from 'Analytics/Scripts/OData';
import * as DateUtils from 'VSS/Utils/Date';
import { Iteration } from "Analytics/Scripts/CommonClientTypes";
import { QueryUtilities } from 'Widgets/Scripts/DataServices/QueryUtilities';
import * as ArgumentUtils from "Widgets/Scripts/Shared/ArgumentUtilities";
import { ModefulValueSetting } from 'Widgets/Scripts/Shared/ModefulValueSetting';
import { VelocityQueryBase } from 'Widgets/Scripts/Velocity/Queries/VelocityQueryBase';
import { Metastate } from 'Widgets/Scripts/Velocity/VelocityDataContract';
import { VelocityDataHelper } from 'Widgets/Scripts/Velocity/VelocityDataHelper';
import { AggregationMode } from "Widgets/Scripts/ModernWidgetTypes/CommonConfigurationTypes";

export class CompletedLateMetastateByIterationsQuery extends VelocityQueryBase<Metastate[]>{
    private static readonly dateTimeOffsetPattern: string = "yyyy-MM-dd'T'HH:mm:sszzz";

    constructor(projectId: string, teamId: string, iterations: Iteration[], aggregation: ModefulValueSetting<AggregationMode, string>, workItemTypes: string[], delay?: number) {
        ArgumentUtils.CheckString(projectId, "projectId");
        ArgumentUtils.CheckString(teamId, "teamId");
        ArgumentUtils.CheckObjectArray(iterations, "iterations");
        ArgumentUtils.CheckObject(aggregation, "aggregation");
        ArgumentUtils.CheckStringArray(workItemTypes, "workItemTypes");

        super(CompletedLateMetastateByIterationsQuery.generateQueryOptions(projectId, teamId, iterations, aggregation, workItemTypes, delay));
    }

    protected interpretQueryResults(data: { value: Metastate[] }): Metastate[] {
        // This null filter is only needed because we don't include a 'ne null' filter for effort in the query.
        // As of this writing the reason we don't include it in the query is to get better SQL perf.
        // That may or may not change in the future.
        return data.value.filter(metastate => metastate.AggregationResult != null);
    }

    private static generateQueryOptions(projectId: string, teamId: string, iterations: Iteration[], aggregation: ModefulValueSetting<AggregationMode, string>, workItemTypes: string[], delay?: number): ODataQueryOptions {
        const iterationAndCompletedDateClause = CompletedLateMetastateByIterationsQuery.generateIterationAndCompletedDateClause(iterations, delay);
        const workItemTypeClause = QueryUtilities.isInArray("WorkItemType", workItemTypes, true /* useQuotes */);

        let $apply = `filter(`
            + `Teams/any(t:t/TeamSK eq ${teamId})`
            + ` and (${workItemTypeClause})`
            + ` and StateCategory eq 'Completed'`
            + ` and ${iterationAndCompletedDateClause}`;

        const aggregationClause = VelocityDataHelper.getQueryAggregation(aggregation);
        $apply += `)/groupby((StateCategory, IterationSK),${aggregationClause})`;

        return {
            entityType: "WorkItems",
            oDataVersion: VelocityQueryBase.axODataVersion,
            project: projectId,
            $apply: $apply
        };
    }

    public static generateIterationAndCompletedDateClause(iterations: Iteration[], delay?: number) {
        ArgumentUtils.CheckObjectArray(iterations, "iterations");

        let iterationAndCompletedDateClause = "";
        if (delay == null || delay === 0) {
            const isInAnyIteration = QueryUtilities.isInArray(
                "IterationSK",
                iterations.map(iteration => iteration.IterationSK));

            iterationAndCompletedDateClause = `(${isInAnyIteration}) and CompletedDate gt Iteration/EndDate`;
        } else {
            const isInAnyIterationAndCompletedAfterDelayedDate = QueryUtilities.isInArray(
                "(IterationSK",
                iterations.map(iteration => {
                    const delayedDateTimeOffsetString = CompletedLateMetastateByIterationsQuery.getDelayedDateTimeOffset(iteration.EndDateTimeOffset, delay);
                    return `${iteration.IterationSK} and CompletedDate gt ${delayedDateTimeOffsetString})`;
                }));

            iterationAndCompletedDateClause = `(${isInAnyIterationAndCompletedAfterDelayedDate})`;
        }
        return iterationAndCompletedDateClause;
    }

    private static getDelayedDateTimeOffset(iterationEndDateTimeOffset: string, delay: number): string {
        const parsedDateTimeOffset = DateUtils.parseDateString(iterationEndDateTimeOffset, /* format */ null, /* ignoreTimeZone */ false);
        const delayedDate = DateUtils.addDays(parsedDateTimeOffset, delay, /* adjustOffset */ true);
        const delayedDateString = DateUtils.format(delayedDate, CompletedLateMetastateByIterationsQuery.dateTimeOffsetPattern);

        return delayedDateString;
    }

    public getQueryName(): string {
        return "CompletedLateMetastateByIterationsQuery";
    }
}
