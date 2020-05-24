/**
 * ---------------------------------------------------------
 * Generated file, DO NOT EDIT
 * ---------------------------------------------------------
 *
 * See following wiki page for instructions on how to regenerate:
 *   https://aka.ms/azure-devops-client-generation
 *
 * Configuration file:
 *   aex\client\memberentitlementmanagement\webapi\public\clientgeneratorconfigs\genclient.json
 */

"use strict";

import Contracts = require("Aex/MemberEntitlementManagement/Contracts");
import VSS_Common_Contracts = require("VSS/WebApi/Contracts");
import VSS_LicensingRule_Contracts = require("VSS/LicensingRule/Contracts");
import VSS_Service = require("VSS/Service");
import VSS_WebApi = require("VSS/WebApi/RestClient");

export class CommonMethods3_1To5 extends VSS_WebApi.VssHttpClient {

    public static serviceInstanceId = "00000041-0000-8888-8000-000000000000";
    protected groupEntitlementsApiVersion: string;
    protected memberEntitlementsApiVersion: string;
    protected membersApiVersion: string;

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
    }

    /**
     * [Preview API] Remove a member from a Group.
     *
     * @param {string} groupId - Id of the group.
     * @param {string} memberId - Id of the member to remove.
     * @return IPromise<void>
     */
    public removeMemberFromGroup(
        groupId: string,
        memberId: string
        ): IPromise<void> {

        return this._beginRequest<void>({
            httpMethod: "DELETE",
            httpResponseType: "html",
            area: "MemberEntitlementManagement",
            locationId: "45a36e53-5286-4518-aa72-2d29f7acc5d8",
            resource: "Members",
            routeTemplate: "_apis/GroupEntitlements/{groupId}/{resource}/{memberId}",
            routeValues: {
                groupId: groupId,
                memberId: memberId
            },
            apiVersion: this.membersApiVersion
        });
    }

    /**
     * [Preview API] Get direct members of a Group.
     *
     * @param {string} groupId - Id of the Group.
     * @param {number} maxResults - Maximum number of results to retrieve.
     * @param {string} pagingToken - Paging Token from the previous page fetched. If the 'pagingToken' is null, the results would be fetched from the begining of the Members List.
     * @return IPromise<Contracts.PagedGraphMemberList>
     */
    public getGroupMembers(
        groupId: string,
        maxResults?: number,
        pagingToken?: string
        ): IPromise<Contracts.PagedGraphMemberList> {

        const queryValues: any = {
            maxResults: maxResults,
            pagingToken: pagingToken
        };

        return this._beginRequest<Contracts.PagedGraphMemberList>({
            httpMethod: "GET",
            area: "MemberEntitlementManagement",
            locationId: "45a36e53-5286-4518-aa72-2d29f7acc5d8",
            resource: "Members",
            routeTemplate: "_apis/GroupEntitlements/{groupId}/{resource}/{memberId}",
            responseType: Contracts.TypeInfo.PagedGraphMemberList,
            routeValues: {
                groupId: groupId
            },
            queryParams: queryValues,
            apiVersion: this.membersApiVersion
        });
    }

    /**
     * [Preview API] Add a member to a Group.
     *
     * @param {string} groupId - Id of the Group.
     * @param {string} memberId - Id of the member to add.
     * @return IPromise<void>
     */
    public addMemberToGroup(
        groupId: string,
        memberId: string
        ): IPromise<void> {

        return this._beginRequest<void>({
            httpMethod: "PUT",
            httpResponseType: "html",
            area: "MemberEntitlementManagement",
            locationId: "45a36e53-5286-4518-aa72-2d29f7acc5d8",
            resource: "Members",
            routeTemplate: "_apis/GroupEntitlements/{groupId}/{resource}/{memberId}",
            routeValues: {
                groupId: groupId,
                memberId: memberId
            },
            apiVersion: this.membersApiVersion
        });
    }

    /**
     * @internal
     * [Preview API] Used to edit multiple members in an account. Edits groups, licenses, and extensions.
     *
     * @param {VSS_Common_Contracts.JsonPatchDocument} document - JsonPatch document
     * @return IPromise<Contracts.MemberEntitlementOperationReference>
     */
    public updateMemberEntitlements(
        document: VSS_Common_Contracts.JsonPatchDocument
        ): IPromise<Contracts.MemberEntitlementOperationReference> {

        return this._beginRequest<Contracts.MemberEntitlementOperationReference>({
            httpMethod: "PATCH",
            area: "MemberEntitlementManagement",
            locationId: "1e8cabfb-1fda-461e-860f-eeeae54d06bb",
            resource: "MemberEntitlements",
            routeTemplate: "_apis/{resource}/{memberId}",
            responseType: Contracts.TypeInfo.MemberEntitlementOperationReference,
            customHeaders: {
                "Content-Type": "application/json-patch+json",
            },
            apiVersion: this.memberEntitlementsApiVersion,
            data: document
        });
    }

    /**
     * @internal
     * [Preview API] Used to edit a member in an account. Edits groups, licenses, and extensions.
     *
     * @param {VSS_Common_Contracts.JsonPatchDocument} document - document of operations to be used
     * @param {string} memberId - member Id of the member to be edit
     * @return IPromise<Contracts.MemberEntitlementsPatchResponse>
     */
    public updateMemberEntitlement(
        document: VSS_Common_Contracts.JsonPatchDocument,
        memberId: string
        ): IPromise<Contracts.MemberEntitlementsPatchResponse> {

        return this._beginRequest<Contracts.MemberEntitlementsPatchResponse>({
            httpMethod: "PATCH",
            area: "MemberEntitlementManagement",
            locationId: "1e8cabfb-1fda-461e-860f-eeeae54d06bb",
            resource: "MemberEntitlements",
            routeTemplate: "_apis/{resource}/{memberId}",
            responseType: Contracts.TypeInfo.MemberEntitlementsPatchResponse,
            routeValues: {
                memberId: memberId
            },
            customHeaders: {
                "Content-Type": "application/json-patch+json",
            },
            apiVersion: this.memberEntitlementsApiVersion,
            data: document
        });
    }

    /**
     * @internal
     * [Preview API] Used to get member entitlement information in an account
     *
     * @param {number} top
     * @param {number} skip
     * @param {string} filter
     * @param {string} select
     * @return IPromise<Contracts.MemberEntitlement[]>
     */
    public getMemberEntitlements(
        top: number,
        skip: number,
        filter?: string,
        select?: string
        ): IPromise<Contracts.MemberEntitlement[]> {

        const queryValues: any = {
            top: top,
            skip: skip,
            filter: filter,
            select: select
        };

        return this._beginRequest<Contracts.MemberEntitlement[]>({
            httpMethod: "GET",
            area: "MemberEntitlementManagement",
            locationId: "1e8cabfb-1fda-461e-860f-eeeae54d06bb",
            resource: "MemberEntitlements",
            routeTemplate: "_apis/{resource}/{memberId}",
            responseType: Contracts.TypeInfo.MemberEntitlement,
            responseIsCollection: true,
            queryParams: queryValues,
            apiVersion: this.memberEntitlementsApiVersion
        });
    }

    /**
     * @internal
     * [Preview API] Used to get member entitlement information in an account
     *
     * @param {string} memberId
     * @return IPromise<Contracts.MemberEntitlement>
     */
    public getMemberEntitlement(
        memberId: string
        ): IPromise<Contracts.MemberEntitlement> {

        return this._beginRequest<Contracts.MemberEntitlement>({
            httpMethod: "GET",
            area: "MemberEntitlementManagement",
            locationId: "1e8cabfb-1fda-461e-860f-eeeae54d06bb",
            resource: "MemberEntitlements",
            routeTemplate: "_apis/{resource}/{memberId}",
            responseType: Contracts.TypeInfo.MemberEntitlement,
            routeValues: {
                memberId: memberId
            },
            apiVersion: this.memberEntitlementsApiVersion
        });
    }

    /**
     * @internal
     * [Preview API] Deletes members from an account
     *
     * @param {string} memberId - memberId of the member to be removed.
     * @return IPromise<void>
     */
    public deleteMemberEntitlement(
        memberId: string
        ): IPromise<void> {

        return this._beginRequest<void>({
            httpMethod: "DELETE",
            httpResponseType: "html",
            area: "MemberEntitlementManagement",
            locationId: "1e8cabfb-1fda-461e-860f-eeeae54d06bb",
            resource: "MemberEntitlements",
            routeTemplate: "_apis/{resource}/{memberId}",
            routeValues: {
                memberId: memberId
            },
            apiVersion: this.memberEntitlementsApiVersion
        });
    }

    /**
     * @internal
     * [Preview API] Used to add members to a project in an account. It adds them to project groups, assigns licenses, and assigns extensions.
     *
     * @param {Contracts.MemberEntitlement} memberEntitlement - Member model for where to add the member and what licenses and extensions they should receive.
     * @return IPromise<Contracts.MemberEntitlementsPostResponse>
     */
    public addMemberEntitlement(
        memberEntitlement: Contracts.MemberEntitlement
        ): IPromise<Contracts.MemberEntitlementsPostResponse> {

        return this._beginRequest<Contracts.MemberEntitlementsPostResponse>({
            httpMethod: "POST",
            area: "MemberEntitlementManagement",
            locationId: "1e8cabfb-1fda-461e-860f-eeeae54d06bb",
            resource: "MemberEntitlements",
            routeTemplate: "_apis/{resource}/{memberId}",
            requestType: Contracts.TypeInfo.MemberEntitlement,
            responseType: Contracts.TypeInfo.MemberEntitlementsPostResponse,
            apiVersion: this.memberEntitlementsApiVersion,
            data: memberEntitlement
        });
    }

    /**
     * [Preview API] Update entitlements (License Rule, Extensions Rule, Project memberships etc.) for a group.
     *
     * @param {VSS_Common_Contracts.JsonPatchDocument} document - JsonPatchDocument containing the operations to perform on the group.
     * @param {string} groupId - ID of the group.
     * @param {VSS_LicensingRule_Contracts.RuleOption} ruleOption - RuleOption [ApplyGroupRule/TestApplyGroupRule] - specifies if the rules defined in group entitlement should be updated and the changes are applied to it’s members (default option) or just be tested
     * @return IPromise<Contracts.GroupEntitlementOperationReference>
     */
    public updateGroupEntitlement(
        document: VSS_Common_Contracts.JsonPatchDocument,
        groupId: string,
        ruleOption?: VSS_LicensingRule_Contracts.RuleOption
        ): IPromise<Contracts.GroupEntitlementOperationReference> {

        const queryValues: any = {
            ruleOption: ruleOption
        };

        return this._beginRequest<Contracts.GroupEntitlementOperationReference>({
            httpMethod: "PATCH",
            area: "MemberEntitlementManagement",
            locationId: "2280bffa-58a2-49da-822e-0764a1bb44f7",
            resource: "GroupEntitlements",
            routeTemplate: "_apis/{resource}/{groupId}",
            responseType: Contracts.TypeInfo.GroupEntitlementOperationReference,
            routeValues: {
                groupId: groupId
            },
            customHeaders: {
                "Content-Type": "application/json-patch+json",
            },
            queryParams: queryValues,
            apiVersion: this.groupEntitlementsApiVersion,
            data: document
        });
    }

    /**
     * [Preview API] Get the group entitlements for an account.
     *
     * @return IPromise<Contracts.GroupEntitlement[]>
     */
    public getGroupEntitlements(): IPromise<Contracts.GroupEntitlement[]> {

        return this._beginRequest<Contracts.GroupEntitlement[]>({
            httpMethod: "GET",
            area: "MemberEntitlementManagement",
            locationId: "2280bffa-58a2-49da-822e-0764a1bb44f7",
            resource: "GroupEntitlements",
            routeTemplate: "_apis/{resource}/{groupId}",
            responseType: Contracts.TypeInfo.GroupEntitlement,
            responseIsCollection: true,
            apiVersion: this.groupEntitlementsApiVersion
        });
    }

    /**
     * [Preview API] Get a group entitlement.
     *
     * @param {string} groupId - ID of the group.
     * @return IPromise<Contracts.GroupEntitlement>
     */
    public getGroupEntitlement(
        groupId: string
        ): IPromise<Contracts.GroupEntitlement> {

        return this._beginRequest<Contracts.GroupEntitlement>({
            httpMethod: "GET",
            area: "MemberEntitlementManagement",
            locationId: "2280bffa-58a2-49da-822e-0764a1bb44f7",
            resource: "GroupEntitlements",
            routeTemplate: "_apis/{resource}/{groupId}",
            responseType: Contracts.TypeInfo.GroupEntitlement,
            routeValues: {
                groupId: groupId
            },
            apiVersion: this.groupEntitlementsApiVersion
        });
    }

    /**
     * [Preview API] Delete a group entitlement.
     *
     * @param {string} groupId - ID of the group to delete.
     * @param {VSS_LicensingRule_Contracts.RuleOption} ruleOption - RuleOption [ApplyGroupRule/TestApplyGroupRule] - specifies if the rules defined in group entitlement should be deleted and the changes are applied to it’s members (default option) or just be tested
     * @param {boolean} removeGroupMembership - Optional parameter that specifies whether the group with the given ID should be removed from all other groups
     * @return IPromise<Contracts.GroupEntitlementOperationReference>
     */
    public deleteGroupEntitlement(
        groupId: string,
        ruleOption?: VSS_LicensingRule_Contracts.RuleOption,
        removeGroupMembership?: boolean
        ): IPromise<Contracts.GroupEntitlementOperationReference> {

        const queryValues: any = {
            ruleOption: ruleOption,
            removeGroupMembership: removeGroupMembership
        };

        return this._beginRequest<Contracts.GroupEntitlementOperationReference>({
            httpMethod: "DELETE",
            area: "MemberEntitlementManagement",
            locationId: "2280bffa-58a2-49da-822e-0764a1bb44f7",
            resource: "GroupEntitlements",
            routeTemplate: "_apis/{resource}/{groupId}",
            responseType: Contracts.TypeInfo.GroupEntitlementOperationReference,
            routeValues: {
                groupId: groupId
            },
            queryParams: queryValues,
            apiVersion: this.groupEntitlementsApiVersion
        });
    }

    /**
     * [Preview API] Create a group entitlement with license rule, extension rule.
     *
     * @param {Contracts.GroupEntitlement} groupEntitlement - GroupEntitlement object specifying License Rule, Extensions Rule for the group. Based on the rules the members of the group will be given licenses and extensions. The Group Entitlement can be used to add the group to another project level groups
     * @param {VSS_LicensingRule_Contracts.RuleOption} ruleOption - RuleOption [ApplyGroupRule/TestApplyGroupRule] - specifies if the rules defined in group entitlement should be created and applied to it’s members (default option) or just be tested
     * @return IPromise<Contracts.GroupEntitlementOperationReference>
     */
    public addGroupEntitlement(
        groupEntitlement: Contracts.GroupEntitlement,
        ruleOption?: VSS_LicensingRule_Contracts.RuleOption
        ): IPromise<Contracts.GroupEntitlementOperationReference> {

        const queryValues: any = {
            ruleOption: ruleOption
        };

        return this._beginRequest<Contracts.GroupEntitlementOperationReference>({
            httpMethod: "POST",
            area: "MemberEntitlementManagement",
            locationId: "2280bffa-58a2-49da-822e-0764a1bb44f7",
            resource: "GroupEntitlements",
            routeTemplate: "_apis/{resource}/{groupId}",
            requestType: Contracts.TypeInfo.GroupEntitlement,
            responseType: Contracts.TypeInfo.GroupEntitlementOperationReference,
            queryParams: queryValues,
            apiVersion: this.groupEntitlementsApiVersion,
            data: groupEntitlement
        });
    }
}

