import * as VSSStore from "VSS/Flux/Store";
import * as _SearchSharedContracts from "Search/Scripts/Generated/Search.SharedLegacy.Contracts";
import {
    SearchStartedPayload,
    ResultsLoadedPayload,
    SearchFailedPayload,
    PageInitializationStartedPayload,
    SearchSourceType
} from "Search/Scenarios/Shared/Base/ActionsHub";

export enum SearchStatus {
    Loading,

    Success,

    Failed
}

export interface SearchStoreState<TQuery extends _SearchSharedContracts.EntitySearchQuery, TResponse extends _SearchSharedContracts.EntitySearchResponse> {
    query: TQuery;

    response: TResponse;

    searchStatus: SearchStatus;

    activityId: string;

    source: SearchSourceType;

    fetchMoreScenario?: boolean;

    error?: any;
}

export class SearchStore<TQuery extends _SearchSharedContracts.EntitySearchQuery, TResponse extends _SearchSharedContracts.EntitySearchResponse, TItem> extends VSSStore.Store {
    protected _state = {} as SearchStoreState<TQuery, TResponse>;

    public get state(): SearchStoreState<TQuery, TResponse> {
        return this._state;
    }

    public startSearch = (payload: SearchStartedPayload<TQuery>): void => {
        this._state.query = payload.query;
        this._state.searchStatus = SearchStatus.Loading;
        this._state.error = undefined;
        this._state.fetchMoreScenario = payload.fetchMoreScenario;
        this.emitChanged();
    }

    public loadSearchResults = (payload: ResultsLoadedPayload<TResponse, TItem>): void => {
        const { response, activityId, source } = payload;
        if (this.areCorrectResultsLoaded(this._state.query, response)) {
            this._state.response = response;
            this._state.searchStatus = SearchStatus.Success;            
            this._state.activityId = activityId;
            this._state.source = source;
            this.emitChanged();
        }
    }

    public failSearch = (payload: SearchFailedPayload<TQuery>): void => {
        const { query, activityId, error } = payload;
        if (this.areQueriesSame(this._state.query, query)) {
            this._state.searchStatus = SearchStatus.Failed;
            this._state.error = error;
            this._state.response = undefined;
            this._state.fetchMoreScenario = undefined;
            this._state.activityId = activityId;
            this.emitChanged();
        }
    }

    /**
    *   Update only query state as we need adequate searchstorestate on search landing page
    */
    public updateQuery = (payload: PageInitializationStartedPayload<TQuery>): void => {
        this._state.query = payload.query;
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
    protected areCorrectResultsLoaded(query: TQuery, response: TResponse): boolean {
        return true;
    }

    /**
     * Return the results after comparing the queries.
     * @param queryInState
     * @param queryInPayload
     */
    protected areQueriesSame(queryInState: TQuery, queryInPayload: TQuery): boolean {
        return true;
    }
}
