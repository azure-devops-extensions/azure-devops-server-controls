import * as VSSStore from "VSS/Flux/Store";

import { SearchStartedPayload, SearchResultsLoadedPayload, TabChangedPayload, TabsLoadedPayload } from "Search/Scenarios/Wiki/ActionsHub";
import { areFiltersEqual } from "Search/Scenarios/Wiki/WikiUtils";
import { Filter, WikiSearchResponse } from "Search/Scripts/Generated/Search.Shared.Contracts";
import { PivotTabItem, getSearchEntities, SearchEntity, SearchEntitiesIds, getSearchEntitiesMap } from "Search/Scripts/React/Models";

export interface SearchState {
    searchText: string;
    isLoadingResults: boolean;
    isFetchingMoreResults: boolean;
    searchFilters: { [key: string]: string[]; };
    searchResponse: WikiSearchResponse;
    errorCode: number;
}

export class SearchStore extends VSSStore.Store {
    private _state: SearchState = {
        searchText: "",
        isLoadingResults: false,
        isFetchingMoreResults: false,
    } as SearchState;

    public get state(): SearchState {
        return this._state;
    }

    public startSearch = (payload: SearchStartedPayload): void => {

        if (payload.isLoadMore) {
            this._state = {
                ...this._state,
                isFetchingMoreResults: true
            };
        }
        else {
            this._state = {
                ...this._state,
                isLoadingResults: true,
                searchFilters: payload.searchFilters,
                searchText: payload.searchText,
            };
        }

        this.emitChanged();
    }

    public loadSearchResults = (payload: SearchResultsLoadedPayload): void => {
        if (this._areCorrectResultsLoaded(payload)) {
            const errorCode = payload.response.infoCode;
            if (errorCode !== 0) {
                this.failLoad(errorCode);
            }
            else {
                if (payload.isLoadMore) {
                    this.state.isFetchingMoreResults = false;
                    this.state.errorCode = 0;
                    this.appendMoreSearchResults(payload);
                }
                else {
                    this._state = {
                        ...this._state,
                        searchResponse: payload.response,
                        isLoadingResults: false,
                        isFetchingMoreResults: false,
                        errorCode: 0
                    };
                }

                this.emitChanged();
            }
        }
    }

    private appendMoreSearchResults = (payload: SearchResultsLoadedPayload): void => {
        if (payload.response.results &&
            payload.response.results.length > 0) {

            const { searchResponse } = this._state;
            this._state = {
                ...this._state,
                searchResponse: {
                    ...searchResponse,
                    results: searchResponse.results.concat(payload.response.results)
                }
            };
        }

        this.emitChanged();
    }

    public failLoad = (errorCode: number): void => {
        this._state.errorCode = errorCode;
        this._state.isFetchingMoreResults = false;
        this._state.searchResponse = null;
        this._state.isLoadingResults = false;

        this.emitChanged();
    }

    private _areCorrectResultsLoaded = (payload: SearchResultsLoadedPayload): boolean => {
        return payload.query.searchText === this._state.searchText
            && areFiltersEqual(this._state.searchFilters || {}, payload.query.filters);
    }
}

function getAvailableTabs(tabIds: string[]): PivotTabItem[] {
    const searchEntities = getSearchEntitiesMap();
    return (tabIds || [])
        .map(tabId => tabId.toLowerCase())
        .map(tabId => searchEntities[tabId] && createTabItems(searchEntities[tabId]));
}

function createTabItems(entity: SearchEntity): PivotTabItem {
    return { tabKey: entity.entity, title: entity.displayName };
}
