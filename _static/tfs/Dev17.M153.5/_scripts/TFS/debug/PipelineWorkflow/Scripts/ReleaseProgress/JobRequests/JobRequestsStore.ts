import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { StoreBase } from "DistributedTaskControls/Common/Stores/Base";

import { ILicenseInfo } from "DistributedTaskUI/Logs/Logs.Types";

import { CommonConstants, ReleaseProgressStoreKeys } from "PipelineWorkflow/Scripts/ReleaseProgress/Constants";
import { ILicenseInfoPayload, IPoolRequests, JobRequestsActions } from "PipelineWorkflow/Scripts/ReleaseProgress/JobRequests/JobRequestsActions";

import { TaskAgent, TaskAgentJobRequest } from "TFS/DistributedTask/Contracts";

import * as Utils_String from "VSS/Utils/String";

export interface IQueueInfo {
    queuePosition: number;
    isHostedPool: boolean;
}

export interface IJobRequestsState {
    jobRequest?: TaskAgentJobRequest;
    licenseInfo?: ILicenseInfo;
    queueInfo?: IQueueInfo;
    isJobRequestLoadingComplete?: boolean;
}

export class JobRequestsStore extends StoreBase {

    public initialize(instanceId: string) {
        this._jobRequestsActions = ActionsHubManager.GetActionsHub<JobRequestsActions>(JobRequestsActions, instanceId);
        this._jobRequestsActions.addjobRequest.addListener(this._handleAddJobRequest);
        this._jobRequestsActions.agentUpdated.addListener(this._handleAgentUpdated);
        this._jobRequestsActions.requestAssigned.addListener(this._handleRequestUpdated);
        this._jobRequestsActions.requestCompleted.addListener(this._handleRequestUpdated);
        this._jobRequestsActions.requestQueued.addListener(this._handleRequestUpdated);
        this._jobRequestsActions.requestStarted.addListener(this._handleRequestUpdated);
        this._jobRequestsActions.hideLoadingExperienceForJob.addListener(this._handleLoadingExperienceForJob);
        this._jobRequestsActions.jobRequestsForAgents.addListener(this._onJobRequestsForAgentsAvailability);
        this._jobRequestsActions.updateLicenseInfo.addListener(this._handleUpdateLicenseInfo);
    }

    public static getKey(): string {
        return ReleaseProgressStoreKeys.JobRequestsStore;
    }

    public disposeInternal(): void {
        this._jobRequestsActions.addjobRequest.removeListener(this._handleAddJobRequest);
        this._jobRequestsActions.agentUpdated.removeListener(this._handleAgentUpdated);
        this._jobRequestsActions.requestAssigned.removeListener(this._handleRequestUpdated);
        this._jobRequestsActions.requestCompleted.removeListener(this._handleRequestUpdated);
        this._jobRequestsActions.requestQueued.removeListener(this._handleRequestUpdated);
        this._jobRequestsActions.requestStarted.removeListener(this._handleRequestUpdated);
        this._jobRequestsActions.hideLoadingExperienceForJob.removeListener(this._handleLoadingExperienceForJob);
        this._jobRequestsActions.jobRequestsForAgents.removeListener(this._onJobRequestsForAgentsAvailability);
        this._jobRequestsActions.updateLicenseInfo.removeListener(this._handleUpdateLicenseInfo);
    }

    public getStateForJob(jobId: string): IJobRequestsState {
        const jobRequest = this._jobIdToJobRequestMap[jobId];

        return {
            jobRequest: jobRequest,
            licenseInfo: this._getLicenseInfo(jobRequest),
            queueInfo: this._getQueueInfoFromJobRequest(jobRequest),
            isJobRequestLoadingComplete: this._jobIdServiceCallFinishedMap[jobId]
        };
    }

    private _handleUpdateLicenseInfo = (payload: ILicenseInfoPayload): void => {
        if (payload) {
            const licenseKey = payload.parallelismTag + payload.isHostedPool;
            if (licenseKey) {
                this._licenseKeyLicenseInfoMap[licenseKey] = {
                    totalLicenseCount: payload.totalLicenseCount,
                    usedLicenseCount: payload.usedLicenseCount,
                    totalMinutes: payload.totalMinutes,
                    usedMinutes: payload.usedMinutes
                } as ILicenseInfo;
                this.emitChanged();
            }
        }
    }

    private _handleAddJobRequest = (request: TaskAgentJobRequest): void => {
        this._jobIdToJobRequestMap[request.jobId] = request;
    }

    private _handleAgentUpdated = (agent: TaskAgent): void => {
        for (const jobId in this._jobIdToJobRequestMap) {
            if (this._jobIdToJobRequestMap.hasOwnProperty(jobId)) {
                const jobRequest = this._jobIdToJobRequestMap[jobId];
                if (jobRequest) {
                    (jobRequest.matchedAgents || []).forEach(matchedAgent => {
                        if (matchedAgent.id === agent.id) {
                            // This will update the jobRequest which is present in the map
                            matchedAgent.enabled = agent.enabled;
                            matchedAgent.status = agent.status;
                        }
                    });
                }
            }
        }

        this.emitChanged();
    }

