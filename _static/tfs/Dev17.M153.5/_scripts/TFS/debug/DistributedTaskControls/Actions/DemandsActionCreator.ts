
import { DemandsActions } from "DistributedTaskControls/Actions/DemandsActions";
import { ActionCreatorBase } from "DistributedTaskControls/Common/Actions/Base";
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { ActionCreatorKeys } from "DistributedTaskControls/Common/Common";

export class DemandsActionsCreator extends ActionCreatorBase {
    constructor() {
        super();
    }

    public static getKey(): string {
        return ActionCreatorKeys.DemandActionsCreator;
    }

    public initialize(instanceId: string) {
        this._actions = ActionsHubManager.GetActionsHub<DemandsActions>(DemandsActions, instanceId);
    }
    
    public updateDemandCondition(index: number, condition: string) {
        return this._actions.updateDemandCondition.invoke({
            index: index,
            condition: condition
        });
    }

    public updateDemandValue(index: number, value: string) {
        return this._actions.updateDemandValue.invoke({
            index: index,
            value: value
        });
    }

    public updateDemandKey(index: number, key: string) {
        return this._actions.updateDemandKey.invoke({
            index: index,
            key: key
        });
    }

    public deleteDemand(index: number, key: string) {
        return this._actions.deleteDemand.invoke({
            index: index,
            key: key
        });
    }

    public addDemand(): void {
        return this._actions.addDemand.invoke({});
    }

    private _actions: DemandsActions;
}