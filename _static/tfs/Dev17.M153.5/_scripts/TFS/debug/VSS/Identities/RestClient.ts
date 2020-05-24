/**
 * ---------------------------------------------------------
 * Generated file, DO NOT EDIT
 * ---------------------------------------------------------
 *
 * See following wiki page for instructions on how to regenerate:
 *   https://aka.ms/azure-devops-client-generation
 *
 * Configuration file:
 *   vssf\client\webapi\httpclients\clientgeneratorconfigs\genclient.json
 */

"use strict";

import Contracts = require("VSS/Identities/Contracts");
import VSS_Common_Contracts = require("VSS/WebApi/Contracts");
import VSS_DelegatedAuthorization_Contracts = require("VSS/DelegatedAuthorization/Contracts");
import VSS_Service = require("VSS/Service");
import VSS_WebApi = require("VSS/WebApi/RestClient");

export class CommonMethods2To5 extends VSS_WebApi.VssHttpClient {
    protected claimsApiVersion: string;
    protected descriptorsApiVersion: string;
    protected groupsApiVersion: string;
    protected identitiesApiVersion: string;
    protected identityApiVersion: string;
    protected identityBatchApiVersion: string;
    protected identitySnapshotApiVersion: string;
    protected maxSequenceIdApiVersion: string;
    protected meApiVersion: string;
    protected membersApiVersion: string;
    protected membersOfApiVersion: string;
    protected scopesApiVersion: string;
    protected signedInTokenApiVersion: string;
    protected signoutTokenApiVersion: string;
    protected swapApiVersion: string;
    protected tenantApiVersion: string;

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
    }

    /**
     * @exemptedapi
     * [Preview API]
     *
     * @param {string} tenantId
     * @return IPromise<Contracts.TenantInfo>
     */
    public getTenant(
        tenantId: string
        ): IPromise<Contracts.TenantInfo> {

        return this._beginRequest<Contracts.TenantInfo>({
            httpMethod: "GET",
            area: "IMS",
            locationId: "5f0a1723-2e2c-4c31-8cae-002d01bdd592",
            resource: "tenant",
            routeTemplate: "_apis/identities/{resource}/{tenantId}",
            routeValues: {
                tenantId: tenantId
            },
            apiVersion: this.tenantApiVersion
        });
    }

    /**
     * @internal
     * @exemptedapi
     * [Preview API]
     *
     * @param {Contracts.SwapIdentityInfo} info
     * @return IPromise<void>
     */
    public swapIdentity(
        info: Contracts.SwapIdentityInfo
        ): IPromise<void> {

        return this._beginRequest<void>({
            httpMethod: "POST",
            httpResponseType: "html",
            area: "IMS",
            locationId: "7a2338c2-39d8-4906-9889-e8bc9c52cbb2",
            resource: "Swap",
            routeTemplate: "_apis/identities/{resource}",
            apiVersion: this.swapApiVersion,
            data: info
        });
    }

    /**
     * @exemptedapi
     * [Preview API]
     *
     * @return IPromise<VSS_DelegatedAuthorization_Contracts.AccessTokenResult>
     */
    public getSignoutToken(): IPromise<VSS_DelegatedAuthorization_Contracts.AccessTokenResult> {

        return this._beginRequest<VSS_DelegatedAuthorization_Contracts.AccessTokenResult>({
            httpMethod: "GET",
            area: "IMS",
            locationId: "be39e83c-7529-45e9-9c67-0410885880da",
            resource: "SignoutToken",
            routeTemplate: "_apis/{resource}",
            responseType: VSS_DelegatedAuthorization_Contracts.TypeInfo.AccessTokenResult,
            apiVersion: this.signoutTokenApiVersion
        });
    }

    /**
     * @exemptedapi
     * [Preview API]
     *
     * @return IPromise<VSS_DelegatedAuthorization_Contracts.AccessTokenResult>
     */
    public getSignedInToken(): IPromise<VSS_DelegatedAuthorization_Contracts.AccessTokenResult> {

        return this._beginRequest<VSS_DelegatedAuthorization_Contracts.AccessTokenResult>({
            httpMethod: "GET",
            area: "IMS",
            locationId: "6074ff18-aaad-4abb-a41e-5c75f6178057",
            resource: "SignedInToken",
            routeTemplate: "_apis/{resource}",
            responseType: VSS_DelegatedAuthorization_Contracts.TypeInfo.AccessTokenResult,
            apiVersion: this.signedInTokenApiVersion
        });
    }

    /**
     * @exemptedapi
     * [Preview API]
     *
     * @param {string} scopeName
     * @return IPromise<Contracts.IdentityScope>
     */
    public getScopeByName(
        scopeName: string
        ): IPromise<Contracts.IdentityScope> {

        const queryValues: any = {
            scopeName: scopeName
        };

        return this._beginRequest<Contracts.IdentityScope>({
            httpMethod: "GET",
            area: "IMS",
            locationId: "4e11e2bf-1e79-4eb5-8f34-a6337bd0de38",
            resource: "Scopes",
            routeTemplate: "_apis/{resource}/{scopeId}",
            responseType: Contracts.TypeInfo.IdentityScope,
            queryParams: queryValues,
            apiVersion: this.scopesApiVersion
        });
    }

    /**
     * @exemptedapi
     * [Preview API]
     *
     * @param {string} scopeId
     * @return IPromise<Contracts.IdentityScope>
     */
    public getScopeById(
        scopeId: string
        ): IPromise<Contracts.IdentityScope> {

        return this._beginRequest<Contracts.IdentityScope>({
            httpMethod: "GET",
            area: "IMS",
            locationId: "4e11e2bf-1e79-4eb5-8f34-a6337bd0de38",
            resource: "Scopes",
            routeTemplate: "_apis/{resource}/{scopeId}",
            responseType: Contracts.TypeInfo.IdentityScope,
            routeValues: {
                scopeId: scopeId
            },
            apiVersion: this.scopesApiVersion
        });
    }

    /**
     * @exemptedapi
     * [Preview API]
     *
     * @param {string} scopeId
     * @return IPromise<void>
     */
    public deleteScope(
        scopeId: string
        ): IPromise<void> {

        return this._beginRequest<void>({
            httpMethod: "DELETE",
            httpResponseType: "html",
            area: "IMS",
            locationId: "4e11e2bf-1e79-4eb5-8f34-a6337bd0de38",
            resource: "Scopes",
            routeTemplate: "_apis/{resource}/{scopeId}",
            routeValues: {
                scopeId: scopeId
            },
            apiVersion: this.scopesApiVersion
        });
    }

    /**
     * @exemptedapi
     * [Preview API]
     *
     * @param {Contracts.CreateScopeInfo} info
     * @param {string} scopeId
     * @return IPromise<Contracts.IdentityScope>
     */
    public createScope(
        info: Contracts.CreateScopeInfo,
        scopeId: string
        ): IPromise<Contracts.IdentityScope> {

        return this._beginRequest<Contracts.IdentityScope>({
            httpMethod: "PUT",
            area: "IMS",
            locationId: "4e11e2bf-1e79-4eb5-8f34-a6337bd0de38",
            resource: "Scopes",
            routeTemplate: "_apis/{resource}/{scopeId}",
            requestType: Contracts.TypeInfo.CreateScopeInfo,
            responseType: Contracts.TypeInfo.IdentityScope,
            routeValues: {
                scopeId: scopeId
            },
            apiVersion: this.scopesApiVersion,
            data: info
        });
    }

    /**
     * @exemptedapi
     * [Preview API]
     *
     * @param {string} memberId
     * @param {Contracts.QueryMembership} queryMembership
     * @return IPromise<Contracts.IdentityDescriptor[]>
     */
    public readMembersOf(
        memberId: string,
        queryMembership?: Contracts.QueryMembership
        ): IPromise<Contracts.IdentityDescriptor[]> {

        const queryValues: any = {
            queryMembership: queryMembership
        };

        return this._beginRequest<Contracts.IdentityDescriptor[]>({
            httpMethod: "GET",
            area: "IMS",
            locationId: "22865b02-9e4a-479e-9e18-e35b8803b8a0",
            resource: "MembersOf",
            routeTemplate: "_apis/identities/{memberId}/{resource}/{containerId}",
            responseIsCollection: true,
            routeValues: {
                memberId: memberId
            },
            queryParams: queryValues,
            apiVersion: this.membersOfApiVersion
        });
    }

    /**
     * @exemptedapi
     * [Preview API]
     *
     * @param {string} memberId
     * @param {string} containerId
     * @param {Contracts.QueryMembership} queryMembership
     * @return IPromise<Contracts.IdentityDescriptor>
     */
    public readMemberOf(
        memberId: string,
        containerId: string,
        queryMembership?: Contracts.QueryMembership
        ): IPromise<Contracts.IdentityDescriptor> {

        const queryValues: any = {
            queryMembership: queryMembership
        };

        return this._beginRequest<Contracts.IdentityDescriptor>({
            httpMethod: "GET",
            area: "IMS",
            locationId: "22865b02-9e4a-479e-9e18-e35b8803b8a0",
            resource: "MembersOf",
            routeTemplate: "_apis/identities/{memberId}/{resource}/{containerId}",
            routeValues: {
                memberId: memberId,
                containerId: containerId
            },
            queryParams: queryValues,
            apiVersion: this.membersOfApiVersion
        });
    }

    /**
     * @exemptedapi
     * [Preview API]
     *
     * @param {string} containerId
     * @param {string} memberId
     * @return IPromise<boolean>
     */
    public removeMember(
        containerId: string,
        memberId: string
        ): IPromise<boolean> {

        return this._beginRequest<boolean>({
            httpMethod: "DELETE",
            area: "IMS",
            locationId: "8ba35978-138e-41f8-8963-7b1ea2c5f775",
            resource: "Members",
            routeTemplate: "_apis/identities/{containerId}/{resource}/{memberId}",
            routeValues: {
                containerId: containerId,
                memberId: memberId
            },
            apiVersion: this.membersApiVersion
        });
    }

    /**
     * @exemptedapi
     * [Preview API]
     *
     * @param {string} containerId
     * @param {Contracts.QueryMembership} queryMembership
     * @return IPromise<Contracts.IdentityDescriptor[]>
     */
    public readMembers(
        containerId: string,
        queryMembership?: Contracts.QueryMembership
        ): IPromise<Contracts.IdentityDescriptor[]> {

        const queryValues: any = {
            queryMembership: queryMembership
        };

        return this._beginRequest<Contracts.IdentityDescriptor[]>({
            httpMethod: "GET",
            area: "IMS",
            locationId: "8ba35978-138e-41f8-8963-7b1ea2c5f775",
            resource: "Members",
            routeTemplate: "_apis/identities/{containerId}/{resource}/{memberId}",
            responseIsCollection: true,
            routeValues: {
                containerId: containerId
            },
            queryParams: queryValues,
            apiVersion: this.membersApiVersion
        });
    }

    /**
     * @exemptedapi
     * [Preview API]
     *
     * @param {string} containerId
     * @param {string} memberId
     * @param {Contracts.QueryMembership} queryMembership
     * @return IPromise<Contracts.IdentityDescriptor>
     */
    public readMember(
        containerId: string,
        memberId: string,
        queryMembership?: Contracts.QueryMembership
        ): IPromise<Contracts.IdentityDescriptor> {

        const queryValues: any = {
            queryMembership: queryMembership
        };

        return this._beginRequest<Contracts.IdentityDescriptor>({
            httpMethod: "GET",
            area: "IMS",
            locationId: "8ba35978-138e-41f8-8963-7b1ea2c5f775",
            resource: "Members",
            routeTemplate: "_apis/identities/{containerId}/{resource}/{memberId}",
            routeValues: {
                containerId: containerId,
                memberId: memberId
            },
            queryParams: queryValues,
            apiVersion: this.membersApiVersion
        });
    }

    /**
     * @exemptedapi
     * [Preview API]
     *
     * @param {string} containerId
     * @param {string} memberId
     * @return IPromise<boolean>
     */
    public addMember(
        containerId: string,
        memberId: string
        ): IPromise<boolean> {

        return this._beginRequest<boolean>({
            httpMethod: "PUT",
            area: "IMS",
            locationId: "8ba35978-138e-41f8-8963-7b1ea2c5f775",
            resource: "Members",
            routeTemplate: "_apis/identities/{containerId}/{resource}/{memberId}",
            routeValues: {
                containerId: containerId,
                memberId: memberId
            },
            apiVersion: this.membersApiVersion
        });
    }

    /**
     * Read identity of the home tenant request user.
     *
     * @return IPromise<Contracts.IdentitySelf>
     */
    public getSelf(): IPromise<Contracts.IdentitySelf> {

        return this._beginRequest<Contracts.IdentitySelf>({
            httpMethod: "GET",
            area: "IMS",
            locationId: "4bb02b5b-c120-4be2-b68e-21f7c50a4b82",
            resource: "me",
            routeTemplate: "_apis/identities/{resource}",
            apiVersion: this.meApiVersion
        });
    }

    /**
     * Read the max sequence id of all the identities.
     *
     * @return IPromise<number>
     */
    public getMaxSequenceId(): IPromise<number> {

        return this._beginRequest<number>({
            httpMethod: "GET",
            area: "IMS",
            locationId: "e4a70778-cb2c-4e85-b7cc-3f3c7ae2d408",
            resource: "MaxSequenceId",
            routeTemplate: "_apis/identities/{resource}",
            apiVersion: this.maxSequenceIdApiVersion
        });
    }

    /**
     * @exemptedapi
     * [Preview API]
     *
     * @param {string} scopeId
     * @return IPromise<Contracts.IdentitySnapshot>
     */
    public getIdentitySnapshot(
        scopeId: string
        ): IPromise<Contracts.IdentitySnapshot> {

        return this._beginRequest<Contracts.IdentitySnapshot>({
            httpMethod: "GET",
            area: "IMS",
            locationId: "d56223df-8ccd-45c9-89b4-eddf692400d7",
            resource: "IdentitySnapshot",
            routeTemplate: "_apis/{resource}/{scopeId}",
            responseType: Contracts.TypeInfo.IdentitySnapshot,
            routeValues: {
                scopeId: scopeId
            },
            apiVersion: this.identitySnapshotApiVersion
        });
    }

    /**
     * @exemptedapi
     * [Preview API]
     *
     * @param {Contracts.IdentityBatchInfo} batchInfo
     * @return IPromise<Contracts.Identity[]>
     */
    public readIdentityBatch(
        batchInfo: Contracts.IdentityBatchInfo
        ): IPromise<Contracts.Identity[]> {

        return this._beginRequest<Contracts.Identity[]>({
            httpMethod: "POST",
            area: "IMS",
            locationId: "299e50df-fe45-4d3a-8b5b-a5836fac74dc",
            resource: "IdentityBatch",
            routeTemplate: "_apis/{resource}",
            requestType: Contracts.TypeInfo.IdentityBatchInfo,
            responseIsCollection: true,
            apiVersion: this.identityBatchApiVersion,
            data: batchInfo
        });
    }

    /**
     * @param {Contracts.FrameworkIdentityInfo} frameworkIdentityInfo
     * @return IPromise<Contracts.Identity>
     */
    public createIdentity(
        frameworkIdentityInfo: Contracts.FrameworkIdentityInfo
        ): IPromise<Contracts.Identity> {

        return this._beginRequest<Contracts.Identity>({
            httpMethod: "PUT",
            area: "IMS",
            locationId: "dd55f0eb-6ea2-4fe4-9ebe-919e7dd1dfb4",
            resource: "Identity",
            routeTemplate: "_apis/identities/{resource}",
            requestType: Contracts.TypeInfo.FrameworkIdentityInfo,
            apiVersion: this.identityApiVersion,
            data: frameworkIdentityInfo
        });
    }

    /**
     * @param {Contracts.Identity} identity
     * @param {string} identityId
     * @return IPromise<void>
     */
    public updateIdentity(
        identity: Contracts.Identity,
        identityId: string
        ): IPromise<void> {

        return this._beginRequest<void>({
            httpMethod: "PUT",
            httpResponseType: "html",
            area: "IMS",
            locationId: "28010c54-d0c0-4c89-a5b0-1c9e188b9fb7",
            resource: "Identities",
            routeTemplate: "_apis/{resource}/{identityId}",
            routeValues: {
                identityId: identityId
            },
            apiVersion: this.identitiesApiVersion,
            data: identity
        });
    }

    /**
     * @param {VSS_Common_Contracts.VssJsonCollectionWrapperV<Contracts.Identity[]>} identities
     * @return IPromise<Contracts.IdentityUpdateData[]>
     */
    public updateIdentities(
        identities: VSS_Common_Contracts.VssJsonCollectionWrapperV<Contracts.Identity[]>
        ): IPromise<Contracts.IdentityUpdateData[]> {

        return this._beginRequest<Contracts.IdentityUpdateData[]>({
            httpMethod: "PUT",
            area: "IMS",
            locationId: "28010c54-d0c0-4c89-a5b0-1c9e188b9fb7",
            resource: "Identities",
            routeTemplate: "_apis/{resource}/{identityId}",
            responseIsCollection: true,
            apiVersion: this.identitiesApiVersion,
            data: identities
        });
    }

    /**
     * @param {string} identityId
     * @param {Contracts.QueryMembership} queryMembership
     * @param {string} properties
     * @return IPromise<Contracts.Identity>
     */
    public readIdentity(
        identityId: string,
        queryMembership?: Contracts.QueryMembership,
        properties?: string
        ): IPromise<Contracts.Identity> {

        const queryValues: any = {
            queryMembership: queryMembership,
            properties: properties
        };

        return this._beginRequest<Contracts.Identity>({
            httpMethod: "GET",
            area: "IMS",
            locationId: "28010c54-d0c0-4c89-a5b0-1c9e188b9fb7",
            resource: "Identities",
            routeTemplate: "_apis/{resource}/{identityId}",
            routeValues: {
                identityId: identityId
            },
            queryParams: queryValues,
            apiVersion: this.identitiesApiVersion
        });
    }

    /**
     * @param {string} scopeId
     * @param {Contracts.QueryMembership} queryMembership
     * @param {string} properties
     * @return IPromise<Contracts.Identity[]>
     */
    public readIdentitiesByScope(
        scopeId: string,
        queryMembership?: Contracts.QueryMembership,
        properties?: string
        ): IPromise<Contracts.Identity[]> {

        const queryValues: any = {
            scopeId: scopeId,
            queryMembership: queryMembership,
            properties: properties
        };

        return this._beginRequest<Contracts.Identity[]>({
            httpMethod: "GET",
            area: "IMS",
            locationId: "28010c54-d0c0-4c89-a5b0-1c9e188b9fb7",
            resource: "Identities",
            routeTemplate: "_apis/{resource}/{identityId}",
            responseIsCollection: true,
            queryParams: queryValues,
            apiVersion: this.identitiesApiVersion
        });
    }

    /**
     * @param {string} descriptors
     * @param {string} identityIds
     * @param {string} subjectDescriptors
     * @param {string} searchFilter
     * @param {string} filterValue
     * @param {Contracts.QueryMembership} queryMembership
     * @param {string} properties
     * @param {boolean} includeRestrictedVisibility
     * @param {Contracts.ReadIdentitiesOptions} options
     * @return IPromise<Contracts.Identity[]>
     */
    public readIdentities(
        descriptors?: string,
        identityIds?: string,
        subjectDescriptors?: string,
        searchFilter?: string,
        filterValue?: string,
        queryMembership?: Contracts.QueryMembership,
        properties?: string,
        includeRestrictedVisibility?: boolean,
        options?: Contracts.ReadIdentitiesOptions
        ): IPromise<Contracts.Identity[]> {

        const queryValues: any = {
            descriptors: descriptors,
            identityIds: identityIds,
            subjectDescriptors: subjectDescriptors,
            searchFilter: searchFilter,
            filterValue: filterValue,
            queryMembership: queryMembership,
            properties: properties,
            includeRestrictedVisibility: includeRestrictedVisibility,
            options: options
        };

        return this._beginRequest<Contracts.Identity[]>({
            httpMethod: "GET",
            area: "IMS",
            locationId: "28010c54-d0c0-4c89-a5b0-1c9e188b9fb7",
            resource: "Identities",
            routeTemplate: "_apis/{resource}/{identityId}",
            responseIsCollection: true,
            queryParams: queryValues,
            apiVersion: this.identitiesApiVersion
        });
    }

    /**
     * @param {string} domainId
     * @return IPromise<string[]>
     */
    public getUserIdentityIdsByDomainId(
        domainId: string
        ): IPromise<string[]> {

        const queryValues: any = {
            domainId: domainId
        };

        return this._beginRequest<string[]>({
            httpMethod: "GET",
            area: "IMS",
            locationId: "28010c54-d0c0-4c89-a5b0-1c9e188b9fb7",
            resource: "Identities",
            routeTemplate: "_apis/{resource}/{identityId}",
            responseIsCollection: true,
            queryParams: queryValues,
            apiVersion: this.identitiesApiVersion
        });
    }

    /**
     * @param {number} identitySequenceId
     * @param {number} groupSequenceId
     * @param {number} organizationIdentitySequenceId
     * @param {number} pageSize
     * @param {string} scopeId
     * @return IPromise<Contracts.ChangedIdentities>
     */
    public getIdentityChanges(
        identitySequenceId: number,
        groupSequenceId: number,
        organizationIdentitySequenceId?: number,
        pageSize?: number,
        scopeId?: string
        ): IPromise<Contracts.ChangedIdentities> {

        const queryValues: any = {
            identitySequenceId: identitySequenceId,
            groupSequenceId: groupSequenceId,
            organizationIdentitySequenceId: organizationIdentitySequenceId,
            pageSize: pageSize,
            scopeId: scopeId
        };

        return this._beginRequest<Contracts.ChangedIdentities>({
            httpMethod: "GET",
            area: "IMS",
            locationId: "28010c54-d0c0-4c89-a5b0-1c9e188b9fb7",
            resource: "Identities",
            routeTemplate: "_apis/{resource}/{identityId}",
            queryParams: queryValues,
            apiVersion: this.identitiesApiVersion
        });
    }

    /**
     * @param {string} scopeIds
     * @param {boolean} recurse
     * @param {boolean} deleted
     * @param {string} properties
     * @return IPromise<Contracts.Identity[]>
     */
    public listGroups(
        scopeIds?: string,
        recurse?: boolean,
        deleted?: boolean,
        properties?: string
        ): IPromise<Contracts.Identity[]> {

        const queryValues: any = {
            scopeIds: scopeIds,
            recurse: recurse,
            deleted: deleted,
            properties: properties
        };

        return this._beginRequest<Contracts.Identity[]>({
            httpMethod: "GET",
            area: "IMS",
            locationId: "5966283b-4196-4d57-9211-1b68f41ec1c2",
            resource: "Groups",
            routeTemplate: "_apis/{resource}/{groupId}",
            responseIsCollection: true,
            queryParams: queryValues,
            apiVersion: this.groupsApiVersion
        });
    }

    /**
     * @param {string} groupId
     * @return IPromise<void>
     */
    public deleteGroup(
        groupId: string
        ): IPromise<void> {

        return this._beginRequest<void>({
            httpMethod: "DELETE",
            httpResponseType: "html",
            area: "IMS",
            locationId: "5966283b-4196-4d57-9211-1b68f41ec1c2",
            resource: "Groups",
            routeTemplate: "_apis/{resource}/{groupId}",
            routeValues: {
                groupId: groupId
            },
            apiVersion: this.groupsApiVersion
        });
    }

    /**
     * @param {any} container
     * @return IPromise<Contracts.Identity[]>
     */
    public createGroups(
        container: any
        ): IPromise<Contracts.Identity[]> {

        return this._beginRequest<Contracts.Identity[]>({
            httpMethod: "POST",
            area: "IMS",
            locationId: "5966283b-4196-4d57-9211-1b68f41ec1c2",
            resource: "Groups",
            routeTemplate: "_apis/{resource}/{groupId}",
            responseIsCollection: true,
            apiVersion: this.groupsApiVersion,
            data: container
        });
    }

    /**
     * @exemptedapi
     * [Preview API]
     *
     * @param {string} id
     * @param {boolean} isMasterId
     * @return IPromise<Contracts.IdentityDescriptor>
     */
    public getDescriptorById(
        id: string,
        isMasterId?: boolean
        ): IPromise<Contracts.IdentityDescriptor> {

        const queryValues: any = {
            isMasterId: isMasterId
        };

        return this._beginRequest<Contracts.IdentityDescriptor>({
            httpMethod: "GET",
            area: "IMS",
            locationId: "a230389a-94f2-496c-839f-c929787496dd",
            resource: "descriptors",
            routeTemplate: "_apis/identities/{resource}/{id}",
            routeValues: {
                id: id
            },
            queryParams: queryValues,
            apiVersion: this.descriptorsApiVersion
        });
    }

    /**
     * @exemptedapi
     * [Preview API]
     *
     * @param {Contracts.Identity} sourceIdentity
     * @return IPromise<Contracts.Identity>
     */
    public createOrBindWithClaims(
        sourceIdentity: Contracts.Identity
        ): IPromise<Contracts.Identity> {

        return this._beginRequest<Contracts.Identity>({
            httpMethod: "PUT",
            area: "IMS",
            locationId: "90ddfe71-171c-446c-bf3b-b597cd562afd",
            resource: "Claims",
            routeTemplate: "_apis/identities/{resource}",
            apiVersion: this.claimsApiVersion,
            data: sourceIdentity
        });
    }
}