    private _handleRequestUpdated = (request: TaskAgentJobRequest): void => {
        if (request && request.poolId) {
            // Update the map with latest request, this will help to get request which we never got added through addjobRequest event
            this._jobIdToJobRequestMap[request.jobId] = request;
            let allRequests = this._poolIdJobRequestsMap[request.poolId] || [];
            let index = -1;
            for (let i = 0, length = allRequests.length; i < length; i++) {
                if (allRequests[i].requestId === request.requestId) {
                    index = i;
                }
            }

            // If found, remove it
            if (index > -1) {
                allRequests.splice(index, 1);
            }

            // Concat the new request into allRequests
            allRequests = allRequests.concat(request);
            this._poolIdJobRequestsMap[request.poolId] = allRequests;

            this.emitChanged();
        }
    }

    private _handleLoadingExperienceForJob = (jobId: string): void => {
        if (!this._jobIdServiceCallFinishedMap[jobId]) {
            this._jobIdServiceCallFinishedMap[jobId] = true;
            this.emitChanged();
        }
    }

    private _onJobRequestsForAgentsAvailability = (payload: IPoolRequests) => {
        if (payload && payload.poolId && payload.requests) {
            this._poolIdJobRequestsMap[payload.poolId] = payload.requests;
            this._poolIdPoolInfoMap[payload.poolId] = !!payload.isHostedPool;
            this.emitChanged();
        }
    }

    private _getLicenseInfo(jobRequest: TaskAgentJobRequest): ILicenseInfo {
        let licenseInfoPayload: ILicenseInfo = null;
        if (jobRequest) {
            const parallelismTag = jobRequest.data ? jobRequest.data[CommonConstants.ParallelismTag] : Utils_String.empty;
            const isHostedPool = !!this._poolIdPoolInfoMap[jobRequest.poolId];
            const key = parallelismTag + isHostedPool;
            licenseInfoPayload = this._licenseKeyLicenseInfoMap[key];
        }

        return licenseInfoPayload;
    }

    private _getQueueInfoFromJobRequest(jobRequest: TaskAgentJobRequest): IQueueInfo {
        let queuePosition: number = 0;
        let isHostedPool: boolean = false;
        // No need to calculate queue position if job is already finished
        if (jobRequest && !(jobRequest.finishTime || jobRequest.result)) {
            let agentIdPositionMap: IDictionaryNumberTo<number> = {};
            const allRequests = this._poolIdJobRequestsMap[jobRequest.poolId] || [];

            // Sort job request in ascending order based on the queue time
            allRequests.sort(this._jobRequestComparer);

            for (let i = 0, length = allRequests.length; i < length; i++) {
                let foundRequest = false;
                const request = allRequests[i];
                if (request.finishTime || request.result) {
                    // ignore requests which are already finished
                    continue;
                }

                let agentIdsToConsider = (request.matchedAgents || []).map(agent => agent.id);

                if (agentIdsToConsider.length > 0) {
                    for (let i = 0, length = agentIdsToConsider.length; i < length; i++) {
                        const agentId = agentIdsToConsider[i];
                        if (!agentIdPositionMap[agentId]) {
                            agentIdPositionMap[agentId] = 1;
                        }

                        if (request.requestId === (jobRequest as TaskAgentJobRequest).requestId) {
                            foundRequest = true;
                        }
                        else {
                            agentIdPositionMap[agentId]++;
                        }
                    }
                }

                if (foundRequest) {
                    queuePosition = this._calculateMinimumQueuePositionFromMap(agentIdPositionMap);
                }

                isHostedPool = this._poolIdPoolInfoMap[jobRequest.poolId];
            }
        }

        return {
            queuePosition: queuePosition,
            isHostedPool: isHostedPool
        };
    }

    private _calculateMinimumQueuePositionFromMap(agentIdPositionMap: IDictionaryNumberTo<number>): number {
        let queuePosition: number = Number.MAX_VALUE;
        const agentIds = Object.keys(agentIdPositionMap);
        agentIds.forEach((agentId) => {
            if (queuePosition > agentIdPositionMap[agentId]) {
                queuePosition = agentIdPositionMap[agentId];
            }
        });

        return queuePosition;
    }

    // Sort job request in ascending order based on the queue time
    private _jobRequestComparer = (a: TaskAgentJobRequest, b: TaskAgentJobRequest) => {
        if (a.queueTime > b.queueTime) {
            return 1;
        }
        if (a.queueTime < b.queueTime) {
            return -1;
        }
        return 0;
    }

    private _jobRequestsActions: JobRequestsActions;

    private _jobIdToJobRequestMap: IDictionaryStringTo<TaskAgentJobRequest> = {};
    private _poolIdJobRequestsMap: IDictionaryNumberTo<TaskAgentJobRequest[]> = {};
    private _poolIdPoolInfoMap: IDictionaryNumberTo<boolean> = {};
    private _licenseKeyLicenseInfoMap: IDictionaryStringTo<ILicenseInfo> = {};
    private _jobIdServiceCallFinishedMap: IDictionaryStringTo<boolean> = {};
}