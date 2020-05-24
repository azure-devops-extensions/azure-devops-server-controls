import { Action } from "VSS/Flux/Action";

import { ActionsHubBase } from "DistributedTaskControls/Common/Actions/Base";
import { ActionsKeys } from "DistributedTaskControls/Common/Common";

import { TaskAgentPool } from "TFS/DistributedTask/Contracts";

export interface IActionTaskAgentPoolMetadataPayload {
    poolId: number;
    metadata: string;
}

export class TaskAgentPoolActions extends ActionsHubBase {

    public initialize(): void {
        this._getTaskAgentPool = new Action<TaskAgentPool>();
        this._getTaskAgentPoolMetadata = new Action<IActionTaskAgentPoolMetadataPayload>();
    }

    public static getKey(): string {
        return ActionsKeys.TaskAgentPoolActions;
    }

    public get getTaskAgentPool(): Action<TaskAgentPool> {
        return this._getTaskAgentPool;
    }

    public get getTaskAgentPoolMetadata(): Action<IActionTaskAgentPoolMetadataPayload> {
        return this._getTaskAgentPoolMetadata;
    }

    private _getTaskAgentPool: Action<TaskAgentPool>;
    private _getTaskAgentPoolMetadata: Action<IActionTaskAgentPoolMetadataPayload>;
}