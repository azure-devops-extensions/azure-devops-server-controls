/**
 * ---------------------------------------------------------
 * Generated file, DO NOT EDIT
 * ---------------------------------------------------------
 *
 * See following wiki page for instructions on how to regenerate:
 *   https://aka.ms/azure-devops-client-generation
 *
 * Configuration file:
 *   extensionmanagement\client\webapi\httpclients\clientgeneratorconfigs\genclient.json
 */

"use strict";

import Contracts = require("VSS/Contributions/Contracts");
import VSS_Gallery_Contracts = require("VSS/Gallery/Contracts");
import VSS_Service = require("VSS/Service");
import VSS_WebApi = require("VSS/WebApi/RestClient");

export class CommonMethods2To5 extends VSS_WebApi.VssHttpClient {

    public static serviceInstanceId = "00000028-0000-8888-8000-000000000000";
    protected installedExtensionsApiVersion: string;
    protected requestedExtensionsApiVersion: string;
    protected requestedExtensionsApiVersion_216b978f: string;
    protected requestedExtensionsApiVersion_aa93e1f3: string;
    protected requestedExtensionsApiVersion_ba93e1f3: string;
    protected tokenApiVersion: string;

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
    }

    /**
     * [Preview API]
     *
     * @return IPromise<string>
     */
    public getToken(): IPromise<string> {

        return this._beginRequest<string>({
            httpMethod: "GET",
            area: "ExtensionManagement",
            locationId: "3a2e24ed-1d6f-4cb2-9f3b-45a96bbfaf50",
            resource: "Token",
            routeTemplate: "_apis/{area}/{resource}",
            apiVersion: this.tokenApiVersion
        });
    }

    /**
     * [Preview API]
     *
     * @param {string} publisherName
     * @param {string} extensionName
     * @param {string} requestMessage
     * @return IPromise<Contracts.RequestedExtension>
     */
    public requestExtension(
        publisherName: string,
        extensionName: string,
        requestMessage: string
        ): IPromise<Contracts.RequestedExtension> {

        return this._beginRequest<Contracts.RequestedExtension>({
            httpMethod: "POST",
            area: "ExtensionManagement",
            locationId: "f5afca1e-a728-4294-aa2d-4af0173431b5",
            resource: "RequestedExtensions",
            routeTemplate: "_apis/{area}/{resource}/{publisherName}/{extensionName}/requests/me",
            responseType: Contracts.TypeInfo.RequestedExtension,
            routeValues: {
                publisherName: publisherName,
                extensionName: extensionName
            },
            apiVersion: this.requestedExtensionsApiVersion,
            data: requestMessage
        });
    }

    /**
     * [Preview API]
     *
     * @param {string} publisherName
     * @param {string} extensionName
     * @return IPromise<void>
     */
    public deleteRequest(
        publisherName: string,
        extensionName: string
        ): IPromise<void> {

        return this._beginRequest<void>({
            httpMethod: "DELETE",
            httpResponseType: "html",
            area: "ExtensionManagement",
            locationId: "f5afca1e-a728-4294-aa2d-4af0173431b5",
            resource: "RequestedExtensions",
            routeTemplate: "_apis/{area}/{resource}/{publisherName}/{extensionName}/requests/me",
            routeValues: {
                publisherName: publisherName,
                extensionName: extensionName
            },
            apiVersion: this.requestedExtensionsApiVersion
        });
    }

    /**
     * [Preview API]
     *
     * @param {string} rejectMessage
     * @param {string} publisherName
     * @param {string} extensionName
     * @param {Contracts.ExtensionRequestState} state
     * @return IPromise<number>
     */
    public resolveAllRequests(
        rejectMessage: string,
        publisherName: string,
        extensionName: string,
        state: Contracts.ExtensionRequestState
        ): IPromise<number> {

        const queryValues: any = {
            state: state
        };

        return this._beginRequest<number>({
            httpMethod: "PATCH",
            area: "ExtensionManagement",
            locationId: "ba93e1f3-511c-4364-8b9c-eb98818f2e0b",
            resource: "RequestedExtensions",
            routeTemplate: "_apis/{area}/{resource}/{publisherName}/{extensionName}",
            routeValues: {
                publisherName: publisherName,
                extensionName: extensionName
            },
            queryParams: queryValues,
            apiVersion: this.requestedExtensionsApiVersion_ba93e1f3,
            data: rejectMessage
        });
    }

    /**
     * [Preview API]
     *
     * @return IPromise<Contracts.RequestedExtension[]>
     */
    public getRequests(): IPromise<Contracts.RequestedExtension[]> {

        return this._beginRequest<Contracts.RequestedExtension[]>({
            httpMethod: "GET",
            area: "ExtensionManagement",
            locationId: "216b978f-b164-424e-ada2-b77561e842b7",
            resource: "RequestedExtensions",
            routeTemplate: "_apis/{area}/{resource}",
            responseType: Contracts.TypeInfo.RequestedExtension,
            responseIsCollection: true,
            apiVersion: this.requestedExtensionsApiVersion_216b978f
        });
    }

    /**
     * [Preview API]
     *
     * @param {string} rejectMessage
     * @param {string} publisherName
     * @param {string} extensionName
     * @param {string} requesterId
     * @param {Contracts.ExtensionRequestState} state
     * @return IPromise<number>
     */
    public resolveRequest(
        rejectMessage: string,
        publisherName: string,
        extensionName: string,
        requesterId: string,
        state: Contracts.ExtensionRequestState
        ): IPromise<number> {

        const queryValues: any = {
            state: state
        };

        return this._beginRequest<number>({
            httpMethod: "PATCH",
            area: "ExtensionManagement",
            locationId: "aa93e1f3-511c-4364-8b9c-eb98818f2e0b",
            resource: "RequestedExtensions",
            routeTemplate: "_apis/{area}/{resource}/{publisherName}/{extensionName}/requests/{requesterId}",
            routeValues: {
                publisherName: publisherName,
                extensionName: extensionName,
                requesterId: requesterId
            },
            queryParams: queryValues,
            apiVersion: this.requestedExtensionsApiVersion_aa93e1f3,
            data: rejectMessage
        });
    }

    /**
     * [Preview API] Update an installed extension. Typically this API is used to enable or disable an extension.
     *
     * @param {Contracts.InstalledExtension} extension
     * @return IPromise<Contracts.InstalledExtension>
     */
    public updateInstalledExtension(
        extension: Contracts.InstalledExtension
        ): IPromise<Contracts.InstalledExtension> {

        return this._beginRequest<Contracts.InstalledExtension>({
            httpMethod: "PATCH",
            area: "ExtensionManagement",
            locationId: "275424d0-c844-4fe2-bda6-04933a1357d8",
            resource: "InstalledExtensions",
            routeTemplate: "_apis/{area}/{resource}/{extensionId}",
            requestType: Contracts.TypeInfo.InstalledExtension,
            responseType: Contracts.TypeInfo.InstalledExtension,
            apiVersion: this.installedExtensionsApiVersion,
            data: extension
        });
    }

    /**
     * [Preview API] List the installed extensions in the account / project collection.
     *
     * @param {boolean} includeDisabledExtensions - If true (the default), include disabled extensions in the results.
     * @param {boolean} includeErrors - If true, include installed extensions with errors.
     * @param {string[]} assetTypes
     * @param {boolean} includeInstallationIssues
     * @return IPromise<Contracts.InstalledExtension[]>
     */
    public getInstalledExtensions(
        includeDisabledExtensions?: boolean,
        includeErrors?: boolean,
        assetTypes?: string[],
        includeInstallationIssues?: boolean
        ): IPromise<Contracts.InstalledExtension[]> {

        const queryValues: any = {
            includeDisabledExtensions: includeDisabledExtensions,
            includeErrors: includeErrors,
            assetTypes: assetTypes && assetTypes.join(":"),
            includeInstallationIssues: includeInstallationIssues
        };

        return this._beginRequest<Contracts.InstalledExtension[]>({
            httpMethod: "GET",
            area: "ExtensionManagement",
            locationId: "275424d0-c844-4fe2-bda6-04933a1357d8",
            resource: "InstalledExtensions",
            routeTemplate: "_apis/{area}/{resource}/{extensionId}",
            responseType: Contracts.TypeInfo.InstalledExtension,
            responseIsCollection: true,
            queryParams: queryValues,
            apiVersion: this.installedExtensionsApiVersion
        });
    }
}

