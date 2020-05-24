import * as VSSStore from "VSS/Flux/Store";
import * as _SearchSharedContracts from "Search/Scripts/Generated/Search.Shared.Contracts";
import { SearchStartedPayload, SearchFailedPayload, ResultsLoadedPayload, PageInitializationStartedPayload } from "Search/Scenarios/Shared/Base/ActionsHubV2";

export enum SearchStatus {
    Loading,

    Success,

    Failed
}

export interface SearchStoreState<TRequest extends _SearchSharedContracts.EntitySearchRequest, TResponse extends _SearchSharedContracts.EntitySearchResponse> {
    request: TRequest;

    response: TResponse;

    searchStatus: SearchStatus;

    fetchMoreScenario?: boolean;
}

export class SearchStore<TRequest extends _SearchSharedContracts.EntitySearchRequest, TResponse extends _SearchSharedContracts.EntitySearchResponse, TItem> extends VSSStore.Store {
    protected _state = {} as SearchStoreState<TRequest, TResponse>;

    public get state(): SearchStoreState<TRequest, TResponse> {
        return this._state;
    }

    public startSearch = (payload: SearchStartedPayload<TRequest>): void => {
        this._state.request = payload.request;
        this._state.searchStatus = SearchStatus.Loading;
        this._state.fetchMoreScenario = payload.fetchMoreScenario;
        this.emitChanged();
    }

    public loadSearchResults = (payload: ResultsLoadedPayload<TRequest, TResponse, TItem>): void => {
        if (this.areCorrectResultsLoaded(this._state.request, payload)) {
            this._state.response = payload.response;
            this._state.searchStatus = SearchStatus.Success;
            this._state.fetchMoreScenario = false;
            this.emitChanged();
        }
    }

    public failSearch = (payload: SearchFailedPayload): void => {
        this._state.searchStatus = SearchStatus.Failed;
        this._state.response = undefined;
        this._state.fetchMoreScenario = undefined;
        this.emitChanged();
    }

    /**
    *   Update only query state as we need adequate searchstorestate on search landing page
    */
    public updateQuery = (payload: PageInitializationStartedPayload<TRequest>): void => {
        this._state.request = payload.request;
        this.emitChanged();
    }

    public isLoading = () => this._state.searchStatus === SearchStatus.Loading;

    /**
     * For now going with a simple approach of compare the query in response and state.
     * Once the query in the response is remove, owing to new contracts, we'll use queryId(guid) to determine
     * the freshness of the results.
     * @param query
     * @param response
     */
    protected areCorrectResultsLoaded(query: TRequest, payload: ResultsLoadedPayload<TRequest, TResponse, TItem>): boolean {
        return true;
    }
}