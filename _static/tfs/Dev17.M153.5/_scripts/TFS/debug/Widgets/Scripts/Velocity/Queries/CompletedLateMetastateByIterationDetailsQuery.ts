import Q = require("q");

import { ODataQueryOptions } from "Analytics/Scripts/OData";
import { Iteration } from "Analytics/Scripts/CommonClientTypes";
import { QueryUtilities } from "Widgets/Scripts/DataServices/QueryUtilities";
import * as ArgumentUtils from "Widgets/Scripts/Shared/ArgumentUtilities";
import { WorkItemWithState } from "Widgets/Scripts/Velocity/VelocityDataContract";
import { CompletedLateMetastateByIterationsQuery } from "Widgets/Scripts/Velocity/Queries/CompletedLateMetastateByIterationsQuery";
import { VelocityQueryBase } from "Widgets/Scripts/Velocity/Queries/VelocityQueryBase";

/**
 * Exposes a list of work items in particular iteration. Used for click-through.
 */
export class CompletedLateMetastateByIterationDetailsQuery extends VelocityQueryBase<WorkItemWithState[]>{
    constructor(iteration: Iteration, projectId: string, teamId: string, workItemTypes: string[], delay?: number) {
        ArgumentUtils.CheckObject(iteration, "iteration");
        ArgumentUtils.CheckString(projectId, "projectId");
        ArgumentUtils.CheckString(teamId, "teamId");
        ArgumentUtils.CheckStringArray(workItemTypes, "workItemTypes");

        super(CompletedLateMetastateByIterationDetailsQuery.generateQueryOptions(iteration, projectId, teamId, workItemTypes, delay));
    }

    private static generateQueryOptions(iteration: Iteration, projectId: string, teamId: string, workItemTypes: string[], delay?: number): ODataQueryOptions {
        const iterations = [iteration];
        const iterationAndCompletedDateClause = CompletedLateMetastateByIterationsQuery.generateIterationAndCompletedDateClause(iterations, delay);

        const workItemTypeClause = QueryUtilities.isInArray("WorkItemType", workItemTypes, true /* useQuotes */);

        const $apply = `filter(`
            + `Teams/any(t:t/TeamSK eq ${teamId})`
            + ` and (${workItemTypeClause})`
            + ` and StateCategory eq 'Completed'`
            + ` and ${iterationAndCompletedDateClause})`;

        return {
            entityType: "WorkItems",
            oDataVersion: VelocityQueryBase.axODataVersion,
            project: projectId,
            $apply: $apply,
            $select: "WorkItemId, StateCategory"
        };
    }

    public getQueryName(): string {
        return "CompletedLateMetastateByIterationDetailsQuery";
    }
}
