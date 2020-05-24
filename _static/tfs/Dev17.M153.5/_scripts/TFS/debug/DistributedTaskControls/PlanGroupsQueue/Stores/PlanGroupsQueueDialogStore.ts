import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { StoreBase } from "DistributedTaskControls/Common/Stores/Base";

import { PlanGroupsQueueDialogActions } from "DistributedTaskControls/PlanGroupsQueue/Actions/PlanGroupsQueueDialogActions";
import { StoreKeys } from "DistributedTaskControls/PlanGroupsQueue/Constants";
import * as PlanGroupsTypes from "DistributedTaskControls/PlanGroupsQueue/Types";

import { PlanGroupStatus } from "TFS/DistributedTask/Contracts";

import * as StringUtils from "VSS/Utils/String";

export class PlanGroupsQueueDialogStore extends StoreBase {

    constructor(private _options: PlanGroupsTypes.IPlanGroupsQueueDialogOptions) {
        super();
        this._initializeOptions();
    }

    public static getKey(): string {
        return StoreKeys.PlanGroupsQueueDialogStore;
    }

    public initialize(): void {
        this._actions = ActionsHubManager.GetActionsHub<PlanGroupsQueueDialogActions>(PlanGroupsQueueDialogActions);
        this._actions.hidePlanGroupsQueueDialog.addListener(this._handlePlanGroupsQueueDialogHide);
        this._actions.dismissErrorMessage.addListener(this._handleDismissErrorMessage);
    }

    protected disposeInternal(): void {
        this._actions.hidePlanGroupsQueueDialog.removeListener(this._handlePlanGroupsQueueDialogHide);
        this._actions.dismissErrorMessage.removeListener(this._handleDismissErrorMessage);
    }

    public getState(): PlanGroupsTypes.IPlanGroupsQueueDialogState {
        return this._state;
    }

    private _initializeOptions(): void {
        this._state = {} as PlanGroupsTypes.IPlanGroupsQueueDialogState;
        this._setStateData({ ...this._options, errorMessage: StringUtils.empty });
    }

    private _handlePlanGroupsQueueDialogHide = (): void => {
        this._setStateData({ ...this._state, showDialog: false });
    }

    private _handleDismissErrorMessage = (): void => {
        this._setStateData({ ...this._state, errorMessage: StringUtils.empty });
    }

    private _setStateData(newState: PlanGroupsTypes.IPlanGroupsQueueDialogState): void {
        this._state = { ...newState };
        this._state.showDialog = newState.showDialog || false;
        this._state.selectedStatus = !!newState.selectedStatus ? newState.selectedStatus : PlanGroupStatus.Running;
        this._state.errorMessage = !!newState.errorMessage ? newState.errorMessage : StringUtils.empty;

        this.emitChanged();
    }

    private _actions: PlanGroupsQueueDialogActions;
    private _state: PlanGroupsTypes.IPlanGroupsQueueDialogState;
}