export class CommonMethods4_1To5 extends CommonMethods3_1To5 {
    protected userEntitlementsApiVersion: string;
    protected userEntitlementsApiVersion_387f832c: string;
    protected userEntitlementSummaryApiVersion: string;

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
    }

    /**
     * [Preview API] Get summary of Licenses, Extension, Projects, Groups and their assignments in the collection.
     *
     * @param {string} select - Comma (",") separated list of properties to select. Supported property names are {AccessLevels, Licenses, Extensions, Projects, Groups}.
     * @return IPromise<Contracts.UsersSummary>
     */
    public getUsersSummary(
        select?: string
        ): IPromise<Contracts.UsersSummary> {

        const queryValues: any = {
            select: select
        };

        return this._beginRequest<Contracts.UsersSummary>({
            httpMethod: "GET",
            area: "MemberEntitlementManagement",
            locationId: "5ae55b13-c9dd-49d1-957e-6e76c152e3d9",
            resource: "UserEntitlementSummary",
            routeTemplate: "_apis/{resource}",
            responseType: Contracts.TypeInfo.UsersSummary,
            queryParams: queryValues,
            apiVersion: this.userEntitlementSummaryApiVersion
        });
    }

    /**
     * [Preview API] Edit the entitlements (License, Extensions, Projects, Teams etc) for a user.
     *
     * @param {VSS_Common_Contracts.JsonPatchDocument} document - JsonPatchDocument containing the operations to perform on the user.
     * @param {string} userId - ID of the user.
     * @return IPromise<Contracts.UserEntitlementsPatchResponse>
     */
    public updateUserEntitlement(
        document: VSS_Common_Contracts.JsonPatchDocument,
        userId: string
        ): IPromise<Contracts.UserEntitlementsPatchResponse> {

        return this._beginRequest<Contracts.UserEntitlementsPatchResponse>({
            httpMethod: "PATCH",
            area: "MemberEntitlementManagement",
            locationId: "8480c6eb-ce60-47e9-88df-eca3c801638b",
            resource: "UserEntitlements",
            routeTemplate: "_apis/{resource}/{userId}",
            responseType: Contracts.TypeInfo.UserEntitlementsPatchResponse,
            routeValues: {
                userId: userId
            },
            customHeaders: {
                "Content-Type": "application/json-patch+json",
            },
            apiVersion: this.userEntitlementsApiVersion,
            data: document
        });
    }

    /**
     * [Preview API] Get User Entitlement for a user.
     *
     * @param {string} userId - ID of the user.
     * @return IPromise<Contracts.UserEntitlement>
     */
    public getUserEntitlement(
        userId: string
        ): IPromise<Contracts.UserEntitlement> {

        return this._beginRequest<Contracts.UserEntitlement>({
            httpMethod: "GET",
            area: "MemberEntitlementManagement",
            locationId: "8480c6eb-ce60-47e9-88df-eca3c801638b",
            resource: "UserEntitlements",
            routeTemplate: "_apis/{resource}/{userId}",
            responseType: Contracts.TypeInfo.UserEntitlement,
            routeValues: {
                userId: userId
            },
            apiVersion: this.userEntitlementsApiVersion
        });
    }

    /**
     * [Preview API] Delete a user from the account.
     *
     * @param {string} userId - ID of the user.
     * @return IPromise<void>
     */
    public deleteUserEntitlement(
        userId: string
        ): IPromise<void> {

        return this._beginRequest<void>({
            httpMethod: "DELETE",
            httpResponseType: "html",
            area: "MemberEntitlementManagement",
            locationId: "8480c6eb-ce60-47e9-88df-eca3c801638b",
            resource: "UserEntitlements",
            routeTemplate: "_apis/{resource}/{userId}",
            routeValues: {
                userId: userId
            },
            apiVersion: this.userEntitlementsApiVersion
        });
    }

    /**
     * [Preview API] Edit the entitlements (License, Extensions, Projects, Teams etc) for one or more users.
     *
     * @param {VSS_Common_Contracts.JsonPatchDocument} document - JsonPatchDocument containing the operations to perform.
     * @param {boolean} doNotSendInviteForNewUsers - Whether to send email invites to new users or not
     * @return IPromise<Contracts.UserEntitlementOperationReference>
     */
    public updateUserEntitlements(
        document: VSS_Common_Contracts.JsonPatchDocument,
        doNotSendInviteForNewUsers?: boolean
        ): IPromise<Contracts.UserEntitlementOperationReference> {

        const queryValues: any = {
            doNotSendInviteForNewUsers: doNotSendInviteForNewUsers
        };

        return this._beginRequest<Contracts.UserEntitlementOperationReference>({
            httpMethod: "PATCH",
            area: "MemberEntitlementManagement",
            locationId: "387f832c-dbf2-4643-88e9-c1aa94dbb737",
            resource: "UserEntitlements",
            routeTemplate: "_apis/{resource}/{userDescriptor}",
            responseType: Contracts.TypeInfo.UserEntitlementOperationReference,
            customHeaders: {
                "Content-Type": "application/json-patch+json",
            },
            queryParams: queryValues,
            apiVersion: this.userEntitlementsApiVersion_387f832c,
            data: document
        });
    }

    /**
     * [Preview API] Add a user, assign license and extensions and make them a member of a project group in an account.
     *
     * @param {Contracts.UserEntitlement} userEntitlement - UserEntitlement object specifying License, Extensions and Project/Team groups the user should be added to.
     * @return IPromise<Contracts.UserEntitlementsPostResponse>
     */
    public addUserEntitlement(
        userEntitlement: Contracts.UserEntitlement
        ): IPromise<Contracts.UserEntitlementsPostResponse> {

        return this._beginRequest<Contracts.UserEntitlementsPostResponse>({
            httpMethod: "POST",
            area: "MemberEntitlementManagement",
            locationId: "387f832c-dbf2-4643-88e9-c1aa94dbb737",
            resource: "UserEntitlements",
            routeTemplate: "_apis/{resource}/{userDescriptor}",
            requestType: Contracts.TypeInfo.UserEntitlement,
            responseType: Contracts.TypeInfo.UserEntitlementsPostResponse,
            apiVersion: this.userEntitlementsApiVersion_387f832c,
            data: userEntitlement
        });
    }
}

