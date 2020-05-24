/**
 * ---------------------------------------------------------
 * Generated file, DO NOT EDIT
 * ---------------------------------------------------------
 *
 * See following wiki page for instructions on how to regenerate:
 *   https://aka.ms/azure-devops-client-generation
 *
 * Configuration file:
 *   vssf\client\webapi\httpclients\clientgeneratorconfigs\graph.genclient.json
 */

"use strict";

import Contracts = require("VSS/Graph/Contracts");
import VSS_Common_Contracts = require("VSS/WebApi/Contracts");
import VSS_Service = require("VSS/Service");
import VSS_WebApi = require("VSS/WebApi/RestClient");

export class CommonMethods3_1To5 extends VSS_WebApi.VssHttpClient {
    protected descriptorsApiVersion: string;

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
    }

    /**
     * [Preview API] Resolve a storage key to a descriptor
     *
     * @param {string} storageKey - Storage key of the subject (user, group, scope, etc.) to resolve
     * @return IPromise<Contracts.GraphDescriptorResult>
     */
    public getDescriptor(
        storageKey: string
        ): IPromise<Contracts.GraphDescriptorResult> {

        return this._beginRequest<Contracts.GraphDescriptorResult>({
            httpMethod: "GET",
            area: "Graph",
            locationId: "048aee0a-7072-4cde-ab73-7af77b1e0b4e",
            resource: "Descriptors",
            routeTemplate: "_apis/{area}/{resource}/{storageKey}",
            routeValues: {
                storageKey: storageKey
            },
            apiVersion: this.descriptorsApiVersion
        });
    }
}

