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

import Contracts = require("VSS/Licensing/Contracts");
import VSS_Service = require("VSS/Service");
import VSS_WebApi = require("VSS/WebApi/RestClient");

export class CommonMethods2To5 extends VSS_WebApi.VssHttpClient {
    protected certificateApiVersion: string;
    protected clientRightsApiVersion: string;
    protected entitlementsApiVersion: string;
    protected entitlementsApiVersion_c01e9fd5: string;
    protected entitlementsApiVersion_ea37be6f: string;
    protected entitlementsBatchApiVersion: string;
    protected extensionEntitlementsBatchApiVersion: string;
    protected extensionRegistrationApiVersion: string;
    protected extensionRightsApiVersion: string;
    protected msdnApiVersion: string;
    protected msdnApiVersion_69522c3f: string;
    protected usageApiVersion: string;

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
    }

    /**
     * [Preview API]
     *
     * @return IPromise<Contracts.AccountLicenseUsage[]>
     */
    public getAccountLicensesUsage(): IPromise<Contracts.AccountLicenseUsage[]> {

        return this._beginRequest<Contracts.AccountLicenseUsage[]>({
            httpMethod: "GET",
            area: "licensing",
            locationId: "d3266b87-d395-4e91-97a5-0215b81a0b7d",
            resource: "Usage",
            routeTemplate: "_apis/{area}/{resource}",
            responseType: Contracts.TypeInfo.AccountLicenseUsage,
            responseIsCollection: true,
            apiVersion: this.usageApiVersion
        });
    }

    /**
     * [Preview API]
     *
     * @return IPromise<Contracts.MsdnEntitlement[]>
     */
    public getEntitlements(): IPromise<Contracts.MsdnEntitlement[]> {

        return this._beginRequest<Contracts.MsdnEntitlement[]>({
            httpMethod: "GET",
            area: "licensing",
            locationId: "1cc6137e-12d5-4d44-a4f2-765006c9e85d",
            resource: "Msdn",
            routeTemplate: "_apis/{area}/{resource}/entitlements/me",
            responseType: Contracts.TypeInfo.MsdnEntitlement,
            responseIsCollection: true,
            apiVersion: this.msdnApiVersion
        });
    }

    /**
     * [Preview API]
     *
     * @return IPromise<void>
     */
    public getMsdnPresence(): IPromise<void> {

        return this._beginRequest<void>({
            httpMethod: "GET",
            httpResponseType: "html",
            area: "licensing",
            locationId: "69522c3f-eecc-48d0-b333-f69ffb8fa6cc",
            resource: "Msdn",
            routeTemplate: "_apis/{area}/{resource}/me",
            apiVersion: this.msdnApiVersion_69522c3f
        });
    }

    /**
     * [Preview API]
     *
     * @return IPromise<Contracts.ExtensionRightsResult>
     */
    public getExtensionRights(): IPromise<Contracts.ExtensionRightsResult> {

        return this._beginRequest<Contracts.ExtensionRightsResult>({
            httpMethod: "GET",
            area: "licensing",
            locationId: "5f1dbe21-f748-47c7-b5fd-3770c8bc2c08",
            resource: "ExtensionRights",
            routeTemplate: "_apis/{area}/{resource}",
            responseType: Contracts.TypeInfo.ExtensionRightsResult,
            apiVersion: this.extensionRightsApiVersion
        });
    }

    /**
     * [Preview API]
     *
     * @param {string[]} ids
     * @return IPromise<{ [key: string] : boolean; }>
     */
    public computeExtensionRights(
        ids: string[]
        ): IPromise<{ [key: string] : boolean; }> {

        return this._beginRequest<{ [key: string] : boolean; }>({
            httpMethod: "POST",
            area: "licensing",
            locationId: "5f1dbe21-f748-47c7-b5fd-3770c8bc2c08",
            resource: "ExtensionRights",
            routeTemplate: "_apis/{area}/{resource}",
            responseIsCollection: true,
            apiVersion: this.extensionRightsApiVersion,
            data: ids
        });
    }

    /**
     * [Preview API]
     *
     * @param {Contracts.ExtensionLicenseData} extensionLicenseData
     * @return IPromise<boolean>
     */
    public registerExtensionLicense(
        extensionLicenseData: Contracts.ExtensionLicenseData
        ): IPromise<boolean> {

        return this._beginRequest<boolean>({
            httpMethod: "POST",
            area: "Licensing",
            locationId: "004a420a-7bef-4b7f-8a50-22975d2067cc",
            resource: "ExtensionRegistration",
            routeTemplate: "_apis/{area}/{resource}/{extensionId}",
            requestType: Contracts.TypeInfo.ExtensionLicenseData,
            apiVersion: this.extensionRegistrationApiVersion,
            data: extensionLicenseData
        });
    }

    /**
     * [Preview API]
     *
     * @param {string} extensionId
     * @return IPromise<Contracts.ExtensionLicenseData>
     */
    public getExtensionLicenseData(
        extensionId: string
        ): IPromise<Contracts.ExtensionLicenseData> {

        return this._beginRequest<Contracts.ExtensionLicenseData>({
            httpMethod: "GET",
            area: "Licensing",
            locationId: "004a420a-7bef-4b7f-8a50-22975d2067cc",
            resource: "ExtensionRegistration",
            routeTemplate: "_apis/{area}/{resource}/{extensionId}",
            responseType: Contracts.TypeInfo.ExtensionLicenseData,
            routeValues: {
                extensionId: extensionId
            },
            apiVersion: this.extensionRegistrationApiVersion
        });
    }

    /**
     * [Preview API] Returns extensions that are currrently assigned to the users that are in the account
     *
     * @param {string[]} userIds
     * @return IPromise<{ [key: string] : Contracts.ExtensionSource[]; }>
     */
    public bulkGetExtensionsAssignedToUsers(
        userIds: string[]
        ): IPromise<{ [key: string] : Contracts.ExtensionSource[]; }> {

        return this._beginRequest<{ [key: string] : Contracts.ExtensionSource[]; }>({
            httpMethod: "PUT",
            area: "Licensing",
            locationId: "1d42ddc2-3e7d-4daa-a0eb-e12c1dbd7c72",
            resource: "ExtensionEntitlementsBatch",
            routeTemplate: "_apis/{area}/{resource}",
            responseType: Contracts.TypeInfo.ExtensionSource,
            responseIsCollection: true,
            apiVersion: this.extensionEntitlementsBatchApiVersion,
            data: userIds
        });
    }

    /**
     * [Preview API] Returns AccountEntitlements that are currently assigned to the given list of users in the account
     *
     * @param {string[]} userIds - List of user Ids.
     * @return IPromise<Contracts.AccountEntitlement[]>
     */
    public obtainAvailableAccountEntitlements(
        userIds: string[]
        ): IPromise<Contracts.AccountEntitlement[]> {

        return this._beginRequest<Contracts.AccountEntitlement[]>({
            httpMethod: "POST",
            area: "Licensing",
            locationId: "cc3a0130-78ad-4a00-b1ca-49bef42f4656",
            resource: "EntitlementsBatch",
            routeTemplate: "_apis/{area}/{resource}/{action}",
            responseType: Contracts.TypeInfo.AccountEntitlement,
            responseIsCollection: true,
            routeValues: {
                action: "GetAvailableUsersEntitlements"
            },
            apiVersion: this.entitlementsBatchApiVersion,
            data: userIds
        });
    }

    /**
     * [Preview API] Returns AccountEntitlements that are currently assigned to the given list of users in the account
     *
     * @param {string[]} userIds - List of user Ids.
     * @return IPromise<Contracts.AccountEntitlement[]>
     */
    public getAccountEntitlementsBatch(
        userIds: string[]
        ): IPromise<Contracts.AccountEntitlement[]> {

        return this._beginRequest<Contracts.AccountEntitlement[]>({
            httpMethod: "POST",
            area: "Licensing",
            locationId: "cc3a0130-78ad-4a00-b1ca-49bef42f4656",
            resource: "EntitlementsBatch",
            routeTemplate: "_apis/{area}/{resource}/{action}",
            responseType: Contracts.TypeInfo.AccountEntitlement,
            responseIsCollection: true,
            routeValues: {
                action: "GetUsersEntitlements"
            },
            apiVersion: this.entitlementsBatchApiVersion,
            data: userIds
        });
    }

    /**
     * [Preview API] Get the entitlements for a user
     *
     * @param {string} userId - The id of the user
     * @param {boolean} determineRights
     * @param {boolean} createIfNotExists
     * @return IPromise<Contracts.AccountEntitlement>
     */
    public getAccountEntitlementForUser(
        userId: string,
        determineRights?: boolean,
        createIfNotExists?: boolean
        ): IPromise<Contracts.AccountEntitlement> {

        const queryValues: any = {
            determineRights: determineRights,
            createIfNotExists: createIfNotExists
        };

        return this._beginRequest<Contracts.AccountEntitlement>({
            httpMethod: "GET",
            area: "licensing",
            locationId: "6490e566-b299-49a7-a4e4-28749752581f",
            resource: "Entitlements",
            routeTemplate: "_apis/{area}/{resource}/{userId}",
            responseType: Contracts.TypeInfo.AccountEntitlement,
            routeValues: {
                userId: userId
            },
            queryParams: queryValues,
            apiVersion: this.entitlementsApiVersion
        });
    }

    /**
     * [Preview API]
     *
     * @param {string} userId
     * @return IPromise<void>
     */
    public deleteUserEntitlements(
        userId: string
        ): IPromise<void> {

        return this._beginRequest<void>({
            httpMethod: "DELETE",
            httpResponseType: "html",
            area: "licensing",
            locationId: "6490e566-b299-49a7-a4e4-28749752581f",
            resource: "Entitlements",
            routeTemplate: "_apis/{area}/{resource}/{userId}",
            routeValues: {
                userId: userId
            },
            apiVersion: this.entitlementsApiVersion
        });
    }

    /**
     * [Preview API] Assign an explicit account entitlement
     *
     * @param {Contracts.AccountEntitlementUpdateModel} body - The update model for the entitlement
     * @param {string} userId - The id of the user
     * @param {boolean} dontNotifyUser
     * @param {Contracts.LicensingOrigin} origin
     * @return IPromise<Contracts.AccountEntitlement>
     */
    public assignAccountEntitlementForUser(
        body: Contracts.AccountEntitlementUpdateModel,
        userId: string,
        dontNotifyUser?: boolean,
        origin?: Contracts.LicensingOrigin
        ): IPromise<Contracts.AccountEntitlement> {

        const queryValues: any = {
            dontNotifyUser: dontNotifyUser,
            origin: origin
        };

        return this._beginRequest<Contracts.AccountEntitlement>({
            httpMethod: "PUT",
            area: "licensing",
            locationId: "6490e566-b299-49a7-a4e4-28749752581f",
            resource: "Entitlements",
            routeTemplate: "_apis/{area}/{resource}/{userId}",
            requestType: Contracts.TypeInfo.AccountEntitlementUpdateModel,
            responseType: Contracts.TypeInfo.AccountEntitlement,
            routeValues: {
                userId: userId
            },
            queryParams: queryValues,
            apiVersion: this.entitlementsApiVersion,
            data: body
        });
    }

    /**
     * [Preview API] Gets top (top) entitlements for users in the account from offset (skip) order by DateCreated ASC
     *
     * @param {number} top - number of accounts to return
     * @param {number} skip - records to skip, null is interpreted as 0
     * @return IPromise<Contracts.AccountEntitlement[]>
     */
    public getAccountEntitlements(
        top?: number,
        skip?: number
        ): IPromise<Contracts.AccountEntitlement[]> {

        const queryValues: any = {
            top: top,
            skip: skip
        };

        return this._beginRequest<Contracts.AccountEntitlement[]>({
            httpMethod: "GET",
            area: "licensing",
            locationId: "ea37be6f-8cd7-48dd-983d-2b72d6e3da0f",
            resource: "Entitlements",
            routeTemplate: "_apis/{area}/{resource}",
            responseType: Contracts.TypeInfo.AccountEntitlement,
            responseIsCollection: true,
            queryParams: queryValues,
            apiVersion: this.entitlementsApiVersion_ea37be6f
        });
    }

    /**
     * [Preview API] Gets the account entitlement of the current user it is mapped to _apis/licensing/entitlements/me so specifically is looking for the user of the request
     *
     * @return IPromise<Contracts.AccountEntitlement>
     */
    public getAccountEntitlement(): IPromise<Contracts.AccountEntitlement> {

        return this._beginRequest<Contracts.AccountEntitlement>({
            httpMethod: "GET",
            area: "licensing",
            locationId: "c01e9fd5-0d8c-4d5e-9a68-734bd8da6a38",
            resource: "Entitlements",
            routeTemplate: "_apis/{area}/{resource}/me",
            responseType: Contracts.TypeInfo.AccountEntitlement,
            apiVersion: this.entitlementsApiVersion_c01e9fd5
        });
    }

    /**
     * [Preview API] Assign an available entitilement to a user
     *
     * @param {string} userId - The user to which to assign the entitilement
     * @param {boolean} dontNotifyUser
     * @param {Contracts.LicensingOrigin} origin
     * @return IPromise<Contracts.AccountEntitlement>
     */
    public assignAvailableAccountEntitlement(
        userId: string,
        dontNotifyUser?: boolean,
        origin?: Contracts.LicensingOrigin
        ): IPromise<Contracts.AccountEntitlement> {

        const queryValues: any = {
            userId: userId,
            dontNotifyUser: dontNotifyUser,
            origin: origin
        };

        return this._beginRequest<Contracts.AccountEntitlement>({
            httpMethod: "POST",
            area: "licensing",
            locationId: "c01e9fd5-0d8c-4d5e-9a68-734bd8da6a38",
            resource: "Entitlements",
            routeTemplate: "_apis/{area}/{resource}/me",
            responseType: Contracts.TypeInfo.AccountEntitlement,
            queryParams: queryValues,
            apiVersion: this.entitlementsApiVersion_c01e9fd5
        });
    }

    /**
     * [Preview API]
     *
     * @param {string} rightName
     * @param {string} productVersion
     * @param {string} edition
     * @param {string} relType
     * @param {boolean} includeCertificate
     * @param {string} canary
     * @param {string} machineId
     * @return IPromise<Contracts.ClientRightsContainer>
     */
    public getClientRights(
        rightName?: string,
        productVersion?: string,
        edition?: string,
        relType?: string,
        includeCertificate?: boolean,
        canary?: string,
        machineId?: string
        ): IPromise<Contracts.ClientRightsContainer> {

        const queryValues: any = {
            productVersion: productVersion,
            edition: edition,
            relType: relType,
            includeCertificate: includeCertificate,
            canary: canary,
            machineId: machineId
        };

        return this._beginRequest<Contracts.ClientRightsContainer>({
            httpMethod: "GET",
            area: "licensing",
            locationId: "643c72da-eaee-4163-9f07-d748ef5c2a0c",
            resource: "ClientRights",
            routeTemplate: "_apis/{area}/{resource}/{rightName}",
            routeValues: {
                rightName: rightName
            },
            queryParams: queryValues,
            apiVersion: this.clientRightsApiVersion
        });
    }

    /**
     * [Preview API]
     *
     * @return IPromise<ArrayBuffer>
     */
    public getCertificate(): IPromise<ArrayBuffer> {

        return this._beginRequest<ArrayBuffer>({
            httpMethod: "GET",
            httpResponseType: "application/octet-stream",
            area: "licensing",
            locationId: "2e0dbce7-a327-4bc0-a291-056139393f6d",
            resource: "Certificate",
            routeTemplate: "_apis/{area}/{resource}",
            apiVersion: this.certificateApiVersion
        });
    }
}

