import { Identity } from "VSS/Identities/Contracts";
import { IdentitiesHttpClient } from "VSS/Identities/RestClient";
import * as Service from "VSS/Service";
import { ServiceInstanceTypes } from "VSS/WebApi/Constants";

export class IdentityDataService extends Service.VssService {
    private _httpClient?: IdentitiesHttpClient;

    public async readIdentitiesAsync(identityIds: string[]): Promise<Identity[]> {
        const identities = await this.httpClient.readIdentities(null, identityIds.join());
        return identities;
    }

    public listGroups(projectId: string): IPromise<Identity[]> {
        return this.httpClient.listGroups(projectId);
    }

    private get httpClient(): IdentitiesHttpClient {
        if (!this._httpClient) {
            this._httpClient = Service.VssConnection.getConnection().getHttpClient(
                IdentitiesHttpClient,
                ServiceInstanceTypes.SPS
            );
        }
        return this._httpClient;
    }
}
