/**
 * ---------------------------------------------------------
 * Generated file, DO NOT EDIT
 * ---------------------------------------------------------
 *
 * See following wiki page for instructions on how to regenerate:
 *   https://aka.ms/azure-devops-client-generation
 *
 * Configuration file:
 *   vssf\client\webapi\httpclients\clientgeneratorconfigs\licensingrule.genclient.json
 */

"use strict";

import Contracts = require("VSS/LicensingRule/Contracts");
import VSS_Operations_Contracts = require("VSS/Operations/Contracts");
import VSS_Service = require("VSS/Service");
import VSS_WebApi = require("VSS/WebApi/RestClient");
import VSS_WebApi_Constants = require("VSS/WebApi/Constants");

export class CommonMethods2To5 extends VSS_WebApi.VssHttpClient {

    public static serviceInstanceId = VSS_WebApi_Constants.ServiceInstanceTypes.SPS;
    protected groupLicensingRulesApiVersion: string;
    protected groupLicensingRulesApplicationApiVersion: string;
    protected groupLicensingRulesApplicationStatusApiVersion: string;
    protected groupLicensingRulesLookupApiVersion: string;
    protected groupLicensingRulesUserApplicationApiVersion: string;

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
    }

    /**
     * [Preview API] Removes direct assignments from, and re-applies group rules to, the specified users
     *
     * @param {string} userId
     * @return IPromise<void>
     */
    public removeDirectAssignment(
        userId: string
        ): IPromise<void> {

        return this._beginRequest<void>({
            httpMethod: "DELETE",
            httpResponseType: "html",
            area: "LicensingRule",
            locationId: "74a9de62-9afc-4a60-a6d9-f7c65e028619",
            resource: "GroupLicensingRulesUserApplication",
            routeTemplate: "_apis/{area}/{resource}/{userId}",
            routeValues: {
                userId: userId
            },
            apiVersion: this.groupLicensingRulesUserApplicationApiVersion
        });
    }

    /**
     * [Preview API] Applies group rules to the specified user
     *
     * @param {string} userId
     * @return IPromise<void>
     */
    public applyGroupLicensingRulesToUser(
        userId: string
        ): IPromise<void> {

        return this._beginRequest<void>({
            httpMethod: "POST",
            httpResponseType: "html",
            area: "LicensingRule",
            locationId: "74a9de62-9afc-4a60-a6d9-f7c65e028619",
            resource: "GroupLicensingRulesUserApplication",
            routeTemplate: "_apis/{area}/{resource}/{userId}",
            routeValues: {
                userId: userId
            },
            apiVersion: this.groupLicensingRulesUserApplicationApiVersion
        });
    }

    /**
     * [Preview API] Get Group License Rules for the given batch batch of group Ids
     *
     * @param {Contracts.GraphSubjectLookup} groupRuleLookup
     * @return IPromise<Contracts.GroupLicensingRule[]>
     */
    public lookupGroupLicensingRules(
        groupRuleLookup: Contracts.GraphSubjectLookup
        ): IPromise<Contracts.GroupLicensingRule[]> {

        return this._beginRequest<Contracts.GroupLicensingRule[]>({
            httpMethod: "POST",
            area: "LicensingRule",
            locationId: "6282b958-792b-4f26-b5c8-6d035e02289f",
            resource: "GroupLicensingRulesLookup",
            routeTemplate: "_apis/{area}/{resource}/",
            responseType: Contracts.TypeInfo.GroupLicensingRule,
            responseIsCollection: true,
            apiVersion: this.groupLicensingRulesLookupApiVersion,
            data: groupRuleLookup
        });
    }

    /**
     * [Preview API] Gets application status for the specific rule
     *
     * @param {string} operationId
     * @return IPromise<Contracts.ApplicationStatus>
     */
    public getApplicationStatus(
        operationId?: string
        ): IPromise<Contracts.ApplicationStatus> {

        return this._beginRequest<Contracts.ApplicationStatus>({
            httpMethod: "GET",
            area: "LicensingRule",
            locationId: "8953c613-d07f-43d3-a7bd-e9b66f960839",
            resource: "GroupLicensingRulesApplicationStatus",
            routeTemplate: "_apis/{area}/{resource}/{operationId}",
            responseType: Contracts.TypeInfo.ApplicationStatus,
            routeValues: {
                operationId: operationId
            },
            apiVersion: this.groupLicensingRulesApplicationStatusApiVersion
        });
    }

    /**
     * [Preview API] Applies group rules to the specified user
     *
     * @param {Contracts.RuleOption} ruleOption
     * @return IPromise<VSS_Operations_Contracts.OperationReference>
     */
    public applyGroupLicensingRulesToAllUsers(
        ruleOption?: Contracts.RuleOption
        ): IPromise<VSS_Operations_Contracts.OperationReference> {

        const queryValues: any = {
            ruleOption: ruleOption
        };

        return this._beginRequest<VSS_Operations_Contracts.OperationReference>({
            httpMethod: "POST",
            area: "LicensingRule",
            locationId: "14602853-288e-4711-a613-c3f27ffce285",
            resource: "GroupLicensingRulesApplication",
            routeTemplate: "_apis/{area}/{resource}/",
            responseType: VSS_Operations_Contracts.TypeInfo.OperationReference,
            queryParams: queryValues,
            apiVersion: this.groupLicensingRulesApplicationApiVersion
        });
    }

    /**
     * [Preview API] Update a group Licensing rule
     *
     * @param {Contracts.GroupLicensingRuleUpdate} licensingRuleUpdate - The update model for the Licensing Rule
     * @param {Contracts.RuleOption} ruleOption - Rule Option
     * @return IPromise<VSS_Operations_Contracts.OperationReference>
     */
    public updateGroupLicensingRule(
        licensingRuleUpdate: Contracts.GroupLicensingRuleUpdate,
        ruleOption?: Contracts.RuleOption
        ): IPromise<VSS_Operations_Contracts.OperationReference> {

        const queryValues: any = {
            ruleOption: ruleOption
        };

        return this._beginRequest<VSS_Operations_Contracts.OperationReference>({
            httpMethod: "PATCH",
            area: "LicensingRule",
            locationId: "1dae9af4-c85d-411b-b0c1-a46afaea1986",
            resource: "GroupLicensingRules",
            routeTemplate: "_apis/{area}/{resource}/{subjectDescriptor}",
            requestType: Contracts.TypeInfo.GroupLicensingRuleUpdate,
            responseType: VSS_Operations_Contracts.TypeInfo.OperationReference,
            queryParams: queryValues,
            apiVersion: this.groupLicensingRulesApiVersion,
            data: licensingRuleUpdate
        });
    }

    /**
     * [Preview API]
     *
     * @param {number} top
     * @param {number} skip
     * @return IPromise<Contracts.GroupLicensingRule[]>
     */
    public getGroupLicensingRules(
        top: number,
        skip?: number
        ): IPromise<Contracts.GroupLicensingRule[]> {

        const queryValues: any = {
            top: top,
            skip: skip
        };

        return this._beginRequest<Contracts.GroupLicensingRule[]>({
            httpMethod: "GET",
            area: "LicensingRule",
            locationId: "1dae9af4-c85d-411b-b0c1-a46afaea1986",
            resource: "GroupLicensingRules",
            routeTemplate: "_apis/{area}/{resource}/{subjectDescriptor}",
            responseType: Contracts.TypeInfo.GroupLicensingRule,
            responseIsCollection: true,
            queryParams: queryValues,
            apiVersion: this.groupLicensingRulesApiVersion
        });
    }

    /**
     * [Preview API] Gets the group Licensing rule for the group with given SubjectDescriptor
     *
     * @param {string} subjectDescriptor
     * @return IPromise<Contracts.GroupLicensingRule>
     */
    public getGroupLicensingRule(
        subjectDescriptor: string
        ): IPromise<Contracts.GroupLicensingRule> {

        return this._beginRequest<Contracts.GroupLicensingRule>({
            httpMethod: "GET",
            area: "LicensingRule",
            locationId: "1dae9af4-c85d-411b-b0c1-a46afaea1986",
            resource: "GroupLicensingRules",
            routeTemplate: "_apis/{area}/{resource}/{subjectDescriptor}",
            responseType: Contracts.TypeInfo.GroupLicensingRule,
            routeValues: {
                subjectDescriptor: subjectDescriptor
            },
            apiVersion: this.groupLicensingRulesApiVersion
        });
    }

    /**
     * [Preview API] Delete a group Licensing rule
     *
     * @param {string} subjectDescriptor - subjectDescriptor
     * @param {Contracts.RuleOption} ruleOption - Rule Option
     * @return IPromise<VSS_Operations_Contracts.OperationReference>
     */
    public deleteGroupLicenseRule(
        subjectDescriptor: string,
        ruleOption?: Contracts.RuleOption
        ): IPromise<VSS_Operations_Contracts.OperationReference> {

        const queryValues: any = {
            ruleOption: ruleOption
        };

        return this._beginRequest<VSS_Operations_Contracts.OperationReference>({
            httpMethod: "DELETE",
            area: "LicensingRule",
            locationId: "1dae9af4-c85d-411b-b0c1-a46afaea1986",
            resource: "GroupLicensingRules",
            routeTemplate: "_apis/{area}/{resource}/{subjectDescriptor}",
            responseType: VSS_Operations_Contracts.TypeInfo.OperationReference,
            routeValues: {
                subjectDescriptor: subjectDescriptor
            },
            queryParams: queryValues,
            apiVersion: this.groupLicensingRulesApiVersion
        });
    }

    /**
     * [Preview API] Add a new group Licensing rule asynchronously
     *
     * @param {Contracts.GroupLicensingRule} licensingRule - The Licensing Rule
     * @param {Contracts.RuleOption} ruleOption - Rule Option
     * @return IPromise<VSS_Operations_Contracts.OperationReference>
     */
    public addGroupLicensingRule(
        licensingRule: Contracts.GroupLicensingRule,
        ruleOption?: Contracts.RuleOption
        ): IPromise<VSS_Operations_Contracts.OperationReference> {

        const queryValues: any = {
            ruleOption: ruleOption
        };

        return this._beginRequest<VSS_Operations_Contracts.OperationReference>({
            httpMethod: "PUT",
            area: "LicensingRule",
            locationId: "1dae9af4-c85d-411b-b0c1-a46afaea1986",
            resource: "GroupLicensingRules",
            routeTemplate: "_apis/{area}/{resource}/{subjectDescriptor}",
            requestType: Contracts.TypeInfo.GroupLicensingRule,
            responseType: VSS_Operations_Contracts.TypeInfo.OperationReference,
            queryParams: queryValues,
            apiVersion: this.groupLicensingRulesApiVersion,
            data: licensingRule
        });
    }
}

