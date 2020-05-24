
"use strict";

import * as VSS_Service from "VSS/Service";
import { VssHttpClient, IVssHttpClientOptions } from "VSS/WebApi/RestClient";

export interface IAuthRequest {
    errorMessage: string;
    url: string;
}

export class ConnectedServiceClient extends VssHttpClient {
    protected authRequestsApiVersion: string;

    constructor(rootRequestPath: string, options?: IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.authRequestsApiVersion = "3.0-preview.1";
    }

    /**
     * @param {ConnectedService.AuthRequest} authRequest
     * @param {string} project - Project ID or project name
     * @param {string} providerId
     * @return IPromise<ConnectedService.AuthRequest>
     */
    public createAuthRequest(
        authRequest: IAuthRequest,
        project: string,
        providerId: string
    ): IPromise<IAuthRequest> {

        return this._beginRequest<IAuthRequest>({
            httpMethod: "POST",
            area: "connectedService",
            locationId: "e921b68f-92d6-44d4-aa88-19c84be1c4c7",
            resource: "authRequests",
            routeTemplate: "{project}/_apis/{area}/providers/{providerId}/{resource}",
            routeValues: {
                project: project,
                providerId: providerId,
            },
            apiVersion: this.authRequestsApiVersion,
            data: authRequest
        });
    }
}

/**
 * Gets an http client targeting the latest released version of the APIs.
 *
 * @return ConnectedServiceHttpClient2_3
 */
export function getClient(options?: IVssHttpClientOptions): ConnectedServiceClient {
    return VSS_Service.getClient<ConnectedServiceClient>(ConnectedServiceClient, undefined, undefined, undefined, options);
}
