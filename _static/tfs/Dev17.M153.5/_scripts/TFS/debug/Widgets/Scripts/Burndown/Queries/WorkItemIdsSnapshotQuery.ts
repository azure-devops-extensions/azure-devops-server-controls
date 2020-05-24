import { DateSKParser } from "Analytics/Scripts/DateSKParser";
import { ODataQueryOptions } from "Analytics/Scripts/OData";
import { WitFieldUtilities } from "Analytics/Scripts/WitFieldUtilities";
import * as Utils_Array from "VSS/Utils/Array";
import { WorkItemFieldDescriptor } from "Widgets/Scripts/Burndown/BurndownDataContract";
import { FieldFilter } from "Widgets/Scripts/Burndown/BurndownSettings";
import { BurndownQueryBase } from "Widgets/Scripts/Burndown/Queries/BurndownQueryBase";
import { QueryUtilities } from "Widgets/Scripts/DataServices/QueryUtilities";
import { AggregationMode, TeamScope } from "Widgets/Scripts/ModernWidgetTypes/CommonConfigurationTypes";
import { ModefulValueSetting } from "Widgets/Scripts/Shared/ModefulValueSetting";
import {PublicProjectsQueryHelper} from "Analytics/Scripts/PublicProjectsQueryHelper";


export interface ODataWorkItemSnapshot {
    WorkItemId: string;
}

export class WorkItemIdsSnapshotQuery extends BurndownQueryBase<string[]> {
    constructor(date: string, teamScopes: TeamScope[], filters: FieldFilter[], workItemFieldDescriptors: WorkItemFieldDescriptor[], aggregation: ModefulValueSetting<AggregationMode, string>, queryCompleted: boolean, workItemTypes: string[]) {
        super(WorkItemIdsSnapshotQuery.generateQueryOptions(date, teamScopes, filters, workItemFieldDescriptors, aggregation, queryCompleted, workItemTypes));
    }

    protected interpretQueryResults(data: { value: ODataWorkItemSnapshot[] }): string[] {
        return data.value.map(value => value.WorkItemId);
    }

    private static generateQueryOptions(date: string, teamScopes: TeamScope[], filters: FieldFilter[], workItemFieldDescriptors: WorkItemFieldDescriptor[], aggregation: ModefulValueSetting<AggregationMode, string>, queryCompleted: boolean, workItemTypes: string[]): ODataQueryOptions {
        const teams = Utils_Array.unique(teamScopes.map(scope => scope.teamId));
        const teamsClause = QueryUtilities.isInArray("t/TeamSK", teams, false /* useQuotes */);

        const projects = Utils_Array.unique(teamScopes.map(scope => scope.projectId));
        const projectsClause = QueryUtilities.isInArray("ProjectSK", projects, false /* useQuotes */);

        const dateSK = DateSKParser.dateStringToDateSK(date);
        const datesClause = `DateSK eq ${dateSK}`;

        const filtersClause = QueryUtilities.getFiltersClause(filters, workItemFieldDescriptors);

        const workItemTypesClause = QueryUtilities.isInArray("WorkItemType", workItemTypes, true /* useQuotes */);

        let $apply = `filter(`
            + `(${projectsClause})`
            + ` and Teams/any(t:${teamsClause})`
            + ` and StateCategory ${queryCompleted ? "eq" : "ne"} 'Completed'`
            + ` and (RevisedDateSK eq null or RevisedDateSK gt ${dateSK})` // Added to improve query perf
            + ` and (${datesClause})`
            + ` and (${workItemTypesClause})`;

        if (filtersClause) {
            $apply += ` and (${filtersClause})`;
        }

        if (aggregation.identifier === AggregationMode.Sum) {
            const analyticsEffortFieldName = WitFieldUtilities.getFieldODataPropertyName(aggregation.settings);
            $apply += ` and ${analyticsEffortFieldName} ne null`;
        }

        $apply += ')';

        return PublicProjectsQueryHelper.forceProjectScoping(
            projects,
            {
                entityType: "WorkItemSnapshot",
                oDataVersion: BurndownQueryBase.axODataVersion,
                $apply: $apply,
                $select: "WorkItemId"
            }
        );
    }

    public getQueryName(): string {
        return "WorkItemIdsSnapshotQuery";
    }
}