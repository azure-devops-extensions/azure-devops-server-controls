import { AgentsActions, IActionQueuesPayload, IActionEditDefintionQueuesPayload } from "DistributedTaskControls/Actions/AgentsActions";
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { StoreKeys, MaxPositiveNumber, InputState } from "DistributedTaskControls/Common/Common";
import * as StoreCommonBase from "DistributedTaskControls/Common/Stores/Base";
import { UrlUtilities } from "DistributedTaskControls/Common/UrlUtilities";
import { DtcUtils } from "DistributedTaskControls/Common/Utilities";
import * as Resources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";

import * as TaskUtils from "DistributedTasksCommon/TFS.Tasks.Utils";

import { TaskAgentQueue, TaskAgentPoolReference } from "TFS/DistributedTask/Contracts";

import * as VssContext from "VSS/Context";
import * as EventsAction from "VSS/Events/Action";
import Utils_Array = require("VSS/Utils/Array");
import Utils_String = require("VSS/Utils/String");

export interface IAgentsState {
    defaultQueueId: number;
    queues: TaskAgentQueue[];
}

export interface IAgentsStoreArgs {
    defaultQueueId?: number;
    permissibleQueues?: TaskAgentQueue[];
    allQueues?: TaskAgentQueue[];
    allowInheritAgentQueue?: boolean;
    hideQueues?: boolean;
}

export class AgentsStore extends StoreCommonBase.ChangeTrackerStoreBase {

    constructor(args: IAgentsStoreArgs) {
        super();
        this._allowInheritAgentQueue = args.allowInheritAgentQueue;
        this._initializeState();
        this._originalAgentQueue = null;
        this._areAgentQueuesInitialized = false;
        this._hideQueues = args.hideQueues;
        if (!!args.defaultQueueId) {
            this._originalAgentsState.defaultQueueId = args.defaultQueueId;
            this._agentsState.defaultQueueId = args.defaultQueueId;
        }
        if (args.permissibleQueues || args.allQueues) {
            this._initializeQueues({ permissibleQueues: args.permissibleQueues, allQueues: args.allQueues });
            this._originalAgentsState.defaultQueueId = this._agentsState.defaultQueueId;
        }
    }

    public static getKey(): string {
        return StoreKeys.AgentsStore;
    }

    public initialize(instanceId?: string): void {
        super.initialize(instanceId);
        this._actionsHub = ActionsHubManager.GetActionsHub<AgentsActions>(AgentsActions, instanceId);
        this._actionsHub.createAgentsQueueSection.addListener(this._createAgentsQueueSection);
        this._actionsHub.updateAgentsQueueSection.addListener(this._updateAgentsQueueSection);
        this._actionsHub.updateAgentQueue.addListener(this._updateAgentQueue);
        this._actionsHub.refreshAgentQueue.addListener(this._refreshAgentQueue);
        this._actionsHub.manageAgent.addListener(this._manageAgentClicked);
        this._actionsHub.initializeAgentQueues.addListener(this._initializeAgentQueues);
    }

    protected disposeInternal(): void {
        this._actionsHub.createAgentsQueueSection.removeListener(this._createAgentsQueueSection);
        this._actionsHub.updateAgentsQueueSection.removeListener(this._updateAgentsQueueSection);
        this._actionsHub.updateAgentQueue.removeListener(this._updateAgentQueue);
        this._actionsHub.refreshAgentQueue.removeListener(this._refreshAgentQueue);
        this._actionsHub.manageAgent.removeListener(this._manageAgentClicked);
        this._actionsHub.initializeAgentQueues.removeListener(this._initializeAgentQueues);
    }

    public getTaskAgentQueues(): TaskAgentQueue[] {
        return this._agentsState.queues;
    }

    public isDirty(): boolean {
        return (this._originalAgentsState.defaultQueueId !== this._agentsState.defaultQueueId);
    }

    public isValid(): boolean {
        // If agent queues are not initialized, we return true since we can't validate. This is consistent with the old behavior
        if (!this._areAgentQueuesInitialized) {
            return true;
        }
        else {
            return this._agentsState.queues.some(e => e.id === this._agentsState.defaultQueueId);
        }
    }

    public getState(): IAgentsState {
        return this._agentsState;
    }

    private _initializeState(): void {
        this._agentsState = this._getDefaultAgentState();
        this._originalAgentsState = this._getDefaultAgentState();
    }

