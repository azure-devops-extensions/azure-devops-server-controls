import * as Rest_Client from "Search/Scenarios/WebApi/RestClient";
import * as Code_Contracts from "Search/Scenarios/WebApi/Code.Contracts";

export class TenantSource {
    private _tenantSearchRestClient: Rest_Client.SearchHttpClient;

    constructor() {
        this._tenantSearchRestClient = Rest_Client.getClient();
    }

    public getTenantQueryResults(query: Code_Contracts.SearchQuery): IPromise<Code_Contracts.CodeQueryResponse> {
        return this._tenantSearchRestClient.postTenantCodeQuery(query);
    }
}
