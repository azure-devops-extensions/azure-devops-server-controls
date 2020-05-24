import * as Q from "q";

import { TaskAgentRestClient as TaskAgentHttpClient } from "DistributedTaskControls/Clients/TaskAgentRestClient";
import { SourceBase } from "DistributedTaskControls/Common/Sources/SourceBase";
import { SourceManager } from "DistributedTaskControls/Common/Sources/SourceManager";
import { IDeploymentGroupsResult, IDeploymentTargetsResult } from "DistributedTaskControls/Common/Types";

import * as DistributedTaskContracts from "TFS/DistributedTask/Contracts";

import * as VSSContext from "VSS/Context";
import { VssConnection } from "VSS/Service";
import * as Utils_Array from "VSS/Utils/Array";


/**
 * @brief Source implementation for Tasks related communications with the server
 */
export class AgentsSource extends SourceBase {

    public static getKey(): string {
        return "AgentsSource";
    }

    public getTaskAgentClient(): TaskAgentHttpClient {
        if (!this._taskAgentClient) {
            this._taskAgentClient = this._getVssConnection().getHttpClient<TaskAgentHttpClient>(TaskAgentHttpClient);
        }

        return this._taskAgentClient;
    }

    public getPermissibleDeploymentGroups(
        forceRefresh: boolean = false,
        machineGroupName?: string,
        expand?: DistributedTaskContracts.DeploymentGroupExpands,
        continuationToken?: string,
        top?: number): IPromise<IDeploymentGroupsResult> {
        if (!this._getPermissibleDeploymentGroupsPromise || forceRefresh) {
            this._getPermissibleDeploymentGroupsPromise = this.getTaskAgentClient().getDeploymentGroupsWithContinuationToken(
                VSSContext.getDefaultWebContext().project.id,
                machineGroupName,
                DistributedTaskContracts.DeploymentGroupActionFilter.Use,
                DistributedTaskContracts.DeploymentGroupExpands.None,
                continuationToken,
                top
            );
        }

        return this._getPermissibleDeploymentGroupsPromise;
    }

    public getDeploymentGroupsByIds(
        forceRefresh: boolean = false,
        deploymentGroupIds?: number[]): IPromise<IDeploymentGroupsResult> {
        if (!this._getDeploymentGroupsByIdPromise || forceRefresh) {
            this._getDeploymentGroupsByIdPromise = this.getTaskAgentClient().getDeploymentGroupsWithContinuationToken(
                VSSContext.getDefaultWebContext().project.id,
                null,
                DistributedTaskContracts.DeploymentGroupActionFilter.None,
                DistributedTaskContracts.DeploymentGroupExpands.None,
                null,
                null,
                deploymentGroupIds
            );
        }

        return this._getDeploymentGroupsByIdPromise;
    }

    public getDeploymentGroupsByNameOrRegex(
        forceRefresh: boolean = false,
        machineGroupName?: string): IPromise<IDeploymentGroupsResult> {
        if (!this._getDeploymentGroupsByNameOrRegexPromise || forceRefresh) {
            this._getDeploymentGroupsByNameOrRegexPromise = this.getTaskAgentClient().getDeploymentGroupsWithContinuationToken(
                VSSContext.getDefaultWebContext().project.id,
                machineGroupName,
                DistributedTaskContracts.DeploymentGroupActionFilter.None,
                DistributedTaskContracts.DeploymentGroupExpands.None
            );
        }

        return this._getDeploymentGroupsByNameOrRegexPromise;
    }

