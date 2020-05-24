
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { WikiSearchResponse, WikiSearchRequest } from "Search/Scripts/Generated/Search.Shared.Contracts";
import * as SearchClient from "Search/Scripts/Generated/Client/RestClient";

export class WikiSearchSource {
    private readonly httpClient: SearchClient.SearchHttpClient4;

    constructor() {
        this.httpClient = SearchClient.getClient();
    }

    public getWikiSearchResults(query: WikiSearchRequest): IPromise<WikiSearchResponse> {
        const currentPageContext = TfsContext.getDefault();
        return this.httpClient.fetchWikiSearchResults(query, currentPageContext.navigation.projectId);
    }
}
