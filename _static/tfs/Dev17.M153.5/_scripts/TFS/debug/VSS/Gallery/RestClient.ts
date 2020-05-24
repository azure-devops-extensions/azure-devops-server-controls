/**
 * ---------------------------------------------------------
 * Generated file, DO NOT EDIT
 * ---------------------------------------------------------
 *
 * See following wiki page for instructions on how to regenerate:
 *   https://aka.ms/azure-devops-client-generation
 *
 * Configuration file:
 *   gallery\client\webapi\clientgeneratorconfigs\genclient.json
 */

"use strict";

import Contracts = require("VSS/Gallery/Contracts");
import VSS_Service = require("VSS/Service");
import VSS_WebApi = require("VSS/WebApi/RestClient");

export class CommonMethods2To5 extends VSS_WebApi.VssHttpClient {

    public static serviceInstanceId = "00000029-0000-8888-8000-000000000000";
    protected accountsApiVersion: string;
    protected accountsbynameApiVersion: string;
    protected assetbynameApiVersion: string;
    protected assetsApiVersion: string;
    protected categoriesApiVersion: string;
    protected categoriesApiVersion_e0a5a71e: string;
    protected certificatesApiVersion: string;
    protected extensionqueryApiVersion: string;
    protected extensionsApiVersion: string;
    protected extensionsApiVersion_a41192c8: string;
    protected packageApiVersion: string;
    protected privateassetApiVersion: string;
    protected publisherqueryApiVersion: string;
    protected publishersApiVersion: string;
    protected signingkeyApiVersion: string;

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
    }

    /**
     * [Preview API]
     *
     * @param {string} keyType
     * @return IPromise<string>
     */
    public getSigningKey(
        keyType: string
        ): IPromise<string> {

        return this._beginRequest<string>({
            httpMethod: "GET",
            area: "gallery",
            locationId: "92ed5cf4-c38b-465a-9059-2f2fb7c624b5",
            resource: "signingkey",
            routeTemplate: "_apis/{area}/{resource}/{keyType}",
            routeValues: {
                keyType: keyType
            },
            apiVersion: this.signingkeyApiVersion
        });
    }

    /**
     * [Preview API]
     *
     * @param {string} keyType
     * @param {number} expireCurrentSeconds
     * @return IPromise<void>
     */
    public generateKey(
        keyType: string,
        expireCurrentSeconds?: number
        ): IPromise<void> {

        const queryValues: any = {
            expireCurrentSeconds: expireCurrentSeconds
        };

        return this._beginRequest<void>({
            httpMethod: "POST",
            httpResponseType: "html",
            area: "gallery",
            locationId: "92ed5cf4-c38b-465a-9059-2f2fb7c624b5",
            resource: "signingkey",
            routeTemplate: "_apis/{area}/{resource}/{keyType}",
            routeValues: {
                keyType: keyType
            },
            queryParams: queryValues,
            apiVersion: this.signingkeyApiVersion
        });
    }

    /**
     * [Preview API]
     *
     * @param {Contracts.Publisher} publisher
     * @param {string} publisherName
     * @return IPromise<Contracts.Publisher>
     */
    public updatePublisher(
        publisher: Contracts.Publisher,
        publisherName: string
        ): IPromise<Contracts.Publisher> {

        return this._beginRequest<Contracts.Publisher>({
            httpMethod: "PUT",
            area: "gallery",
            locationId: "4ddec66a-e4f6-4f5d-999e-9e77710d7ff4",
            resource: "publishers",
            routeTemplate: "_apis/{area}/{resource}/{publisherName}",
            requestType: Contracts.TypeInfo.Publisher,
            responseType: Contracts.TypeInfo.Publisher,
            routeValues: {
                publisherName: publisherName
            },
            apiVersion: this.publishersApiVersion,
            data: publisher
        });
    }

    /**
     * [Preview API]
     *
     * @param {string} publisherName
     * @param {number} flags
     * @return IPromise<Contracts.Publisher>
     */
    public getPublisher(
        publisherName: string,
        flags?: number
        ): IPromise<Contracts.Publisher> {

        const queryValues: any = {
            flags: flags
        };

        return this._beginRequest<Contracts.Publisher>({
            httpMethod: "GET",
            area: "gallery",
            locationId: "4ddec66a-e4f6-4f5d-999e-9e77710d7ff4",
            resource: "publishers",
            routeTemplate: "_apis/{area}/{resource}/{publisherName}",
            responseType: Contracts.TypeInfo.Publisher,
            routeValues: {
                publisherName: publisherName
            },
            queryParams: queryValues,
            apiVersion: this.publishersApiVersion
        });
    }

    /**
     * [Preview API]
     *
     * @param {string} publisherName
     * @return IPromise<void>
     */
    public deletePublisher(
        publisherName: string
        ): IPromise<void> {

        return this._beginRequest<void>({
            httpMethod: "DELETE",
            httpResponseType: "html",
            area: "gallery",
            locationId: "4ddec66a-e4f6-4f5d-999e-9e77710d7ff4",
            resource: "publishers",
            routeTemplate: "_apis/{area}/{resource}/{publisherName}",
            routeValues: {
                publisherName: publisherName
            },
            apiVersion: this.publishersApiVersion
        });
    }

    /**
     * [Preview API]
     *
     * @param {Contracts.Publisher} publisher
     * @return IPromise<Contracts.Publisher>
     */
    public createPublisher(
        publisher: Contracts.Publisher
        ): IPromise<Contracts.Publisher> {

        return this._beginRequest<Contracts.Publisher>({
            httpMethod: "POST",
            area: "gallery",
            locationId: "4ddec66a-e4f6-4f5d-999e-9e77710d7ff4",
            resource: "publishers",
            routeTemplate: "_apis/{area}/{resource}/{publisherName}",
            requestType: Contracts.TypeInfo.Publisher,
            responseType: Contracts.TypeInfo.Publisher,
            apiVersion: this.publishersApiVersion,
            data: publisher
        });
    }

    /**
     * [Preview API]
     *
     * @param {Contracts.PublisherQuery} publisherQuery
     * @return IPromise<Contracts.PublisherQueryResult>
     */
    public queryPublishers(
        publisherQuery: Contracts.PublisherQuery
        ): IPromise<Contracts.PublisherQueryResult> {

        return this._beginRequest<Contracts.PublisherQueryResult>({
            httpMethod: "POST",
            area: "gallery",
            locationId: "2ad6ee0a-b53f-4034-9d1d-d009fda1212e",
            resource: "publisherquery",
            routeTemplate: "_apis/public/{area}/{resource}",
            requestType: Contracts.TypeInfo.PublisherQuery,
            responseType: Contracts.TypeInfo.PublisherQueryResult,
            apiVersion: this.publisherqueryApiVersion,
            data: publisherQuery
        });
    }

    /**
     * [Preview API]
     *
     * @param {string} publisherName
     * @param {string} extensionName
     * @param {string} version
     * @param {string} assetType
     * @param {string} assetToken
     * @param {string} accountToken
     * @param {boolean} acceptDefault
     * @param {String} accountTokenHeader - Header to pass the account token
     * @return IPromise<ArrayBuffer>
     */
    public getAssetWithToken(
        publisherName: string,
        extensionName: string,
        version: string,
        assetType: string,
        assetToken?: string,
        accountToken?: string,
        acceptDefault?: boolean,
        accountTokenHeader?: String
        ): IPromise<ArrayBuffer> {

        const queryValues: any = {
            accountToken: accountToken,
            acceptDefault: acceptDefault
        };

        return this._beginRequest<ArrayBuffer>({
            httpMethod: "GET",
            httpResponseType: "application/octet-stream",
            area: "gallery",
            locationId: "364415a1-0077-4a41-a7a0-06edd4497492",
            resource: "privateasset",
            routeTemplate: "_apis/public/{area}/publisher/{publisherName}/extension/{extensionName}/{version}/{resource}/{assetToken}/{*assetType}",
            routeValues: {
                publisherName: publisherName,
                extensionName: extensionName,
                version: version,
                assetType: assetType,
                assetToken: assetToken
            },
            customHeaders: {
                "X-Market-AccountToken": accountTokenHeader,
            },
            queryParams: queryValues,
            apiVersion: this.privateassetApiVersion
        });
    }

    /**
     * [Preview API] This endpoint gets hit when you download a VSTS extension from the Web UI
     *
     * @param {string} publisherName
     * @param {string} extensionName
     * @param {string} version
     * @param {string} accountToken
     * @param {boolean} acceptDefault
     * @param {String} accountTokenHeader - Header to pass the account token
     * @return IPromise<ArrayBuffer>
     */
    public getPackage(
        publisherName: string,
        extensionName: string,
        version: string,
        accountToken?: string,
        acceptDefault?: boolean,
        accountTokenHeader?: String
        ): IPromise<ArrayBuffer> {

        const queryValues: any = {
            accountToken: accountToken,
            acceptDefault: acceptDefault
        };

        return this._beginRequest<ArrayBuffer>({
            httpMethod: "GET",
            httpResponseType: "application/octet-stream",
            area: "gallery",
            locationId: "7cb576f8-1cae-4c4b-b7b1-e4af5759e965",
            resource: "package",
            routeTemplate: "_apis/{area}/publishers/{publisherName}/extensions/{extensionName}/{version}/{resource}",
            routeValues: {
                publisherName: publisherName,
                extensionName: extensionName,
                version: version
            },
            customHeaders: {
                "X-Market-AccountToken": accountTokenHeader,
            },
            queryParams: queryValues,
            apiVersion: this.packageApiVersion
        });
    }

    /**
     * [Preview API]
     *
     * @param {string} publisherName
     * @param {string} extensionName
     * @param {Contracts.PublishedExtensionFlags} flags
     * @return IPromise<Contracts.PublishedExtension>
     */
    public updateExtensionProperties(
        publisherName: string,
        extensionName: string,
        flags: Contracts.PublishedExtensionFlags
        ): IPromise<Contracts.PublishedExtension> {

        const queryValues: any = {
            flags: flags
        };

        return this._beginRequest<Contracts.PublishedExtension>({
            httpMethod: "PATCH",
            area: "gallery",
            locationId: "e11ea35a-16fe-4b80-ab11-c4cab88a0966",
            resource: "extensions",
            routeTemplate: "_apis/{area}/publishers/{publisherName}/{resource}/{extensionName}",
            responseType: Contracts.TypeInfo.PublishedExtension,
            routeValues: {
                publisherName: publisherName,
                extensionName: extensionName
            },
            queryParams: queryValues,
            apiVersion: this.extensionsApiVersion
        });
    }

    /**
     * [Preview API]
     *
     * @param {string} publisherName
     * @param {string} extensionName
     * @param {string} version
     * @param {Contracts.ExtensionQueryFlags} flags
     * @param {string} accountToken
     * @param {String} accountTokenHeader - Header to pass the account token
     * @return IPromise<Contracts.PublishedExtension>
     */
    public getExtension(
        publisherName: string,
        extensionName: string,
        version?: string,
        flags?: Contracts.ExtensionQueryFlags,
        accountToken?: string,
        accountTokenHeader?: String
        ): IPromise<Contracts.PublishedExtension> {

        const queryValues: any = {
            version: version,
            flags: flags,
            accountToken: accountToken
        };

        return this._beginRequest<Contracts.PublishedExtension>({
            httpMethod: "GET",
            area: "gallery",
            locationId: "e11ea35a-16fe-4b80-ab11-c4cab88a0966",
            resource: "extensions",
            routeTemplate: "_apis/{area}/publishers/{publisherName}/{resource}/{extensionName}",
            responseType: Contracts.TypeInfo.PublishedExtension,
            routeValues: {
                publisherName: publisherName,
                extensionName: extensionName
            },
            customHeaders: {
                "X-Market-AccountToken": accountTokenHeader,
            },
            queryParams: queryValues,
            apiVersion: this.extensionsApiVersion
        });
    }

    /**
     * [Preview API]
     *
     * @param {string} publisherName
     * @param {string} extensionName
     * @param {string} version
     * @return IPromise<void>
     */
    public deleteExtension(
        publisherName: string,
        extensionName: string,
        version?: string
        ): IPromise<void> {

        const queryValues: any = {
            version: version
        };

        return this._beginRequest<void>({
            httpMethod: "DELETE",
            httpResponseType: "html",
            area: "gallery",
            locationId: "e11ea35a-16fe-4b80-ab11-c4cab88a0966",
            resource: "extensions",
            routeTemplate: "_apis/{area}/publishers/{publisherName}/{resource}/{extensionName}",
            routeValues: {
                publisherName: publisherName,
                extensionName: extensionName
            },
            queryParams: queryValues,
            apiVersion: this.extensionsApiVersion
        });
    }

    /**
     * [Preview API]
     *
     * @param {string} extensionId
     * @param {string} version
     * @param {Contracts.ExtensionQueryFlags} flags
     * @return IPromise<Contracts.PublishedExtension>
     */
    public getExtensionById(
        extensionId: string,
        version?: string,
        flags?: Contracts.ExtensionQueryFlags
        ): IPromise<Contracts.PublishedExtension> {

        const queryValues: any = {
            version: version,
            flags: flags
        };

        return this._beginRequest<Contracts.PublishedExtension>({
            httpMethod: "GET",
            area: "gallery",
            locationId: "a41192c8-9525-4b58-bc86-179fa549d80d",
            resource: "extensions",
            routeTemplate: "_apis/{area}/{resource}/{extensionId}",
            responseType: Contracts.TypeInfo.PublishedExtension,
            routeValues: {
                extensionId: extensionId
            },
            queryParams: queryValues,
            apiVersion: this.extensionsApiVersion_a41192c8
        });
    }

    /**
     * [Preview API]
     *
     * @param {string} extensionId
     * @param {string} version
     * @return IPromise<void>
     */
    public deleteExtensionById(
        extensionId: string,
        version?: string
        ): IPromise<void> {

        const queryValues: any = {
            version: version
        };

        return this._beginRequest<void>({
            httpMethod: "DELETE",
            httpResponseType: "html",
            area: "gallery",
            locationId: "a41192c8-9525-4b58-bc86-179fa549d80d",
            resource: "extensions",
            routeTemplate: "_apis/{area}/{resource}/{extensionId}",
            routeValues: {
                extensionId: extensionId
            },
            queryParams: queryValues,
            apiVersion: this.extensionsApiVersion_a41192c8
        });
    }

    /**
     * [Preview API]
     *
     * @param {Contracts.ExtensionQuery} extensionQuery
     * @param {string} accountToken
     * @param {String} accountTokenHeader - Header to pass the account token
     * @return IPromise<Contracts.ExtensionQueryResult>
     */
    public queryExtensions(
        extensionQuery: Contracts.ExtensionQuery,
        accountToken?: string,
        accountTokenHeader?: String
        ): IPromise<Contracts.ExtensionQueryResult> {

        const queryValues: any = {
            accountToken: accountToken
        };

        return this._beginRequest<Contracts.ExtensionQueryResult>({
            httpMethod: "POST",
            area: "gallery",
            locationId: "eb9d5ee1-6d43-456b-b80e-8a96fbc014b6",
            resource: "extensionquery",
            routeTemplate: "_apis/public/{area}/{resource}",
            requestType: Contracts.TypeInfo.ExtensionQuery,
            responseType: Contracts.TypeInfo.ExtensionQueryResult,
            customHeaders: {
                "X-Market-AccountToken": accountTokenHeader,
            },
            queryParams: queryValues,
            apiVersion: this.extensionqueryApiVersion,
            data: extensionQuery
        });
    }

    /**
     * [Preview API]
     *
     * @param {string} publisherName
     * @param {string} extensionName
     * @param {string} version
     * @return IPromise<ArrayBuffer>
     */
    public getCertificate(
        publisherName: string,
        extensionName: string,
        version?: string
        ): IPromise<ArrayBuffer> {

        return this._beginRequest<ArrayBuffer>({
            httpMethod: "GET",
            httpResponseType: "application/octet-stream",
            area: "gallery",
            locationId: "e905ad6a-3f1f-4d08-9f6d-7d357ff8b7d0",
            resource: "certificates",
            routeTemplate: "_apis/{area}/publishers/{publisherName}/extensions/{extensionName}/{resource}/{version}",
            routeValues: {
                publisherName: publisherName,
                extensionName: extensionName,
                version: version
            },
            apiVersion: this.certificatesApiVersion
        });
    }

    /**
     * [Preview API]
     *
     * @param {string} categoryName
     * @param {string} languages
     * @param {string} product
     * @return IPromise<Contracts.CategoriesResult>
     */
    public getCategoryDetails(
        categoryName: string,
        languages?: string,
        product?: string
        ): IPromise<Contracts.CategoriesResult> {

        const queryValues: any = {
            languages: languages,
            product: product
        };

        return this._beginRequest<Contracts.CategoriesResult>({
            httpMethod: "GET",
            area: "gallery",
            locationId: "75d3c04d-84d2-4973-acd2-22627587dabc",
            resource: "categories",
            routeTemplate: "_apis/public/{area}/{resource}/{categoryName}",
            routeValues: {
                categoryName: categoryName
            },
            queryParams: queryValues,
            apiVersion: this.categoriesApiVersion
        });
    }

    /**
     * [Preview API]
     *
     * @param {string} languages
     * @return IPromise<string[]>
     */
    public getCategories(
        languages?: string
        ): IPromise<string[]> {

        const queryValues: any = {
            languages: languages
        };

        return this._beginRequest<string[]>({
            httpMethod: "GET",
            area: "gallery",
            locationId: "e0a5a71e-3ac3-43a0-ae7d-0bb5c3046a2a",
            resource: "categories",
            routeTemplate: "_apis/public/{area}/{resource}",
            responseIsCollection: true,
            queryParams: queryValues,
            apiVersion: this.categoriesApiVersion_e0a5a71e
        });
    }

    /**
     * [Preview API]
     *
     * @param {string} extensionId
     * @param {string} version
     * @param {string} assetType
     * @param {string} accountToken
     * @param {boolean} acceptDefault
     * @param {String} accountTokenHeader - Header to pass the account token
     * @return IPromise<ArrayBuffer>
     */
    public getAsset(
        extensionId: string,
        version: string,
        assetType: string,
        accountToken?: string,
        acceptDefault?: boolean,
        accountTokenHeader?: String
        ): IPromise<ArrayBuffer> {

        const queryValues: any = {
            accountToken: accountToken,
            acceptDefault: acceptDefault
        };

        return this._beginRequest<ArrayBuffer>({
            httpMethod: "GET",
            httpResponseType: "application/octet-stream",
            area: "gallery",
            locationId: "5d545f3d-ef47-488b-8be3-f5ee1517856c",
            resource: "assets",
            routeTemplate: "_apis/public/{area}/extensions/{extensionId}/{version}/{resource}/{assetType}",
            routeValues: {
                extensionId: extensionId,
                version: version,
                assetType: assetType
            },
            customHeaders: {
                "X-Market-AccountToken": accountTokenHeader,
            },
            queryParams: queryValues,
            apiVersion: this.assetsApiVersion
        });
    }

    /**
     * [Preview API]
     *
     * @param {string} publisherName
     * @param {string} extensionName
     * @param {string} version
     * @param {string} assetType
     * @param {string} accountToken
     * @param {boolean} acceptDefault
     * @param {String} accountTokenHeader - Header to pass the account token
     * @return IPromise<ArrayBuffer>
     */
    public getAssetByName(
        publisherName: string,
        extensionName: string,
        version: string,
        assetType: string,
        accountToken?: string,
        acceptDefault?: boolean,
        accountTokenHeader?: String
        ): IPromise<ArrayBuffer> {

        const queryValues: any = {
            accountToken: accountToken,
            acceptDefault: acceptDefault
        };

        return this._beginRequest<ArrayBuffer>({
            httpMethod: "GET",
            httpResponseType: "application/octet-stream",
            area: "gallery",
            locationId: "7529171f-a002-4180-93ba-685f358a0482",
            resource: "assetbyname",
            routeTemplate: "_apis/public/{area}/publisher/{publisherName}/extension/{extensionName}/{version}/{resource}/{*assetType}",
            routeValues: {
                publisherName: publisherName,
                extensionName: extensionName,
                version: version,
                assetType: assetType
            },
            customHeaders: {
                "X-Market-AccountToken": accountTokenHeader,
            },
            queryParams: queryValues,
            apiVersion: this.assetbynameApiVersion
        });
    }

    /**
     * [Preview API]
     *
     * @param {string} publisherName
     * @param {string} extensionName
     * @param {string} accountName
     * @return IPromise<void>
     */
    public unshareExtension(
        publisherName: string,
        extensionName: string,
        accountName: string
        ): IPromise<void> {

        return this._beginRequest<void>({
            httpMethod: "DELETE",
            httpResponseType: "html",
            area: "gallery",
            locationId: "a1e66d8f-f5de-4d16-8309-91a4e015ee46",
            resource: "accountsbyname",
            routeTemplate: "_apis/{area}/publisher/{publisherName}/extension/{extensionName}/{resource}/{accountName}",
            routeValues: {
                publisherName: publisherName,
                extensionName: extensionName,
                accountName: accountName
            },
            apiVersion: this.accountsbynameApiVersion
        });
    }

    /**
     * [Preview API]
     *
     * @param {string} publisherName
     * @param {string} extensionName
     * @param {string} accountName
     * @return IPromise<void>
     */
    public shareExtension(
        publisherName: string,
        extensionName: string,
        accountName: string
        ): IPromise<void> {

        return this._beginRequest<void>({
            httpMethod: "POST",
            httpResponseType: "html",
            area: "gallery",
            locationId: "a1e66d8f-f5de-4d16-8309-91a4e015ee46",
            resource: "accountsbyname",
            routeTemplate: "_apis/{area}/publisher/{publisherName}/extension/{extensionName}/{resource}/{accountName}",
            routeValues: {
                publisherName: publisherName,
                extensionName: extensionName,
                accountName: accountName
            },
            apiVersion: this.accountsbynameApiVersion
        });
    }

    /**
     * [Preview API]
     *
     * @param {string} extensionId
     * @param {string} accountName
     * @return IPromise<void>
     */
    public unshareExtensionById(
        extensionId: string,
        accountName: string
        ): IPromise<void> {

        return this._beginRequest<void>({
            httpMethod: "DELETE",
            httpResponseType: "html",
            area: "gallery",
            locationId: "1f19631b-a0b4-4a03-89c2-d79785d24360",
            resource: "accounts",
            routeTemplate: "_apis/{area}/extensions/{extensionId}/{resource}/{accountName}",
            routeValues: {
                extensionId: extensionId,
                accountName: accountName
            },
            apiVersion: this.accountsApiVersion
        });
    }

    /**
     * [Preview API]
     *
     * @param {string} extensionId
     * @param {string} accountName
     * @return IPromise<void>
     */
    public shareExtensionById(
        extensionId: string,
        accountName: string
        ): IPromise<void> {

        return this._beginRequest<void>({
            httpMethod: "POST",
            httpResponseType: "html",
            area: "gallery",
            locationId: "1f19631b-a0b4-4a03-89c2-d79785d24360",
            resource: "accounts",
            routeTemplate: "_apis/{area}/extensions/{extensionId}/{resource}/{accountName}",
            routeValues: {
                extensionId: extensionId,
                accountName: accountName
            },
            apiVersion: this.accountsApiVersion
        });
    }
}