export class CommonMethods3To5 extends CommonMethods2To5 {
    protected extensionEntitlementsApiVersion: string;
    protected extensionEntitlementsApiVersion_5434f182: string;

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
    }

    /**
     * [Preview API] Returns extensions that are currently assigned to the user in the account
     *
     * @param {string} userId - The user's identity id.
     * @return IPromise<{ [key: string] : Contracts.LicensingSource; }>
     */
    public getExtensionsAssignedToUser(
        userId: string
        ): IPromise<{ [key: string] : Contracts.LicensingSource; }> {

        return this._beginRequest<{ [key: string] : Contracts.LicensingSource; }>({
            httpMethod: "GET",
            area: "licensing",
            locationId: "8cec75ea-044f-4245-ab0d-a82dafcc85ea",
            resource: "ExtensionEntitlements",
            routeTemplate: "_apis/{area}/{resource}/{userId}",
            responseType: Contracts.TypeInfo.LicensingSource,
            responseIsCollection: true,
            routeValues: {
                userId: userId
            },
            apiVersion: this.extensionEntitlementsApiVersion
        });
    }

    /**
     * [Preview API] Assigns the access to the given extension for a given list of users
     *
     * @param {Contracts.ExtensionAssignment} body - The extension assignment details.
     * @return IPromise<Contracts.ExtensionOperationResult[]>
     */
    public assignExtensionToUsers(
        body: Contracts.ExtensionAssignment
        ): IPromise<Contracts.ExtensionOperationResult[]> {

        return this._beginRequest<Contracts.ExtensionOperationResult[]>({
            httpMethod: "PUT",
            area: "licensing",
            locationId: "8cec75ea-044f-4245-ab0d-a82dafcc85ea",
            resource: "ExtensionEntitlements",
            routeTemplate: "_apis/{area}/{resource}/{userId}",
            requestType: Contracts.TypeInfo.ExtensionAssignment,
            responseType: Contracts.TypeInfo.ExtensionOperationResult,
            responseIsCollection: true,
            apiVersion: this.extensionEntitlementsApiVersion,
            data: body
        });
    }

    /**
     * [Preview API] Returns extension assignment status of all account users for the given extension
     *
     * @param {string} extensionId - The extension to check the status of the users for.
     * @return IPromise<{ [key: string] : Contracts.ExtensionAssignmentDetails; }>
     */
    public getExtensionStatusForUsers(
        extensionId: string
        ): IPromise<{ [key: string] : Contracts.ExtensionAssignmentDetails; }> {

        return this._beginRequest<{ [key: string] : Contracts.ExtensionAssignmentDetails; }>({
            httpMethod: "GET",
            area: "licensing",
            locationId: "5434f182-7f32-4135-8326-9340d887c08a",
            resource: "ExtensionEntitlements",
            routeTemplate: "_apis/{area}/{resource}/all/{extensionId}",
            responseType: Contracts.TypeInfo.ExtensionAssignmentDetails,
            responseIsCollection: true,
            routeValues: {
                extensionId: extensionId
            },
            apiVersion: this.extensionEntitlementsApiVersion_5434f182
        });
    }

    /**
     * [Preview API] Returns users that are currently eligible to assign the extension to. the list is filtered based on the value of ExtensionFilterOptions
     *
     * @param {string} extensionId - The extension to check the eligibility of the users for.
     * @param {Contracts.ExtensionFilterOptions} options - The options to filter the list.
     * @return IPromise<string[]>
     */
    public getEligibleUsersForExtension(
        extensionId: string,
        options: Contracts.ExtensionFilterOptions
        ): IPromise<string[]> {

        const queryValues: any = {
            options: options
        };

        return this._beginRequest<string[]>({
            httpMethod: "GET",
            area: "licensing",
            locationId: "5434f182-7f32-4135-8326-9340d887c08a",
            resource: "ExtensionEntitlements",
            routeTemplate: "_apis/{area}/{resource}/all/{extensionId}",
            responseIsCollection: true,
            routeValues: {
                extensionId: extensionId
            },
            queryParams: queryValues,
            apiVersion: this.extensionEntitlementsApiVersion_5434f182
        });
    }

    /**
     * [Preview API] Assigns the access to the given extension for all eligible users in the account that do not already have access to the extension though bundle or account assignment
     *
     * @param {string} extensionId - The extension id to assign the access to.
     * @return IPromise<Contracts.ExtensionOperationResult[]>
     */
    public assignExtensionToAllEligibleUsers(
        extensionId: string
        ): IPromise<Contracts.ExtensionOperationResult[]> {

        return this._beginRequest<Contracts.ExtensionOperationResult[]>({
            httpMethod: "PUT",
            area: "licensing",
            locationId: "5434f182-7f32-4135-8326-9340d887c08a",
            resource: "ExtensionEntitlements",
            routeTemplate: "_apis/{area}/{resource}/all/{extensionId}",
            responseType: Contracts.TypeInfo.ExtensionOperationResult,
            responseIsCollection: true,
            routeValues: {
                extensionId: extensionId
            },
            apiVersion: this.extensionEntitlementsApiVersion_5434f182
        });
    }
}

