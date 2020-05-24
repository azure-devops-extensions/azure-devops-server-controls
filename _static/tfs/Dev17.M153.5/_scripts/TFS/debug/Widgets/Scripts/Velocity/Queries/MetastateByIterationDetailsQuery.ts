import { ODataQueryOptions } from 'Analytics/Scripts/OData';
import { QueryUtilities } from 'Widgets/Scripts/DataServices/QueryUtilities';
import * as ArgumentUtils from "Widgets/Scripts/Shared/ArgumentUtilities";
import { VelocityQueryBase } from 'Widgets/Scripts/Velocity/Queries/VelocityQueryBase';
import { WorkItemWithState } from 'Widgets/Scripts/Velocity/VelocityDataContract';

export class MetastateByIterationDetailsQuery extends VelocityQueryBase<WorkItemWithState[]>{
    constructor(iterationId: string, projectId: string, teamId: string, workItemTypes: string[]) {
        ArgumentUtils.CheckString(iterationId, "iterationId");
        ArgumentUtils.CheckString(projectId, "projectId");
        ArgumentUtils.CheckString(teamId, "teamId");
        ArgumentUtils.CheckStringArray(workItemTypes, "workItemTypes");

        super(MetastateByIterationDetailsQuery.generateQueryOptions(iterationId, projectId, teamId, workItemTypes));
    }

    private static generateQueryOptions(iterationId: string, projectId: string, teamId: string, workItemTypes: string[]): ODataQueryOptions {
        // $apply
        const iterationsClause = QueryUtilities.isInArray(
            "IterationSK",
            [iterationId]);

        const workItemTypeClause = QueryUtilities.isInArray("WorkItemType", workItemTypes, true /* useQuotes */);

        var $apply = `filter(`
            + `Teams/any(t:t/TeamSK eq ${teamId})`
            + ` and (${workItemTypeClause})`
            + ` and (${iterationsClause})`
            + ` and StateCategory ne null)`;

        return {
            entityType: "WorkItems",
            oDataVersion: VelocityQueryBase.axODataVersion,
            project: projectId,
            $apply: $apply,
            $select: "WorkItemId, StateCategory"
        };
    }

    public getQueryName(): string {
        return "MetastateByIterationDetailsQuery";
    }
}