/**
 * @exemptedapi
 */
export class MemberEntitlementManagementHttpClient5 extends CommonMethods4_1To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.groupEntitlementsApiVersion =
        this.memberEntitlementsApiVersion =
        this.membersApiVersion =
        this.userEntitlementSummaryApiVersion = "5.0-preview.1";
        this.userEntitlementsApiVersion =
        this.userEntitlementsApiVersion_387f832c = "5.0-preview.2";
    }

    /**
     * [Preview API] Get a paged set of user entitlements matching the filter criteria. If no filter is is passed, a page from all the account users is returned.
     *
     * @param {number} top - Maximum number of the user entitlements to return. Max value is 10000. Default value is 100
     * @param {number} skip - Offset: Number of records to skip. Default value is 0
     * @param {string} filter - Comma (",") separated list of properties and their values to filter on. Currently, the API only supports filtering by ExtensionId. An example parameter would be filter=extensionId eq search.
     * @param {string} sortOption - PropertyName and Order (separated by a space ( )) to sort on (e.g. LastAccessDate Desc)
     * @return IPromise<Contracts.PagedGraphMemberList>
     */
    public getUserEntitlements(
        top?: number,
        skip?: number,
        filter?: string,
        sortOption?: string
        ): IPromise<Contracts.PagedGraphMemberList> {

        const queryValues: any = {
            top: top,
            skip: skip,
            filter: filter,
            sortOption: sortOption
        };

        return this._beginRequest<Contracts.PagedGraphMemberList>({
            httpMethod: "GET",
            area: "MemberEntitlementManagement",
            locationId: "387f832c-dbf2-4643-88e9-c1aa94dbb737",
            resource: "UserEntitlements",
            routeTemplate: "_apis/{resource}/{userDescriptor}",
            responseType: Contracts.TypeInfo.PagedGraphMemberList,
            queryParams: queryValues,
            apiVersion: "5.0-preview.2"
        });
    }
}

