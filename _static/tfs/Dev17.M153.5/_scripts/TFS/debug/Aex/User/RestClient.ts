/**
 * ---------------------------------------------------------
 * Generated file, DO NOT EDIT
 * ---------------------------------------------------------
 *
 * See following wiki page for instructions on how to regenerate:
 *   https://aka.ms/azure-devops-client-generation
 *
 * Configuration file:
 *   aex\service\user\server\clientgeneratorconfigs\genclient.json
 */

"use strict";

import VSS_Service = require("VSS/Service");
import VSS_User_Contracts = require("VSS/User/Contracts");
import VSS_WebApi = require("VSS/WebApi/RestClient");

export class CommonMethods4_1To5 extends VSS_WebApi.VssHttpClient {

    public static serviceInstanceId = "00000041-0000-8888-8000-000000000000";
    protected attributesApiVersion: string;
    protected avatarApiVersion: string;
    protected avatarPreviewApiVersion: string;
    protected contactWithOffersApiVersion: string;
    protected userApiVersion: string;
    protected userDefaultsApiVersion: string;

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
    }

    /**
     * [Preview API]
     *
     * @return IPromise<VSS_User_Contracts.User>
     */
    public getUserDefaults(): IPromise<VSS_User_Contracts.User> {

        return this._beginRequest<VSS_User_Contracts.User>({
            httpMethod: "GET",
            area: "User",
            locationId: "cd427e38-f8e9-45a2-a893-8212e69eca6b",
            resource: "UserDefaults",
            routeTemplate: "_apis/{area}/{resource}",
            responseType: VSS_User_Contracts.TypeInfo.User,
            apiVersion: this.userDefaultsApiVersion
        });
    }

    /**
     * [Preview API]
     *
     * @param {VSS_User_Contracts.UpdateUserParameters} updateParameters
     * @return IPromise<VSS_User_Contracts.User>
     */
    public updateUser(
        updateParameters: VSS_User_Contracts.UpdateUserParameters
        ): IPromise<VSS_User_Contracts.User> {

        return this._beginRequest<VSS_User_Contracts.User>({
            httpMethod: "PATCH",
            area: "User",
            locationId: "757874d4-9797-46da-b06f-bcc636ea2d77",
            resource: "User",
            routeTemplate: "_apis/{area}/{resource}",
            responseType: VSS_User_Contracts.TypeInfo.User,
            apiVersion: this.userApiVersion,
            data: updateParameters
        });
    }

    /**
     * [Preview API]
     *
     * @return IPromise<VSS_User_Contracts.User>
     */
    public getUser(): IPromise<VSS_User_Contracts.User> {

        return this._beginRequest<VSS_User_Contracts.User>({
            httpMethod: "GET",
            area: "User",
            locationId: "757874d4-9797-46da-b06f-bcc636ea2d77",
            resource: "User",
            routeTemplate: "_apis/{area}/{resource}",
            responseType: VSS_User_Contracts.TypeInfo.User,
            apiVersion: this.userApiVersion
        });
    }

    /**
     * [Preview API]
     *
     * @param {VSS_User_Contracts.CreateUserParameters} userParameters
     * @return IPromise<VSS_User_Contracts.User>
     */
    public createUser(
        userParameters: VSS_User_Contracts.CreateUserParameters
        ): IPromise<VSS_User_Contracts.User> {

        return this._beginRequest<VSS_User_Contracts.User>({
            httpMethod: "POST",
            area: "User",
            locationId: "757874d4-9797-46da-b06f-bcc636ea2d77",
            resource: "User",
            routeTemplate: "_apis/{area}/{resource}",
            responseType: VSS_User_Contracts.TypeInfo.User,
            apiVersion: this.userApiVersion,
            data: userParameters
        });
    }

    /**
     * [Preview API]
     *
     * @param {boolean} value
     * @return IPromise<void>
     */
    public setContactWithOffers(
        value: boolean
        ): IPromise<void> {

        const queryValues: any = {
            value: value
        };

        return this._beginRequest<void>({
            httpMethod: "PUT",
            httpResponseType: "html",
            area: "User",
            locationId: "2796a17e-7787-40de-b4ac-954823914717",
            resource: "ContactWithOffers",
            routeTemplate: "_apis/{area}/{resource}",
            queryParams: queryValues,
            apiVersion: this.contactWithOffersApiVersion
        });
    }

    /**
     * [Preview API] Gets if the user is contactable.
     *
     * @return IPromise<boolean>
     */
    public getContactWithOffers(): IPromise<boolean> {

        return this._beginRequest<boolean>({
            httpMethod: "GET",
            area: "User",
            locationId: "2796a17e-7787-40de-b4ac-954823914717",
            resource: "ContactWithOffers",
            routeTemplate: "_apis/{area}/{resource}",
            apiVersion: this.contactWithOffersApiVersion
        });
    }

    /**
     * [Preview API]
     *
     * @param {VSS_User_Contracts.Avatar} avatar
     * @param {VSS_User_Contracts.AvatarSize} size
     * @param {string} displayName
     * @return IPromise<VSS_User_Contracts.Avatar>
     */
    public createAvatarPreview(
        avatar: VSS_User_Contracts.Avatar,
        size?: VSS_User_Contracts.AvatarSize,
        displayName?: string
        ): IPromise<VSS_User_Contracts.Avatar> {

        const queryValues: any = {
            size: size,
            displayName: displayName
        };

        return this._beginRequest<VSS_User_Contracts.Avatar>({
            httpMethod: "POST",
            area: "User",
            locationId: "9072a139-6843-4aa4-be9f-b7ec79b0e4b9",
            resource: "AvatarPreview",
            routeTemplate: "_apis/{area}/{resource}",
            requestType: VSS_User_Contracts.TypeInfo.Avatar,
            responseType: VSS_User_Contracts.TypeInfo.Avatar,
            queryParams: queryValues,
            apiVersion: this.avatarPreviewApiVersion,
            data: avatar
        });
    }

    /**
     * [Preview API]
     *
     * @param {VSS_User_Contracts.Avatar} avatar
     * @return IPromise<void>
     */
    public setAvatar(
        avatar: VSS_User_Contracts.Avatar
        ): IPromise<void> {

        return this._beginRequest<void>({
            httpMethod: "PUT",
            httpResponseType: "html",
            area: "User",
            locationId: "8ece324c-0aaf-4298-9e08-75afe8241b2f",
            resource: "Avatar",
            routeTemplate: "_apis/{area}/{resource}",
            requestType: VSS_User_Contracts.TypeInfo.Avatar,
            apiVersion: this.avatarApiVersion,
            data: avatar
        });
    }

    /**
     * [Preview API]
     *
     * @param {VSS_User_Contracts.AvatarSize} size
     * @return IPromise<VSS_User_Contracts.Avatar>
     */
    public getAvatar(
        size?: VSS_User_Contracts.AvatarSize
        ): IPromise<VSS_User_Contracts.Avatar> {

        const queryValues: any = {
            size: size
        };

        return this._beginRequest<VSS_User_Contracts.Avatar>({
            httpMethod: "GET",
            area: "User",
            locationId: "8ece324c-0aaf-4298-9e08-75afe8241b2f",
            resource: "Avatar",
            routeTemplate: "_apis/{area}/{resource}",
            responseType: VSS_User_Contracts.TypeInfo.Avatar,
            queryParams: queryValues,
            apiVersion: this.avatarApiVersion
        });
    }

    /**
     * [Preview API]
     *
     * @return IPromise<void>
     */
    public deleteAvatar(): IPromise<void> {

        return this._beginRequest<void>({
            httpMethod: "DELETE",
            httpResponseType: "html",
            area: "User",
            locationId: "8ece324c-0aaf-4298-9e08-75afe8241b2f",
            resource: "Avatar",
            routeTemplate: "_apis/{area}/{resource}",
            apiVersion: this.avatarApiVersion
        });
    }

    /**
     * [Preview API]
     *
     * @param {VSS_User_Contracts.SetUserAttributeParameters[]} attributeParametersList
     * @return IPromise<VSS_User_Contracts.UserAttribute[]>
     */
    public setAttributes(
        attributeParametersList: VSS_User_Contracts.SetUserAttributeParameters[]
        ): IPromise<VSS_User_Contracts.UserAttribute[]> {

        return this._beginRequest<VSS_User_Contracts.UserAttribute[]>({
            httpMethod: "PATCH",
            area: "User",
            locationId: "ca9522d0-9b7e-4496-b75a-52b536c80223",
            resource: "Attributes",
            routeTemplate: "_apis/{area}/{resource}/{attributeName}",
            requestType: VSS_User_Contracts.TypeInfo.SetUserAttributeParameters,
            responseType: VSS_User_Contracts.TypeInfo.UserAttribute,
            responseIsCollection: true,
            apiVersion: this.attributesApiVersion,
            data: attributeParametersList
        });
    }

    /**
     * [Preview API]
     *
     * @param {string} queryPattern
     * @param {string} modifiedAfter
     * @return IPromise<VSS_User_Contracts.UserAttribute[]>
     */
    public queryAttributes(
        queryPattern?: string,
        modifiedAfter?: string
        ): IPromise<VSS_User_Contracts.UserAttribute[]> {

        const queryValues: any = {
            queryPattern: queryPattern,
            modifiedAfter: modifiedAfter
        };

        return this._beginRequest<VSS_User_Contracts.UserAttribute[]>({
            httpMethod: "GET",
            area: "User",
            locationId: "ca9522d0-9b7e-4496-b75a-52b536c80223",
            resource: "Attributes",
            routeTemplate: "_apis/{area}/{resource}/{attributeName}",
            responseType: VSS_User_Contracts.TypeInfo.UserAttribute,
            responseIsCollection: true,
            queryParams: queryValues,
            apiVersion: this.attributesApiVersion
        });
    }

    /**
     * [Preview API]
     *
     * @param {string} attributeName
     * @return IPromise<VSS_User_Contracts.UserAttribute>
     */
    public getAttribute(
        attributeName: string
        ): IPromise<VSS_User_Contracts.UserAttribute> {

        return this._beginRequest<VSS_User_Contracts.UserAttribute>({
            httpMethod: "GET",
            area: "User",
            locationId: "ca9522d0-9b7e-4496-b75a-52b536c80223",
            resource: "Attributes",
            routeTemplate: "_apis/{area}/{resource}/{attributeName}",
            responseType: VSS_User_Contracts.TypeInfo.UserAttribute,
            routeValues: {
                attributeName: attributeName
            },
            apiVersion: this.attributesApiVersion
        });
    }

    /**
     * [Preview API]
     *
     * @param {string} attributeName
     * @return IPromise<void>
     */
    public deleteAttribute(
        attributeName: string
        ): IPromise<void> {

        return this._beginRequest<void>({
            httpMethod: "DELETE",
            httpResponseType: "html",
            area: "User",
            locationId: "ca9522d0-9b7e-4496-b75a-52b536c80223",
            resource: "Attributes",
            routeTemplate: "_apis/{area}/{resource}/{attributeName}",
            routeValues: {
                attributeName: attributeName
            },
            apiVersion: this.attributesApiVersion
        });
    }
}