export class CommonMethods2_1To5 extends CommonMethods2To5 {
    protected acquisitionrequestsApiVersion: string;

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
    }

    /**
     * [Preview API]
     *
     * @param {Contracts.ExtensionAcquisitionRequest} acquisitionRequest
     * @return IPromise<Contracts.ExtensionAcquisitionRequest>
     */
    public requestAcquisition(
        acquisitionRequest: Contracts.ExtensionAcquisitionRequest
        ): IPromise<Contracts.ExtensionAcquisitionRequest> {

        return this._beginRequest<Contracts.ExtensionAcquisitionRequest>({
            httpMethod: "POST",
            area: "gallery",
            locationId: "3adb1f2d-e328-446e-be73-9f6d98071c45",
            resource: "acquisitionrequests",
            routeTemplate: "_apis/{area}/{resource}",
            requestType: Contracts.TypeInfo.ExtensionAcquisitionRequest,
            responseType: Contracts.TypeInfo.ExtensionAcquisitionRequest,
            apiVersion: this.acquisitionrequestsApiVersion,
            data: acquisitionRequest
        });
    }
}

export class CommonMethods2_2To5 extends CommonMethods2_1To5 {
    protected acquisitionoptionsApiVersion: string;

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
    }

    /**
     * [Preview API]
     *
     * @param {string} itemId
     * @param {string} installationTarget
     * @param {boolean} testCommerce
     * @param {boolean} isFreeOrTrialInstall
     * @return IPromise<Contracts.AcquisitionOptions>
     */
    public getAcquisitionOptions(
        itemId: string,
        installationTarget: string,
        testCommerce?: boolean,
        isFreeOrTrialInstall?: boolean
        ): IPromise<Contracts.AcquisitionOptions> {

        const queryValues: any = {
            installationTarget: installationTarget,
            testCommerce: testCommerce,
            isFreeOrTrialInstall: isFreeOrTrialInstall
        };

        return this._beginRequest<Contracts.AcquisitionOptions>({
            httpMethod: "GET",
            area: "gallery",
            locationId: "9d0a0105-075e-4760-aa15-8bcf54d1bd7d",
            resource: "acquisitionoptions",
            routeTemplate: "_apis/{area}/{resource}/{itemId}",
            responseType: Contracts.TypeInfo.AcquisitionOptions,
            routeValues: {
                itemId: itemId
            },
            queryParams: queryValues,
            apiVersion: this.acquisitionoptionsApiVersion
        });
    }
}

