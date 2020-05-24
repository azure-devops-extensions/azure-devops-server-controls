import * as ActionsBase from "DistributedTaskControls/Common/Actions/Base";
import { IInsertListItemData } from "DistributedTaskControls/Common/Types";
import {  DataStoreBase } from "DistributedTaskControls/Common/Stores/Base";

import { Action } from "VSS/Flux/Action";

export interface IActionRemoveRetentionPolicyPayload {
    policyId: string;

    // Indicates if this is a permanent removal 
    //  - Set to true when the user performs deletion of policy.
    //  - Set to false when the user performs drag and drop. Drag and drop is modeled as remove followed by insert.
    isPermanentRemoval: boolean;
}

export interface IInsertPolicyPayload {
    policyToInsert: DataStoreBase;
    targetPolicyInstanceId: string;
    shouldInsertBefore?: boolean;
}

export class RetentionPolicyListActions extends ActionsBase.ActionsHubBase {
    private _addRetentionPolicy: Action<ActionsBase.IEmptyActionPayload>;
    private _removeRetentionPolicy: Action<IActionRemoveRetentionPolicyPayload>;
    private _insertPolicy: ActionsBase.Action<IInsertPolicyPayload>;

    public initialize(): void {
        this._addRetentionPolicy = new Action<ActionsBase.IEmptyActionPayload>();
        this._removeRetentionPolicy = new Action<IActionRemoveRetentionPolicyPayload>();
        this._insertPolicy = new ActionsBase.Action<IInsertPolicyPayload>();
    }

    public static getKey(): string {
        return "CI.RetentionPolicyList";
    }

    public get addRetentionPolicy(): Action<ActionsBase.IEmptyActionPayload> {
        return this._addRetentionPolicy;
    }

    public get removeRetentionPolicy(): Action<IActionRemoveRetentionPolicyPayload> {
        return this._removeRetentionPolicy;
    }

    public get insertPolicy(): ActionsBase.Action<IInsertPolicyPayload> {
        return this._insertPolicy;
    }
}