/**
 * @exemptedapi
 */
export class UserHttpClient5 extends CommonMethods4_1To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.attributesApiVersion =
        this.avatarApiVersion =
        this.avatarPreviewApiVersion =
        this.contactWithOffersApiVersion =
        this.userApiVersion =
        this.userDefaultsApiVersion = "5.0-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class UserHttpClient4_1 extends CommonMethods4_1To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.attributesApiVersion =
        this.avatarApiVersion =
        this.avatarPreviewApiVersion =
        this.contactWithOffersApiVersion =
        this.userApiVersion =
        this.userDefaultsApiVersion = "4.1-preview.1";
    }
}

export class UserHttpClient extends UserHttpClient5 {
    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
    }
}

const clientMapping: { [id: string]: new (routeRequestPath: string) => VSS_WebApi.VssHttpClient; } = {
    "5.0": UserHttpClient5,
    "4.1": UserHttpClient4_1
}

/**
 * Gets an http client targeting the latest released version of the APIs.
 *
 * @return UserHttpClient5
 */
export function getClient(options?: VSS_WebApi.IVssHttpClientOptions): UserHttpClient5 {
    if ((<any>window).VSS && (<any>window).VSS.VssSDKRestVersion && clientMapping[(<any>window).VSS.VssSDKRestVersion]) {
        return VSS_Service.getClient<UserHttpClient5>(<any>(clientMapping[(<any>window).VSS.VssSDKRestVersion]), undefined, undefined, undefined, options);
    }
    else {
        return VSS_Service.getClient<UserHttpClient5>(UserHttpClient5, undefined, undefined, undefined, options);
    }
}
