import { ODataQueryOptions } from 'Analytics/Scripts/OData';
import { QueryUtilities } from 'Widgets/Scripts/DataServices/QueryUtilities';
import * as ArgumentUtils from "Widgets/Scripts/Shared/ArgumentUtilities";
import { ModefulValueSetting } from 'Widgets/Scripts/Shared/ModefulValueSetting';
import { VelocityQueryBase } from 'Widgets/Scripts/Velocity/Queries/VelocityQueryBase';
import { Metastate } from 'Widgets/Scripts/Velocity/VelocityDataContract';
import { VelocityDataHelper } from 'Widgets/Scripts/Velocity/VelocityDataHelper';
import { AggregationMode } from "Widgets/Scripts/ModernWidgetTypes/CommonConfigurationTypes";

export class MetastateByIterationsQuery extends VelocityQueryBase<Metastate[]>{

    constructor(projectId: string, teamId: string, iterationIds: string[], aggregation: ModefulValueSetting<AggregationMode, string>, workItemTypes: string[]) {
        ArgumentUtils.CheckString(projectId, "projectId");
        ArgumentUtils.CheckString(teamId, "teamId");
        ArgumentUtils.CheckStringArray(iterationIds, "iterationIds");
        ArgumentUtils.CheckObject(aggregation, "aggregation");
        ArgumentUtils.CheckStringArray(workItemTypes, "workItemTypes");

        super(MetastateByIterationsQuery.generateQueryOptions(projectId, teamId, iterationIds, aggregation, workItemTypes));
    }

    protected interpretQueryResults(data: { value: Metastate[] }): Metastate[] {
        // This null filter is only needed because we don't include a 'ne null' filter for effort in the query.
        // As of this writing the reason we don't include it in the query is to get better SQL perf.
        // That may or may not change in the future.
        return data.value.filter(metastate => metastate.AggregationResult != null);
    }

    private static generateQueryOptions(projectId: string, teamId: string, iterationIds: string[], aggregation: ModefulValueSetting<AggregationMode, string>, workItemTypes: string[]): ODataQueryOptions {
        // $apply
        const iterationsClause = QueryUtilities.isInArray(
            "IterationSK",
            iterationIds);
        const workItemTypeClause = QueryUtilities.isInArray("WorkItemType", workItemTypes, true /* useQuotes */);

        var $apply = `filter(`
            + `Teams/any(t:t/TeamSK eq ${teamId})`
            + ` and (${workItemTypeClause})`
            + ` and (${iterationsClause})`
            + ` and StateCategory ne null`;

        $apply += `)/groupby((StateCategory, IterationSK),${VelocityDataHelper.getQueryAggregation(aggregation)})`;

        return {
            entityType: "WorkItems",
            oDataVersion: VelocityQueryBase.axODataVersion,
            project: projectId,
            $apply: $apply
        };
    }

    public getQueryName(): string {
        return "MetastateByIterationsQuery";
    }
}