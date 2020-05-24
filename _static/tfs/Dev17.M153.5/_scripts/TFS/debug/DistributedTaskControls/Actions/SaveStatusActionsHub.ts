import * as ActionsBase from "DistributedTaskControls/Common/Actions/Base";
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { ActionsKeys } from "DistributedTaskControls/Common/Common";

export enum SaveStatus {
    Success,
    Failure,
    InProgress
}

export class SaveStatusActionsHub extends ActionsBase.ActionsHubBase {

    public static getKey(): string {
        return ActionsKeys.SaveStatusActions;
    }

    public initialize(): void {
        this._updateSaveStatus = new ActionsBase.Action<SaveStatus>();
    }

    public get updateSaveStatus(): ActionsBase.Action<SaveStatus> {
        return this._updateSaveStatus;
    }

    private _updateSaveStatus: ActionsBase.Action<SaveStatus>;
}