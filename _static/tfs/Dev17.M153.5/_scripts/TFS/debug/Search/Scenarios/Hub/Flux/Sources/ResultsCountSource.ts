import * as Rest_Client from "Search/Scenarios/WebApi/RestClient";
import * as _SearchSharedLegacy from "Search/Scripts/Generated/Search.SharedLegacy.Contracts";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";

export class ResultsCountSource {
    private _resultsCountRestClient: Rest_Client.SearchHttpClient;

    constructor() {
        this._resultsCountRestClient = Rest_Client.getClient();
    }

    public getResultsCount = (countRequest: _SearchSharedLegacy.CountRequest, entityType: string):
        IPromise<_SearchSharedLegacy.CountResponse> => {
        const currentPageContext = TfsContext.getDefault();
        return this._resultsCountRestClient.resultsCount(countRequest, entityType, currentPageContext.navigation.projectId);
    }
}