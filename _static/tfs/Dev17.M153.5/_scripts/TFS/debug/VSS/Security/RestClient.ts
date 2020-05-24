/**
 * ---------------------------------------------------------
 * Generated file, DO NOT EDIT
 * ---------------------------------------------------------
 *
 * See following wiki page for instructions on how to regenerate:
 *   https://aka.ms/azure-devops-client-generation
 *
 * Configuration file:
 *   vssf\client\webapi\httpclients\clientgeneratorconfigs\security.genclient.json
 */

"use strict";

import Contracts = require("VSS/Security/Contracts");
import VSS_Common_Contracts = require("VSS/WebApi/Contracts");
import VSS_Service = require("VSS/Service");
import VSS_WebApi = require("VSS/WebApi/RestClient");

export class CommonMethods2To5 extends VSS_WebApi.VssHttpClient {
    protected accessControlEntriesApiVersion: string;
    protected accessControlListsApiVersion: string;
    protected permissionsApiVersion: string;
    protected securityNamespacesApiVersion: string;

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
    }

    /**
     * @internal
     * @param {any} container
     * @param {string} securityNamespaceId
     * @return IPromise<void>
     */
    public setInheritFlag(
        container: any,
        securityNamespaceId: string
        ): IPromise<void> {

        return this._beginRequest<void>({
            httpMethod: "POST",
            httpResponseType: "html",
            area: "Security",
            locationId: "ce7b9f95-fde9-4be8-a86d-83b366f0b87a",
            resource: "SecurityNamespaces",
            routeTemplate: "_apis/{resource}/{securityNamespaceId}",
            routeValues: {
                securityNamespaceId: securityNamespaceId
            },
            apiVersion: this.securityNamespacesApiVersion,
            data: container
        });
    }

    /**
     * List all security namespaces or just the specified namespace.
     *
     * @param {string} securityNamespaceId - Security namespace identifier.
     * @param {boolean} localOnly - If true, retrieve only local security namespaces.
     * @return IPromise<Contracts.SecurityNamespaceDescription[]>
     */
    public querySecurityNamespaces(
        securityNamespaceId?: string,
        localOnly?: boolean
        ): IPromise<Contracts.SecurityNamespaceDescription[]> {

        const queryValues: any = {
            localOnly: localOnly
        };

        return this._beginRequest<Contracts.SecurityNamespaceDescription[]>({
            httpMethod: "GET",
            area: "Security",
            locationId: "ce7b9f95-fde9-4be8-a86d-83b366f0b87a",
            resource: "SecurityNamespaces",
            routeTemplate: "_apis/{resource}/{securityNamespaceId}",
            responseIsCollection: true,
            routeValues: {
                securityNamespaceId: securityNamespaceId
            },
            queryParams: queryValues,
            apiVersion: this.securityNamespacesApiVersion
        });
    }

    /**
     * Removes the specified permissions on a security token for a user or group.
     *
     * @param {string} securityNamespaceId - Security namespace identifier.
     * @param {string} descriptor - Identity descriptor of the user to remove permissions for.
     * @param {number} permissions - Permissions to remove.
     * @param {string} token - Security token to remove permissions for.
     * @return IPromise<Contracts.AccessControlEntry>
     */
    public removePermission(
        securityNamespaceId: string,
        descriptor: string,
        permissions?: number,
        token?: string
        ): IPromise<Contracts.AccessControlEntry> {

        const queryValues: any = {
            descriptor: descriptor,
            token: token
        };

        return this._beginRequest<Contracts.AccessControlEntry>({
            httpMethod: "DELETE",
            area: "Security",
            locationId: "dd3b8bd6-c7fc-4cbd-929a-933d9c011c9d",
            resource: "Permissions",
            routeTemplate: "_apis/{resource}/{securityNamespaceId}/{permissions}",
            routeValues: {
                securityNamespaceId: securityNamespaceId,
                permissions: permissions
            },
            queryParams: queryValues,
            apiVersion: this.permissionsApiVersion
        });
    }

    /**
     * Create or update one or more access control lists. All data that currently exists for the ACLs supplied will be overwritten.
     *
     * @param {VSS_Common_Contracts.VssJsonCollectionWrapperV<Contracts.AccessControlListsCollection>} accessControlLists - A list of ACLs to create or update.
     * @param {string} securityNamespaceId - Security namespace identifier.
     * @return IPromise<void>
     */
    public setAccessControlLists(
        accessControlLists: VSS_Common_Contracts.VssJsonCollectionWrapperV<Contracts.AccessControlListsCollection>,
        securityNamespaceId: string
        ): IPromise<void> {

        return this._beginRequest<void>({
            httpMethod: "POST",
            httpResponseType: "html",
            area: "Security",
            locationId: "18a2ad18-7571-46ae-bec7-0c7da1495885",
            resource: "AccessControlLists",
            routeTemplate: "_apis/{resource}/{securityNamespaceId}",
            routeValues: {
                securityNamespaceId: securityNamespaceId
            },
            apiVersion: this.accessControlListsApiVersion,
            data: accessControlLists
        });
    }

    /**
     * Remove access control lists under the specfied security namespace.
     *
     * @param {string} securityNamespaceId - Security namespace identifier.
     * @param {string} tokens - One or more comma-separated security tokens
     * @param {boolean} recurse - If true and this is a hierarchical namespace, also remove child ACLs of the specified tokens.
     * @return IPromise<boolean>
     */
    public removeAccessControlLists(
        securityNamespaceId: string,
        tokens?: string,
        recurse?: boolean
        ): IPromise<boolean> {

        const queryValues: any = {
            tokens: tokens,
            recurse: recurse
        };

        return this._beginRequest<boolean>({
            httpMethod: "DELETE",
            area: "Security",
            locationId: "18a2ad18-7571-46ae-bec7-0c7da1495885",
            resource: "AccessControlLists",
            routeTemplate: "_apis/{resource}/{securityNamespaceId}",
            routeValues: {
                securityNamespaceId: securityNamespaceId
            },
            queryParams: queryValues,
            apiVersion: this.accessControlListsApiVersion
        });
    }

    /**
     * Return a list of access control lists for the specified security namespace and token. All ACLs in the security namespace will be retrieved if no optional parameters are provided.
     *
     * @param {string} securityNamespaceId - Security namespace identifier.
     * @param {string} token - Security token
     * @param {string} descriptors - An optional filter string containing a list of identity descriptors separated by ',' whose ACEs should be retrieved. If this is left null, entire ACLs will be returned.
     * @param {boolean} includeExtendedInfo - If true, populate the extended information properties for the access control entries contained in the returned lists.
     * @param {boolean} recurse - If true and this is a hierarchical namespace, return child ACLs of the specified token.
     * @return IPromise<Contracts.AccessControlList[]>
     */
    public queryAccessControlLists(
        securityNamespaceId: string,
        token?: string,
        descriptors?: string,
        includeExtendedInfo?: boolean,
        recurse?: boolean
        ): IPromise<Contracts.AccessControlList[]> {

        const queryValues: any = {
            token: token,
            descriptors: descriptors,
            includeExtendedInfo: includeExtendedInfo,
            recurse: recurse
        };

        return this._beginRequest<Contracts.AccessControlList[]>({
            httpMethod: "GET",
            area: "Security",
            locationId: "18a2ad18-7571-46ae-bec7-0c7da1495885",
            resource: "AccessControlLists",
            routeTemplate: "_apis/{resource}/{securityNamespaceId}",
            responseIsCollection: true,
            routeValues: {
                securityNamespaceId: securityNamespaceId
            },
            queryParams: queryValues,
            apiVersion: this.accessControlListsApiVersion
        });
    }

    /**
     * Add or update ACEs in the ACL for the provided token. The request body contains the target token, a list of [ACEs](https://docs.microsoft.com/en-us/rest/api/azure/devops/security/access%20control%20entries/set%20access%20control%20entries?#accesscontrolentry) and a optional merge parameter. In the case of a collision (by identity descriptor) with an existing ACE in the ACL, the "merge" parameter determines the behavior. If set, the existing ACE has its allow and deny merged with the incoming ACE's allow and deny. If unset, the existing ACE is displaced.
     *
     * @param {any} container
     * @param {string} securityNamespaceId - Security namespace identifier.
     * @return IPromise<Contracts.AccessControlEntry[]>
     */
    public setAccessControlEntries(
        container: any,
        securityNamespaceId: string
        ): IPromise<Contracts.AccessControlEntry[]> {

        return this._beginRequest<Contracts.AccessControlEntry[]>({
            httpMethod: "POST",
            area: "Security",
            locationId: "ac08c8ff-4323-4b08-af90-bcd018d380ce",
            resource: "AccessControlEntries",
            routeTemplate: "_apis/{resource}/{securityNamespaceId}",
            responseIsCollection: true,
            routeValues: {
                securityNamespaceId: securityNamespaceId
            },
            apiVersion: this.accessControlEntriesApiVersion,
            data: container
        });
    }

    /**
     * Remove the specified ACEs from the ACL belonging to the specified token.
     *
     * @param {string} securityNamespaceId - Security namespace identifier.
     * @param {string} token - The token whose ACL should be modified.
     * @param {string} descriptors - String containing a list of identity descriptors separated by ',' whose entries should be removed.
     * @return IPromise<boolean>
     */
    public removeAccessControlEntries(
        securityNamespaceId: string,
        token?: string,
        descriptors?: string
        ): IPromise<boolean> {

        const queryValues: any = {
            token: token,
            descriptors: descriptors
        };

        return this._beginRequest<boolean>({
            httpMethod: "DELETE",
            area: "Security",
            locationId: "ac08c8ff-4323-4b08-af90-bcd018d380ce",
            resource: "AccessControlEntries",
            routeTemplate: "_apis/{resource}/{securityNamespaceId}",
            routeValues: {
                securityNamespaceId: securityNamespaceId
            },
            queryParams: queryValues,
            apiVersion: this.accessControlEntriesApiVersion
        });
    }
}

