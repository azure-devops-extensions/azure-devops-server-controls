import { ODataQueryOptions } from "Analytics/Scripts/OData";
import Q = require("q");
import * as Utils_Array from "VSS/Utils/Array";
import { BurndownQueryBase } from "Widgets/Scripts/Burndown/Queries/BurndownQueryBase";
import { Iteration, ODataIteration } from 'Analytics/Scripts/CommonClientTypes';

import { QueryUtilities } from "Widgets/Scripts/DataServices/QueryUtilities";
import {PublicProjectsQueryHelper} from "Analytics/Scripts/PublicProjectsQueryHelper";

/**
 * Gets list of iterations for a specified date range and project IDs
 */
export class ProjectsIterationsByDateQuery extends BurndownQueryBase<Iteration[]> {
    constructor( projectIDs: string[], startDate: string) {
        super(ProjectsIterationsByDateQuery.generateQueryOptions(projectIDs, startDate));
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

    private static generateQueryOptions(projectIDs: string[], startDate: string): ODataQueryOptions {

        const projectClause = QueryUtilities.isInArray("ProjectSK", Utils_Array.unique(projectIDs));

        const datesClause = `date(StartDate) gt ${startDate}`;
        const $filter = `(${projectClause}) and ${datesClause}`

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
        return "ProjectsIterationsByDateQuery";
    }
}

