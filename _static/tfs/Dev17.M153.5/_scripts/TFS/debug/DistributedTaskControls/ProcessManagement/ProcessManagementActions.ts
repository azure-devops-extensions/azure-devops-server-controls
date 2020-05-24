import { ActionsHubBase } from "DistributedTaskControls/Common/Actions/Base";
import { ActionsKeys } from "DistributedTaskControls/Common/Common";
import { ProcessManagementCapabilities } from "DistributedTaskControls/ProcessManagement/Types";

import { Action } from "VSS/Flux/Action";

export class ProcessManagementActions extends ActionsHubBase {

    public initialize() {
        this._updateCapabilities = new Action<ProcessManagementCapabilities>();
    }

    public static getKey(): string {
        return ActionsKeys.ProcessManagementActions;
    }

    public get updateCapabilities(): Action<ProcessManagementCapabilities> {
        return this._updateCapabilities;
    }

    private _updateCapabilities: Action<ProcessManagementCapabilities>;
}


