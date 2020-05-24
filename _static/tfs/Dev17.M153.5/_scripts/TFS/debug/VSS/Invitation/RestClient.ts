/**
 * ---------------------------------------------------------
 * Generated file, DO NOT EDIT
 * ---------------------------------------------------------
 *
 * See following wiki page for instructions on how to regenerate:
 *   https://aka.ms/azure-devops-client-generation
 *
 * Configuration file:
 *   vssf\client\webapi\httpclients\clientgeneratorconfigs\invitation.genclient.json
 */

"use strict";

import Contracts = require("VSS/Invitation/Contracts");
import VSS_Service = require("VSS/Service");
import VSS_WebApi = require("VSS/WebApi/RestClient");
import VSS_WebApi_Constants = require("VSS/WebApi/Constants");

export class CommonMethods4_1To5 extends VSS_WebApi.VssHttpClient {

    public static serviceInstanceId = VSS_WebApi_Constants.ServiceInstanceTypes.SPS;
    protected invitationsApiVersion: string;

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
    }

    /**
     * [Preview API] Send Account Invitation to a user
     *
     * @param {Contracts.InvitationData} invitationData - optional Invitation Data
     * @param {string} userId - IdentityId of the user
     * @return IPromise<void>
     */
    public sendAccountInvitation(
        invitationData: Contracts.InvitationData,
        userId: string
        ): IPromise<void> {

        return this._beginRequest<void>({
            httpMethod: "PUT",
            httpResponseType: "html",
            area: "Invitation",
            locationId: "bc7ca053-e204-435b-a143-6240ba8a93bf",
            resource: "Invitations",
            routeTemplate: "_apis/{resource}/{userId}",
            requestType: Contracts.TypeInfo.InvitationData,
            routeValues: {
                userId: userId
            },
            apiVersion: this.invitationsApiVersion,
            data: invitationData
        });
    }
}

/**
 * @exemptedapi
 */
export class InvitationHttpClient5 extends CommonMethods4_1To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.invitationsApiVersion = "5.0-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class InvitationHttpClient4_1 extends CommonMethods4_1To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.invitationsApiVersion = "4.1-preview.1";
    }
}

export class InvitationHttpClient extends InvitationHttpClient5 {
    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
    }
}

const clientMapping: { [id: string]: new (routeRequestPath: string) => VSS_WebApi.VssHttpClient; } = {
    "5.0": InvitationHttpClient5,
    "4.1": InvitationHttpClient4_1
}

/**
 * Gets an http client targeting the latest released version of the APIs.
 *
 * @return InvitationHttpClient5
 */
export function getClient(options?: VSS_WebApi.IVssHttpClientOptions): InvitationHttpClient5 {
    if ((<any>window).VSS && (<any>window).VSS.VssSDKRestVersion && clientMapping[(<any>window).VSS.VssSDKRestVersion]) {
        return VSS_Service.getClient<InvitationHttpClient5>(<any>(clientMapping[(<any>window).VSS.VssSDKRestVersion]), undefined, undefined, undefined, options);
    }
    else {
        return VSS_Service.getClient<InvitationHttpClient5>(InvitationHttpClient5, undefined, undefined, undefined, options);
    }
}
