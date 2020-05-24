import { WorkItemTypeFilterMode } from "Widgets/Scripts/Shared/WorkItemTypePicker";
import { WitFieldUtilities } from 'Analytics/Scripts/WitFieldUtilities';
import { DateSKParser } from "Analytics/Scripts/DateSKParser";
import { ODataQueryOptions } from 'Analytics/Scripts/OData';
import { QueryUtilities } from 'Widgets/Scripts/DataServices/QueryUtilities';
import { BurndownQueryBase } from 'Widgets/Scripts/Burndown/Queries/BurndownQueryBase';
import { WorkItemEffort, WorkItemFieldDescriptor } from 'Widgets/Scripts/Burndown/BurndownDataContract';
import { FieldFilter } from 'Widgets/Scripts/Burndown/BurndownSettings';
import { TeamScope, AggregationMode } from "Widgets/Scripts/ModernWidgetTypes/CommonConfigurationTypes";
import * as Utils_Array from "VSS/Utils/Array";
import { ModefulValueSetting } from "Widgets/Scripts/Shared/ModefulValueSetting";
import {PublicProjectsQueryHelper} from "Analytics/Scripts/PublicProjectsQueryHelper";

export interface ODataWorkItemSnapshot {
    WorkItemId: string;
}

export class CompletedWorkItemIdsQuery extends BurndownQueryBase<string[]> {
    constructor(teamScopes: TeamScope[], filters: FieldFilter[], workItemTypes: string[], workItemFieldDescriptors: WorkItemFieldDescriptor[], aggregation: ModefulValueSetting<AggregationMode, string>) {
        super(CompletedWorkItemIdsQuery.generateQueryOptions(teamScopes, filters, workItemTypes, workItemFieldDescriptors, aggregation));
    }

    protected interpretQueryResults(data: { value: ODataWorkItemSnapshot[] }): string[] {
        return data.value.map(value => value.WorkItemId);
    }

    private static generateQueryOptions(teamScopes: TeamScope[], filters: FieldFilter[], workItemTypes: string[], workItemFieldDescriptors: WorkItemFieldDescriptor[], aggregation: ModefulValueSetting<AggregationMode, string>): ODataQueryOptions {

        const projects = Utils_Array.unique(teamScopes.map(scope => scope.projectId));
        const projectsClause = QueryUtilities.isInArray("ProjectSK", projects, false /* useQuotes */);

        const teams = Utils_Array.unique(teamScopes.map(scope => scope.teamId));
        const teamsClause = QueryUtilities.isInArray("t/TeamSK", teams, false /* useQuotes */);

        const workItemTypesClause = QueryUtilities.isInArray("WorkItemType", workItemTypes, true /* useQuotes */);

        let $apply = `filter(`
            + `(${projectsClause})`
            + ` and Teams/any(t:${teamsClause})`
            + ` and StateCategory eq 'Completed'`
            + ` and (${workItemTypesClause})`;

        if (aggregation.identifier === AggregationMode.Sum) {
            const analyticsEffortFieldName = WitFieldUtilities.getFieldODataPropertyName(aggregation.settings);
            $apply += ` and ${analyticsEffortFieldName} ne null`;
        }

        const filtersClause = QueryUtilities.getFiltersClause(filters, workItemFieldDescriptors);
        if (filtersClause) {
            $apply += ` and (${filtersClause})`;
        }

        $apply += ')';

        return PublicProjectsQueryHelper.forceProjectScoping(
            projects,
            {
                entityType: "WorkItems",
                oDataVersion: BurndownQueryBase.axODataVersion,
                $apply: $apply,
                $select: "WorkItemId"
            }
        );
    }

    public getQueryName(): string {
        return "CompletedWorkItemIdsQuery";
    }
}