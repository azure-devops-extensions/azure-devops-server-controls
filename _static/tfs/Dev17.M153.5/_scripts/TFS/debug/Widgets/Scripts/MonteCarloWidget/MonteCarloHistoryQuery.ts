import { ODataQueryOptions, AnalyticsODataVersions } from 'Analytics/Scripts/OData';
import { QueryUtilities } from 'Widgets/Scripts/DataServices/QueryUtilities';
import { WorkItemFieldDescriptor, CurrentWorkItemAggregateEffort } from 'Widgets/Scripts/Burndown/BurndownDataContract';
import { FieldFilter } from 'Widgets/Scripts/Burndown/BurndownSettings';
import { TeamScope } from "Widgets/Scripts/ModernWidgetTypes/CommonConfigurationTypes";
import * as Utils_Array from "VSS/Utils/Array";
import {PublicProjectsQueryHelper} from "Analytics/Scripts/PublicProjectsQueryHelper";
import { CacheableAnalyticsQueryBase } from 'Analytics/Scripts/QueryCache/CacheableAnalyticsQueryBase';
import { BatchRequest } from "Analytics/Scripts/VSS.Analytics.WebApi";
import { MonteCarloConstants } from 'Widgets/Scripts/MonteCarloWidget/MonteCarloConstants'
import { TimePeriodConfiguration } from 'Widgets/Scripts/Burndown/BurndownSettings'

/** The type returned for each query result */
export interface HistoryQueryResult {
    oDataId: number,
    CompletedDateSK: number,
    countOfWorkItems: number
}

export class MonteCarloHistoryQuery extends CacheableAnalyticsQueryBase<CurrentWorkItemAggregateEffort[]> {
    private static readonly axODataVersion: string = AnalyticsODataVersions.v1;

    constructor(teamScopes: TeamScope[], 
                filters: FieldFilter[],
                workItemTypes: string[], 
                workItemTypeDescriptors: WorkItemFieldDescriptor[],
                timePeriod: TimePeriodConfiguration) {
        const extendedQueryOptions = MonteCarloHistoryQuery.generateQueryOptions(teamScopes, filters, workItemTypes, workItemTypeDescriptors, timePeriod);

        super(MonteCarloConstants.command, MonteCarloConstants.featureName, extendedQueryOptions);
    }

    private static generateQueryOptions(teamScopes: TeamScope[], filters: FieldFilter[], workItemTypes: string[], 
                    workItemTypeDescriptors: WorkItemFieldDescriptor[], timePeriod: TimePeriodConfiguration): ODataQueryOptions {
        const teams = teamScopes.map(scope => scope.teamId);
        const projects = Utils_Array.unique(teamScopes.map(scope => scope.projectId));
                
        const teamsClause = QueryUtilities.isInArray("t/TeamSK", teams, false /* useQuotes */);
        const projectsClause = QueryUtilities.isInArray("ProjectSK", projects, false /* useQuotes */);
                
        const workItemTypesClause = QueryUtilities.isInArray("WorkItemType", workItemTypes, true /* useQuotes */);

        let timePeriodClause = QueryUtilities.getTimePeriodClause(timePeriod);

        var $apply = 'filter('
            + `(${projectsClause})`
            + ` and Teams/any(t:${teamsClause})`
            + ` and StateCategory eq 'Completed'`
            + ` and (${workItemTypesClause})`
            + ` and (${timePeriodClause})`;
        
        const filtersClause = QueryUtilities.getFiltersClause(filters, workItemTypeDescriptors);
        if (filtersClause) {
            $apply += ` and (${filtersClause})`;
        }
    
        $apply += ')';

        $apply += `/groupby((CompletedDateSK),aggregate($count as countOfWorkItems))`;

        return PublicProjectsQueryHelper.forceProjectScoping(
            projects,        
            {
                entityType: "WorkItems",
                oDataVersion: this.axODataVersion,
                $apply: $apply,
                useBatch: BatchRequest.Enabled
            }
        );
    }

    public getQueryName(): string {
        return "GetHistoryQuery";
    }
}