export class CommonMethods3To5 extends CommonMethods2_2To5 {
    protected authenticatedassetApiVersion: string;
    protected azurepublisherApiVersion: string;
    protected extensionValidatorApiVersion: string;
    protected reviewsApiVersion: string;
    protected reviewsApiVersion_5b3f819f: string;
    protected securedCategoriesApiVersion: string;
    protected statisticsApiVersion: string;

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
    }

    /**
     * [Preview API]
     *
     * @param {Contracts.ExtensionStatisticUpdate} extensionStatisticsUpdate
     * @param {string} publisherName
     * @param {string} extensionName
     * @return IPromise<void>
     */
    public updateExtensionStatistics(
        extensionStatisticsUpdate: Contracts.ExtensionStatisticUpdate,
        publisherName: string,
        extensionName: string
        ): IPromise<void> {

        return this._beginRequest<void>({
            httpMethod: "PATCH",
            httpResponseType: "html",
            area: "gallery",
            locationId: "a0ea3204-11e9-422d-a9ca-45851cc41400",
            resource: "statistics",
            routeTemplate: "_apis/{area}/publisher/{publisherName}/extension/{extensionName}/{resource}",
            requestType: Contracts.TypeInfo.ExtensionStatisticUpdate,
            routeValues: {
                publisherName: publisherName,
                extensionName: extensionName
            },
            apiVersion: this.statisticsApiVersion,
            data: extensionStatisticsUpdate
        });
    }

    /**
     * [Preview API]
     *
     * @param {Contracts.ExtensionCategory} category
     * @return IPromise<Contracts.ExtensionCategory>
     */
    public createCategory(
        category: Contracts.ExtensionCategory
        ): IPromise<Contracts.ExtensionCategory> {

        return this._beginRequest<Contracts.ExtensionCategory>({
            httpMethod: "POST",
            area: "gallery",
            locationId: "476531a3-7024-4516-a76a-ed64d3008ad6",
            resource: "securedCategories",
            routeTemplate: "_apis/{area}/categories",
            apiVersion: this.securedCategoriesApiVersion,
            data: category
        });
    }

    /**
     * [Preview API] Updates or Flags a review
     *
     * @param {Contracts.ReviewPatch} reviewPatch - ReviewPatch object which contains the changes to be applied to the review
     * @param {string} pubName - Name of the pubilsher who published the extension
     * @param {string} extName - Name of the extension
     * @param {number} reviewId - Id of the review which needs to be updated
     * @return IPromise<Contracts.ReviewPatch>
     */
    public updateReview(
        reviewPatch: Contracts.ReviewPatch,
        pubName: string,
        extName: string,
        reviewId: number
        ): IPromise<Contracts.ReviewPatch> {

        return this._beginRequest<Contracts.ReviewPatch>({
            httpMethod: "PATCH",
            area: "gallery",
            locationId: "e6e85b9d-aa70-40e6-aa28-d0fbf40b91a3",
            resource: "reviews",
            routeTemplate: "_apis/{area}/publishers/{pubName}/extensions/{extName}/{resource}/{reviewId}",
            requestType: Contracts.TypeInfo.ReviewPatch,
            responseType: Contracts.TypeInfo.ReviewPatch,
            routeValues: {
                pubName: pubName,
                extName: extName,
                reviewId: reviewId
            },
            apiVersion: this.reviewsApiVersion,
            data: reviewPatch
        });
    }

    /**
     * [Preview API] Deletes a review
     *
     * @param {string} pubName - Name of the pubilsher who published the extension
     * @param {string} extName - Name of the extension
     * @param {number} reviewId - Id of the review which needs to be updated
     * @return IPromise<void>
     */
    public deleteReview(
        pubName: string,
        extName: string,
        reviewId: number
        ): IPromise<void> {

        return this._beginRequest<void>({
            httpMethod: "DELETE",
            httpResponseType: "html",
            area: "gallery",
            locationId: "e6e85b9d-aa70-40e6-aa28-d0fbf40b91a3",
            resource: "reviews",
            routeTemplate: "_apis/{area}/publishers/{pubName}/extensions/{extName}/{resource}/{reviewId}",
            routeValues: {
                pubName: pubName,
                extName: extName,
                reviewId: reviewId
            },
            apiVersion: this.reviewsApiVersion
        });
    }

    /**
     * [Preview API] Creates a new review for an extension
     *
     * @param {Contracts.Review} review - Review to be created for the extension
     * @param {string} pubName - Name of the publisher who published the extension
     * @param {string} extName - Name of the extension
     * @return IPromise<Contracts.Review>
     */
    public createReview(
        review: Contracts.Review,
        pubName: string,
        extName: string
        ): IPromise<Contracts.Review> {

        return this._beginRequest<Contracts.Review>({
            httpMethod: "POST",
            area: "gallery",
            locationId: "e6e85b9d-aa70-40e6-aa28-d0fbf40b91a3",
            resource: "reviews",
            routeTemplate: "_apis/{area}/publishers/{pubName}/extensions/{extName}/{resource}/{reviewId}",
            requestType: Contracts.TypeInfo.Review,
            responseType: Contracts.TypeInfo.Review,
            routeValues: {
                pubName: pubName,
                extName: extName
            },
            apiVersion: this.reviewsApiVersion,
            data: review
        });
    }

    /**
     * [Preview API] Returns a list of reviews associated with an extension
     *
     * @param {string} publisherName - Name of the publisher who published the extension
     * @param {string} extensionName - Name of the extension
     * @param {number} count - Number of reviews to retrieve (defaults to 5)
     * @param {Contracts.ReviewFilterOptions} filterOptions - FilterOptions to filter out empty reviews etcetera, defaults to none
     * @param {Date} beforeDate - Use if you want to fetch reviews older than the specified date, defaults to null
     * @param {Date} afterDate - Use if you want to fetch reviews newer than the specified date, defaults to null
     * @return IPromise<Contracts.ReviewsResult>
     */
    public getReviews(
        publisherName: string,
        extensionName: string,
        count?: number,
        filterOptions?: Contracts.ReviewFilterOptions,
        beforeDate?: Date,
        afterDate?: Date
        ): IPromise<Contracts.ReviewsResult> {

        const queryValues: any = {
            count: count,
            filterOptions: filterOptions,
            beforeDate: beforeDate,
            afterDate: afterDate
        };

        return this._beginRequest<Contracts.ReviewsResult>({
            httpMethod: "GET",
            area: "gallery",
            locationId: "5b3f819f-f247-42ad-8c00-dd9ab9ab246d",
            resource: "reviews",
            routeTemplate: "_apis/public/{area}/publishers/{publisherName}/extensions/{extensionName}/{resource}",
            responseType: Contracts.TypeInfo.ReviewsResult,
            routeValues: {
                publisherName: publisherName,
                extensionName: extensionName
            },
            queryParams: queryValues,
            apiVersion: this.reviewsApiVersion_5b3f819f
        });
    }

    /**
     * [Preview API]
     *
     * @param {Contracts.AzureRestApiRequestModel} azureRestApiRequestModel
     * @return IPromise<void>
     */
    public extensionValidator(
        azureRestApiRequestModel: Contracts.AzureRestApiRequestModel
        ): IPromise<void> {

        return this._beginRequest<void>({
            httpMethod: "POST",
            httpResponseType: "html",
            area: "gallery",
            locationId: "05e8a5e1-8c59-4c2c-8856-0ff087d1a844",
            resource: "extensionValidator",
            routeTemplate: "_apis/{area}/{resource}",
            apiVersion: this.extensionValidatorApiVersion,
            data: azureRestApiRequestModel
        });
    }

    /**
     * [Preview API]
     *
     * @param {string} publisherName
     * @return IPromise<Contracts.AzurePublisher>
     */
    public queryAssociatedAzurePublisher(
        publisherName: string
        ): IPromise<Contracts.AzurePublisher> {

        return this._beginRequest<Contracts.AzurePublisher>({
            httpMethod: "GET",
            area: "gallery",
            locationId: "efd202a6-9d87-4ebc-9229-d2b8ae2fdb6d",
            resource: "azurepublisher",
            routeTemplate: "_apis/{area}/publishers/{publisherName}/{resource}",
            routeValues: {
                publisherName: publisherName
            },
            apiVersion: this.azurepublisherApiVersion
        });
    }

    /**
     * [Preview API]
     *
     * @param {string} publisherName
     * @param {string} azurePublisherId
     * @return IPromise<Contracts.AzurePublisher>
     */
    public associateAzurePublisher(
        publisherName: string,
        azurePublisherId: string
        ): IPromise<Contracts.AzurePublisher> {

        const queryValues: any = {
            azurePublisherId: azurePublisherId
        };

        return this._beginRequest<Contracts.AzurePublisher>({
            httpMethod: "PUT",
            area: "gallery",
            locationId: "efd202a6-9d87-4ebc-9229-d2b8ae2fdb6d",
            resource: "azurepublisher",
            routeTemplate: "_apis/{area}/publishers/{publisherName}/{resource}",
            routeValues: {
                publisherName: publisherName
            },
            queryParams: queryValues,
            apiVersion: this.azurepublisherApiVersion
        });
    }

    /**
     * [Preview API]
     *
     * @param {string} publisherName
     * @param {string} extensionName
     * @param {string} version
     * @param {string} assetType
     * @param {string} accountToken
     * @param {String} accountTokenHeader - Header to pass the account token
     * @return IPromise<ArrayBuffer>
     */
    public getAssetAuthenticated(
        publisherName: string,
        extensionName: string,
        version: string,
        assetType: string,
        accountToken?: string,
        accountTokenHeader?: String
        ): IPromise<ArrayBuffer> {

        const queryValues: any = {
            accountToken: accountToken
        };

        return this._beginRequest<ArrayBuffer>({
            httpMethod: "GET",
            httpResponseType: "application/octet-stream",
            area: "gallery",
            locationId: "506aff36-2622-4f70-8063-77cce6366d20",
            resource: "authenticatedasset",
            routeTemplate: "_apis/{area}/publisher/{publisherName}/extension/{extensionName}/{version}/assets/{*assetType}",
            routeValues: {
                publisherName: publisherName,
                extensionName: extensionName,
                version: version,
                assetType: assetType
            },
            customHeaders: {
                "X-Market-AccountToken": accountTokenHeader,
            },
            queryParams: queryValues,
            apiVersion: this.authenticatedassetApiVersion
        });
    }
}

export class CommonMethods3_1To5 extends CommonMethods3To5 {
    protected categoriesApiVersion_1102bb42: string;
    protected categoriesApiVersion_31fba831: string;
    protected eventsApiVersion: string;
    protected eventsApiVersion_3d13c499: string;
    protected reportsApiVersion: string;
    protected settingsApiVersion: string;
    protected statsApiVersion: string;
    protected statsApiVersion_ae06047e: string;

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
    }

    /**
     * [Preview API] Increments a daily statistic associated with the extension
     *
     * @param {string} publisherName - Name of the publisher
     * @param {string} extensionName - Name of the extension
     * @param {string} version - Version of the extension
     * @param {string} statType - Type of stat to increment
     * @return IPromise<void>
     */
    public incrementExtensionDailyStat(
        publisherName: string,
        extensionName: string,
        version: string,
        statType: string
        ): IPromise<void> {

        const queryValues: any = {
            statType: statType
        };

        return this._beginRequest<void>({
            httpMethod: "POST",
            httpResponseType: "html",
            area: "gallery",
            locationId: "4fa7adb6-ca65-4075-a232-5f28323288ea",
            resource: "stats",
            routeTemplate: "_apis/public/{area}/publishers/{publisherName}/extensions/{extensionName}/{version}/{resource}",
            routeValues: {
                publisherName: publisherName,
                extensionName: extensionName,
                version: version
            },
            queryParams: queryValues,
            apiVersion: this.statsApiVersion
        });
    }

    /**
     * [Preview API] This route/location id only supports HTTP POST anonymously, so that the page view daily stat can be incremented from Marketplace client. Trying to call GET on this route should result in an exception. Without this explicit implementation, calling GET on this public route invokes the above GET implementation GetExtensionDailyStats.
     *
     * @param {string} publisherName - Name of the publisher
     * @param {string} extensionName - Name of the extension
     * @param {string} version - Version of the extension
     * @return IPromise<Contracts.ExtensionDailyStats>
     */
    public getExtensionDailyStatsAnonymous(
        publisherName: string,
        extensionName: string,
        version: string
        ): IPromise<Contracts.ExtensionDailyStats> {

        return this._beginRequest<Contracts.ExtensionDailyStats>({
            httpMethod: "GET",
            area: "gallery",
            locationId: "4fa7adb6-ca65-4075-a232-5f28323288ea",
            resource: "stats",
            routeTemplate: "_apis/public/{area}/publishers/{publisherName}/extensions/{extensionName}/{version}/{resource}",
            responseType: Contracts.TypeInfo.ExtensionDailyStats,
            routeValues: {
                publisherName: publisherName,
                extensionName: extensionName,
                version: version
            },
            apiVersion: this.statsApiVersion
        });
    }

    /**
     * [Preview API]
     *
     * @param {string} publisherName
     * @param {string} extensionName
     * @param {number} days
     * @param {Contracts.ExtensionStatsAggregateType} aggregate
     * @param {Date} afterDate
     * @return IPromise<Contracts.ExtensionDailyStats>
     */
    public getExtensionDailyStats(
        publisherName: string,
        extensionName: string,
        days?: number,
        aggregate?: Contracts.ExtensionStatsAggregateType,
        afterDate?: Date
        ): IPromise<Contracts.ExtensionDailyStats> {

        const queryValues: any = {
            days: days,
            aggregate: aggregate,
            afterDate: afterDate
        };

        return this._beginRequest<Contracts.ExtensionDailyStats>({
            httpMethod: "GET",
            area: "gallery",
            locationId: "ae06047e-51c5-4fb4-ab65-7be488544416",
            resource: "stats",
            routeTemplate: "_apis/{area}/publishers/{publisherName}/extensions/{extensionName}/{resource}",
            responseType: Contracts.TypeInfo.ExtensionDailyStats,
            routeValues: {
                publisherName: publisherName,
                extensionName: extensionName
            },
            queryParams: queryValues,
            apiVersion: this.statsApiVersion_ae06047e
        });
    }

    /**
     * [Preview API] Set all setting entries for the given user/all-users scope
     *
     * @param {{ [key: string] : any; }} entries - A key-value pair of all settings that need to be set
     * @param {string} userScope - User-Scope at which to get the value. Should be "me" for the current user or "host" for all users.
     * @return IPromise<void>
     */
    public setGalleryUserSettings(
        entries: { [key: string] : any; },
        userScope: string
        ): IPromise<void> {

        return this._beginRequest<void>({
            httpMethod: "PATCH",
            httpResponseType: "html",
            area: "gallery",
            locationId: "9b75ece3-7960-401c-848b-148ac01ca350",
            resource: "settings",
            routeTemplate: "_apis/{area}/{resource}/{userScope}/{*key}",
            routeValues: {
                userScope: userScope
            },
            apiVersion: this.settingsApiVersion,
            data: entries
        });
    }

    /**
     * [Preview API] Get all setting entries for the given user/all-users scope
     *
     * @param {string} userScope - User-Scope at which to get the value. Should be "me" for the current user or "host" for all users.
     * @param {string} key - Optional key under which to filter all the entries
     * @return IPromise<{ [key: string] : any; }>
     */
    public getGalleryUserSettings(
        userScope: string,
        key?: string
        ): IPromise<{ [key: string] : any; }> {

        return this._beginRequest<{ [key: string] : any; }>({
            httpMethod: "GET",
            area: "gallery",
            locationId: "9b75ece3-7960-401c-848b-148ac01ca350",
            resource: "settings",
            routeTemplate: "_apis/{area}/{resource}/{userScope}/{*key}",
            responseIsCollection: true,
            routeValues: {
                userScope: userScope,
                key: key
            },
            apiVersion: this.settingsApiVersion
        });
    }

    /**
     * [Preview API] Returns extension reports
     *
     * @param {string} publisherName - Name of the publisher who published the extension
     * @param {string} extensionName - Name of the extension
     * @param {number} days - Last n days report. If afterDate and days are specified, days will take priority
     * @param {number} count - Number of events to be returned
     * @param {Date} afterDate - Use if you want to fetch events newer than the specified date
     * @return IPromise<any>
     */
    public getExtensionReports(
        publisherName: string,
        extensionName: string,
        days?: number,
        count?: number,
        afterDate?: Date
        ): IPromise<any> {

        const queryValues: any = {
            days: days,
            count: count,
            afterDate: afterDate
        };

        return this._beginRequest<any>({
            httpMethod: "GET",
            area: "gallery",
            locationId: "79e0c74f-157f-437e-845f-74fbb4121d4c",
            resource: "reports",
            routeTemplate: "_apis/{area}/publishers/{publisherName}/extensions/{extensionName}/{resource}",
            routeValues: {
                publisherName: publisherName,
                extensionName: extensionName
            },
            queryParams: queryValues,
            apiVersion: this.reportsApiVersion
        });
    }

    /**
     * [Preview API] API endpoint to publish extension install/uninstall events. This is meant to be invoked by EMS only for sending us data related to install/uninstall of an extension.
     *
     * @param {Contracts.ExtensionEvents[]} extensionEvents
     * @return IPromise<void>
     */
    public publishExtensionEvents(
        extensionEvents: Contracts.ExtensionEvents[]
        ): IPromise<void> {

        return this._beginRequest<void>({
            httpMethod: "POST",
            httpResponseType: "html",
            area: "gallery",
            locationId: "0bf2bd3a-70e0-4d5d-8bf7-bd4a9c2ab6e7",
            resource: "events",
            routeTemplate: "_apis/{area}/{resource}",
            requestType: Contracts.TypeInfo.ExtensionEvents,
            apiVersion: this.eventsApiVersion,
            data: extensionEvents
        });
    }

    /**
     * [Preview API] Get install/uninstall events of an extension. If both count and afterDate parameters are specified, count takes precedence.
     *
     * @param {string} publisherName - Name of the publisher
     * @param {string} extensionName - Name of the extension
     * @param {number} count - Count of events to fetch, applies to each event type.
     * @param {Date} afterDate - Fetch events that occurred on or after this date
     * @param {string} include - Filter options. Supported values: install, uninstall, review, acquisition, sales. Default is to fetch all types of events
     * @param {string} includeProperty - Event properties to include. Currently only 'lastContactDetails' is supported for uninstall events
     * @return IPromise<Contracts.ExtensionEvents>
     */
    public getExtensionEvents(
        publisherName: string,
        extensionName: string,
        count?: number,
        afterDate?: Date,
        include?: string,
        includeProperty?: string
        ): IPromise<Contracts.ExtensionEvents> {

        const queryValues: any = {
            count: count,
            afterDate: afterDate,
            include: include,
            includeProperty: includeProperty
        };

        return this._beginRequest<Contracts.ExtensionEvents>({
            httpMethod: "GET",
            area: "gallery",
            locationId: "3d13c499-2168-4d06-bef4-14aba185dcd5",
            resource: "events",
            routeTemplate: "_apis/{area}/publishers/{publisherName}/extensions/{extensionName}/{resource}",
            responseType: Contracts.TypeInfo.ExtensionEvents,
            routeValues: {
                publisherName: publisherName,
                extensionName: extensionName
            },
            queryParams: queryValues,
            apiVersion: this.eventsApiVersion_3d13c499
        });
    }

    /**
     * [Preview API]
     *
     * @param {string} product
     * @param {number} lcid
     * @param {string} source
     * @param {string} productVersion
     * @param {string} skus
     * @param {string} subSkus
     * @return IPromise<Contracts.ProductCategoriesResult>
     */
    public getRootCategories(
        product: string,
        lcid?: number,
        source?: string,
        productVersion?: string,
        skus?: string,
        subSkus?: string
        ): IPromise<Contracts.ProductCategoriesResult> {

        const queryValues: any = {
            lcid: lcid,
            source: source,
            productVersion: productVersion,
            skus: skus,
            subSkus: subSkus
        };

        return this._beginRequest<Contracts.ProductCategoriesResult>({
            httpMethod: "GET",
            area: "gallery",
            locationId: "31fba831-35b2-46f6-a641-d05de5a877d8",
            resource: "categories",
            routeTemplate: "_apis/public/{area}/{product}/{resource}/root",
            routeValues: {
                product: product
            },
            queryParams: queryValues,
            apiVersion: this.categoriesApiVersion_31fba831
        });
    }

    /**
     * [Preview API]
     *
     * @param {string} product
     * @param {string} categoryId
     * @param {number} lcid
     * @param {string} source
     * @param {string} productVersion
     * @param {string} skus
     * @param {string} subSkus
     * @return IPromise<Contracts.ProductCategory>
     */
    public getCategoryTree(
        product: string,
        categoryId: string,
        lcid?: number,
        source?: string,
        productVersion?: string,
        skus?: string,
        subSkus?: string
        ): IPromise<Contracts.ProductCategory> {

        const queryValues: any = {
            lcid: lcid,
            source: source,
            productVersion: productVersion,
            skus: skus,
            subSkus: subSkus
        };

        return this._beginRequest<Contracts.ProductCategory>({
            httpMethod: "GET",
            area: "gallery",
            locationId: "1102bb42-82b0-4955-8d8a-435d6b4cedd3",
            resource: "categories",
            routeTemplate: "_apis/public/{area}/{product}/{resource}/{categoryId}",
            routeValues: {
                product: product,
                categoryId: categoryId
            },
            queryParams: queryValues,
            apiVersion: this.categoriesApiVersion_1102bb42
        });
    }
}

