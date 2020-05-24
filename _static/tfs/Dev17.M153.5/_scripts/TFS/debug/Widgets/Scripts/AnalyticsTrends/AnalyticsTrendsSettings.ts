import { Team } from 'Analytics/Config/Components/TeamPickerConfigProperty';
import { WorkItemTypesFilter } from "Analytics/Scripts/Controls/ConfigUIContracts";

export interface AnalyticsTrendsSettings {
    /**A list of project-team tuples  */
    teams: Team[];

    /**A list of work item types and backlog configuration filters */
    workItemTypes: WorkItemTypesFilter[]
}
