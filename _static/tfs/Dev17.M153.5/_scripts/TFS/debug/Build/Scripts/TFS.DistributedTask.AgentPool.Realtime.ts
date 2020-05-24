/// <reference types="jquery" />



import Q = require("q");

import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");

import SignalR = require("SignalR/Hubs");

import DistributedTask = require("TFS/DistributedTask/Contracts");

import Serialization = require("VSS/Serialization");
import VSS = require("VSS/VSS");
import VSS_Contracts_Platform = require("VSS/Common/Contracts/Platform");
import VSS_Events = require("VSS/Events/Services");
import Utils_Array = require("VSS/Utils/Array");

export class PoolEvents {
    public static AgentAdded: string = "TaskAgentPool.Realtime.AgentAdded";                                      // Fired when an agent is added to the pool
    public static AgentDeleted: string = "TaskAgentPool.Realtime.AgentDeleted";                                  // Fired when an agent is deleted from the pool
    public static AgentConnected: string = "TaskAgentPool.Realtime.AgentConnected";                              // Fired when an agent establishes a connection
    public static AgentDisconnected: string = "TaskAgentPool.Realtime.AgentDisconnected";                        // Fired when an agent loses its connection
    public static AgentUpdated: string = "TaskAgentPool.Realtime.AgentUpdated";                                  // Fired when an agent is updated
    public static AgentRequestQueued: string = "TaskAgentPool.Realtime.AgentRequestQueued";                      // Fired when an agent request is queued
    public static AgentRequestAssigned: string = "TaskAgentPool.Realtime.AgentRequestAssigned";                  // Fired when an agent is assigned a new request
    public static AgentRequestStarted: string = "TaskAgentPool.Realtime.AgentRequestStarted";                    // Fired when an agent starts/receives work for a request
    public static AgentRequestCompleted: string = "TaskAgentPool.Realtime.AgentRequestCompleted";                // Fired when an agent completes a request
    public static PoolMaintenanceQueued: string = "TaskAgentPool.Realtime.PoolMaintenanceQueued";                // Fired when an pool maintenance is queued
    public static PoolMaintenanceStarted: string = "TaskAgentPool.Realtime.PoolMaintenanceStarted";              // Fired when an pool maintenance is started
    public static PoolMaintenanceCompleted: string = "TaskAgentPool.Realtime.PoolMaintenanceCompleted";          // Fired when an pool maintenance is completed
    public static PoolMaintenanceDetailUpdated: string = "TaskAgentPool.Realtime.PoolMaintenanceDetailUpdated";  // Fired when an pool maintenance's detail is updated
}

/**
 * Manages a SignalR connection for distributed task pool and agent events
 */
export class TaskAgentPoolHub extends SignalR.Hub {
    private _eventManager: VSS_Events.EventService;
    private _poolIds: number[] = [];

    /**
     * Creates a new hub.
     * @param tfsContext The context used for the hub connection
     */
    constructor(tfsContext: TFS_Host_TfsContext.TfsContext) {
        super(
            TaskAgentPoolHub.getHostContext(tfsContext),
            TaskAgentPoolHub.getHostContext(tfsContext),
            'taskAgentPoolHub',
            null,
            { useSignalRAppPool: TaskAgentPoolHub.useSignalRAppPool(tfsContext) });
        this._eventManager = VSS_Events.getService();

        // Make sure to hook up to the events we care about on initialization
        this._initializeHub(this.hub);
    }

    /**
     * Called when an agent is added to the pool
     * @param agent The agent which has been added
     */
    public agentAdded(agent: DistributedTask.TaskAgent) {
        this._eventManager.fire(PoolEvents.AgentAdded, this, agent);
    }

    /**
     * Called when an agent is deleted from the subscribed pool
     * @param agent The agent identifier
     */
    public agentDeleted(agentId: number) {
        this._eventManager.fire(PoolEvents.AgentDeleted, this, agentId);
    }

    /**
     * Called when an agent connects to the server
     * @param agentId The agent identifier
     */
    public agentConnected(agentId: number) {
        this._eventManager.fire(PoolEvents.AgentConnected, this, agentId);
    }

    /**
     * Called when an agent disconnects to the server
     * @param agentId The agent identifier
     */
    public agentDisconnected(agentId: number) {
        this._eventManager.fire(PoolEvents.AgentDisconnected, this, agentId);
    }

    /**
     * Called when an agent is updated
     * @param agent The agent which has been updated
     */
    public agentUpdated(agent: DistributedTask.TaskAgent) {
        this._eventManager.fire(PoolEvents.AgentUpdated, this, agent);
    }

    /**
     * Called when an agent is assigned to an orchestration for running jobs
     */
    public agentRequestQueued(request: DistributedTask.TaskAgentJobRequest) {
        this._eventManager.fire(PoolEvents.AgentRequestQueued, this, request);
    }

