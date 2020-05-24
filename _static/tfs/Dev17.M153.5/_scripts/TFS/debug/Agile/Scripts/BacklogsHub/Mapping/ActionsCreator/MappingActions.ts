import { Team } from "Agile/Scripts/Models/Team";
import { WorkItem as IWorkItem } from "TFS/WorkItemTracking/Contracts";
import { Action } from "VSS/Flux/Action";
import { registerDiagActions } from "VSS/Flux/Diag";
import { ActionsHub } from "Agile/Scripts/Common/ActionsHub";
import { ITeamSettings } from "Presentation/Scripts/TFS/FeatureRef/TFS.AgileCommon";

const ACTION_SCOPE = "MAPPING_PANE";

@registerDiagActions
export class MappingActions extends ActionsHub {
    public readonly beginFetchTeams: Action<void> = this.createAction<void>();
    public readonly fetchTeamsSucceeded: Action<Team[]> = this.createAction<Team[]>();
    public readonly fetchTeamsFailed: Action<TfsError> = this.createAction<TfsError>();
    public readonly teamSelected = this.createAction<Team>();
    public readonly teamSettingsLoaded = this.createAction<ITeamSettings>();

    public readonly beginFetchWorkItems: Action<void> = this.createAction<void>();
    public readonly fetchBacklogAndWorkItemIdsSucceeded: Action<{ backlogLevelVisible: boolean; workItemIds: number[] }> = this.createAction<{ backlogLevelVisible: boolean; workItemIds: number[] }>();
    public readonly fetchBacklogAndWorkItemIdsFailed: Action<TfsError> = this.createAction<TfsError>();

    public readonly beginPageWorkItems: Action<number[]> = this.createAction<number[]>();
    public readonly pageWorkItemsSucceeded: Action<{ workItemIds: number[]; workItems: IWorkItem[] }> = this.createAction<{ workItemIds: number[]; workItems: IWorkItem[] }>();
    public readonly pageWorkItemsFailed: Action<{ workItemIds: number[]; error: TfsError }> = this.createAction<{ workItemIds: number[]; error: TfsError }>();

    public readonly workItemUpdated: Action<IWorkItem> = this.createAction<IWorkItem>();
    public readonly workItemRemoved: Action<number> = this.createAction<number>();

    constructor() {
        super(ACTION_SCOPE);
    }
}