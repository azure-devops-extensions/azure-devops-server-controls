/**
 * ---------------------------------------------------------
 * Generated file, DO NOT EDIT
 * ---------------------------------------------------------
 *
 * See following wiki page for instructions on how to regenerate:
 *   https://aka.ms/azure-devops-client-generation
 *
 * Configuration file:
 *   tfs\client\policy\clientgeneratorconfigs\genclient.json
 */

"use strict";

import TFS_Policy_Contracts = require("Policy/Scripts/Generated/TFS.Policy.Contracts");
import VSS_Service = require("VSS/Service");
import VSS_WebApi = require("VSS/WebApi/RestClient");
import VSS_WebApi_Constants = require("VSS/WebApi/Constants");

export class CommonMethods2To5 extends VSS_WebApi.VssHttpClient {

    public static serviceInstanceId = VSS_WebApi_Constants.ServiceInstanceTypes.TFS;
    protected configurationsApiVersion: string;
    protected evaluationsApiVersion: string;
    protected evaluationsApiVersion_46aecb7a: string;
    protected revisionsApiVersion: string;
    protected typesApiVersion: string;

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
    }

    /**
     * Retrieve all available policy types.
     *
     * @param {string} project - Project ID or project name
     * @return IPromise<TFS_Policy_Contracts.PolicyType[]>
     */
    public getPolicyTypes(
        project: string
        ): IPromise<TFS_Policy_Contracts.PolicyType[]> {

        return this._beginRequest<TFS_Policy_Contracts.PolicyType[]>({
            httpMethod: "GET",
            area: "policy",
            locationId: "44096322-2d3d-466a-bb30-d1b7de69f61f",
            resource: "Types",
            routeTemplate: "{project}/_apis/{area}/{resource}/{typeId}",
            responseIsCollection: true,
            routeValues: {
                project: project
            },
            apiVersion: this.typesApiVersion
        });
    }

    /**
     * Retrieve a specific policy type by ID.
     *
     * @param {string} project - Project ID or project name
     * @param {string} typeId - The policy ID.
     * @return IPromise<TFS_Policy_Contracts.PolicyType>
     */
    public getPolicyType(
        project: string,
        typeId: string
        ): IPromise<TFS_Policy_Contracts.PolicyType> {

        return this._beginRequest<TFS_Policy_Contracts.PolicyType>({
            httpMethod: "GET",
            area: "policy",
            locationId: "44096322-2d3d-466a-bb30-d1b7de69f61f",
            resource: "Types",
            routeTemplate: "{project}/_apis/{area}/{resource}/{typeId}",
            routeValues: {
                project: project,
                typeId: typeId
            },
            apiVersion: this.typesApiVersion
        });
    }

    /**
     * Retrieve all revisions for a given policy.
     *
     * @param {string} project - Project ID or project name
     * @param {number} configurationId - The policy configuration ID.
     * @param {number} top - The number of revisions to retrieve.
     * @param {number} skip - The number of revisions to ignore. For example, to retrieve results 101-150, set top to 50 and skip to 100.
     * @return IPromise<TFS_Policy_Contracts.PolicyConfiguration[]>
     */
    public getPolicyConfigurationRevisions(
        project: string,
        configurationId: number,
        top?: number,
        skip?: number
        ): IPromise<TFS_Policy_Contracts.PolicyConfiguration[]> {

        const queryValues: any = {
            '$top': top,
            '$skip': skip
        };

        return this._beginRequest<TFS_Policy_Contracts.PolicyConfiguration[]>({
            httpMethod: "GET",
            area: "policy",
            locationId: "fe1e68a2-60d3-43cb-855b-85e41ae97c95",
            resource: "Revisions",
            routeTemplate: "{project}/_apis/{area}/configurations/{configurationId}/{resource}/{revisionId}",
            responseType: TFS_Policy_Contracts.TypeInfo.PolicyConfiguration,
            responseIsCollection: true,
            routeValues: {
                project: project,
                configurationId: configurationId
            },
            queryParams: queryValues,
            apiVersion: this.revisionsApiVersion
        });
    }

    /**
     * Retrieve a specific revision of a given policy by ID.
     *
     * @param {string} project - Project ID or project name
     * @param {number} configurationId - The policy configuration ID.
     * @param {number} revisionId - The revision ID.
     * @return IPromise<TFS_Policy_Contracts.PolicyConfiguration>
     */
    public getPolicyConfigurationRevision(
        project: string,
        configurationId: number,
        revisionId: number
        ): IPromise<TFS_Policy_Contracts.PolicyConfiguration> {

        return this._beginRequest<TFS_Policy_Contracts.PolicyConfiguration>({
            httpMethod: "GET",
            area: "policy",
            locationId: "fe1e68a2-60d3-43cb-855b-85e41ae97c95",
            resource: "Revisions",
            routeTemplate: "{project}/_apis/{area}/configurations/{configurationId}/{resource}/{revisionId}",
            responseType: TFS_Policy_Contracts.TypeInfo.PolicyConfiguration,
            routeValues: {
                project: project,
                configurationId: configurationId,
                revisionId: revisionId
            },
            apiVersion: this.revisionsApiVersion
        });
    }

    /**
     * @exemptedapi
     * [Preview API] Retrieves a list of all the policy evaluation statuses for a specific pull request.
     *
     * @param {string} project - Project ID or project name
     * @param {string} artifactId - A string which uniquely identifies the target of a policy evaluation.
     * @param {boolean} includeNotApplicable - Some policies might determine that they do not apply to a specific pull request. Setting this parameter to true will return evaluation records even for policies which don't apply to this pull request.
     * @param {number} top - The number of policy evaluation records to retrieve.
     * @param {number} skip - The number of policy evaluation records to ignore. For example, to retrieve results 101-150, set top to 50 and skip to 100.
     * @return IPromise<TFS_Policy_Contracts.PolicyEvaluationRecord[]>
     */
    public getPolicyEvaluations(
        project: string,
        artifactId: string,
        includeNotApplicable?: boolean,
        top?: number,
        skip?: number
        ): IPromise<TFS_Policy_Contracts.PolicyEvaluationRecord[]> {

        const queryValues: any = {
            artifactId: artifactId,
            includeNotApplicable: includeNotApplicable,
            '$top': top,
            '$skip': skip
        };

        return this._beginRequest<TFS_Policy_Contracts.PolicyEvaluationRecord[]>({
            httpMethod: "GET",
            area: "policy",
            locationId: "c23ddff5-229c-4d04-a80b-0fdce9f360c8",
            resource: "Evaluations",
            routeTemplate: "{project}/_apis/{area}/{resource}",
            responseType: TFS_Policy_Contracts.TypeInfo.PolicyEvaluationRecord,
            responseIsCollection: true,
            routeValues: {
                project: project
            },
            queryParams: queryValues,
            apiVersion: this.evaluationsApiVersion
        });
    }

    /**
     * @exemptedapi
     * [Preview API] Requeue the policy evaluation.
     *
     * @param {string} project - Project ID or project name
     * @param {string} evaluationId - ID of the policy evaluation to be retrieved.
     * @return IPromise<TFS_Policy_Contracts.PolicyEvaluationRecord>
     */
    public requeuePolicyEvaluation(
        project: string,
        evaluationId: string
        ): IPromise<TFS_Policy_Contracts.PolicyEvaluationRecord> {

        return this._beginRequest<TFS_Policy_Contracts.PolicyEvaluationRecord>({
            httpMethod: "PATCH",
            area: "policy",
            locationId: "46aecb7a-5d2c-4647-897b-0209505a9fe4",
            resource: "Evaluations",
            routeTemplate: "{project}/_apis/{area}/{resource}/{evaluationId}",
            responseType: TFS_Policy_Contracts.TypeInfo.PolicyEvaluationRecord,
            routeValues: {
                project: project,
                evaluationId: evaluationId
            },
            apiVersion: this.evaluationsApiVersion_46aecb7a
        });
    }

    /**
     * @exemptedapi
     * [Preview API] Gets the present evaluation state of a policy.
     *
     * @param {string} project - Project ID or project name
     * @param {string} evaluationId - ID of the policy evaluation to be retrieved.
     * @return IPromise<TFS_Policy_Contracts.PolicyEvaluationRecord>
     */
    public getPolicyEvaluation(
        project: string,
        evaluationId: string
        ): IPromise<TFS_Policy_Contracts.PolicyEvaluationRecord> {

        return this._beginRequest<TFS_Policy_Contracts.PolicyEvaluationRecord>({
            httpMethod: "GET",
            area: "policy",
            locationId: "46aecb7a-5d2c-4647-897b-0209505a9fe4",
            resource: "Evaluations",
            routeTemplate: "{project}/_apis/{area}/{resource}/{evaluationId}",
            responseType: TFS_Policy_Contracts.TypeInfo.PolicyEvaluationRecord,
            routeValues: {
                project: project,
                evaluationId: evaluationId
            },
            apiVersion: this.evaluationsApiVersion_46aecb7a
        });
    }

    /**
     * Update a policy configuration by its ID.
     *
     * @param {TFS_Policy_Contracts.PolicyConfiguration} configuration - The policy configuration to update.
     * @param {string} project - Project ID or project name
     * @param {number} configurationId - ID of the existing policy configuration to be updated.
     * @return IPromise<TFS_Policy_Contracts.PolicyConfiguration>
     */
    public updatePolicyConfiguration(
        configuration: TFS_Policy_Contracts.PolicyConfiguration,
        project: string,
        configurationId: number
        ): IPromise<TFS_Policy_Contracts.PolicyConfiguration> {

        return this._beginRequest<TFS_Policy_Contracts.PolicyConfiguration>({
            httpMethod: "PUT",
            area: "policy",
            locationId: "dad91cbe-d183-45f8-9c6e-9c1164472121",
            resource: "Configurations",
            routeTemplate: "{project}/_apis/{area}/{resource}/{configurationId}",
            requestType: TFS_Policy_Contracts.TypeInfo.PolicyConfiguration,
            responseType: TFS_Policy_Contracts.TypeInfo.PolicyConfiguration,
            routeValues: {
                project: project,
                configurationId: configurationId
            },
            apiVersion: this.configurationsApiVersion,
            data: configuration
        });
    }

    /**
     * Get a list of policy configurations in a project.
     *
     * @param {string} project - Project ID or project name
     * @param {string} scope - [Provided for legacy reasons] The scope on which a subset of policies is defined.
     * @param {string} policyType - Filter returned policies to only this type
     * @return IPromise<TFS_Policy_Contracts.PolicyConfiguration[]>
     */
    public getPolicyConfigurations(
        project: string,
        scope?: string,
        policyType?: string
        ): IPromise<TFS_Policy_Contracts.PolicyConfiguration[]> {

        const queryValues: any = {
            scope: scope,
            policyType: policyType
        };

        return this._beginRequest<TFS_Policy_Contracts.PolicyConfiguration[]>({
            httpMethod: "GET",
            area: "policy",
            locationId: "dad91cbe-d183-45f8-9c6e-9c1164472121",
            resource: "Configurations",
            routeTemplate: "{project}/_apis/{area}/{resource}/{configurationId}",
            responseType: TFS_Policy_Contracts.TypeInfo.PolicyConfiguration,
            responseIsCollection: true,
            routeValues: {
                project: project
            },
            queryParams: queryValues,
            apiVersion: this.configurationsApiVersion
        });
    }

    /**
     * Get a policy configuration by its ID.
     *
     * @param {string} project - Project ID or project name
     * @param {number} configurationId - ID of the policy configuration
     * @return IPromise<TFS_Policy_Contracts.PolicyConfiguration>
     */
    public getPolicyConfiguration(
        project: string,
        configurationId: number
        ): IPromise<TFS_Policy_Contracts.PolicyConfiguration> {

        return this._beginRequest<TFS_Policy_Contracts.PolicyConfiguration>({
            httpMethod: "GET",
            area: "policy",
            locationId: "dad91cbe-d183-45f8-9c6e-9c1164472121",
            resource: "Configurations",
            routeTemplate: "{project}/_apis/{area}/{resource}/{configurationId}",
            responseType: TFS_Policy_Contracts.TypeInfo.PolicyConfiguration,
            routeValues: {
                project: project,
                configurationId: configurationId
            },
            apiVersion: this.configurationsApiVersion
        });
    }

    /**
     * Delete a policy configuration by its ID.
     *
     * @param {string} project - Project ID or project name
     * @param {number} configurationId - ID of the policy configuration to delete.
     * @return IPromise<void>
     */
    public deletePolicyConfiguration(
        project: string,
        configurationId: number
        ): IPromise<void> {

        return this._beginRequest<void>({
            httpMethod: "DELETE",
            httpResponseType: "html",
            area: "policy",
            locationId: "dad91cbe-d183-45f8-9c6e-9c1164472121",
            resource: "Configurations",
            routeTemplate: "{project}/_apis/{area}/{resource}/{configurationId}",
            routeValues: {
                project: project,
                configurationId: configurationId
            },
            apiVersion: this.configurationsApiVersion
        });
    }

    /**
     * Create a policy configuration of a given policy type.
     *
     * @param {TFS_Policy_Contracts.PolicyConfiguration} configuration - The policy configuration to create.
     * @param {string} project - Project ID or project name
     * @param {number} configurationId
     * @return IPromise<TFS_Policy_Contracts.PolicyConfiguration>
     */
    public createPolicyConfiguration(
        configuration: TFS_Policy_Contracts.PolicyConfiguration,
        project: string,
        configurationId?: number
        ): IPromise<TFS_Policy_Contracts.PolicyConfiguration> {

        return this._beginRequest<TFS_Policy_Contracts.PolicyConfiguration>({
            httpMethod: "POST",
            area: "policy",
            locationId: "dad91cbe-d183-45f8-9c6e-9c1164472121",
            resource: "Configurations",
            routeTemplate: "{project}/_apis/{area}/{resource}/{configurationId}",
            requestType: TFS_Policy_Contracts.TypeInfo.PolicyConfiguration,
            responseType: TFS_Policy_Contracts.TypeInfo.PolicyConfiguration,
            routeValues: {
                project: project,
                configurationId: configurationId
            },
            apiVersion: this.configurationsApiVersion,
            data: configuration
        });
    }
}