/**
 * @exemptedapi
 */
export class MemberEntitlementManagementHttpClient4_1 extends CommonMethods4_1To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.groupEntitlementsApiVersion =
        this.memberEntitlementsApiVersion =
        this.membersApiVersion =
        this.userEntitlementsApiVersion =
        this.userEntitlementsApiVersion_387f832c =
        this.userEntitlementSummaryApiVersion = "4.1-preview.1";
    }

    /**
     * [Preview API] Get a paged set of user entitlements matching the filter criteria. If no filter is is passed, a page from all the account users is returned.
     *
     * @param {number} top - Maximum number of the user entitlements to return. Max value is 10000. Default value is 100
     * @param {number} skip - Offset: Number of records to skip. Default value is 0
     * @param {string} filter - Comma (",") separated list of properties and their values to filter on. Currently, the API only supports filtering by ExtensionId. An example parameter would be filter=extensionId eq search.
     * @param {string} select - Comma (",") separated list of properties to select in the result entitlements. names of the properties are - 'Projects, 'Extensions' and 'Grouprules'.
     * @return IPromise<Contracts.UserEntitlement[]>
     */
    public getUserEntitlements(
        top?: number,
        skip?: number,
        filter?: string,
        select?: string
        ): IPromise<Contracts.UserEntitlement[]> {

        const queryValues: any = {
            top: top,
            skip: skip,
            filter: filter,
            select: select
        };

        return this._beginRequest<Contracts.UserEntitlement[]>({
            httpMethod: "GET",
            area: "MemberEntitlementManagement",
            locationId: "387f832c-dbf2-4643-88e9-c1aa94dbb737",
            resource: "UserEntitlements",
            routeTemplate: "_apis/{resource}/{userDescriptor}",
            responseType: Contracts.TypeInfo.UserEntitlement,
            responseIsCollection: true,
            queryParams: queryValues,
            apiVersion: "4.1-preview.1"
        });
    }
}