export class CommonMethods3_1To5 extends CommonMethods3To5 {
    protected accountAssignedExtensionsApiVersion: string;

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
    }

    /**
     * [Preview API] Returns Licensing info about paid extensions assigned to user passed into GetExtensionsAssignedToAccount
     *
     * @return IPromise<Contracts.AccountLicenseExtensionUsage[]>
     */
    public getExtensionLicenseUsage(): IPromise<Contracts.AccountLicenseExtensionUsage[]> {

        return this._beginRequest<Contracts.AccountLicenseExtensionUsage[]>({
            httpMethod: "GET",
            area: "Licensing",
            locationId: "01bce8d3-c130-480f-a332-474ae3f6662e",
            resource: "AccountAssignedExtensions",
            routeTemplate: "_apis/{area}/{resource}",
            responseType: Contracts.TypeInfo.AccountLicenseExtensionUsage,
            responseIsCollection: true,
            apiVersion: this.accountAssignedExtensionsApiVersion
        });
    }
}

/**
 * @exemptedapi
 */
export class LicensingHttpClient5 extends CommonMethods3_1To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.accountAssignedExtensionsApiVersion =
        this.certificateApiVersion =
        this.clientRightsApiVersion =
        this.entitlementsApiVersion =
        this.entitlementsApiVersion_ea37be6f =
        this.entitlementsApiVersion_c01e9fd5 =
        this.entitlementsBatchApiVersion =
        this.extensionEntitlementsApiVersion =
        this.extensionEntitlementsApiVersion_5434f182 =
        this.extensionRegistrationApiVersion =
        this.extensionRightsApiVersion =
        this.msdnApiVersion =
        this.msdnApiVersion_69522c3f =
        this.usageApiVersion = "5.0-preview.1";
        this.extensionEntitlementsBatchApiVersion = "5.0-preview.2";
    }
}