/**
 * @exemptedapi
 */
export class IdentitiesHttpClient5 extends CommonMethods2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.groupsApiVersion =
        this.identitiesApiVersion =
        this.identityApiVersion =
        this.maxSequenceIdApiVersion =
        this.meApiVersion = "5.0";
        this.claimsApiVersion =
        this.descriptorsApiVersion =
        this.identityBatchApiVersion =
        this.identitySnapshotApiVersion =
        this.membersApiVersion =
        this.membersOfApiVersion =
        this.signedInTokenApiVersion =
        this.signoutTokenApiVersion =
        this.swapApiVersion =
        this.tenantApiVersion = "5.0-preview.1";
        this.scopesApiVersion = "5.0-preview.2";
    }

    /**
     * [Preview API]
     *
     * @param {VSS_Common_Contracts.JsonPatchDocument} patchDocument
     * @param {string} scopeId
     * @return IPromise<void>
     */
    public updateScope(
        patchDocument: VSS_Common_Contracts.JsonPatchDocument,
        scopeId: string
        ): IPromise<void> {

        return this._beginRequest<void>({
            httpMethod: "PATCH",
            httpResponseType: "html",
            area: "IMS",
            locationId: "4e11e2bf-1e79-4eb5-8f34-a6337bd0de38",
            resource: "Scopes",
            routeTemplate: "_apis/{resource}/{scopeId}",
            routeValues: {
                scopeId: scopeId
            },
            customHeaders: {
                "Content-Type": "application/json-patch+json",
            },
            apiVersion: "5.0-preview.2",
            data: patchDocument
        });
    }
}

