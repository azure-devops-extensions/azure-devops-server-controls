import * as BaseZeroDataStore from "Search/Scenarios/Shared/Base/Stores/ZeroDataStoreV2";
import * as Constants from "Search/Scenarios/WikiV2/Constants";

import { ResultsLoadedPayload } from "Search/Scenarios/Shared/Base/ActionsHubV2";
import { areQueriesEqual } from "Search/Scenarios/WikiV2/WikiUtils";
import { WikiSearchRequest, WikiSearchResponse, WikiResult } from "Search/Scripts/Generated/Search.Shared.Contracts";

export class ZeroDataStore extends BaseZeroDataStore.ZeroDataStore {
    public onResultsLoaded(request: WikiSearchRequest, payload: ResultsLoadedPayload<WikiSearchRequest, WikiSearchResponse, WikiResult>): void {

        if (areQueriesEqual(request, payload.request)) {
            const response = payload.response;
            
            if (response && response.count <= 0) {
                this._state.scenario = BaseZeroDataStore.getScenario(response.infoCode, response.count, Constants.WikiSearchTakeResults, false);
            }

            this.emitChanged();
        }
    }
}