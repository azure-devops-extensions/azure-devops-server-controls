import { DateSKParser } from 'Analytics/Scripts/DateSKParser';
import { ODataQueryOptions } from 'Analytics/Scripts/OData';
import { WitFieldUtilities } from 'Analytics/Scripts/WitFieldUtilities';
import * as DateUtils from 'VSS/Utils/Date';
import { Iteration } from 'Analytics/Scripts/CommonClientTypes';
import { QueryUtilities } from 'Widgets/Scripts/DataServices/QueryUtilities';
import { ModefulValueSetting } from 'Widgets/Scripts/Shared/ModefulValueSetting';
import { VelocityQueryBase } from 'Widgets/Scripts/Velocity/Queries/VelocityQueryBase';
import { Work } from 'Widgets/Scripts/Velocity/VelocityDataContract';
import { VelocityDataHelper } from 'Widgets/Scripts/Velocity/VelocityDataHelper';
import { AggregationMode } from "Widgets/Scripts/ModernWidgetTypes/CommonConfigurationTypes";

export class PlannedWorkByDayQuery extends VelocityQueryBase<Work[]>{
    constructor(projectId: string, teamId: string, iterations: Iteration[], aggregation: ModefulValueSetting<AggregationMode, string>, workItemTypes: string[], delay: number) {
        super(PlannedWorkByDayQuery.generateQueryOptions(projectId, teamId, iterations, aggregation, workItemTypes, delay));
    }

    public getQueryName(): string {
        return "PlannedWorkByDayQuery";
    }

    protected interpretQueryResults(data: { value: Work[] }): Work[] {
        // This null filter is only needed because we don't include a 'ne null' filter for effort in the query.
        // As of this writing the reason we don't include it in the query is to get better SQL perf.
        // That may or may not change in the future.
        return data.value.filter(work => work.AggregationResult != null);
    }

    private static generateQueryOptions(projectId: string, teamId: string, iterations: Iteration[], aggregation: ModefulValueSetting<AggregationMode, string>, workItemTypes: string[], delay: number): ODataQueryOptions {
        const isInAnyIterationAtIterationStartDate = PlannedWorkByDayQuery.isInAnyIterationAtStartDate(iterations, delay);

        const iterationAndCompletedDateClause = `(${isInAnyIterationAtIterationStartDate})`;
        const workItemTypeClause = QueryUtilities.isInArray("WorkItemType", workItemTypes, true /* useQuotes */);
        const earliestStartDateSK = PlannedWorkByDayQuery.getEarliestIterationStartDateSK(iterations, delay);

        let $apply = `filter(`
            + `Teams/any(t:t/TeamSK eq ${teamId})`
            + ` and (${workItemTypeClause})`
            + ` and (RevisedDateSK eq null or RevisedDateSK gt ${earliestStartDateSK})` // NOTE: Added as requested by Atlas team to improve query perf
            + ` and ${iterationAndCompletedDateClause}`
            + ` and StateCategory ne null`;

        $apply += `)/groupby((IterationSK),${VelocityDataHelper.getQueryAggregation(aggregation)})`;

        return {
            entityType: "WorkItemSnapshot",
            oDataVersion: VelocityQueryBase.axODataVersion,
            project: projectId,
            $apply: $apply
        };
    }

    /**
     * Returns the earliest start date in the list of iterations as a DateSK
     */
    public static getEarliestIterationStartDateSK(iterations: Iteration[], delay: number): number {
        const dateSKs = iterations.map(iteration => PlannedWorkByDayQuery.getDelayedDateSK(iteration.StartDateTimeOffset, delay));
        return Math.min(...dateSKs);
    }

    public static getDelayedDateSK(iterationStartDate: string, delay: number): number {
        let parsedDate = DateUtils.parseDateString(iterationStartDate, /* format */ null, /* ignoreTimeZone */ false);
        let delayedDate = DateUtils.addDays(parsedDate, delay, /* adjustOffset */ true);
        let delayedDateSK = DateUtils.format(delayedDate, DateSKParser.dateSKFormat);

        return +delayedDateSK;
    }

    /**
     * Generates 3 related clauses to help SQL choose more efficient query plans:
     * -iteration and date (if logical query results, rather than perf were the only concern, this would be the only condition returned by this method)
     * -iterations only
     * -dates only
     * */
    public static isInAnyIterationAtStartDate(iterations: Iteration[], delay: number): string {
        let conditions = [];

        conditions.push(QueryUtilities.isInArray(
            "(IterationSK",
            iterations.map(iteration => {
                let delayedDateSK = PlannedWorkByDayQuery.getDelayedDateSK(iteration.StartDateTimeOffset, delay);
                return `${iteration.IterationSK} and DateSK eq ${delayedDateSK})`
            })));

        conditions.push(QueryUtilities.isInArray(
            "IterationSK",
            iterations.map(iteration => {
                return `${iteration.IterationSK}`
            })));

        conditions.push(QueryUtilities.isInArray(
            "DateSK",
            iterations.map(iteration => {
                let delayedDateSK = PlannedWorkByDayQuery.getDelayedDateSK(iteration.StartDateTimeOffset, delay);
                return `${delayedDateSK}`
            })));

        //Wrap each high level condition with paren, before and'ing them together
        conditions = conditions.map(o => `(${o})`);
        return `(${conditions.join(" and ")})`;
    }
}