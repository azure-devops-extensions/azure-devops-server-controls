import * as Q from "q";

import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import * as ServiceCommon from "TestManagement/Scripts/Services/Services.Common";

import Security_RestClient = require("VSS/Security/RestClient");
import Service = require("VSS/Service");
import Utils_String = require("VSS/Utils/String");

export interface ISecurityPermissionsService extends ServiceCommon.IService {
    hasPermission(token: string, permissionSet: string, permissions: number, alwaysAllowAdministrators?: boolean): IPromise<boolean>;
    listPermissions(tokens: string, permissionSet: string, permissions: number, alwaysAllowAdministrators?: boolean): IPromise<boolean[]>;
}

export class SecurityPermissionsService extends ServiceCommon.BaseService<Security_RestClient.SecurityHttpClient> implements ISecurityPermissionsService {

    public executeCommand(commandName: string, args?: any[]): any {
    }

    public getHttpClient(tfsConnection: Service.VssConnection): Security_RestClient.SecurityHttpClient {
        return tfsConnection.getHttpClient<Security_RestClient.SecurityHttpClient>(Security_RestClient.SecurityHttpClient);
    }

    public hasPermission(token: string, permissionSet: string, permissions: number, alwaysAllowAdministrators?: boolean): IPromise<boolean> {
        return this.listPermissions(token, permissionSet, permissions, alwaysAllowAdministrators).then((results: boolean[]) => { return results[0]; });
    }

    public listPermissions(tokens: string, permissionSet: string, permissions: number, alwaysAllowAdministrators?: boolean): IPromise<boolean[]> {
        return this._httpClient.hasPermissions(permissionSet, permissions, tokens, alwaysAllowAdministrators);
    }
}

export class PermissionsManager {

    public hasPermission(securityNamespace: string, token: string, permissions: number, forceRefresh?: boolean): IPromise<boolean> {

        let securityToken = TfsContext.getDefault().navigation.projectId;
        if (token) {
            securityToken += "/" + token;
        }
        let tokenKey = PermissionsManager._getTokenKey(token, securityToken, permissions);

        if (!forceRefresh && this._cachedPermissions.hasOwnProperty(tokenKey)) {
            return Q.resolve(this._cachedPermissions[tokenKey]);
        }
        else {
            let defer = Q.defer<boolean>();
            ServiceCommon.ServiceFactory.getService(ServiceCommon.ServiceType.SecurityPermissions)
                .then((securityPermissionClient: SecurityPermissionsService) => securityPermissionClient.hasPermission(securityToken, securityNamespace, permissions))
                .then((hasPermission: boolean) => {
                    this._cachedPermissions[tokenKey] = hasPermission;
                    defer.resolve(hasPermission);
                })
                .then(null, (error) => {
                    defer.reject(error);
                });
            return defer.promise;
        }
    }

    private static _getTokenKey(token: string, securityToken: string, permission: number): string {
        return Utils_String.format("{0}/{1}", (token) ? token.toLowerCase() : securityToken.toLowerCase(), permission.toString().toLowerCase());
    }

    private _cachedPermissions: IDictionaryStringTo<boolean> = {};
}