/**
 * @exemptedapi
 */
export class IdentitiesHttpClient4_1 extends CommonMethods2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.groupsApiVersion =
        this.identitiesApiVersion =
        this.identityApiVersion =
        this.maxSequenceIdApiVersion =
        this.meApiVersion = "4.1";
        this.claimsApiVersion =
        this.descriptorsApiVersion =
        this.identityBatchApiVersion =
        this.identitySnapshotApiVersion =
        this.membersApiVersion =
        this.membersOfApiVersion =
        this.scopesApiVersion =
        this.signedInTokenApiVersion =
        this.signoutTokenApiVersion =
        this.swapApiVersion =
        this.tenantApiVersion = "4.1-preview.1";
    }

    /**
     * [Preview API]
     *
     * @param {Contracts.IdentityScope} renameScope
     * @param {string} scopeId
     * @return IPromise<void>
     */
    public renameScope(
        renameScope: Contracts.IdentityScope,
        scopeId: string
        ): IPromise<void> {

        return this._beginRequest<void>({
            httpMethod: "PATCH",
            httpResponseType: "html",
            area: "IMS",
            locationId: "4e11e2bf-1e79-4eb5-8f34-a6337bd0de38",
            resource: "Scopes",
            routeTemplate: "_apis/{resource}/{scopeId}",
            requestType: Contracts.TypeInfo.IdentityScope,
            routeValues: {
                scopeId: scopeId
            },
            apiVersion: "4.1-preview.1",
            data: renameScope
        });
    }
}

