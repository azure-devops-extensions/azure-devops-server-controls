import { ActionsHubBase, IEmptyActionPayload } from "DistributedTaskControls/Common/Actions/Base";
import { ActionsKeys } from "DistributedTaskControls/PlanGroupsQueue/Constants";

import { Action } from "VSS/Flux/Action";

export class PlanGroupsQueueDialogActions extends ActionsHubBase {

    public initialize(): void {
        this._hidePlanGroupsQueueDialog = new Action<IEmptyActionPayload>();
        this._dismissErrorMessage = new Action<IEmptyActionPayload>();
    }

    public static getKey(): string {
        return ActionsKeys.PlanGroupsQueueDialogActions;
    }

    public get hidePlanGroupsQueueDialog(): Action<IEmptyActionPayload> {
        return this._hidePlanGroupsQueueDialog;
    }

    public get dismissErrorMessage(): Action<IEmptyActionPayload> {
        return this._dismissErrorMessage;
    }

    private _hidePlanGroupsQueueDialog: Action<IEmptyActionPayload>;
    private _dismissErrorMessage: Action<IEmptyActionPayload>;
}