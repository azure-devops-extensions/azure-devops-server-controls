import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import * as ActionsBase from "DistributedTaskControls/Common/Actions/Base";
import { AgentsSource } from "DistributedTaskControls/Sources/AgentsSource";

import { AgentSignalRManager } from "PipelineWorkflow/Scripts/ReleaseProgress/JobRequests/AgentSignalRManager";
import { CommonConstants, ReleaseProgressActionCreatorKeys } from "PipelineWorkflow/Scripts/ReleaseProgress/Constants";
import { JobRequestsActions } from "PipelineWorkflow/Scripts/ReleaseProgress/JobRequests/JobRequestsActions";

import { ResourceUsage, TaskAgent, TaskAgentJobRequest, TaskAgentQueue } from "TFS/DistributedTask/Contracts";

import * as Diag from "VSS/Diag";
import * as Utils_Array from "VSS/Utils/Array";
import * as Utils_String from "VSS/Utils/String";

export class JobRequestsActionsCreator extends ActionsBase.ActionCreatorBase {

    public static getKey(): string {
        return ReleaseProgressActionCreatorKeys.JobRequestsActionCreator;
    }

    public initialize(instanceId?: string): void {
        this._jobRequestsActions = ActionsHubManager.GetActionsHub<JobRequestsActions>(JobRequestsActions, instanceId);
    }

    public agentUpdated(agent: TaskAgent): void {
        this._jobRequestsActions.agentUpdated.invoke(agent);
    }

    public requestAssigned(request: TaskAgentJobRequest): void {
        this._jobRequestsActions.requestAssigned.invoke(request);
    }

    public requestCompleted(request: TaskAgentJobRequest): void {
        this._jobRequestsActions.requestCompleted.invoke(request);
    }

    public requestQueued(request: TaskAgentJobRequest): void {
        this._jobRequestsActions.requestQueued.invoke(request);
    }

    public requestStarted(request: TaskAgentJobRequest): void {
        this._jobRequestsActions.requestStarted.invoke(request);
    }

    public resourceUsageUpdated(resourceUsage: ResourceUsage): void {
        this._invokeUpdateLicenseEvent(resourceUsage);
    }

    public subscribeToExisitingJobRequest(jobRequest: TaskAgentJobRequest) {
        const queueId = jobRequest.queueId;
        const jobId = jobRequest.jobId;
        this._subscribeToJobRequest(queueId, jobId, null, jobRequest);
    }

    public subscribeToJobRequest(queueId: number, jobId: string, planId: string) {
        this._subscribeToJobRequest(queueId, jobId, planId);
    }

    private _subscribeToJobRequest(queueId: number, jobId: string, planId?: string, jobRequest?: TaskAgentJobRequest) {
        // Get agent queue details, this is cached server call
        AgentsSource.instance().getTaskAgentQueue(queueId).then(
            (queue: TaskAgentQueue) => {
                let poolId: number = 0;
                let isHostedPool: boolean = false;
                if (queue && queue.pool) {
                    poolId = queue.pool.id;
                    isHostedPool = queue.pool.isHosted;
                }
                if (poolId > 0) {
                    // If jobrequest present then use that while subscribing request instead of fetching through getAgentRequestsForPlan
                    // There is case where request get queued late, for example you have multi config case and maximum number of agent pick the request
                    // is less than total job request then in that case all job request will not get queued immediately. Now in that case when 
                    // getAgentRequestsForPlan call happen it doesn't return all job request and since it is cached call it never return it.
                    // However through signalR event we get jobRequest when it get queued and we store that as state, which we are passing down
                    // in this method, so in that case we should use passed jobRequest. 
                    if (jobRequest) {
                        this._subscribeJobRequest(jobId, isHostedPool, jobRequest);
                    } else {
                        AgentsSource.instance().getAgentRequestsForPlan(poolId, planId).then((jobRequests: TaskAgentJobRequest[]) => {
                            const fetchedJobRequest = this._getJobRequest(jobId, jobRequests);
                            this._subscribeJobRequest(jobId, isHostedPool, fetchedJobRequest);
                        }, (error) => {
                            // Eat the error
                            Diag.logWarning("JobRequestsActionsCreator: Failed to get AgentRequestsForPlan, error: " + error);
                        });
                    }

                    // Subscribe resource usages update, it handles the case where resource usage is already watched
                    AgentSignalRManager.instance().watchResourceUsageChanges();
                    // Subscribe to pool, it handles the case where poolId is already subscribed
                    AgentSignalRManager.instance().subscribeToPool(poolId);
                }
            },
            (error) => {
                // Eat the error
                Diag.logWarning("JobRequestsActionsCreator: Failed to fetch queue details, error: " + error);
            });
    }