/**
 * @exemptedapi
 */
export class IdentitiesHttpClient4 extends CommonMethods2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.groupsApiVersion =
        this.identitiesApiVersion =
        this.identityApiVersion =
        this.maxSequenceIdApiVersion =
        this.meApiVersion = "4.0";
        this.claimsApiVersion =
        this.descriptorsApiVersion =
        this.identityBatchApiVersion =
        this.identitySnapshotApiVersion =
        this.membersApiVersion =
        this.membersOfApiVersion =
        this.scopesApiVersion =
        this.signedInTokenApiVersion =
        this.signoutTokenApiVersion =
        this.swapApiVersion =
        this.tenantApiVersion = "4.0-preview.1";
    }

    /**
     * [Preview API]
     *
     * @param {Contracts.IdentityScope} renameScope
     * @param {string} scopeId
     * @return IPromise<void>
     */
    public renameScope(
        renameScope: Contracts.IdentityScope,
        scopeId: string
        ): IPromise<void> {

        return this._beginRequest<void>({
            httpMethod: "PATCH",
            httpResponseType: "html",
            area: "IMS",
            locationId: "4e11e2bf-1e79-4eb5-8f34-a6337bd0de38",
            resource: "Scopes",
            routeTemplate: "_apis/{resource}/{scopeId}",
            requestType: Contracts.TypeInfo.IdentityScope,
            routeValues: {
                scopeId: scopeId
            },
            apiVersion: "4.0-preview.1",
            data: renameScope
        });
    }
}