export class CommonMethods3_2To5 extends CommonMethods3_1To5 {
    protected cachePoliciesApiVersion: string;
    protected graphGlobalExtendedPropertyBatchApiVersion: string;
    protected groupsApiVersion: string;
    protected memberLookupApiVersion: string;
    protected membersApiVersion: string;
    protected membersApiVersion_42939f1e: string;
    protected membersApiVersion_8b9ecdb2: string;
    protected membershipsApiVersion: string;
    protected membershipsBatchApiVersion: string;
    protected membershipStatesApiVersion: string;
    protected membershipTraversalsApiVersion: string;
    protected scopesApiVersion: string;
    protected shardingStateApiVersion: string;
    protected storageKeysApiVersion: string;
    protected subjectLookupApiVersion: string;
    protected subjectsApiVersion: string;
    protected usersApiVersion: string;

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
    }

    /**
     * [Preview API] Get a list of all users in a given scope.
     *
     * @param {string[]} subjectTypes - A comma separated list of user subject subtypes to reduce the retrieved results, e.g. msa’, ‘aad’, ‘svc’ (service identity), ‘imp’ (imported identity), etc.
     * @param {string} continuationToken - An opaque data blob that allows the next page of data to resume immediately after where the previous page ended. The only reliable way to know if there is more data left is the presence of a continuation token.
     * @return IPromise<Contracts.PagedGraphUsers>
     */
    public listUsers(
        subjectTypes?: string[],
        continuationToken?: string
        ): IPromise<Contracts.PagedGraphUsers> {

        const queryValues: any = {
            subjectTypes: subjectTypes && subjectTypes.join(","),
            continuationToken: continuationToken
        };

        return this._beginRequest<[any, string, JQueryXHR]>({
            httpMethod: "GET",
            area: "Graph",
            locationId: "005e26ec-6b77-4e4f-a986-b3827bf241f5",
            resource: "Users",
            routeTemplate: "_apis/{area}/{resource}/{userDescriptor}",
            responseType: Contracts.TypeInfo.GraphUser,
            responseIsCollection: true,
            queryParams: queryValues,
            apiVersion: this.usersApiVersion
        }, true).then(([data, textStatus, jqXHR]) => {
            const continuationTokenHeader = jqXHR.getResponseHeader("X-MS-ContinuationToken");
            return {
                graphUsers: data,
                continuationToken: continuationTokenHeader ? continuationTokenHeader.split(',') : []
            };
        });
    }

    /**
     * [Preview API] Get a user by its descriptor.
     *
     * @param {string} userDescriptor - The descriptor of the desired user.
     * @return IPromise<Contracts.GraphUser>
     */
    public getUser(
        userDescriptor: string
        ): IPromise<Contracts.GraphUser> {

        return this._beginRequest<Contracts.GraphUser>({
            httpMethod: "GET",
            area: "Graph",
            locationId: "005e26ec-6b77-4e4f-a986-b3827bf241f5",
            resource: "Users",
            routeTemplate: "_apis/{area}/{resource}/{userDescriptor}",
            responseType: Contracts.TypeInfo.GraphUser,
            routeValues: {
                userDescriptor: userDescriptor
            },
            apiVersion: this.usersApiVersion
        });
    }

    /**
     * @internal
     * [Preview API]
     *
     * @param {string} cuidBasedUserLegacyDescriptor
     * @return IPromise<Contracts.GraphUser>
     */
    public getCuidBasedUserByLegacyDescriptor(
        cuidBasedUserLegacyDescriptor: string
        ): IPromise<Contracts.GraphUser> {

        const queryValues: any = {
            cuidBasedUserLegacyDescriptor: cuidBasedUserLegacyDescriptor
        };

        return this._beginRequest<Contracts.GraphUser>({
            httpMethod: "GET",
            area: "Graph",
            locationId: "005e26ec-6b77-4e4f-a986-b3827bf241f5",
            resource: "Users",
            routeTemplate: "_apis/{area}/{resource}/{userDescriptor}",
            responseType: Contracts.TypeInfo.GraphUser,
            queryParams: queryValues,
            apiVersion: this.usersApiVersion
        });
    }

    /**
     * @internal
     * [Preview API] This endpoint returns a result for any user that has ever been valid in the system, even if the user has since been deleted or has had all their memberships deleted. The current validity of the user is indicated through its disabled property, which is omitted when false.
     *
     * @param {Contracts.GraphMemberSearchFactor} searchFactor - The search factor for what it is that you are searching for
     * @param {string} searchValue - The value of the search factor
     * @param {boolean} forceDomainQualification - In cases that you are searching for principle name, this parameter will specify that system should force the principle name being domain qualified
     * @return IPromise<Contracts.GraphUser[]>
     */
    public findUsersBySearchFactor(
        searchFactor: Contracts.GraphMemberSearchFactor,
        searchValue?: string,
        forceDomainQualification?: boolean
        ): IPromise<Contracts.GraphUser[]> {

        const queryValues: any = {
            searchFactor: searchFactor,
            searchValue: searchValue,
            forceDomainQualification: forceDomainQualification
        };

        return this._beginRequest<Contracts.GraphUser[]>({
            httpMethod: "GET",
            area: "Graph",
            locationId: "005e26ec-6b77-4e4f-a986-b3827bf241f5",
            resource: "Users",
            routeTemplate: "_apis/{area}/{resource}/{userDescriptor}",
            responseType: Contracts.TypeInfo.GraphUser,
            responseIsCollection: true,
            queryParams: queryValues,
            apiVersion: this.usersApiVersion
        });
    }

    /**
     * [Preview API] Disables a user.
     *
     * @param {string} userDescriptor - The descriptor of the user to delete.
     * @return IPromise<void>
     */
    public deleteUser(
        userDescriptor: string
        ): IPromise<void> {

        return this._beginRequest<void>({
            httpMethod: "DELETE",
            httpResponseType: "html",
            area: "Graph",
            locationId: "005e26ec-6b77-4e4f-a986-b3827bf241f5",
            resource: "Users",
            routeTemplate: "_apis/{area}/{resource}/{userDescriptor}",
            routeValues: {
                userDescriptor: userDescriptor
            },
            apiVersion: this.usersApiVersion
        });
    }

    /**
     * [Preview API] Materialize an existing AAD or MSA user into the VSTS account.
     *
     * @param {Contracts.GraphUserCreationContext} creationContext - The subset of the full graph user used to uniquely find the graph subject in an external provider.
     * @param {string[]} groupDescriptors - A comma separated list of descriptors of groups you want the graph user to join
     * @return IPromise<Contracts.GraphUser>
     */
    public createUser(
        creationContext: Contracts.GraphUserCreationContext,
        groupDescriptors?: string[]
        ): IPromise<Contracts.GraphUser> {

        const queryValues: any = {
            groupDescriptors: groupDescriptors && groupDescriptors.join(",")
        };

        return this._beginRequest<Contracts.GraphUser>({
            httpMethod: "POST",
            area: "Graph",
            locationId: "005e26ec-6b77-4e4f-a986-b3827bf241f5",
            resource: "Users",
            routeTemplate: "_apis/{area}/{resource}/{userDescriptor}",
            responseType: Contracts.TypeInfo.GraphUser,
            queryParams: queryValues,
            apiVersion: this.usersApiVersion,
            data: creationContext
        });
    }

    /**
     * @internal
     * [Preview API]
     *
     * @param {string} subjectDescriptor
     * @return IPromise<Contracts.GraphSubject>
     */
    public getSubject(
        subjectDescriptor: string
        ): IPromise<Contracts.GraphSubject> {

        return this._beginRequest<Contracts.GraphSubject>({
            httpMethod: "GET",
            area: "Graph",
            locationId: "1d44a2ac-4f8a-459e-83c2-1c92626fb9c6",
            resource: "Subjects",
            routeTemplate: "_apis/{area}/{resource}/{subjectDescriptor}",
            routeValues: {
                subjectDescriptor: subjectDescriptor
            },
            apiVersion: this.subjectsApiVersion
        });
    }

    /**
     * [Preview API] Resolve descriptors to users, groups or scopes (Subjects) in a batch.
     *
     * @param {Contracts.GraphSubjectLookup} subjectLookup - A list of descriptors that specifies a subset of subjects to retrieve. Each descriptor uniquely identifies the subject across all instance scopes, but only at a single point in time.
     * @return IPromise<{ [key: string] : Contracts.GraphSubject; }>
     */
    public lookupSubjects(
        subjectLookup: Contracts.GraphSubjectLookup
        ): IPromise<{ [key: string] : Contracts.GraphSubject; }> {

        return this._beginRequest<{ [key: string] : Contracts.GraphSubject; }>({
            httpMethod: "POST",
            area: "Graph",
            locationId: "4dd4d168-11f2-48c4-83e8-756fa0de027c",
            resource: "SubjectLookup",
            routeTemplate: "_apis/{area}/{resource}",
            responseIsCollection: true,
            apiVersion: this.subjectLookupApiVersion,
            data: subjectLookup
        });
    }

    /**
     * [Preview API] Resolve a descriptor to a storage key.
     *
     * @param {string} subjectDescriptor
     * @return IPromise<Contracts.GraphStorageKeyResult>
     */
    public getStorageKey(
        subjectDescriptor: string
        ): IPromise<Contracts.GraphStorageKeyResult> {

        return this._beginRequest<Contracts.GraphStorageKeyResult>({
            httpMethod: "GET",
            area: "Graph",
            locationId: "eb85f8cc-f0f6-4264-a5b1-ffe2e4d4801f",
            resource: "StorageKeys",
            routeTemplate: "_apis/{area}/{resource}/{subjectDescriptor}",
            routeValues: {
                subjectDescriptor: subjectDescriptor
            },
            apiVersion: this.storageKeysApiVersion
        });
    }

    /**
     * @internal
     * [Preview API]
     *
     * @return IPromise<Contracts.IdentityShardingState>
     */
    public getIdentityShardingState(): IPromise<Contracts.IdentityShardingState> {

        return this._beginRequest<Contracts.IdentityShardingState>({
            httpMethod: "GET",
            area: "Graph",
            locationId: "706e2a05-eb8a-4417-b599-2713b5b3e0a6",
            resource: "ShardingState",
            routeTemplate: "_apis/{area}/{resource}",
            responseType: Contracts.TypeInfo.IdentityShardingState,
            apiVersion: this.shardingStateApiVersion
        });
    }

    /**
     * @internal
     * [Preview API]
     *
     * @param {string} scopeDescriptor
     * @param {VSS_Common_Contracts.JsonPatchDocument} patchDocument
     * @return IPromise<void>
     */
    public updateScope(
        scopeDescriptor: string,
        patchDocument: VSS_Common_Contracts.JsonPatchDocument
        ): IPromise<void> {

        return this._beginRequest<void>({
            httpMethod: "PATCH",
            httpResponseType: "html",
            area: "Graph",
            locationId: "21b5fea7-2513-41d0-af78-b8cdb0f328bb",
            resource: "Scopes",
            routeTemplate: "_apis/{area}/{resource}/{scopeDescriptor}",
            routeValues: {
                scopeDescriptor: scopeDescriptor
            },
            customHeaders: {
                "Content-Type": "application/json-patch+json",
            },
            apiVersion: this.scopesApiVersion,
            data: patchDocument
        });
    }

    /**
     * @internal
     * [Preview API] Get a scope identified by its descriptor
     *
     * @param {string} scopeDescriptor - A descriptor that uniquely identifies a scope.
     * @return IPromise<Contracts.GraphScope>
     */
    public getScope(
        scopeDescriptor: string
        ): IPromise<Contracts.GraphScope> {

        return this._beginRequest<Contracts.GraphScope>({
            httpMethod: "GET",
            area: "Graph",
            locationId: "21b5fea7-2513-41d0-af78-b8cdb0f328bb",
            resource: "Scopes",
            routeTemplate: "_apis/{area}/{resource}/{scopeDescriptor}",
            responseType: Contracts.TypeInfo.GraphScope,
            routeValues: {
                scopeDescriptor: scopeDescriptor
            },
            apiVersion: this.scopesApiVersion
        });
    }

    /**
     * @internal
     * [Preview API]
     *
     * @param {string} scopeDescriptor
     * @return IPromise<void>
     */
    public deleteScope(
        scopeDescriptor: string
        ): IPromise<void> {

        return this._beginRequest<void>({
            httpMethod: "DELETE",
            httpResponseType: "html",
            area: "Graph",
            locationId: "21b5fea7-2513-41d0-af78-b8cdb0f328bb",
            resource: "Scopes",
            routeTemplate: "_apis/{area}/{resource}/{scopeDescriptor}",
            routeValues: {
                scopeDescriptor: scopeDescriptor
            },
            apiVersion: this.scopesApiVersion
        });
    }

    /**
     * @internal
     * [Preview API]
     *
     * @param {Contracts.GraphScopeCreationContext} creationContext
     * @param {string} scopeDescriptor
     * @return IPromise<Contracts.GraphScope>
     */
    public createScope(
        creationContext: Contracts.GraphScopeCreationContext,
        scopeDescriptor?: string
        ): IPromise<Contracts.GraphScope> {

        return this._beginRequest<Contracts.GraphScope>({
            httpMethod: "POST",
            area: "Graph",
            locationId: "21b5fea7-2513-41d0-af78-b8cdb0f328bb",
            resource: "Scopes",
            routeTemplate: "_apis/{area}/{resource}/{scopeDescriptor}",
            requestType: Contracts.TypeInfo.GraphScopeCreationContext,
            responseType: Contracts.TypeInfo.GraphScope,
            routeValues: {
                scopeDescriptor: scopeDescriptor
            },
            apiVersion: this.scopesApiVersion,
            data: creationContext
        });
    }

    /**
     * @internal
     * [Preview API] Traverse memberships of the given subject descriptor.
     *
     * @param {string} subjectDescriptor - Fetch the descendants/ancestors of this descriptor depending on direction.
     * @param {Contracts.GraphTraversalDirection} direction - The default value is Unknown.
     * @param {number} depth - The default value is '1'.
     * @return IPromise<Contracts.GraphMembershipTraversal>
     */
    public traverseMemberships(
        subjectDescriptor: string,
        direction?: Contracts.GraphTraversalDirection,
        depth?: number
        ): IPromise<Contracts.GraphMembershipTraversal> {

        const queryValues: any = {
            direction: direction,
            depth: depth
        };

        return this._beginRequest<Contracts.GraphMembershipTraversal>({
            httpMethod: "GET",
            area: "Graph",
            locationId: "5d59d874-746f-4f9b-9459-0e571f1ded8c",
            resource: "MembershipTraversals",
            routeTemplate: "_apis/{area}/{resource}/{subjectDescriptor}",
            routeValues: {
                subjectDescriptor: subjectDescriptor
            },
            queryParams: queryValues,
            apiVersion: this.membershipTraversalsApiVersion
        });
    }

    /**
     * @internal
     * [Preview API] Traverse memberships of the given subject descriptors.
     *
     * @param {Contracts.GraphSubjectLookup} membershipTraversalLookup - Fetch the descendants/ancestors of the list of descriptors depending on direction.
     * @param {Contracts.GraphTraversalDirection} direction - The default value is Unknown.
     * @param {number} depth - The default value is '1'.
     * @return IPromise<{ [key: string] : Contracts.GraphMembershipTraversal; }>
     */
    public lookupMembershipTraversals(
        membershipTraversalLookup: Contracts.GraphSubjectLookup,
        direction?: Contracts.GraphTraversalDirection,
        depth?: number
        ): IPromise<{ [key: string] : Contracts.GraphMembershipTraversal; }> {

        const queryValues: any = {
            direction: direction,
            depth: depth
        };

        return this._beginRequest<{ [key: string] : Contracts.GraphMembershipTraversal; }>({
            httpMethod: "POST",
            area: "Graph",
            locationId: "5d59d874-746f-4f9b-9459-0e571f1ded8c",
            resource: "MembershipTraversals",
            routeTemplate: "_apis/{area}/{resource}/{subjectDescriptor}",
            responseIsCollection: true,
            queryParams: queryValues,
            apiVersion: this.membershipTraversalsApiVersion,
            data: membershipTraversalLookup
        });
    }

    /**
     * [Preview API] Check whether a subject is active or inactive.
     *
     * @param {string} subjectDescriptor - Descriptor of the subject (user, group, scope, etc.) to check state of
     * @return IPromise<Contracts.GraphMembershipState>
     */
    public getMembershipState(
        subjectDescriptor: string
        ): IPromise<Contracts.GraphMembershipState> {

        return this._beginRequest<Contracts.GraphMembershipState>({
            httpMethod: "GET",
            area: "Graph",
            locationId: "1ffe5c94-1144-4191-907b-d0211cad36a8",
            resource: "MembershipStates",
            routeTemplate: "_apis/{area}/{resource}/{subjectDescriptor}",
            routeValues: {
                subjectDescriptor: subjectDescriptor
            },
            apiVersion: this.membershipStatesApiVersion
        });
    }

    /**
     * [Preview API] Get all the memberships where this descriptor is a member in the relationship.
     *
     * @param {string} subjectDescriptor - Fetch all direct memberships of this descriptor.
     * @param {Contracts.GraphTraversalDirection} direction - Defaults to Up.
     * @param {number} depth - The maximum number of edges to traverse up or down the membership tree. Currently the only supported value is '1'.
     * @return IPromise<Contracts.GraphMembership[]>
     */
    public listMemberships(
        subjectDescriptor: string,
        direction?: Contracts.GraphTraversalDirection,
        depth?: number
        ): IPromise<Contracts.GraphMembership[]> {

        const queryValues: any = {
            direction: direction,
            depth: depth
        };

        return this._beginRequest<Contracts.GraphMembership[]>({
            httpMethod: "GET",
            area: "Graph",
            locationId: "e34b6394-6b30-4435-94a9-409a5eef3e31",
            resource: "MembershipsBatch",
            routeTemplate: "_apis/{area}/Memberships/{subjectDescriptor}",
            responseIsCollection: true,
            routeValues: {
                subjectDescriptor: subjectDescriptor
            },
            queryParams: queryValues,
            apiVersion: this.membershipsBatchApiVersion
        });
    }

    /**
     * [Preview API] Deletes a membership between a container and subject.
     *
     * @param {string} subjectDescriptor - A descriptor to a group or user that is the child subject in the relationship.
     * @param {string} containerDescriptor - A descriptor to a group that is the container in the relationship.
     * @return IPromise<void>
     */
    public removeMembership(
        subjectDescriptor: string,
        containerDescriptor: string
        ): IPromise<void> {

        return this._beginRequest<void>({
            httpMethod: "DELETE",
            httpResponseType: "html",
            area: "Graph",
            locationId: "3fd2e6ca-fb30-443a-b579-95b19ed0934c",
            resource: "Memberships",
            routeTemplate: "_apis/{area}/{resource}/{subjectDescriptor}/{containerDescriptor}",
            routeValues: {
                subjectDescriptor: subjectDescriptor,
                containerDescriptor: containerDescriptor
            },
            apiVersion: this.membershipsApiVersion
        });
    }

    /**
     * [Preview API] Get a membership relationship between a container and subject.
     *
     * @param {string} subjectDescriptor - A descriptor to the child subject in the relationship.
     * @param {string} containerDescriptor - A descriptor to the container in the relationship.
     * @return IPromise<Contracts.GraphMembership>
     */
    public getMembership(
        subjectDescriptor: string,
        containerDescriptor: string
        ): IPromise<Contracts.GraphMembership> {

        return this._beginRequest<Contracts.GraphMembership>({
            httpMethod: "GET",
            area: "Graph",
            locationId: "3fd2e6ca-fb30-443a-b579-95b19ed0934c",
            resource: "Memberships",
            routeTemplate: "_apis/{area}/{resource}/{subjectDescriptor}/{containerDescriptor}",
            routeValues: {
                subjectDescriptor: subjectDescriptor,
                containerDescriptor: containerDescriptor
            },
            apiVersion: this.membershipsApiVersion
        });
    }

    /**
     * [Preview API] Check to see if a membership relationship between a container and subject exists.
     *
     * @param {string} subjectDescriptor - The group or user that is a child subject of the relationship.
     * @param {string} containerDescriptor - The group that is the container in the relationship.
     * @return IPromise<boolean>
     */
    public checkMembershipExistence(
        subjectDescriptor: string,
        containerDescriptor: string
        ): IPromise<boolean> {

        return this._beginRequest<boolean>({
            httpMethod: "HEAD",
            area: "Graph",
            locationId: "3fd2e6ca-fb30-443a-b579-95b19ed0934c",
            resource: "Memberships",
            routeTemplate: "_apis/{area}/{resource}/{subjectDescriptor}/{containerDescriptor}",
            routeValues: {
                subjectDescriptor: subjectDescriptor,
                containerDescriptor: containerDescriptor
            },
            apiVersion: this.membershipsApiVersion
        }).then(() => {
            return true;
        }, (error) => {
            if (error.status === 404) {
                return false;
            }
            throw error;
        });
    }

    /**
     * [Preview API] Create a new membership between a container and subject.
     *
     * @param {string} subjectDescriptor - A descriptor to a group or user that can be the child subject in the relationship.
     * @param {string} containerDescriptor - A descriptor to a group that can be the container in the relationship.
     * @return IPromise<Contracts.GraphMembership>
     */
    public addMembership(
        subjectDescriptor: string,
        containerDescriptor: string
        ): IPromise<Contracts.GraphMembership> {

        return this._beginRequest<Contracts.GraphMembership>({
            httpMethod: "PUT",
            area: "Graph",
            locationId: "3fd2e6ca-fb30-443a-b579-95b19ed0934c",
            resource: "Memberships",
            routeTemplate: "_apis/{area}/{resource}/{subjectDescriptor}/{containerDescriptor}",
            routeValues: {
                subjectDescriptor: subjectDescriptor,
                containerDescriptor: containerDescriptor
            },
            apiVersion: this.membershipsApiVersion
        });
    }

    /**
     * @internal
     * [Preview API] This endpoint returns a result for any member that has ever been valid in the system, even if the member has since been deleted or has had all their memberships deleted. The current validity of the member is indicated through its disabled property, which is omitted when false.
     *
     * @param {string} memberDescriptor - The descriptor of the desired member.
     * @return IPromise<Contracts.GraphMember>
     */
    public getMemberByDescriptor(
        memberDescriptor: string
        ): IPromise<Contracts.GraphMember> {

        return this._beginRequest<Contracts.GraphMember>({
            httpMethod: "GET",
            area: "Graph",
            locationId: "b9af63a7-5db6-4af8-aae7-387f775ea9c6",
            resource: "Members",
            routeTemplate: "_apis/{area}/{resource}/{memberDescriptor}",
            routeValues: {
                memberDescriptor: memberDescriptor
            },
            apiVersion: this.membersApiVersion
        });
    }

    /**
     * @internal
     * [Preview API] This endpoint returns a result for any member that has ever been valid in the system, even if the member has since been deleted or has had all their memberships deleted. The current validity of the member is indicated through its disabled property, which is omitted when false.
     *
     * @param {string} memberCuid - The Consistently Unique Identifier of the desired member.
     * @return IPromise<Contracts.GraphMember>
     */
    public getMemberByCuid(
        memberCuid: string
        ): IPromise<Contracts.GraphMember> {

        return this._beginRequest<Contracts.GraphMember>({
            httpMethod: "GET",
            area: "Graph",
            locationId: "42939f1e-03ad-4ae9-9013-40f717a49d89",
            resource: "Members",
            routeTemplate: "_apis/{area}/{resource}/{memberCuid}",
            routeValues: {
                memberCuid: memberCuid
            },
            apiVersion: this.membersApiVersion_42939f1e
        });
    }

    /**
     * @internal
     * [Preview API] This endpoint returns a result for any member that has ever been valid in the system, even if the member has since been deleted or has had all their memberships deleted. The current validity of the member is indicated through its disabled property, which is omitted when false.
     *
     * @param {Contracts.GraphMemberSearchFactor} searchFactor - The search factor for what it is that you are searching for
     * @param {string} searchValue - The value of the search factor
     * @param {boolean} forceDomainQualification - In cases that you are searching for principle name, this parameter will specify that system should force the principle name being domain qualified
     * @return IPromise<Contracts.GraphMember[]>
     */
    public findMembersBySearchFactor(
        searchFactor: Contracts.GraphMemberSearchFactor,
        searchValue?: string,
        forceDomainQualification?: boolean
        ): IPromise<Contracts.GraphMember[]> {

        const queryValues: any = {
            searchFactor: searchFactor,
            searchValue: searchValue,
            forceDomainQualification: forceDomainQualification
        };

        return this._beginRequest<Contracts.GraphMember[]>({
            httpMethod: "GET",
            area: "Graph",
            locationId: "8b9ecdb2-b752-485a-8418-cc15cf12ee07",
            resource: "Members",
            routeTemplate: "_apis/{area}/{resource}",
            responseIsCollection: true,
            queryParams: queryValues,
            apiVersion: this.membersApiVersion_8b9ecdb2
        });
    }

    /**
     * @internal
     * [Preview API]
     *
     * @param {Contracts.GraphSubjectLookup} memberLookup
     * @return IPromise<{ [key: string] : Contracts.GraphMember; }>
     */
    public lookupMembers(
        memberLookup: Contracts.GraphSubjectLookup
        ): IPromise<{ [key: string] : Contracts.GraphMember; }> {

        return this._beginRequest<{ [key: string] : Contracts.GraphMember; }>({
            httpMethod: "POST",
            area: "Graph",
            locationId: "3d74d524-ae3d-4d24-a9a7-f8a5cf82347a",
            resource: "MemberLookup",
            routeTemplate: "_apis/{area}/{resource}",
            responseIsCollection: true,
            apiVersion: this.memberLookupApiVersion,
            data: memberLookup
        });
    }

    /**
     * [Preview API] Update the properties of a VSTS group.
     *
     * @param {string} groupDescriptor - The descriptor of the group to modify.
     * @param {VSS_Common_Contracts.JsonPatchDocument} patchDocument - The JSON+Patch document containing the fields to alter.
     * @return IPromise<Contracts.GraphGroup>
     */
    public updateGroup(
        groupDescriptor: string,
        patchDocument: VSS_Common_Contracts.JsonPatchDocument
        ): IPromise<Contracts.GraphGroup> {

        return this._beginRequest<Contracts.GraphGroup>({
            httpMethod: "PATCH",
            area: "Graph",
            locationId: "ebbe6af8-0b91-4c13-8cf1-777c14858188",
            resource: "Groups",
            routeTemplate: "_apis/{area}/{resource}/{groupDescriptor}",
            routeValues: {
                groupDescriptor: groupDescriptor
            },
            customHeaders: {
                "Content-Type": "application/json-patch+json",
            },
            apiVersion: this.groupsApiVersion,
            data: patchDocument
        });
    }

    /**
     * [Preview API] Gets a list of all groups in the current scope (usually organization or account).
     *
     * @param {string} scopeDescriptor - Specify a non-default scope (collection, project) to search for groups.
     * @param {string[]} subjectTypes - A comma separated list of user subject subtypes to reduce the retrieved results, e.g. Microsoft.IdentityModel.Claims.ClaimsIdentity
     * @param {string} continuationToken - An opaque data blob that allows the next page of data to resume immediately after where the previous page ended. The only reliable way to know if there is more data left is the presence of a continuation token.
     * @return IPromise<Contracts.PagedGraphGroups>
     */
    public listGroups(
        scopeDescriptor?: string,
        subjectTypes?: string[],
        continuationToken?: string
        ): IPromise<Contracts.PagedGraphGroups> {

        const queryValues: any = {
            scopeDescriptor: scopeDescriptor,
            subjectTypes: subjectTypes && subjectTypes.join(","),
            continuationToken: continuationToken
        };

        return this._beginRequest<[any, string, JQueryXHR]>({
            httpMethod: "GET",
            area: "Graph",
            locationId: "ebbe6af8-0b91-4c13-8cf1-777c14858188",
            resource: "Groups",
            routeTemplate: "_apis/{area}/{resource}/{groupDescriptor}",
            responseIsCollection: true,
            queryParams: queryValues,
            apiVersion: this.groupsApiVersion
        }, true).then(([data, textStatus, jqXHR]) => {
            const continuationTokenHeader = jqXHR.getResponseHeader("X-MS-ContinuationToken");
            return {
                graphGroups: data,
                continuationToken: continuationTokenHeader ? continuationTokenHeader.split(',') : []
            };
        });
    }

    /**
     * [Preview API] Get a group by its descriptor.
     *
     * @param {string} groupDescriptor - The descriptor of the desired graph group.
     * @return IPromise<Contracts.GraphGroup>
     */
    public getGroup(
        groupDescriptor: string
        ): IPromise<Contracts.GraphGroup> {

        return this._beginRequest<Contracts.GraphGroup>({
            httpMethod: "GET",
            area: "Graph",
            locationId: "ebbe6af8-0b91-4c13-8cf1-777c14858188",
            resource: "Groups",
            routeTemplate: "_apis/{area}/{resource}/{groupDescriptor}",
            routeValues: {
                groupDescriptor: groupDescriptor
            },
            apiVersion: this.groupsApiVersion
        });
    }

    /**
     * @internal
     * [Preview API] This endpoint returns a result for any group that has ever been valid in the system, even if the group has since been deleted or has had all their memberships deleted. The current validity of the group is indicated through its disabled property, which is omitted when false.
     *
     * @param {Contracts.GraphMemberSearchFactor} searchFactor - The search factor for what it is that you are searching for
     * @param {string} searchValue - The value of the search factor
     * @param {boolean} forceDomainQualification - In cases that you are searching for principle name, this parameter will specify that system should force the principle name being domain qualified
     * @return IPromise<Contracts.GraphGroup[]>
     */
    public findGroupsBySearchFactor(
        searchFactor: Contracts.GraphMemberSearchFactor,
        searchValue?: string,
        forceDomainQualification?: boolean
        ): IPromise<Contracts.GraphGroup[]> {

        const queryValues: any = {
            searchFactor: searchFactor,
            searchValue: searchValue,
            forceDomainQualification: forceDomainQualification
        };

        return this._beginRequest<Contracts.GraphGroup[]>({
            httpMethod: "GET",
            area: "Graph",
            locationId: "ebbe6af8-0b91-4c13-8cf1-777c14858188",
            resource: "Groups",
            routeTemplate: "_apis/{area}/{resource}/{groupDescriptor}",
            responseIsCollection: true,
            queryParams: queryValues,
            apiVersion: this.groupsApiVersion
        });
    }

    /**
     * [Preview API] Removes a VSTS group from all of its parent groups.
     *
     * @param {string} groupDescriptor - The descriptor of the group to delete.
     * @return IPromise<void>
     */
    public deleteGroup(
        groupDescriptor: string
        ): IPromise<void> {

        return this._beginRequest<void>({
            httpMethod: "DELETE",
            httpResponseType: "html",
            area: "Graph",
            locationId: "ebbe6af8-0b91-4c13-8cf1-777c14858188",
            resource: "Groups",
            routeTemplate: "_apis/{area}/{resource}/{groupDescriptor}",
            routeValues: {
                groupDescriptor: groupDescriptor
            },
            apiVersion: this.groupsApiVersion
        });
    }

    /**
     * [Preview API] Create a new VSTS group or materialize an existing AAD group.
     *
     * @param {Contracts.GraphGroupCreationContext} creationContext - The subset of the full graph group used to uniquely find the graph subject in an external provider.
     * @param {string} scopeDescriptor - A descriptor referencing the scope (collection, project) in which the group should be created. If omitted, will be created in the scope of the enclosing account or organization. Valid only for VSTS groups.
     * @param {string[]} groupDescriptors - A comma separated list of descriptors referencing groups you want the graph group to join
     * @return IPromise<Contracts.GraphGroup>
     */
    public createGroup(
        creationContext: Contracts.GraphGroupCreationContext,
        scopeDescriptor?: string,
        groupDescriptors?: string[]
        ): IPromise<Contracts.GraphGroup> {

        const queryValues: any = {
            scopeDescriptor: scopeDescriptor,
            groupDescriptors: groupDescriptors && groupDescriptors.join(",")
        };

        return this._beginRequest<Contracts.GraphGroup>({
            httpMethod: "POST",
            area: "Graph",
            locationId: "ebbe6af8-0b91-4c13-8cf1-777c14858188",
            resource: "Groups",
            routeTemplate: "_apis/{area}/{resource}/{groupDescriptor}",
            queryParams: queryValues,
            apiVersion: this.groupsApiVersion,
            data: creationContext
        });
    }

    /**
     * @internal
     * [Preview API]
     *
     * @param {{ [key: string] : any; }} identityProperties
     * @return IPromise<void>
     */
    public writeGlobalExtendedProperties(
        identityProperties: { [key: string] : any; }
        ): IPromise<void> {

        return this._beginRequest<void>({
            httpMethod: "PUT",
            httpResponseType: "html",
            area: "Graph",
            locationId: "de5a3b9c-0d60-455a-b405-4bb8f0954d3c",
            resource: "GraphGlobalExtendedPropertyBatch",
            routeTemplate: "_apis/{area}/{resource}",
            apiVersion: this.graphGlobalExtendedPropertyBatchApiVersion,
            data: identityProperties
        });
    }

    /**
     * @internal
     * [Preview API]
     *
     * @param {Contracts.GraphGlobalExtendedPropertyBatch} batch
     * @return IPromise<{ [key: string] : any; }>
     */
    public getGlobalExtendedProperties(
        batch: Contracts.GraphGlobalExtendedPropertyBatch
        ): IPromise<{ [key: string] : any; }> {

        return this._beginRequest<{ [key: string] : any; }>({
            httpMethod: "POST",
            area: "Graph",
            locationId: "de5a3b9c-0d60-455a-b405-4bb8f0954d3c",
            resource: "GraphGlobalExtendedPropertyBatch",
            routeTemplate: "_apis/{area}/{resource}",
            responseIsCollection: true,
            apiVersion: this.graphGlobalExtendedPropertyBatchApiVersion,
            data: batch
        });
    }

    /**
     * @internal
     * [Preview API]
     *
     * @return IPromise<Contracts.GraphCachePolicies>
     */
    public getCachePolicies(): IPromise<Contracts.GraphCachePolicies> {

        return this._beginRequest<Contracts.GraphCachePolicies>({
            httpMethod: "GET",
            area: "Graph",
            locationId: "beb83272-b415-48e8-ac1e-a9b805760739",
            resource: "CachePolicies",
            routeTemplate: "_apis/{area}/{resource}",
            apiVersion: this.cachePoliciesApiVersion
        });
    }
}