export class CommonMethods3_2To5 extends CommonMethods3_1To5 {
    protected extensionsApiVersion: string;
    protected extensionsApiVersion_a41192c8: string;
    protected notificationsApiVersion: string;
    protected qnaApiVersion: string;
    protected qnaApiVersion_6d1d9741: string;
    protected qnaApiVersion_784910cd: string;
    protected qnaApiVersion_c010d03d: string;
    protected reviewsApiVersion_b7b44e21: string;
    protected verificationlogApiVersion: string;

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
    }

    /**
     * [Preview API]
     *
     * @param {string} publisherName
     * @param {string} extensionName
     * @param {string} version
     * @return IPromise<ArrayBuffer>
     */
    public getVerificationLog(
        publisherName: string,
        extensionName: string,
        version: string
        ): IPromise<ArrayBuffer> {

        return this._beginRequest<ArrayBuffer>({
            httpMethod: "GET",
            httpResponseType: "application/octet-stream",
            area: "gallery",
            locationId: "c5523abe-b843-437f-875b-5833064efe4d",
            resource: "verificationlog",
            routeTemplate: "_apis/{area}/publishers/{publisherName}/extensions/{extensionName}/{version}/{resource}",
            routeValues: {
                publisherName: publisherName,
                extensionName: extensionName,
                version: version
            },
            apiVersion: this.verificationlogApiVersion
        });
    }

    /**
     * [Preview API] Returns a summary of the reviews
     *
     * @param {string} pubName - Name of the publisher who published the extension
     * @param {string} extName - Name of the extension
     * @param {Date} beforeDate - Use if you want to fetch summary of reviews older than the specified date, defaults to null
     * @param {Date} afterDate - Use if you want to fetch summary of reviews newer than the specified date, defaults to null
     * @return IPromise<Contracts.ReviewSummary>
     */
    public getReviewsSummary(
        pubName: string,
        extName: string,
        beforeDate?: Date,
        afterDate?: Date
        ): IPromise<Contracts.ReviewSummary> {

        const queryValues: any = {
            beforeDate: beforeDate,
            afterDate: afterDate
        };

        return this._beginRequest<Contracts.ReviewSummary>({
            httpMethod: "GET",
            area: "gallery",
            locationId: "b7b44e21-209e-48f0-ae78-04727fc37d77",
            resource: "reviews",
            routeTemplate: "_apis/public/{area}/publishers/{pubName}/extensions/{extName}/{resource}/summary",
            routeValues: {
                pubName: pubName,
                extName: extName
            },
            queryParams: queryValues,
            apiVersion: this.reviewsApiVersion_b7b44e21
        });
    }

    /**
     * [Preview API] Updates an existing response for a given question for an extension.
     *
     * @param {Contracts.Response} response - Updated response to be set for the extension.
     * @param {string} publisherName - Name of the publisher who published the extension.
     * @param {string} extensionName - Name of the extension.
     * @param {number} questionId - Identifier of the question for which response is to be updated for the extension.
     * @param {number} responseId - Identifier of the response which has to be updated.
     * @return IPromise<Contracts.Response>
     */
    public updateResponse(
        response: Contracts.Response,
        publisherName: string,
        extensionName: string,
        questionId: number,
        responseId: number
        ): IPromise<Contracts.Response> {

        return this._beginRequest<Contracts.Response>({
            httpMethod: "PATCH",
            area: "gallery",
            locationId: "7f8ae5e0-46b0-438f-b2e8-13e8513517bd",
            resource: "qna",
            routeTemplate: "_apis/{area}/publishers/{publisherName}/extensions/{extensionName}/{resource}/{questionId}/responses/{responseId}",
            requestType: Contracts.TypeInfo.Response,
            responseType: Contracts.TypeInfo.Response,
            routeValues: {
                publisherName: publisherName,
                extensionName: extensionName,
                questionId: questionId,
                responseId: responseId
            },
            apiVersion: this.qnaApiVersion,
            data: response
        });
    }

    /**
     * [Preview API] Deletes a response for an extension. (soft delete)
     *
     * @param {string} publisherName - Name of the publisher who published the extension.
     * @param {string} extensionName - Name of the extension.
     * @param {number} questionId - Identifies the question whose response is to be deleted.
     * @param {number} responseId - Identifies the response to be deleted.
     * @return IPromise<void>
     */
    public deleteResponse(
        publisherName: string,
        extensionName: string,
        questionId: number,
        responseId: number
        ): IPromise<void> {

        return this._beginRequest<void>({
            httpMethod: "DELETE",
            httpResponseType: "html",
            area: "gallery",
            locationId: "7f8ae5e0-46b0-438f-b2e8-13e8513517bd",
            resource: "qna",
            routeTemplate: "_apis/{area}/publishers/{publisherName}/extensions/{extensionName}/{resource}/{questionId}/responses/{responseId}",
            routeValues: {
                publisherName: publisherName,
                extensionName: extensionName,
                questionId: questionId,
                responseId: responseId
            },
            apiVersion: this.qnaApiVersion
        });
    }

    /**
     * [Preview API] Creates a new response for a given question for an extension.
     *
     * @param {Contracts.Response} response - Response to be created for the extension.
     * @param {string} publisherName - Name of the publisher who published the extension.
     * @param {string} extensionName - Name of the extension.
     * @param {number} questionId - Identifier of the question for which response is to be created for the extension.
     * @return IPromise<Contracts.Response>
     */
    public createResponse(
        response: Contracts.Response,
        publisherName: string,
        extensionName: string,
        questionId: number
        ): IPromise<Contracts.Response> {

        return this._beginRequest<Contracts.Response>({
            httpMethod: "POST",
            area: "gallery",
            locationId: "7f8ae5e0-46b0-438f-b2e8-13e8513517bd",
            resource: "qna",
            routeTemplate: "_apis/{area}/publishers/{publisherName}/extensions/{extensionName}/{resource}/{questionId}/responses/{responseId}",
            requestType: Contracts.TypeInfo.Response,
            responseType: Contracts.TypeInfo.Response,
            routeValues: {
                publisherName: publisherName,
                extensionName: extensionName,
                questionId: questionId
            },
            apiVersion: this.qnaApiVersion,
            data: response
        });
    }

    /**
     * [Preview API] Updates an existing question for an extension.
     *
     * @param {Contracts.Question} question - Updated question to be set for the extension.
     * @param {string} publisherName - Name of the publisher who published the extension.
     * @param {string} extensionName - Name of the extension.
     * @param {number} questionId - Identifier of the question to be updated for the extension.
     * @return IPromise<Contracts.Question>
     */
    public updateQuestion(
        question: Contracts.Question,
        publisherName: string,
        extensionName: string,
        questionId: number
        ): IPromise<Contracts.Question> {

        return this._beginRequest<Contracts.Question>({
            httpMethod: "PATCH",
            area: "gallery",
            locationId: "6d1d9741-eca8-4701-a3a5-235afc82dfa4",
            resource: "qna",
            routeTemplate: "_apis/{area}/publishers/{publisherName}/extensions/{extensionName}/{resource}/{questionId}",
            requestType: Contracts.TypeInfo.Question,
            responseType: Contracts.TypeInfo.Question,
            routeValues: {
                publisherName: publisherName,
                extensionName: extensionName,
                questionId: questionId
            },
            apiVersion: this.qnaApiVersion_6d1d9741,
            data: question
        });
    }

    /**
     * [Preview API] Deletes an existing question and all its associated responses for an extension. (soft delete)
     *
     * @param {string} publisherName - Name of the publisher who published the extension.
     * @param {string} extensionName - Name of the extension.
     * @param {number} questionId - Identifier of the question to be deleted for the extension.
     * @return IPromise<void>
     */
    public deleteQuestion(
        publisherName: string,
        extensionName: string,
        questionId: number
        ): IPromise<void> {

        return this._beginRequest<void>({
            httpMethod: "DELETE",
            httpResponseType: "html",
            area: "gallery",
            locationId: "6d1d9741-eca8-4701-a3a5-235afc82dfa4",
            resource: "qna",
            routeTemplate: "_apis/{area}/publishers/{publisherName}/extensions/{extensionName}/{resource}/{questionId}",
            routeValues: {
                publisherName: publisherName,
                extensionName: extensionName,
                questionId: questionId
            },
            apiVersion: this.qnaApiVersion_6d1d9741
        });
    }

    /**
     * [Preview API] Creates a new question for an extension.
     *
     * @param {Contracts.Question} question - Question to be created for the extension.
     * @param {string} publisherName - Name of the publisher who published the extension.
     * @param {string} extensionName - Name of the extension.
     * @return IPromise<Contracts.Question>
     */
    public createQuestion(
        question: Contracts.Question,
        publisherName: string,
        extensionName: string
        ): IPromise<Contracts.Question> {

        return this._beginRequest<Contracts.Question>({
            httpMethod: "POST",
            area: "gallery",
            locationId: "6d1d9741-eca8-4701-a3a5-235afc82dfa4",
            resource: "qna",
            routeTemplate: "_apis/{area}/publishers/{publisherName}/extensions/{extensionName}/{resource}/{questionId}",
            requestType: Contracts.TypeInfo.Question,
            responseType: Contracts.TypeInfo.Question,
            routeValues: {
                publisherName: publisherName,
                extensionName: extensionName
            },
            apiVersion: this.qnaApiVersion_6d1d9741,
            data: question
        });
    }

    /**
     * [Preview API] Flags a concern with an existing question for an extension.
     *
     * @param {Contracts.Concern} concern - User reported concern with a question for the extension.
     * @param {string} pubName - Name of the publisher who published the extension.
     * @param {string} extName - Name of the extension.
     * @param {number} questionId - Identifier of the question to be updated for the extension.
     * @return IPromise<Contracts.Concern>
     */
    public reportQuestion(
        concern: Contracts.Concern,
        pubName: string,
        extName: string,
        questionId: number
        ): IPromise<Contracts.Concern> {

        return this._beginRequest<Contracts.Concern>({
            httpMethod: "POST",
            area: "gallery",
            locationId: "784910cd-254a-494d-898b-0728549b2f10",
            resource: "qna",
            routeTemplate: "_apis/{area}/publishers/{pubName}/extensions/{extName}/{resource}/{questionId}/concern",
            requestType: Contracts.TypeInfo.Concern,
            responseType: Contracts.TypeInfo.Concern,
            routeValues: {
                pubName: pubName,
                extName: extName,
                questionId: questionId
            },
            apiVersion: this.qnaApiVersion_784910cd,
            data: concern
        });
    }

    /**
     * [Preview API] Returns a list of questions with their responses associated with an extension.
     *
     * @param {string} publisherName - Name of the publisher who published the extension.
     * @param {string} extensionName - Name of the extension.
     * @param {number} count - Number of questions to retrieve (defaults to 10).
     * @param {number} page - Page number from which set of questions are to be retrieved.
     * @param {Date} afterDate - If provided, results questions are returned which were posted after this date
     * @return IPromise<Contracts.QuestionsResult>
     */
    public getQuestions(
        publisherName: string,
        extensionName: string,
        count?: number,
        page?: number,
        afterDate?: Date
        ): IPromise<Contracts.QuestionsResult> {

        const queryValues: any = {
            count: count,
            page: page,
            afterDate: afterDate
        };

        return this._beginRequest<Contracts.QuestionsResult>({
            httpMethod: "GET",
            area: "gallery",
            locationId: "c010d03d-812c-4ade-ae07-c1862475eda5",
            resource: "qna",
            routeTemplate: "_apis/public/{area}/publishers/{publisherName}/extensions/{extensionName}/{resource}",
            responseType: Contracts.TypeInfo.QuestionsResult,
            routeValues: {
                publisherName: publisherName,
                extensionName: extensionName
            },
            queryParams: queryValues,
            apiVersion: this.qnaApiVersion_c010d03d
        });
    }

    /**
     * [Preview API] Send Notification
     *
     * @param {Contracts.NotificationsData} notificationData - Denoting the data needed to send notification
     * @return IPromise<void>
     */
    public sendNotifications(
        notificationData: Contracts.NotificationsData
        ): IPromise<void> {

        return this._beginRequest<void>({
            httpMethod: "POST",
            httpResponseType: "html",
            area: "gallery",
            locationId: "eab39817-413c-4602-a49f-07ad00844980",
            resource: "notifications",
            routeTemplate: "_apis/{area}/{resource}",
            requestType: Contracts.TypeInfo.NotificationsData,
            apiVersion: this.notificationsApiVersion,
            data: notificationData
        });
    }

    /**
     * [Preview API] REST endpoint to update an extension.
     *
     * @param {any} content - Content to upload
     * @param {string} publisherName - Name of the publisher
     * @param {string} extensionName - Name of the extension
     * @param {boolean} bypassScopeCheck - This parameter decides if the scope change check needs to be invoked or not
     * @return IPromise<Contracts.PublishedExtension>
     */
    public updateExtension(
        content: any,
        publisherName: string,
        extensionName: string,
        bypassScopeCheck?: boolean
        ): IPromise<Contracts.PublishedExtension> {

        const queryValues: any = {
            bypassScopeCheck: bypassScopeCheck
        };

        return this._beginRequest<Contracts.PublishedExtension>({
            httpMethod: "PUT",
            area: "gallery",
            locationId: "e11ea35a-16fe-4b80-ab11-c4cab88a0966",
            resource: "extensions",
            routeTemplate: "_apis/{area}/publishers/{publisherName}/{resource}/{extensionName}",
            responseType: Contracts.TypeInfo.PublishedExtension,
            routeValues: {
                publisherName: publisherName,
                extensionName: extensionName
            },
            customHeaders: {
                "Content-Type": "application/octet-stream",
            },
            queryParams: queryValues,
            apiVersion: this.extensionsApiVersion,
            data: content,
            isRawData: true
        });
    }

    /**
     * [Preview API]
     *
     * @param {any} content - Content to upload
     * @param {string} publisherName
     * @return IPromise<Contracts.PublishedExtension>
     */
    public createExtensionWithPublisher(
        content: any,
        publisherName: string
        ): IPromise<Contracts.PublishedExtension> {

        return this._beginRequest<Contracts.PublishedExtension>({
            httpMethod: "POST",
            area: "gallery",
            locationId: "e11ea35a-16fe-4b80-ab11-c4cab88a0966",
            resource: "extensions",
            routeTemplate: "_apis/{area}/publishers/{publisherName}/{resource}/{extensionName}",
            responseType: Contracts.TypeInfo.PublishedExtension,
            routeValues: {
                publisherName: publisherName
            },
            customHeaders: {
                "Content-Type": "application/octet-stream",
            },
            apiVersion: this.extensionsApiVersion,
            data: content,
            isRawData: true
        });
    }

    /**
     * [Preview API]
     *
     * @param {string} extensionId
     * @return IPromise<Contracts.PublishedExtension>
     */
    public updateExtensionById(
        extensionId: string
        ): IPromise<Contracts.PublishedExtension> {

        return this._beginRequest<Contracts.PublishedExtension>({
            httpMethod: "PUT",
            area: "gallery",
            locationId: "a41192c8-9525-4b58-bc86-179fa549d80d",
            resource: "extensions",
            routeTemplate: "_apis/{area}/{resource}/{extensionId}",
            responseType: Contracts.TypeInfo.PublishedExtension,
            routeValues: {
                extensionId: extensionId
            },
            apiVersion: this.extensionsApiVersion_a41192c8
        });
    }

    /**
     * [Preview API]
     *
     * @param {any} content - Content to upload
     * @return IPromise<Contracts.PublishedExtension>
     */
    public createExtension(
        content: any
        ): IPromise<Contracts.PublishedExtension> {

        return this._beginRequest<Contracts.PublishedExtension>({
            httpMethod: "POST",
            area: "gallery",
            locationId: "a41192c8-9525-4b58-bc86-179fa549d80d",
            resource: "extensions",
            routeTemplate: "_apis/{area}/{resource}/{extensionId}",
            responseType: Contracts.TypeInfo.PublishedExtension,
            customHeaders: {
                "Content-Type": "application/octet-stream",
            },
            apiVersion: this.extensionsApiVersion_a41192c8,
            data: content,
            isRawData: true
        });
    }
}

