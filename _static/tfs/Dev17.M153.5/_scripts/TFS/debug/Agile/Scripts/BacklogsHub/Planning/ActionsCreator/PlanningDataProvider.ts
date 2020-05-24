import { IIterationEffort, IPlanningWorkItem } from "Agile/Scripts/BacklogsHub/Planning/PlanningContracts";
import { Iteration, IterationBuilder } from "Agile/Scripts/Models/Iteration";
import { BacklogFieldTypes, WorkItemStateCategory } from "Presentation/Scripts/TFS/FeatureRef/BacklogConfiguration/Models";
import { BacklogConfigurationService } from "Presentation/Scripts/TFS/FeatureRef/BacklogConfiguration/Service";
import { TeamAwarenessService } from "Presentation/Scripts/TFS/FeatureRef/TFS.TeamAwarenessService";
import { CoreFieldRefNames } from "Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants";
import * as TFS_Host_TfsContext from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { ProjectCollection } from "Presentation/Scripts/TFS/TFS.OM.Common";
import { TeamContext } from "TFS/Core/Contracts";
import { DateRange, IterationWorkItems, TeamSettingsDaysOff } from "TFS/Work/Contracts";
import { WorkHttpClient } from "TFS/Work/RestClient";
import { WorkItem as IWorkItem } from "TFS/WorkItemTracking/Contracts";
import * as Service from "VSS/Service";
import { getService as getSettingsService, SettingsUserScope } from "VSS/Settings/Services";
import * as Utils_Array from "VSS/Utils/Array";
import { shiftToUTC } from "VSS/Utils/Date";
import * as Utils_String from "VSS/Utils/String";
import { PageWorkItemHelper } from "WorkItemTracking/Scripts/Utils/PageWorkItemHelper";
import { ITeamSettings } from "Presentation/Scripts/TFS/FeatureRef/TFS.AgileCommon";
import { getDefaultWebContext } from "VSS/Context";

export interface IPlanningDataProvider {
    getIterations(): Iteration[];
    getBacklogIteration(): Iteration;
    getCurrentIteration(): Iteration;
    getWeekends(): number[];
    getIterationTeamDaysOff(iteration: Iteration): Promise<DateRange[]>;
    getIterationEffort(iteration: Iteration): Promise<IIterationEffort>;
    getTeamFieldReferenceName(): string;
    getEffortsFieldName(): string;
}

export const FUTURE_ITERATION_CAP_KEY = "Agile/BacklogsHub/PlanningIterationFutureCount";
const DEFAULT_FUTURE_ITERATION_CAP = 10;

export class PlanningDataProvider implements IPlanningDataProvider {
    private _teamId: string;

    constructor(teamId: string) {
        this._teamId = teamId;
    }

    public getWeekends(): number[] {
        return this._getTeamSettings().weekends.days;
    }

    public getIterations(): Iteration[] {
        const settingsService = getSettingsService();
        const futureIterationCap = settingsService.getEntry<number>(FUTURE_ITERATION_CAP_KEY, SettingsUserScope.Host) || DEFAULT_FUTURE_ITERATION_CAP;

        const teamSettings = this._getTeamSettings();
        const iterationData = [...teamSettings.futureIterations.slice(0, futureIterationCap)];
        if (teamSettings.currentIteration) {
            iterationData.unshift(teamSettings.currentIteration);
        }
        return iterationData.map((iterationData) => IterationBuilder.fromIIterationData(iterationData));
    }

    public getBacklogIteration(): Iteration {
        const teamSettings = this._getTeamSettings();
        if (teamSettings.backlogIteration) {
            return IterationBuilder.fromIIterationData(teamSettings.backlogIteration);
        }
    }

    public getCurrentIteration(): Iteration {
        const teamSettings = this._getTeamSettings();
        if (teamSettings.currentIteration) {
            return IterationBuilder.fromIIterationData(teamSettings.currentIteration);
        }
    }

    public getTeamFieldReferenceName(): string {
        const teamSettings = this._getTeamSettings();
        return teamSettings.teamFieldName;
    }

    public getEffortsFieldName(): string {
        const backlogConfiguration = BacklogConfigurationService.getBacklogConfiguration();
        return backlogConfiguration.backlogFields.typeFields[BacklogFieldTypes.Effort];
    }

    public getRequirementWorkItemTypes(): string[] {
        const backlogConfiguration = BacklogConfigurationService.getBacklogConfiguration();
        if (!backlogConfiguration.requirementBacklog) {
            return [];
        }
        return backlogConfiguration.requirementBacklog.workItemTypes;
    }

    public getIterationTeamDaysOff(iteration: Iteration): Promise<DateRange[]> {
        return new Promise<TeamSettingsDaysOff>((resolve, reject) => { this._getHttpClient().getTeamDaysOff(this._getTeamContext(), iteration.id).then(resolve, reject); }).then(
            (value: TeamSettingsDaysOff) => {
                return value.daysOff.map((dateRange: DateRange) => {
                    return {
                        start: shiftToUTC(dateRange.start),
                        end: shiftToUTC(dateRange.end)
                    };
                });
            }
        );
    }