export class CommonMethods2_1To5 extends CommonMethods2To5 {
    protected dataApiVersion: string;
    protected extensionStatesApiVersion: string;
    protected installedExtensionQueryApiVersion: string;
    protected installedExtensionsByNameApiVersion: string;

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
    }

    /**
     * [Preview API] Uninstall the specified extension from the account / project collection.
     *
     * @param {string} publisherName - Name of the publisher. Example: "fabrikam".
     * @param {string} extensionName - Name of the extension. Example: "ops-tools".
     * @param {string} reason
     * @param {string} reasonCode
     * @return IPromise<void>
     */
    public uninstallExtensionByName(
        publisherName: string,
        extensionName: string,
        reason?: string,
        reasonCode?: string
        ): IPromise<void> {

        const queryValues: any = {
            reason: reason,
            reasonCode: reasonCode
        };

        return this._beginRequest<void>({
            httpMethod: "DELETE",
            httpResponseType: "html",
            area: "ExtensionManagement",
            locationId: "fb0da285-f23e-4b56-8b53-3ef5f9f6de66",
            resource: "InstalledExtensionsByName",
            routeTemplate: "_apis/{area}/{resource}/{publisherName}/{extensionName}/{version}",
            routeValues: {
                publisherName: publisherName,
                extensionName: extensionName
            },
            queryParams: queryValues,
            apiVersion: this.installedExtensionsByNameApiVersion
        });
    }

    /**
     * [Preview API] Install the specified extension into the account / project collection.
     *
     * @param {string} publisherName - Name of the publisher. Example: "fabrikam".
     * @param {string} extensionName - Name of the extension. Example: "ops-tools".
     * @param {string} version
     * @return IPromise<Contracts.InstalledExtension>
     */
    public installExtensionByName(
        publisherName: string,
        extensionName: string,
        version?: string
        ): IPromise<Contracts.InstalledExtension> {

        return this._beginRequest<Contracts.InstalledExtension>({
            httpMethod: "POST",
            area: "ExtensionManagement",
            locationId: "fb0da285-f23e-4b56-8b53-3ef5f9f6de66",
            resource: "InstalledExtensionsByName",
            routeTemplate: "_apis/{area}/{resource}/{publisherName}/{extensionName}/{version}",
            responseType: Contracts.TypeInfo.InstalledExtension,
            routeValues: {
                publisherName: publisherName,
                extensionName: extensionName,
                version: version
            },
            apiVersion: this.installedExtensionsByNameApiVersion
        });
    }

    /**
     * [Preview API] Get an installed extension by its publisher and extension name.
     *
     * @param {string} publisherName - Name of the publisher. Example: "fabrikam".
     * @param {string} extensionName - Name of the extension. Example: "ops-tools".
     * @param {string[]} assetTypes
     * @return IPromise<Contracts.InstalledExtension>
     */
    public getInstalledExtensionByName(
        publisherName: string,
        extensionName: string,
        assetTypes?: string[]
        ): IPromise<Contracts.InstalledExtension> {

        const queryValues: any = {
            assetTypes: assetTypes && assetTypes.join(":")
        };

        return this._beginRequest<Contracts.InstalledExtension>({
            httpMethod: "GET",
            area: "ExtensionManagement",
            locationId: "fb0da285-f23e-4b56-8b53-3ef5f9f6de66",
            resource: "InstalledExtensionsByName",
            routeTemplate: "_apis/{area}/{resource}/{publisherName}/{extensionName}/{version}",
            responseType: Contracts.TypeInfo.InstalledExtension,
            routeValues: {
                publisherName: publisherName,
                extensionName: extensionName
            },
            queryParams: queryValues,
            apiVersion: this.installedExtensionsByNameApiVersion
        });
    }

    /**
     * [Preview API]
     *
     * @param {Contracts.InstalledExtensionQuery} query
     * @return IPromise<Contracts.InstalledExtension[]>
     */
    public queryExtensions(
        query: Contracts.InstalledExtensionQuery
        ): IPromise<Contracts.InstalledExtension[]> {

        return this._beginRequest<Contracts.InstalledExtension[]>({
            httpMethod: "POST",
            area: "ExtensionManagement",
            locationId: "046c980f-1345-4ce2-bf85-b46d10ff4cfd",
            resource: "InstalledExtensionQuery",
            routeTemplate: "_apis/{area}/{resource}",
            responseType: Contracts.TypeInfo.InstalledExtension,
            responseIsCollection: true,
            apiVersion: this.installedExtensionQueryApiVersion,
            data: query
        });
    }

    /**
     * [Preview API] List state and version information for all installed extensions.
     *
     * @param {boolean} includeDisabled - If true (the default), include disabled extensions in the results.
     * @param {boolean} includeErrors - If true, include installed extensions in an error state in the results.
     * @param {boolean} includeInstallationIssues
     * @return IPromise<Contracts.ExtensionState[]>
     */
    public getStates(
        includeDisabled?: boolean,
        includeErrors?: boolean,
        includeInstallationIssues?: boolean
        ): IPromise<Contracts.ExtensionState[]> {

        const queryValues: any = {
            includeDisabled: includeDisabled,
            includeErrors: includeErrors,
            includeInstallationIssues: includeInstallationIssues
        };

        return this._beginRequest<Contracts.ExtensionState[]>({
            httpMethod: "GET",
            area: "ExtensionManagement",
            locationId: "92755d3d-9a8a-42b3-8a4d-87359fe5aa93",
            resource: "ExtensionStates",
            routeTemplate: "_apis/{area}/{resource}",
            responseType: Contracts.TypeInfo.ExtensionState,
            responseIsCollection: true,
            queryParams: queryValues,
            apiVersion: this.extensionStatesApiVersion
        });
    }

    /**
     * [Preview API]
     *
     * @param {any} doc
     * @param {string} publisherName
     * @param {string} extensionName
     * @param {string} scopeType
     * @param {string} scopeValue
     * @param {string} collectionName
     * @return IPromise<any>
     */
    public updateDocumentByName(
        doc: any,
        publisherName: string,
        extensionName: string,
        scopeType: string,
        scopeValue: string,
        collectionName: string
        ): IPromise<any> {

        return this._beginRequest<any>({
            httpMethod: "PATCH",
            area: "ExtensionManagement",
            locationId: "bbe06c18-1c8b-4fcd-b9c6-1535aaab8749",
            resource: "Data",
            routeTemplate: "_apis/{area}/InstalledExtensions/{publisherName}/{extensionName}/{resource}/Scopes/{scopeType}/{scopeValue}/Collections/{collectionName}/Documents/{documentId}",
            routeValues: {
                publisherName: publisherName,
                extensionName: extensionName,
                scopeType: scopeType,
                scopeValue: scopeValue,
                collectionName: collectionName
            },
            apiVersion: this.dataApiVersion,
            data: doc
        });
    }

    /**
     * [Preview API]
     *
     * @param {any} doc
     * @param {string} publisherName
     * @param {string} extensionName
     * @param {string} scopeType
     * @param {string} scopeValue
     * @param {string} collectionName
     * @return IPromise<any>
     */
    public setDocumentByName(
        doc: any,
        publisherName: string,
        extensionName: string,
        scopeType: string,
        scopeValue: string,
        collectionName: string
        ): IPromise<any> {

        return this._beginRequest<any>({
            httpMethod: "PUT",
            area: "ExtensionManagement",
            locationId: "bbe06c18-1c8b-4fcd-b9c6-1535aaab8749",
            resource: "Data",
            routeTemplate: "_apis/{area}/InstalledExtensions/{publisherName}/{extensionName}/{resource}/Scopes/{scopeType}/{scopeValue}/Collections/{collectionName}/Documents/{documentId}",
            routeValues: {
                publisherName: publisherName,
                extensionName: extensionName,
                scopeType: scopeType,
                scopeValue: scopeValue,
                collectionName: collectionName
            },
            apiVersion: this.dataApiVersion,
            data: doc
        });
    }

    /**
     * [Preview API]
     *
     * @param {string} publisherName
     * @param {string} extensionName
     * @param {string} scopeType
     * @param {string} scopeValue
     * @param {string} collectionName
     * @return IPromise<any[]>
     */
    public getDocumentsByName(
        publisherName: string,
        extensionName: string,
        scopeType: string,
        scopeValue: string,
        collectionName: string
        ): IPromise<any[]> {

        return this._beginRequest<any[]>({
            httpMethod: "GET",
            area: "ExtensionManagement",
            locationId: "bbe06c18-1c8b-4fcd-b9c6-1535aaab8749",
            resource: "Data",
            routeTemplate: "_apis/{area}/InstalledExtensions/{publisherName}/{extensionName}/{resource}/Scopes/{scopeType}/{scopeValue}/Collections/{collectionName}/Documents/{documentId}",
            responseIsCollection: true,
            routeValues: {
                publisherName: publisherName,
                extensionName: extensionName,
                scopeType: scopeType,
                scopeValue: scopeValue,
                collectionName: collectionName
            },
            apiVersion: this.dataApiVersion
        });
    }

    /**
     * [Preview API]
     *
     * @param {string} publisherName
     * @param {string} extensionName
     * @param {string} scopeType
     * @param {string} scopeValue
     * @param {string} collectionName
     * @param {string} documentId
     * @return IPromise<any>
     */
    public getDocumentByName(
        publisherName: string,
        extensionName: string,
        scopeType: string,
        scopeValue: string,
        collectionName: string,
        documentId: string
        ): IPromise<any> {

        return this._beginRequest<any>({
            httpMethod: "GET",
            area: "ExtensionManagement",
            locationId: "bbe06c18-1c8b-4fcd-b9c6-1535aaab8749",
            resource: "Data",
            routeTemplate: "_apis/{area}/InstalledExtensions/{publisherName}/{extensionName}/{resource}/Scopes/{scopeType}/{scopeValue}/Collections/{collectionName}/Documents/{documentId}",
            routeValues: {
                publisherName: publisherName,
                extensionName: extensionName,
                scopeType: scopeType,
                scopeValue: scopeValue,
                collectionName: collectionName,
                documentId: documentId
            },
            apiVersion: this.dataApiVersion
        });
    }

    /**
     * [Preview API]
     *
     * @param {string} publisherName
     * @param {string} extensionName
     * @param {string} scopeType
     * @param {string} scopeValue
     * @param {string} collectionName
     * @param {string} documentId
     * @return IPromise<void>
     */
    public deleteDocumentByName(
        publisherName: string,
        extensionName: string,
        scopeType: string,
        scopeValue: string,
        collectionName: string,
        documentId: string
        ): IPromise<void> {

        return this._beginRequest<void>({
            httpMethod: "DELETE",
            httpResponseType: "html",
            area: "ExtensionManagement",
            locationId: "bbe06c18-1c8b-4fcd-b9c6-1535aaab8749",
            resource: "Data",
            routeTemplate: "_apis/{area}/InstalledExtensions/{publisherName}/{extensionName}/{resource}/Scopes/{scopeType}/{scopeValue}/Collections/{collectionName}/Documents/{documentId}",
            routeValues: {
                publisherName: publisherName,
                extensionName: extensionName,
                scopeType: scopeType,
                scopeValue: scopeValue,
                collectionName: collectionName,
                documentId: documentId
            },
            apiVersion: this.dataApiVersion
        });
    }

    /**
     * [Preview API]
     *
     * @param {any} doc
     * @param {string} publisherName
     * @param {string} extensionName
     * @param {string} scopeType
     * @param {string} scopeValue
     * @param {string} collectionName
     * @return IPromise<any>
     */
    public createDocumentByName(
        doc: any,
        publisherName: string,
        extensionName: string,
        scopeType: string,
        scopeValue: string,
        collectionName: string
        ): IPromise<any> {

        return this._beginRequest<any>({
            httpMethod: "POST",
            area: "ExtensionManagement",
            locationId: "bbe06c18-1c8b-4fcd-b9c6-1535aaab8749",
            resource: "Data",
            routeTemplate: "_apis/{area}/InstalledExtensions/{publisherName}/{extensionName}/{resource}/Scopes/{scopeType}/{scopeValue}/Collections/{collectionName}/Documents/{documentId}",
            routeValues: {
                publisherName: publisherName,
                extensionName: extensionName,
                scopeType: scopeType,
                scopeValue: scopeValue,
                collectionName: collectionName
            },
            apiVersion: this.dataApiVersion,
            data: doc
        });
    }
}