/**
 * @exemptedapi
 */
export class LicensingHttpClient4_1 extends CommonMethods3_1To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.accountAssignedExtensionsApiVersion =
        this.certificateApiVersion =
        this.clientRightsApiVersion =
        this.entitlementsApiVersion =
        this.entitlementsApiVersion_ea37be6f =
        this.entitlementsApiVersion_c01e9fd5 =
        this.entitlementsBatchApiVersion =
        this.extensionEntitlementsApiVersion =
        this.extensionEntitlementsApiVersion_5434f182 =
        this.extensionRegistrationApiVersion =
        this.extensionRightsApiVersion =
        this.msdnApiVersion =
        this.msdnApiVersion_69522c3f =
        this.usageApiVersion = "4.1-preview.1";
        this.extensionEntitlementsBatchApiVersion = "4.1-preview.2";
    }
}

/**
 * @exemptedapi
 */
export class LicensingHttpClient4 extends CommonMethods3_1To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.accountAssignedExtensionsApiVersion =
        this.certificateApiVersion =
        this.clientRightsApiVersion =
        this.entitlementsApiVersion =
        this.entitlementsApiVersion_ea37be6f =
        this.entitlementsApiVersion_c01e9fd5 =
        this.entitlementsBatchApiVersion =
        this.extensionEntitlementsApiVersion =
        this.extensionEntitlementsApiVersion_5434f182 =
        this.extensionRegistrationApiVersion =
        this.extensionRightsApiVersion =
        this.msdnApiVersion =
        this.msdnApiVersion_69522c3f =
        this.usageApiVersion = "4.0-preview.1";
        this.extensionEntitlementsBatchApiVersion = "4.0-preview.2";
    }
}