    /**
     * Called when an agent is assigned to an orchestration for running jobs
     */
    public agentRequestAssigned(request: DistributedTask.TaskAgentJobRequest) {
        this._eventManager.fire(PoolEvents.AgentRequestAssigned, this, request);
    }

    /**
     * Called when an agent first receives work from an orchestration
     */
    public agentRequestStarted(request: DistributedTask.TaskAgentJobRequest) {
        this._eventManager.fire(PoolEvents.AgentRequestStarted, this, request);
    }

    /**
     * Called when an agent is unassigned from an orchestration
     */
    public agentRequestCompleted(request: DistributedTask.TaskAgentJobRequest) {
        this._eventManager.fire(PoolEvents.AgentRequestCompleted, this, request);
    }

    /**
     * Called when a pool maintenance job is queued
     */
    public poolMaintenanceQueued(maintenanceJob: DistributedTask.TaskAgentPoolMaintenanceJob) {
        this._eventManager.fire(PoolEvents.PoolMaintenanceQueued, this, maintenanceJob);
    }

    /**
     * Called when a pool maintenance job is running
     */
    public poolMaintenanceStarted(maintenanceJob: DistributedTask.TaskAgentPoolMaintenanceJob) {
        this._eventManager.fire(PoolEvents.PoolMaintenanceStarted, this, maintenanceJob);
    }

    /**
     * Called when a pool maintenance job is completed
     */
    public poolMaintenanceCompleted(maintenanceJob: DistributedTask.TaskAgentPoolMaintenanceJob) {
        this._eventManager.fire(PoolEvents.PoolMaintenanceCompleted, this, maintenanceJob);
    }

    /**
     * Called when a pool maintenance job detail is updated
     */
    public poolMaintenanceDetailUpdated(maintenanceJob: DistributedTask.TaskAgentPoolMaintenanceJob) {
        this._eventManager.fire(PoolEvents.PoolMaintenanceDetailUpdated, this, maintenanceJob);
    }

    /**
     * Unsubscribes from the hub and stops the underlying connection.
     */
    public stop(): void {
        this._poolIds = [];
        super.stop();
    }

    /**
     * Subscribes to the specified pool to receive events for agents and agent requests.
     * @param poolId The id of the pool to subscribe to
     * @param unSubscribeOtherPools Makes sure that only one pool is subscribed at a time, defaults to true
     */
    public subscribe(poolId: number, unSubscribeOtherPools: boolean = true): Q.Promise<any> {
        if (!Utils_Array.contains(this._poolIds, poolId)) {
            let promises: Q.Promise<any>[] = [];
            if (unSubscribeOtherPools) {
                this._poolIds.forEach((unSubscribingPoolId) => {
                    promises.push(this.unsubscribe(unSubscribingPoolId));
                });
            }

            return Q.all(promises).then(() => {
                return this._subscribe(poolId);
            });
        }
        else {
            // If we are already subscribed to the desired pool, do nothing
            return Q.resolve(null);
        }
    }

    /**
     * Unsubscribes from the specified pool to stop receiving events. The underlying connection is left open until
     * stop is called on the hub.
     * @param poolId The id of the pool to unsubscribe from
     */
    public unsubscribe(poolId: number): Q.Promise<any> {
        return Q(this.hub.server.unsubscribe(poolId)).then(() => {
            let index: number = this._poolIds.indexOf(poolId);
            if (index >= 0) {
                delete this._poolIds[index];
            }
        });
    }

    protected onReconnect(): Q.Promise<any> {
        let promises: Q.Promise<any>[] = [];
        if (this._poolIds.length > 0) {
            this._poolIds.forEach((poolId) => {
                promises.push(this.hub.server.subscribe(poolId));
            });
        }

        return Q.all(promises).then(() => {
            return super.onReconnect();
        });
    }

