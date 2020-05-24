import { ActionsHubBase, IEmptyActionPayload } from "DistributedTaskControls/Common/Actions/Base";

import { ActionsKeys } from "DistributedTaskControls/PlanGroupsQueue/Constants";
import { IPlanGroupsListPayload } from "DistributedTaskControls/PlanGroupsQueue/Types";

import { Action } from "VSS/Flux/Action";

export class PlanGroupsListActions extends ActionsHubBase {

    public initialize(): void {
        this._updatePlanGroupsList = new Action<IPlanGroupsListPayload>();
        this._dismissErrorMessage = new Action<IEmptyActionPayload>();
    }

    public static getKey(): string {
        return ActionsKeys.PlanGroupsListActions;
    }

    public get updatePlanGroupsList(): Action<IPlanGroupsListPayload> {
        return this._updatePlanGroupsList;
    }

    public get dismissErrorMessage(): Action<IEmptyActionPayload> {
        return this._dismissErrorMessage;
    }

    private _updatePlanGroupsList: Action<IPlanGroupsListPayload>;
    private _dismissErrorMessage: Action<IEmptyActionPayload>;
}