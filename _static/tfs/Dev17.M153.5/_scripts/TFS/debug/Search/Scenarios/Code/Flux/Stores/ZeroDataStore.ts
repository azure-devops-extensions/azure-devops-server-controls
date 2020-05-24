import * as BaseZeroDataStore from "Search/Scenarios/Shared/Base/Stores/ZeroDataStore";
import { SearchQuery, CodeQueryResponse, CodeResult } from "Search/Scenarios/WebApi/Code.Contracts";
import { ResultsLoadedPayload } from "Search/Scenarios/Shared/Base/ActionsHub";
import { areQueriesEqual } from "Search/Scenarios/Code/Utils";
import * as Constants from "Search/Scenarios/Code/Constants";

export class ZeroDataStore extends BaseZeroDataStore.ZeroDataStore {
    public onResultsLoaded(query: SearchQuery, payload: ResultsLoadedPayload<CodeQueryResponse, CodeResult>, fetchMoreScenario: boolean): void {
        if (areQueriesEqual(query, payload.response.query)) {
            const response = payload.response;
            if (response && response.results.values.length <= 0) {
                this._state.scenario = BaseZeroDataStore.getScenario(response.errors, response.results.count, Constants.CodeSearchTakeResults, fetchMoreScenario);
            }

            this.emitChanged();
        }
    }

    protected areQueriesSame(queryInState: SearchQuery, queryInPayload: SearchQuery): boolean {
        return areQueriesEqual(queryInState, queryInPayload);
    }
}