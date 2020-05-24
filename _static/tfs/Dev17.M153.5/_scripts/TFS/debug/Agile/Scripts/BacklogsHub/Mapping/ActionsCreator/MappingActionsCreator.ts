import { BacklogsHubTelemetryConstants } from "Agile/Scripts/BacklogsHub/BacklogsHubTelemetryConstants";
import { MappingActions } from "Agile/Scripts/BacklogsHub/Mapping/ActionsCreator/MappingActions";
import { IMappingDataProvider, MappingDataProvider } from "Agile/Scripts/BacklogsHub/Mapping/ActionsCreator/MappingDataProvider";
import { BacklogsHubTelemetryHelper } from "Agile/Scripts/Common/HubTelemetryHelper";
import { BacklogsHubConstants } from "Agile/Scripts/Generated/HubConstants";
import { Team } from "Agile/Scripts/Models/Team";
import { IBacklogLevelConfiguration } from "Presentation/Scripts/TFS/FeatureRef/BacklogConfiguration/Models";
import { WorkItem as IWorkItem } from "TFS/WorkItemTracking/Contracts";
import { getDefaultWebContext } from "VSS/Context";
import { publishErrorToTelemetry } from "VSS/Error";
import { getScenarioManager } from "VSS/Performance";
import { PageSizes } from "WorkItemTracking/Scripts/OM/WorkItemConstants";
import { TeamAwarenessService } from "Presentation/Scripts/TFS/FeatureRef/TFS.TeamAwarenessService";
import { getService } from "VSS/Service";
import { ITeamSource, TeamSource } from "Agile/Scripts/Sources/TeamSource";

export interface IMappingActionsCreator {
    fetchTeamsForProject(): Promise<void>;
    pageWorkItems(workItemIds: number[]): Promise<void>;
    selectTeamAndBacklogLevel(team: Team, backlogLevel: IBacklogLevelConfiguration): Promise<void>;
    workItemChanged(workItem: IWorkItem): void;
    workItemRemoved(workItemId: number): void;
}

export class MappingActionsCreator implements IMappingActionsCreator {
    private _actions: MappingActions;
    private _dataProvider: IMappingDataProvider;
    private _teamSource: TeamSource;

    constructor(
        actions: MappingActions,
        dataProvider: IMappingDataProvider = new MappingDataProvider(),
        teamSource: ITeamSource = new TeamSource()
    ) {
        this._actions = actions;
        this._dataProvider = dataProvider;
        this._teamSource = teamSource;
    }

    public fetchTeamsForProject(): Promise<void> {
        const projectId = this._getProjectId();
        this._actions.beginFetchTeams.invoke(null);
        return this._teamSource.fetchTeamsForProject(projectId).then(
            (teams: Team[]) => {
                this._actions.fetchTeamsSucceeded.invoke(teams);
            }, (error: TfsError) => {
                if (error) {
                    publishErrorToTelemetry(error);
                }
                this._actions.fetchTeamsFailed.invoke(error);
            }
        );
    }

    public async selectTeamAndBacklogLevel(team: Team, backlogLevel: IBacklogLevelConfiguration): Promise<void> {
        const loadScenario = getScenarioManager().startScenario(BacklogsHubConstants.HUB_NAME, BacklogsHubTelemetryConstants.MAPPING_INITIAL_LOAD);

        try {
            this._actions.teamSelected.invoke(team);
            const teamSettings = await getService(TeamAwarenessService).beginGetTeamSettings(team.id);
            this._actions.teamSettingsLoaded.invoke(teamSettings);
            this._actions.beginFetchWorkItems.invoke(null);
            const projectId: string = this._getProjectId();

            const backlogLevelVisible = await this._dataProvider.isBacklogVisible(backlogLevel.id, projectId, team.id);
            const workItemIds = await this._dataProvider.fetchWorkItemsForBacklog(projectId, team.id, backlogLevel.id);
            if (workItemIds) {
                this._actions.fetchBacklogAndWorkItemIdsSucceeded.invoke({ backlogLevelVisible, workItemIds });

                BacklogsHubTelemetryHelper.publishTelemetry(BacklogsHubTelemetryConstants.MAPPING_WORKITEMIDS_LOADED, {
                    [BacklogsHubTelemetryConstants.ItemCount]: workItemIds.length
                });

                loadScenario.addData({ [BacklogsHubTelemetryConstants.ItemCount]: workItemIds.length });

                // Take the first 200 and page them
                const workItemIdsToPage = workItemIds.slice(0, PageSizes.QUERY);
                loadScenario.addSplitTiming(BacklogsHubTelemetryConstants.IdsLoadedSplit);
                await this.pageWorkItems(workItemIdsToPage, false /* dont publish telemetry*/)

                loadScenario.end();
            }
        } catch (error) {
            if (error) {
                publishErrorToTelemetry(error);
            }

            this._actions.fetchBacklogAndWorkItemIdsFailed.invoke(error);
            loadScenario.abort();
        }
    }

    public pageWorkItems(workItemIds: number[], publishTelemetry: boolean = true): Promise<void> {
        this._actions.beginPageWorkItems.invoke(workItemIds);
        return this._dataProvider.pageWorkItems(workItemIds).then(
            (workItems: IWorkItem[]) => {
                this._actions.pageWorkItemsSucceeded.invoke({ workItemIds, workItems });
                if (publishTelemetry) {
                    BacklogsHubTelemetryHelper.publishTelemetry(BacklogsHubTelemetryConstants.MAPPING_WORKITEMS_PAGED, {
                        [BacklogsHubTelemetryConstants.ItemCount]: workItemIds.length
                    });
                }
            },
            (error: TfsError) => {
                if (error) {
                    publishErrorToTelemetry(error);
                }

                this._actions.pageWorkItemsFailed.invoke({ workItemIds, error });
            }
        );
    }

    public workItemChanged(workItem: IWorkItem): void {
        this._actions.workItemUpdated.invoke(workItem);
    }

    public workItemRemoved(workItemId: number): void {
        this._actions.workItemRemoved.invoke(workItemId);
    }

    private _getProjectId(): string {
        return getDefaultWebContext().project.id;
    }
}