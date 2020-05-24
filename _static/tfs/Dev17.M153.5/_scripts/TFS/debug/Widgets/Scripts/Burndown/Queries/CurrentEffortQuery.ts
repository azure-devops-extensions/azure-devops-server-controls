import { WitFieldUtilities } from 'Analytics/Scripts/WitFieldUtilities';
import { ODataQueryOptions } from 'Analytics/Scripts/OData';
import { QueryUtilities } from 'Widgets/Scripts/DataServices/QueryUtilities';
import { BurndownQueryBase } from 'Widgets/Scripts/Burndown/Queries/BurndownQueryBase';
import { WorkItemEffort, WorkItemFieldDescriptor, CurrentWorkItemAggregateEffort } from 'Widgets/Scripts/Burndown/BurndownDataContract';
import { FieldFilter } from 'Widgets/Scripts/Burndown/BurndownSettings';
import { TeamScope, AggregationMode } from "Widgets/Scripts/ModernWidgetTypes/CommonConfigurationTypes";
import * as Utils_Array from "VSS/Utils/Array";
import { ModefulValueSetting } from "Widgets/Scripts/Shared/ModefulValueSetting";
import {PublicProjectsQueryHelper} from "Analytics/Scripts/PublicProjectsQueryHelper";

/**
 * This calculates remaining effort by querying every item that has remaining effort in the effort field
 * This queries by single work item type configured.
 *
 * This is used in burndown only for the completed % submetric, total scope change submetric, and hero total effort metric.
 * The main difference between this and EffortSnapshotsQuery is that this query is querying the most recent data (today's)
 * as opposed to EffortSnapshotsQuery which is using the constructed snapshots of work item history at various points of time
 * in the past.
 *
 * Note: the only hard filter here is teams and projects - this is not iteration driven nor is this following dates picked,
 * so users need to apply filters for this number to be useful
 */
export class CurrentEffortQuery extends BurndownQueryBase<CurrentWorkItemAggregateEffort[]>{
    constructor(teamScopes: TeamScope[], filters: FieldFilter[], aggregation: ModefulValueSetting<AggregationMode, string>, workItemTypes: string[], workItemTypeDescriptors: WorkItemFieldDescriptor[]) {
        super(CurrentEffortQuery.generateQueryOptions(teamScopes, filters, aggregation, workItemTypes, workItemTypeDescriptors));
    }

    protected interpretQueryResults(data: { value: CurrentWorkItemAggregateEffort[] }): CurrentWorkItemAggregateEffort[] {
        // This null filter is only needed because we don't include a 'ne null' filter for effort in the query.
        // As of this writing the reason we don't include it in the query is to get better SQL perf.
        // That may or may not change in the future.
        return data.value.filter(value => value.AggregatedEffort != null);
    }

    private static generateQueryOptions(teamScopes: TeamScope[], filters: FieldFilter[], aggregation: ModefulValueSetting<AggregationMode, string>, workItemTypes: string[], workItemTypeDescriptors: WorkItemFieldDescriptor[]): ODataQueryOptions {
        // $apply
        const teams = teamScopes.map(scope => scope.teamId);
        const projects = Utils_Array.unique(teamScopes.map(scope => scope.projectId));

        const teamsClause = QueryUtilities.isInArray("t/TeamSK", teams, false /* useQuotes */);
        const projectsClause = QueryUtilities.isInArray("ProjectSK", projects, false /* useQuotes */);

        const workItemTypesClause = QueryUtilities.isInArray("WorkItemType", workItemTypes, true /* useQuotes */);

        var $apply = `filter(`
            + `(${projectsClause})`
            + ` and Teams/any(t:${teamsClause})`
            + ` and (${workItemTypesClause})`
            + ` and StateCategory ne null`;

        const filtersClause = QueryUtilities.getFiltersClause(filters, workItemTypeDescriptors);
        if (filtersClause) {
            $apply += ` and (${filtersClause})`;
        }

        $apply += ')';

        let aggregateFunction = "aggregate($count as AggregatedEffort)";
        if (aggregation.identifier === AggregationMode.Sum) {
            const analyticsEffortFieldName = WitFieldUtilities.getFieldODataPropertyName(aggregation.settings);
            aggregateFunction = `aggregate(${analyticsEffortFieldName} with sum as AggregatedEffort)`;
        }

        $apply += `/groupby((StateCategory),${aggregateFunction})`;

        return PublicProjectsQueryHelper.forceProjectScoping(
            projects,        
            {
                entityType: "WorkItems",
                oDataVersion: BurndownQueryBase.axODataVersion,
                $apply: $apply
            }
        );
    }

    public getQueryName(): string {
        return "CurrentEffortQuery";
    }
}