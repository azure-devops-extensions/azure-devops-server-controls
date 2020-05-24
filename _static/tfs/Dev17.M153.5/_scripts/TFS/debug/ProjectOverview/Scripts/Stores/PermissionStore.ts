import * as VSSStore from "VSS/Flux/Store";
import { PermissionsPayload } from "ProjectOverview/Scripts/ActionsHub";
import { UpsellTypes } from "ProjectOverview/Scripts/Generated/Contracts";

export interface PermissionState {
    permissibleUpsells: UpsellTypes[];
    hasEditReadmePermission: boolean;
    hasViewRightPanePermission: boolean;
    hasBuildPermission: boolean;
}

export class PermissionStore extends VSSStore.Store {
    private _state: PermissionState;

    constructor() {
        super();
        this._state = {
            permissibleUpsells: [],
            hasEditReadmePermission: false,
            hasViewRightPanePermission: false,
            hasBuildPermission: false,
        }
    }

    public getState(): PermissionState {
        return this._state;
    }

    public setPermissions = (permissionsPayload: PermissionsPayload): void => {
        this._state.permissibleUpsells = permissionsPayload.permissibleUpsells;
        this._state.hasEditReadmePermission = permissionsPayload.hasEditReadmePermission;
        this._state.hasViewRightPanePermission = permissionsPayload.hasViewRightPanePermission;
        this._state.hasBuildPermission = permissionsPayload.hasBuildPermission;
        this.emitChanged();
    }
}
