import * as ActionsBase from "DistributedTaskControls/Common/Actions/Base";
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";

import { ActionCreatorKeys } from "DistributedTaskControls/PlanGroupsQueue/Constants";
import { PlanGroupsQueueDialogActions } from "DistributedTaskControls/PlanGroupsQueue/Actions/PlanGroupsQueueDialogActions";
import { PlanGroupsQueueDialogStore } from "DistributedTaskControls/PlanGroupsQueue/Stores/PlanGroupsQueueDialogStore";
import { IPlanGroupsQueueDialogOptions } from "DistributedTaskControls/PlanGroupsQueue/Types";

export class PlanGroupsQueueDialogActionsCreator extends ActionsBase.ActionCreatorBase {
    constructor(private _options: IPlanGroupsQueueDialogOptions) {
        super();
    }

    public static getKey(): string {
        return ActionCreatorKeys.PlanGroupsQueueDialogActionsCreator;
    }

    public initialize() {
        this._actions = ActionsHubManager.GetActionsHub<PlanGroupsQueueDialogActions>(PlanGroupsQueueDialogActions);
    }

    public hidePlanGroupsQueueDialog(): void {
        this._actions.hidePlanGroupsQueueDialog.invoke(null);
    }

    public dismissErrorMessage(): void {
        this._actions.dismissErrorMessage.invoke(null);
    }

    private _actions: PlanGroupsQueueDialogActions;
}