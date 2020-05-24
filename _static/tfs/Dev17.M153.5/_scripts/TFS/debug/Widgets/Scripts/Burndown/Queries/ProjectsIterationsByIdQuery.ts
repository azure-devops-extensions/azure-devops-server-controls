import { ODataQueryOptions } from "Analytics/Scripts/OData";
import Q = require("q");
import * as Utils_Array from "VSS/Utils/Array";
import { BurndownQueryBase } from "Widgets/Scripts/Burndown/Queries/BurndownQueryBase";
import { Iteration, ODataIteration } from 'Analytics/Scripts/CommonClientTypes';
import { QueryUtilities } from "Widgets/Scripts/DataServices/QueryUtilities";
import {PublicProjectsQueryHelper} from "Analytics/Scripts/PublicProjectsQueryHelper";

/**
 * Gets iteration details for specified iteration IDs
 */
export class ProjectsIterationsByIdQuery extends BurndownQueryBase<Iteration[]> {
    constructor(
        projectIDs: string[],
        iterationIDs: string[]) {
        super(ProjectsIterationsByIdQuery.generateQueryOptions(projectIDs, iterationIDs));
    }

    /**  Override default behavior, by reversing results  */
    protected interpretQueryResults(data: { value: ODataIteration[] }): Iteration[] {
        return data.value
            .map(odataIteration => {
                return {
                    IterationSK: odataIteration.IterationSK,
                    IterationName: odataIteration.IterationName,
                    IterationPath: odataIteration.IterationPath,
                    StartDateTimeOffset: odataIteration.StartDate,
                    EndDateTimeOffset: odataIteration.EndDate,
                    IsEnded: odataIteration.IsEnded
                }
            })
            .reverse();
    }

    private static generateQueryOptions(projectIDs: string[], iterationIDs: string[]): ODataQueryOptions {

        const projectClause = QueryUtilities.isInArray("ProjectSK", Utils_Array.unique(projectIDs));
        const iterationsClause = QueryUtilities.isInArray("IterationSK", iterationIDs);
        const $filter = `(${projectClause}) and (${iterationsClause})`

        const $orderby = `IsEnded,StartDate desc,EndDate desc,IterationName`;

        const $select = `IterationSK,IterationName,StartDate,EndDate,IsEnded`;

        return PublicProjectsQueryHelper.forceProjectScoping(
            projectIDs,
            {
                entityType: "Iterations",
                oDataVersion: BurndownQueryBase.axODataVersion,
                $filter: $filter,
                $orderby: $orderby,
                $select: $select
            }
        );
    }

    public getQueryName(): string {
        return "ProjectsIterationsByIdQuery";
    }
}