export class CommonMethods2_2To5 extends CommonMethods2_1To5 {
    protected extensionDataCollectionQueryApiVersion: string;
    protected policiesApiVersion: string;

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
    }

    /**
     * [Preview API]
     *
     * @param {string} userId
     * @return IPromise<VSS_Gallery_Contracts.UserExtensionPolicy>
     */
    public getPolicies(
        userId: string
        ): IPromise<VSS_Gallery_Contracts.UserExtensionPolicy> {

        return this._beginRequest<VSS_Gallery_Contracts.UserExtensionPolicy>({
            httpMethod: "GET",
            area: "ExtensionManagement",
            locationId: "e5cc8c09-407b-4867-8319-2ae3338cbf6f",
            resource: "Policies",
            routeTemplate: "_apis/{area}/{resource}/{userId}",
            responseType: VSS_Gallery_Contracts.TypeInfo.UserExtensionPolicy,
            routeValues: {
                userId: userId
            },
            apiVersion: this.policiesApiVersion
        });
    }

    /**
     * [Preview API] Query for one or more data collections for the specified extension.  Note: the token used for authorization must have been issued on behalf of the specified extension.
     *
     * @param {Contracts.ExtensionDataCollectionQuery} collectionQuery
     * @param {string} publisherName - Name of the publisher. Example: "fabrikam".
     * @param {string} extensionName - Name of the extension. Example: "ops-tools".
     * @return IPromise<Contracts.ExtensionDataCollection[]>
     */
    public queryCollectionsByName(
        collectionQuery: Contracts.ExtensionDataCollectionQuery,
        publisherName: string,
        extensionName: string
        ): IPromise<Contracts.ExtensionDataCollection[]> {

        return this._beginRequest<Contracts.ExtensionDataCollection[]>({
            httpMethod: "POST",
            area: "ExtensionManagement",
            locationId: "56c331f1-ce53-4318-adfd-4db5c52a7a2e",
            resource: "ExtensionDataCollectionQuery",
            routeTemplate: "_apis/{area}/InstalledExtensions/{publisherName}/{extensionName}/{resource}",
            responseIsCollection: true,
            routeValues: {
                publisherName: publisherName,
                extensionName: extensionName
            },
            apiVersion: this.extensionDataCollectionQueryApiVersion,
            data: collectionQuery
        });
    }
}