export class CommonMethods4To5 extends CommonMethods3_2To5 {
    protected providerInfoApiVersion: string;

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
    }

    /**
     * [Preview API]
     *
     * @param {string} userDescriptor
     * @return IPromise<Contracts.GraphProviderInfo>
     */
    public getProviderInfo(
        userDescriptor: string
        ): IPromise<Contracts.GraphProviderInfo> {

        return this._beginRequest<Contracts.GraphProviderInfo>({
            httpMethod: "GET",
            area: "Graph",
            locationId: "1e377995-6fa2-4588-bd64-930186abdcfa",
            resource: "ProviderInfo",
            routeTemplate: "_apis/{area}/Users/{userDescriptor}/{resource}",
            routeValues: {
                userDescriptor: userDescriptor
            },
            apiVersion: this.providerInfoApiVersion
        });
    }
}

/**
 * @exemptedapi
 */
export class GraphHttpClient5 extends CommonMethods4To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.cachePoliciesApiVersion =
        this.descriptorsApiVersion =
        this.graphGlobalExtendedPropertyBatchApiVersion =
        this.groupsApiVersion =
        this.memberLookupApiVersion =
        this.membersApiVersion =
        this.membersApiVersion_42939f1e =
        this.membersApiVersion_8b9ecdb2 =
        this.membershipsApiVersion =
        this.membershipsBatchApiVersion =
        this.membershipStatesApiVersion =
        this.membershipTraversalsApiVersion =
        this.providerInfoApiVersion =
        this.scopesApiVersion =
        this.shardingStateApiVersion =
        this.storageKeysApiVersion =
        this.subjectLookupApiVersion =
        this.subjectsApiVersion =
        this.usersApiVersion = "5.0-preview.1";
    }

    /**
     * @internal
     * [Preview API] Acquires the full set of federated provider authentication data available for the given graph subject and provider name.
     *
     * @param {string} subjectDescriptor - the descriptor of the graph subject that we should acquire data for
     * @param {string} providerName - the name of the provider to acquire data for, e.g. "github.com"
     * @param {number} versionHint - a version hint that can be used for optimistic cache concurrency and to support retries on access token failures; note that this is a hint only and does not guarantee a particular version on the response
     * @return IPromise<Contracts.GraphFederatedProviderData>
     */
    public getFederatedProviderData(
        subjectDescriptor: string,
        providerName: string,
        versionHint?: number
        ): IPromise<Contracts.GraphFederatedProviderData> {

        const queryValues: any = {
            providerName: providerName,
            versionHint: versionHint
        };

        return this._beginRequest<Contracts.GraphFederatedProviderData>({
            httpMethod: "GET",
            area: "Graph",
            locationId: "5dcd28d6-632d-477f-ac6b-398ea9fc2f71",
            resource: "FederatedProviderData",
            routeTemplate: "_apis/{area}/{resource}/{subjectDescriptor}",
            routeValues: {
                subjectDescriptor: subjectDescriptor
            },
            queryParams: queryValues,
            apiVersion: "5.0-preview.1"
        });
    }
}