/**
 * @exemptedapi
 */
export class PolicyHttpClient5 extends CommonMethods2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.configurationsApiVersion =
        this.revisionsApiVersion =
        this.typesApiVersion = "5.0";
        this.evaluationsApiVersion =
        this.evaluationsApiVersion_46aecb7a = "5.0-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class PolicyHttpClient4_1 extends CommonMethods2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.configurationsApiVersion =
        this.revisionsApiVersion =
        this.typesApiVersion = "4.1";
        this.evaluationsApiVersion =
        this.evaluationsApiVersion_46aecb7a = "4.1-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class PolicyHttpClient4 extends CommonMethods2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.configurationsApiVersion =
        this.revisionsApiVersion =
        this.typesApiVersion = "4.0";
        this.evaluationsApiVersion =
        this.evaluationsApiVersion_46aecb7a = "4.0-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class PolicyHttpClient3_2 extends CommonMethods2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.configurationsApiVersion =
        this.revisionsApiVersion =
        this.typesApiVersion = "3.2";
        this.evaluationsApiVersion =
        this.evaluationsApiVersion_46aecb7a = "3.2-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class PolicyHttpClient3_1 extends CommonMethods2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.configurationsApiVersion =
        this.revisionsApiVersion =
        this.typesApiVersion = "3.1";
        this.evaluationsApiVersion =
        this.evaluationsApiVersion_46aecb7a = "3.1-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class PolicyHttpClient3 extends CommonMethods2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.configurationsApiVersion =
        this.revisionsApiVersion =
        this.typesApiVersion = "3.0";
        this.evaluationsApiVersion =
        this.evaluationsApiVersion_46aecb7a = "3.0-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class PolicyHttpClient2_3 extends CommonMethods2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.configurationsApiVersion =
        this.revisionsApiVersion =
        this.typesApiVersion = "2.3";
        this.evaluationsApiVersion =
        this.evaluationsApiVersion_46aecb7a = "2.3-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class PolicyHttpClient2_2 extends CommonMethods2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.configurationsApiVersion =
        this.revisionsApiVersion =
        this.typesApiVersion = "2.2";
        this.evaluationsApiVersion =
        this.evaluationsApiVersion_46aecb7a = "2.2-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class PolicyHttpClient2_1 extends CommonMethods2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.configurationsApiVersion =
        this.revisionsApiVersion =
        this.typesApiVersion = "2.1";
        this.evaluationsApiVersion =
        this.evaluationsApiVersion_46aecb7a = "2.1-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class PolicyHttpClient2 extends CommonMethods2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.configurationsApiVersion =
        this.revisionsApiVersion =
        this.typesApiVersion = "2.0";
        this.evaluationsApiVersion =
        this.evaluationsApiVersion_46aecb7a = "2.0-preview.1";
    }
}

