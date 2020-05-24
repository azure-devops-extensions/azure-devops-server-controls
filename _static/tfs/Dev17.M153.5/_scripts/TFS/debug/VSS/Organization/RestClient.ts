/**
 * ---------------------------------------------------------
 * Generated file, DO NOT EDIT
 * ---------------------------------------------------------
 *
 * See following wiki page for instructions on how to regenerate:
 *   https://aka.ms/azure-devops-client-generation
 *
 * Configuration file:
 *   vssf\client\webapi\httpclients\clientgeneratorconfigs\organization.genclient.json
 */

"use strict";

import Contracts = require("VSS/Organization/Contracts");
import VSS_Common_Contracts = require("VSS/WebApi/Contracts");
import VSS_Service = require("VSS/Service");
import VSS_WebApi = require("VSS/WebApi/RestClient");
import VSS_WebApi_Constants = require("VSS/WebApi/Constants");

export class CommonMethods3To5 extends VSS_WebApi.VssHttpClient {

    public static serviceInstanceId = VSS_WebApi_Constants.ServiceInstanceTypes.SPS;
    protected collectionPropertiesApiVersion: string;
    protected collectionsApiVersion: string;
    protected organizationLogoApiVersion: string;
    protected organizationMigrationBlobsApiVersion: string;
    protected organizationPropertiesApiVersion: string;
    protected organizationsApiVersion: string;
    protected regionsApiVersion: string;

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
    }

    /**
     * [Preview API]
     *
     * @param {boolean} includeRegionsWithNoAvailableHosts
     * @param {string} impersonatedUser
     * @return IPromise<Contracts.Region[]>
     */
    public getRegions(
        includeRegionsWithNoAvailableHosts?: boolean,
        impersonatedUser?: string
        ): IPromise<Contracts.Region[]> {

        const queryValues: any = {
            includeRegionsWithNoAvailableHosts: includeRegionsWithNoAvailableHosts,
            impersonatedUser: impersonatedUser
        };

        return this._beginRequest<Contracts.Region[]>({
            httpMethod: "GET",
            area: "Organization",
            locationId: "6f84936f-1801-46f6-94fa-1817545d366d",
            resource: "Regions",
            routeTemplate: "_apis/{area}/{resource}",
            responseIsCollection: true,
            queryParams: queryValues,
            apiVersion: this.regionsApiVersion
        });
    }

    /**
     * [Preview API]
     *
     * @param {VSS_Common_Contracts.JsonPatchDocument} patchDocument
     * @param {string} organizationId
     * @return IPromise<Contracts.Organization>
     */
    public updateOrganization(
        patchDocument: VSS_Common_Contracts.JsonPatchDocument,
        organizationId: string
        ): IPromise<Contracts.Organization> {

        return this._beginRequest<Contracts.Organization>({
            httpMethod: "PATCH",
            area: "Organization",
            locationId: "95f49097-6cdc-4afe-a039-48b4d4c4cbf7",
            resource: "Organizations",
            routeTemplate: "_apis/{area}/{resource}/{organizationId}",
            responseType: Contracts.TypeInfo.Organization,
            routeValues: {
                organizationId: organizationId
            },
            customHeaders: {
                "Content-Type": "application/json-patch+json",
            },
            apiVersion: this.organizationsApiVersion,
            data: patchDocument
        });
    }

    /**
     * [Preview API]
     *
     * @param {Contracts.OrganizationSearchKind} searchKind
     * @param {string} searchValue
     * @param {boolean} isActivated
     * @return IPromise<Contracts.Organization[]>
     */
    public getOrganizations(
        searchKind: Contracts.OrganizationSearchKind,
        searchValue: string,
        isActivated?: boolean
        ): IPromise<Contracts.Organization[]> {

        const queryValues: any = {
            searchKind: searchKind,
            searchValue: searchValue,
            isActivated: isActivated
        };

        return this._beginRequest<Contracts.Organization[]>({
            httpMethod: "GET",
            area: "Organization",
            locationId: "95f49097-6cdc-4afe-a039-48b4d4c4cbf7",
            resource: "Organizations",
            routeTemplate: "_apis/{area}/{resource}/{organizationId}",
            responseType: Contracts.TypeInfo.Organization,
            responseIsCollection: true,
            queryParams: queryValues,
            apiVersion: this.organizationsApiVersion
        });
    }

    /**
     * [Preview API]
     *
     * @param {string} organizationId
     * @param {string[]} propertyNames
     * @return IPromise<Contracts.Organization>
     */
    public getOrganization(
        organizationId: string,
        propertyNames?: string[]
        ): IPromise<Contracts.Organization> {

        const queryValues: any = {
            propertyNames: propertyNames && propertyNames.join(",")
        };

        return this._beginRequest<Contracts.Organization>({
            httpMethod: "GET",
            area: "Organization",
            locationId: "95f49097-6cdc-4afe-a039-48b4d4c4cbf7",
            resource: "Organizations",
            routeTemplate: "_apis/{area}/{resource}/{organizationId}",
            responseType: Contracts.TypeInfo.Organization,
            routeValues: {
                organizationId: organizationId
            },
            queryParams: queryValues,
            apiVersion: this.organizationsApiVersion
        });
    }

    /**
     * [Preview API]
     *
     * @param {Contracts.Organization} resource
     * @return IPromise<Contracts.Organization>
     */
    public createOrganization(
        resource: Contracts.Organization
        ): IPromise<Contracts.Organization> {

        return this._beginRequest<Contracts.Organization>({
            httpMethod: "POST",
            area: "Organization",
            locationId: "95f49097-6cdc-4afe-a039-48b4d4c4cbf7",
            resource: "Organizations",
            routeTemplate: "_apis/{area}/{resource}/{organizationId}",
            requestType: Contracts.TypeInfo.Organization,
            responseType: Contracts.TypeInfo.Organization,
            apiVersion: this.organizationsApiVersion,
            data: resource
        });
    }

    /**
     * [Preview API]
     *
     * @param {string} organizationId
     * @param {VSS_Common_Contracts.JsonPatchDocument} patchDocument
     * @return IPromise<boolean>
     */
    public updateOrganizationProperties(
        organizationId: string,
        patchDocument: VSS_Common_Contracts.JsonPatchDocument
        ): IPromise<boolean> {

        return this._beginRequest<boolean>({
            httpMethod: "PATCH",
            area: "Organization",
            locationId: "103707c6-236d-4434-a0a2-9031fbb65fa6",
            resource: "OrganizationProperties",
            routeTemplate: "_apis/{area}/Organizations/{organizationId}/Properties",
            routeValues: {
                organizationId: organizationId
            },
            customHeaders: {
                "Content-Type": "application/json-patch+json",
            },
            apiVersion: this.organizationPropertiesApiVersion,
            data: patchDocument
        });
    }

    /**
     * [Preview API]
     *
     * @param {Contracts.OrganizationMigrationBlob} migrationBlob
     * @return IPromise<void>
     */
    public importOrganizationMigrationBlob(
        migrationBlob: Contracts.OrganizationMigrationBlob
        ): IPromise<void> {

        return this._beginRequest<void>({
            httpMethod: "POST",
            httpResponseType: "html",
            area: "Organization",
            locationId: "93f69239-28ba-497e-b4d4-33e51e6303c3",
            resource: "OrganizationMigrationBlobs",
            routeTemplate: "_apis/{area}/{resource}/{organizationId}",
            apiVersion: this.organizationMigrationBlobsApiVersion,
            data: migrationBlob
        });
    }

    /**
     * [Preview API]
     *
     * @param {string} organizationId
     * @return IPromise<Contracts.OrganizationMigrationBlob>
     */
    public exportOrganizationMigrationBlob(
        organizationId: string
        ): IPromise<Contracts.OrganizationMigrationBlob> {

        return this._beginRequest<Contracts.OrganizationMigrationBlob>({
            httpMethod: "GET",
            area: "Organization",
            locationId: "93f69239-28ba-497e-b4d4-33e51e6303c3",
            resource: "OrganizationMigrationBlobs",
            routeTemplate: "_apis/{area}/{resource}/{organizationId}",
            routeValues: {
                organizationId: organizationId
            },
            apiVersion: this.organizationMigrationBlobsApiVersion
        });
    }

    /**
     * [Preview API]
     *
     * @param {string} organizationId
     * @param {Contracts.Logo} logo
     * @return IPromise<boolean>
     */
    public updateOrganizationLogo(
        organizationId: string,
        logo: Contracts.Logo
        ): IPromise<boolean> {

        return this._beginRequest<boolean>({
            httpMethod: "POST",
            area: "Organization",
            locationId: "a9eeec19-85b4-40ae-8a52-b4f697260ac4",
            resource: "OrganizationLogo",
            routeTemplate: "_apis/{area}/Organizations/{organizationId}/Logo",
            routeValues: {
                organizationId: organizationId
            },
            apiVersion: this.organizationLogoApiVersion,
            data: logo
        });
    }

    /**
     * [Preview API]
     *
     * @param {VSS_Common_Contracts.JsonPatchDocument} patchDocument
     * @param {string} collectionId
     * @return IPromise<Contracts.Collection>
     */
    public updateCollection(
        patchDocument: VSS_Common_Contracts.JsonPatchDocument,
        collectionId: string
        ): IPromise<Contracts.Collection> {

        return this._beginRequest<Contracts.Collection>({
            httpMethod: "PATCH",
            area: "Organization",
            locationId: "668b5607-0db2-49bb-83f8-5f46f1094250",
            resource: "Collections",
            routeTemplate: "_apis/{area}/{resource}/{collectionId}",
            responseType: Contracts.TypeInfo.Collection,
            routeValues: {
                collectionId: collectionId
            },
            customHeaders: {
                "Content-Type": "application/json-patch+json",
            },
            apiVersion: this.collectionsApiVersion,
            data: patchDocument
        });
    }

    /**
     * [Preview API]
     *
     * @param {string} collectionId
     * @param {string} collectionName
     * @return IPromise<boolean>
     */
    public restoreCollection(
        collectionId: string,
        collectionName: string
        ): IPromise<boolean> {

        const queryValues: any = {
            collectionName: collectionName
        };

        return this._beginRequest<boolean>({
            httpMethod: "PATCH",
            area: "Organization",
            locationId: "668b5607-0db2-49bb-83f8-5f46f1094250",
            resource: "Collections",
            routeTemplate: "_apis/{area}/{resource}/{collectionId}",
            routeValues: {
                collectionId: collectionId
            },
            queryParams: queryValues,
            apiVersion: this.collectionsApiVersion
        });
    }

    /**
     * [Preview API]
     *
     * @param {Contracts.CollectionSearchKind} searchKind
     * @param {string} searchValue
     * @param {boolean} includeDeletedCollections
     * @return IPromise<Contracts.Collection[]>
     */
    public getCollections(
        searchKind?: Contracts.CollectionSearchKind,
        searchValue?: string,
        includeDeletedCollections?: boolean
        ): IPromise<Contracts.Collection[]> {

        const queryValues: any = {
            searchKind: searchKind,
            searchValue: searchValue,
            includeDeletedCollections: includeDeletedCollections
        };

        return this._beginRequest<Contracts.Collection[]>({
            httpMethod: "GET",
            area: "Organization",
            locationId: "668b5607-0db2-49bb-83f8-5f46f1094250",
            resource: "Collections",
            routeTemplate: "_apis/{area}/{resource}/{collectionId}",
            responseType: Contracts.TypeInfo.Collection,
            responseIsCollection: true,
            queryParams: queryValues,
            apiVersion: this.collectionsApiVersion
        });
    }

    /**
     * [Preview API]
     *
     * @param {string} collectionId
     * @param {string[]} propertyNames
     * @return IPromise<Contracts.Collection>
     */
    public getCollection(
        collectionId: string,
        propertyNames?: string[]
        ): IPromise<Contracts.Collection> {

        const queryValues: any = {
            propertyNames: propertyNames && propertyNames.join(",")
        };

        return this._beginRequest<Contracts.Collection>({
            httpMethod: "GET",
            area: "Organization",
            locationId: "668b5607-0db2-49bb-83f8-5f46f1094250",
            resource: "Collections",
            routeTemplate: "_apis/{area}/{resource}/{collectionId}",
            responseType: Contracts.TypeInfo.Collection,
            routeValues: {
                collectionId: collectionId
            },
            queryParams: queryValues,
            apiVersion: this.collectionsApiVersion
        });
    }

    /**
     * [Preview API]
     *
     * @param {string} collectionId
     * @param {number} gracePeriodToRestoreInHours
     * @param {boolean} violatedTerms
     * @return IPromise<boolean>
     */
    public deleteCollection(
        collectionId: string,
        gracePeriodToRestoreInHours?: number,
        violatedTerms?: boolean
        ): IPromise<boolean> {

        const queryValues: any = {
            gracePeriodToRestoreInHours: gracePeriodToRestoreInHours,
            violatedTerms: violatedTerms
        };

        return this._beginRequest<boolean>({
            httpMethod: "DELETE",
            area: "Organization",
            locationId: "668b5607-0db2-49bb-83f8-5f46f1094250",
            resource: "Collections",
            routeTemplate: "_apis/{area}/{resource}/{collectionId}",
            routeValues: {
                collectionId: collectionId
            },
            queryParams: queryValues,
            apiVersion: this.collectionsApiVersion
        });
    }

    /**
     * [Preview API]
     *
     * @param {Contracts.Collection} resource
     * @return IPromise<Contracts.Collection>
     */
    public createCollection(
        resource: Contracts.Collection
        ): IPromise<Contracts.Collection> {

        return this._beginRequest<Contracts.Collection>({
            httpMethod: "POST",
            area: "Organization",
            locationId: "668b5607-0db2-49bb-83f8-5f46f1094250",
            resource: "Collections",
            routeTemplate: "_apis/{area}/{resource}/{collectionId}",
            requestType: Contracts.TypeInfo.Collection,
            responseType: Contracts.TypeInfo.Collection,
            apiVersion: this.collectionsApiVersion,
            data: resource
        });
    }

    /**
     * [Preview API]
     *
     * @param {string} collectionId
     * @param {VSS_Common_Contracts.JsonPatchDocument} patchDocument
     * @return IPromise<boolean>
     */
    public updateCollectionProperties(
        collectionId: string,
        patchDocument: VSS_Common_Contracts.JsonPatchDocument
        ): IPromise<boolean> {

        return this._beginRequest<boolean>({
            httpMethod: "PATCH",
            area: "Organization",
            locationId: "a0f9c508-a3c4-456b-a812-3fb0c4743521",
            resource: "CollectionProperties",
            routeTemplate: "_apis/{area}/Collections/{collectionId}/Properties",
            routeValues: {
                collectionId: collectionId
            },
            customHeaders: {
                "Content-Type": "application/json-patch+json",
            },
            apiVersion: this.collectionPropertiesApiVersion,
            data: patchDocument
        });
    }
}