/**
 * @exemptedapi
 */
export class GraphHttpClient4_1 extends CommonMethods4To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.cachePoliciesApiVersion =
        this.descriptorsApiVersion =
        this.graphGlobalExtendedPropertyBatchApiVersion =
        this.groupsApiVersion =
        this.memberLookupApiVersion =
        this.membersApiVersion =
        this.membersApiVersion_42939f1e =
        this.membersApiVersion_8b9ecdb2 =
        this.membershipsApiVersion =
        this.membershipsBatchApiVersion =
        this.membershipStatesApiVersion =
        this.membershipTraversalsApiVersion =
        this.providerInfoApiVersion =
        this.scopesApiVersion =
        this.shardingStateApiVersion =
        this.storageKeysApiVersion =
        this.subjectLookupApiVersion =
        this.subjectsApiVersion =
        this.usersApiVersion = "4.1-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class GraphHttpClient4 extends CommonMethods4To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.cachePoliciesApiVersion =
        this.descriptorsApiVersion =
        this.graphGlobalExtendedPropertyBatchApiVersion =
        this.groupsApiVersion =
        this.memberLookupApiVersion =
        this.membersApiVersion =
        this.membersApiVersion_42939f1e =
        this.membersApiVersion_8b9ecdb2 =
        this.membershipsApiVersion =
        this.membershipsBatchApiVersion =
        this.membershipStatesApiVersion =
        this.membershipTraversalsApiVersion =
        this.providerInfoApiVersion =
        this.scopesApiVersion =
        this.shardingStateApiVersion =
        this.storageKeysApiVersion =
        this.subjectLookupApiVersion =
        this.subjectsApiVersion =
        this.usersApiVersion = "4.0-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class GraphHttpClient3_2 extends CommonMethods3_2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.cachePoliciesApiVersion =
        this.descriptorsApiVersion =
        this.graphGlobalExtendedPropertyBatchApiVersion =
        this.groupsApiVersion =
        this.memberLookupApiVersion =
        this.membersApiVersion =
        this.membersApiVersion_42939f1e =
        this.membersApiVersion_8b9ecdb2 =
        this.membershipsApiVersion =
        this.membershipsBatchApiVersion =
        this.membershipStatesApiVersion =
        this.membershipTraversalsApiVersion =
        this.scopesApiVersion =
        this.shardingStateApiVersion =
        this.storageKeysApiVersion =
        this.subjectLookupApiVersion =
        this.subjectsApiVersion =
        this.usersApiVersion = "3.2-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class GraphHttpClient3_1 extends CommonMethods3_1To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.descriptorsApiVersion = "3.1-preview.1";
    }
}

export class GraphHttpClient extends GraphHttpClient5 {
    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
    }
}

const clientMapping: { [id: string]: new (routeRequestPath: string) => VSS_WebApi.VssHttpClient; } = {
    "5.0": GraphHttpClient5,
    "4.1": GraphHttpClient4_1,
    "4.0": GraphHttpClient4,
    "3.2": GraphHttpClient3_2,
    "3.1": GraphHttpClient3_1
}

/**
 * Gets an http client targeting the latest released version of the APIs.
 *
 * @return GraphHttpClient5
 */
export function getClient(options?: VSS_WebApi.IVssHttpClientOptions): GraphHttpClient5 {
    if ((<any>window).VSS && (<any>window).VSS.VssSDKRestVersion && clientMapping[(<any>window).VSS.VssSDKRestVersion]) {
        return VSS_Service.getClient<GraphHttpClient5>(<any>(clientMapping[(<any>window).VSS.VssSDKRestVersion]), undefined, undefined, undefined, options);
    }
    else {
        return VSS_Service.getClient<GraphHttpClient5>(GraphHttpClient5, undefined, undefined, undefined, options);
    }
}