    /**
     * It returns the queue from list of all queues irrespective of if user has permissions or not
     * @param queueId
     * @param forceRefresh 
     */
    public getTaskAgentQueue(queueId: number, forceRefresh: boolean = false): IPromise<DistributedTaskContracts.TaskAgentQueue> {
        let q = Q.defer<DistributedTaskContracts.TaskAgentQueue>();
        // Cached promise, if foreceRefresh then new promise is created.
        this.getTaskAgentQueues(forceRefresh).then(
            (queues: DistributedTaskContracts.TaskAgentQueue[]) => {
                let queue = this._getQueueDetailsIfPresent(queueId, queues);

                if (!queue) {
                    // If queue is null try fetching queue from all queues.
                    this.getAllAgentQueues(forceRefresh).then(
                        (queues: DistributedTaskContracts.TaskAgentQueue[]) => {
                            queue = this._getQueueDetailsIfPresent(queueId, queues);
                            // queue can be null if queue is deleted
                            return q.resolve(queue);
                        },
                        (error) => {
                            q.reject(error);
                        });
                } else {
                    return q.resolve(queue);
                }
            },
            (error) => {
                q.reject(error);
            });

        return q.promise;
    }

    public getTaskAgentQueues(forceRefresh: boolean = false): IPromise<DistributedTaskContracts.TaskAgentQueue[]> {
        if (!this._getTaskAgentQueuesPromise || forceRefresh) {
            this._getTaskAgentQueuesPromise = this.getTaskAgentClient().getAgentQueues(
                VSSContext.getDefaultWebContext().project.id,
                null,
                DistributedTaskContracts.TaskAgentQueueActionFilter.Use);
        }

        return this._getTaskAgentQueuesPromise;
    }

    public getAllAgentQueues(forceRefresh: boolean = false): IPromise<DistributedTaskContracts.TaskAgentQueue[]> {
        if (!this._getAllAgentQueuesPromise || forceRefresh) {
            this._getAllAgentQueuesPromise = this.getTaskAgentClient().getAgentQueues(VSSContext.getDefaultWebContext().project.id);
        }

        return this._getAllAgentQueuesPromise;
    }

    public getAgents(
        poolId: number,
        agentName?: string,
        includeCapabilities?: boolean,
        includeAssignedRequest?: boolean,
        propertyFilters?: string[],
        demands?: string[]): IPromise<DistributedTaskContracts.TaskAgent[]> {

        return this.getTaskAgentClient().getAgents(poolId, agentName, includeCapabilities, includeAssignedRequest, propertyFilters, demands);
    }

    public getAgentRequestsForPlan(poolId: number, planId: string): IPromise<DistributedTaskContracts.TaskAgentJobRequest[]> {
        const key: string = poolId + planId;
        if (!this._getAgentJobRequestsPoolPromise[key]) {
            this._getAgentJobRequestsPoolPromise[key] = this.getTaskAgentClient().getAgentRequestsForPlan(poolId, planId);
        }

        return this._getAgentJobRequestsPoolPromise[key];
    }

    public getResourceUsage(parallelismTag: string, isHostedPool: boolean, includeRunningRequests: boolean): IPromise<DistributedTaskContracts.ResourceUsage> {
        const key = parallelismTag + isHostedPool + includeRunningRequests;
        if (!this._getResourceUsagePromise[key]) {
            this._getResourceUsagePromise[key] = this.getTaskAgentClient().getResourceUsage(parallelismTag, isHostedPool, includeRunningRequests);
        }

        return this._getResourceUsagePromise[key];
    }

    public fetchJobRequestsForAgents(poolId: number, agentIds: number[]): IPromise<DistributedTaskContracts.TaskAgentJobRequest[]> {
        // No need to cache the call as we wanted to fetch latest agent requests for agents
        return this.getTaskAgentClient().getAgentRequestsForAgents(poolId, agentIds);
    }

    public getPermissibleDeploymentMachineGroups(forceRefresh: boolean = false, machineGroupName?: string): IPromise<DistributedTaskContracts.DeploymentMachineGroup[]> {
        if (!this._getDeploymentMachineGroupsPromise || forceRefresh) {
            this._getDeploymentMachineGroupsPromise = this.getTaskAgentClient().getDeploymentMachineGroups(
                VSSContext.getDefaultWebContext().project.id,
                machineGroupName,
                DistributedTaskContracts.MachineGroupActionFilter.Use);
        }

        return this._getDeploymentMachineGroupsPromise;
    }

