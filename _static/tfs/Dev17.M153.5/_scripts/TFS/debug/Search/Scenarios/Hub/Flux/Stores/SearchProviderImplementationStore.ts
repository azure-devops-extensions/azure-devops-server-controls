import * as VSSStore from "VSS/Flux/Store";
import * as _ContributedSearchTab from "Search/Scenarios/Shared/Base/ContributedSearchTab";
import { ProviderImplementationChangeStartedPayload, ProviderImplementationLoadedPayload, ProviderImplementationLoadFailedPayload } from "Search/Scenarios/Hub/Flux/ActionsHub";

export enum LoadingState {
    Loading = 1,
    Success = 2,
    Failed = 3
}

export interface SearchProviderImplementationStoreState {
    provider: _ContributedSearchTab.ContributedSearchTab;

    fetchStatus: LoadingState;

    error?: any;
}

export class SearchProviderImplementationStore extends VSSStore.Store {
    private _state = {} as SearchProviderImplementationStoreState;

    public get state(): SearchProviderImplementationStoreState {
        return this._state;
    }

    public startProviderUpdate = (): void => {
        this._state.fetchStatus = LoadingState.Loading;
        this.emitChanged();
    }

    public onProviderLoadFailed = (payload: ProviderImplementationLoadFailedPayload): void => {
        this._state.fetchStatus = LoadingState.Failed;
        this._state.error = payload.error;
        this._state.provider = undefined;
        this.emitChanged();
    }

    public updateProviderImplementation = (payload: ProviderImplementationLoadedPayload): void => {
        this._state.provider = payload.provider;
        this._state.fetchStatus = LoadingState.Success;
        this._state.error = undefined;
        this.emitChanged();
    }
}