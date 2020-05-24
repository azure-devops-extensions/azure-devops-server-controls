import * as Q from "q";

import { IdentityRef } from "VSS/WebApi/Contracts";
import { Identity } from "VSS/Identities/Contracts";
import { unique } from "VSS/Utils/Array";

import { Singleton } from "DistributedTaskControls/Common/Factory";
import { ServiceClientManager } from "DistributedTaskControls/Common/Service/ServiceClientManager";
import { TaskDefinitionSource } from "DistributedTaskControls/Sources/TaskDefinitionSource";

import { IdentitiesClient } from "TaskGroup/Scripts/Clients/IdentitiesClient";

export class IdentitiesSource extends Singleton {

    constructor() {
        super();
        this._identitiesClient = ServiceClientManager.GetServiceClient<IdentitiesClient>(IdentitiesClient);
    }

    public static instance(): IdentitiesSource {
        return super.getInstance<IdentitiesSource>(IdentitiesSource);
    }

    public static dispose(): void {
        this.instance()._identitiesClient = null;
        super.dispose();
    }

    public getIdentities(identityIds: string[]): IPromise<IdentityRef[]> {
        identityIds = unique(identityIds);
        return this._identitiesClient.getIdentities(identityIds.join())
            .then((identities: Identity[]) => {
                return identities.map((identity: Identity) => {
                    return {
                        id: identity.id,
                        displayName: identity.customDisplayName || identity.providerDisplayName,
                        isContainer: identity.isContainer,
                        inactive: !identity.isActive
                    } as IdentityRef;
                });
            });
    }

    private _identitiesClient: IdentitiesClient;
}