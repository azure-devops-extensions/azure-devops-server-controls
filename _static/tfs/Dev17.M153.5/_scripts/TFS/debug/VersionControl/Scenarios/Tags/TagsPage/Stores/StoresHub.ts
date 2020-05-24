import { format as formatString } from "VSS/Utils/String";
import {
    ActionsHub,
    TagDeletionStatus,
    TagDeletionStatusChangeReason,
    TagsPageResults
} from "VersionControl/Scenarios/Tags/TagsPage/Actions/ActionsHub";
import { TagsPageTreeAdapter } from "VersionControl/Scenarios/Tags/TagsPage/Stores/TagsPageTreeAdapter";

import { ContextStore } from "VersionControl/Scenarios/Shared/Stores/ContextStore";
import * as VSSStore from "VSS/Flux/Store";
import { IContextUpdatedPayload } from "VersionControl/Scripts/Actions/PullRequestReview/ActionsHub";
import { RepositoryContext } from "VersionControl/Scripts/RepositoryContext";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import { DeletionStore, DeletionState } from "VersionControl/Scenarios/Tags/TagsPage/Stores/TagDeletionStore";
import { FilterStore, FilterState } from "VersionControl/Scenarios/Tags/TagsPage/Stores/FilterStore";
import { NotificationStore, NotificationState } from "VersionControl/Scenarios/Tags/TagsPage/Stores/NotificationStore";
import { TagStore, TagState } from "VersionControl/Scenarios/Tags/TagsPage/Stores/TagsStore";
import { PermissionStore, PermissionsSet } from "VersionControl/Scenarios/Tags/TagsPage/Stores/PermissionStore";
import { GitRepositoryPermissionSet } from "VersionControl/Scenarios/Shared/Permissions/GitPermissionsSource";
import { SettingsPermissions } from "VersionControl/Scenarios/Shared/Permissions/SettingsPermissionsSource";

export interface Stores {
    treeStore: TagStore;
    contextStore: ContextStore;
    filterStore: FilterStore;
    tagDeletionStore: DeletionStore;
    notificationStore: NotificationStore;
    permissionStore: PermissionStore;
}

export interface AggregatedState {
    treeState: TagState;
    contextStoreState: ContextStore; // this store does not expose any state and contains getters for state instead
    filterState: FilterState;
    tagDeletionState: DeletionState;
    notificationState: NotificationState;
    permissionState: PermissionsSet;
}

export class StoresHub implements IDisposable {
    public stores: Stores;
    public state: AggregatedState;

    constructor(private _actionsHub: ActionsHub) {

        this.stores = {
            treeStore: this._createOnDemandTreeStore(),
            contextStore: this._createContextStore(),
            filterStore: this._createFilterStore(),
            tagDeletionStore: this._createDeletionStore(),
            notificationStore: this._createNotificationStore(),
            permissionStore: this._createPremissionStore(),
        }
    }

    public dispose = (): void => {
        this._disposeStore();
        this._actionsHub = null;
    }

    private _createOnDemandTreeStore = (): TagStore => {
        const treeStore = new TagStore(new TagsPageTreeAdapter());
        this._actionsHub.tagsAdded.addListener(treeStore.addTags);
        this._actionsHub.folderExpanded.addListener(treeStore.onFolderExpanded);
        this._actionsHub.folderCollapsed.addListener(treeStore.onFolderCollapsed);
        this._actionsHub.filtersInvoked.addListener(treeStore.onFilterTree);
        this._actionsHub.collapseAll.addListener(treeStore.collapseAll);
        this._actionsHub.tagsDemandLoading.addListener(treeStore.ondemandLoading);
        this._actionsHub.tagsHasMore.addListener(treeStore.onTagHasMore);
        this._actionsHub.showAll.addListener(treeStore.showAll);
        this._actionsHub.tagDeletionStatusChanged.addListener(this._onTagDeletionStatusChanged);
        this._actionsHub.filterTextChanged.addListener(treeStore.onSearchStarted);
        this._actionsHub.filterCleared.addListener(treeStore.onSearchStarted);
        this._actionsHub.navigateToUrl.addListener(treeStore.navigateToUrl);
        this._actionsHub.fetchTagsFailed.addListener(treeStore.onTagFetchFailed);
        this._actionsHub.compareTagSet.addListener(treeStore.onCompareTagSet);

        return treeStore;
    }

    private _createContextStore = (): ContextStore => {
        const store = new ContextStore();
        this._actionsHub.contextUpdated.addListener(this._onContextUpdated);
        return store;
    }

    private _createFilterStore = (): FilterStore => {
        const store = new FilterStore();
        this._actionsHub.filterTextChanged.addListener(store.updateFilter);
        this._actionsHub.filterCleared.addListener(store.clearFilters);
        return store;
    }

    private _createDeletionStore = (): DeletionStore => {
        const store = new DeletionStore();
        this._actionsHub.tagDeletionInitiated.addListener(store.deleteTag);
        this._actionsHub.tagDeletionStatusChanged.addListener(store.deleteTagCompleted);
        return store;
    }

    private _createNotificationStore = (): NotificationStore => {
        const store = new NotificationStore();
        this._actionsHub.tagDeletionStatusChanged.addListener(this._onTagDeletionStatusChanged);
        this._actionsHub.fetchTagsFailed.addListener(store.setErrorNotification);
        this._actionsHub.filtersInvoked.addListener(this._onTextFiltered);
        this._actionsHub.notificationCleared.addListener(store.clearNotifications);
        this._actionsHub.tagsAdded.addListener(store.clearNotifications);
        return store;
    }

