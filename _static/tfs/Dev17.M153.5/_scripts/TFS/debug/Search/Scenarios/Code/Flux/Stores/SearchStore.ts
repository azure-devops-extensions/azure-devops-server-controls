import * as BaseSearchStore from "Search/Scenarios/Shared/Base/Stores/SearchStore";
import { SearchQuery, CodeQueryResponse, CodeResult } from "Search/Scenarios/WebApi/Code.Contracts";
import { SortOptionChangedPayload } from "Search/Scenarios/Shared/Base/ActionsHub";
import { areQueriesEqual } from "Search/Scenarios/Code/Utils";
export class SearchStore extends BaseSearchStore.SearchStore<SearchQuery, CodeQueryResponse, CodeResult> {
    protected areCorrectResultsLoaded(query: SearchQuery, response: CodeQueryResponse): boolean {
        return areQueriesEqual(query, response.query);
    }

    protected areQueriesSame(queryInState: SearchQuery, queryInPayload: SearchQuery): boolean {
        return areQueriesEqual(queryInState, queryInPayload);
    }

    public updateItemsOnSort = (payload: SortOptionChangedPayload<CodeResult>): void => {
        // Response could be null in case sort is performed after an error ocurred.
        if (this._state.response) {
            this._state.response.results.values = payload.sortedItems;
            this.emitChanged();
        }
    }
}
