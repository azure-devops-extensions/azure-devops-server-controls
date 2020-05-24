import { Action } from "VSS/Flux/Action";

import { ActionsHubBase, IEmptyActionPayload } from "DistributedTaskControls/Common/Actions/Base";
import { ActionsKeys } from "DistributedTaskControls/Common/Common";

import { TaskAgentQueue } from "TFS/DistributedTask/Contracts";

export interface IActionQueuesPayload {
    agentQueueFromBuild: TaskAgentQueue;
    queues: TaskAgentQueue[];
    currentQueueId?: number;
    forceUpdate?: boolean;
}

export interface IActionEditDefintionQueuesPayload {
    permissibleQueues: TaskAgentQueue[];
    allQueues: TaskAgentQueue[];
}

export class AgentsActions extends ActionsHubBase {

    public initialize(): void {
        this._createAgentsQueueSection = new Action<IActionQueuesPayload>();
        this._updateAgentsQueueSection = new Action<IActionQueuesPayload>();
        this._updateAgentQueue = new Action<number>();
        this._refreshAgentQueue = new Action<TaskAgentQueue[]>();
        this._manageAgent = new Action<IEmptyActionPayload>();
        this._initializeAgentQueues = new Action<IActionEditDefintionQueuesPayload>();
    }

    public static getKey(): string {
        return ActionsKeys.AgentsActions;
    }

    public get manageAgent(): Action<IEmptyActionPayload> {
        return this._manageAgent;
    }

    public get createAgentsQueueSection(): Action<IActionQueuesPayload> {
        return this._createAgentsQueueSection;
    }

    public get updateAgentsQueueSection(): Action<IActionQueuesPayload> {
        return this._updateAgentsQueueSection;
    }

    public get updateAgentQueue(): Action<number> {
        return this._updateAgentQueue;
    }

    public get refreshAgentQueue(): Action<TaskAgentQueue[]> {
        return this._refreshAgentQueue;
    }

    public get initializeAgentQueues(): Action<IActionEditDefintionQueuesPayload> {
        return this._initializeAgentQueues;
    }

    private _createAgentsQueueSection: Action<IActionQueuesPayload>;
    private _updateAgentsQueueSection: Action<IActionQueuesPayload>;
    private _updateAgentQueue: Action<number>;
    private _refreshAgentQueue: Action<TaskAgentQueue[]>;
    private _initializeAgentQueues: Action<IActionEditDefintionQueuesPayload>;
    private _manageAgent: Action<IEmptyActionPayload>;
}