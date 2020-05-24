/**
 * ---------------------------------------------------------
 * Generated file, DO NOT EDIT
 * ---------------------------------------------------------
 *
 * See following wiki page for instructions on how to regenerate:
 *   https://aka.ms/azure-devops-client-generation
 *
 * Configuration file:
 *   aex\client\memberentitlementmanagement\webapi\internal\clientgeneratorconfigs\genclient.json
 */

"use strict";

import VSS_Common_Contracts = require("VSS/WebApi/Contracts");
import VSS_LicensingRule_Contracts = require("VSS/LicensingRule/Contracts");
import VSS_Service = require("VSS/Service");
import VSS_WebApi = require("VSS/WebApi/RestClient");
import WebApi = require("Aex/MemberEntitlementManagement/Contracts");

export class CommonMethods3_1To5 extends VSS_WebApi.VssHttpClient {

    public static serviceInstanceId = "00000041-0000-8888-8000-000000000000";
    protected exportApiVersion: string;
    protected getMemberEntitlementsBatchApiVersion: string;
    protected groupEntitlementUserApplicationApiVersion: string;
    protected memberEntitlementsBatchApiVersion: string;
    protected removeExplicitAssignmentApiVersion: string;
    protected userManagementSummaryApiVersion: string;

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
    }

    /**
     * [Preview API]
     *
     * @param {string} select
     * @return IPromise<WebApi.UsersSummary>
     */
    public getUsersSummary(
        select?: string
        ): IPromise<WebApi.UsersSummary> {

        const queryValues: any = {
            select: select
        };

        return this._beginRequest<WebApi.UsersSummary>({
            httpMethod: "GET",
            area: "MEMInternal",
            locationId: "f6a501d2-d3ca-4410-b876-5814c2688a04",
            resource: "UserManagementSummary",
            routeTemplate: "_apis/{area}/{resource}",
            responseType: WebApi.TypeInfo.UsersSummary,
            queryParams: queryValues,
            apiVersion: this.userManagementSummaryApiVersion
        });
    }

    /**
     * [Preview API] Remove Explicit Assignments from given users with given list of userIds
     *
     * @param {string[]} userIds
     * @param {string} select
     * @param {VSS_LicensingRule_Contracts.RuleOption} ruleOption
     * @return IPromise<WebApi.UserEntitlement[]>
     */
    public removeExplicitAssignments(
        userIds: string[],
        select?: string,
        ruleOption?: VSS_LicensingRule_Contracts.RuleOption
        ): IPromise<WebApi.UserEntitlement[]> {

        const queryValues: any = {
            select: select,
            ruleOption: ruleOption
        };

        return this._beginRequest<WebApi.UserEntitlement[]>({
            httpMethod: "POST",
            area: "MEMInternal",
            locationId: "aa26fb5a-205c-429e-b110-e7b9152d2037",
            resource: "RemoveExplicitAssignment",
            routeTemplate: "_apis/{area}/{resource}",
            responseType: WebApi.TypeInfo.UserEntitlement,
            responseIsCollection: true,
            queryParams: queryValues,
            apiVersion: this.removeExplicitAssignmentApiVersion,
            data: userIds
        });
    }

    /**
     * [Preview API] Used to edit multiple members in an account. Edits groups, licenses, and extensions.
     *
     * @param {VSS_Common_Contracts.JsonPatchDocument} document - JsonPatch document
     * @return IPromise<WebApi.MemberEntitlementsPatchResponse>
     */
    public bulkUpdateMemberEntitlements(
        document: VSS_Common_Contracts.JsonPatchDocument
        ): IPromise<WebApi.MemberEntitlementsPatchResponse> {

        return this._beginRequest<WebApi.MemberEntitlementsPatchResponse>({
            httpMethod: "PATCH",
            area: "MEMInternal",
            locationId: "3f6319be-d55a-47ef-bcdd-cf1c98fc6434",
            resource: "MemberEntitlementsBatch",
            routeTemplate: "_apis/{resource}",
            responseType: WebApi.TypeInfo.MemberEntitlementsPatchResponse,
            customHeaders: {
                "Content-Type": "application/json-patch+json",
            },
            apiVersion: this.memberEntitlementsBatchApiVersion,
            data: document
        });
    }

    /**
     * [Preview API] Used to add members to a project in an account. It adds them to groups, assigns licenses, and assigns extensions.
     *
     * @param {VSS_LicensingRule_Contracts.RuleOption} ruleOption
     * @return IPromise<WebApi.GroupEntitlementOperationReference>
     */
    public reApplyAllGroupEntitlementsToUsers(
        ruleOption?: VSS_LicensingRule_Contracts.RuleOption
        ): IPromise<WebApi.GroupEntitlementOperationReference> {

        const queryValues: any = {
            ruleOption: ruleOption
        };

        return this._beginRequest<WebApi.GroupEntitlementOperationReference>({
            httpMethod: "POST",
            area: "MEMInternal",
            locationId: "dd1e0955-72a8-4d73-abb4-30a8110411e0",
            resource: "GroupEntitlementUserApplication",
            routeTemplate: "_apis/{area}/{resource}",
            responseType: WebApi.TypeInfo.GroupEntitlementOperationReference,
            queryParams: queryValues,
            apiVersion: this.groupEntitlementUserApplicationApiVersion
        });
    }

    /**
     * [Preview API] Used to get member entitlement information in an account
     *
     * @param {string[]} memberIds
     * @param {string} select
     * @return IPromise<WebApi.UserEntitlement[]>
     */
    public getUserEntitlements(
        memberIds: string[],
        select?: string
        ): IPromise<WebApi.UserEntitlement[]> {

        const queryValues: any = {
            select: select
        };

        return this._beginRequest<WebApi.UserEntitlement[]>({
            httpMethod: "POST",
            area: "MEMInternal",
            locationId: "d3f9e094-771b-42db-a97e-2ddd61c1607e",
            resource: "GetMemberEntitlementsBatch",
            routeTemplate: "_apis/{resource}",
            responseType: WebApi.TypeInfo.UserEntitlement,
            responseIsCollection: true,
            queryParams: queryValues,
            apiVersion: this.getMemberEntitlementsBatchApiVersion,
            data: memberIds
        });
    }

    /**
     * [Preview API] Used to export user information in an account to csv
     *
     * @return IPromise<any>
     */
    public exportUsersToCSV(): IPromise<any> {

        return this._beginRequest<any>({
            httpMethod: "GET",
            area: "MEMInternal",
            locationId: "ddee2360-aef8-4435-b0a8-92eddbeb85b6",
            resource: "Export",
            routeTemplate: "_apis/{area}/{resource}",
            apiVersion: this.exportApiVersion
        });
    }
}

