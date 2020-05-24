// libs
import { VssConnection } from "VSS/Service";

// contracts
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { GraphMember, GraphGroupOriginIdCreationContext, GraphStorageKeyResult } from "VSS/Graph/Contracts";
import { Identity } from "VSS/Identities/Contracts";
import * as Telemetry from "VSS/Telemetry/Services";
import { ServiceInstanceTypes } from "VSS/WebApi/Constants";

// http clients
import { GraphHttpClient } from "VSS/Graph/RestClient";
import { IdentitiesHttpClient } from "VSS/Identities/RestClient";

export interface IPolicyIdentitySource {
    materializeAadGroup(originId: string): IPromise<GraphMember>;
    getGraphMemberStorageKey(member: GraphMember): IPromise<GraphStorageKeyResult>;
    getIdentities(identityIds: string[]): IPromise<Identity[]>;
}

export class PolicyIdentitySource implements IPolicyIdentitySource {
    private readonly _tfsContext: TfsContext;
    private _httpClient: GraphHttpClient;
    private _identitiesClient: IdentitiesHttpClient;

    private static TelemetryArea: string = "BranchPolicies";
    private static TelemtryFeatureAad: string = "MaterializeAAD";

    constructor(tfsContext: TfsContext) {
        this._tfsContext = tfsContext;

        const connection = VssConnection.getConnection(tfsContext.contextData);

        this._httpClient = connection.getHttpClient<GraphHttpClient>(GraphHttpClient, ServiceInstanceTypes.SPS);

        this._identitiesClient = connection.getHttpClient<IdentitiesHttpClient>(IdentitiesHttpClient, ServiceInstanceTypes.SPS);
    }

    public materializeAadGroup(originId: string): IPromise<GraphMember> {
        if (!originId) {
            const telemetryData = new Telemetry.TelemetryEventData(
                PolicyIdentitySource.TelemetryArea,
                PolicyIdentitySource.TelemtryFeatureAad,
                {
                    error: "originId is null"
                });
            Telemetry.publishEvent(telemetryData, true);

            throw new Error("Origin Id cannot be null or empty.");
        }

        return this._httpClient.createGroup(<GraphGroupOriginIdCreationContext>{ originId: originId });
    }

    public getGraphMemberStorageKey(member: GraphMember): IPromise<GraphStorageKeyResult> {
        if (!member) {
            const telemetryData = new Telemetry.TelemetryEventData(
                PolicyIdentitySource.TelemetryArea,
                PolicyIdentitySource.TelemtryFeatureAad,
                {
                    error: "graphMember is null"
                });
            Telemetry.publishEvent(telemetryData, true);

            throw new Error("Graph member cannot be null.");
        }

        return this._httpClient.getStorageKey(member.descriptor);
    }

    /**
     * Fetches identities data with respect to guid and returns them.
     */
    public getIdentities(identityIds: string[]): IPromise<Identity[]> {
        return this._identitiesClient.readIdentities(null, identityIds.join());
    }
}
