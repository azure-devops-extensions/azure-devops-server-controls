import { autobind } from "OfficeFabric/Utilities";
import { RemoteStore } from "VSS/Flux/Store";

/**
 * A shared store for requested permissions data from the PermissionsDataProvider.
 * If requested results are not found, the data provider will be refreshed.
 * TPermissions is the permissions type translated from the action payload.
 * TRawPermissions is the raw permissions type before translation.
 */
export class PermissionsStore<TPermissions, TRawPermissions> extends RemoteStore {
    private _permissions: TPermissions;
    private _rawPermissions: TRawPermissions;

    @autobind
    public onPermissionsUpdated(rawPermissions: TRawPermissions): void {
        this._rawPermissions = rawPermissions;
        this.updatePermissions();
        this.emitChanged();
    }

    public getPermissions(): TPermissions {
        return this._permissions || {} as TPermissions;
    }

    protected arePermissionsLoading(): boolean {
        return !this._rawPermissions;
    }

    protected updatePermissions(): void {
        this._permissions = this.evaluatePermissions(this._rawPermissions);
        this._loading = this.arePermissionsLoading();
    }

    /**
     * Given a set of permissions from the server, evaluate and return what store-
     * specific permissions the current user has.
     */
    protected evaluatePermissions(rawPermissions: TRawPermissions): TPermissions {
        return rawPermissions as any;
    }
}
