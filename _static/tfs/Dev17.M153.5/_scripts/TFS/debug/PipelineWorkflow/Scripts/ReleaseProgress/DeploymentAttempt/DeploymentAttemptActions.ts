import * as ActionBase from "DistributedTaskControls/Common/Actions/Base";

import { DeploymentAttemptKey } from "PipelineWorkflow/Scripts/ReleaseProgress/Constants";

export class DeploymentAttemptActions extends ActionBase.ActionsHubBase {

    public static getKey(): string {
        return DeploymentAttemptKey.DeploymentAttemptActions;
    }

    public initialize(): void {
        this._selectAttempt = new ActionBase.Action<number>();
        this._resetSelectedAttempt = new ActionBase.Action<ActionBase.IEmptyActionPayload>();
    }

    public get selectAttempt(): ActionBase.Action<number> {
        return this._selectAttempt;
    }

    public get resetSelectedAttempt(): ActionBase.Action<ActionBase.IEmptyActionPayload> {
        return this._resetSelectedAttempt;
    }

    private _selectAttempt: ActionBase.Action<number>;
    private _resetSelectedAttempt: ActionBase.Action<ActionBase.IEmptyActionPayload>;
}