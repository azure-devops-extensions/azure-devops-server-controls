import { ActionListener } from "MyExperiences/Scenarios/Shared/ActionListener";
import { OrgInfoAndCollectionsPickerActionsHub } from "MyExperiences/Scenarios/Shared/OrgInfoAndCollectionsPickerActionsHub";
import { IOrganizationInfoState, OrganizationInfoStore } from "MyExperiences/Scenarios/Shared/Stores/OrganizationInfoStore";
import { IUserAccessedCollectionsState, UserAccessedCollectionsStore } from "MyExperiences/Scenarios/Shared/Stores/UserAccessedCollectionsStore";

export interface AggregateStore {
    organizationInfoStore: OrganizationInfoStore;
    userAccessedCollectionsStore: UserAccessedCollectionsStore;
}

export interface AggregateState {
    organizationInfoState: IOrganizationInfoState;
    userAccessedCollectionsState: IUserAccessedCollectionsState;
}

export class OrgInfoAndCollectionsPickerStoresHub {
    private _actionListener: ActionListener;
    private _stores: AggregateStore;

    constructor(actionsHub: OrgInfoAndCollectionsPickerActionsHub) {
        this._actionListener = new ActionListener();

        this._stores = {
            organizationInfoStore: this._createOrganizationInfoStore(actionsHub),
            userAccessedCollectionsStore: this._createUserAccessedCollectionsStore(actionsHub),
        };
    }

    public dispose(): void {
        if (this._actionListener) {
            this._actionListener.disposeActions();
            this._actionListener = undefined;
        }
    }

    public getAggregateState(): AggregateState {
        return {
            organizationInfoState: this.stores.organizationInfoStore.state,
            userAccessedCollectionsState: this.stores.userAccessedCollectionsStore.state,
        };
    }

    public get stores(): AggregateStore {
        return this._stores;
    }

    private _createOrganizationInfoStore(actionsHub: OrgInfoAndCollectionsPickerActionsHub): OrganizationInfoStore {
        const store = new OrganizationInfoStore();
        this._actionListener.addListener(actionsHub.organizationInfoLoaded, store.onOrganizationInfoLoaded);
        this._actionListener.addListener(actionsHub.organizationInfoLoadFailed, store.onOrganizationInfoLoaded);

        return store;
    }

    private _createUserAccessedCollectionsStore(actionsHub: OrgInfoAndCollectionsPickerActionsHub): UserAccessedCollectionsStore {
        const store = new UserAccessedCollectionsStore();
        this._actionListener.addListener(actionsHub.userAccessedCollectionsLoaded, store.onUserAccessedCollectionsLoaded);
        this._actionListener.addListener(actionsHub.moreUserAccessedCollectionsLoaded, store.onMoreUserAccessedCollectionsLoaded);
        this._actionListener.addListener(actionsHub.moreUserAccessedCollectionsLoadFailed, () => store.onUserAccessedCollectionsLoaded([]));

        return store;
    }
}
