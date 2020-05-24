import { BacklogLevelConfiguration, BacklogConfiguration } from "TFS/Work/Contracts";
import { WorkItemType } from "TFS/WorkItemTracking/Contracts";

import { WorkPropertyKeys } from "Widgets/Scripts/Work/Framework/WorkPropertyKeys";

/**
 * Components within a config can depend on data provided by other components.
 *
 * These shared data are stored in the ConfigState in an un-typed property bag.
 *
 * This class provides convenience methods to get strongly typed data out of this un-typed property bag.
 */
export class WorkSelector {

    public isWitTypesLoaded(properties: IDictionaryStringTo<any>): boolean {
        return properties[WorkPropertyKeys.WorkItemTypes] !== undefined;
    }

    public isBacklogConfigurationsLoaded(properties: IDictionaryStringTo<any>): boolean {
        return properties[WorkPropertyKeys.BacklogConfigurations] !== undefined;
    }

    public getWitTypes(properties: IDictionaryStringTo<any>): WorkItemType[] {
        let witTypes = properties[WorkPropertyKeys.WorkItemTypes] as WorkItemType[];
        if (!witTypes) {
            return [];
        }

        return witTypes;
    }

    public getBacklogConfigurations(properties: IDictionaryStringTo<any>): BacklogLevelConfiguration[] {
        let backlogConfigurations = properties[WorkPropertyKeys.BacklogConfigurations] as BacklogConfiguration;
        if (!backlogConfigurations) {
            return[];
        }

        return this.flattenBacklogConfigurations(backlogConfigurations);
    }

    private flattenBacklogConfigurations(backlogConfigurations: BacklogConfiguration): BacklogLevelConfiguration[] {
        let flattenedBacklogs = [
            ...backlogConfigurations.portfolioBacklogs,
            backlogConfigurations.requirementBacklog,
            backlogConfigurations.taskBacklog
        ]
        return flattenedBacklogs.filter(backlog => backlog != null);
    }
}