import { ODataQueryOptions } from 'Analytics/Scripts/OData';
import { Iteration } from 'Analytics/Scripts/CommonClientTypes';
import { QueryUtilities } from 'Widgets/Scripts/DataServices/QueryUtilities';
import { PlannedWorkByDayQuery } from 'Widgets/Scripts/Velocity/Queries/PlannedWorkByDayQuery';
import { VelocityQueryBase } from 'Widgets/Scripts/Velocity/Queries/VelocityQueryBase';
import { WorkItem } from 'Widgets/Scripts/Velocity/VelocityDataContract';

/**
 * Exposes list of Work Items in Planned state for a given iteration.
 */
export class PlannedWorkByDayDetailsQuery extends VelocityQueryBase<WorkItem[]>{

    constructor(projectId: string, teamId: string, iteration: Iteration, workItemTypes: string[], delay: number) {
        super(PlannedWorkByDayDetailsQuery.generateQueryOptions(projectId, teamId, iteration, workItemTypes, delay));
    }

    public getQueryName(): string {
        return "PlannedWorkByDayDetailsQuery";
    }

    private static generateQueryOptions(projectId: string, teamId: string, iteration: Iteration, workItemTypes: string[], delay: number): ODataQueryOptions {
        const isInAnyIterationAtIterationStartDate = PlannedWorkByDayQuery.isInAnyIterationAtStartDate([iteration], delay);

        const iterationAndCompletedDateClause = `(${isInAnyIterationAtIterationStartDate})`;
        const workItemTypeClause = QueryUtilities.isInArray("WorkItemType", workItemTypes, true /* useQuotes */);
        const earliestStartDateSK = PlannedWorkByDayQuery.getDelayedDateSK(iteration.StartDateTimeOffset, delay);

        let $apply = `filter(`
            + `Teams/any(t:t/TeamSK eq ${teamId})`
            + ` and (${workItemTypeClause})`
            + ` and (RevisedDateSK eq null or RevisedDateSK gt ${earliestStartDateSK})` // Added to improve query perf
            + ` and ${iterationAndCompletedDateClause}`
            + ` and StateCategory ne null)`;

        return {
            entityType: "WorkItemSnapshot",
            oDataVersion: VelocityQueryBase.axODataVersion,
            project: projectId,
            $apply: $apply,
            $select: "WorkItemId"
        };
    }
}