export class CommonMethods3To5 extends CommonMethods2_2To5 {
    protected acquisitionOptionsApiVersion: string;
    protected acquisitionRequestsApiVersion: string;
    protected authorizationsApiVersion: string;

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
    }

    /**
     * [Preview API]
     *
     * @param {string} publisherName
     * @param {string} extensionName
     * @param {string} registrationId
     * @return IPromise<Contracts.ExtensionAuthorization>
     */
    public registerAuthorization(
        publisherName: string,
        extensionName: string,
        registrationId: string
        ): IPromise<Contracts.ExtensionAuthorization> {

        return this._beginRequest<Contracts.ExtensionAuthorization>({
            httpMethod: "PUT",
            area: "ExtensionManagement",
            locationId: "f21cfc80-d2d2-4248-98bb-7820c74c4606",
            resource: "Authorizations",
            routeTemplate: "_apis/{area}/InstalledExtensions/{publisherName}/{extensionName}/{resource}/{registrationId}",
            routeValues: {
                publisherName: publisherName,
                extensionName: extensionName,
                registrationId: registrationId
            },
            apiVersion: this.authorizationsApiVersion
        });
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
            area: "ExtensionManagement",
            locationId: "da616457-eed3-4672-92d7-18d21f5c1658",
            resource: "AcquisitionRequests",
            routeTemplate: "_apis/{area}/{resource}",
            requestType: Contracts.TypeInfo.ExtensionAcquisitionRequest,
            responseType: Contracts.TypeInfo.ExtensionAcquisitionRequest,
            apiVersion: this.acquisitionRequestsApiVersion,
            data: acquisitionRequest
        });
    }

    /**
     * [Preview API]
     *
     * @param {string} itemId
     * @param {boolean} testCommerce
     * @param {boolean} isFreeOrTrialInstall
     * @param {boolean} isAccountOwner
     * @param {boolean} isLinked
     * @param {boolean} isConnectedServer
     * @param {boolean} isBuyOperationValid
     * @return IPromise<Contracts.AcquisitionOptions>
     */
    public getAcquisitionOptions(
        itemId: string,
        testCommerce?: boolean,
        isFreeOrTrialInstall?: boolean,
        isAccountOwner?: boolean,
        isLinked?: boolean,
        isConnectedServer?: boolean,
        isBuyOperationValid?: boolean
        ): IPromise<Contracts.AcquisitionOptions> {

        const queryValues: any = {
            itemId: itemId,
            testCommerce: testCommerce,
            isFreeOrTrialInstall: isFreeOrTrialInstall,
            isAccountOwner: isAccountOwner,
            isLinked: isLinked,
            isConnectedServer: isConnectedServer,
            isBuyOperationValid: isBuyOperationValid
        };

        return this._beginRequest<Contracts.AcquisitionOptions>({
            httpMethod: "GET",
            area: "ExtensionManagement",
            locationId: "288dff58-d13b-468e-9671-0fb754e9398c",
            resource: "AcquisitionOptions",
            routeTemplate: "_apis/{area}/{resource}",
            responseType: Contracts.TypeInfo.AcquisitionOptions,
            queryParams: queryValues,
            apiVersion: this.acquisitionOptionsApiVersion
        });
    }
}