export class CommonMethods4_1To5 extends CommonMethods3_2To5 {
    protected contentverificationlogApiVersion: string;
    protected draftsApiVersion: string;
    protected draftsApiVersion_02b33873: string;
    protected draftsApiVersion_b3ab127d: string;
    protected draftsApiVersion_f1db9c47: string;
    protected publisherassetApiVersion: string;

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
    }

    /**
     * [Preview API] Update publisher asset like logo. It accepts asset file as an octet stream and file name is passed in header values.
     *
     * @param {any} content - Content to upload
     * @param {string} publisherName - Internal name of the publisher
     * @param {string} assetType - Type of asset. Default value is 'logo'.
     * @param {String} fileName - Header to pass the filename of the uploaded data
     * @return IPromise<{ [key: string] : string; }>
     */
    public updatePublisherAsset(
        content: any,
        publisherName: string,
        assetType?: string,
        fileName?: String
        ): IPromise<{ [key: string] : string; }> {

        const queryValues: any = {
            assetType: assetType
        };

        return this._beginRequest<{ [key: string] : string; }>({
            httpMethod: "PUT",
            area: "gallery",
            locationId: "21143299-34f9-4c62-8ca8-53da691192f9",
            resource: "publisherasset",
            routeTemplate: "_apis/{area}/publishers/{publisherName}/{resource}",
            responseIsCollection: true,
            routeValues: {
                publisherName: publisherName
            },
            customHeaders: {
                "Content-Type": "application/octet-stream",
                "X-Market-UploadFileName": fileName,
            },
            queryParams: queryValues,
            apiVersion: this.publisherassetApiVersion,
            data: content,
            isRawData: true
        });
    }

    /**
     * [Preview API] Get publisher asset like logo as a stream
     *
     * @param {string} publisherName - Internal name of the publisher
     * @param {string} assetType - Type of asset. Default value is 'logo'.
     * @return IPromise<ArrayBuffer>
     */
    public getPublisherAsset(
        publisherName: string,
        assetType?: string
        ): IPromise<ArrayBuffer> {

        const queryValues: any = {
            assetType: assetType
        };

        return this._beginRequest<ArrayBuffer>({
            httpMethod: "GET",
            httpResponseType: "application/octet-stream",
            area: "gallery",
            locationId: "21143299-34f9-4c62-8ca8-53da691192f9",
            resource: "publisherasset",
            routeTemplate: "_apis/{area}/publishers/{publisherName}/{resource}",
            routeValues: {
                publisherName: publisherName
            },
            queryParams: queryValues,
            apiVersion: this.publisherassetApiVersion
        });
    }

    /**
     * [Preview API] Delete publisher asset like logo
     *
     * @param {string} publisherName - Internal name of the publisher
     * @param {string} assetType - Type of asset. Default value is 'logo'.
     * @return IPromise<void>
     */
    public deletePublisherAsset(
        publisherName: string,
        assetType?: string
        ): IPromise<void> {

        const queryValues: any = {
            assetType: assetType
        };

        return this._beginRequest<void>({
            httpMethod: "DELETE",
            httpResponseType: "html",
            area: "gallery",
            locationId: "21143299-34f9-4c62-8ca8-53da691192f9",
            resource: "publisherasset",
            routeTemplate: "_apis/{area}/publishers/{publisherName}/{resource}",
            routeValues: {
                publisherName: publisherName
            },
            queryParams: queryValues,
            apiVersion: this.publisherassetApiVersion
        });
    }

    /**
     * [Preview API]
     *
     * @param {string} publisherName
     * @param {string} draftId
     * @param {string} assetType
     * @return IPromise<ArrayBuffer>
     */
    public getAssetFromNewExtensionDraft(
        publisherName: string,
        draftId: string,
        assetType: string
        ): IPromise<ArrayBuffer> {

        return this._beginRequest<ArrayBuffer>({
            httpMethod: "GET",
            httpResponseType: "application/octet-stream",
            area: "gallery",
            locationId: "88c0b1c8-b4f1-498a-9b2a-8446ef9f32e7",
            resource: "drafts",
            routeTemplate: "_apis/{area}/publishers/{publisherName}/{resource}/{draftId}/assets/{*assetType}",
            routeValues: {
                publisherName: publisherName,
                draftId: draftId,
                assetType: assetType
            },
            apiVersion: this.draftsApiVersion
        });
    }

    /**
     * [Preview API]
     *
     * @param {string} publisherName
     * @param {string} draftId
     * @param {string} assetType
     * @param {string} extensionName
     * @return IPromise<ArrayBuffer>
     */
    public getAssetFromEditExtensionDraft(
        publisherName: string,
        draftId: string,
        assetType: string,
        extensionName: string
        ): IPromise<ArrayBuffer> {

        const queryValues: any = {
            extensionName: extensionName
        };

        return this._beginRequest<ArrayBuffer>({
            httpMethod: "GET",
            httpResponseType: "application/octet-stream",
            area: "gallery",
            locationId: "88c0b1c8-b4f1-498a-9b2a-8446ef9f32e7",
            resource: "drafts",
            routeTemplate: "_apis/{area}/publishers/{publisherName}/{resource}/{draftId}/assets/{*assetType}",
            routeValues: {
                publisherName: publisherName,
                draftId: draftId,
                assetType: assetType
            },
            queryParams: queryValues,
            apiVersion: this.draftsApiVersion
        });
    }

    /**
     * [Preview API]
     *
     * @param {string} content - Content to upload
     * @param {string} publisherName
     * @param {string} draftId
     * @param {string} assetType
     * @return IPromise<Contracts.ExtensionDraftAsset>
     */
    public addAssetForNewExtensionDraft(
        content: string,
        publisherName: string,
        draftId: string,
        assetType: string
        ): IPromise<Contracts.ExtensionDraftAsset> {

        return this._beginRequest<Contracts.ExtensionDraftAsset>({
            httpMethod: "PUT",
            area: "gallery",
            locationId: "88c0b1c8-b4f1-498a-9b2a-8446ef9f32e7",
            resource: "drafts",
            routeTemplate: "_apis/{area}/publishers/{publisherName}/{resource}/{draftId}/assets/{*assetType}",
            routeValues: {
                publisherName: publisherName,
                draftId: draftId,
                assetType: assetType
            },
            customHeaders: {
                "Content-Type": "application/octet-stream",
            },
            apiVersion: this.draftsApiVersion,
            data: content,
            isRawData: true
        });
    }

    /**
     * [Preview API]
     *
     * @param {any} content - Content to upload
     * @param {string} publisherName
     * @param {string} draftId
     * @param {String} fileName - Header to pass the filename of the uploaded data
     * @return IPromise<Contracts.ExtensionDraft>
     */
    public updatePayloadInDraftForNewExtension(
        content: any,
        publisherName: string,
        draftId: string,
        fileName?: String
        ): IPromise<Contracts.ExtensionDraft> {

        return this._beginRequest<Contracts.ExtensionDraft>({
            httpMethod: "PUT",
            area: "gallery",
            locationId: "b3ab127d-ebb9-4d22-b611-4e09593c8d79",
            resource: "drafts",
            routeTemplate: "_apis/{area}/publishers/{publisherName}/{resource}/{draftId}",
            responseType: Contracts.TypeInfo.ExtensionDraft,
            routeValues: {
                publisherName: publisherName,
                draftId: draftId
            },
            customHeaders: {
                "Content-Type": "application/octet-stream",
                "X-Market-UploadFileName": fileName,
            },
            apiVersion: this.draftsApiVersion_b3ab127d,
            data: content,
            isRawData: true
        });
    }

    /**
     * [Preview API]
     *
     * @param {Contracts.ExtensionDraftPatch} draftPatch
     * @param {string} publisherName
     * @param {string} draftId
     * @return IPromise<Contracts.ExtensionDraft>
     */
    public performNewExtensionDraftOperation(
        draftPatch: Contracts.ExtensionDraftPatch,
        publisherName: string,
        draftId: string
        ): IPromise<Contracts.ExtensionDraft> {

        return this._beginRequest<Contracts.ExtensionDraft>({
            httpMethod: "PATCH",
            area: "gallery",
            locationId: "b3ab127d-ebb9-4d22-b611-4e09593c8d79",
            resource: "drafts",
            routeTemplate: "_apis/{area}/publishers/{publisherName}/{resource}/{draftId}",
            requestType: Contracts.TypeInfo.ExtensionDraftPatch,
            responseType: Contracts.TypeInfo.ExtensionDraft,
            routeValues: {
                publisherName: publisherName,
                draftId: draftId
            },
            apiVersion: this.draftsApiVersion_b3ab127d,
            data: draftPatch
        });
    }

    /**
     * [Preview API]
     *
     * @param {any} content - Content to upload
     * @param {string} publisherName
     * @param {String} product - Header to pass the product type of the payload file
     * @param {String} fileName - Header to pass the filename of the uploaded data
     * @return IPromise<Contracts.ExtensionDraft>
     */
    public createDraftForNewExtension(
        content: any,
        publisherName: string,
        product: String,
        fileName?: String
        ): IPromise<Contracts.ExtensionDraft> {

        return this._beginRequest<Contracts.ExtensionDraft>({
            httpMethod: "POST",
            area: "gallery",
            locationId: "b3ab127d-ebb9-4d22-b611-4e09593c8d79",
            resource: "drafts",
            routeTemplate: "_apis/{area}/publishers/{publisherName}/{resource}/{draftId}",
            responseType: Contracts.TypeInfo.ExtensionDraft,
            routeValues: {
                publisherName: publisherName
            },
            customHeaders: {
                "Content-Type": "application/octet-stream",
                "X-Market-UploadFileProduct": product,
                "X-Market-UploadFileName": fileName,
            },
            apiVersion: this.draftsApiVersion_b3ab127d,
            data: content,
            isRawData: true
        });
    }

    /**
     * [Preview API]
     *
     * @param {string} content - Content to upload
     * @param {string} publisherName
     * @param {string} extensionName
     * @param {string} draftId
     * @param {string} assetType
     * @return IPromise<Contracts.ExtensionDraftAsset>
     */
    public addAssetForEditExtensionDraft(
        content: string,
        publisherName: string,
        extensionName: string,
        draftId: string,
        assetType: string
        ): IPromise<Contracts.ExtensionDraftAsset> {

        return this._beginRequest<Contracts.ExtensionDraftAsset>({
            httpMethod: "PUT",
            area: "gallery",
            locationId: "f1db9c47-6619-4998-a7e5-d7f9f41a4617",
            resource: "drafts",
            routeTemplate: "_apis/{area}/publishers/{publisherName}/extensions/{extensionName}/{resource}/{draftId}/assets/{*assetType}",
            routeValues: {
                publisherName: publisherName,
                extensionName: extensionName,
                draftId: draftId,
                assetType: assetType
            },
            customHeaders: {
                "Content-Type": "application/octet-stream",
            },
            apiVersion: this.draftsApiVersion_f1db9c47,
            data: content,
            isRawData: true
        });
    }

    /**
     * [Preview API]
     *
     * @param {any} content - Content to upload
     * @param {string} publisherName
     * @param {string} extensionName
     * @param {string} draftId
     * @param {String} fileName - Header to pass the filename of the uploaded data
     * @return IPromise<Contracts.ExtensionDraft>
     */
    public updatePayloadInDraftForEditExtension(
        content: any,
        publisherName: string,
        extensionName: string,
        draftId: string,
        fileName?: String
        ): IPromise<Contracts.ExtensionDraft> {

        return this._beginRequest<Contracts.ExtensionDraft>({
            httpMethod: "PUT",
            area: "gallery",
            locationId: "02b33873-4e61-496e-83a2-59d1df46b7d8",
            resource: "drafts",
            routeTemplate: "_apis/{area}/publishers/{publisherName}/extensions/{extensionName}/{resource}/{draftId}",
            responseType: Contracts.TypeInfo.ExtensionDraft,
            routeValues: {
                publisherName: publisherName,
                extensionName: extensionName,
                draftId: draftId
            },
            customHeaders: {
                "Content-Type": "application/octet-stream",
                "X-Market-UploadFileName": fileName,
            },
            apiVersion: this.draftsApiVersion_02b33873,
            data: content,
            isRawData: true
        });
    }

    /**
     * [Preview API]
     *
     * @param {Contracts.ExtensionDraftPatch} draftPatch
     * @param {string} publisherName
     * @param {string} extensionName
     * @param {string} draftId
     * @return IPromise<Contracts.ExtensionDraft>
     */
    public performEditExtensionDraftOperation(
        draftPatch: Contracts.ExtensionDraftPatch,
        publisherName: string,
        extensionName: string,
        draftId: string
        ): IPromise<Contracts.ExtensionDraft> {

        return this._beginRequest<Contracts.ExtensionDraft>({
            httpMethod: "PATCH",
            area: "gallery",
            locationId: "02b33873-4e61-496e-83a2-59d1df46b7d8",
            resource: "drafts",
            routeTemplate: "_apis/{area}/publishers/{publisherName}/extensions/{extensionName}/{resource}/{draftId}",
            requestType: Contracts.TypeInfo.ExtensionDraftPatch,
            responseType: Contracts.TypeInfo.ExtensionDraft,
            routeValues: {
                publisherName: publisherName,
                extensionName: extensionName,
                draftId: draftId
            },
            apiVersion: this.draftsApiVersion_02b33873,
            data: draftPatch
        });
    }

    /**
     * [Preview API]
     *
     * @param {string} publisherName
     * @param {string} extensionName
     * @return IPromise<Contracts.ExtensionDraft>
     */
    public createDraftForEditExtension(
        publisherName: string,
        extensionName: string
        ): IPromise<Contracts.ExtensionDraft> {

        return this._beginRequest<Contracts.ExtensionDraft>({
            httpMethod: "POST",
            area: "gallery",
            locationId: "02b33873-4e61-496e-83a2-59d1df46b7d8",
            resource: "drafts",
            routeTemplate: "_apis/{area}/publishers/{publisherName}/extensions/{extensionName}/{resource}/{draftId}",
            responseType: Contracts.TypeInfo.ExtensionDraft,
            routeValues: {
                publisherName: publisherName,
                extensionName: extensionName
            },
            apiVersion: this.draftsApiVersion_02b33873
        });
    }

    /**
     * [Preview API]
     *
     * @param {string} publisherName
     * @param {string} extensionName
     * @return IPromise<ArrayBuffer>
     */
    public getContentVerificationLog(
        publisherName: string,
        extensionName: string
        ): IPromise<ArrayBuffer> {

        return this._beginRequest<ArrayBuffer>({
            httpMethod: "GET",
            httpResponseType: "application/octet-stream",
            area: "gallery",
            locationId: "c0f1c7c4-3557-4ffb-b774-1e48c4865e99",
            resource: "contentverificationlog",
            routeTemplate: "_apis/{area}/publishers/{publisherName}/extensions/{extensionName}/{resource}",
            routeValues: {
                publisherName: publisherName,
                extensionName: extensionName
            },
            apiVersion: this.contentverificationlogApiVersion
        });
    }
}

