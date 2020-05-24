import * as BaseSearchStore from "Search/Scenarios/Shared/Base/Stores/SearchStore";
import { SortOptionChangedPayload } from "Search/Scenarios/Shared/Base/ActionsHub";
import { WorkItemSearchRequest, WorkItemSearchResponse, WorkItemResult } from "Search/Scenarios/WebApi/Workitem.Contracts";
import { areQueriesEqual } from "Search/Scenarios/WorkItem/Utils";

export class SearchStore extends BaseSearchStore.SearchStore<WorkItemSearchRequest, WorkItemSearchResponse, WorkItemResult> {
    protected areCorrectResultsLoaded(query: WorkItemSearchRequest, response: WorkItemSearchResponse): boolean {
        return areQueriesEqual(query, response.query);
    }
    
    protected areQueriesSame(queryInState: WorkItemSearchRequest, queryInPayload: WorkItemSearchRequest): boolean {
        return areQueriesEqual(queryInState, queryInPayload);
    }

    public updateItemsOnSort = (payload: SortOptionChangedPayload<WorkItemResult>): void => {
        if (this._state.response) {
            this._state.response.results.values = payload.sortedItems;
            this.emitChanged();
        }
    }
}
