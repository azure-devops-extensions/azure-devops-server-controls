import { AgentsActions } from "DistributedTaskControls/Actions/AgentsActions";
import { ActionCreatorBase } from "DistributedTaskControls/Common/Actions/Base";
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { ActionCreatorKeys } from "DistributedTaskControls/Common/Common";
import { PhaseCache } from "DistributedTaskControls/Phase/PhaseCache";
import { AgentsSource } from "DistributedTaskControls/Sources/AgentsSource";

import { TaskAgentQueue } from "TFS/DistributedTask/Contracts";

export class AgentsActionsCreator extends ActionCreatorBase {
    constructor() {
        super();
    }

    public static getKey(): string {
        return ActionCreatorKeys.AgentsActionsCreator;
    }

    public initialize(instanceId?: string) {
        this._actions = ActionsHubManager.GetActionsHub<AgentsActions>(AgentsActions, instanceId);
    }

    public updateAgentQueue(queueId: number) {
        return this._actions.updateAgentQueue.invoke(queueId);
    }

    public refreshAgentQueue(): void {
        AgentsSource.instance().getTaskAgentQueues(true).then((queues: TaskAgentQueue[]) => {
            this._actions.refreshAgentQueue.invoke(queues);
            PhaseCache.instance().updatePermissibleQueues(queues);
        });
    }

    public updateAgentsQueueSection(queueId: number, forceUpdate?: boolean) {
        AgentsSource.instance().getTaskAgentQueues().then((queues: TaskAgentQueue[]) => {
            let currentQueue = queues.filter((queue: TaskAgentQueue) => { return queue.id === queueId; })[0];
            let currentQueuePromise: IPromise<TaskAgentQueue> = currentQueue ? Promise.resolve(currentQueue) : AgentsSource.instance().getTaskAgentQueue(queueId);
            currentQueuePromise.then((currentQueue: TaskAgentQueue) => {
                this._actions.updateAgentsQueueSection.invoke({ queues: queues, agentQueueFromBuild: currentQueue, currentQueueId: queueId, forceUpdate: forceUpdate });
                PhaseCache.instance().updatePermissibleQueues(queues);
            });
        });
    }

    public manageAgentClicked(): void {
        this._actions.manageAgent.invoke({});
    }

    private _actions: AgentsActions;
}