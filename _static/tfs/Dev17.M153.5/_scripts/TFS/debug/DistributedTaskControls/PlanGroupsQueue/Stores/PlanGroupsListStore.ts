import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { StoreBase } from "DistributedTaskControls/Common/Stores/Base";
import { DateTimeUtilities } from "DistributedTaskControls/Common/DateTimeUtilities";

import { PlanGroupsListActions } from "DistributedTaskControls/PlanGroupsQueue/Actions/PlanGroupsListActions";
import { StoreKeys } from "DistributedTaskControls/PlanGroupsQueue/Constants";
import * as PlanGroupsTypes from "DistributedTaskControls/PlanGroupsQueue/Types";

import { PlanGroupStatus, TaskOrchestrationQueuedPlanGroup } from "TFS/DistributedTask/Contracts";

import * as DateUtils from "VSS/Utils/Date";
import * as StringUtils from "VSS/Utils/String";

export class PlanGroupsListStore extends StoreBase {

    constructor(private _options: PlanGroupsTypes.IPlanGroupsListState) {
        super();
        this._initializeOptions();
    }

    public static getKey(): string {
        return StoreKeys.PlanGroupsListStore;
    }

    public initialize(): void {
        this._actions = ActionsHubManager.GetActionsHub<PlanGroupsListActions>(PlanGroupsListActions);
        this._actions.updatePlanGroupsList.addListener(this._handlePlanGroupsListUpdate);
        this._actions.dismissErrorMessage.addListener(this._handleDismissErrorMessage);
    }

    protected disposeInternal(): void {
        this._actions.updatePlanGroupsList.removeListener(this._handlePlanGroupsListUpdate);
        this._actions.dismissErrorMessage.removeListener(this._handleDismissErrorMessage);
    }

    public getState(): PlanGroupsTypes.IPlanGroupsListState {
        return this._state;
    }

    private _initializeOptions(): void {
        this._state = {} as PlanGroupsTypes.IPlanGroupsListState;
        this._setStateData({ ...this._options, planGroupItems: [] });
    }

    private _handlePlanGroupsListUpdate = (payload: PlanGroupsTypes.IPlanGroupsListPayload) => {
        this._setStateData({ ...payload });
    }

    private _handleDismissErrorMessage = (): void => {
        this._setStateData({ ...this._state, errorMessage: StringUtils.empty });
    }

    private _setStateData(newState: PlanGroupsTypes.IPlanGroupsListState): void {
        this._state = { ...newState };
        this._state.status = !!newState.status ? newState.status : PlanGroupStatus.Running;
        this._state.errorMessage = !!newState.errorMessage ? newState.errorMessage : StringUtils.empty;

        if (!!newState.planGroupItems && newState.planGroupItems.length > 0) {
            this._state.planGroupItems = newState.planGroupItems.map((planGroupItem: PlanGroupsTypes.IQueuedPlanGroupItem) => {
                let queueTime: Date = planGroupItem.plans.sort((a, b) => { return DateUtils.defaultComparer(a.queueTime, b.queueTime); })[0].queueTime;
                let assignTime = planGroupItem.plans.sort((a, b) => { return DateUtils.defaultComparer(a.assignTime, b.assignTime); })[0].assignTime;
                planGroupItem.queuePosition = planGroupItem.queuePosition + 1;

                return {
                    ...planGroupItem,
                    queueTimeText: this._getAgoText(queueTime),
                    startedTimeText: this._getAgoText(assignTime),
                    durationText: this._getDateDiffText(assignTime, queueTime)
                } as PlanGroupsTypes.IQueuedPlanGroupItem;
            });
        }
        else {
            this._state.planGroupItems = [];
        }

        this.emitChanged();
    }

    private _getAgoText(dateTime: Date): string {
        return dateTime == null ? StringUtils.empty : DateUtils.ago(dateTime);
    }

    private _getDateDiffText(latestDate: Date, pastDate: Date): string {
        return (latestDate == null || pastDate == null) ? StringUtils.empty : DateTimeUtilities.getDateDiffFriendlyString(latestDate, pastDate);
    }

    private _actions: PlanGroupsListActions;
    private _state: PlanGroupsTypes.IPlanGroupsListState;
}