/**
 * @exemptedapi
 */
export class ExtensionManagementHttpClient5 extends CommonMethods3To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.acquisitionOptionsApiVersion =
        this.acquisitionRequestsApiVersion =
        this.authorizationsApiVersion =
        this.dataApiVersion =
        this.extensionDataCollectionQueryApiVersion =
        this.extensionStatesApiVersion =
        this.installedExtensionQueryApiVersion =
        this.installedExtensionsApiVersion =
        this.installedExtensionsByNameApiVersion =
        this.policiesApiVersion =
        this.requestedExtensionsApiVersion =
        this.requestedExtensionsApiVersion_ba93e1f3 =
        this.requestedExtensionsApiVersion_216b978f =
        this.requestedExtensionsApiVersion_aa93e1f3 =
        this.tokenApiVersion = "5.0-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class ExtensionManagementHttpClient4_1 extends CommonMethods3To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.acquisitionOptionsApiVersion =
        this.acquisitionRequestsApiVersion =
        this.authorizationsApiVersion =
        this.dataApiVersion =
        this.extensionDataCollectionQueryApiVersion =
        this.extensionStatesApiVersion =
        this.installedExtensionQueryApiVersion =
        this.installedExtensionsApiVersion =
        this.installedExtensionsByNameApiVersion =
        this.policiesApiVersion =
        this.requestedExtensionsApiVersion =
        this.requestedExtensionsApiVersion_ba93e1f3 =
        this.requestedExtensionsApiVersion_216b978f =
        this.requestedExtensionsApiVersion_aa93e1f3 =
        this.tokenApiVersion = "4.1-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class ExtensionManagementHttpClient4 extends CommonMethods3To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.acquisitionOptionsApiVersion =
        this.acquisitionRequestsApiVersion =
        this.authorizationsApiVersion =
        this.dataApiVersion =
        this.extensionDataCollectionQueryApiVersion =
        this.extensionStatesApiVersion =
        this.installedExtensionQueryApiVersion =
        this.installedExtensionsApiVersion =
        this.installedExtensionsByNameApiVersion =
        this.policiesApiVersion =
        this.requestedExtensionsApiVersion =
        this.requestedExtensionsApiVersion_ba93e1f3 =
        this.requestedExtensionsApiVersion_216b978f =
        this.requestedExtensionsApiVersion_aa93e1f3 =
        this.tokenApiVersion = "4.0-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class ExtensionManagementHttpClient3_2 extends CommonMethods3To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.acquisitionOptionsApiVersion =
        this.acquisitionRequestsApiVersion =
        this.authorizationsApiVersion =
        this.dataApiVersion =
        this.extensionDataCollectionQueryApiVersion =
        this.extensionStatesApiVersion =
        this.installedExtensionQueryApiVersion =
        this.installedExtensionsApiVersion =
        this.installedExtensionsByNameApiVersion =
        this.policiesApiVersion =
        this.requestedExtensionsApiVersion =
        this.requestedExtensionsApiVersion_ba93e1f3 =
        this.requestedExtensionsApiVersion_216b978f =
        this.requestedExtensionsApiVersion_aa93e1f3 =
        this.tokenApiVersion = "3.2-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class ExtensionManagementHttpClient3_1 extends CommonMethods3To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.acquisitionOptionsApiVersion =
        this.acquisitionRequestsApiVersion =
        this.authorizationsApiVersion =
        this.dataApiVersion =
        this.extensionDataCollectionQueryApiVersion =
        this.extensionStatesApiVersion =
        this.installedExtensionQueryApiVersion =
        this.installedExtensionsApiVersion =
        this.installedExtensionsByNameApiVersion =
        this.policiesApiVersion =
        this.requestedExtensionsApiVersion =
        this.requestedExtensionsApiVersion_ba93e1f3 =
        this.requestedExtensionsApiVersion_216b978f =
        this.requestedExtensionsApiVersion_aa93e1f3 =
        this.tokenApiVersion = "3.1-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class ExtensionManagementHttpClient3 extends CommonMethods3To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.acquisitionOptionsApiVersion =
        this.acquisitionRequestsApiVersion =
        this.authorizationsApiVersion =
        this.dataApiVersion =
        this.extensionDataCollectionQueryApiVersion =
        this.extensionStatesApiVersion =
        this.installedExtensionQueryApiVersion =
        this.installedExtensionsApiVersion =
        this.installedExtensionsByNameApiVersion =
        this.policiesApiVersion =
        this.requestedExtensionsApiVersion =
        this.requestedExtensionsApiVersion_ba93e1f3 =
        this.requestedExtensionsApiVersion_216b978f =
        this.requestedExtensionsApiVersion_aa93e1f3 =
        this.tokenApiVersion = "3.0-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class ExtensionManagementHttpClient2_3 extends CommonMethods2_2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.dataApiVersion =
        this.extensionDataCollectionQueryApiVersion =
        this.extensionStatesApiVersion =
        this.installedExtensionQueryApiVersion =
        this.installedExtensionsApiVersion =
        this.installedExtensionsByNameApiVersion =
        this.policiesApiVersion =
        this.requestedExtensionsApiVersion =
        this.requestedExtensionsApiVersion_ba93e1f3 =
        this.requestedExtensionsApiVersion_216b978f =
        this.requestedExtensionsApiVersion_aa93e1f3 =
        this.tokenApiVersion = "2.3-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class ExtensionManagementHttpClient2_2 extends CommonMethods2_2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.dataApiVersion =
        this.extensionDataCollectionQueryApiVersion =
        this.extensionStatesApiVersion =
        this.installedExtensionQueryApiVersion =
        this.installedExtensionsApiVersion =
        this.installedExtensionsByNameApiVersion =
        this.policiesApiVersion =
        this.requestedExtensionsApiVersion =
        this.requestedExtensionsApiVersion_ba93e1f3 =
        this.requestedExtensionsApiVersion_216b978f =
        this.requestedExtensionsApiVersion_aa93e1f3 =
        this.tokenApiVersion = "2.2-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class ExtensionManagementHttpClient2_1 extends CommonMethods2_1To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.dataApiVersion =
        this.extensionStatesApiVersion =
        this.installedExtensionQueryApiVersion =
        this.installedExtensionsApiVersion =
        this.installedExtensionsByNameApiVersion =
        this.requestedExtensionsApiVersion =
        this.requestedExtensionsApiVersion_ba93e1f3 =
        this.requestedExtensionsApiVersion_216b978f =
        this.requestedExtensionsApiVersion_aa93e1f3 =
        this.tokenApiVersion = "2.1-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class ExtensionManagementHttpClient2 extends CommonMethods2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.installedExtensionsApiVersion =
        this.requestedExtensionsApiVersion =
        this.requestedExtensionsApiVersion_ba93e1f3 =
        this.requestedExtensionsApiVersion_216b978f =
        this.requestedExtensionsApiVersion_aa93e1f3 =
        this.tokenApiVersion = "2.0-preview.1";
    }
}

