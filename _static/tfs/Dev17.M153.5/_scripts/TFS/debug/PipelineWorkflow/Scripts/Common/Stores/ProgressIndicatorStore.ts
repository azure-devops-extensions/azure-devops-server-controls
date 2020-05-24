import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { StoreBase } from "DistributedTaskControls/Common/Stores/Base";

import { ProgressIndicatorActions } from "PipelineWorkflow/Scripts/Common/Actions/ProgressIndicatorActions";
import { CommonStoreKeys } from "PipelineWorkflow/Scripts/Common/Constants";

import * as Utils_Array from "VSS/Utils/Array";

export class ProgressIndicatorStore extends StoreBase {

    public static getKey(): string {
        return CommonStoreKeys.StoreKey_ProgressIndicatorStoreKey;
    }

    public initialize(instanceId: string): void {
        super.initialize(instanceId);
        this._inProgressActions = [];
        this._actions = ActionsHubManager.GetActionsHub<ProgressIndicatorActions>(ProgressIndicatorActions, instanceId);
        this._actions.actionStarted.addListener(this._handleActionStarted);
        this._actions.actionCompleted.addListener(this._handleActionCompleted);
    }

    public getState(): number {
        return this._actionsCount;
    }

    public hasAnyActionsInProgress(): boolean {
        return this._actionsCount > 0;
    }

    public isActionInProgress(actionName: string): boolean {
        return Utils_Array.contains(this._inProgressActions, actionName);
    }

    protected disposeInternal(): void {
        this._actions.actionStarted.removeListener(this._handleActionStarted);
        this._actions.actionCompleted.removeListener(this._handleActionCompleted);
    }

    private _handleActionStarted = (actionName: string) => {
        this._actionsCount++;
        this._inProgressActions.push(actionName);
        this.emitChanged();
    }

    private _handleActionCompleted = (actionName: string) => {
        if (this._actionsCount > 0) {
            this._actionsCount--;
        } else {
            this._actionsCount = 0;
        }
        Utils_Array.remove(this._inProgressActions, actionName);
        this.emitChanged();
    }

    private _actions: ProgressIndicatorActions;
    private _inProgressActions: string[];
    private _actionsCount: number = 0;
}
