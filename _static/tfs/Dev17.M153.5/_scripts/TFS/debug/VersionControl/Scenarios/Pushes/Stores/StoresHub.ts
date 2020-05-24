import { Action } from "VSS/Flux/Action";

import * as Actions from "VersionControl/Scenarios/Pushes/ActionsHub";
import { BranchUpdatesState, BranchUpdatesStore } from "VersionControl/Scenarios/Pushes/Stores/BranchUpdatesStore";
import { PushesPermissions, PushesPermissionStore } from "VersionControl/Scenarios/Pushes/Stores/PushesPermissionStore";
import { SearchCriteriaStore, SearchCriteriaState } from "VersionControl/Scenarios/Pushes/Stores/SearchCriteriaStore";
import { ActionListener } from "VersionControl/Scenarios/Shared/ActionListener";
import { ContextStore } from "VersionControl/Scenarios/Shared/Stores/ContextStore";
import { GitRepositoryContext } from "VersionControl/Scripts/GitRepositoryContext";

export interface AggregateStore {
    contextStore: ContextStore;
    searchCriteriaStore: SearchCriteriaStore;
    branchUpdatesStore: BranchUpdatesStore;
    pushesPermissionStore: PushesPermissionStore;

}

export interface AggregateState {
    repositoryContext: GitRepositoryContext;
    searchCriteriaState: SearchCriteriaState;
    branchUpdatesState: BranchUpdatesState;
    pushesPermissionState: PushesPermissions;
}

/**
 * A class to get together the stores of Pushes page, so they can be accessed easily.
 */
export class StoresHub {
    private _actionListner: ActionListener;
    public stores: AggregateStore;

    constructor(actionsHub: Actions.ActionsHub) {
        this._actionListner = new ActionListener();

        this.stores = {
            contextStore: this._createContextStore(actionsHub),
            searchCriteriaStore: this._createSearchCriteriaStore(actionsHub),
            branchUpdatesStore: this._createBranchUpdateStore(actionsHub),
            pushesPermissionStore: this._createPermissionStore(actionsHub),
        };
    }

    public dispose = (): void => {
        if (this._actionListner) {
            this._actionListner.disposeActions();
            this._actionListner = undefined;
        }
    }

    public getAggregateState = (): AggregateState => {
        return {
            repositoryContext: this.stores.contextStore.getRepositoryContext() as GitRepositoryContext,
            searchCriteriaState: this.stores.searchCriteriaStore.getState(),
            branchUpdatesState: this.stores.branchUpdatesStore.getState(),
            pushesPermissionState: this.stores.pushesPermissionStore.getPermissions(),
        };
    }

    private _createContextStore = (actionsHub: Actions.ActionsHub): ContextStore => {
        const store = new ContextStore();
        this._actionListner.addListener(actionsHub.currentRepositoryChanged, this._onCurrentRepositorychanged);
        return store;
    }

    private _createSearchCriteriaStore = (actionsHub: Actions.ActionsHub): SearchCriteriaStore => {
        const store = new SearchCriteriaStore();
        this._actionListner.addListener(actionsHub.pushesSearchCriteriaChanged, store.changeSearchCriteria);
        this._actionListner.addListener(actionsHub.filterPanelVisibilityToggled, store.toggleFilterPanelVisibility);
        return store;
    }

    private _createBranchUpdateStore = (actionsHub: Actions.ActionsHub): BranchUpdatesStore => {
        const store = new BranchUpdatesStore();
        this._actionListner.addListener(actionsHub.branchUpdatesCleared, store.clear);
        this._actionListner.addListener(actionsHub.branchUpdatesLoadErrorRaised, store.failLoad);
        this._actionListner.addListener(actionsHub.branchUpdatesClearAllErrorsRaised, store.clearAllErrors);
        this._actionListner.addListener(actionsHub.branchUpdatesLoaded, store.populateUpdatesList);
        this._actionListner.addListener(actionsHub.moreBranchUpdatesLoaded, store.appendUpdatesList);
        this._actionListner.addListener(actionsHub.branchUpdatesLoadStarted, store.clearAndStartLoading);
        this._actionListner.addListener(actionsHub.moreBranchUpdatesLoadStarted, store.onMoreBranchLoadStarted);
        return store;
    }

    private _createPermissionStore = (actionsHub: Actions.ActionsHub): PushesPermissionStore => {
        const store = new PushesPermissionStore();
        this._actionListner.addListener(actionsHub.permissionUpdate, store.onPermissionsUpdated);
        return store;
    }

    private _onCurrentRepositorychanged = (payload: Actions.RepositoryChangedPayload): void => {
        this.stores.contextStore.onContextUpdated({
            tfsContext: null, // not needed in pushes page
            repositoryContext: payload.repositoryContext,
        });
    }
}