export class CommonMethods2_2To5 extends CommonMethods2To5 {
    protected permissionsApiVersion: string;

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
    }

    /**
     * Evaluates whether the caller has the specified permissions on the specified set of security tokens.
     *
     * @param {string} securityNamespaceId - Security namespace identifier.
     * @param {number} permissions - Permissions to evaluate.
     * @param {string} tokens - One or more security tokens to evaluate.
     * @param {boolean} alwaysAllowAdministrators - If true and if the caller is an administrator, always return true.
     * @param {string} delimiter - Optional security token separator. Defaults to ",".
     * @return IPromise<boolean[]>
     */
    public hasPermissions(
        securityNamespaceId: string,
        permissions?: number,
        tokens?: string,
        alwaysAllowAdministrators?: boolean,
        delimiter?: string
        ): IPromise<boolean[]> {

        const queryValues: any = {
            tokens: tokens,
            alwaysAllowAdministrators: alwaysAllowAdministrators,
            delimiter: delimiter
        };

        return this._beginRequest<boolean[]>({
            httpMethod: "GET",
            area: "Security",
            locationId: "dd3b8bd6-c7fc-4cbd-929a-933d9c011c9d",
            resource: "Permissions",
            routeTemplate: "_apis/{resource}/{securityNamespaceId}/{permissions}",
            responseIsCollection: true,
            routeValues: {
                securityNamespaceId: securityNamespaceId,
                permissions: permissions
            },
            queryParams: queryValues,
            apiVersion: this.permissionsApiVersion
        });
    }
}

