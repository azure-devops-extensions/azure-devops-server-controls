import { BacklogCategoryConfiguration, ProjectProcessConfiguration } from "Presentation/Scripts/TFS/FeatureRef/TFS.AgileCommon";
import { ProjectCollection } from "Presentation/Scripts/TFS/TFS.OM.Common";
import * as Q from "q";
import { TeamSetting } from "TFS/Work/Contracts";
import * as Utils_Array from "VSS/Utils/Array";
import StringUtils = require("VSS/Utils/String");
import { WidgetsCacheableQueryService } from "Widgets/Scripts/DataServices/WidgetsCacheableQueryService";
import { ProjectProcessConfigurationQuery } from "Widgets/Scripts/DataServices/ConfigurationQueries/ProjectProcessConfigurationQuery";
import { TeamSettingsQuery } from "Widgets/Scripts/DataServices/ConfigurationQueries/TeamSettingsQuery";
import { ICacheableQuery } from "Analytics/Scripts/QueryCache/ICacheableQuery"
import WidgetResources = require("Widgets/Scripts/Resources/TFS.Resources.Widgets");
import { ErrorParser } from "Widgets/Scripts/TFS.Widget.Utilities";
import * as WorkContracts from 'TFS/Work/Contracts';

import FeatureAvailability_Services = require('VSS/FeatureAvailability/Services');
import { FeatureAvailabilityFlags } from "Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants";
import { ProcessesEntry, ProcessesQuery } from "Analytics/Scripts/QueryCache/ProcessesQuery";


export declare class BacklogCategoryInformation {
    category: string;
    workItemTypeNames: string[];
    plural: string;
    isRequirementCategory: boolean;
}

/** Legacy Helper class for dealing with Team and project scoped WIT settings.
 * New consumers should go directly to the Ax-backed "ProcessesQuery".
 */
export class SettingsHelper {
    public static WitRequirementsCategory = "Microsoft.RequirementCategory";

    public static runQueryOnDashboardCache<T>(query: ICacheableQuery<T>): IPromise<T> {
        let dataService = ProjectCollection.getDefaultConnection().getService(WidgetsCacheableQueryService);
        return dataService.getCacheableQueryResult(query);
    }

    private static getProcessConfiguration(projectId: string): IPromise<ProjectProcessConfiguration> {
        let processConfigurationQuery = new ProjectProcessConfigurationQuery(projectId);
        return SettingsHelper.runQueryOnDashboardCache(processConfigurationQuery);
    }

    private static findMatchingBacklog(allBacklogs: BacklogCategoryInformation[], backlogCategory: string): BacklogCategoryInformation {
        return Utils_Array.first(allBacklogs, b => b.category === backlogCategory)
    }

    private static getTeamSettings(projectId: string, teamId: string): IPromise<TeamSetting> {
        let teamSettingsQuery = new TeamSettingsQuery(projectId, teamId);
        return SettingsHelper.runQueryOnDashboardCache(teamSettingsQuery)
            .then(undefined, error => {
                return Q.reject(StringUtils.format(WidgetResources.ModernWidget_TeamSettingsErrorFormat, ErrorParser.stringifyError(error)));
            });
    }

    public static useAnalyticsForProcessData(): boolean {
        return FeatureAvailability_Services.FeatureAvailabilityService.isFeatureEnabled(FeatureAvailabilityFlags.UseAnalyticsProcessDataForWidgets, false);
    }

    private static getCacheableQueryResult<T>(query: ICacheableQuery<T>): IPromise<T> {
        var cacheableQueryService = ProjectCollection.getDefaultConnection().getService(WidgetsCacheableQueryService);
        return cacheableQueryService.getCacheableQueryResult(query);
    }

    /**
     * Retrieves the work item types associated with the given backlog category.
     * Includes work items from the bugs category if the backlog passed in is the requirements backlog, and the
     * team settings for the given team ID are set to show bugs on the requirements backlog.
     * 
     * Data is sourced from an Ax backed Cachable Query, or WIT, based on feature flag state.
     * 
     * @param projectId The project ID to use when looking up the process configuration
     * @param teamId  The team to use when looking up team settings
     * @param backlogCategory The backlog category for which to look up the associated work item types
     */
    public static getTeamWorkItemTypesOfBacklogCategory(projectId: string, teamId: string, backlogCategory: string): IPromise<string[]> {
        var types: IPromise<string[]>;
        if (!SettingsHelper.useAnalyticsForProcessData()) {
            types = SettingsHelper.getWorkItemTypesOfBacklogCategory(projectId, teamId, backlogCategory);
        } else {
            //Get team Process, and then select the WIT's associated with the requested backlog Category.
            types = SettingsHelper.runQueryOnDashboardCache(ProcessesQuery.onTeam(projectId, teamId)).then(types => {
                return types.map((entry, i) => {
                    return (entry.BacklogCategoryReferenceName === backlogCategory) ? entry.WorkItemType : null;
                }).filter(o => o != null);
            });
        }
        return types;
    }

