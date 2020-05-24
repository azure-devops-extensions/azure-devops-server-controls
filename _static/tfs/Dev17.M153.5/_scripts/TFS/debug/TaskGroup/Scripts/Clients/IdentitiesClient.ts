import { VssConnection, getCollectionService } from "VSS/Service";
import { getDefaultWebContext } from "VSS/Context";
import { ContextHostType, } from "VSS/Common/Contracts/Platform";
import { ServiceInstanceTypes } from "VSS/WebApi/Constants";
import { Identity } from "VSS/Identities/Contracts";
import { IdentitiesHttpClient } from "VSS/Identities/RestClient";

import { Initializable as IInitializable } from "DistributedTaskControls/Common/Factory";

import { ServiceClientKeys } from "TaskGroup/Scripts/Clients/Constants";

export class IdentitiesClient implements IInitializable {

    public static getKey(): string {
        return ServiceClientKeys.IdentitiesClient;
    }

    public initialize(instanceId?: string): void {
        const webContext = getDefaultWebContext();
        const connection = new VssConnection(webContext, ContextHostType.ProjectCollection);
        this._client = connection.getHttpClient<IdentitiesHttpClient>(IdentitiesHttpClient, ServiceInstanceTypes.SPS);
    }

    public getIdentities(identityIds: string): IPromise<Identity[]> {
        return this._client.readIdentities(null, identityIds);
    }

    private get projectId(): string {
        return getDefaultWebContext().project.id;
    }

    private _client: IdentitiesHttpClient;
}