/**
 * @exemptedapi
 */
export class LicensingRuleHttpClient5 extends CommonMethods2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.groupLicensingRulesApiVersion =
        this.groupLicensingRulesApplicationApiVersion =
        this.groupLicensingRulesApplicationStatusApiVersion =
        this.groupLicensingRulesLookupApiVersion =
        this.groupLicensingRulesUserApplicationApiVersion = "5.0-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class LicensingRuleHttpClient4_1 extends CommonMethods2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.groupLicensingRulesApiVersion =
        this.groupLicensingRulesApplicationApiVersion =
        this.groupLicensingRulesApplicationStatusApiVersion =
        this.groupLicensingRulesLookupApiVersion =
        this.groupLicensingRulesUserApplicationApiVersion = "4.1-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class LicensingRuleHttpClient4 extends CommonMethods2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.groupLicensingRulesApiVersion =
        this.groupLicensingRulesApplicationApiVersion =
        this.groupLicensingRulesApplicationStatusApiVersion =
        this.groupLicensingRulesLookupApiVersion =
        this.groupLicensingRulesUserApplicationApiVersion = "4.0-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class LicensingRuleHttpClient3_2 extends CommonMethods2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.groupLicensingRulesApiVersion =
        this.groupLicensingRulesApplicationApiVersion =
        this.groupLicensingRulesApplicationStatusApiVersion =
        this.groupLicensingRulesLookupApiVersion =
        this.groupLicensingRulesUserApplicationApiVersion = "3.2-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class LicensingRuleHttpClient3_1 extends CommonMethods2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.groupLicensingRulesApiVersion =
        this.groupLicensingRulesApplicationApiVersion =
        this.groupLicensingRulesApplicationStatusApiVersion =
        this.groupLicensingRulesLookupApiVersion =
        this.groupLicensingRulesUserApplicationApiVersion = "3.1-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class LicensingRuleHttpClient3 extends CommonMethods2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.groupLicensingRulesApiVersion =
        this.groupLicensingRulesApplicationApiVersion =
        this.groupLicensingRulesApplicationStatusApiVersion =
        this.groupLicensingRulesLookupApiVersion =
        this.groupLicensingRulesUserApplicationApiVersion = "3.0-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class LicensingRuleHttpClient2_3 extends CommonMethods2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.groupLicensingRulesApiVersion =
        this.groupLicensingRulesApplicationApiVersion =
        this.groupLicensingRulesApplicationStatusApiVersion =
        this.groupLicensingRulesLookupApiVersion =
        this.groupLicensingRulesUserApplicationApiVersion = "2.3-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class LicensingRuleHttpClient2_2 extends CommonMethods2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.groupLicensingRulesApiVersion =
        this.groupLicensingRulesApplicationApiVersion =
        this.groupLicensingRulesApplicationStatusApiVersion =
        this.groupLicensingRulesLookupApiVersion =
        this.groupLicensingRulesUserApplicationApiVersion = "2.2-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class LicensingRuleHttpClient2_1 extends CommonMethods2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.groupLicensingRulesApiVersion =
        this.groupLicensingRulesApplicationApiVersion =
        this.groupLicensingRulesApplicationStatusApiVersion =
        this.groupLicensingRulesLookupApiVersion =
        this.groupLicensingRulesUserApplicationApiVersion = "2.1-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class LicensingRuleHttpClient2 extends CommonMethods2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.groupLicensingRulesApiVersion =
        this.groupLicensingRulesApplicationApiVersion =
        this.groupLicensingRulesApplicationStatusApiVersion =
        this.groupLicensingRulesLookupApiVersion =
        this.groupLicensingRulesUserApplicationApiVersion = "2.0-preview.1";
    }
}