    private _createPremissionStore = (): PermissionStore => {
        const store = new PermissionStore();
        this._actionsHub.gitPermissionUpdate.addListener(store.gitPermissionUpdate);
        this._actionsHub.settingPermissionUpdate.addListener(store.settingPermissionUpdate);
        return store;
    }

    private _onTagDeletionStatusChanged = (status: TagDeletionStatus): void => {
        if (status.reason === TagDeletionStatusChangeReason.Failed) {
            this.stores.notificationStore.setErrorNotification(status.error);
        }
        else {
            this.stores.notificationStore.clearNotifications();
            if (status.reason === TagDeletionStatusChangeReason.Succeeded) {
                this.stores.treeStore.onSuccessfulTagDeletion(status.name);
            }
        }
    }

    private _onTextFiltered = (payload: TagsPageResults): void => {
        const notificationMessage = payload.hasMoreRecords
            ? formatString(VCResources.TagsPage_PartialSearchResultsShown, payload.tags.length)
            : payload.tags.length === 1
                ? VCResources.TagsPage_OneSearchResultShown
                : formatString(VCResources.TagsPage_CompleteSearchResultsShown, payload.tags.length);

        this.stores.notificationStore.setInfoNotification(notificationMessage);
    }

    private _disposeStore = (): void => {
        if (this.stores) {
            if (this.stores.treeStore) {
                if (this._actionsHub) {
                    this._actionsHub.tagsAdded.removeListener(this.stores.treeStore.addTags);
                    this._actionsHub.folderExpanded.removeListener(this.stores.treeStore.onFolderExpanded);
                    this._actionsHub.folderCollapsed.removeListener(this.stores.treeStore.onFolderCollapsed);
                    this._actionsHub.filtersInvoked.removeListener(this.stores.treeStore.onFilterTree);
                    this._actionsHub.collapseAll.removeListener(this.stores.treeStore.collapseAll);
                    this._actionsHub.tagsDemandLoading.removeListener(this.stores.treeStore.ondemandLoading);
                    this._actionsHub.tagsHasMore.removeListener(this.stores.treeStore.onTagHasMore);
                    this._actionsHub.showAll.removeListener(this.stores.treeStore.showAll);
                    this._actionsHub.filterTextChanged.removeListener(this.stores.treeStore.onSearchStarted);
                    this._actionsHub.filterCleared.removeListener(this.stores.treeStore.onSearchStarted);
                    this._actionsHub.tagDeletionStatusChanged.removeListener(this._onTagDeletionStatusChanged);
                    this._actionsHub.navigateToUrl.removeListener(this.stores.treeStore.navigateToUrl);
                    this._actionsHub.fetchTagsFailed.removeListener(this.stores.treeStore.onTagFetchFailed);
                    this._actionsHub.compareTagSet.removeListener(this.stores.treeStore.onCompareTagSet);
                }

                this.stores.treeStore.dispose();
                this.stores.treeStore = null;
            }

            if (this.stores.contextStore) {
                if (this._actionsHub) {
                    this._actionsHub.contextUpdated.removeListener(this._onContextUpdated);
                }

                this.stores.contextStore = null;
            }

            if (this.stores.filterStore) {
                if (this._actionsHub) {
                    this._actionsHub.filterTextChanged.removeListener(this.stores.filterStore.updateFilter);
                    this._actionsHub.filterCleared.removeListener(this.stores.filterStore.clearFilters);
                }

                this.stores.filterStore.dispose();
                this.stores.filterStore = null;
            }

            if (this.stores.tagDeletionStore) {
                if (this._actionsHub) {
                    this._actionsHub.tagDeletionInitiated.removeListener(this.stores.tagDeletionStore.deleteTag);
                    this._actionsHub.tagDeletionStatusChanged.removeListener(this.stores.tagDeletionStore.deleteTagCompleted);
                }
                this.stores.tagDeletionStore.dispose();
                this.stores.tagDeletionStore = null;
            }

            if (this.stores.notificationStore) {
                if (this._actionsHub) {
                    this._actionsHub.tagDeletionStatusChanged.removeListener(this._onTagDeletionStatusChanged);
                    this._actionsHub.fetchTagsFailed.removeListener(this.stores.notificationStore.setErrorNotification);
                    this._actionsHub.filtersInvoked.removeListener(this._onTextFiltered);
                    this._actionsHub.notificationCleared.removeListener(this.stores.notificationStore.clearNotifications);
                    this._actionsHub.tagsAdded.removeListener(this.stores.notificationStore.clearNotifications);
                }
                this.stores.notificationStore.dispose();
                this.stores.notificationStore = null;
            }

            if (this.stores.permissionStore) {
                if (this._actionsHub) {
                    this._actionsHub.gitPermissionUpdate.removeListener(this.stores.permissionStore.gitPermissionUpdate);
                    this._actionsHub.settingPermissionUpdate.removeListener(this.stores.permissionStore.settingPermissionUpdate);
                }
                this.stores.permissionStore = null;
            }

            this.stores = null;
        }
    }

    public getAggregatedState = (): AggregatedState => {
        return {
            contextStoreState: this.stores.contextStore,
            treeState: this.stores.treeStore.state,
            filterState: this.stores.filterStore.state,
            tagDeletionState: this.stores.tagDeletionStore.state,
            notificationState: this.stores.notificationStore.state,
            permissionState: this.stores.permissionStore.state
        }
    }

    private _onContextUpdated = (repositoryContext: RepositoryContext): void => {
        this.stores.contextStore.onContextUpdated({ repositoryContext: repositoryContext } as IContextUpdatedPayload)
    }
}