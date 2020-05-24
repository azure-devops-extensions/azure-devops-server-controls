import { logError } from "VSS/Diag";

import * as DTContracts from "TFS/DistributedTask/Contracts";

import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import { ActionCreatorBase } from "DistributedTaskControls/Common/Actions/Base";

import { ActionCreatorKeys } from "TaskGroup/Scripts/TaskGroupEditor/Constants";
import { TabActionsHub } from "TaskGroup/Scripts/TaskGroupEditor/TabContentContainer/TabActionsHub";
import { getErrorMessage } from "TaskGroup/Scripts/Utils/ErrorUtils";

export class TabActionCreator extends ActionCreatorBase {
    public static getKey(): string {
        return ActionCreatorKeys.TaskGroupTabActionCreator;
    }

    public initialize(instanceId?: string): void {
        this._tabActionsHub = ActionsHubManager.GetActionsHub<TabActionsHub>(TabActionsHub, instanceId);
    }

    public updateErrorMessage(error: any) {
        const errorMessage = getErrorMessage(error);
        if (!!error) {
            logError(error);
        }

        this._tabActionsHub.updateErrorMessage.invoke({
            errorMessage: errorMessage
        });
    }

    private _tabActionsHub: TabActionsHub;
}