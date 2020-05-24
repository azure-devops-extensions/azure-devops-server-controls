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

export interface ODataWorkItem {
    WorkItemId: string;
}

export class UnestimatedWorkItemIdsQuery extends BurndownQueryBase<string[]> {
    constructor(teamScopes: TeamScope[], filters: FieldFilter[], workItemTypes: string[], workItemFieldDescriptors: WorkItemFieldDescriptor[], effortField: string) {
        super(generateQueryOptions(BurndownQueryBase.axODataVersion, false /* return count */, teamScopes, filters, workItemTypes, workItemFieldDescriptors, effortField));
    }

    protected interpretQueryResults(data: { value: ODataWorkItem[] }): string[] {
        return data.value.map(value => value.WorkItemId);
    }

    public getQueryName(): string {
        return "UnestimatedWorkItemIdsQuery";
    }
}

export interface ODataWorkItemCount {
    Count: number;
}

export class UnestimatedWorkItemsCountQuery extends BurndownQueryBase<number> {
    constructor(teamScopes: TeamScope[], filters: FieldFilter[], workItemTypes: string[], workItemFieldDescriptors: WorkItemFieldDescriptor[], effortField: string) {
        super(generateQueryOptions(BurndownQueryBase.axODataVersion, true /* return count */, teamScopes, filters, workItemTypes, workItemFieldDescriptors, effortField));
    }

    protected interpretQueryResults(data: { value: ODataWorkItemCount[] }): number {
        return (data.value != null && data.value.length > 0) ? data.value[0].Count : 0;
    }

    public getQueryName(): string {
        return "UnestimatedWorkItemsCountQuery";
    }
}

function generateQueryOptions(axODataVersion: string, returnCount: boolean, teamScopes: TeamScope[], filters: FieldFilter[], workItemTypes: string[], workItemFieldDescriptors: WorkItemFieldDescriptor[], effortField: string): ODataQueryOptions {
    const teams = Utils_Array.unique(teamScopes.map(scope => scope.teamId));
    const teamsClause = QueryUtilities.isInArray("t/TeamSK", teams, false /* useQuotes */);

    const projects = Utils_Array.unique(teamScopes.map(scope => scope.projectId));
    const projectsClause = QueryUtilities.isInArray("ProjectSK", projects, false /* useQuotes */);

    const filtersClause = QueryUtilities.getFiltersClause(filters, workItemFieldDescriptors);

    const effortFieldAnalyticsName = WitFieldUtilities.getFieldODataPropertyName(effortField);

    const workItemTypesClause = QueryUtilities.isInArray("WorkItemType", workItemTypes, true /* useQuotes */);

    let $apply = `filter(`
        + `(${projectsClause})`
        + ` and Teams/any(t:${teamsClause})`
        + ` and StateCategory ne null`
        + ` and ${effortFieldAnalyticsName} eq null`
        + ` and (${workItemTypesClause})`;

    if (filtersClause) {
        $apply += ` and (${filtersClause})`;
    }

    $apply += ')';

    if (returnCount) {
        $apply += "/aggregate($count as Count)";
    }

    const $select = returnCount ? undefined : "WorkItemId";

    return PublicProjectsQueryHelper.forceProjectScoping(
        projects,
        {
            entityType: "WorkItems",
            oDataVersion: axODataVersion,
            $apply: $apply,
            $select: $select
        }
    );
}