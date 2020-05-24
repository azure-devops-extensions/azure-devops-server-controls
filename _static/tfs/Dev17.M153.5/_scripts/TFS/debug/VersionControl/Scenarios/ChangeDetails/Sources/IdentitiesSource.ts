import * as Q from "q";
import { Identity } from "VSS/Identities/Contracts";
import { IdentitiesHttpClient } from "VSS/Identities/RestClient";
import { VssConnection } from "VSS/Service";
import * as Utils_String from "VSS/Utils/String";
import * as WebApiConstants from "VSS/WebApi/Constants";
import { RepositoryContext } from "VersionControl/Scripts/RepositoryContext";

/**
 * A source of data for identities information from guid.
 */
export class IdentitiesSource {
    constructor(
        private _repositoryContext: RepositoryContext,
        private _httpClient?: IdentitiesHttpClient) {
    }

    /**
     * Fetches identities data with respect to guid and returns them.
     */
    public getIdentities(identityIds: string[]): IPromise<Identity[]> {
        return this.httpClient.readIdentities(null, identityIds.join());
    }

    private get httpClient(): IdentitiesHttpClient {
        if (!this._httpClient) {
            const connection = new VssConnection(this._repositoryContext.getTfsContext().contextData);
            this._httpClient = connection.getHttpClient(IdentitiesHttpClient, WebApiConstants.ServiceInstanceTypes.SPS);
        }
        return this._httpClient;

    }
}