    public getAllDeploymentMachineGroups(forceRefresh: boolean = false): IPromise<DistributedTaskContracts.DeploymentMachineGroup[]> {
        if (!this._getAllDeploymentMachineGroupsPromise || forceRefresh) {
            this._getAllDeploymentMachineGroupsPromise = this.getTaskAgentClient().getDeploymentMachineGroups(
                VSSContext.getDefaultWebContext().project.id);
        }

        return this._getAllDeploymentMachineGroupsPromise;
    }

    public getDeploymentMachineGroup(machineGroupId: number, forceRefresh: boolean = false): IPromise<DistributedTaskContracts.DeploymentMachineGroup> {
        if (forceRefresh || !this._getMachineGroupPromises.hasOwnProperty(machineGroupId)) {
            this._getMachineGroupPromises[machineGroupId] = this.getTaskAgentClient().getDeploymentMachineGroup(
                VSSContext.getDefaultWebContext().project.id, machineGroupId);
        }

        return this._getMachineGroupPromises[machineGroupId];
    }

    public getTaskAgentPools(forceRefresh: boolean = false): IPromise<DistributedTaskContracts.TaskAgentPool[]> {
        if (!this._getTaskAgentPoolPromise || forceRefresh) {
            this._getTaskAgentPoolPromise = this.getTaskAgentClient().getAgentPools(null, null, null, DistributedTaskContracts.TaskAgentPoolActionFilter.Use);
        }

        return this._getTaskAgentPoolPromise;
    }

    private _getQueueDetailsIfPresent(queueId: number, queues: DistributedTaskContracts.TaskAgentQueue[]): DistributedTaskContracts.TaskAgentQueue {
        let queueDetails: DistributedTaskContracts.TaskAgentQueue;

        if (queues && queues.length > 0) {
            queueDetails = Utils_Array.first(queues, (queue: DistributedTaskContracts.TaskAgentQueue) => {
                return queue.id === queueId;
            });
        }

        return queueDetails;
    }

    public getMachines(deploymentMachineGroupId: number, tagFilters?: string[], forceRefresh: boolean = false, name?: string, expand: DistributedTaskContracts.DeploymentMachineExpands = DistributedTaskContracts.DeploymentMachineExpands.None): IPromise<DistributedTaskContracts.DeploymentMachine[]> {
        if (!this._getDeploymentGroupDeploymentMachinesPromise || forceRefresh) {
            this._getDeploymentGroupDeploymentMachinesPromise = this.getTaskAgentClient().getDeploymentMachines(
                VSSContext.getDefaultWebContext().project.id,
                deploymentMachineGroupId,
                tagFilters,
                name,
                expand);
        }

        return this._getDeploymentGroupDeploymentMachinesPromise;
    }

    public getDeploymentTargetsWithContinuationToken(
        deploymentGroupId: number,
        tags?: string[],
        name?: string,
        partialNameMatch?: boolean,
        expand?: DistributedTaskContracts.DeploymentTargetExpands,
        agentStatus?: DistributedTaskContracts.TaskAgentStatusFilter,
        agentJobResult?: DistributedTaskContracts.TaskAgentJobResultFilter,
        continuationToken?: string,
        top?: number,
        enabled?: boolean,
        forceRefresh: boolean = false): IPromise<IDeploymentTargetsResult> {
        if (!this._getDeploymentGroupDeploymentTargetsPromise || forceRefresh) {
            this._getDeploymentGroupDeploymentTargetsPromise = this.getTaskAgentClient().getDeploymentTargetsWithContinuationToken(
                VSSContext.getDefaultWebContext().project.id,
                deploymentGroupId,
                tags,
                name,
                partialNameMatch,
                expand,
                agentStatus,
                agentJobResult,
                continuationToken,
                top,
                enabled);
        }

        return this._getDeploymentGroupDeploymentTargetsPromise;
    }