/**
 * @exemptedapi
 */
export class MemberEntitlementManagementHttpClient4 extends CommonMethods3_1To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.groupEntitlementsApiVersion =
        this.memberEntitlementsApiVersion =
        this.membersApiVersion = "4.0-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class MemberEntitlementManagementHttpClient3_2 extends CommonMethods3_1To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.groupEntitlementsApiVersion =
        this.memberEntitlementsApiVersion =
        this.membersApiVersion = "3.2-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class MemberEntitlementManagementHttpClient3_1 extends CommonMethods3_1To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.groupEntitlementsApiVersion =
        this.memberEntitlementsApiVersion =
        this.membersApiVersion = "3.1-preview.1";
    }
}

export class MemberEntitlementManagementHttpClient extends MemberEntitlementManagementHttpClient5 {
    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
    }
}

const clientMapping: { [id: string]: new (routeRequestPath: string) => VSS_WebApi.VssHttpClient; } = {
    "5.0": MemberEntitlementManagementHttpClient5,
    "4.1": MemberEntitlementManagementHttpClient4_1,
    "4.0": MemberEntitlementManagementHttpClient4,
    "3.2": MemberEntitlementManagementHttpClient3_2,
    "3.1": MemberEntitlementManagementHttpClient3_1
}

/**
 * Gets an http client targeting the latest released version of the APIs.
 *
 * @return MemberEntitlementManagementHttpClient5
 */
export function getClient(options?: VSS_WebApi.IVssHttpClientOptions): MemberEntitlementManagementHttpClient5 {
    if ((<any>window).VSS && (<any>window).VSS.VssSDKRestVersion && clientMapping[(<any>window).VSS.VssSDKRestVersion]) {
        return VSS_Service.getClient<MemberEntitlementManagementHttpClient5>(<any>(clientMapping[(<any>window).VSS.VssSDKRestVersion]), undefined, undefined, undefined, options);
    }
    else {
        return VSS_Service.getClient<MemberEntitlementManagementHttpClient5>(MemberEntitlementManagementHttpClient5, undefined, undefined, undefined, options);
    }
}
