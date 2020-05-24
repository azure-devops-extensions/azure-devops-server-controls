import { TaskAgentPoolActions, IActionTaskAgentPoolMetadataPayload } from "DistributedTaskControls/Actions/TaskAgentPoolActions";
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { StoreKeys } from "DistributedTaskControls/Common/Common";
import * as StoreCommonBase from "DistributedTaskControls/Common/Stores/Base";
import * as Resources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";

import { TaskAgentPool } from "TFS/DistributedTask/Contracts";

export interface ITaskAgentPoolData {
    taskAgentPool: TaskAgentPool;
    taskAgentPoolMetadata: string;
}

export interface ITaskAgentPoolState {
    taskAgentPoolData: ITaskAgentPoolData[];
}

export interface ITaskAgentPoolStoreArgs {
}

export class TaskAgentPoolStore extends StoreCommonBase.ViewStoreBase {

    constructor(args: ITaskAgentPoolStoreArgs) {
        super();
        this._state = {
            taskAgentPoolData: []
        };
    }

    public static getKey(): string {
        return StoreKeys.TaskAgentPoolStore;
    }

    public initialize(instanceId?: string): void {
        super.initialize(instanceId);
        this._actionsHub = ActionsHubManager.GetActionsHub<TaskAgentPoolActions>(TaskAgentPoolActions, this.getInstanceId());
        this._actionsHub.getTaskAgentPool.addListener(this._getTaskAgentPoolListener);
        this._actionsHub.getTaskAgentPoolMetadata.addListener(this._getTaskAgentPoolMetadataListener);
    }

    protected disposeInternal(): void {
        this._actionsHub.getTaskAgentPool.removeListener(this._getTaskAgentPoolListener);
        this._actionsHub.getTaskAgentPoolMetadata.removeListener(this._getTaskAgentPoolMetadataListener);
    }

    public getTaskAgentPoolData(poolId: number): ITaskAgentPoolData {
        if (this._state.taskAgentPoolData[poolId] === undefined) {
            this._state.taskAgentPoolData[poolId] = {
                taskAgentPool: null,
                taskAgentPoolMetadata: null
            } as ITaskAgentPoolData;
        }

        return this._state.taskAgentPoolData[poolId];
    }

    public getState(): ITaskAgentPoolState {
        return this._state;
    }

    private _getTaskAgentPoolListener = (payload: TaskAgentPool) => {
        this._state.taskAgentPoolData[payload.id].taskAgentPool = payload;
        this.emitChanged();
    }

    private _getTaskAgentPoolMetadataListener = (payload: IActionTaskAgentPoolMetadataPayload) => {
        this._state.taskAgentPoolData[payload.poolId].taskAgentPoolMetadata = payload.metadata;
        this.emitChanged();
    }

    private _state: ITaskAgentPoolState;
    private _actionsHub: TaskAgentPoolActions;
}