    /**
     * Retrieves the work item types associated with the given backlog category, at context of a project.
     * Includes work items from the bugs category if the backlog passed in is the requirements backlog, and the
     * includeBugsForRequirementCategory argument is true.
     * @param projectId The project ID to use when looking up the process configuration
     * @param backlogCategory The backlog category for which to look up the associated work item types
     * @param includeBugsForRequirementCategory Defaults to false. Set to true if adding bugs category work item types to the requirements category work item types is desired.
     */
    public static getProjectWorkItemTypesOfBacklogCategory(projectId: string, backlogCategory: string, includeBugsForRequirementCategory?: boolean): IPromise<string[]> {
        var types: IPromise<string[]>;
        if (!SettingsHelper.useAnalyticsForProcessData()) {
            types = SettingsHelper.getWorkItemTypesOfBacklogCategory(projectId, backlogCategory, includeBugsForRequirementCategory);
        } else {
            //Get team Process, and then select the WIT's associated with the requested backlog Category.
            //Include items of the "bugs" Category if "includeBugsForRequirementCategory" is true
            //Filters out duplicates, since the query is project-scoped but each team can have their own configuration
            types = SettingsHelper.runQueryOnDashboardCache(ProcessesQuery.onProject(projectId)).then(types => {
                let result : string[] = [];
                for (let entry of types) {
                    const isOfBacklogCategory = (entry.BacklogCategoryReferenceName === backlogCategory && !entry.IsBugType);
                    const includeAsABug = (entry.IsBugType
                        && includeBugsForRequirementCategory
                        && backlogCategory === SettingsHelper.WitRequirementsCategory);
                    if ((isOfBacklogCategory || includeAsABug) && result.indexOf(entry.WorkItemType) < 0) {
                        result.push(entry.WorkItemType);
                    }
                };
                return result;
            });
        }
        return types;
    }

    /**
     * (LEGACY)
     * Retrieves the work item types associated with the given backlog category.
     * Includes work items from the bugs category if the backlog passed in is the requirements backlog, and the
     * team settings for the given team ID are set to show bugs on the requirements backlog.
     * @param projectId The project ID to use when looking up the process configuration
     * @param teamId  The team to use when looking up team settings
     * @param backlogCategory The backlog category for which to look up the associated work item types
     */
    private static getWorkItemTypesOfBacklogCategory(projectId: string, teamId: string, backlogCategory: string): IPromise<string[]>
    /**
     * (LEGACY)
     * Retrieves the work item types associated with the given backlog category.
     * Includes work items from the bugs category if the backlog passed in is the requirements backlog, and the
     * includeBugsForRequirementCategory argument is true.
     * @param projectId The project ID to use when looking up the process configuration
     * @param backlogCategory The backlog category for which to look up the associated work item types
     * @param includeBugsForRequirementCategory Defaults to false. Set to true if adding bugs category work item types to the requirements category work item types is desired.
     */
    private static getWorkItemTypesOfBacklogCategory(projectId: string, backlogCategory: string, includeBugsForRequirementCategory?: boolean): IPromise<string[]>
    private static getWorkItemTypesOfBacklogCategory(projectId: string, arg1: string, arg2: string | boolean): IPromise<string[]> {
        return SettingsHelper.getProcessConfiguration(projectId)
            .then(processConfig => {
                const backlogCategory = (typeof arg2 === "string") ? arg2 : arg1;
                const matchingBacklog = SettingsHelper.findMatchingBacklog(processConfig.allBacklogs, backlogCategory);

                if (matchingBacklog != null) {
                    let workItemTypes: string[] = matchingBacklog.workItemTypeNames;

                    if (typeof arg2 === "string") {
                        if (matchingBacklog.isRequirementCategory) {
                            const teamId = arg1;
                            return SettingsHelper.getTeamSettings(projectId, teamId)
                                .then(teamSettings => {
                                    if (teamSettings.bugsBehavior === WorkContracts.BugsBehavior.AsRequirements) {
                                        workItemTypes = processConfig.bugWorkItems.workItemTypeNames.concat(workItemTypes);
                                    }
                                    return workItemTypes;
                                }, error => {
                                    return Q.reject(StringUtils.format(WidgetResources.ModernWidget_TeamSettingsErrorFormat, error));
                                });
                        }
                    } else {
                        const includeBugsForRequirementCategory = arg2 || false;
                        if (includeBugsForRequirementCategory && matchingBacklog.isRequirementCategory) {
                            workItemTypes = processConfig.bugWorkItems.workItemTypeNames.concat(workItemTypes);
                        }
                    }

                    return workItemTypes;
                }
                else {
                    return Q.reject(`Failed to find the backlog category '${backlogCategory}' in the process configuration.`);
                }
            })
            .then<string[]>(undefined, error => {
                return Q.reject(StringUtils.format(WidgetResources.ModernWidget_WorkItemTypeErrorFormat, error));
            });
    }

    /**
     * Retrieves the plural name of the given backlog category.
     * @param projectId The project ID to use when looking up the process configuration
     * @param backlogCategory The backlog category for which to retrieve the plural name
     */
    public static getPluralBacklogNameOfBacklogCategory(projectId: string, backlogCategory: string): IPromise<string> {
        const getMatchFailure = (backlogCategory: string) => { return Q.reject<string>(`Failed to find the backlog category '${backlogCategory}' in the process configuration.`) };
        var promise: IPromise<string>;
        if (!SettingsHelper.useAnalyticsForProcessData()) {
            promise = SettingsHelper.getProcessConfiguration(projectId)
                .then(processConfig => {
                    let matchingBacklog = SettingsHelper.findMatchingBacklog(processConfig.allBacklogs, backlogCategory);
                    return matchingBacklog != null ? matchingBacklog.plural : getMatchFailure(backlogCategory);
                });
        } else {
            promise = SettingsHelper.runQueryOnDashboardCache(ProcessesQuery.onProject(projectId)).then(types => {
                var result: ProcessesEntry = types.find((entry, i) => {
                    return entry.BacklogCategoryReferenceName === backlogCategory;
                });
                return result != null ? result.BacklogName : getMatchFailure(backlogCategory);
            });
        }

        promise.then<string>(undefined, error => {
            return Q.reject(StringUtils.format(WidgetResources.ModernWidget_PluralBacklogNameErrorFormat, error));
        });
        return promise;
    }
}