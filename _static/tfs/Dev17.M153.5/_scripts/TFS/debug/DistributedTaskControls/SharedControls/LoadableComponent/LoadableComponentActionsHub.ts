
import * as ActionBase from "DistributedTaskControls/Common/Actions/Base";

import { ActionsKeys } from "DistributedTaskControls/Common/Common";

export class LoadableComponentActionsHub extends ActionBase.ActionsHubBase {

    public static getKey(): string {
        return ActionsKeys.LoadableComponentActions;
    }

    public initialize(instanceId: string): void {
        this._showLoadingExperience = new ActionBase.Action<ActionBase.IEmptyActionPayload>();
        this._hideLoadingExperience = new ActionBase.Action<ActionBase.IEmptyActionPayload>();
    }

    public get showLoadingExperience(): ActionBase.Action<ActionBase.IEmptyActionPayload> {
        return this._showLoadingExperience;
    }

    public get hideLoadingExperience(): ActionBase.Action<ActionBase.IEmptyActionPayload> {
        return this._hideLoadingExperience;
    }

    private _showLoadingExperience: ActionBase.Action<ActionBase.IEmptyActionPayload>;
    private _hideLoadingExperience: ActionBase.Action<ActionBase.IEmptyActionPayload>;
}