    private _subscribeJobRequest(jobId: string, isHostedPool: boolean, jobRequest: TaskAgentJobRequest) {
        if (jobRequest) {
            if (!this._licenseInfoJobIdMap[jobRequest.jobId]) {
                this._fetchLicenseInfo(jobRequest, isHostedPool);
            }

            if (!this._subscribedJobRequest[jobId]) {
                this._jobRequestsActions.addjobRequest.invoke(jobRequest);
                // Filter the agents which are enabled so that we don't need to fetch job requests for disabled agent
                const agentIds = (jobRequest.matchedAgents || []).filter(agent => agent.enabled).map(agent => agent.id);
                this._fetchJobRequestsForAgents(jobRequest.poolId, isHostedPool, agentIds, jobRequest.jobId);
            }
        }

        this._jobRequestsActions.hideLoadingExperienceForJob.invoke(jobId);
    }

    private _fetchJobRequestsForAgents(poolId: number, isHostedPool: boolean, agentIds: number[], jobId: string) {
        AgentsSource.instance().fetchJobRequestsForAgents(poolId, agentIds).then((jobRequests: TaskAgentJobRequest[]) => {
            this._jobRequestsActions.jobRequestsForAgents.invoke({ poolId: poolId, isHostedPool: isHostedPool, requests: jobRequests });
            this._subscribedJobRequest[jobId] = true;
        }, (error) => {
            // We don't want to show error to user as this is transient experience and in case of transient error, it will
            // do retry by fetching same information again. In case of error it will show generic message to user.
            Diag.logWarning("JobRequestsActionsCreator: Failed to fetch JobRequestsForAgents, error: " + error);
        });
    }

    private _fetchLicenseInfo(jobRequest: TaskAgentJobRequest, isHostedPool: boolean) {
        const parallelismTag = jobRequest.data ? jobRequest.data[CommonConstants.ParallelismTag] : Utils_String.empty;
        AgentsSource.instance().getResourceUsage(parallelismTag, isHostedPool, false).then((resourceUsage: ResourceUsage) => {
            if (resourceUsage) {
                this._invokeUpdateLicenseEvent(resourceUsage);
                this._licenseInfoJobIdMap[jobRequest.jobId] = true;
            }
        }, (error) => {
            // We don't want to show error to user as this is transient experience and in case of transient error, it will
            // do retry by fetching same information again. In case of error it will show generic message to user
            Diag.logWarning("JobRequestsActionsCreator: Failed to fetch license details, error: " + error);
        });
    }

    private _getJobRequest(jobId: string, jobRequests: TaskAgentJobRequest[]): TaskAgentJobRequest {
        const jobRequest: TaskAgentJobRequest = Utils_Array.first(jobRequests, (request) => {
            return (request.jobId === jobId);
        });

        return jobRequest;
    }

    private _invokeUpdateLicenseEvent(resourceUsage: ResourceUsage): void {
        if (resourceUsage && resourceUsage.resourceLimit) {
            const acquiredLicenseCount: number = resourceUsage.usedCount || 0;
            const totalLicenseCount: number = resourceUsage.resourceLimit.totalCount || 0;
            const usedMinutes: number = resourceUsage.usedMinutes || 0;
            const totalMinutes: number = resourceUsage.resourceLimit.totalMinutes || 0;
            const isHostedPool: boolean = !!resourceUsage.resourceLimit.isHosted;
            const parallelismTag: string = resourceUsage.resourceLimit.parallelismTag;

            this._jobRequestsActions.updateLicenseInfo.invoke({
                totalLicenseCount: totalLicenseCount,
                usedLicenseCount: acquiredLicenseCount,
                isHostedPool: isHostedPool,
                parallelismTag: parallelismTag,
                totalMinutes: totalMinutes,
                usedMinutes: usedMinutes
            });
        }
    }

    private _jobRequestsActions: JobRequestsActions;
    private _subscribedJobRequest: IDictionaryStringTo<boolean> = {};
    private _licenseInfoJobIdMap: IDictionaryStringTo<boolean> = {};
}