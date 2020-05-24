import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { ActionCreatorBase } from "DistributedTaskControls/Common/Actions/Base";

import { ProgressIndicatorActions } from "PipelineWorkflow/Scripts/Common/Actions/ProgressIndicatorActions";
import { CommonActionsCreatorKeys } from "PipelineWorkflow/Scripts/Common/Constants";

export class ProgressIndicatorActionsCreator extends ActionCreatorBase {
    public static getKey(): string {
        return CommonActionsCreatorKeys.ActionsCreatorKey_ProgressIndicatorActionsCreator;
    }

    public initialize(instanceId: string): void {
        this._actions = ActionsHubManager.GetActionsHub<ProgressIndicatorActions>(ProgressIndicatorActions, instanceId);
    }

    public actionStarted(actionName: string): void {
        this._actions.actionStarted.invoke(actionName);
    }

    public actionCompleted(actionName: string): void {
        this._actions.actionCompleted.invoke(actionName);
    }

    private _actions: ProgressIndicatorActions;
}