/**
 * @exemptedapi
 */
export class IdentitiesHttpClient3_2 extends CommonMethods2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.groupsApiVersion =
        this.identitiesApiVersion =
        this.identityApiVersion =
        this.maxSequenceIdApiVersion =
        this.meApiVersion = "3.2";
        this.claimsApiVersion =
        this.descriptorsApiVersion =
        this.identityBatchApiVersion =
        this.identitySnapshotApiVersion =
        this.membersApiVersion =
        this.membersOfApiVersion =
        this.scopesApiVersion =
        this.signedInTokenApiVersion =
        this.signoutTokenApiVersion =
        this.swapApiVersion =
        this.tenantApiVersion = "3.2-preview.1";
    }

    /**
     * [Preview API]
     *
     * @param {Contracts.IdentityScope} renameScope
     * @param {string} scopeId
     * @return IPromise<void>
     */
    public renameScope(
        renameScope: Contracts.IdentityScope,
        scopeId: string
        ): IPromise<void> {

        return this._beginRequest<void>({
            httpMethod: "PATCH",
            httpResponseType: "html",
            area: "IMS",
            locationId: "4e11e2bf-1e79-4eb5-8f34-a6337bd0de38",
            resource: "Scopes",
            routeTemplate: "_apis/{resource}/{scopeId}",
            requestType: Contracts.TypeInfo.IdentityScope,
            routeValues: {
                scopeId: scopeId
            },
            apiVersion: "3.2-preview.1",
            data: renameScope
        });
    }
}

