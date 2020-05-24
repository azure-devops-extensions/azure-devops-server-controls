import { IActionRemoveRetentionPolicyPayload, RetentionPolicyListActions, IInsertPolicyPayload } from "CIWorkflow/Scripts/Scenarios/Definition/Actions/RetentionPolicyListActions";
import { ActionCreatorKeys } from "CIWorkflow/Scripts/Scenarios/Definition/Common";

import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import * as ActionsBase from "DistributedTaskControls/Common/Actions/Base";
import { IInsertListItemData } from "DistributedTaskControls/Common/Types";

export class RetentionPolicyListActionsCreator extends ActionsBase.ActionCreatorBase {
    private _actions: RetentionPolicyListActions;

    constructor() {
        super();
    }

    public static getKey(): string {
        return ActionCreatorKeys.RetentionPolicyList_ActionCreator;
    }

    public initialize(instanceId: string): void {
        this._actions = ActionsHubManager.GetActionsHub<RetentionPolicyListActions>(RetentionPolicyListActions, instanceId);
    }

    public addRetentionPolicy() {
        this._actions.addRetentionPolicy.invoke(null);
    }

    public removeRetentionPolicy(policyId: string, isPermanentRemoval: boolean = true): void {
        this._actions.removeRetentionPolicy.invoke({
            policyId: policyId,
            isPermanentRemoval: isPermanentRemoval
        } as IActionRemoveRetentionPolicyPayload);
    }

    public insertPolicy(insertData: IInsertPolicyPayload): void {
        this._actions.insertPolicy.invoke(insertData);
    }
}
