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

export interface ODataWorkItemSnapshotAggregation {
    WorkItemType: string;
    DateSK: number;
    StateCategory: string;
    AggregatedEffort: number;
}

/**
 * This query buckets workitems by date, state and work item type, aggregating by effort by these buckets.
 * This is the primary query of burndown and burnup widgets, used to draw the chart by date and effort
 */
export class EffortSnapshotsQuery extends BurndownQueryBase<WorkItemEffort[]>{
    constructor(dates: string[], teamScopes: TeamScope[], filters: FieldFilter[], aggregation: ModefulValueSetting<AggregationMode, string>, workItemTypes: string[], workItemFieldDescriptors: WorkItemFieldDescriptor[]) {
        super(EffortSnapshotsQuery.generateQueryOptions(dates, teamScopes, filters, aggregation, workItemTypes, workItemFieldDescriptors));
    }

    protected interpretQueryResults(data: { value: ODataWorkItemSnapshotAggregation[] }): WorkItemEffort[] {
        // This null filter is only needed because we don't include a 'ne null' filter for effort in the query.
        // As of this writing the reason we don't include it in the query is to get better SQL perf.
        // That may or may not change in the future.
        const filteredValues = data.value.filter(value => value.AggregatedEffort != null);
        return filteredValues.map(value => {
            return {
                WorkItemType: value.WorkItemType,
                Date: DateSKParser.parseDateSKAsDateString(value.DateSK),
                StateCategory: value.StateCategory,
                AggregatedEffort: value.AggregatedEffort
            };
        });
    }

    private static generateQueryOptions(dates: string[], teamScopes: TeamScope[], filters: FieldFilter[], aggregation: ModefulValueSetting<AggregationMode, string>, workItemTypes: string[], workItemFieldDescriptors: WorkItemFieldDescriptor[]): ODataQueryOptions {
        // $apply
        const teams = Utils_Array.unique(teamScopes.map(scope => scope.teamId));
        const teamsClause = QueryUtilities.isInArray("t/TeamSK", teams, false /* useQuotes */);

        const projects = Utils_Array.unique(teamScopes.map(scope => scope.projectId));
        const projectsClause = QueryUtilities.isInArray("ProjectSK", projects, false /* useQuotes */);

        const dateSKs = dates.map(date => DateSKParser.dateStringToDateSK(date));
        const earliestDateSK = Math.min(...dateSKs);
        const datesClause = QueryUtilities.isInArray("DateSK", dateSKs.map(dateSK => dateSK.toString()), false /* useQuotes */);

        const workItemTypesClause = QueryUtilities.isInArray("WorkItemType", workItemTypes, true /* useQuotes */);

        let $apply = `filter(`
            + `(${projectsClause})`
            + ` and Teams/any(t:${teamsClause})`
            + ` and (${workItemTypesClause})`
            + ` and StateCategory ne null`
            + ` and (RevisedDateSK eq null or RevisedDateSK gt ${earliestDateSK})` // Added to improve query perf
            + ` and (${datesClause})`;

        const filtersClause = QueryUtilities.getFiltersClause(filters, workItemFieldDescriptors);
        if (filtersClause) {
            $apply += ` and (${filtersClause})`;
        }

        $apply += ')';

        let aggregateFunction = "aggregate($count as AggregatedEffort)";
        if (aggregation.identifier === AggregationMode.Sum) {
            const analyticsEffortFieldName = WitFieldUtilities.getFieldODataPropertyName(aggregation.settings);
            aggregateFunction = `aggregate(${analyticsEffortFieldName} with sum as AggregatedEffort)`;
        }

        $apply += `/groupby((DateSK,StateCategory,WorkItemType),${aggregateFunction})`;

        return PublicProjectsQueryHelper.forceProjectScoping(
            projects,
            {
                entityType: "WorkItemSnapshot",
                oDataVersion: BurndownQueryBase.axODataVersion,
                $apply: $apply
            }
        );
    }

    public getQueryName(): string {
        return "EffortSnapshotsQuery";
    }
}