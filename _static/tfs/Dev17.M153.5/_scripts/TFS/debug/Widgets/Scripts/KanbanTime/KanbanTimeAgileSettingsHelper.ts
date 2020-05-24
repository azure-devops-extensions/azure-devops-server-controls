import * as ArrayUtils from "VSS/Utils/Array";
import TFS_AgileCommon = require("Presentation/Scripts/TFS/FeatureRef/TFS.AgileCommon");
import CoreContracts = require("TFS/Core/Contracts");
import * as WorkContracts from "TFS/Work/Contracts";
import * as WorkClient from "TFS/Work/RestClient";

import { WorkItemTypeColorAndIconsProvider, IColorAndIcon } from "Presentation/Scripts/TFS/FeatureRef/WorkItemTypeColorAndIconsProvider";
import { ProjectCollection } from "Presentation/Scripts/TFS/TFS.OM.Common";
import { WidgetsCacheableQueryService } from 'Widgets/Scripts/DataServices/WidgetsCacheableQueryService';

import { ProcessesQuery } from "Analytics/Scripts/QueryCache/ProcessesQuery";
import { ProjectProcessConfigurationQuery } from "Widgets/Scripts/DataServices/ConfigurationQueries/ProjectProcessConfigurationQuery";
import { SettingsHelper } from "Widgets/Scripts/Utilities/SettingsHelper";

export interface BacklogInformation {
    /** Expresses Work Item Types associated with the backlog*/
    workItemTypes: string[];

    /** Expresses Work Item Types associated with the backlog union'ed with bug types.*/
    bugsAndWorkItemTypes: string[];
}

/**
 * A utility class to help load process configuration
 */
export class KanbanTimeAgileSettingsHelper {

    public static getProjectProcessConfiguration(projectId: string): IPromise<TFS_AgileCommon.ProjectProcessConfiguration> {
        let dataService = ProjectCollection.getDefaultConnection().getService(WidgetsCacheableQueryService);
        return dataService.getCacheableQueryResult(new ProjectProcessConfigurationQuery(projectId));
    }

    public static getBacklogInformation(projectId: string, backlogCategory: string): IPromise<BacklogInformation> {
        if (!SettingsHelper.useAnalyticsForProcessData()) {
            let dataService = ProjectCollection.getDefaultConnection().getService(WidgetsCacheableQueryService);
            return dataService.getCacheableQueryResult(new ProjectProcessConfigurationQuery(projectId)).then((process: TFS_AgileCommon.ProjectProcessConfiguration) => {
                let workItemTypes = KanbanTimeAgileSettingsHelper.getWorkItemTypesFromBacklog(process, backlogCategory);
                return {
                    workItemTypes: workItemTypes,
                    bugsAndWorkItemTypes: workItemTypes.concat(process.bugWorkItems.workItemTypeNames)
                };
            });
        } else {
            return SettingsHelper.runQueryOnDashboardCache(ProcessesQuery.onProject(projectId)).then((processEntries) => {

                let result : BacklogInformation =  {
                    workItemTypes: [],
                    bugsAndWorkItemTypes: []
                };

                for (let i = 0; i < processEntries.length; i++) {
                    var entry = processEntries[i];
                    if (entry.BacklogCategoryReferenceName === backlogCategory) {
                        if (result.workItemTypes.indexOf(entry.WorkItemType) < 0) {
                            result.workItemTypes.push(entry.WorkItemType);
                        }
                        if (result.bugsAndWorkItemTypes.indexOf(entry.WorkItemType) < 0) {
                            result.bugsAndWorkItemTypes.push(entry.WorkItemType);
                        }
                    } else if (entry.IsBugType) {
                        if (result.bugsAndWorkItemTypes.indexOf(entry.WorkItemType) < 0) {
                            result.bugsAndWorkItemTypes.push(entry.WorkItemType);
                        }
                    }
                }
                return result;
            });
        }
    }

    private static getWorkItemTypesFromBacklog(processConfiguration: TFS_AgileCommon.ProjectProcessConfiguration, backlogCategory: string): string[] {
        let backlogConfiguration = ArrayUtils.first(processConfiguration.allBacklogs, bc => bc.category === backlogCategory);
        let backlogWorkItemTypes = backlogConfiguration.workItemTypeNames;
        return backlogWorkItemTypes;
    }


    public static getTeamBugsBehavior(project: string, team: string): IPromise<WorkContracts.BugsBehavior> {
        let teamContext = {
            project: project,
            team: team
        } as CoreContracts.TeamContext;

        let client = WorkClient.getClient();
        return client.getTeamSettings(teamContext).then((settings) => {
            return settings.bugsBehavior;
        });
    }

    public static getWorkItemTypes(projectId): IPromise<string[]> {
        if (!SettingsHelper.useAnalyticsForProcessData()) {
            return KanbanTimeAgileSettingsHelper.getProjectProcessConfiguration(projectId)
                .then((processConfiguration: TFS_AgileCommon.ProjectProcessConfiguration) => {
                    var workItemTypes: string[] = [];
                    for (let i = 0; i < processConfiguration.allBacklogs.length; i++) {
                        if (processConfiguration.allBacklogs[i].workItemTypeNames) {
                            for (let j = 0; j < processConfiguration.allBacklogs[i].workItemTypeNames.length; j++) {
                                var workItemType = processConfiguration.allBacklogs[i].workItemTypeNames[j];
                                if (workItemTypes.indexOf(workItemType) < 0) {
                                    workItemTypes.push(workItemType);
                                }
                            }
                        }
                    }
                    workItemTypes.push(...processConfiguration.bugWorkItems.workItemTypeNames);
                    return workItemTypes;
                });
        } else {
            return SettingsHelper.runQueryOnDashboardCache(ProcessesQuery.onProject(projectId)).then((processEntries) => {
                var workItemTypes: string[] = [];
                for (let i = 0; i < processEntries.length; i++) {
                    if (workItemTypes.indexOf(processEntries[i].WorkItemType) < 0) {
                        workItemTypes.push(processEntries[i].WorkItemType);
                    }
                }
                return workItemTypes;
            });
        }
    }

    public static getWITColorAndIconDictionary(projectContext: ContextIdentifier): IPromise<IDictionaryStringTo<IColorAndIcon>> {
        return KanbanTimeAgileSettingsHelper.getWorkItemTypes(projectContext.id)
            .then(workItemTypeNames => {
                let projectName = projectContext.name;
                return WorkItemTypeColorAndIconsProvider.getInstance()
                    .ensureColorAndIconsArePopulated([projectName])
                    .then(() => {
                        let colorDictionary: IDictionaryStringTo<IColorAndIcon> = {};
                        workItemTypeNames.forEach(workItemTypeName => {
                            colorDictionary[workItemTypeName] = WorkItemTypeColorAndIconsProvider
                                .getInstance()
                                .getColorAndIcon(projectName, workItemTypeName);
                        });

                        return colorDictionary;
                    });
            });
    }
}