/**
 * @exemptedapi
 */
export class GalleryHttpClient5 extends CommonMethods4_1To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.accountsApiVersion =
        this.accountsbynameApiVersion =
        this.acquisitionoptionsApiVersion =
        this.acquisitionrequestsApiVersion =
        this.assetbynameApiVersion =
        this.assetsApiVersion =
        this.authenticatedassetApiVersion =
        this.azurepublisherApiVersion =
        this.categoriesApiVersion =
        this.categoriesApiVersion_e0a5a71e =
        this.categoriesApiVersion_31fba831 =
        this.categoriesApiVersion_1102bb42 =
        this.certificatesApiVersion =
        this.contentverificationlogApiVersion =
        this.draftsApiVersion =
        this.draftsApiVersion_b3ab127d =
        this.draftsApiVersion_f1db9c47 =
        this.draftsApiVersion_02b33873 =
        this.eventsApiVersion =
        this.eventsApiVersion_3d13c499 =
        this.extensionqueryApiVersion =
        this.extensionValidatorApiVersion =
        this.notificationsApiVersion =
        this.packageApiVersion =
        this.privateassetApiVersion =
        this.publisherassetApiVersion =
        this.publisherqueryApiVersion =
        this.publishersApiVersion =
        this.qnaApiVersion =
        this.qnaApiVersion_6d1d9741 =
        this.qnaApiVersion_784910cd =
        this.qnaApiVersion_c010d03d =
        this.reportsApiVersion =
        this.reviewsApiVersion =
        this.reviewsApiVersion_5b3f819f =
        this.reviewsApiVersion_b7b44e21 =
        this.securedCategoriesApiVersion =
        this.settingsApiVersion =
        this.signingkeyApiVersion =
        this.statisticsApiVersion =
        this.statsApiVersion =
        this.statsApiVersion_ae06047e =
        this.verificationlogApiVersion = "5.0-preview.1";
        this.extensionsApiVersion =
        this.extensionsApiVersion_a41192c8 = "5.0-preview.2";
    }

    /**
     * [Preview API]
     *
     * @param {string} publisherName
     * @param {string} extensionName
     * @param {string} hostType
     * @param {string} hostName
     * @return IPromise<void>
     */
    public shareExtensionWithHost(
        publisherName: string,
        extensionName: string,
        hostType: string,
        hostName: string
        ): IPromise<void> {

        return this._beginRequest<void>({
            httpMethod: "POST",
            httpResponseType: "html",
            area: "gallery",
            locationId: "328a3af8-d124-46e9-9483-01690cd415b9",
            resource: "extensionshare",
            routeTemplate: "_apis/{area}/publisher/{publisherName}/extension/{extensionName}/{resource}/{hostType}/{hostName}",
            routeValues: {
                publisherName: publisherName,
                extensionName: extensionName,
                hostType: hostType,
                hostName: hostName
            },
            apiVersion: "5.0-preview.1"
        });
    }

    /**
     * [Preview API]
     *
     * @param {string} publisherName
     * @param {string} extensionName
     * @param {string} hostType
     * @param {string} hostName
     * @return IPromise<void>
     */
    public unshareExtensionWithHost(
        publisherName: string,
        extensionName: string,
        hostType: string,
        hostName: string
        ): IPromise<void> {

        return this._beginRequest<void>({
            httpMethod: "DELETE",
            httpResponseType: "html",
            area: "gallery",
            locationId: "328a3af8-d124-46e9-9483-01690cd415b9",
            resource: "extensionshare",
            routeTemplate: "_apis/{area}/publisher/{publisherName}/extension/{extensionName}/{resource}/{hostType}/{hostName}",
            routeValues: {
                publisherName: publisherName,
                extensionName: extensionName,
                hostType: hostType,
                hostName: hostName
            },
            apiVersion: "5.0-preview.1"
        });
    }
}

/**
 * @exemptedapi
 */
export class GalleryHttpClient4_1 extends CommonMethods4_1To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.accountsApiVersion =
        this.accountsbynameApiVersion =
        this.acquisitionoptionsApiVersion =
        this.acquisitionrequestsApiVersion =
        this.assetbynameApiVersion =
        this.assetsApiVersion =
        this.authenticatedassetApiVersion =
        this.azurepublisherApiVersion =
        this.categoriesApiVersion =
        this.categoriesApiVersion_e0a5a71e =
        this.categoriesApiVersion_31fba831 =
        this.categoriesApiVersion_1102bb42 =
        this.certificatesApiVersion =
        this.contentverificationlogApiVersion =
        this.draftsApiVersion =
        this.draftsApiVersion_b3ab127d =
        this.draftsApiVersion_f1db9c47 =
        this.draftsApiVersion_02b33873 =
        this.eventsApiVersion =
        this.eventsApiVersion_3d13c499 =
        this.extensionqueryApiVersion =
        this.extensionValidatorApiVersion =
        this.notificationsApiVersion =
        this.packageApiVersion =
        this.privateassetApiVersion =
        this.publisherassetApiVersion =
        this.publisherqueryApiVersion =
        this.publishersApiVersion =
        this.qnaApiVersion =
        this.qnaApiVersion_6d1d9741 =
        this.qnaApiVersion_784910cd =
        this.qnaApiVersion_c010d03d =
        this.reportsApiVersion =
        this.reviewsApiVersion =
        this.reviewsApiVersion_5b3f819f =
        this.reviewsApiVersion_b7b44e21 =
        this.securedCategoriesApiVersion =
        this.settingsApiVersion =
        this.signingkeyApiVersion =
        this.statisticsApiVersion =
        this.statsApiVersion =
        this.statsApiVersion_ae06047e =
        this.verificationlogApiVersion = "4.1-preview.1";
        this.extensionsApiVersion =
        this.extensionsApiVersion_a41192c8 = "4.1-preview.2";
    }
}

/**
 * @exemptedapi
 */
export class GalleryHttpClient4 extends CommonMethods3_2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.accountsApiVersion =
        this.accountsbynameApiVersion =
        this.acquisitionoptionsApiVersion =
        this.acquisitionrequestsApiVersion =
        this.assetbynameApiVersion =
        this.assetsApiVersion =
        this.authenticatedassetApiVersion =
        this.azurepublisherApiVersion =
        this.categoriesApiVersion =
        this.categoriesApiVersion_e0a5a71e =
        this.categoriesApiVersion_31fba831 =
        this.categoriesApiVersion_1102bb42 =
        this.certificatesApiVersion =
        this.eventsApiVersion =
        this.eventsApiVersion_3d13c499 =
        this.extensionqueryApiVersion =
        this.extensionValidatorApiVersion =
        this.notificationsApiVersion =
        this.packageApiVersion =
        this.privateassetApiVersion =
        this.publisherqueryApiVersion =
        this.publishersApiVersion =
        this.qnaApiVersion =
        this.qnaApiVersion_6d1d9741 =
        this.qnaApiVersion_784910cd =
        this.qnaApiVersion_c010d03d =
        this.reportsApiVersion =
        this.reviewsApiVersion =
        this.reviewsApiVersion_5b3f819f =
        this.reviewsApiVersion_b7b44e21 =
        this.securedCategoriesApiVersion =
        this.settingsApiVersion =
        this.signingkeyApiVersion =
        this.statisticsApiVersion =
        this.statsApiVersion =
        this.statsApiVersion_ae06047e =
        this.verificationlogApiVersion = "4.0-preview.1";
        this.extensionsApiVersion =
        this.extensionsApiVersion_a41192c8 = "4.0-preview.2";
    }
}

/**
 * @exemptedapi
 */
export class GalleryHttpClient3_2 extends CommonMethods3_2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.accountsApiVersion =
        this.accountsbynameApiVersion =
        this.acquisitionoptionsApiVersion =
        this.acquisitionrequestsApiVersion =
        this.assetbynameApiVersion =
        this.assetsApiVersion =
        this.authenticatedassetApiVersion =
        this.azurepublisherApiVersion =
        this.categoriesApiVersion =
        this.categoriesApiVersion_e0a5a71e =
        this.categoriesApiVersion_31fba831 =
        this.categoriesApiVersion_1102bb42 =
        this.certificatesApiVersion =
        this.eventsApiVersion =
        this.eventsApiVersion_3d13c499 =
        this.extensionqueryApiVersion =
        this.extensionValidatorApiVersion =
        this.notificationsApiVersion =
        this.packageApiVersion =
        this.privateassetApiVersion =
        this.publisherqueryApiVersion =
        this.publishersApiVersion =
        this.qnaApiVersion =
        this.qnaApiVersion_6d1d9741 =
        this.qnaApiVersion_784910cd =
        this.qnaApiVersion_c010d03d =
        this.reportsApiVersion =
        this.reviewsApiVersion =
        this.reviewsApiVersion_5b3f819f =
        this.reviewsApiVersion_b7b44e21 =
        this.securedCategoriesApiVersion =
        this.settingsApiVersion =
        this.signingkeyApiVersion =
        this.statisticsApiVersion =
        this.statsApiVersion =
        this.statsApiVersion_ae06047e =
        this.verificationlogApiVersion = "3.2-preview.1";
        this.extensionsApiVersion =
        this.extensionsApiVersion_a41192c8 = "3.2-preview.2";
    }
}

