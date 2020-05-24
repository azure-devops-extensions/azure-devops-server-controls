import { BuildSecurity } from "Build.Common/Scripts/Generated/TFS.Build2.Common";

import { permissionsRetrieved } from "CIWorkflow/Scripts/Scenarios/Definition/Actions/Permissions";

import { getSharedData } from "VSS/Contributions/LocalPageData";
import { Store } from "VSS/Flux/Store";
import { PermissionEvaluation } from "VSS/Security/Contracts";

interface PermissionCollection {
    [token: string]: number;
}

export interface IPermissionsStore {
    hasPermission(token: string, requestedPermission: number): boolean;
    hasToken(token: string): boolean;

    addChangedListener(handler: IEventHandler): void;
    removeChangedListener(handler: IEventHandler): void;
}

const permissionsSharedDataKey = "_permissions";

interface SharedPermissionCollection {
    [namespaceId: string]: SharedPermissionData;
}

interface SharedPermissionData {
    [token: string]: number;
}

export class PermissionsStore extends Store implements IPermissionsStore {
    constructor() {
        super();

        permissionsRetrieved.addListener((payload: PermissionEvaluation[]) => {
            let changed = false;

            payload.forEach((permissionEvaluation) => {
                // merge the retrieved permissions with what we have stored
                // start with the permissions stored here, but fall back to the security service if we don't have them
                let entry = this._permissions[permissionEvaluation.token];
                if (entry === undefined) {
                    entry = this._getLocalPermissions(permissionEvaluation.token);
                }
                if (entry === undefined) {
                    entry = 0;
                }

                const originalEntry = entry;
                if (permissionEvaluation.value) {
                    // has permission
                    entry = entry | permissionEvaluation.permissions;
                }
                else {
                    // does not have permission
                    entry = entry & (~permissionEvaluation.permissions);
                }

                this._permissions[permissionEvaluation.token] = entry;

                changed = changed || (entry !== originalEntry);
            });

            if (changed) {
                this.emitChanged();
            }
        });
    }

    public hasPermission(token: string, requestedPermission: number): boolean {
        const effectivePermissions = this._getPermissions(token);
        return (requestedPermission & effectivePermissions) > 0;
    }

    public hasToken(token: string): boolean {
        return this._getPermissions(token) !== undefined;
    }

    private _getPermissions(token: string): number | undefined {
        // prefer permissions stored here, but fall back to the shared data if we don't have them
        // the shared data contains permissions sent by the data providers.
        let effectivePermissions = this._permissions[token];
        if (effectivePermissions === undefined) {
            effectivePermissions = this._getLocalPermissions(token);
        }

        return effectivePermissions;
    }

    private _getLocalPermissions(token: string): number | undefined {
        // we are using LocalPageData directly instead of going through the SecurityService,
        // since SecurityService emits annoying diag messages and doesn't provide a way to take action when permissions don't exist
        const sharedPermissions = getSharedData<SharedPermissionCollection>(permissionsSharedDataKey);
        if (!sharedPermissions) {
            return undefined;
        }

        const tokens = sharedPermissions[BuildSecurity.BuildNamespaceId];
        if (!tokens) {
            return undefined;
        }

        return tokens[token];
    }

    private _permissions: PermissionCollection = {};
}

let _permissionsStore: PermissionsStore = null;
export function getPermissionsStore(): IPermissionsStore {
    if (!_permissionsStore) {
        _permissionsStore = new PermissionsStore();
    }
    return _permissionsStore;
}
