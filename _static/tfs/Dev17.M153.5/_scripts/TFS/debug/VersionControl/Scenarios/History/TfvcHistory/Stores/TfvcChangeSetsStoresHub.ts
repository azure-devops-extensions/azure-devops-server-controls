import { TfvcActionsHub } from "VersionControl/Scenarios/History/TfvcHistory/Actions/TfvcActionsHub";
import { TfvcChangeSetsStore, TfvcChangeSetsStoreState } from "VersionControl/Scenarios/History/TfvcHistory/Stores/TfvcChangeSetsStore";
import { CriteriaChangedPayload, ErrorPayload, TfvcHistoryListPayload, TfvcHistoryLoadStartPayload } from "VersionControl/Scenarios/History/TfvcHistory/TfvcInterfaces"
import { NotificationStore, NotificationState } from "VersionControl/Scenarios/Shared/Notifications/NotificationStore";
import { PathState, PathStore } from "VersionControl/Scenarios/Shared/Path/PathStore";
import { ContextStore } from "VersionControl/Scenarios/Shared/Stores/ContextStore";
import { ChangeList, HistoryQueryResults } from "VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts";
import { RepositoryChangedPayload, SelectedPathChangedPayload } from "VersionControl/Scenarios/History/CommonPayloadInterfaces"
import { TfvcChangesetsFilterStore } from "VersionControl/Scenarios/History/TfvcHistory/Stores/TfvcChangesetsFilterStore";
import { ChangesetsFilterSearchCriteria } from "VersionControl/Scenarios/History/TfvcHistory/Components/ChangesetsFilter";
import { RepositoryContext } from "VersionControl/Scripts/RepositoryContext";

export interface AggregateState {
    pathState: PathState;
    filterState: ChangesetsFilterSearchCriteria;
    changesetsState: TfvcChangeSetsStoreState;
    repositoryContext: RepositoryContext;
}

/**
 * A container class to get together the stores of Tfvc Changesets page, so they can be accessed easily.
 */
export class TfvcChangeSetsStoresHub {

    public tfvcChangeSetsStore: TfvcChangeSetsStore;
    public notificationStore: NotificationStore;
    public pathStore: PathStore;
    public filterStore: TfvcChangesetsFilterStore;
    public contextStore: ContextStore;

    constructor(private _actionsHub: TfvcActionsHub) {
        this._createTfvcHistoryStore(_actionsHub);
        this._createNotificationStore(this._actionsHub);
        this._createPathStore(this._actionsHub);
        this._createTfvcChangesetsFilterStore();
        this._createContextStore(this._actionsHub);
    }

    public getChangeSetsPageState = (): AggregateState => ({
            pathState: this.pathStore.state,
            filterState: this.filterStore.state,
            changesetsState: this.tfvcChangeSetsStore.state,
            repositoryContext: this.contextStore.getRepositoryContext(),
    });

    public getFilterState = (): ChangesetsFilterSearchCriteria => {
        return this.filterStore && this.filterStore.state;
    };

    public getPathState = (): PathState => {
        return this.pathStore && this.pathStore.state;
    };

    public dispose(): void {

        if (this._actionsHub) {
            if (this.tfvcChangeSetsStore) {
                this._actionsHub.currentRepositoryChanged.removeListener(this._onCurrentRepositoryChanged);
                this._actionsHub.tfvcHistoryItemsLoaded.removeListener(this._tfvcHistoryItemsLoadedListener);
                this._actionsHub.tfvcHistoryItemsLoadStarted.removeListener(this._tfvcHistoryItemsLoadStartedListener);
                this._actionsHub.errorRaised.removeListener(this._errorRaisedTfvcHistoryStoreListener);
                this._actionsHub.tfvcHistoryClearAllErrorsRaised.removeListener(this._tfvcHistoryClearAllErrorsRaisedListener);
                this._actionsHub.changeTypeHistoryItemsCollapsed.removeListener(this.tfvcChangeSetsStore.collapseChangeset);
            }
            if (this.notificationStore) {
                this._actionsHub.errorRaised.removeListener(this._tfvcHistoryItemsLoadErrorRaisedNotificationStoreListener);
                this._actionsHub.errorFlushed.removeListener(this._errorFlushedListener);
            }
            if (this.pathStore) {
                this._actionsHub.criteriaChanged.removeListener(this._oncriteriaChanged);
                this._actionsHub.pathEditingStarted.removeListener(this.pathStore.startEditing);
                this._actionsHub.pathEdited.removeListener(this.pathStore.changeInputText);
                this._actionsHub.pathEditingCancelled.removeListener(this.pathStore.cancelEditing);
            }
            if (this.filterStore) {
                this._actionsHub.criteriaChanged.removeListener(this.filterStore.updateFilters);
            }
        }

        if (this.tfvcChangeSetsStore) {
            this.tfvcChangeSetsStore.dispose();
        }
        this.tfvcChangeSetsStore = null;
        this.notificationStore = null;
        this.pathStore = null;
        this.filterStore = null;
        this.contextStore = null;
        this._actionsHub = null;
    }