/**
 * @exemptedapi
 */
export class LicensingHttpClient3_2 extends CommonMethods3_1To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.accountAssignedExtensionsApiVersion =
        this.certificateApiVersion =
        this.clientRightsApiVersion =
        this.entitlementsApiVersion =
        this.entitlementsApiVersion_ea37be6f =
        this.entitlementsApiVersion_c01e9fd5 =
        this.entitlementsBatchApiVersion =
        this.extensionEntitlementsApiVersion =
        this.extensionEntitlementsApiVersion_5434f182 =
        this.extensionRegistrationApiVersion =
        this.extensionRightsApiVersion =
        this.msdnApiVersion =
        this.msdnApiVersion_69522c3f =
        this.usageApiVersion = "3.2-preview.1";
        this.extensionEntitlementsBatchApiVersion = "3.2-preview.2";
    }
}

/**
 * @exemptedapi
 */
export class LicensingHttpClient3_1 extends CommonMethods3_1To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.accountAssignedExtensionsApiVersion =
        this.certificateApiVersion =
        this.clientRightsApiVersion =
        this.entitlementsApiVersion =
        this.entitlementsApiVersion_ea37be6f =
        this.entitlementsApiVersion_c01e9fd5 =
        this.entitlementsBatchApiVersion =
        this.extensionEntitlementsApiVersion =
        this.extensionEntitlementsApiVersion_5434f182 =
        this.extensionRegistrationApiVersion =
        this.extensionRightsApiVersion =
        this.msdnApiVersion =
        this.msdnApiVersion_69522c3f =
        this.usageApiVersion = "3.1-preview.1";
        this.extensionEntitlementsBatchApiVersion = "3.1-preview.2";
    }
}

