import { ActionsHubBase } from "DistributedTaskControls/Common/Actions/Base";

import { CommonActionHubKeys } from "PipelineWorkflow/Scripts/Common/Constants";

import { Action } from "VSS/Flux/Action";

export class ProgressIndicatorActions extends ActionsHubBase {

    public initialize(): void {
        this._actionStarted = new Action<string>();
        this._actionCompleted = new Action<string>();
    }

    public static getKey(): string {
        return CommonActionHubKeys.ActionHubKey_ProgressIndicatorActionHub;
    }

    public get actionStarted(): Action<string> {
        return this._actionStarted;
    }

    public get actionCompleted(): Action<string> {
        return this._actionCompleted;
    }

    private _actionStarted: Action<string>;
    private _actionCompleted: Action<string>;
}