/**
 * @exemptedapi
 */
export class IdentitiesHttpClient3_1 extends CommonMethods2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.groupsApiVersion =
        this.identitiesApiVersion =
        this.identityApiVersion =
        this.maxSequenceIdApiVersion =
        this.meApiVersion = "3.1";
        this.claimsApiVersion =
        this.descriptorsApiVersion =
        this.identityBatchApiVersion =
        this.identitySnapshotApiVersion =
        this.membersApiVersion =
        this.membersOfApiVersion =
        this.scopesApiVersion =
        this.signedInTokenApiVersion =
        this.signoutTokenApiVersion =
        this.swapApiVersion =
        this.tenantApiVersion = "3.1-preview.1";
    }

    /**
     * [Preview API]
     *
     * @param {Contracts.IdentityScope} renameScope
     * @param {string} scopeId
     * @return IPromise<void>
     */
    public renameScope(
        renameScope: Contracts.IdentityScope,
        scopeId: string
        ): IPromise<void> {

        return this._beginRequest<void>({
            httpMethod: "PATCH",
            httpResponseType: "html",
            area: "IMS",
            locationId: "4e11e2bf-1e79-4eb5-8f34-a6337bd0de38",
            resource: "Scopes",
            routeTemplate: "_apis/{resource}/{scopeId}",
            requestType: Contracts.TypeInfo.IdentityScope,
            routeValues: {
                scopeId: scopeId
            },
            apiVersion: "3.1-preview.1",
            data: renameScope
        });
    }
}

