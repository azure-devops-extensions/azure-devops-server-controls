import {
    ActionsHub,
    PathSearchSelectionChangedPayload } from "VersionControl/Scenarios/History/GitHistory/Actions/ActionsHub";
import { RepositoryChangedPayload, SelectedPathChangedPayload } from "VersionControl/Scenarios/History/CommonPayloadInterfaces";
import { HistoryListPermissionsStore } from "VersionControl/Scenarios/History/GitHistory/Stores/HistoryListPermissionsStore";
import { SearchCriteriaStore, SearchCriteriaState } from "VersionControl/Scenarios/History/GitHistory/Stores/SearchCriteriaStore";
import { VersionStore, VersionState } from "VersionControl/Scenarios/History/GitHistory/Stores/VersionStore";
import { ActionListener } from "VersionControl/Scenarios/Shared/ActionListener";
import { PathSearchStore, PathSearchState } from "VersionControl/Scenarios/Shared/Path/PathSearchStore";
import { PathState, PathStore } from "VersionControl/Scenarios/Shared/Path/PathStore";
import { ContextStore } from "VersionControl/Scenarios/Shared/Stores/ContextStore";
import { RepositoryContext } from "VersionControl/Scripts/RepositoryContext";
import { VersionSpec } from "VersionControl/Scripts/TFS.VersionControl.VersionSpecs";

export interface AggregatedState {
    pathState: PathState;
    versionState: VersionState;
    pathSearchState: PathSearchState;
    repositoryContext: RepositoryContext;
    searchCriteriaState: SearchCriteriaState;
}

/**
 * A container class to get together the stores of History page, so they can be accessed easily.
 */
export class StoresHub {
    private _actionListner: ActionListener;

    constructor(actionsHub: ActionsHub, private _pathSearchEnabled?: boolean) {
        this._actionListner = new ActionListener();

        this.pathStore = new PathStore();
        this._actionListner.addListener(actionsHub.currentRepositoryChanged, this._onCurrentRepositoryChanged);
        this._actionListner.addListener(actionsHub.selectedPathChanged, this._onSelectedPathChanged);
        this._actionListner.addListener(actionsHub.pathEditingStarted, this.pathStore.startEditing);
        this._actionListner.addListener(actionsHub.pathEdited, this.pathStore.changeInputText);
        this._actionListner.addListener(actionsHub.pathEditingCancelled, this.pathStore.cancelEditing);

        this.versionStore = new VersionStore();
        this._actionListner.addListener(actionsHub.selectedPathChanged, this.versionStore.selectVersion);
        this._actionListner.addListener(actionsHub.deletedBranchChanged, this.versionStore.changeDeletedBranch);
        this._actionListner.addListener(actionsHub.notificationDismissed, this._onNotificationDismissed);

        this.searchCriteriaStore = new SearchCriteriaStore();
        this._actionListner.addListener(actionsHub.searchCriteriaUpdated, this.searchCriteriaStore.updateSearchCriteria);

        this.historyListPermissionsStore = new HistoryListPermissionsStore();
        this._actionListner.addListener(actionsHub.permissionUpdate, this.historyListPermissionsStore.onPermissionsUpdated);

        this.contextStore = new ContextStore();

        if (this._pathSearchEnabled) {
            this._actionListner.addListener(actionsHub.pathSearchSelectionChanged, this._onPathSearchSelectionChangedListenerForPathStore);
            this.pathSearchStore = new PathSearchStore();
            this._actionListner.addListener(actionsHub.pathEditingStarted, this.pathSearchStore.setInitialSearchText);
            this._actionListner.addListener(actionsHub.pathEdited, this.pathSearchStore.onPathEdit);
            this._actionListner.addListener(actionsHub.selectedPathChanged, this.pathSearchStore.reset);
            this._actionListner.addListener(actionsHub.pathEditingCancelled, this.pathSearchStore.reset);
            this._actionListner.addListener(actionsHub.pathSearchSelectionChanged, this._onPathSearchSelectionChangedListenerForPathSearchStore);
            this._actionListner.addListener(actionsHub.globalPathSearchResultsLoaded, this.pathSearchStore.setGlobalSearchResults);
            this._actionListner.addListener(actionsHub.inFolderPathSearchResultsLoaded, this.pathSearchStore.setInFolderSearchResults);
            this._actionListner.addListener(actionsHub.pathSearchFailed, this.pathSearchStore.failPathSearch);
        }       
    }

    public pathStore: PathStore;
    public versionStore: VersionStore;
    public pathSearchStore: PathSearchStore;
    public contextStore: ContextStore;
    public searchCriteriaStore: SearchCriteriaStore;
    public historyListPermissionsStore: HistoryListPermissionsStore;

    get version(): string {
        const versionSpec = this.versionSpec;
        return versionSpec ? versionSpec.toVersionString() : null;
    }

    get versionSpec(): VersionSpec {
        return this.versionStore ? this.versionStore.state.versionSpec : null;
    }

    get pathState(): PathState {
        return this.pathStore ? this.pathStore.state : {} as PathState;
    }

    get isGit(): boolean {
        return this.pathState ? this.pathState.isGit : null;
    }

    public getState(): AggregatedState {
        return {
            pathState: this.pathStore.state,
            versionState: this.versionStore.state,
            pathSearchState: this.pathSearchStore.getState(),
            repositoryContext: this.contextStore.getRepositoryContext(),
            searchCriteriaState: this.searchCriteriaStore.state,
        }
    }

    public dispose(): void {
        if (this._actionListner) {
            this._actionListner.disposeActions();
            this._actionListner = null;
        }
    }

    private _onCurrentRepositoryChanged = (payload: RepositoryChangedPayload): void => {
        this.pathStore.changeRepository(payload.repositoryName, payload.isGit);
        this.contextStore.onContextUpdated({
            tfsContext: payload.repositoryContext.getTfsContext(),
            repositoryContext: payload.repositoryContext,
        })
    }

    private _onSelectedPathChanged = (payload: SelectedPathChangedPayload): void => {
        this.pathStore.setPath(payload.path);
    }

    private _onPathSearchSelectionChangedListenerForPathStore = (payload: PathSearchSelectionChangedPayload): void => {
        this.pathStore.changeInputText(payload.newInputText);
    }

    private _onPathSearchSelectionChangedListenerForPathSearchStore = (payload: PathSearchSelectionChangedPayload): void => {
        this.pathSearchStore.selectItem(payload.itemIdentifier);
    }

    private _onNotificationDismissed = (): void => {
        this.versionStore.changeDeletedBranch("");
    }
}
