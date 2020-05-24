import * as BaseZeroDataStore from "Search/Scenarios/Shared/Base/Stores/ZeroDataStore";
import { WorkItemSearchRequest, WorkItemSearchResponse, WorkItemResult } from "Search/Scenarios/WebApi/Workitem.Contracts";
import { ResultsLoadedPayload } from "Search/Scenarios/Shared/Base/ActionsHub";
import { areQueriesEqual } from "Search/Scenarios/WorkItem/Utils";
import * as Constants from "Search/Scenarios/WorkItem/Constants";

export class ZeroDataStore extends BaseZeroDataStore.ZeroDataStore {
    public onResultsLoaded(query: WorkItemSearchRequest, payload: ResultsLoadedPayload<WorkItemSearchResponse, WorkItemResult>): void {
        if (areQueriesEqual(query, payload.response.query)) {
            const response = payload.response;
            if (response && response.results.values.length <= 0) {
                this._state.scenario = BaseZeroDataStore.getScenario(response.errors, response.results.count, Constants.WorkItemSearchTakeResults, false);
            }

            this.emitChanged();
        }
    }

    protected areQueriesSame(queryInState: WorkItemSearchRequest, queryInPayload: WorkItemSearchRequest): boolean {
        return areQueriesEqual(queryInState, queryInPayload)
    }
}