    private _initializeHub(hub: any): void {
        if (!hub) {
            return;
        }
        
        hub.client.notifyAgentAdded = (poolId: number, agent: DistributedTask.TaskAgent) => {
            if (Utils_Array.contains(this._poolIds, poolId)) {
                Serialization.ContractSerializer.deserialize(agent, DistributedTask.TypeInfo.TaskAgent, false);
                this.agentAdded(agent);
            }
        };

        hub.client.notifyAgentConnected = (poolId: number, agentId: number) => {
            if (Utils_Array.contains(this._poolIds, poolId)) {
                this.agentConnected(agentId);
            }
        };

        hub.client.notifyAgentDeleted = (poolId: number, agentId: number) => {
            if (Utils_Array.contains(this._poolIds, poolId)) {
                this.agentDeleted(agentId);
            }
        };

        hub.client.notifyAgentDisconnected = (poolId: number, agentId: number) => {
            if (Utils_Array.contains(this._poolIds, poolId)) {
                this.agentDisconnected(agentId);
            }
        };

        hub.client.notifyAgentUpdated = (poolId: number, agent: DistributedTask.TaskAgent) => {
            if (Utils_Array.contains(this._poolIds, poolId)) {
                Serialization.ContractSerializer.deserialize(agent, DistributedTask.TypeInfo.TaskAgent, false);
                this.agentUpdated(agent);
            }
        };

        hub.client.notifyAgentRequestQueued = (poolId: number, request: DistributedTask.TaskAgentJobRequest) => {
            if (Utils_Array.contains(this._poolIds, poolId)) {
                Serialization.ContractSerializer.deserialize(request, DistributedTask.TypeInfo.TaskAgentJobRequest, false);
                this.agentRequestQueued(request);
            }
        };

        hub.client.notifyAgentRequestAssigned = (poolId: number, request: DistributedTask.TaskAgentJobRequest) => {
            if (Utils_Array.contains(this._poolIds, poolId)) {
                Serialization.ContractSerializer.deserialize(request, DistributedTask.TypeInfo.TaskAgentJobRequest, false);
                this.agentRequestAssigned(request);
            }
        };

        hub.client.notifyAgentRequestStarted = (poolId: number, request: DistributedTask.TaskAgentJobRequest) => {
            if (Utils_Array.contains(this._poolIds, poolId)) {
                Serialization.ContractSerializer.deserialize(request, DistributedTask.TypeInfo.TaskAgentJobRequest, false);
                this.agentRequestStarted(request);
            }
        };

        hub.client.notifyAgentRequestCompleted = (poolId: number, request: DistributedTask.TaskAgentJobRequest) => {
            if (Utils_Array.contains(this._poolIds, poolId)) {
                Serialization.ContractSerializer.deserialize(request, DistributedTask.TypeInfo.TaskAgentJobRequest, false);
                this.agentRequestCompleted(request);
            }
        };

        hub.client.notifyPoolMaintenanceQueued = (poolId: number, maintenanceJob: DistributedTask.TaskAgentPoolMaintenanceJob) => {
            if (Utils_Array.contains(this._poolIds, poolId)) {
                Serialization.ContractSerializer.deserialize(maintenanceJob, DistributedTask.TypeInfo.TaskAgentPoolMaintenanceJob, false);
                this.poolMaintenanceQueued(maintenanceJob);
            }
        };

        hub.client.notifyPoolMaintenanceStarted = (poolId: number, maintenanceJob: DistributedTask.TaskAgentPoolMaintenanceJob) => {
            if (Utils_Array.contains(this._poolIds, poolId)) {
                Serialization.ContractSerializer.deserialize(maintenanceJob, DistributedTask.TypeInfo.TaskAgentPoolMaintenanceJob, false);
                this.poolMaintenanceStarted(maintenanceJob);
            }
        };

        hub.client.notifyPoolMaintenanceCompleted = (poolId: number, maintenanceJob: DistributedTask.TaskAgentPoolMaintenanceJob) => {
            if (Utils_Array.contains(this._poolIds, poolId)) {
                Serialization.ContractSerializer.deserialize(maintenanceJob, DistributedTask.TypeInfo.TaskAgentPoolMaintenanceJob, false);
                this.poolMaintenanceCompleted(maintenanceJob);
            }
        };

        hub.client.notifyPoolMaintenanceDetailUpdated = (poolId: number, maintenanceJob: DistributedTask.TaskAgentPoolMaintenanceJob) => {
            if (Utils_Array.contains(this._poolIds, poolId)) {
                Serialization.ContractSerializer.deserialize(maintenanceJob, DistributedTask.TypeInfo.TaskAgentPoolMaintenanceJob, false);
                this.poolMaintenanceDetailUpdated(maintenanceJob);
            }
        };
    }

    private _subscribe(poolId: number): Q.Promise<any> {
        return this.connection.start().then(() => {
            if (!Utils_Array.contains(this._poolIds, poolId)) {
                this._poolIds.push(poolId);
                this._poolIds = Utils_Array.unique(this._poolIds);
                return Q(this.hub.server.subscribe(poolId));
            }
        });
    }

    private static getHostContext(tfsContext: TFS_Host_TfsContext.TfsContext): VSS_Contracts_Platform.HostContext {
        var activeContext = tfsContext || TFS_Host_TfsContext.TfsContext.getDefault();
        return activeContext.contextData.collection;
    }
}

// TFS plugin model requires this call for each tfs module.
VSS.tfsModuleLoaded("TFS.DistributedTask.AgentPool.Realtime", exports);