export class PolicyHttpClient extends PolicyHttpClient5 {
    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
    }
}

const clientMapping: { [id: string]: new (routeRequestPath: string) => VSS_WebApi.VssHttpClient; } = {
    "5.0": PolicyHttpClient5,
    "4.1": PolicyHttpClient4_1,
    "4.0": PolicyHttpClient4,
    "3.2": PolicyHttpClient3_2,
    "3.1": PolicyHttpClient3_1,
    "3.0": PolicyHttpClient3,
    "2.3": PolicyHttpClient2_3,
    "2.2": PolicyHttpClient2_2,
    "2.1": PolicyHttpClient2_1,
    "2.0": PolicyHttpClient2
}

/**
 * Gets an http client targeting the latest released version of the APIs.
 *
 * @return PolicyHttpClient5
 */
export function getClient(options?: VSS_WebApi.IVssHttpClientOptions): PolicyHttpClient5 {
    if ((<any>window).VSS && (<any>window).VSS.VssSDKRestVersion && clientMapping[(<any>window).VSS.VssSDKRestVersion]) {
        return VSS_Service.getClient<PolicyHttpClient5>(<any>(clientMapping[(<any>window).VSS.VssSDKRestVersion]), undefined, undefined, undefined, options);
    }
    else {
        return VSS_Service.getClient<PolicyHttpClient5>(PolicyHttpClient5, undefined, undefined, undefined, options);
    }
}
