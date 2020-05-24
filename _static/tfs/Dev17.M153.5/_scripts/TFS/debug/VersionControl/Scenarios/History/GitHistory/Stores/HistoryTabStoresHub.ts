import { HistoryTabActionsHub, HistoryItemsLoadedPayload, IMessage, HistoryPermissionSet } from "VersionControl/Scenarios/History/GitHistory/Actions/HistoryTabActionsHub";
import { HistoryListPermissionsStore } from "VersionControl/Scenarios/History/GitHistory/Stores/HistoryListPermissionsStore";
import { HistoryListStore, HistoryListState } from "VersionControl/Scenarios/History/GitHistory/Stores/HistoryListStore";
import { IHistoryGraph } from "VersionControl/Scenarios/History/GitHistory/GitGraph/HistoryGraphContracts";
import { GitCommitArtifactsMap } from "VersionControl/Scenarios/History/GitHistory/GitCommitExtendedContracts";
import { GitRepositoryPermissionSet, GitPermissionSet } from "VersionControl/Scenarios/Shared/Permissions/GitPermissionsSource";
import { PermissionsStore } from "VersionControl/Scenarios/Shared/Permissions/PermissionsStore";
import { SettingsPermissions } from "VersionControl/Scenarios/Shared/Permissions/SettingsPermissionsSource";
import { ChangeList } from "VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts";

export interface HistoryTabAggregatedState {
    historyListState: HistoryListState;
}

/**
 * A container class to get together the stores of History page, so they can be accessed easily.
 */
export class HistoryTabStoresHub {

    public historyListStore: HistoryListStore;
    public permissionsStore: HistoryListPermissionsStore;
    public settingPermissionStore: PermissionsStore<SettingsPermissions, SettingsPermissions>;
    constructor(private _actionsHub: HistoryTabActionsHub) {
        this.historyListStore = new HistoryListStore();
        this.permissionsStore = new HistoryListPermissionsStore();
        this.settingPermissionStore = new PermissionsStore<SettingsPermissions, SettingsPermissions>();
        this._initializeHistoryStoresHub(this._actionsHub);
    }

    public dispose(): void {

        if (this._actionsHub) {
            if (this.historyListStore) {
                this._actionsHub.historyItemsLoaded.removeListener(this._historyItemsLoadedListener);
                this._actionsHub.historyArtifactsLoaded.removeListener(this._historyArtifactsLoadedListener);
                this._actionsHub.historyFullCommentLoaded.removeListener(this._historyFullCommentLoadedListener)
                this._actionsHub.historyItemsLoadStarted.removeListener(this._historyItemsLoadStartedListener);
                this._actionsHub.historyItemsLoadErrorRaised.removeListener(this._historyItemsLoadErrorRaisedListener);
                this._actionsHub.historyItemsCleared.removeListener(this._historyItemsClearedListener);
                this._actionsHub.historyArtifactsLoadStarted.removeListener(this._historyArtifactsLoadStartedListener);
                this._actionsHub.historyGraphRowSelected.removeListener(this._historyGraphRowSelectedListener);
                this._actionsHub.historyGraphRowUnSelected.removeListener(this._historyGraphRowUnSelectedListener);
                this._actionsHub.historyGraphMessageDismissed.removeListener(this._historyGraphMessageDismissedListener);
                this._actionsHub.toggleFilterPanelVisibility.removeListener(this._toogleHistoryFilterPanelVisibility);
                this._actionsHub.permissionsUpdated.removeListener(this._historyListUpdatePermissions);
            }
            if (this.settingPermissionStore) {
                this._actionsHub.settingsPermissionsUpdated.removeListener(this._settingsPermissions);
                this.settingPermissionStore = null;
            }
        }

        if (this.historyListStore) {
            this.historyListStore.dispose();
            this.historyListStore = null;
        }

        if (this.permissionsStore) {
            this.permissionsStore = null;
        }

        this._actionsHub = null;
    }

    public getAggregatedState = (): HistoryTabAggregatedState => {
        return {
            historyListState: this.historyListStore.state
        };
    }

    private _initializeHistoryStoresHub(actionsHub: HistoryTabActionsHub): void {
        actionsHub.historyItemsLoaded.addListener(this._historyItemsLoadedListener);
        actionsHub.historyArtifactsLoaded.addListener(this._historyArtifactsLoadedListener);
        actionsHub.historyFullCommentLoaded.addListener(this._historyFullCommentLoadedListener);
        actionsHub.historyItemsLoadStarted.addListener(this._historyItemsLoadStartedListener);
        actionsHub.historyItemsLoadErrorRaised.addListener(this._historyItemsLoadErrorRaisedListener);
        actionsHub.historyItemsCleared.addListener(this._historyItemsClearedListener);
        actionsHub.historyArtifactsLoadStarted.addListener(this._historyArtifactsLoadStartedListener);
        actionsHub.historyGraphRowSelected.addListener(this._historyGraphRowSelectedListener);
        actionsHub.historyGraphRowUnSelected.addListener(this._historyGraphRowUnSelectedListener);
        actionsHub.historyGraphMessageDismissed.addListener(this._historyGraphMessageDismissedListener);
        actionsHub.toggleFilterPanelVisibility.addListener(this._toogleHistoryFilterPanelVisibility);
        actionsHub.permissionsUpdated.addListener(this._historyListUpdatePermissions);
        actionsHub.settingsPermissionsUpdated.addListener(this._settingsPermissions);
    }

    private _toogleHistoryFilterPanelVisibility = (): void => {
        this.historyListStore.toggleFilterPanelVisibility();
    }

    private _historyItemsLoadedListener = (payload: HistoryItemsLoadedPayload): void => {
        this.historyListStore.populateHistoryList(payload);
    }

    private _historyArtifactsLoadedListener = (payload: GitCommitArtifactsMap): void => {
        this.historyListStore.mergeArtifactsToHistoryList(payload);
    }

    private _historyFullCommentLoadedListener = (payload: ChangeList): void => {
        this.historyListStore.updateFullComment(payload);
    }

    private _historyItemsLoadStartedListener = (): void => {
        this.historyListStore.clearAndStartLoading();
    }

    private _historyItemsLoadErrorRaisedListener = (payload: Error): void => {
        this.historyListStore.failLoad(payload);
    }

    private _historyItemsClearedListener = (): void => {
        this.historyListStore.clear();
    }

    private _historyArtifactsLoadStartedListener = (): void => {
        this.historyListStore.startLoadingArtifacts();
    }

    private _historyGraphRowSelectedListener = (historyGraph: IHistoryGraph): void => {
        this.historyListStore.historyGraphUpdated(historyGraph);
    }

    private _historyGraphRowUnSelectedListener = (historyGraph: IHistoryGraph): void => {
        this.historyListStore.historyGraphUpdated(historyGraph);
    }

    private _historyGraphMessageDismissedListener = (key: string): void => {
        this.historyListStore.dismissGraphMessage(key);
    }

    private _historyListUpdatePermissions = (permissionSet: GitRepositoryPermissionSet): void => {
        this.permissionsStore.onPermissionsUpdated(permissionSet);
    }

    private _settingsPermissions = (permissionSet: SettingsPermissions): void => {
        this.settingPermissionStore.onPermissionsUpdated(permissionSet);
    }
}
