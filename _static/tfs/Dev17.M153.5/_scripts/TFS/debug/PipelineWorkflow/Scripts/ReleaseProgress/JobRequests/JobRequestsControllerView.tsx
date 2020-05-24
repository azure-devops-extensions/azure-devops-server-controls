import * as React from "react";

import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import { AppContext } from "DistributedTaskControls/Common/AppContext";
import * as Base from "DistributedTaskControls/Common/Components/Base";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { LoadingComponent } from "DistributedTaskControls/Components/LoadingComponent";

import { AgentAcquisition } from "DistributedTaskUI/Logs/AgentAcquisition";

import { SpinnerSize } from "OfficeFabric/Spinner";
import { css } from "OfficeFabric/Utilities";

import { AgentSignalRManager } from "PipelineWorkflow/Scripts/ReleaseProgress/JobRequests/AgentSignalRManager";
import { JobRequestsActionsCreator } from "PipelineWorkflow/Scripts/ReleaseProgress/JobRequests/JobRequestsActionsCreator";
import { IJobRequestsState, JobRequestsStore } from "PipelineWorkflow/Scripts/ReleaseProgress/JobRequests/JobRequestsStore";
import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";
import { FeatureFlagUtils } from "PipelineWorkflow/Scripts/Shared/Utils/FeatureFlagUtils";
import { PermissionHelper } from "PipelineWorkflow/Scripts/SharedComponents/Security/PermissionHelper";

import * as TaskAgentPoolHub from "ReleasePipeline/Scripts/TFS.ReleaseManagement.TaskAgentPoolHub.ConnectionManager";

import { ResourceUsage, TaskAgent, TaskAgentJobRequest } from "TFS/DistributedTask/Contracts";

import "VSS/LoaderPlugins/Css!RM:PipelineWorkflow/Scripts/ReleaseProgress/JobRequests/JobRequests";

export interface IJobRequestsControllerViewProps extends Base.IProps {
    queueId: number;
    id: string;
    planId: string;
    agentName: string;
    hideHeader?: boolean;
    containerCssClass?: string;
    preRequisiteSectionCssClass?: string;
    loadingCssClass?: string;
}

export class JobRequestsControllerView extends Base.Component<IJobRequestsControllerViewProps, IJobRequestsState> {
    constructor(props?: IJobRequestsControllerViewProps) {
        super(props);
        this._jobRequestsStore = StoreManager.GetStore<JobRequestsStore>(JobRequestsStore, this.props.instanceId);
        this._jobRequestsActionsCreator = ActionCreatorManager.GetActionCreator<JobRequestsActionsCreator>(JobRequestsActionsCreator, this.props.instanceId);
        this.state = this._jobRequestsStore.getStateForJob(this.props.id);
    }

    public componentWillMount(): void {
        this._jobRequestsStore.addChangedListener(this._onChange);
        this._initializeTaskAgentSignalR();
    }

    public componentDidMount(): void {
        this._subscribeAgentJobRequest();
    }

    componentWillUnmount() {
        this._jobRequestsStore.removeChangedListener(this._onChange);
    }

    public render(): JSX.Element {
        if (this.state.isJobRequestLoadingComplete) {
            const pageContext = AppContext.instance().PageContext as any;
            const isAnonymousUser = PermissionHelper.IsPublicOrAnonymousUser();

            return (
                <div className="job-requests-container">
                    <AgentAcquisition
                        queueId={this.props.queueId}
                        agentName={this.props.agentName}
                        jobRequest={this.state.jobRequest}
                        licenseInfo={this.state.licenseInfo}
                        queuePosition={this.state.queueInfo.queuePosition}
                        isHostedPool={this.state.queueInfo.isHostedPool}
                        isAnonymousUser={isAnonymousUser}
                        hideLicenseInfoSection={false}
                        pageContext={pageContext}
                        hideHeader={this.props.hideHeader}
                        containerCssClass={this.props.containerCssClass}
                        preRequisiteSectionCssClass={this.props.preRequisiteSectionCssClass}
                    />
                </div>
            );
        }
        else {
            return (
                <div className="job-requests-container">
                    <LoadingComponent
                        className={css("agent-phase-acquisition-loading", this.props.loadingCssClass)}
                        label={Resources.FetchingQueueInfo}
                        size={SpinnerSize.large}
                    />
                </div>
            );
        }
    }

    private _onChange = () => {
        this.setState(this._jobRequestsStore.getStateForJob(this.props.id));
    }

    private _initializeTaskAgentSignalR() {
        let taskAgentEventHandlerMap = {};
        taskAgentEventHandlerMap[TaskAgentPoolHub.PoolEvents.AgentUpdated] = this._agentUpdated;
        taskAgentEventHandlerMap[TaskAgentPoolHub.PoolEvents.AgentRequestAssigned] = this._requestAssigned;
        taskAgentEventHandlerMap[TaskAgentPoolHub.PoolEvents.AgentRequestCompleted] = this._requestCompleted;
        taskAgentEventHandlerMap[TaskAgentPoolHub.PoolEvents.AgentRequestQueued] = this._requestQueued;
        taskAgentEventHandlerMap[TaskAgentPoolHub.PoolEvents.AgentRequestStarted] = this._requestStarted;
        taskAgentEventHandlerMap[TaskAgentPoolHub.PoolEvents.ResourceUsageUpdated] = this._resourceUsageUpdated;

        AgentSignalRManager.instance().attachAllTaskAgentEvents(taskAgentEventHandlerMap);
    }

    private _agentUpdated = (sender: any, agent: TaskAgent): void => {
        this._jobRequestsActionsCreator.agentUpdated(agent);
    }

    private _requestAssigned = (sender: any, request: TaskAgentJobRequest): void => {
        this._jobRequestsActionsCreator.requestAssigned(request);
    }

    private _requestCompleted = (sender: any, request: TaskAgentJobRequest): void => {
        this._jobRequestsActionsCreator.requestCompleted(request);
    }

    private _requestQueued = (sender: any, request: TaskAgentJobRequest): void => {
        this._jobRequestsActionsCreator.requestQueued(request);
    }

    private _requestStarted = (sender: any, request: TaskAgentJobRequest): void => {
        this._jobRequestsActionsCreator.requestStarted(request);
    }

    private _resourceUsageUpdated = (sender: any, usage: ResourceUsage): void => {
        this._jobRequestsActionsCreator.resourceUsageUpdated(usage);
    }

    private _subscribeAgentJobRequest(): void {
        const jobRequest = this.state.jobRequest;
        if (jobRequest) {
            this._jobRequestsActionsCreator.subscribeToExisitingJobRequest(jobRequest);
        }
        else {
            this._jobRequestsActionsCreator.subscribeToJobRequest(this.props.queueId, this.props.id, this.props.planId);
        }
    }

    private _jobRequestsStore: JobRequestsStore;
    private _jobRequestsActionsCreator: JobRequestsActionsCreator;
}