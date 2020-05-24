
import { ActionCreatorBase } from "DistributedTaskControls/Common/Actions/Base";
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { ActionCreatorKeys } from "DistributedTaskControls/Common/Common";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { LoadableComponentActionsHub } from "DistributedTaskControls/SharedControls/LoadableComponent/LoadableComponentActionsHub";
import { LoadableComponentStore } from "DistributedTaskControls/SharedControls/LoadableComponent/LoadableComponentStore";

export class LoadableComponentActionsCreator extends ActionCreatorBase {
    constructor() {
        super();
    }

    public static getKey(): string {
        return ActionCreatorKeys.LoadableComponentActionsCreator;
    }

    public initialize(instanceId?: string) {
        StoreManager.GetStore<LoadableComponentStore>(LoadableComponentStore, instanceId);
        this._actions = ActionsHubManager.GetActionsHub<LoadableComponentActionsHub>(LoadableComponentActionsHub, instanceId);
    }

    public showLoadingExperience(): void {
        this._actions.showLoadingExperience.invoke({});
    }

    public hideLoadingExperience(): void {
        this._actions.hideLoadingExperience.invoke({});
    }

    private _actions: LoadableComponentActionsHub;
}