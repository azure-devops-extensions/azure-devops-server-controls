import * as ActionBase from "DistributedTaskControls/Common/Actions/Base";

import { ReleaseProgressActionKeys } from "PipelineWorkflow/Scripts/ReleaseProgress/Constants";

import { TaskAgent, TaskAgentJobRequest } from "TFS/DistributedTask/Contracts";

export interface IPoolRequests {
    poolId: number;
    isHostedPool: boolean;
    requests: TaskAgentJobRequest[];
}

export interface ILicenseInfoPayload {
    totalLicenseCount: number;
    usedLicenseCount: number;
    totalMinutes: number;
    usedMinutes: number;
    parallelismTag: string;
    isHostedPool: boolean;
}

export class JobRequestsActions extends ActionBase.ActionsHubBase {

    public static getKey(): string {
        return ReleaseProgressActionKeys.JobRequestsActions;
    }

    public initialize(): void {
        this._agentUpdated = new ActionBase.Action<TaskAgent>();
        this._requestAssigned = new ActionBase.Action<TaskAgentJobRequest>();
        this._requestCompleted = new ActionBase.Action<TaskAgentJobRequest>();
        this._requestQueued = new ActionBase.Action<TaskAgentJobRequest>();
        this._requestStarted = new ActionBase.Action<TaskAgentJobRequest>();
        this._addjobRequest = new ActionBase.Action<TaskAgentJobRequest>();
        this._jobRequestsForAgents = new ActionBase.Action<IPoolRequests>();
        this._updateLicenseInfo = new ActionBase.Action<ILicenseInfoPayload>();
        this._hideLoadingExperienceForJob = new ActionBase.Action<string>();
    }

    public get agentUpdated(): ActionBase.Action<TaskAgent> {
        return this._agentUpdated;
    }

    public get requestAssigned(): ActionBase.Action<TaskAgentJobRequest> {
        return this._requestAssigned;
    }

    public get requestCompleted(): ActionBase.Action<TaskAgentJobRequest> {
        return this._requestCompleted;
    }

    public get requestQueued(): ActionBase.Action<TaskAgentJobRequest> {
        return this._requestQueued;
    }

    public get requestStarted(): ActionBase.Action<TaskAgentJobRequest> {
        return this._requestStarted;
    }

    public get addjobRequest(): ActionBase.Action<TaskAgentJobRequest> {
        return this._addjobRequest;
    }

    public get hideLoadingExperienceForJob(): ActionBase.Action<string> {
        return this._hideLoadingExperienceForJob;
    }

    public get jobRequestsForAgents(): ActionBase.Action<IPoolRequests> {
        return this._jobRequestsForAgents;
    }

    public get updateLicenseInfo(): ActionBase.Action<ILicenseInfoPayload> {
        return this._updateLicenseInfo;
    }

    private _agentUpdated: ActionBase.Action<TaskAgent>;
    private _requestAssigned: ActionBase.Action<TaskAgentJobRequest>;
    private _requestCompleted: ActionBase.Action<TaskAgentJobRequest>;
    private _requestQueued: ActionBase.Action<TaskAgentJobRequest>;
    private _requestStarted: ActionBase.Action<TaskAgentJobRequest>;
    private _addjobRequest: ActionBase.Action<TaskAgentJobRequest>;
    private _jobRequestsForAgents: ActionBase.Action<IPoolRequests>;
    private _updateLicenseInfo: ActionBase.Action<ILicenseInfoPayload>;
    private _hideLoadingExperienceForJob: ActionBase.Action<string>;
}