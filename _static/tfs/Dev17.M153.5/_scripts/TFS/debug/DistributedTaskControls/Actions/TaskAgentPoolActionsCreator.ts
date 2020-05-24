import { TaskAgentPoolActions } from "DistributedTaskControls/Actions/TaskAgentPoolActions";
import { ActionCreatorBase } from "DistributedTaskControls/Common/Actions/Base";
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { ActionCreatorKeys } from "DistributedTaskControls/Common/Common";
import { PhaseCache } from "DistributedTaskControls/Phase/PhaseCache";
import { AgentsSource } from "DistributedTaskControls/Sources/AgentsSource";

import { TaskAgentPool } from "TFS/DistributedTask/Contracts";

export class TaskAgentPoolActionsCreator extends ActionCreatorBase {
    constructor() {
        super();
    }

    public static getKey(): string {
        return ActionCreatorKeys.TaskAgentPoolActionsCreator;
    }

    public initialize(instanceId?: string) {
        this._actions = ActionsHubManager.GetActionsHub<TaskAgentPoolActions>(TaskAgentPoolActions, instanceId);
    }

    public getTaskAgentPool(poolId: number) {
        AgentsSource.instance().getTaskAgentClient().getAgentPool(poolId).then((pool: TaskAgentPool) => {
            this._actions.getTaskAgentPool.invoke(pool);
        }, () => {
            this._actions.getTaskAgentPool.invoke(null);
        });
    }

    public getTaskAgentPoolMetadata(poolId: number) {
        AgentsSource.instance().getTaskAgentClient().getAgentPoolMetadata(poolId).then((poolMetadata: string) => {
            this._actions.getTaskAgentPoolMetadata.invoke({
                poolId: poolId,
                metadata: poolMetadata
            });
        }, () => {
            this._actions.getTaskAgentPoolMetadata.invoke({
                poolId: poolId,
                metadata: ""
            });
        });
    }

    private _actions: TaskAgentPoolActions;
}