/**
 * @exemptedapi
 */
export class OrganizationHttpClient5 extends CommonMethods3To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.collectionPropertiesApiVersion =
        this.collectionsApiVersion =
        this.organizationLogoApiVersion =
        this.organizationMigrationBlobsApiVersion =
        this.organizationPropertiesApiVersion =
        this.organizationsApiVersion =
        this.regionsApiVersion = "5.0-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class OrganizationHttpClient4_1 extends CommonMethods3To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.collectionPropertiesApiVersion =
        this.collectionsApiVersion =
        this.organizationLogoApiVersion =
        this.organizationMigrationBlobsApiVersion =
        this.organizationPropertiesApiVersion =
        this.organizationsApiVersion =
        this.regionsApiVersion = "4.1-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class OrganizationHttpClient4 extends CommonMethods3To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.collectionPropertiesApiVersion =
        this.collectionsApiVersion =
        this.organizationLogoApiVersion =
        this.organizationMigrationBlobsApiVersion =
        this.organizationPropertiesApiVersion =
        this.organizationsApiVersion =
        this.regionsApiVersion = "4.0-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class OrganizationHttpClient3_2 extends CommonMethods3To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.collectionPropertiesApiVersion =
        this.collectionsApiVersion =
        this.organizationLogoApiVersion =
        this.organizationMigrationBlobsApiVersion =
        this.organizationPropertiesApiVersion =
        this.organizationsApiVersion =
        this.regionsApiVersion = "3.2-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class OrganizationHttpClient3_1 extends CommonMethods3To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.collectionPropertiesApiVersion =
        this.collectionsApiVersion =
        this.organizationLogoApiVersion =
        this.organizationMigrationBlobsApiVersion =
        this.organizationPropertiesApiVersion =
        this.organizationsApiVersion =
        this.regionsApiVersion = "3.1-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class OrganizationHttpClient3 extends CommonMethods3To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.collectionPropertiesApiVersion =
        this.collectionsApiVersion =
        this.organizationLogoApiVersion =
        this.organizationMigrationBlobsApiVersion =
        this.organizationPropertiesApiVersion =
        this.organizationsApiVersion =
        this.regionsApiVersion = "3.0-preview.1";
    }
}

export class OrganizationHttpClient extends OrganizationHttpClient5 {
    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
    }
}

const clientMapping: { [id: string]: new (routeRequestPath: string) => VSS_WebApi.VssHttpClient; } = {
    "5.0": OrganizationHttpClient5,
    "4.1": OrganizationHttpClient4_1,
    "4.0": OrganizationHttpClient4,
    "3.2": OrganizationHttpClient3_2,
    "3.1": OrganizationHttpClient3_1,
    "3.0": OrganizationHttpClient3
}

/**
 * Gets an http client targeting the latest released version of the APIs.
 *
 * @return OrganizationHttpClient5
 */
export function getClient(options?: VSS_WebApi.IVssHttpClientOptions): OrganizationHttpClient5 {
    if ((<any>window).VSS && (<any>window).VSS.VssSDKRestVersion && clientMapping[(<any>window).VSS.VssSDKRestVersion]) {
        return VSS_Service.getClient<OrganizationHttpClient5>(<any>(clientMapping[(<any>window).VSS.VssSDKRestVersion]), undefined, undefined, undefined, options);
    }
    else {
        return VSS_Service.getClient<OrganizationHttpClient5>(OrganizationHttpClient5, undefined, undefined, undefined, options);
    }
}