/**
 * @exemptedapi
 */
export class IdentitiesHttpClient3 extends CommonMethods2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.groupsApiVersion =
        this.identitiesApiVersion =
        this.identityApiVersion =
        this.maxSequenceIdApiVersion =
        this.meApiVersion = "3.0";
        this.claimsApiVersion =
        this.descriptorsApiVersion =
        this.identityBatchApiVersion =
        this.identitySnapshotApiVersion =
        this.membersApiVersion =
        this.membersOfApiVersion =
        this.scopesApiVersion =
        this.signedInTokenApiVersion =
        this.signoutTokenApiVersion =
        this.swapApiVersion =
        this.tenantApiVersion = "3.0-preview.1";
    }

    /**
     * [Preview API]
     *
     * @param {Contracts.IdentityScope} renameScope
     * @param {string} scopeId
     * @return IPromise<void>
     */
    public renameScope(
        renameScope: Contracts.IdentityScope,
        scopeId: string
        ): IPromise<void> {

        return this._beginRequest<void>({
            httpMethod: "PATCH",
            httpResponseType: "html",
            area: "IMS",
            locationId: "4e11e2bf-1e79-4eb5-8f34-a6337bd0de38",
            resource: "Scopes",
            routeTemplate: "_apis/{resource}/{scopeId}",
            requestType: Contracts.TypeInfo.IdentityScope,
            routeValues: {
                scopeId: scopeId
            },
            apiVersion: "3.0-preview.1",
            data: renameScope
        });
    }
}

/**
 * @exemptedapi
 */
export class IdentitiesHttpClient2_3 extends CommonMethods2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.groupsApiVersion =
        this.identitiesApiVersion =
        this.identityApiVersion =
        this.maxSequenceIdApiVersion =
        this.meApiVersion = "2.3";
        this.claimsApiVersion =
        this.descriptorsApiVersion =
        this.identityBatchApiVersion =
        this.identitySnapshotApiVersion =
        this.membersApiVersion =
        this.membersOfApiVersion =
        this.scopesApiVersion =
        this.signedInTokenApiVersion =
        this.signoutTokenApiVersion =
        this.swapApiVersion =
        this.tenantApiVersion = "2.3-preview.1";
    }

    /**
     * [Preview API]
     *
     * @param {Contracts.IdentityScope} renameScope
     * @param {string} scopeId
     * @return IPromise<void>
     */
    public renameScope(
        renameScope: Contracts.IdentityScope,
        scopeId: string
        ): IPromise<void> {

        return this._beginRequest<void>({
            httpMethod: "PATCH",
            httpResponseType: "html",
            area: "IMS",
            locationId: "4e11e2bf-1e79-4eb5-8f34-a6337bd0de38",
            resource: "Scopes",
            routeTemplate: "_apis/{resource}/{scopeId}",
            requestType: Contracts.TypeInfo.IdentityScope,
            routeValues: {
                scopeId: scopeId
            },
            apiVersion: "2.3-preview.1",
            data: renameScope
        });
    }
}

/**
 * @exemptedapi
 */
