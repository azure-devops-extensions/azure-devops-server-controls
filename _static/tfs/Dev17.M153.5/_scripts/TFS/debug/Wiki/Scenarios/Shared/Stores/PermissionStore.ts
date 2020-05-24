import { Store } from "VSS/Flux/Store";
import { WikiPermissions } from "Wiki/Scenarios/Shared/SharedActionsHub";

export interface PermissionState extends WikiPermissions {
}

export class PermissionStore extends Store {
    private _state: PermissionState = {
        hasCreatePermission: undefined,
        hasContributePermission: undefined,
        hasReadPermission: undefined,
        hasRenamePermission: undefined,
        hasManagePermission: undefined,
    };

    public changePermissions = (newPermissions: WikiPermissions): void => {
            this._state = newPermissions;
            this.emitChanged();
    }

    public get state(): PermissionState {
        return this._state;
    }

}
