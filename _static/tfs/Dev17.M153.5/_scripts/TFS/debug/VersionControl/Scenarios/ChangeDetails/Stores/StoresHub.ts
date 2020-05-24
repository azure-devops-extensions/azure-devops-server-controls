import { DiscussionsStore } from "VersionControl/Scripts/Stores/PullRequestReview/DiscussionsStore";
import { ActionsHub, IContextUpdatedPayload } from "VersionControl/Scenarios/ChangeDetails/Actions/ActionsHub";
import { ChangeListStore } from "VersionControl/Scenarios/ChangeDetails/Stores/ChangeListStore";
import { ContextStore } from "VersionControl/Scenarios/Shared/Stores/ContextStore";
import { DiscussionManagerStore } from "VersionControl/Scenarios/ChangeDetails/Stores/DiscussionManagerStore";
import { ItemDetailsStore } from "VersionControl/Scenarios/ChangeDetails/Stores/ItemDetailsStore";
import { Notification, NotificationStore } from "VersionControl/Scenarios/Shared/Notifications/NotificationStore";
import { PullRequestStatsStore } from "VersionControl/Scenarios/ChangeDetails/Stores/PullRequestStatsStore";
import { UrlParametersStore } from "VersionControl/Scenarios/ChangeDetails/Stores/UrlParametersStore";
import { UserPreferencesStore } from "VersionControl/Scenarios/ChangeDetails/Stores/UserPreferencesStore";
import { WorkItemsStore } from "VersionControl/Scenarios/ChangeDetails/Stores/WorkItemsStore";
import { AuthorDetailsStore } from "VersionControl/Scenarios/ChangeDetails/Stores/AuthorDetailsStore";
import { ChangeListPermissionsStore } from "VersionControl/Scenarios/ChangeDetails/Stores/ChangeListPermissionsStore";
import { IDiscussionPermissionsStore, DiscussionPermissions } from "VersionControl/Scenarios/Shared/Permissions/DiscussionPermissionsStore";

export interface Stores {
    changeListStore?: ChangeListStore,
    contextStore?: ContextStore,
    discussionManagerStore?: DiscussionManagerStore,
    notificationStore?: NotificationStore,
    urlParametersStore?: UrlParametersStore,
    userPreferencesStore?: UserPreferencesStore,
    workItemsStore?: WorkItemsStore,
    itemDetailsStore?: ItemDetailsStore,
    authorDetailsStore?: AuthorDetailsStore,
    discussionsStore?: DiscussionsStore,
    permissionsStore?: IDiscussionPermissionsStore<DiscussionPermissions, any>,
}

/**
 * A container class to get together the stores of ChangeDetails page, so they can be accessed easily.
 */
export class StoresHub {
    protected stores: Stores;

    constructor(
        protected _actionsHub: ActionsHub,
        stores: Stores = {},
    ) {
        this.stores = {
            changeListStore: stores.changeListStore || new ChangeListStore(this._actionsHub),
            discussionManagerStore: stores.discussionManagerStore || new DiscussionManagerStore(this._actionsHub),
            contextStore: stores.contextStore || new ContextStore(),
            notificationStore: stores.notificationStore || new NotificationStore(),
            itemDetailsStore: stores.itemDetailsStore || new ItemDetailsStore(this._actionsHub),
            urlParametersStore: stores.urlParametersStore || new UrlParametersStore(this._actionsHub),
            userPreferencesStore: stores.userPreferencesStore || new UserPreferencesStore(this._actionsHub),
            workItemsStore: stores.workItemsStore || new WorkItemsStore(this._actionsHub),
            authorDetailsStore: stores.authorDetailsStore || new AuthorDetailsStore(this._actionsHub),
            discussionsStore: stores.discussionsStore || new DiscussionsStore(),
            permissionsStore: stores.permissionsStore || new ChangeListPermissionsStore(),
        }

        this._actionsHub.contextUpdated.addListener(this._onContextUpdated);
        this._actionsHub.errorRaised.addListener(this.stores.notificationStore.addError);
        this._actionsHub.notificationsFlushed.addListener(this._onNotificationFlushed);
    }

    public get changeListStore(): ChangeListStore {
        return this.stores && this.stores.changeListStore;
    }

    public get contextStore(): ContextStore {
        return this.stores && this.stores.contextStore;
    }

    public get discussionManagerStore(): DiscussionManagerStore {
        return this.stores && this.stores.discussionManagerStore;
    }

    public get itemDetailsStore(): ItemDetailsStore {
        return this.stores && this.stores.itemDetailsStore;
    }

    public get notificationStore(): NotificationStore {
        return this.stores && this.stores.notificationStore;
    }

    public get urlParametersStore(): UrlParametersStore {
        return this.stores && this.stores.urlParametersStore;
    }

    public get userPreferencesStore(): UserPreferencesStore {
        return this.stores && this.stores.userPreferencesStore;
    }

    public get workItemsStore(): WorkItemsStore {
        return this.stores && this.stores.workItemsStore;
    }

    public get authorDetailsStore(): AuthorDetailsStore {
        return this.stores && this.stores.authorDetailsStore;
    }

    public get discussionsStore(): DiscussionsStore {
        return this.stores && this.stores.discussionsStore;
    }

    public get permissionsStore(): IDiscussionPermissionsStore<DiscussionPermissions, any> {
        return this.stores && this.stores.permissionsStore;
    }

    public dispose(): void {
        if (this._actionsHub) {

            const {
                changeListStore,
                contextStore,
                discussionManagerStore,
                notificationStore,
                urlParametersStore,
                userPreferencesStore,
                workItemsStore,
                itemDetailsStore,
                authorDetailsStore,
                discussionsStore,
            } = this.stores;

            if (changeListStore) {
                changeListStore.dispose();
            }

            if (contextStore) {
                this._actionsHub.contextUpdated.removeListener(this._onContextUpdated);
            }

            if (discussionManagerStore) {
                discussionManagerStore.dispose();
            }

            if (itemDetailsStore) {
                itemDetailsStore.dispose();
            }

            if (notificationStore) {
                this._actionsHub.errorRaised.removeListener(notificationStore.addError);
                this._actionsHub.notificationsFlushed.removeListener(this._onNotificationFlushed);
            }

            if (urlParametersStore) {
                urlParametersStore.dispose();
            }

            if (userPreferencesStore) {
                userPreferencesStore.dispose();
            }

            if (workItemsStore) {
                workItemsStore.dispose();
            }

            if (authorDetailsStore) {
                authorDetailsStore.dispose();
            }

            this.stores = {};
            this._actionsHub = null;
        }
    }

    private _onContextUpdated = (payload: IContextUpdatedPayload): void  => {
        this.stores.contextStore.onContextUpdated(payload);
    }

    private _onNotificationFlushed = (notification: Notification): void => {
        this.stores.notificationStore.dismiss(notification);
    }
}
