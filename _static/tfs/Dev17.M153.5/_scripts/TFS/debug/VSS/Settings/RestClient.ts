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

import VSS_Service = require("VSS/Service");
import VSS_WebApi = require("VSS/WebApi/RestClient");

export class CommonMethods3To5 extends VSS_WebApi.VssHttpClient {
    protected entriesApiVersion: string;
    protected entriesApiVersion_cd006711: string;

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
    }

    /**
     * [Preview API] Set the specified entries for the given named scope
     *
     * @param {{ [key: string] : any; }} entries - The entries to set
     * @param {string} userScope - User-Scope at which to set the values. Should be "me" for the current user or "host" for all users.
     * @param {string} scopeName - Scope at which to set the settings on (e.g. "project" or "team")
     * @param {string} scopeValue - Value of the scope (e.g. the project or team id)
     * @return IPromise<void>
     */
    public setEntriesForScope(
        entries: { [key: string] : any; },
        userScope: string,
        scopeName: string,
        scopeValue: string
        ): IPromise<void> {

        return this._beginRequest<void>({
            httpMethod: "PATCH",
            httpResponseType: "html",
            area: "Settings",
            locationId: "4cbaafaf-e8af-4570-98d1-79ee99c56327",
            resource: "Entries",
            routeTemplate: "_apis/{area}/{scopeName}/{scopeValue}/{resource}/{userScope}/{*key}",
            routeValues: {
                userScope: userScope,
                scopeName: scopeName,
                scopeValue: scopeValue
            },
            apiVersion: this.entriesApiVersion,
            data: entries
        });
    }

    /**
     * [Preview API] Remove the entry or entries under the specified path
     *
     * @param {string} userScope - User-Scope at which to remove the value. Should be "me" for the current user or "host" for all users.
     * @param {string} scopeName - Scope at which to get the setting for (e.g. "project" or "team")
     * @param {string} scopeValue - Value of the scope (e.g. the project or team id)
     * @param {string} key - Root key of the entry or entries to remove
     * @return IPromise<void>
     */
    public removeEntriesForScope(
        userScope: string,
        scopeName: string,
        scopeValue: string,
        key: string
        ): IPromise<void> {

        return this._beginRequest<void>({
            httpMethod: "DELETE",
            httpResponseType: "html",
            area: "Settings",
            locationId: "4cbaafaf-e8af-4570-98d1-79ee99c56327",
            resource: "Entries",
            routeTemplate: "_apis/{area}/{scopeName}/{scopeValue}/{resource}/{userScope}/{*key}",
            routeValues: {
                userScope: userScope,
                scopeName: scopeName,
                scopeValue: scopeValue,
                key: key
            },
            apiVersion: this.entriesApiVersion
        });
    }

    /**
     * [Preview API] Get all setting entries for the given named scope
     *
     * @param {string} userScope - User-Scope at which to get the value. Should be "me" for the current user or "host" for all users.
     * @param {string} scopeName - Scope at which to get the setting for (e.g. "project" or "team")
     * @param {string} scopeValue - Value of the scope (e.g. the project or team id)
     * @param {string} key - Optional key under which to filter all the entries
     * @return IPromise<{ [key: string] : any; }>
     */
    public getEntriesForScope(
        userScope: string,
        scopeName: string,
        scopeValue: string,
        key?: string
        ): IPromise<{ [key: string] : any; }> {

        return this._beginRequest<{ [key: string] : any; }>({
            httpMethod: "GET",
            area: "Settings",
            locationId: "4cbaafaf-e8af-4570-98d1-79ee99c56327",
            resource: "Entries",
            routeTemplate: "_apis/{area}/{scopeName}/{scopeValue}/{resource}/{userScope}/{*key}",
            responseIsCollection: true,
            routeValues: {
                userScope: userScope,
                scopeName: scopeName,
                scopeValue: scopeValue,
                key: key
            },
            apiVersion: this.entriesApiVersion
        });
    }

    /**
     * [Preview API] Set the specified setting entry values for the given user/all-users scope
     *
     * @param {{ [key: string] : any; }} entries - The entries to set
     * @param {string} userScope - User-Scope at which to set the values. Should be "me" for the current user or "host" for all users.
     * @return IPromise<void>
     */
    public setEntries(
        entries: { [key: string] : any; },
        userScope: string
        ): IPromise<void> {

        return this._beginRequest<void>({
            httpMethod: "PATCH",
            httpResponseType: "html",
            area: "Settings",
            locationId: "cd006711-163d-4cd4-a597-b05bad2556ff",
            resource: "Entries",
            routeTemplate: "_apis/{area}/{resource}/{userScope}/{*key}",
            routeValues: {
                userScope: userScope
            },
            apiVersion: this.entriesApiVersion_cd006711,
            data: entries
        });
    }

    /**
     * [Preview API] Remove the entry or entries under the specified path
     *
     * @param {string} userScope - User-Scope at which to remove the value. Should be "me" for the current user or "host" for all users.
     * @param {string} key - Root key of the entry or entries to remove
     * @return IPromise<void>
     */
    public removeEntries(
        userScope: string,
        key: string
        ): IPromise<void> {

        return this._beginRequest<void>({
            httpMethod: "DELETE",
            httpResponseType: "html",
            area: "Settings",
            locationId: "cd006711-163d-4cd4-a597-b05bad2556ff",
            resource: "Entries",
            routeTemplate: "_apis/{area}/{resource}/{userScope}/{*key}",
            routeValues: {
                userScope: userScope,
                key: key
            },
            apiVersion: this.entriesApiVersion_cd006711
        });
    }

    /**
     * [Preview API] Get all setting entries for the given user/all-users scope
     *
     * @param {string} userScope - User-Scope at which to get the value. Should be "me" for the current user or "host" for all users.
     * @param {string} key - Optional key under which to filter all the entries
     * @return IPromise<{ [key: string] : any; }>
     */
    public getEntries(
        userScope: string,
        key?: string
        ): IPromise<{ [key: string] : any; }> {

        return this._beginRequest<{ [key: string] : any; }>({
            httpMethod: "GET",
            area: "Settings",
            locationId: "cd006711-163d-4cd4-a597-b05bad2556ff",
            resource: "Entries",
            routeTemplate: "_apis/{area}/{resource}/{userScope}/{*key}",
            responseIsCollection: true,
            routeValues: {
                userScope: userScope,
                key: key
            },
            apiVersion: this.entriesApiVersion_cd006711
        });
    }
}

