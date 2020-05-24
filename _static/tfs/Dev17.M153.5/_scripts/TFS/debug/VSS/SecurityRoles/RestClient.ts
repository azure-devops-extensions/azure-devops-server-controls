/**
 * ---------------------------------------------------------
 * Generated file, DO NOT EDIT
 * ---------------------------------------------------------
 *
 * See following wiki page for instructions on how to regenerate:
 *   https://aka.ms/azure-devops-client-generation
 *
 * Configuration file:
 *   vssf\client\securityroles\client\clientgeneratorconfigs\genclient.json
 */

"use strict";

import Contracts = require("VSS/SecurityRoles/Contracts");
import VSS_Service = require("VSS/Service");
import VSS_WebApi = require("VSS/WebApi/RestClient");

export class CommonMethods2_2To5 extends VSS_WebApi.VssHttpClient {
    protected roleassignmentsApiVersion: string;
    protected roledefinitionsApiVersion: string;

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
    }

    /**
     * [Preview API]
     *
     * @param {string} scopeId
     * @return IPromise<Contracts.SecurityRole[]>
     */
    public getRoleDefinitions(
        scopeId: string
        ): IPromise<Contracts.SecurityRole[]> {

        return this._beginRequest<Contracts.SecurityRole[]>({
            httpMethod: "GET",
            area: "securityroles",
            locationId: "f4cc9a86-453c-48d2-b44d-d3bd5c105f4f",
            resource: "roledefinitions",
            routeTemplate: "_apis/{area}/scopes/{scopeId}/{resource}",
            responseIsCollection: true,
            routeValues: {
                scopeId: scopeId
            },
            apiVersion: this.roledefinitionsApiVersion
        });
    }

    /**
     * [Preview API]
     *
     * @param {Contracts.UserRoleAssignmentRef[]} roleAssignments
     * @param {string} scopeId
     * @param {string} resourceId
     * @param {boolean} limitToCallerIdentityDomain
     * @return IPromise<Contracts.RoleAssignment[]>
     */
    public setRoleAssignments(
        roleAssignments: Contracts.UserRoleAssignmentRef[],
        scopeId: string,
        resourceId: string,
        limitToCallerIdentityDomain?: boolean
        ): IPromise<Contracts.RoleAssignment[]> {

        const queryValues: any = {
            limitToCallerIdentityDomain: limitToCallerIdentityDomain
        };

        return this._beginRequest<Contracts.RoleAssignment[]>({
            httpMethod: "PUT",
            area: "securityroles",
            locationId: "9461c234-c84c-4ed2-b918-2f0f92ad0a35",
            resource: "roleassignments",
            routeTemplate: "_apis/{area}/scopes/{scopeId}/{resource}/resources/{resourceId}/{identityId}",
            responseType: Contracts.TypeInfo.RoleAssignment,
            responseIsCollection: true,
            routeValues: {
                scopeId: scopeId,
                resourceId: resourceId
            },
            queryParams: queryValues,
            apiVersion: this.roleassignmentsApiVersion,
            data: roleAssignments
        });
    }

    /**
     * [Preview API]
     *
     * @param {Contracts.UserRoleAssignmentRef} roleAssignment
     * @param {string} scopeId
     * @param {string} resourceId
     * @param {string} identityId
     * @return IPromise<Contracts.RoleAssignment>
     */
    public setRoleAssignment(
        roleAssignment: Contracts.UserRoleAssignmentRef,
        scopeId: string,
        resourceId: string,
        identityId: string
        ): IPromise<Contracts.RoleAssignment> {

        return this._beginRequest<Contracts.RoleAssignment>({
            httpMethod: "PUT",
            area: "securityroles",
            locationId: "9461c234-c84c-4ed2-b918-2f0f92ad0a35",
            resource: "roleassignments",
            routeTemplate: "_apis/{area}/scopes/{scopeId}/{resource}/resources/{resourceId}/{identityId}",
            responseType: Contracts.TypeInfo.RoleAssignment,
            routeValues: {
                scopeId: scopeId,
                resourceId: resourceId,
                identityId: identityId
            },
            apiVersion: this.roleassignmentsApiVersion,
            data: roleAssignment
        });
    }

    /**
     * [Preview API]
     *
     * @param {string[]} identityIds
     * @param {string} scopeId
     * @param {string} resourceId
     * @return IPromise<void>
     */
    public removeRoleAssignments(
        identityIds: string[],
        scopeId: string,
        resourceId: string
        ): IPromise<void> {

        return this._beginRequest<void>({
            httpMethod: "PATCH",
            httpResponseType: "html",
            area: "securityroles",
            locationId: "9461c234-c84c-4ed2-b918-2f0f92ad0a35",
            resource: "roleassignments",
            routeTemplate: "_apis/{area}/scopes/{scopeId}/{resource}/resources/{resourceId}/{identityId}",
            routeValues: {
                scopeId: scopeId,
                resourceId: resourceId
            },
            apiVersion: this.roleassignmentsApiVersion,
            data: identityIds
        });
    }

    /**
     * [Preview API]
     *
     * @param {string} scopeId
     * @param {string} resourceId
     * @param {string} identityId
     * @return IPromise<void>
     */
    public removeRoleAssignment(
        scopeId: string,
        resourceId: string,
        identityId: string
        ): IPromise<void> {

        return this._beginRequest<void>({
            httpMethod: "DELETE",
            httpResponseType: "html",
            area: "securityroles",
            locationId: "9461c234-c84c-4ed2-b918-2f0f92ad0a35",
            resource: "roleassignments",
            routeTemplate: "_apis/{area}/scopes/{scopeId}/{resource}/resources/{resourceId}/{identityId}",
            routeValues: {
                scopeId: scopeId,
                resourceId: resourceId,
                identityId: identityId
            },
            apiVersion: this.roleassignmentsApiVersion
        });
    }

    /**
     * [Preview API]
     *
     * @param {string} scopeId
     * @param {string} resourceId
     * @return IPromise<Contracts.RoleAssignment[]>
     */
    public getRoleAssignments(
        scopeId: string,
        resourceId: string
        ): IPromise<Contracts.RoleAssignment[]> {

        return this._beginRequest<Contracts.RoleAssignment[]>({
            httpMethod: "GET",
            area: "securityroles",
            locationId: "9461c234-c84c-4ed2-b918-2f0f92ad0a35",
            resource: "roleassignments",
            routeTemplate: "_apis/{area}/scopes/{scopeId}/{resource}/resources/{resourceId}/{identityId}",
            responseType: Contracts.TypeInfo.RoleAssignment,
            responseIsCollection: true,
            routeValues: {
                scopeId: scopeId,
                resourceId: resourceId
            },
            apiVersion: this.roleassignmentsApiVersion
        });
    }

    /**
     * [Preview API]
     *
     * @param {string} scopeId
     * @param {string} resourceId
     * @param {boolean} inheritPermissions
     * @return IPromise<void>
     */
    public changeInheritance(
        scopeId: string,
        resourceId: string,
        inheritPermissions: boolean
        ): IPromise<void> {

        const queryValues: any = {
            inheritPermissions: inheritPermissions
        };

        return this._beginRequest<void>({
            httpMethod: "PATCH",
            httpResponseType: "html",
            area: "securityroles",
            locationId: "9461c234-c84c-4ed2-b918-2f0f92ad0a35",
            resource: "roleassignments",
            routeTemplate: "_apis/{area}/scopes/{scopeId}/{resource}/resources/{resourceId}/{identityId}",
            routeValues: {
                scopeId: scopeId,
                resourceId: resourceId
            },
            queryParams: queryValues,
            apiVersion: this.roleassignmentsApiVersion
        });
    }
}

