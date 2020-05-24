import { Action } from "VSS/Flux/Action";

import { ActionsHubBase, IEmptyActionPayload } from "DistributedTaskControls/Common/Actions/Base";
import { VariableActionHubKeys } from "DistributedTaskControls/Variables/Common/Constants";
import { ILinkedVariable } from "DistributedTaskControls/Variables/ProcessVariableGridView/ProcessVariablesGridViewUtility";

export class VariablesGridActions extends ActionsHubBase {

    public initialize(instanceId?: string): void {
        this._setEditVariableInProgressDataIndex = new Action<number>();
        this._unsetEditVariableInProgessDataIndex = new Action<IEmptyActionPayload>();
    }

    public static getKey(): string {
        return VariableActionHubKeys.VariablesGrid_ActionsHub;
    }

    public get setEditVariableInProgessDataIndex(): Action<number> {
        return this._setEditVariableInProgressDataIndex;
    }

    public get unsetEditVariableInProgessDataIndex(): Action<IEmptyActionPayload> {
        return this._unsetEditVariableInProgessDataIndex;
    }

    private _setEditVariableInProgressDataIndex: Action<number>;
    private _unsetEditVariableInProgessDataIndex: Action<IEmptyActionPayload>;
}

