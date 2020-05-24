import * as _SearchSharedLegacy from "Search/Scripts/Generated/Search.SharedLegacy.Contracts";
import { SearchSourceResponse, SearchFailedPayload } from "Search/Scenarios/Shared/Base/ActionsHub";
import { SearchQueryResultsTelemetryWriter } from "Search/Scenarios/Shared/Base/Telemetry";

/**
 * Extend this class to log telemetry for API calls on search queries.
 */
export class SearchSourceBase<TQuery extends _SearchSharedLegacy.EntitySearchQuery> {
    private telemetryWriter: SearchQueryResultsTelemetryWriter;
    constructor(scenarioName: string, entity: string) {
        this.telemetryWriter = new SearchQueryResultsTelemetryWriter(scenarioName, entity);
    }

    /**
     * Issues calls to fetch results for the given query. Also tracks the requests for the purpose of logging telmetry till completion.
     * @param searchQuery
     */
    public getQueryResults(searchQuery: TQuery): IPromise<SearchSourceResponse> {
        const requestId = this.telemetryWriter.notifyStarted();
        return this.getResults(searchQuery)
            .then(response => {
                // Being defensive here trying to avoid any NPE if response somehow is undefined.
                if (response) {
                    const { responseWithActivityId } = response;
                    this.telemetryWriter.notifySucceeded(
                        requestId,
                        {
                            responseActivityId: responseWithActivityId.activityId[0]
                        });
                }

                return response;
            }, failedPayload => {
                this.telemetryWriter.notifyFailed(requestId);
                throw failedPayload;
            });
    }

    /**
     * Child classes need to provide implementation to fetch results for the given query.
     * @param searchQuery
     */
    protected getResults(searchQuery: TQuery): IPromise<SearchSourceResponse> {
        return Promise.resolve(null);
    }
}