/**
 * @exemptedapi
 */
export class MEMInternalHttpClient5 extends CommonMethods3_1To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.exportApiVersion =
        this.getMemberEntitlementsBatchApiVersion =
        this.groupEntitlementUserApplicationApiVersion =
        this.memberEntitlementsBatchApiVersion =
        this.removeExplicitAssignmentApiVersion =
        this.userManagementSummaryApiVersion = "5.0-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class MEMInternalHttpClient4_1 extends CommonMethods3_1To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.exportApiVersion =
        this.getMemberEntitlementsBatchApiVersion =
        this.groupEntitlementUserApplicationApiVersion =
        this.memberEntitlementsBatchApiVersion =
        this.removeExplicitAssignmentApiVersion =
        this.userManagementSummaryApiVersion = "4.1-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class MEMInternalHttpClient4 extends CommonMethods3_1To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.exportApiVersion =
        this.getMemberEntitlementsBatchApiVersion =
        this.groupEntitlementUserApplicationApiVersion =
        this.memberEntitlementsBatchApiVersion =
        this.removeExplicitAssignmentApiVersion =
        this.userManagementSummaryApiVersion = "4.0-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class MEMInternalHttpClient3_2 extends CommonMethods3_1To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.exportApiVersion =
        this.getMemberEntitlementsBatchApiVersion =
        this.groupEntitlementUserApplicationApiVersion =
        this.memberEntitlementsBatchApiVersion =
        this.removeExplicitAssignmentApiVersion =
        this.userManagementSummaryApiVersion = "3.2-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class MEMInternalHttpClient3_1 extends CommonMethods3_1To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.exportApiVersion =
        this.getMemberEntitlementsBatchApiVersion =
        this.groupEntitlementUserApplicationApiVersion =
        this.memberEntitlementsBatchApiVersion =
        this.removeExplicitAssignmentApiVersion =
        this.userManagementSummaryApiVersion = "3.1-preview.1";
    }
}

export class MEMInternalHttpClient extends MEMInternalHttpClient5 {
    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
    }
}

const clientMapping: { [id: string]: new (routeRequestPath: string) => VSS_WebApi.VssHttpClient; } = {
    "5.0": MEMInternalHttpClient5,
    "4.1": MEMInternalHttpClient4_1,
    "4.0": MEMInternalHttpClient4,
    "3.2": MEMInternalHttpClient3_2,
    "3.1": MEMInternalHttpClient3_1
}

/**
 * Gets an http client targeting the latest released version of the APIs.
 *
 * @return MEMInternalHttpClient5
 */
export function getClient(options?: VSS_WebApi.IVssHttpClientOptions): MEMInternalHttpClient5 {
    if ((<any>window).VSS && (<any>window).VSS.VssSDKRestVersion && clientMapping[(<any>window).VSS.VssSDKRestVersion]) {
        return VSS_Service.getClient<MEMInternalHttpClient5>(<any>(clientMapping[(<any>window).VSS.VssSDKRestVersion]), undefined, undefined, undefined, options);
    }
    else {
        return VSS_Service.getClient<MEMInternalHttpClient5>(MEMInternalHttpClient5, undefined, undefined, undefined, options);
    }
}
