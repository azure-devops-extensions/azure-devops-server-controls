import * as VSSStore from "VSS/Flux/Store";
import * as BaseSearchStore from "Search/Scenarios/Shared/Base/Stores/SearchStoreV2";

import { SearchStartedPayload, ResultsLoadedPayload } from "Search/Scenarios/Shared/Base/ActionsHubV2";
import { areQueriesEqual } from "Search/Scenarios/WikiV2/WikiUtils";
import { WikiSearchResponse, WikiSearchRequest, WikiResult } from "Search/Scripts/Generated/Search.Shared.Contracts";

export class SearchStore extends BaseSearchStore.SearchStore<WikiSearchRequest, WikiSearchResponse, WikiResult> {
    
    public isLoading = () => (this._state.searchStatus === BaseSearchStore.SearchStatus.Loading && !this._state.fetchMoreScenario);

    protected areCorrectResultsLoaded(request: WikiSearchRequest, payload: ResultsLoadedPayload<WikiSearchRequest, WikiSearchResponse, WikiResult>): boolean {
        return areQueriesEqual(request, payload.request);
    }

    public startSearch = (payload: SearchStartedPayload<WikiSearchRequest>): void => {
        this._state.request = payload.request;
        if (!payload.fetchMoreScenario) {
            this._state.searchStatus = BaseSearchStore.SearchStatus.Loading;
        }
        
        this._state.fetchMoreScenario = payload.fetchMoreScenario;
        this.emitChanged();
    }

    public loadSearchResults = (payload: ResultsLoadedPayload<WikiSearchRequest, WikiSearchResponse, WikiResult>): void => {
        if (this.areCorrectResultsLoaded(this._state.request, payload)) {
            
            if (payload.fetchMoreScenario) {
                this.appendMoreSearchResults(payload);
            } else {
                this._state.response = payload.response;
            }

            this._state.searchStatus = BaseSearchStore.SearchStatus.Success;
            this._state.fetchMoreScenario = false;
            this.emitChanged();
        }
    }

    private appendMoreSearchResults = (payload: ResultsLoadedPayload<WikiSearchRequest, WikiSearchResponse, WikiResult>): void => {
        if (payload.response.results &&
            payload.response.results.length > 0) {

            const { response } = this._state;
            this._state = {
                ...this._state,
                response: {
                    ...response,
                    results: response.results.concat(payload.response.results)
                }
            };
        }
    }
}