    private _getDefaultAgentState(): IAgentsState {
        let queues: TaskAgentQueue[] = [];
        if (this._allowInheritAgentQueue) {
            queues.push(<TaskAgentQueue>{
                id: 0,
                name: Resources.InheritAgentQueueFromDefinition
            });
        }

        return <IAgentsState>{
            queues: queues,
            defaultQueueId: 0
        };
    }

    private _manageAgentClicked = () => {
        let actionUrl: string = TaskUtils.ActionUrlResolver.getActionUrl(null, null, "AgentQueue", { project: VssContext.getDefaultWebContext().project.name, area: "admin", queueId: this._agentsState.defaultQueueId, _a: "agents" });
        UrlUtilities.openInNewWindow(actionUrl, true);

        this.emitChanged();
    }

    private _updateAgentQueue = (queueId: number) => {
        this._agentsState.defaultQueueId = queueId;

        this.emitChanged();
    }

    public getSelectedQueue(): TaskAgentQueue {
        let selectedQueue: TaskAgentQueue = Utils_Array.first(this._agentsState.queues, (queue: TaskAgentQueue) => {
            return queue.id === this._agentsState.defaultQueueId;
        });
        return selectedQueue;
    }

    private _createAgentsQueueSection = (payload: IActionQueuesPayload) => {
        this._createUpdateAgentsQueueSection(payload);
        this.emitChanged();
    }

    private _updateAgentsQueueSection = (payload: IActionQueuesPayload) => {
        this._createUpdateAgentsQueueSection(payload);

        //There is no need to update the UI after save, hence emitChanged need not be called after save definition
        // However in create/revert definition the UI should be updated.
        if (payload.forceUpdate) {
            this.emitChanged();
        }
    }

    private _createUpdateAgentsQueueSection(payload: IActionQueuesPayload): void {
        const processDefaultInvalidQueueId = 0;
        const phaseDefaultInvaliQueueId = -1;

        this._areAgentQueuesInitialized = true;
        // Null handling for Queues here
        let agentQueues = payload.queues ? AgentUtils.createTaskAgentQueueCopy(payload.queues) : [];

        if (payload.agentQueueFromBuild && payload.agentQueueFromBuild.name) {
            // Filling up the original & current State default queue id
            this._originalAgentsState.defaultQueueId = payload.agentQueueFromBuild.id;
            this._agentsState.defaultQueueId = payload.agentQueueFromBuild.id;

            this._originalAgentQueue = AgentUtils.createBuildTypeAgentCopy(payload.agentQueueFromBuild);
            this._ensureQueue(agentQueues, payload.agentQueueFromBuild);
        }
        else {
            // unset the queue
            // For definition level we will use the default invalid QueueId to 0
            this._agentsState.defaultQueueId = processDefaultInvalidQueueId;

            if (this._allowInheritAgentQueue) {
                // If currentQueueId is set to 0, <inherit from definition>, we wont be able to find agentQueueFromBuild and we wont run if part.
                // In this case reset defaultQueueId = 0 for both states
                if (payload.currentQueueId === 0) {
                    this._agentsState.defaultQueueId = 0;
                    this._originalAgentsState.defaultQueueId = 0;
                }
                // for phase level, default invalid QueueId 0 is reserved for <inherit from definition> option so we will use -1.
                else {
                    this._agentsState.defaultQueueId = phaseDefaultInvaliQueueId;
                    this._originalAgentsState.defaultQueueId = phaseDefaultInvaliQueueId;
                }
            }
        }

        // Filling Data in queues
        this._setQueueList(agentQueues);
    }

    private _ensureQueue(queues: TaskAgentQueue[], existingQueue: TaskAgentQueue): void {
        // For the deleted queue case, defaultQueue will be null, so we won't insert it into the list of queues.
        if (existingQueue) {
            let configuredQueue = Utils_Array.first(queues, (queue: TaskAgentQueue) => {
                return queue.id === existingQueue.id;
            });

            // Just because the queue isn't returned in the list doesn't mean we shouldn't include it in the
            // drop-down if we have the information. This can occur because the queue configured on the definition
            // is not 'use'-able by the user making this call.
            if (!configuredQueue) {
                queues.push(existingQueue);
            }
        }
    }

    private _refreshAgentQueue = (refreshedQueues: TaskAgentQueue[]) => {
        this._setAgentQueues(refreshedQueues);
        this.emitChanged();
    }

    private _initializeAgentQueues = (payload: IActionEditDefintionQueuesPayload) => {
        let queueId = this._initializeQueues(payload);

        // If the queueId has changed then only propogate the change
        // This is make sure we dont emit change in case nothing changes.
        if (queueId <= 0 || queueId !== this._agentsState.defaultQueueId) {
            this.emitChanged();
        }
    }

