import { MappingActions } from "Agile/Scripts/BacklogsHub/Mapping/ActionsCreator/MappingActions";
import { Team } from "Agile/Scripts/Models/Team";
import { ITeamSettings } from "Presentation/Scripts/TFS/FeatureRef/TFS.AgileCommon";
import { WorkItem as IWorkItem } from "TFS/WorkItemTracking/Contracts";
import { Debug } from "VSS/Diag";
import { IStore, Store } from "VSS/Flux/Store";
import { findIndex } from "VSS/Utils/Array";
import { localeComparer } from "VSS/Utils/String";

export interface IMappingStore extends IStore {
    readonly isBacklogLevelVisible: boolean;
    readonly selectedTeam: Team;
    readonly selectedTeamSettings: ITeamSettings;
    readonly teams: Team[];
    readonly teamsLoading: boolean;
    readonly workItemIds: number[];
    readonly workItemIdsLoading: boolean;
    readonly workItemIdsLoadingError: TfsError;
    readonly workItemPageError: TfsError;
    getWorkItem(workItemId: number): IWorkItem;
    isWorkItemError(workItemId: number): boolean;
    shouldPageWorkItem(workItemId: number): boolean;
}

export class MappingStore extends Store implements IMappingStore {
    private _isBacklogLevelVisible: boolean;
    private _selectedTeam: Team;
    private _selectedTeamSettings: ITeamSettings;
    private _teams: Team[];
    private _teamsLoading: boolean;
    private _workItemIds: number[];
    private _workItemIdsLoading: boolean;
    private _workItemIdsLoadingError: TfsError;
    private _workItemPageError: TfsError;
    private _workItemErrors: IDictionaryNumberTo<boolean>;
    private _workItemLoading: IDictionaryNumberTo<boolean>;
    private _pagedWorkItems: IDictionaryNumberTo<IWorkItem>;

    public get isBacklogLevelVisible(): boolean {
        return this._isBacklogLevelVisible;
    }

    public get selectedTeam(): Team {
        return this._selectedTeam;
    }

    public get selectedTeamSettings(): ITeamSettings {
        return this._selectedTeamSettings;
    }

    public get teams(): Team[] {
        return this._teams;
    }

    public get teamsLoading(): boolean {
        return this._teamsLoading;
    }

    public get workItemIds(): number[] {
        return this._workItemIds;
    }

    public get workItemIdsLoading(): boolean {
        return this._workItemIdsLoading;
    }

    public get workItemIdsLoadingError(): TfsError {
        return this._workItemIdsLoadingError;
    }

    public get workItemPageError(): TfsError {
        return this._workItemPageError;
    }

    constructor(actions: MappingActions) {
        super();
        this._registerActionHandlers(actions);
        this._teamsLoading = false;
        this._workItemIdsLoading = false;
        this._workItemErrors = {};
        this._workItemLoading = {};
        this._pagedWorkItems = {};
    }

    public getWorkItem(workItemId: number): IWorkItem {
        if (this._pagedWorkItems) {
            return this._pagedWorkItems[workItemId];
        }

        return undefined;
    }

    public isWorkItemError(workItemId: number): boolean {
        return !!this._workItemErrors[workItemId];
    }

    public shouldPageWorkItem(workItemId: number): boolean {
        return (
            !this._pagedWorkItems[workItemId] &&
            !this._workItemErrors[workItemId] &&
            !this._workItemLoading[workItemId]
        );
    }

    private _registerActionHandlers(actions: MappingActions): void {
        actions.beginFetchTeams.addListener(this._handleBeginFetchTeamsAction);
        actions.fetchTeamsSucceeded.addListener(this._handleFetchTeamsSucceededAction);
        actions.fetchTeamsFailed.addListener(this._handleFetchTeamsFailedAction);
        actions.teamSelected.addListener(this._handleTeamSelectedAction);
        actions.teamSettingsLoaded.addListener(this._handleTeamSettingsLoadedAction);
        actions.beginFetchWorkItems.addListener(this._handleBeginFetchWorkItemsAction);
        actions.fetchBacklogAndWorkItemIdsSucceeded.addListener(this._handleFetchWorkItemIdsSucceededAction);
        actions.fetchBacklogAndWorkItemIdsFailed.addListener(this._handleFetchWorkItemIdsFailedAction);
        actions.beginPageWorkItems.addListener(this._handleBeginPageWorkItems);
        actions.pageWorkItemsSucceeded.addListener(this._handlePageWorkItemsSucceededAction);
        actions.pageWorkItemsFailed.addListener(this._handlePageWorkItemsFailedAction);
        actions.workItemUpdated.addListener(this._handleWorkItemUpdatedAction);
        actions.workItemRemoved.addListener(this._handleWorkItemRemovedAction);
    }