/**
 * @exemptedapi
 */
export class LicensingHttpClient3 extends CommonMethods3To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.certificateApiVersion =
        this.clientRightsApiVersion =
        this.entitlementsApiVersion =
        this.entitlementsApiVersion_ea37be6f =
        this.entitlementsApiVersion_c01e9fd5 =
        this.entitlementsBatchApiVersion =
        this.extensionEntitlementsApiVersion =
        this.extensionEntitlementsApiVersion_5434f182 =
        this.extensionRegistrationApiVersion =
        this.extensionRightsApiVersion =
        this.msdnApiVersion =
        this.msdnApiVersion_69522c3f =
        this.usageApiVersion = "3.0-preview.1";
        this.extensionEntitlementsBatchApiVersion = "3.0-preview.2";
    }
}

/**
 * @exemptedapi
 */
export class LicensingHttpClient2_3 extends CommonMethods2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.certificateApiVersion =
        this.clientRightsApiVersion =
        this.entitlementsApiVersion =
        this.entitlementsApiVersion_ea37be6f =
        this.entitlementsApiVersion_c01e9fd5 =
        this.entitlementsBatchApiVersion =
        this.extensionRegistrationApiVersion =
        this.extensionRightsApiVersion =
        this.msdnApiVersion =
        this.msdnApiVersion_69522c3f =
        this.usageApiVersion = "2.3-preview.1";
        this.extensionEntitlementsBatchApiVersion = "2.3-preview.2";
    }
}