    private _createTfvcChangesetsFilterStore(): void {
        this.filterStore = new TfvcChangesetsFilterStore();
        this._actionsHub.criteriaChanged.addListener(this.filterStore.updateFilters);
    }

    private _createTfvcHistoryStore(actionsHub: TfvcActionsHub): void {
        this.tfvcChangeSetsStore = new TfvcChangeSetsStore();
        actionsHub.currentRepositoryChanged.addListener(this._onCurrentRepositoryChanged);
        actionsHub.tfvcHistoryItemsLoaded.addListener(this._tfvcHistoryItemsLoadedListener);
        actionsHub.tfvcHistoryItemsLoadStarted.addListener(this._tfvcHistoryItemsLoadStartedListener);
        actionsHub.errorRaised.addListener(this._errorRaisedTfvcHistoryStoreListener);
        actionsHub.tfvcHistoryClearAllErrorsRaised.addListener(this._tfvcHistoryClearAllErrorsRaisedListener);
        actionsHub.changeTypeHistoryItemsCollapsed.addListener(this.tfvcChangeSetsStore.collapseChangeset);
    }

    private _createNotificationStore(actionsHub: TfvcActionsHub): void {
        this.notificationStore = new NotificationStore();
        actionsHub.errorRaised.addListener(this._tfvcHistoryItemsLoadErrorRaisedNotificationStoreListener);
        actionsHub.errorFlushed.addListener(this._errorFlushedListener);
    }

    private _createPathStore(actionsHub: TfvcActionsHub): void {
        this.pathStore = new PathStore();
        actionsHub.currentRepositoryChanged.addListener(payload => this.pathStore.changeRepository(payload.repositoryName, payload.isGit));
        this._actionsHub.criteriaChanged.addListener(this._oncriteriaChanged);
        this._actionsHub.currentRepositoryChanged.addListener(this._onCurrentRepositoryChanged);
        this._actionsHub.pathEditingStarted.addListener(this.pathStore.startEditing);
        this._actionsHub.pathEdited.addListener(this.pathStore.changeInputText);
        this._actionsHub.pathEditingCancelled.addListener(this.pathStore.cancelEditing);
    }

    private _createContextStore(actionsHub: TfvcActionsHub): void {
        this.contextStore = new ContextStore();
        actionsHub.currentRepositoryChanged.addListener(payload =>
            this.contextStore.onContextUpdated({
                tfsContext: payload.repositoryContext.getTfsContext(),
                repositoryContext: payload.repositoryContext,
            }));
    }

    get pathState(): PathState {
        return this.pathStore ? this.pathStore.state : {} as PathState;
    }

    private _onCurrentRepositoryChanged = (payload: RepositoryChangedPayload): void => {
        this.pathStore.changeRepository(payload.repositoryName, payload.isGit);
    }

    private _oncriteriaChanged = (payload: CriteriaChangedPayload): void => {
        this.pathStore.setPath(payload.itemPath);
    }

    private _tfvcHistoryItemsLoadedListener = (payload: TfvcHistoryListPayload): void => {
        this.tfvcChangeSetsStore.loadHistoryList(payload);
    }

    private _tfvcHistoryItemsLoadStartedListener = (payload: TfvcHistoryLoadStartPayload): void => {
        this.tfvcChangeSetsStore.setLoadingStarted(payload);
    }

    private _errorRaisedTfvcHistoryStoreListener = (payload: ErrorPayload): void => {
        this.tfvcChangeSetsStore.failLoad(payload);
    }

    private _tfvcHistoryClearAllErrorsRaisedListener = (): void => {
        this.tfvcChangeSetsStore.clearAllErrors();
    }

    private _tfvcHistoryItemsLoadErrorRaisedNotificationStoreListener = (payload: ErrorPayload): void => {
        this.notificationStore.addSoloError(payload.error);
    }

    private _errorFlushedListener = (): void => {
        this.notificationStore.clearErrors();
    }
}