/**
 * @exemptedapi
 */
export class SettingsHttpClient5 extends CommonMethods3To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.entriesApiVersion =
        this.entriesApiVersion_cd006711 = "5.0-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class SettingsHttpClient4_1 extends CommonMethods3To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.entriesApiVersion =
        this.entriesApiVersion_cd006711 = "4.1-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class SettingsHttpClient4 extends CommonMethods3To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.entriesApiVersion =
        this.entriesApiVersion_cd006711 = "4.0-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class SettingsHttpClient3_2 extends CommonMethods3To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.entriesApiVersion =
        this.entriesApiVersion_cd006711 = "3.2-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class SettingsHttpClient3_1 extends CommonMethods3To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.entriesApiVersion =
        this.entriesApiVersion_cd006711 = "3.1-preview.1";
    }
}

/**
 * @exemptedapi
 */
export class SettingsHttpClient3 extends CommonMethods3To5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
        this.entriesApiVersion =
        this.entriesApiVersion_cd006711 = "3.0-preview.1";
    }
}

export class SettingsHttpClient extends SettingsHttpClient5 {
    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
    }
}

const clientMapping: { [id: string]: new (routeRequestPath: string) => VSS_WebApi.VssHttpClient; } = {
    "5.0": SettingsHttpClient5,
    "4.1": SettingsHttpClient4_1,
    "4.0": SettingsHttpClient4,
    "3.2": SettingsHttpClient3_2,
    "3.1": SettingsHttpClient3_1,
    "3.0": SettingsHttpClient3
}

/**
 * Gets an http client targeting the latest released version of the APIs.
 *
 * @return SettingsHttpClient5
 */
export function getClient(options?: VSS_WebApi.IVssHttpClientOptions): SettingsHttpClient5 {
    if ((<any>window).VSS && (<any>window).VSS.VssSDKRestVersion && clientMapping[(<any>window).VSS.VssSDKRestVersion]) {
        return VSS_Service.getClient<SettingsHttpClient5>(<any>(clientMapping[(<any>window).VSS.VssSDKRestVersion]), undefined, undefined, undefined, options);
    }
    else {
        return VSS_Service.getClient<SettingsHttpClient5>(SettingsHttpClient5, undefined, undefined, undefined, options);
    }
}