export class CommonMethods3To5 extends CommonMethods2_2To5 {
    protected permissionEvaluationBatchApiVersion: string;

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
    }

    /**
     * Evaluates multiple permissions for the calling user.  Note: This method does not aggregate the results, nor does it short-circuit if one of the permissions evaluates to false.
     *
     * @param {Contracts.PermissionEvaluationBatch} evalBatch - The set of evaluation requests.
     * @return IPromise<Contracts.PermissionEvaluationBatch>
     */
    public hasPermissionsBatch(
        evalBatch: Contracts.PermissionEvaluationBatch
        ): IPromise<Contracts.PermissionEvaluationBatch> {

        return this._beginRequest<Contracts.PermissionEvaluationBatch>({
            httpMethod: "POST",
            area: "Security",
            locationId: "cf1faa59-1b63-4448-bf04-13d981a46f5d",
            resource: "PermissionEvaluationBatch",
            routeTemplate: "_apis/{area}/{resource}",
            apiVersion: this.permissionEvaluationBatchApiVersion,
            data: evalBatch
        });
    }
}

/**
 * @exemptedapi
 */
export class SecurityHttpClient5 extends CommonMethods3To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.accessControlEntriesApiVersion =
        this.accessControlListsApiVersion =
        this.permissionEvaluationBatchApiVersion =
        this.permissionsApiVersion =
        this.securityNamespacesApiVersion = "5.0";
    }
}