/**
 * @exemptedapi
 */
export class SecurityRolesHttpClient5 extends CommonMethods2_2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.roleassignmentsApiVersion =
        this.roledefinitionsApiVersion = "5.0-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class SecurityRolesHttpClient4_1 extends CommonMethods2_2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.roleassignmentsApiVersion =
        this.roledefinitionsApiVersion = "4.1-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class SecurityRolesHttpClient4 extends CommonMethods2_2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.roleassignmentsApiVersion =
        this.roledefinitionsApiVersion = "4.0-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class SecurityRolesHttpClient3_2 extends CommonMethods2_2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.roleassignmentsApiVersion =
        this.roledefinitionsApiVersion = "3.2-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class SecurityRolesHttpClient3_1 extends CommonMethods2_2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.roleassignmentsApiVersion =
        this.roledefinitionsApiVersion = "3.1-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class SecurityRolesHttpClient3 extends CommonMethods2_2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.roleassignmentsApiVersion =
        this.roledefinitionsApiVersion = "3.0-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class SecurityRolesHttpClient2_3 extends CommonMethods2_2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.roleassignmentsApiVersion =
        this.roledefinitionsApiVersion = "2.3-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class SecurityRolesHttpClient2_2 extends CommonMethods2_2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.roleassignmentsApiVersion =
        this.roledefinitionsApiVersion = "2.2-preview.1";
    }
}

export class SecurityRolesHttpClient extends SecurityRolesHttpClient5 {
    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
    }
}

const clientMapping: { [id: string]: new (routeRequestPath: string) => VSS_WebApi.VssHttpClient; } = {
    "5.0": SecurityRolesHttpClient5,
    "4.1": SecurityRolesHttpClient4_1,
    "4.0": SecurityRolesHttpClient4,
    "3.2": SecurityRolesHttpClient3_2,
    "3.1": SecurityRolesHttpClient3_1,
    "3.0": SecurityRolesHttpClient3,
    "2.3": SecurityRolesHttpClient2_3,
    "2.2": SecurityRolesHttpClient2_2
}

/**
 * Gets an http client targeting the latest released version of the APIs.
 *
 * @return SecurityRolesHttpClient5
 */
export function getClient(options?: VSS_WebApi.IVssHttpClientOptions): SecurityRolesHttpClient5 {
    if ((<any>window).VSS && (<any>window).VSS.VssSDKRestVersion && clientMapping[(<any>window).VSS.VssSDKRestVersion]) {
        return VSS_Service.getClient<SecurityRolesHttpClient5>(<any>(clientMapping[(<any>window).VSS.VssSDKRestVersion]), undefined, undefined, undefined, options);
    }
    else {
        return VSS_Service.getClient<SecurityRolesHttpClient5>(SecurityRolesHttpClient5, undefined, undefined, undefined, options);
    }
}
