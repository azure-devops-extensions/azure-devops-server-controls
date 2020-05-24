import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { ActionCreatorBase } from "DistributedTaskControls/Common/Actions/Base";

import { DialogActions } from "PipelineWorkflow/Scripts/Common/Actions/DialogActions";
import { CommonActionsCreatorKeys } from "PipelineWorkflow/Scripts/Common/Constants";

export class DialogActionsCreator extends ActionCreatorBase {
    public static getKey(): string {
        return CommonActionsCreatorKeys.ActionsCreatorKey_CommonDialogActionsCreator;
    }

    public initialize(instanceId: string): void {
        this._actions = ActionsHubManager.GetActionsHub<DialogActions>(DialogActions, instanceId);
    }

    public showDialog(): void {
        this._actions.showDialog.invoke({});
    }

    public closeDialog(): void {
        this._actions.closeDialog.invoke({});
    }

    private _actions: DialogActions;
}