/**
 * @exemptedapi
 */
export class SecurityHttpClient4_1 extends CommonMethods3To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.accessControlEntriesApiVersion =
        this.accessControlListsApiVersion =
        this.permissionEvaluationBatchApiVersion =
        this.permissionsApiVersion =
        this.securityNamespacesApiVersion = "4.1";
    }
}

/**
 * @exemptedapi
 */
export class SecurityHttpClient4 extends CommonMethods3To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.accessControlEntriesApiVersion =
        this.accessControlListsApiVersion =
        this.permissionEvaluationBatchApiVersion =
        this.permissionsApiVersion =
        this.securityNamespacesApiVersion = "4.0";
    }
}

/**
 * @exemptedapi
 */
export class SecurityHttpClient3_2 extends CommonMethods3To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.accessControlEntriesApiVersion =
        this.accessControlListsApiVersion =
        this.permissionEvaluationBatchApiVersion =
        this.permissionsApiVersion =
        this.securityNamespacesApiVersion = "3.2";
    }
}

/**
 * @exemptedapi
 */
export class SecurityHttpClient3_1 extends CommonMethods3To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.accessControlEntriesApiVersion =
        this.accessControlListsApiVersion =
        this.permissionEvaluationBatchApiVersion =
        this.permissionsApiVersion =
        this.securityNamespacesApiVersion = "3.1";
    }
}

/**
 * @exemptedapi
 */
export class SecurityHttpClient3 extends CommonMethods3To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.accessControlEntriesApiVersion =
        this.accessControlListsApiVersion =
        this.permissionEvaluationBatchApiVersion =
        this.permissionsApiVersion =
        this.securityNamespacesApiVersion = "3.0";
    }
}

/**
 * @exemptedapi
 */
export class SecurityHttpClient2_3 extends CommonMethods2_2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.accessControlEntriesApiVersion =
        this.accessControlListsApiVersion =
        this.permissionsApiVersion =
        this.securityNamespacesApiVersion = "2.3";
    }
}

/**
 * @exemptedapi
 */
export class SecurityHttpClient2_2 extends CommonMethods2_2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.accessControlEntriesApiVersion =
        this.accessControlListsApiVersion =
        this.permissionsApiVersion =
        this.securityNamespacesApiVersion = "2.2";
    }
}