export class LicensingRuleHttpClient extends LicensingRuleHttpClient5 {
    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
    }
}

const clientMapping: { [id: string]: new (routeRequestPath: string) => VSS_WebApi.VssHttpClient; } = {
    "5.0": LicensingRuleHttpClient5,
    "4.1": LicensingRuleHttpClient4_1,
    "4.0": LicensingRuleHttpClient4,
    "3.2": LicensingRuleHttpClient3_2,
    "3.1": LicensingRuleHttpClient3_1,
    "3.0": LicensingRuleHttpClient3,
    "2.3": LicensingRuleHttpClient2_3,
    "2.2": LicensingRuleHttpClient2_2,
    "2.1": LicensingRuleHttpClient2_1,
    "2.0": LicensingRuleHttpClient2
}

/**
 * Gets an http client targeting the latest released version of the APIs.
 *
 * @return LicensingRuleHttpClient5
 */
export function getClient(options?: VSS_WebApi.IVssHttpClientOptions): LicensingRuleHttpClient5 {
    if ((<any>window).VSS && (<any>window).VSS.VssSDKRestVersion && clientMapping[(<any>window).VSS.VssSDKRestVersion]) {
        return VSS_Service.getClient<LicensingRuleHttpClient5>(<any>(clientMapping[(<any>window).VSS.VssSDKRestVersion]), undefined, undefined, undefined, options);
    }
    else {
        return VSS_Service.getClient<LicensingRuleHttpClient5>(LicensingRuleHttpClient5, undefined, undefined, undefined, options);
    }
}