/**
 * @exemptedapi
 */
export class LicensingHttpClient2_2 extends CommonMethods2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.certificateApiVersion =
        this.clientRightsApiVersion =
        this.entitlementsApiVersion =
        this.entitlementsApiVersion_ea37be6f =
        this.entitlementsApiVersion_c01e9fd5 =
        this.entitlementsBatchApiVersion =
        this.extensionRegistrationApiVersion =
        this.extensionRightsApiVersion =
        this.msdnApiVersion =
        this.msdnApiVersion_69522c3f =
        this.usageApiVersion = "2.2-preview.1";
        this.extensionEntitlementsBatchApiVersion = "2.2-preview.2";
    }
}

/**
 * @exemptedapi
 */
export class LicensingHttpClient2_1 extends CommonMethods2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.certificateApiVersion =
        this.clientRightsApiVersion =
        this.entitlementsApiVersion =
        this.entitlementsApiVersion_ea37be6f =
        this.entitlementsApiVersion_c01e9fd5 =
        this.entitlementsBatchApiVersion =
        this.extensionRegistrationApiVersion =
        this.extensionRightsApiVersion =
        this.msdnApiVersion =
        this.msdnApiVersion_69522c3f =
        this.usageApiVersion = "2.1-preview.1";
        this.extensionEntitlementsBatchApiVersion = "2.1-preview.2";
    }
}