export class SecurityHttpClient2_1 extends CommonMethods2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.accessControlEntriesApiVersion =
        this.accessControlListsApiVersion =
        this.permissionsApiVersion =
        this.securityNamespacesApiVersion = "2.1";
    }

    /**
     * Evaluates whether the caller has the specified permissions.
     *
     * @param {string} securityNamespaceId - Security namespace identifier.
     * @param {number} permissions - Permissions to evaluate.
     * @param {string} token - Security token to evaluate.
     * @param {boolean} alwaysAllowAdministrators - If true and if the caller is an administrator, always return true.
     * @return IPromise<boolean>
     */
    public hasPermission(
        securityNamespaceId: string,
        permissions?: number,
        token?: string,
        alwaysAllowAdministrators?: boolean
        ): IPromise<boolean> {

        const queryValues: any = {
            token: token,
            alwaysAllowAdministrators: alwaysAllowAdministrators
        };

        return this._beginRequest<boolean>({
            httpMethod: "GET",
            area: "Security",
            locationId: "dd3b8bd6-c7fc-4cbd-929a-933d9c011c9d",
            resource: "Permissions",
            routeTemplate: "_apis/{resource}/{securityNamespaceId}/{permissions}",
            routeValues: {
                securityNamespaceId: securityNamespaceId,
                permissions: permissions
            },
            queryParams: queryValues,
            apiVersion: "2.1"
        });
    }
}

export class SecurityHttpClient2 extends CommonMethods2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.accessControlEntriesApiVersion =
        this.accessControlListsApiVersion =
        this.permissionsApiVersion =
        this.securityNamespacesApiVersion = "2.0";
    }

    /**
     * Evaluates whether the caller has the specified permissions.
     *
     * @param {string} securityNamespaceId - Security namespace identifier.
     * @param {number} permissions - Permissions to evaluate.
     * @param {string} token - Security token to evaluate.
     * @param {boolean} alwaysAllowAdministrators - If true and if the caller is an administrator, always return true.
     * @return IPromise<boolean>
     */
    public hasPermission(
        securityNamespaceId: string,
        permissions?: number,
        token?: string,
        alwaysAllowAdministrators?: boolean
        ): IPromise<boolean> {

        const queryValues: any = {
            token: token,
            alwaysAllowAdministrators: alwaysAllowAdministrators
        };

        return this._beginRequest<boolean>({
            httpMethod: "GET",
            area: "Security",
            locationId: "dd3b8bd6-c7fc-4cbd-929a-933d9c011c9d",
            resource: "Permissions",
            routeTemplate: "_apis/{resource}/{securityNamespaceId}/{permissions}",
            routeValues: {
                securityNamespaceId: securityNamespaceId,
                permissions: permissions
            },
            queryParams: queryValues,
            apiVersion: "2.0"
        });
    }
}

export class SecurityHttpClient extends SecurityHttpClient5 {
    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
    }
}

const clientMapping: { [id: string]: new (routeRequestPath: string) => VSS_WebApi.VssHttpClient; } = {
    "5.0": SecurityHttpClient5,
    "4.1": SecurityHttpClient4_1,
    "4.0": SecurityHttpClient4,
    "3.2": SecurityHttpClient3_2,
    "3.1": SecurityHttpClient3_1,
    "3.0": SecurityHttpClient3,
    "2.3": SecurityHttpClient2_3,
    "2.2": SecurityHttpClient2_2,
    "2.1": SecurityHttpClient2_1,
    "2.0": SecurityHttpClient2
}

/**
 * Gets an http client targeting the latest released version of the APIs.
 *
 * @return SecurityHttpClient5
 */
export function getClient(options?: VSS_WebApi.IVssHttpClientOptions): SecurityHttpClient5 {
    if ((<any>window).VSS && (<any>window).VSS.VssSDKRestVersion && clientMapping[(<any>window).VSS.VssSDKRestVersion]) {
        return VSS_Service.getClient<SecurityHttpClient5>(<any>(clientMapping[(<any>window).VSS.VssSDKRestVersion]), undefined, undefined, undefined, options);
    }
    else {
        return VSS_Service.getClient<SecurityHttpClient5>(SecurityHttpClient5, undefined, undefined, undefined, options);
    }
}