    private _initializeQueues = (payload: IActionEditDefintionQueuesPayload): number => {
        let queueId = this._agentsState.defaultQueueId;
        let queues: TaskAgentQueue[] = payload.permissibleQueues;

        // Check if default queue is present under queue list for which user has permission. If it is not there then get
        //  details from all queue list. We want to append default queue into the permissible queue list, this is to handle
        // case where some other user has created the definition and other user is opening the definition and not having permission
        // on the agent saved with the definition
        let defaultQueue = this._getQueueDetailsIfPresent(queueId, payload.permissibleQueues);
        if (!defaultQueue) {
            defaultQueue = this._getQueueDetailsIfPresent(queueId, payload.allQueues);
            if (defaultQueue) {
                queues.push(defaultQueue);
            }
        }

        this._setAgentQueues(queues);

        return queueId;
    }

    private _getQueueDetailsIfPresent(queueId: number, queues: TaskAgentQueue[]): TaskAgentQueue {
        let queueDetails: TaskAgentQueue = null;
        if (queues) {
            for (let queue of queues) {
                if (queue && queue.id === queueId) {
                    queueDetails = queue;
                    break;
                }
            }
        }

        return queueDetails;
    }

    private _setAgentQueues(queues: TaskAgentQueue[]) {
        this._areAgentQueuesInitialized = true;
        let payloadQueues: TaskAgentQueue[] = queues ? AgentUtils.createTaskAgentQueueCopy(queues) : [];

        // If this._originalAgentQueue is null and this._agentsState.defaultQueueId is set, it means, we are getting the queueList for the first time
        if (this._originalAgentQueue === null && this._agentsState.defaultQueueId > 0) {
            this._originalAgentQueue = payloadQueues.filter(e => e.id === this._agentsState.defaultQueueId)[0];
        }

        if (!!this._originalAgentQueue) {
            this._agentsState.defaultQueueId = this._originalAgentQueue.id;
        }
        else {
            // set an invalid id
            this._agentsState.defaultQueueId = 0;
        }

        this._ensureQueue(payloadQueues, this._originalAgentQueue);
        this._setQueueList(payloadQueues);
    }

    private _setQueueList(queues: TaskAgentQueue[]): void {
        if (this._allowInheritAgentQueue) {
            let inheritOption = <TaskAgentQueue>{
                id: 0,
                name: Resources.InheritAgentQueueFromDefinition
            };

            if (this._hideQueues) {
                queues = [inheritOption];
            }
            else {
                queues.push(inheritOption);
            }
        }

        // Make sure the queues are consistently sorted for UI display
        queues.sort((a: TaskAgentQueue, b: TaskAgentQueue) => {
            return Utils_String.localeIgnoreCaseComparer(a.name, b.name);
        });

        // Set the queue list
        this._agentsState.queues = queues;
    }

    private _areAgentQueuesInitialized: boolean;
    private _agentsState: IAgentsState;
    private _originalAgentQueue: TaskAgentQueue;
    private _originalAgentsState: IAgentsState;
    private _actionsHub: AgentsActions;
    private _allowInheritAgentQueue: boolean;
    private _hideQueues: boolean;
}

export class AgentUtils {

    /**
     * @brief Creates a copy of agentQueue instance object
     * @param agentInstance
     */
    public static createBuildTypeAgentCopy(agentInstance: TaskAgentQueue): TaskAgentQueue {
        let agentQueue: TaskAgentQueue = <TaskAgentQueue>{
            id: agentInstance.id,
            name: agentInstance.name
        };
        if (agentInstance.pool) {
            agentQueue.pool = <TaskAgentPoolReference>{
                id: agentInstance.pool.id,
                name: agentInstance.pool.name
            };
        }
        return agentQueue;
    }

    public static createTaskAgentQueueCopy(agents: TaskAgentQueue[]): TaskAgentQueue[] {
        let agentCopy: TaskAgentQueue[] = [];
        agents.forEach((agent: TaskAgentQueue) => {
            let agentQueue: TaskAgentQueue = <TaskAgentQueue>{
                id: agent.id,
                name: agent.name,
                projectId: agent.projectId
            };

            if (agent.pool) {
                agentQueue.pool = {
                    id: agent.pool.id,
                    isHosted: agent.pool.isHosted,
                    name: agent.pool.name,
                    poolType: agent.pool.poolType,
                    scope: agent.pool.scope,
                    size: agent.pool.size
                };
            }
            agentCopy.push(agentQueue);
        });
        return agentCopy;
    }
}