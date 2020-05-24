import * as Q from "q";

import { WebContext } from "VSS/Common/Contracts/Platform";
import { getSharedData } from "VSS/Contributions/LocalPageData";
import { getClient, VssConnection, VssService } from "VSS/Service";
import { SettingsHttpClient } from "VSS/Settings/RestClient";
import { getService as getClaimsService, IUserClaimsService, UserClaims } from "VSS/User/Services";

/**
 * Whether settings are applied to the current user or to all users in the host
 */
export const enum SettingsUserScope {
    /**
     * Settings for the current user
     */
    Me,

    /**
     * Shared settings for all users in this host
     */
    Host
}

/**
 * Service for interacting with Settings REST Endpoint which handles anonymous/public users
 * by not calling the server since the server endpoint is not open to public.
 */
export interface ISettingsService {

    /**
     * Synchronous method to get a setting entry from the settings emitted from local data providers. Returns undefined
     * if the value was not present.
     *
     * @param {string} key - Settings key.
     * @param {string} userScope - User-Scope at which to get the value. Should be Me for the current user or Host for all users.
     * @param {string} scopeName - Scope at which to get the setting for (e.g. "project" or "team")
     * @param {string} scopeValue - Value of the scope (e.g. the project or team id)
     * @return Promise<{ [key: string] : any; }>
     */
    getEntry<T>(key: string, userScope: SettingsUserScope, scopeName?: string, scopeValue?: string): T | undefined;

    /**
     * Get all setting entries by making a REST call if the data was not already included in local data provider data.
     *
     * @param {string} key - Key under which to filter all the entries
     * @param {string} userScope - User-Scope at which to get the value. Should be Me for the current user or Host for all users.
     * @param {string} scopeName - Scope at which to get the setting for (e.g. "project" or "team")
     * @param {string} scopeValue - Value of the scope (e.g. the project or team id)
     * @return Promise<{ [key: string] : any; }>
     */
    getEntriesAsync(key: string, userScope: SettingsUserScope, scopeName?: string, scopeValue?: string): IPromise<{ [key: string]: any; }>;

    /**
     * Set the specified settings entries
     *
     * @param {{ [key: string] : any; }} entries - The entries to set
     * @param {string} userScope - User-Scope at which to set the values. Should be Me for the current user or Host for all users.
     * @param {string} scopeName - Scope at which to set the settings on (e.g. "project" or "team")
     * @param {string} scopeValue - Value of the scope (e.g. the project or team id)
     * @return Promise<void>
     */
    setEntries(entries: { [key: string]: any; }, userScope: SettingsUserScope, scopeName?: string, scopeValue?: string): IPromise<void>;

    /**
     * Remove the entry or entries under the specified path
     *
     * @param {string} key - Root key of the entry or entries to remove
     * @param {string} userScope - User-Scope at which to remove the value. Should be Me for the current user or Host for all users.
     * @param {string} scopeName - Scope at which to get the setting for (e.g. "project" or "team")
     * @param {string} scopeValue - Value of the scope (e.g. the project or team id)
     * @return Promise<void>
     */
    removeEntries(key: string, userScope: SettingsUserScope, scopeName?: string, scopeValue?: string): IPromise<void>;
}

const getFallbackPromise = Q({ value: {}, count: 0 });
const setFallbackPromise = Q();

class SettingsService extends VssService implements ISettingsService {

    private _httpClient: SettingsHttpClient;
    private _claimsService: IUserClaimsService;

    private get httpClient(): SettingsHttpClient {

        if (!this._httpClient) {
            this._httpClient = getClient(SettingsHttpClient);
        }

        return this._httpClient;
    }

    private get canCallSettingsEndpoint(): boolean {
        
        if (!this._claimsService) {
            this._claimsService = getClaimsService();
        }

        // We do not attempt to call REST Endpoint if the user does not have member claim
        return this._claimsService.hasClaim(UserClaims.Member);
    }

    public getEntry<T>(key: string, userScope: SettingsUserScope, scopeName?: string, scopeValue?: string): T | undefined {

        if (!this.canCallSettingsEndpoint) {
            return undefined;
        }

        const settingsSharedData = getSharedData<{ [scopeKey: string]: { [settingsKey: string]: any } }>("_settings");
        if (settingsSharedData) {

            let scopeKey = this.userScopeToString(userScope);
            if (scopeName) {
                scopeKey += ";" + scopeName + ";" + (scopeValue || "");
            }

            const scopeValues = settingsSharedData[scopeKey];

            if (scopeValues) {

                // Look at entries for parent paths
                const keyParts = key.split("/");
                for (let i = 0, l = keyParts.length; i < l; i++) {
                    const joinedKey = keyParts.slice(0, i + 1).join("/");
                    const parentEntry = scopeValues[joinedKey];
                    if (parentEntry) {

                        // We found an entry for a parent path, now select the appropriate object through this item's keys
                        let entry = parentEntry;
                        for (let j = i + 1; j < keyParts.length && entry; j++) {
                            entry = entry[keyParts[j]];
                        }
                        return <T>entry;
                    }
                }
            }
        }

        return undefined;
    }

    public getEntriesAsync(key: string, userScope: SettingsUserScope, scopeName?: string, scopeValue?: string): IPromise<{ [key: string]: any; }> {

        if (!this.canCallSettingsEndpoint) {
            return getFallbackPromise;
        }

        if (scopeName) {
            return this.httpClient.getEntriesForScope(this.userScopeToString(userScope), scopeName, scopeValue!, key);
        }
        else {
            return this.httpClient.getEntries(this.userScopeToString(userScope), key);
        }
    }

    public setEntries(entries: { [key: string]: any; }, userScope: SettingsUserScope, scopeName?: string, scopeValue?: string): IPromise<void> {

        if (!this.canCallSettingsEndpoint) {
            return setFallbackPromise;
        }

        if (scopeName) {
            return this.httpClient.setEntriesForScope(entries, this.userScopeToString(userScope), scopeName, scopeValue!);
        }
        else {
            return this.httpClient.setEntries(entries, this.userScopeToString(userScope));
        }
    }

    public removeEntries(key: string, userScope: SettingsUserScope, scopeName?: string, scopeValue?: string): IPromise<void> {

        if (!this.canCallSettingsEndpoint) {
            return setFallbackPromise;
        }

        if (scopeName) {
            return this.httpClient.removeEntriesForScope(this.userScopeToString(userScope), scopeName, scopeValue!, key);
        }
        else {
            return this.httpClient.removeEntries(this.userScopeToString(userScope), key);
        }
    }

    private userScopeToString(userScope: SettingsUserScope) {
        
        return userScope === SettingsUserScope.Host ? "host" : "me";
    }
}

/**
 * Get the settings service for the web context default host type.
 *
 * @param webContext optional web context to use for the connection
 * @return Collection-level or Application-level service
 */
export function getService(webContext?: WebContext): ISettingsService {
    return VssConnection.getConnection(webContext).getService(SettingsService);
}