/**
 * @exemptedapi
 */
export class GalleryHttpClient3_1 extends CommonMethods3_1To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.accountsApiVersion =
        this.accountsbynameApiVersion =
        this.acquisitionoptionsApiVersion =
        this.acquisitionrequestsApiVersion =
        this.assetbynameApiVersion =
        this.assetsApiVersion =
        this.authenticatedassetApiVersion =
        this.azurepublisherApiVersion =
        this.categoriesApiVersion =
        this.categoriesApiVersion_e0a5a71e =
        this.categoriesApiVersion_31fba831 =
        this.categoriesApiVersion_1102bb42 =
        this.certificatesApiVersion =
        this.eventsApiVersion =
        this.eventsApiVersion_3d13c499 =
        this.extensionqueryApiVersion =
        this.extensionsApiVersion =
        this.extensionsApiVersion_a41192c8 =
        this.extensionValidatorApiVersion =
        this.packageApiVersion =
        this.privateassetApiVersion =
        this.publisherqueryApiVersion =
        this.publishersApiVersion =
        this.reportsApiVersion =
        this.reviewsApiVersion =
        this.reviewsApiVersion_5b3f819f =
        this.securedCategoriesApiVersion =
        this.settingsApiVersion =
        this.signingkeyApiVersion =
        this.statisticsApiVersion =
        this.statsApiVersion =
        this.statsApiVersion_ae06047e = "3.1-preview.1";
    }

    /**
     * [Preview API]
     *
     * @param {Contracts.ExtensionPackage} extensionPackage
     * @return IPromise<Contracts.PublishedExtension>
     */
    public createExtension(
        extensionPackage: Contracts.ExtensionPackage
        ): IPromise<Contracts.PublishedExtension> {

        return this._beginRequest<Contracts.PublishedExtension>({
            httpMethod: "POST",
            area: "gallery",
            locationId: "a41192c8-9525-4b58-bc86-179fa549d80d",
            resource: "extensions",
            routeTemplate: "_apis/{area}/{resource}/{extensionId}",
            responseType: Contracts.TypeInfo.PublishedExtension,
            apiVersion: "3.1-preview.1",
            data: extensionPackage
        });
    }

    /**
     * [Preview API]
     *
     * @param {Contracts.ExtensionPackage} extensionPackage
     * @param {string} extensionId
     * @return IPromise<Contracts.PublishedExtension>
     */
    public updateExtensionById(
        extensionPackage: Contracts.ExtensionPackage,
        extensionId: string
        ): IPromise<Contracts.PublishedExtension> {

        return this._beginRequest<Contracts.PublishedExtension>({
            httpMethod: "PUT",
            area: "gallery",
            locationId: "a41192c8-9525-4b58-bc86-179fa549d80d",
            resource: "extensions",
            routeTemplate: "_apis/{area}/{resource}/{extensionId}",
            responseType: Contracts.TypeInfo.PublishedExtension,
            routeValues: {
                extensionId: extensionId
            },
            apiVersion: "3.1-preview.1",
            data: extensionPackage
        });
    }

    /**
     * [Preview API]
     *
     * @param {Contracts.ExtensionPackage} extensionPackage
     * @param {string} publisherName
     * @return IPromise<Contracts.PublishedExtension>
     */
    public createExtensionWithPublisher(
        extensionPackage: Contracts.ExtensionPackage,
        publisherName: string
        ): IPromise<Contracts.PublishedExtension> {

        return this._beginRequest<Contracts.PublishedExtension>({
            httpMethod: "POST",
            area: "gallery",
            locationId: "e11ea35a-16fe-4b80-ab11-c4cab88a0966",
            resource: "extensions",
            routeTemplate: "_apis/{area}/publishers/{publisherName}/{resource}/{extensionName}",
            responseType: Contracts.TypeInfo.PublishedExtension,
            routeValues: {
                publisherName: publisherName
            },
            apiVersion: "3.1-preview.1",
            data: extensionPackage
        });
    }

    /**
     * [Preview API]
     *
     * @param {Contracts.ExtensionPackage} extensionPackage
     * @param {string} publisherName
     * @param {string} extensionName
     * @param {boolean} bypassScopeCheck
     * @return IPromise<Contracts.PublishedExtension>
     */
    public updateExtension(
        extensionPackage: Contracts.ExtensionPackage,
        publisherName: string,
        extensionName: string,
        bypassScopeCheck?: boolean
        ): IPromise<Contracts.PublishedExtension> {

        const queryValues: any = {
            bypassScopeCheck: bypassScopeCheck
        };

        return this._beginRequest<Contracts.PublishedExtension>({
            httpMethod: "PUT",
            area: "gallery",
            locationId: "e11ea35a-16fe-4b80-ab11-c4cab88a0966",
            resource: "extensions",
            routeTemplate: "_apis/{area}/publishers/{publisherName}/{resource}/{extensionName}",
            responseType: Contracts.TypeInfo.PublishedExtension,
            routeValues: {
                publisherName: publisherName,
                extensionName: extensionName
            },
            queryParams: queryValues,
            apiVersion: "3.1-preview.1",
            data: extensionPackage
        });
    }
}

/**
 * @exemptedapi
 */
export class GalleryHttpClient3 extends CommonMethods3To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.accountsApiVersion =
        this.accountsbynameApiVersion =
        this.acquisitionoptionsApiVersion =
        this.acquisitionrequestsApiVersion =
        this.assetbynameApiVersion =
        this.assetsApiVersion =
        this.authenticatedassetApiVersion =
        this.azurepublisherApiVersion =
        this.categoriesApiVersion =
        this.categoriesApiVersion_e0a5a71e =
        this.certificatesApiVersion =
        this.extensionqueryApiVersion =
        this.extensionsApiVersion =
        this.extensionsApiVersion_a41192c8 =
        this.extensionValidatorApiVersion =
        this.packageApiVersion =
        this.privateassetApiVersion =
        this.publisherqueryApiVersion =
        this.publishersApiVersion =
        this.reviewsApiVersion =
        this.reviewsApiVersion_5b3f819f =
        this.securedCategoriesApiVersion =
        this.signingkeyApiVersion =
        this.statisticsApiVersion = "3.0-preview.1";
    }

    /**
     * [Preview API]
     *
     * @param {Contracts.ExtensionPackage} extensionPackage
     * @return IPromise<Contracts.PublishedExtension>
     */
    public createExtension(
        extensionPackage: Contracts.ExtensionPackage
        ): IPromise<Contracts.PublishedExtension> {

        return this._beginRequest<Contracts.PublishedExtension>({
            httpMethod: "POST",
            area: "gallery",
            locationId: "a41192c8-9525-4b58-bc86-179fa549d80d",
            resource: "extensions",
            routeTemplate: "_apis/{area}/{resource}/{extensionId}",
            responseType: Contracts.TypeInfo.PublishedExtension,
            apiVersion: "3.0-preview.1",
            data: extensionPackage
        });
    }

    /**
     * [Preview API]
     *
     * @param {Contracts.ExtensionPackage} extensionPackage
     * @param {string} extensionId
     * @return IPromise<Contracts.PublishedExtension>
     */
    public updateExtensionById(
        extensionPackage: Contracts.ExtensionPackage,
        extensionId: string
        ): IPromise<Contracts.PublishedExtension> {

        return this._beginRequest<Contracts.PublishedExtension>({
            httpMethod: "PUT",
            area: "gallery",
            locationId: "a41192c8-9525-4b58-bc86-179fa549d80d",
            resource: "extensions",
            routeTemplate: "_apis/{area}/{resource}/{extensionId}",
            responseType: Contracts.TypeInfo.PublishedExtension,
            routeValues: {
                extensionId: extensionId
            },
            apiVersion: "3.0-preview.1",
            data: extensionPackage
        });
    }

    /**
     * [Preview API]
     *
     * @param {Contracts.ExtensionPackage} extensionPackage
     * @param {string} publisherName
     * @return IPromise<Contracts.PublishedExtension>
     */
    public createExtensionWithPublisher(
        extensionPackage: Contracts.ExtensionPackage,
        publisherName: string
        ): IPromise<Contracts.PublishedExtension> {

        return this._beginRequest<Contracts.PublishedExtension>({
            httpMethod: "POST",
            area: "gallery",
            locationId: "e11ea35a-16fe-4b80-ab11-c4cab88a0966",
            resource: "extensions",
            routeTemplate: "_apis/{area}/publishers/{publisherName}/{resource}/{extensionName}",
            responseType: Contracts.TypeInfo.PublishedExtension,
            routeValues: {
                publisherName: publisherName
            },
            apiVersion: "3.0-preview.1",
            data: extensionPackage
        });
    }

    /**
     * [Preview API]
     *
     * @param {Contracts.ExtensionPackage} extensionPackage
     * @param {string} publisherName
     * @param {string} extensionName
     * @param {boolean} bypassScopeCheck
     * @return IPromise<Contracts.PublishedExtension>
     */
    public updateExtension(
        extensionPackage: Contracts.ExtensionPackage,
        publisherName: string,
        extensionName: string,
        bypassScopeCheck?: boolean
        ): IPromise<Contracts.PublishedExtension> {

        const queryValues: any = {
            bypassScopeCheck: bypassScopeCheck
        };

        return this._beginRequest<Contracts.PublishedExtension>({
            httpMethod: "PUT",
            area: "gallery",
            locationId: "e11ea35a-16fe-4b80-ab11-c4cab88a0966",
            resource: "extensions",
            routeTemplate: "_apis/{area}/publishers/{publisherName}/{resource}/{extensionName}",
            responseType: Contracts.TypeInfo.PublishedExtension,
            routeValues: {
                publisherName: publisherName,
                extensionName: extensionName
            },
            queryParams: queryValues,
            apiVersion: "3.0-preview.1",
            data: extensionPackage
        });
    }
}

/**
 * @exemptedapi
 */
export class GalleryHttpClient2_3 extends CommonMethods2_2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.accountsApiVersion =
        this.accountsbynameApiVersion =
        this.acquisitionoptionsApiVersion =
        this.acquisitionrequestsApiVersion =
        this.assetbynameApiVersion =
        this.assetsApiVersion =
        this.categoriesApiVersion =
        this.categoriesApiVersion_e0a5a71e =
        this.certificatesApiVersion =
        this.extensionqueryApiVersion =
        this.extensionsApiVersion =
        this.extensionsApiVersion_a41192c8 =
        this.packageApiVersion =
        this.privateassetApiVersion =
        this.publisherqueryApiVersion =
        this.publishersApiVersion =
        this.signingkeyApiVersion = "2.3-preview.1";
    }

    /**
     * [Preview API]
     *
     * @param {Contracts.ExtensionPackage} extensionPackage
     * @return IPromise<Contracts.PublishedExtension>
     */
    public createExtension(
        extensionPackage: Contracts.ExtensionPackage
        ): IPromise<Contracts.PublishedExtension> {

        return this._beginRequest<Contracts.PublishedExtension>({
            httpMethod: "POST",
            area: "gallery",
            locationId: "a41192c8-9525-4b58-bc86-179fa549d80d",
            resource: "extensions",
            routeTemplate: "_apis/{area}/{resource}/{extensionId}",
            responseType: Contracts.TypeInfo.PublishedExtension,
            apiVersion: "2.3-preview.1",
            data: extensionPackage
        });
    }

    /**
     * [Preview API]
     *
     * @param {Contracts.ExtensionPackage} extensionPackage
     * @param {string} extensionId
     * @return IPromise<Contracts.PublishedExtension>
     */
    public updateExtensionById(
        extensionPackage: Contracts.ExtensionPackage,
        extensionId: string
        ): IPromise<Contracts.PublishedExtension> {

        return this._beginRequest<Contracts.PublishedExtension>({
            httpMethod: "PUT",
            area: "gallery",
            locationId: "a41192c8-9525-4b58-bc86-179fa549d80d",
            resource: "extensions",
            routeTemplate: "_apis/{area}/{resource}/{extensionId}",
            responseType: Contracts.TypeInfo.PublishedExtension,
            routeValues: {
                extensionId: extensionId
            },
            apiVersion: "2.3-preview.1",
            data: extensionPackage
        });
    }

    /**
     * [Preview API]
     *
     * @param {Contracts.ExtensionPackage} extensionPackage
     * @param {string} publisherName
     * @return IPromise<Contracts.PublishedExtension>
     */
    public createExtensionWithPublisher(
        extensionPackage: Contracts.ExtensionPackage,
        publisherName: string
        ): IPromise<Contracts.PublishedExtension> {

        return this._beginRequest<Contracts.PublishedExtension>({
            httpMethod: "POST",
            area: "gallery",
            locationId: "e11ea35a-16fe-4b80-ab11-c4cab88a0966",
            resource: "extensions",
            routeTemplate: "_apis/{area}/publishers/{publisherName}/{resource}/{extensionName}",
            responseType: Contracts.TypeInfo.PublishedExtension,
            routeValues: {
                publisherName: publisherName
            },
            apiVersion: "2.3-preview.1",
            data: extensionPackage
        });
    }

    /**
     * [Preview API]
     *
     * @param {Contracts.ExtensionPackage} extensionPackage
     * @param {string} publisherName
     * @param {string} extensionName
     * @param {boolean} bypassScopeCheck
     * @return IPromise<Contracts.PublishedExtension>
     */
    public updateExtension(
        extensionPackage: Contracts.ExtensionPackage,
        publisherName: string,
        extensionName: string,
        bypassScopeCheck?: boolean
        ): IPromise<Contracts.PublishedExtension> {

        const queryValues: any = {
            bypassScopeCheck: bypassScopeCheck
        };

        return this._beginRequest<Contracts.PublishedExtension>({
            httpMethod: "PUT",
            area: "gallery",
            locationId: "e11ea35a-16fe-4b80-ab11-c4cab88a0966",
            resource: "extensions",
            routeTemplate: "_apis/{area}/publishers/{publisherName}/{resource}/{extensionName}",
            responseType: Contracts.TypeInfo.PublishedExtension,
            routeValues: {
                publisherName: publisherName,
                extensionName: extensionName
            },
            queryParams: queryValues,
            apiVersion: "2.3-preview.1",
            data: extensionPackage
        });
    }
}