    private _handleBeginFetchTeamsAction = (): void => {
        this._teamsLoading = true;
        this.emitChanged();
    }

    private _handleFetchTeamsSucceededAction = (teams: Team[]): void => {
        this._teamsLoading = false;
        this._teams = teams;
        this._teams.sort((a, b) => localeComparer(a.name, b.name));
        this.emitChanged();
    }

    private _handleFetchTeamsFailedAction = (error: TfsError): void => {
        this._teamsLoading = false;
        this.emitChanged();
    }

    private _handleTeamSelectedAction = (team: Team): void => {
        this._selectedTeam = team;
        this.emitChanged();
    }

    private _handleTeamSettingsLoadedAction = (teamSettings: ITeamSettings): void => {
        this._selectedTeamSettings = teamSettings;
        this.emitChanged();
    }

    private _handleBeginFetchWorkItemsAction = (): void => {
        this._workItemIdsLoading = true;
        this._workItemIds = [];
        this._pagedWorkItems = {};
        this._workItemErrors = {};
        this._workItemIdsLoadingError = null;
        this._workItemPageError = null;
        this.emitChanged();
    }

    private _handleFetchWorkItemIdsSucceededAction = (payload: { backlogLevelVisible: boolean; workItemIds: number[]; }): void => {
        this._isBacklogLevelVisible = payload.backlogLevelVisible;
        this._workItemIds = payload.workItemIds;
        this._workItemIdsLoading = false;
        this.emitChanged();
    }

    private _handleFetchWorkItemIdsFailedAction = (error: TfsError): void => {
        this._workItemIdsLoading = false;
        this._workItemIdsLoadingError = error;
        this.emitChanged();
    }

    private _handleBeginPageWorkItems = (workItemIds: number[]): void => {
        // NOTE: No need to emit changed from this action as it does not result in a UI change
        // The UI will use this information to decide which items to page

        if (workItemIds) {
            workItemIds.forEach(id => this._workItemLoading[id] = true);
        }
    }

    private _handlePageWorkItemsSucceededAction = (payload: { workItemIds: number[]; workItems: IWorkItem[] }): void => {
        const {
            workItems,
            workItemIds
        } = payload;

        Debug.assertIsNotNull(this._workItemIds, "FetchWorkItemIds must have been invoked before pageWorkItemSucceeded action");
        if (!this._workItemIds) {
            this._workItemIds = [];
        }

        if (workItems) {
            workItems.forEach((workItem: IWorkItem) => {
                this._pagedWorkItems[workItem.id] = workItem;
                delete this._workItemLoading[workItem.id];
            });

            this._workItemIds = [...this._workItemIds];

            if (workItemIds.length !== workItems.length) {
                // Some items were deleted, we need to remove them from the list
                for (const id of workItemIds) {
                    if (!this._pagedWorkItems[id]) {
                        // This item was deleted, remove the index from the workItemIds array
                        const workItemIdIndex = this._workItemIds.indexOf(id);
                        this._workItemIds.splice(workItemIdIndex, 1);
                    }
                }
            }

            this.emitChanged();
        }
    }

    private _handlePageWorkItemsFailedAction = (payload: { workItemIds: number[]; error: TfsError }): void => {
        if (payload && payload.workItemIds) {
            payload.workItemIds.forEach(id => {
                this._workItemErrors[id] = true;
                delete this._workItemLoading[id];
            });

            this._workItemPageError = payload.error;
            this.emitChanged();
        }
    }

    private _handleWorkItemUpdatedAction = (workItem: IWorkItem): void => {
        Debug.assertIsNotNull(this._workItemIds, "FetchWorkItemIds must have been invoked before workItemUpdated action");
        if (!this._workItemIds) {
            this._workItemIds = [];
        }

        const workItemExists = findIndex(this._workItemIds, id => id === workItem.id) >= 0;

        // Replace the array instance so that Fabric List will re-render
        this._workItemIds = [...this._workItemIds];

        if (!workItemExists) {
            this._workItemIds.push(workItem.id);
            this._pagedWorkItems[workItem.id] = workItem;
        } else {
            this._pagedWorkItems[workItem.id] = workItem;
        }

        this.emitChanged();
    }

    private _handleWorkItemRemovedAction = (workItemId: number): void => {
        Debug.assertIsNotNull(this._workItemIds, "FetchWorkItemIds must have been invoked before workItemRemoved action");
        if (!this._workItemIds) {
            this._workItemIds = [];
        }

        const workItemIdIndex = findIndex(this._workItemIds, id => id === workItemId);
        if (workItemIdIndex >= 0) {
            // Replace the array instance so that Fabric List will re-render
            this._workItemIds = [...this._workItemIds];
            this._workItemIds.splice(workItemIdIndex, 1);
            delete this._pagedWorkItems[workItemId];
            this.emitChanged();
        }
    }
}
