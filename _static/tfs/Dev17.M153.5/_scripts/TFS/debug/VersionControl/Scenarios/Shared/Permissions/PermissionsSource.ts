import { WebPageDataService } from "VSS/Contributions/Services";
import { getService, getLocalService } from "VSS/Service";
import { SecurityService } from "VSS/Security/Services";
import { unique } from "VSS/Utils/Array";
import { ServiceInstanceTypes } from "VSS/WebApi/Constants";
import { ContractSerializer } from "VSS/Serialization";
import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";
import { FeatureAvailabilityFlags } from "Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants";

/**
 * Generic permissions relative to the current page.
 */
export type Permissions = IDictionaryStringTo<boolean>;
export interface PermissionsResult<TPermissions, TKey> {
    key: TKey,
    permissions: TPermissions;
}

/**
 * A source to retrieve requested permissions data from the PermissionsDataProvider.
 * If requested results are not found, the data provider will be refreshed.
 * TPermissions is the result type of the permissions query, which should map permission 
 *      value to whether or not the permissions is granted
 * TKey is the type of the permissions key given to the query
 */
export abstract class PermissionsSource<TPermissions extends Permissions, TKey> {
    // the security values/bits enum
    private _securityPermissionsEnumType: Object;

    private _webPageDataService: WebPageDataService;
    private _securityService: SecurityService;
    private _permissionsDataProvider: Contribution;

    private static readonly DATA_ISLAND_PROVIDER_ID: string = "ms.vss-code-web.permissions-data-provider";
    private static readonly DATA_ISLAND_CACHE_PREFIX: string = "TFS.VersionControl.PermissionsDataProvider";
    private static readonly DATA_ISLAND_KEY_PREFIX: string = "SecurityToken";

    constructor(securityPermissionsEnumType: Object) {
        this._securityPermissionsEnumType = securityPermissionsEnumType;

        this._permissionsDataProvider = {
            id: PermissionsSource.DATA_ISLAND_PROVIDER_ID,
            properties: {
                serviceInstanceType: ServiceInstanceTypes.TFS
            }
        } as Contribution;

        this._webPageDataService = getService(WebPageDataService);
        this._securityService = getLocalService(SecurityService);
    }

    /**
     * Serialze a given key which is used for data provider security token lookup/retrieval
     */
    protected abstract serializeKey(key: TKey): string;

    /**
     * Query for permissions from the data provider given a list of desired keys. If no data provider data is found
     * or if force refresh is specified, we will call to refresh the provider before computing permissions.
     */
    public queryPermissionsAsync(permissionKeys: TKey[], forceRefresh: boolean = false): IPromise<PermissionsResult<TPermissions, TKey>[]> {
        return this._refreshDataProviderIfNeeded(permissionKeys, forceRefresh).then(() => {
            return permissionKeys.map(key => this._getPermissionsResult(key));
        });
    }

    /**
     * Check the page for the required repository and branch security data. If any of those are not 
     * present, refresh the data provider.
     */
    private _refreshDataProviderIfNeeded(permissionKeys: TKey[], forceRefresh: boolean = false): IPromise<void> {
        const permissionKeyStrings = unique(permissionKeys.map(key => this.serializeKey(key)));
        const securityNamespaceTokens: string[] = permissionKeyStrings.map(key => this._getSecurityDataFromPage(key));

        return forceRefresh || !securityNamespaceTokens.every(token => Boolean(token))
            ? this._webPageDataService.ensureDataProvidersResolved([this._permissionsDataProvider], true, { permissionKeys: permissionKeyStrings })
            : Promise.resolve() // we have all the data we need and are not force refreshing, avoid the server call
    }

    /**
     * Fill out permissions in the given permissions key.
     */
    private _getPermissionsResult(permissionKey: TKey): PermissionsResult<TPermissions, TKey> {
        const securityNamespaceToken = this._getSecurityDataFromPage(this.serializeKey(permissionKey));
        const [securityNamespaceId, ...securityToken] = (securityNamespaceToken || "/").split("/");

        const permissionsResult: PermissionsResult<TPermissions, TKey> = {
            key: permissionKey,
            permissions: {} as TPermissions,
        };

        getStringKeys(this._securityPermissionsEnumType).forEach(k => {
            permissionsResult.permissions[k] = this._getPermission(securityNamespaceId, securityToken.join("/"), this._securityPermissionsEnumType[k]);
        });

        return permissionsResult;
    }

    private _getPermission(namespaceId: string, token: string, requestedPermission: number): boolean {
        // if permission checks in the UI are disabled, return permissions as true
        if (!FeatureAvailabilityService.isFeatureEnabled(FeatureAvailabilityFlags.WebAccessVersionControlEnablePermissions, false)) {
            return true;
        }

        // token not found on the page, default permission is false
        if (!token) {
            return false;
        }

        return this._securityService.hasPermission(namespaceId, token, requestedPermission);
    }

    protected _getSecurityDataFromPage(permissionKeyString: string): string {
        const pageDataKeyString = `${PermissionsSource.DATA_ISLAND_CACHE_PREFIX}.${PermissionsSource.DATA_ISLAND_KEY_PREFIX}.${permissionKeyString}`;
        const pageData = this._webPageDataService.getPageData<any>(PermissionsSource.DATA_ISLAND_PROVIDER_ID) || {};
        return <string>ContractSerializer.deserialize(pageData[pageDataKeyString], null);
    }
}

/**
 * Typescript enums are mapped twice, string key to value and value to string key.
 * Return only the string keys.
 */
export function getStringKeys(obj: any): string[] {
    return Object.keys(obj).filter(k => isNaN(Number(k)));
}