    // Get all deployment targets
    public getTargets(deploymentGroupId: number, tagFilters?: string[], enabled?: boolean): IPromise<DistributedTaskContracts.DeploymentMachine[]> {
        let targets: DistributedTaskContracts.DeploymentMachine[] = [];
        let deferred = Q.defer<DistributedTaskContracts.DeploymentMachine[]>();
        this._getTargetsRecursively(deploymentGroupId, tagFilters, null, enabled, targets).then((targets: DistributedTaskContracts.DeploymentMachine[]) => {
            deferred.resolve(targets);
        }, (error) => {
            deferred.reject(error);
        });

        return deferred.promise;
    }

    // Get deployment targets recursively
    private _getTargetsRecursively(deploymentGroupId: number, tagFilters?: string[], continuationToken?: string, enabled?: boolean, deploymentMachines?: DistributedTaskContracts.DeploymentMachine[]): IPromise<DistributedTaskContracts.DeploymentMachine[]> {
        let deferred = Q.defer<DistributedTaskContracts.DeploymentMachine[]>();
        AgentsSource.instance().getDeploymentTargetsWithContinuationToken(
            deploymentGroupId,
            tagFilters,
            null,
            false,
            DistributedTaskContracts.DeploymentTargetExpands.Capabilities,
            DistributedTaskContracts.TaskAgentStatusFilter.All,
            DistributedTaskContracts.TaskAgentJobResultFilter.All,
            continuationToken,
            this._defaultTargetsCount,
            enabled,
            true
        ).then(
            (deploymentTargetsResult: IDeploymentTargetsResult) => {
                if (deploymentTargetsResult.continuationToken) {
                    return deferred.resolve(this._getTargetsRecursively(deploymentGroupId, tagFilters, deploymentTargetsResult.continuationToken, enabled, Utils_Array.union(deploymentMachines, deploymentTargetsResult.deploymentTargets)));
                } else {
                    return deferred.resolve(Utils_Array.union(deploymentMachines, deploymentTargetsResult.deploymentTargets));
                }
            }, (error) => {
                deferred.reject(error);
            });
        return deferred.promise;
    }

    /**
     * @returns vssConnection object
     */
    private _getVssConnection(): VssConnection {
        if (!this._vssConnection) {
            this._vssConnection = new VssConnection(VSSContext.getDefaultWebContext());
        }
        return this._vssConnection;
    }

    public static instance(): AgentsSource {
        return SourceManager.getSource(AgentsSource);
    }

    private _vssConnection: VssConnection;
    private _taskAgentClient: TaskAgentHttpClient;
    private _getTaskAgentQueuesPromise: IPromise<DistributedTaskContracts.TaskAgentQueue[]>;
    private _getAllAgentQueuesPromise: IPromise<DistributedTaskContracts.TaskAgentQueue[]>;
    private _getTaskAgentPoolPromise: IPromise<DistributedTaskContracts.TaskAgentPool[]>;
    private _getDeploymentGroupDeploymentMachinesPromise: IPromise<DistributedTaskContracts.DeploymentMachine[]>;
    private _getDeploymentGroupDeploymentTargetsPromise: IPromise<IDeploymentTargetsResult>;
    private _getPermissibleDeploymentGroupsPromise: IPromise<IDeploymentGroupsResult>;
    private _getDeploymentGroupsByIdPromise: IPromise<IDeploymentGroupsResult>;
    private _getDeploymentGroupsByNameOrRegexPromise: IPromise<IDeploymentGroupsResult>;
    private _getDeploymentMachineGroupsPromise: IPromise<DistributedTaskContracts.DeploymentMachineGroup[]>;
    private _getAllDeploymentMachineGroupsPromise: IPromise<DistributedTaskContracts.DeploymentMachineGroup[]>;
    private _getMachineGroupPromises: IDictionaryNumberTo<IPromise<DistributedTaskContracts.DeploymentMachineGroup>> = {};
    private _getResourceUsagePromise: IDictionaryStringTo<IPromise<DistributedTaskContracts.ResourceUsage>> = {};
    private _getAgentJobRequestsPoolPromise: IDictionaryStringTo<IPromise<DistributedTaskContracts.TaskAgentJobRequest[]>> = {};
    private _defaultTargetsCount: number = 1000;
}