export class ExtensionManagementHttpClient extends ExtensionManagementHttpClient5 {
    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
    }
}

const clientMapping: { [id: string]: new (routeRequestPath: string) => VSS_WebApi.VssHttpClient; } = {
    "5.0": ExtensionManagementHttpClient5,
    "4.1": ExtensionManagementHttpClient4_1,
    "4.0": ExtensionManagementHttpClient4,
    "3.2": ExtensionManagementHttpClient3_2,
    "3.1": ExtensionManagementHttpClient3_1,
    "3.0": ExtensionManagementHttpClient3,
    "2.3": ExtensionManagementHttpClient2_3,
    "2.2": ExtensionManagementHttpClient2_2,
    "2.1": ExtensionManagementHttpClient2_1,
    "2.0": ExtensionManagementHttpClient2
}

/**
 * Gets an http client targeting the latest released version of the APIs.
 *
 * @return ExtensionManagementHttpClient5
 */
export function getClient(options?: VSS_WebApi.IVssHttpClientOptions): ExtensionManagementHttpClient5 {
    if ((<any>window).VSS && (<any>window).VSS.VssSDKRestVersion && clientMapping[(<any>window).VSS.VssSDKRestVersion]) {
        return VSS_Service.getClient<ExtensionManagementHttpClient5>(<any>(clientMapping[(<any>window).VSS.VssSDKRestVersion]), undefined, undefined, undefined, options);
    }
    else {
        return VSS_Service.getClient<ExtensionManagementHttpClient5>(ExtensionManagementHttpClient5, undefined, undefined, undefined, options);
    }
}