export class IdentitiesHttpClient2_2 extends CommonMethods2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.groupsApiVersion =
        this.identitiesApiVersion =
        this.identityApiVersion =
        this.maxSequenceIdApiVersion =
        this.meApiVersion = "2.2";
        this.claimsApiVersion =
        this.descriptorsApiVersion =
        this.identityBatchApiVersion =
        this.identitySnapshotApiVersion =
        this.membersApiVersion =
        this.membersOfApiVersion =
        this.scopesApiVersion =
        this.signedInTokenApiVersion =
        this.signoutTokenApiVersion =
        this.swapApiVersion =
        this.tenantApiVersion = "2.2-preview.1";
    }

    /**
     * [Preview API]
     *
     * @param {Contracts.IdentityScope} renameScope
     * @param {string} scopeId
     * @return IPromise<void>
     */
    public renameScope(
        renameScope: Contracts.IdentityScope,
        scopeId: string
        ): IPromise<void> {

        return this._beginRequest<void>({
            httpMethod: "PATCH",
            httpResponseType: "html",
            area: "IMS",
            locationId: "4e11e2bf-1e79-4eb5-8f34-a6337bd0de38",
            resource: "Scopes",
            routeTemplate: "_apis/{resource}/{scopeId}",
            requestType: Contracts.TypeInfo.IdentityScope,
            routeValues: {
                scopeId: scopeId
            },
            apiVersion: "2.2-preview.1",
            data: renameScope
        });
    }
}

/**
 * @exemptedapi
 */
export class IdentitiesHttpClient2_1 extends CommonMethods2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.groupsApiVersion =
        this.identitiesApiVersion =
        this.identityApiVersion =
        this.maxSequenceIdApiVersion =
        this.meApiVersion = "2.1";
        this.claimsApiVersion =
        this.descriptorsApiVersion =
        this.identityBatchApiVersion =
        this.identitySnapshotApiVersion =
        this.membersApiVersion =
        this.membersOfApiVersion =
        this.scopesApiVersion =
        this.signedInTokenApiVersion =
        this.signoutTokenApiVersion =
        this.swapApiVersion =
        this.tenantApiVersion = "2.1-preview.1";
    }

    /**
     * [Preview API]
     *
     * @param {Contracts.IdentityScope} renameScope
     * @param {string} scopeId
     * @return IPromise<void>
     */
    public renameScope(
        renameScope: Contracts.IdentityScope,
        scopeId: string
        ): IPromise<void> {

        return this._beginRequest<void>({
            httpMethod: "PATCH",
            httpResponseType: "html",
            area: "IMS",
            locationId: "4e11e2bf-1e79-4eb5-8f34-a6337bd0de38",
            resource: "Scopes",
            routeTemplate: "_apis/{resource}/{scopeId}",
            requestType: Contracts.TypeInfo.IdentityScope,
            routeValues: {
                scopeId: scopeId
            },
            apiVersion: "2.1-preview.1",
            data: renameScope
        });
    }
}

/**
 * @exemptedapi
 */
export class IdentitiesHttpClient2 extends CommonMethods2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.groupsApiVersion =
        this.identitiesApiVersion =
        this.identityApiVersion =
        this.maxSequenceIdApiVersion =
        this.meApiVersion = "2.0";
        this.claimsApiVersion =
        this.descriptorsApiVersion =
        this.identityBatchApiVersion =
        this.identitySnapshotApiVersion =
        this.membersApiVersion =
        this.membersOfApiVersion =
        this.scopesApiVersion =
        this.signedInTokenApiVersion =
        this.signoutTokenApiVersion =
        this.swapApiVersion =
        this.tenantApiVersion = "2.0-preview.1";
    }

    /**
     * [Preview API]
     *
     * @param {Contracts.IdentityScope} renameScope
     * @param {string} scopeId
     * @return IPromise<void>
     */
    public renameScope(
        renameScope: Contracts.IdentityScope,
        scopeId: string
        ): IPromise<void> {

        return this._beginRequest<void>({
            httpMethod: "PATCH",
            httpResponseType: "html",
            area: "IMS",
            locationId: "4e11e2bf-1e79-4eb5-8f34-a6337bd0de38",
            resource: "Scopes",
            routeTemplate: "_apis/{resource}/{scopeId}",
            requestType: Contracts.TypeInfo.IdentityScope,
            routeValues: {
                scopeId: scopeId
            },
            apiVersion: "2.0-preview.1",
            data: renameScope
        });
    }
}

export class IdentitiesHttpClient extends IdentitiesHttpClient5 {
    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
    }
}

const clientMapping: { [id: string]: new (routeRequestPath: string) => VSS_WebApi.VssHttpClient; } = {
    "5.0": IdentitiesHttpClient5,
    "4.1": IdentitiesHttpClient4_1,
    "4.0": IdentitiesHttpClient4,
    "3.2": IdentitiesHttpClient3_2,
    "3.1": IdentitiesHttpClient3_1,
    "3.0": IdentitiesHttpClient3,
    "2.3": IdentitiesHttpClient2_3,
    "2.2": IdentitiesHttpClient2_2,
    "2.1": IdentitiesHttpClient2_1,
    "2.0": IdentitiesHttpClient2
}

/**
 * Gets an http client targeting the latest released version of the APIs.
 *
 * @return IdentitiesHttpClient5
 */
export function getClient(options?: VSS_WebApi.IVssHttpClientOptions): IdentitiesHttpClient5 {
    if ((<any>window).VSS && (<any>window).VSS.VssSDKRestVersion && clientMapping[(<any>window).VSS.VssSDKRestVersion]) {
        return VSS_Service.getClient<IdentitiesHttpClient5>(<any>(clientMapping[(<any>window).VSS.VssSDKRestVersion]), undefined, undefined, undefined, options);
    }
    else {
        return VSS_Service.getClient<IdentitiesHttpClient5>(IdentitiesHttpClient5, undefined, undefined, undefined, options);
    }
}