/**
 * @exemptedapi
 */
export class LicensingHttpClient2 extends CommonMethods2To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.certificateApiVersion =
        this.clientRightsApiVersion =
        this.entitlementsApiVersion =
        this.entitlementsApiVersion_ea37be6f =
        this.entitlementsApiVersion_c01e9fd5 =
        this.entitlementsBatchApiVersion =
        this.extensionRegistrationApiVersion =
        this.extensionRightsApiVersion =
        this.msdnApiVersion =
        this.msdnApiVersion_69522c3f =
        this.usageApiVersion = "2.0-preview.1";
        this.extensionEntitlementsBatchApiVersion = "2.0-preview.2";
    }
}

export class LicensingHttpClient extends LicensingHttpClient5 {
    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
    }
}

const clientMapping: { [id: string]: new (routeRequestPath: string) => VSS_WebApi.VssHttpClient; } = {
    "5.0": LicensingHttpClient5,
    "4.1": LicensingHttpClient4_1,
    "4.0": LicensingHttpClient4,
    "3.2": LicensingHttpClient3_2,
    "3.1": LicensingHttpClient3_1,
    "3.0": LicensingHttpClient3,
    "2.3": LicensingHttpClient2_3,
    "2.2": LicensingHttpClient2_2,
    "2.1": LicensingHttpClient2_1,
    "2.0": LicensingHttpClient2
}

/**
 * Gets an http client targeting the latest released version of the APIs.
 *
 * @return LicensingHttpClient5
 */
export function getClient(options?: VSS_WebApi.IVssHttpClientOptions): LicensingHttpClient5 {
    if ((<any>window).VSS && (<any>window).VSS.VssSDKRestVersion && clientMapping[(<any>window).VSS.VssSDKRestVersion]) {
        return VSS_Service.getClient<LicensingHttpClient5>(<any>(clientMapping[(<any>window).VSS.VssSDKRestVersion]), undefined, undefined, undefined, options);
    }
    else {
        return VSS_Service.getClient<LicensingHttpClient5>(LicensingHttpClient5, undefined, undefined, undefined, options);
    }
}