/**
 * @exemptedapi
 */
export class GalleryHttpClient2_2 extends CommonMethods2_2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.accountsApiVersion =
        this.accountsbynameApiVersion =
        this.acquisitionoptionsApiVersion =
        this.acquisitionrequestsApiVersion =
        this.assetbynameApiVersion =
        this.assetsApiVersion =
        this.categoriesApiVersion =
        this.categoriesApiVersion_e0a5a71e =
        this.certificatesApiVersion =
        this.extensionqueryApiVersion =
        this.extensionsApiVersion =
        this.extensionsApiVersion_a41192c8 =
        this.packageApiVersion =
        this.privateassetApiVersion =
        this.publisherqueryApiVersion =
        this.publishersApiVersion =
        this.signingkeyApiVersion = "2.2-preview.1";
    }

    /**
     * [Preview API]
     *
     * @param {Contracts.ExtensionPackage} extensionPackage
     * @return IPromise<Contracts.PublishedExtension>
     */
    public createExtension(
        extensionPackage: Contracts.ExtensionPackage
        ): IPromise<Contracts.PublishedExtension> {

        return this._beginRequest<Contracts.PublishedExtension>({
            httpMethod: "POST",
            area: "gallery",
            locationId: "a41192c8-9525-4b58-bc86-179fa549d80d",
            resource: "extensions",
            routeTemplate: "_apis/{area}/{resource}/{extensionId}",
            responseType: Contracts.TypeInfo.PublishedExtension,
            apiVersion: "2.2-preview.1",
            data: extensionPackage
        });
    }

    /**
     * [Preview API]
     *
     * @param {Contracts.ExtensionPackage} extensionPackage
     * @param {string} extensionId
     * @return IPromise<Contracts.PublishedExtension>
     */
    public updateExtensionById(
        extensionPackage: Contracts.ExtensionPackage,
        extensionId: string
        ): IPromise<Contracts.PublishedExtension> {

        return this._beginRequest<Contracts.PublishedExtension>({
            httpMethod: "PUT",
            area: "gallery",
            locationId: "a41192c8-9525-4b58-bc86-179fa549d80d",
            resource: "extensions",
            routeTemplate: "_apis/{area}/{resource}/{extensionId}",
            responseType: Contracts.TypeInfo.PublishedExtension,
            routeValues: {
                extensionId: extensionId
            },
            apiVersion: "2.2-preview.1",
            data: extensionPackage
        });
    }

    /**
     * [Preview API]
     *
     * @param {Contracts.ExtensionPackage} extensionPackage
     * @param {string} publisherName
     * @return IPromise<Contracts.PublishedExtension>
     */
    public createExtensionWithPublisher(
        extensionPackage: Contracts.ExtensionPackage,
        publisherName: string
        ): IPromise<Contracts.PublishedExtension> {

        return this._beginRequest<Contracts.PublishedExtension>({
            httpMethod: "POST",
            area: "gallery",
            locationId: "e11ea35a-16fe-4b80-ab11-c4cab88a0966",
            resource: "extensions",
            routeTemplate: "_apis/{area}/publishers/{publisherName}/{resource}/{extensionName}",
            responseType: Contracts.TypeInfo.PublishedExtension,
            routeValues: {
                publisherName: publisherName
            },
            apiVersion: "2.2-preview.1",
            data: extensionPackage
        });
    }

    /**
     * [Preview API]
     *
     * @param {Contracts.ExtensionPackage} extensionPackage
     * @param {string} publisherName
     * @param {string} extensionName
     * @param {boolean} bypassScopeCheck
     * @return IPromise<Contracts.PublishedExtension>
     */
    public updateExtension(
        extensionPackage: Contracts.ExtensionPackage,
        publisherName: string,
        extensionName: string,
        bypassScopeCheck?: boolean
        ): IPromise<Contracts.PublishedExtension> {

        const queryValues: any = {
            bypassScopeCheck: bypassScopeCheck
        };

        return this._beginRequest<Contracts.PublishedExtension>({
            httpMethod: "PUT",
            area: "gallery",
            locationId: "e11ea35a-16fe-4b80-ab11-c4cab88a0966",
            resource: "extensions",
            routeTemplate: "_apis/{area}/publishers/{publisherName}/{resource}/{extensionName}",
            responseType: Contracts.TypeInfo.PublishedExtension,
            routeValues: {
                publisherName: publisherName,
                extensionName: extensionName
            },
            queryParams: queryValues,
            apiVersion: "2.2-preview.1",
            data: extensionPackage
        });
    }
}

/**
 * @exemptedapi
 */
export class GalleryHttpClient2_1 extends CommonMethods2_1To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.accountsApiVersion =
        this.accountsbynameApiVersion =
        this.acquisitionrequestsApiVersion =
        this.assetbynameApiVersion =
        this.assetsApiVersion =
        this.categoriesApiVersion =
        this.categoriesApiVersion_e0a5a71e =
        this.certificatesApiVersion =
        this.extensionqueryApiVersion =
        this.extensionsApiVersion =
        this.extensionsApiVersion_a41192c8 =
        this.packageApiVersion =
        this.privateassetApiVersion =
        this.publisherqueryApiVersion =
        this.publishersApiVersion =
        this.signingkeyApiVersion = "2.1-preview.1";
    }

    /**
     * [Preview API]
     *
     * @param {Contracts.ExtensionPackage} extensionPackage
     * @return IPromise<Contracts.PublishedExtension>
     */
    public createExtension(
        extensionPackage: Contracts.ExtensionPackage
        ): IPromise<Contracts.PublishedExtension> {

        return this._beginRequest<Contracts.PublishedExtension>({
            httpMethod: "POST",
            area: "gallery",
            locationId: "a41192c8-9525-4b58-bc86-179fa549d80d",
            resource: "extensions",
            routeTemplate: "_apis/{area}/{resource}/{extensionId}",
            responseType: Contracts.TypeInfo.PublishedExtension,
            apiVersion: "2.1-preview.1",
            data: extensionPackage
        });
    }

    /**
     * [Preview API]
     *
     * @param {Contracts.ExtensionPackage} extensionPackage
     * @param {string} extensionId
     * @return IPromise<Contracts.PublishedExtension>
     */
    public updateExtensionById(
        extensionPackage: Contracts.ExtensionPackage,
        extensionId: string
        ): IPromise<Contracts.PublishedExtension> {

        return this._beginRequest<Contracts.PublishedExtension>({
            httpMethod: "PUT",
            area: "gallery",
            locationId: "a41192c8-9525-4b58-bc86-179fa549d80d",
            resource: "extensions",
            routeTemplate: "_apis/{area}/{resource}/{extensionId}",
            responseType: Contracts.TypeInfo.PublishedExtension,
            routeValues: {
                extensionId: extensionId
            },
            apiVersion: "2.1-preview.1",
            data: extensionPackage
        });
    }

    /**
     * [Preview API]
     *
     * @param {Contracts.ExtensionPackage} extensionPackage
     * @param {string} publisherName
     * @return IPromise<Contracts.PublishedExtension>
     */
    public createExtensionWithPublisher(
        extensionPackage: Contracts.ExtensionPackage,
        publisherName: string
        ): IPromise<Contracts.PublishedExtension> {

        return this._beginRequest<Contracts.PublishedExtension>({
            httpMethod: "POST",
            area: "gallery",
            locationId: "e11ea35a-16fe-4b80-ab11-c4cab88a0966",
            resource: "extensions",
            routeTemplate: "_apis/{area}/publishers/{publisherName}/{resource}/{extensionName}",
            responseType: Contracts.TypeInfo.PublishedExtension,
            routeValues: {
                publisherName: publisherName
            },
            apiVersion: "2.1-preview.1",
            data: extensionPackage
        });
    }

    /**
     * [Preview API]
     *
     * @param {Contracts.ExtensionPackage} extensionPackage
     * @param {string} publisherName
     * @param {string} extensionName
     * @param {boolean} bypassScopeCheck
     * @return IPromise<Contracts.PublishedExtension>
     */
    public updateExtension(
        extensionPackage: Contracts.ExtensionPackage,
        publisherName: string,
        extensionName: string,
        bypassScopeCheck?: boolean
        ): IPromise<Contracts.PublishedExtension> {

        const queryValues: any = {
            bypassScopeCheck: bypassScopeCheck
        };

        return this._beginRequest<Contracts.PublishedExtension>({
            httpMethod: "PUT",
            area: "gallery",
            locationId: "e11ea35a-16fe-4b80-ab11-c4cab88a0966",
            resource: "extensions",
            routeTemplate: "_apis/{area}/publishers/{publisherName}/{resource}/{extensionName}",
            responseType: Contracts.TypeInfo.PublishedExtension,
            routeValues: {
                publisherName: publisherName,
                extensionName: extensionName
            },
            queryParams: queryValues,
            apiVersion: "2.1-preview.1",
            data: extensionPackage
        });
    }
}

/**
 * @exemptedapi
 */
export class GalleryHttpClient2 extends CommonMethods2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.accountsApiVersion =
        this.accountsbynameApiVersion =
        this.assetbynameApiVersion =
        this.assetsApiVersion =
        this.categoriesApiVersion =
        this.categoriesApiVersion_e0a5a71e =
        this.certificatesApiVersion =
        this.extensionqueryApiVersion =
        this.extensionsApiVersion =
        this.extensionsApiVersion_a41192c8 =
        this.packageApiVersion =
        this.privateassetApiVersion =
        this.publisherqueryApiVersion =
        this.publishersApiVersion =
        this.signingkeyApiVersion = "2.0-preview.1";
    }

    /**
     * [Preview API]
     *
     * @param {Contracts.ExtensionPackage} extensionPackage
     * @return IPromise<Contracts.PublishedExtension>
     */
    public createExtension(
        extensionPackage: Contracts.ExtensionPackage
        ): IPromise<Contracts.PublishedExtension> {

        return this._beginRequest<Contracts.PublishedExtension>({
            httpMethod: "POST",
            area: "gallery",
            locationId: "a41192c8-9525-4b58-bc86-179fa549d80d",
            resource: "extensions",
            routeTemplate: "_apis/{area}/{resource}/{extensionId}",
            responseType: Contracts.TypeInfo.PublishedExtension,
            apiVersion: "2.0-preview.1",
            data: extensionPackage
        });
    }

    /**
     * [Preview API]
     *
     * @param {Contracts.ExtensionPackage} extensionPackage
     * @param {string} extensionId
     * @return IPromise<Contracts.PublishedExtension>
     */
    public updateExtensionById(
        extensionPackage: Contracts.ExtensionPackage,
        extensionId: string
        ): IPromise<Contracts.PublishedExtension> {

        return this._beginRequest<Contracts.PublishedExtension>({
            httpMethod: "PUT",
            area: "gallery",
            locationId: "a41192c8-9525-4b58-bc86-179fa549d80d",
            resource: "extensions",
            routeTemplate: "_apis/{area}/{resource}/{extensionId}",
            responseType: Contracts.TypeInfo.PublishedExtension,
            routeValues: {
                extensionId: extensionId
            },
            apiVersion: "2.0-preview.1",
            data: extensionPackage
        });
    }

    /**
     * [Preview API]
     *
     * @param {Contracts.ExtensionPackage} extensionPackage
     * @param {string} publisherName
     * @return IPromise<Contracts.PublishedExtension>
     */
    public createExtensionWithPublisher(
        extensionPackage: Contracts.ExtensionPackage,
        publisherName: string
        ): IPromise<Contracts.PublishedExtension> {

        return this._beginRequest<Contracts.PublishedExtension>({
            httpMethod: "POST",
            area: "gallery",
            locationId: "e11ea35a-16fe-4b80-ab11-c4cab88a0966",
            resource: "extensions",
            routeTemplate: "_apis/{area}/publishers/{publisherName}/{resource}/{extensionName}",
            responseType: Contracts.TypeInfo.PublishedExtension,
            routeValues: {
                publisherName: publisherName
            },
            apiVersion: "2.0-preview.1",
            data: extensionPackage
        });
    }

    /**
     * [Preview API]
     *
     * @param {Contracts.ExtensionPackage} extensionPackage
     * @param {string} publisherName
     * @param {string} extensionName
     * @param {boolean} bypassScopeCheck
     * @return IPromise<Contracts.PublishedExtension>
     */
    public updateExtension(
        extensionPackage: Contracts.ExtensionPackage,
        publisherName: string,
        extensionName: string,
        bypassScopeCheck?: boolean
        ): IPromise<Contracts.PublishedExtension> {

        const queryValues: any = {
            bypassScopeCheck: bypassScopeCheck
        };

        return this._beginRequest<Contracts.PublishedExtension>({
            httpMethod: "PUT",
            area: "gallery",
            locationId: "e11ea35a-16fe-4b80-ab11-c4cab88a0966",
            resource: "extensions",
            routeTemplate: "_apis/{area}/publishers/{publisherName}/{resource}/{extensionName}",
            responseType: Contracts.TypeInfo.PublishedExtension,
            routeValues: {
                publisherName: publisherName,
                extensionName: extensionName
            },
            queryParams: queryValues,
            apiVersion: "2.0-preview.1",
            data: extensionPackage
        });
    }
}

export class GalleryHttpClient extends GalleryHttpClient5 {
    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
    }
}

const clientMapping: { [id: string]: new (routeRequestPath: string) => VSS_WebApi.VssHttpClient; } = {
    "5.0": GalleryHttpClient5,
    "4.1": GalleryHttpClient4_1,
    "4.0": GalleryHttpClient4,
    "3.2": GalleryHttpClient3_2,
    "3.1": GalleryHttpClient3_1,
    "3.0": GalleryHttpClient3,
    "2.3": GalleryHttpClient2_3,
    "2.2": GalleryHttpClient2_2,
    "2.1": GalleryHttpClient2_1,
    "2.0": GalleryHttpClient2
}

/**
 * Gets an http client targeting the latest released version of the APIs.
 *
 * @return GalleryHttpClient5
 */
export function getClient(options?: VSS_WebApi.IVssHttpClientOptions): GalleryHttpClient5 {
    if ((<any>window).VSS && (<any>window).VSS.VssSDKRestVersion && clientMapping[(<any>window).VSS.VssSDKRestVersion]) {
        return VSS_Service.getClient<GalleryHttpClient5>(<any>(clientMapping[(<any>window).VSS.VssSDKRestVersion]), undefined, undefined, undefined, options);
    }
    else {
        return VSS_Service.getClient<GalleryHttpClient5>(GalleryHttpClient5, undefined, undefined, undefined, options);
    }
}