    /**
     * Gets effort for given iteration
     */
    public getIterationEffort(iteration: Iteration): Promise<IIterationEffort> {
        return this._getWorkItems(iteration).then(workItems => {
            const backlogConfiguration = BacklogConfigurationService.getBacklogConfiguration();

            // Build work item and states map
            const workItemTypeNames = backlogConfiguration.requirementBacklog.workItemTypes.concat(backlogConfiguration.taskBacklog.workItemTypes);
            const countByWorkItemType = {};
            for (const iterator of workItemTypeNames) {
                countByWorkItemType[iterator] = 0;
            }

            return workItems.reduce((output, workItem) => {
                const workItemsById = output.workItemsById;

                output.totalEfforts = (output.totalEfforts || 0) + workItem.effort;

                countByWorkItemType[workItem.workItemType] = (countByWorkItemType[workItem.workItemType] || 0) + 1;
                workItemsById[workItem.id] = workItem;

                return output;

            }, {
                    countByWorkItemType,
                    totalEfforts: 0,
                    workItemsById: {},
                    iterationId: iteration.id
                });
        });
    }

    private _getTeamSettings(): ITeamSettings {
        const teamAwarenessSettings = ProjectCollection.getConnection().getService<TeamAwarenessService>(TeamAwarenessService);
        return teamAwarenessSettings.getTeamSettings(this._teamId);
    }

    /**
     * Page work item details for Planning of given iteration Id
     */
    private _getWorkItems(
        iteration: Iteration)
        : Promise<IPlanningWorkItem[]> {

        // Read team information from backlog configuration and team settings
        const backlogConfiguration = BacklogConfigurationService.getBacklogConfiguration();
        const teamSettings = this._getTeamSettings();

        // Build work item and states map
        const workItemTypeNames = backlogConfiguration.requirementBacklog.workItemTypes.concat(backlogConfiguration.taskBacklog.workItemTypes);
        const workItemTypeStateMap: IDictionaryStringTo<string[]> = {};
        for (const workItemTypeName of workItemTypeNames) {
            const states = [
                ...backlogConfiguration.getWorkItemStatesForStateCategory(workItemTypeName, WorkItemStateCategory.Proposed),
                ...backlogConfiguration.getWorkItemStatesForStateCategory(workItemTypeName, WorkItemStateCategory.InProgress),
                ...backlogConfiguration.getWorkItemStatesForStateCategory(workItemTypeName, WorkItemStateCategory.Resolved),
                ...backlogConfiguration.getWorkItemStatesForStateCategory(workItemTypeName, WorkItemStateCategory.Completed)
            ];
            workItemTypeStateMap[workItemTypeName] = states;
        }

        // Query work items
        return this._queryWorkItems(
            iteration)
            .then((workItemIds: number[]) => {

                // Get work item ids
                if (workItemIds.length === 0) {
                    return [];
                }

                const effortField = backlogConfiguration.backlogFields.typeFields[BacklogFieldTypes.Effort];

                const fieldRefNames = [
                    CoreFieldRefNames.Id,
                    CoreFieldRefNames.State,
                    CoreFieldRefNames.WorkItemType,
                    CoreFieldRefNames.IterationPath,
                    teamSettings.teamFieldName,
                    effortField
                ];

                const requirementWorkItemTypes = backlogConfiguration.requirementBacklog.workItemTypes;

                // Page work items
                return PageWorkItemHelper.pageWorkItems(workItemIds, /* projectName */null, fieldRefNames)
                    .then((workItems: IWorkItem[]) => {
                        return workItems.map(workItem => {

                            // Efforts are tracked for only Requirements
                            const workItemTypeName = workItem.fields[CoreFieldRefNames.WorkItemType];
                            const trackEffort = requirementWorkItemTypes.some((req) => Utils_String.equals(req, workItemTypeName, /* ignore case */ true));

                            return {
                                id: workItem.id,
                                iterationPath: workItem.fields[CoreFieldRefNames.IterationPath],
                                teamFieldValue: workItem.fields[teamSettings.teamFieldName],
                                effort: trackEffort ? workItem.fields[effortField] || 0 : 0,
                                workItemType: workItemTypeName,
                                state: workItem.fields[CoreFieldRefNames.State]
                            };
                        });
                    });
            });
    }

    /**
     * Query workitems
     */
    private _queryWorkItems(
        iteration: Iteration
    ): Promise<number[]> {
        const client = this._getHttpClient();

        return new Promise((resolve, reject) => { client.getIterationWorkItems(this._getTeamContext(), iteration.id).then(resolve, reject); }).then(
            (iterationWorkItems: IterationWorkItems) => {
                //Loop through each relation and get source and target id
                const workItemIds: number[] = [];
                iterationWorkItems.workItemRelations.reduce((workItemIds, relation) => {
                    if (relation.source && relation.source.id) {
                        workItemIds.push(relation.source.id);
                    }

                    if (relation.target && relation.target.id) {
                        workItemIds.push(relation.target.id);
                    }

                    return workItemIds;
                }, workItemIds);

                return Utils_Array.unique(workItemIds);
            }
        );
    }

    private _getHttpClient(): WorkHttpClient {
        const tfsContext = TFS_Host_TfsContext.TfsContext.getDefault();
        const tfsConnection = new Service.VssConnection(tfsContext.contextData);
        return tfsConnection.getHttpClient<WorkHttpClient>(WorkHttpClient);
    }

    private _getTeamContext(): TeamContext {
        const webContext = getDefaultWebContext();
        const projectId = webContext.project.id;

        return {
            projectId,
            teamId: this._teamId,
            project: null,
            team: null
        };
    }
}