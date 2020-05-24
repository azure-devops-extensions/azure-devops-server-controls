import * as React from "react";

import { FriendlyDate, PastDateMode } from "DistributedTaskControls/Common/FriendlyDate";

import { PrimaryButton } from "OfficeFabric/Button";
import { DirectionalHint } from "OfficeFabric/ContextualMenu";
import { Link } from "OfficeFabric/Link";
import { css } from "OfficeFabric/Utilities";

import { ComputedDeploymentStatus } from "PipelineWorkflow/Scripts/Common/Types";
import { ReleaseEnvironmentCanvasViewUtils } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleaseEnvironmentCanvasViewUtils";
import { ReleaseProgressNavigateStateActions } from "PipelineWorkflow/Scripts/ReleaseProgress/Constants";
import { JobRequestsControllerView } from "PipelineWorkflow/Scripts/ReleaseProgress/JobRequests/JobRequestsControllerView";
import { ReleaseDeploymentAttemptHelper } from "PipelineWorkflow/Scripts/ReleaseProgress/ReleaseEnvironment/ReleaseDeploymentAttemptHelper";
import { ActionClickTarget, IReleaseEnvironmentActionInfo, ReleaseEnvironmentAction } from "PipelineWorkflow/Scripts/ReleaseProgress/ReleaseEnvironment/ReleaseEnvironmentTypes";
import { JobIssuesComponent } from "PipelineWorkflow/Scripts/ReleaseProgress/Timeline/JobIssuesComponent";
import * as Types from "PipelineWorkflow/Scripts/ReleaseProgress/Timeline/Timeline.types";
import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";
import { ReleaseDeployPhaseHelper } from "PipelineWorkflow/Scripts/Shared/Environment/ReleaseDeployPhaseHelper";
import { ReleaseDeployPhaseListHelper } from "PipelineWorkflow/Scripts/Shared/Environment/ReleaseDeployPhaseListHelper";

import * as RMContracts from "ReleaseManagement/Core/Contracts";

import * as NavigationService from "VSS/Navigation/Services";
import { curry } from "VSS/Utils/Core";
import { empty, localeFormat } from "VSS/Utils/String";
import { KeyCode } from "VSS/Utils/UI";

import { FormatComponent } from "VSSPreview/Flux/Components/Format";

import { TooltipHost } from "VSSUI/Tooltip";
import { VssIconType, IVssIconProps } from "VSSUI/VssIcon";

export class DeploymentNodeProvider implements Types.ITimelineSnapshotDetailsProvider {
    public constructor(
        private _deploymentAttemptHelper: ReleaseDeploymentAttemptHelper,
        private _inProgressStatus: RMContracts.DeployPhaseStatus,
        private _deploymentActionsMap: IDictionaryStringTo<IReleaseEnvironmentActionInfo>,
        private _deploymentStatus: ComputedDeploymentStatus
    ) {
        this._deployPhaseListHelper = this._deploymentAttemptHelper.getReleaseDeployPhaseListHelper();
    }

    public getKey(): string {
        return "deployment-snapshot";
    }

    public getIconProps(): IVssIconProps {
        let iconProp = {iconType: VssIconType.bowtie} as IVssIconProps;

        switch (this._inProgressStatus) {
            case RMContracts.DeployPhaseStatus.InProgress:
            case RMContracts.DeployPhaseStatus.Cancelling:
                iconProp.iconName = css("bowtie-rocket", "deployment-default");
                break;
            case RMContracts.DeployPhaseStatus.Canceled:
            case RMContracts.DeployPhaseStatus.Failed:
                iconProp.iconName = css("bowtie-rocket", "deployment-failed");
                break;
            case RMContracts.DeployPhaseStatus.PartiallySucceeded:
                iconProp.iconName = css("bowtie-rocket", "deployment-partially-succeeded");
                break;
            case RMContracts.DeployPhaseStatus.Succeeded:
                iconProp.iconName = css("bowtie-rocket", "deployment-succeeded");
                break;
            case RMContracts.DeployPhaseStatus.InProgress:
            default:
                iconProp.iconName = css("bowtie-rocket", "deployment-default");
                break;
        }

        return iconProp;
    }

    public getInitializeSnapshot(): Types.InitializeSnapshot {
        return this._initializeDeploymentSnapshot;
    }

    public getHeaderData(instanceId?: string): Types.ISnapshotHeaderData {
        if (this._deploymentStatus === ComputedDeploymentStatus.ManualInterventionPending) {
            return {
                name: Resources.TimelineHeaderDeploymentPendingIntervention,
                tooltip: Resources.ResumeManualInterventionTooltip,
                onClick: curry(this._onMIClick, this._deploymentActionsMap[ReleaseEnvironmentAction.ManualIntervention], instanceId)
            } as Types.ISnapshotHeaderData;
        }

        let header = empty;

        switch (this._inProgressStatus) {
            case RMContracts.DeployPhaseStatus.Canceled:
                header = Resources.TimelineHeaderDeploymentCanceled;
                break;
            case RMContracts.DeployPhaseStatus.Cancelling:
                header = Resources.TimelineHeaderDeploymentCanceling;
                break;
            case RMContracts.DeployPhaseStatus.Failed:
                header = Resources.TimelineHeaderDeploymentFailed;
                break;
            case RMContracts.DeployPhaseStatus.PartiallySucceeded:
                header = Resources.TimelineHeaderDeploymentPartiallySucceeded;
                break;
            case RMContracts.DeployPhaseStatus.Succeeded:
                header = Resources.TimelineHeaderDeploymentSucceeded;
                break;
            case RMContracts.DeployPhaseStatus.InProgress:
            default:
                header = Resources.TimelineHeaderDeploymentInProgress;
                break;
        }

        const environmentId = this._deploymentAttemptHelper.getReleaseEnvironment().id;
        const onClick = () => { ReleaseEnvironmentCanvasViewUtils.navigateToEnvironmentsView(environmentId, { environmentId: environmentId }); };

        return {
            name: header,
            tooltip: Resources.ViewLogsTooltip,
            onClick: onClick,
            role: "link"
        } as Types.ISnapshotHeaderData;
    }

    public getDescriptionData(): Types.SnapshotDescriptionDataType {
        let descriptionData: Types.ISnapshotDescriptionData = null;
        const minStartTimeAcrossAllTasks = this._deployPhaseListHelper.getMinStartTimeAcrossAllTasks();

        switch (this._inProgressStatus) {
            case RMContracts.DeployPhaseStatus.InProgress:
            case RMContracts.DeployPhaseStatus.Cancelling:
                let duration: string = minStartTimeAcrossAllTasks
                    ? new FriendlyDate(new Date(minStartTimeAcrossAllTasks), PastDateMode.since, false, new Date(), false, false, null, null, true).toString()
                    : null;
                descriptionData = {
                    timeStamp: minStartTimeAcrossAllTasks,
                    timeStampDescriptionPrefix: Resources.TimelineDescriptionDeploymentStartedPrefix,
                    duration: duration
                } as Types.ISnapshotDescriptionData;
                break;
            case RMContracts.DeployPhaseStatus.Canceled:
            case RMContracts.DeployPhaseStatus.Failed:
            case RMContracts.DeployPhaseStatus.PartiallySucceeded:
            case RMContracts.DeployPhaseStatus.Succeeded:
                const maxFinishTimeAcrossAllTasks = this._deployPhaseListHelper.getMaxFinishTimeAcrossAllTasks();
                duration = minStartTimeAcrossAllTasks
                    ? new FriendlyDate(
                        minStartTimeAcrossAllTasks, PastDateMode.since, false,
                        (maxFinishTimeAcrossAllTasks ? maxFinishTimeAcrossAllTasks : new Date()),
                        false, false, null, null, true
                    ).toString()
                    : null;
                descriptionData = {
                    timeStamp: maxFinishTimeAcrossAllTasks,
                    duration: duration
                } as Types.ISnapshotDescriptionData;
                break;
        }

        return descriptionData;
    }

    public getAdditionalContent(instanceId?: string): JSX.Element {
        const orderedPhaseList = this._deployPhaseListHelper.getOrderedPhaseList();

        if (orderedPhaseList && orderedPhaseList.length > 0) {
            let executionSummaryElements: JSX.Element[] = [];
            let executionSummaryElementKey: number = 0;

            orderedPhaseList.forEach((phase: RMContracts.ReleaseDeployPhase, index: number) => {
                if (phase) {
                    if (phase.deploymentJobs && phase.deploymentJobs.length > 0) {
                        if (phase.phaseType === RMContracts.DeployPhaseTypes.MachineGroupBasedDeployment) {
                            executionSummaryElements.push(this._getExecutionSummaryElement(executionSummaryElementKey, instanceId, phase.name, phase.status, phase));
                            executionSummaryElementKey++;
                        }
                        else {
                            const deploymentJobs = this._getAllDeploymentJobsOrderedFlatListForPhase(phase);
                            deploymentJobs.forEach((deploymentJob: RMContracts.DeploymentJob) => {
                                if (deploymentJob && deploymentJob.job) {
                                    executionSummaryElements.push(
                                        this._getExecutionSummaryElement(
                                            executionSummaryElementKey,
                                            instanceId,
                                            ReleaseDeployPhaseHelper.getFormattedJobName(phase, deploymentJob),
                                            this._getTaskStatusAsPhaseStatus(deploymentJob.job.status),
                                            phase,
                                            deploymentJob
                                        )
                                    );
                                    executionSummaryElementKey++;
                                }
                            });
                        }
                    }
                    else if (phase.status !== RMContracts.DeployPhaseStatus.Skipped && phase.errorLog) {
                        executionSummaryElements.push(this._getExecutionSummaryElement(executionSummaryElementKey, instanceId, phase.name, phase.status, phase));
                        executionSummaryElementKey++;
                    }
                }
            });

            const deploymentAttempt = this._deploymentAttemptHelper.getDeploymentAttempt();
            let deploymentIssuesContent: JSX.Element = null;
            if (deploymentAttempt) {
                if (deploymentAttempt.issues && deploymentAttempt.issues.length > 0) {
                    deploymentIssuesContent = (
                        <JobIssuesComponent
                            issues={deploymentAttempt.issues}
                        />
                    );
                }
                else if (deploymentAttempt.errorLog) {
                    deploymentIssuesContent = (
                        <JobIssuesComponent
                            errorLog={deploymentAttempt.errorLog}
                        />
                    );
                }
            }

            return (
                <div>
                    <div className="deployment-issues-content">
                        {deploymentIssuesContent}
                    </div>
                    {executionSummaryElements}
                </div>
            );
        }

        return null;
    }

    private _getExecutionSummaryElement(
        key: number,
        instanceId: string,
        name: string,
        status: RMContracts.DeployPhaseStatus,
        phase: RMContracts.ReleaseDeployPhase,
        deploymentJob?: RMContracts.DeploymentJob
    ): JSX.Element {
        const elementId: string = "execution-summary" + key;
        return (
            <div key={key} className="execution-summary" id={elementId}>
                {this._getExecutionSummaryHeader(name, status)}
                {this._getExecutionSummaryContent(instanceId, phase, deploymentJob, elementId)}
                {this._getJobIssuesContent(phase, deploymentJob)}
            </div>
        );
    }

    private _getExecutionSummaryHeader(text: string, status: RMContracts.DeployPhaseStatus): JSX.Element {
        const statusString = this._getStatusString(status);
        return (
            <div className="summary-header">
                {text}
                {statusString && " - "}
                {statusString && <span className={css("summary-header-status", this._getHeaderStatusClassName(status))}>{statusString}</span>}
            </div>
        );
    }

    private _getAllDeploymentJobsOrderedFlatListForPhase(phase: RMContracts.ReleaseDeployPhase): RMContracts.DeploymentJob[] {
        let deploymentJobs: RMContracts.DeploymentJob[] = [];

        if (phase.deploymentJobs && phase.deploymentJobs.length > 0) {
            phase.deploymentJobs.forEach(job => {
                if (job.job) {
                    deploymentJobs.push(job);
                }
            });

            deploymentJobs.sort((a, b) => a.job.rank - b.job.rank);
        }

        return deploymentJobs;
    }

    private _getTaskStatusAsPhaseStatus(taskStatus: RMContracts.TaskStatus): RMContracts.DeployPhaseStatus {
        switch (taskStatus) {
            case RMContracts.TaskStatus.Unknown:
            case RMContracts.TaskStatus.Pending:
                return RMContracts.DeployPhaseStatus.NotStarted;
            case RMContracts.TaskStatus.InProgress:
                return RMContracts.DeployPhaseStatus.InProgress;
            case RMContracts.TaskStatus.Success:
            case RMContracts.TaskStatus.Succeeded:
                return RMContracts.DeployPhaseStatus.Succeeded;
            case RMContracts.TaskStatus.Failure:
            case RMContracts.TaskStatus.Failed:
                return RMContracts.DeployPhaseStatus.Failed;
            case RMContracts.TaskStatus.Canceled:
                return RMContracts.DeployPhaseStatus.Canceled;
            case RMContracts.TaskStatus.Skipped:
                return RMContracts.DeployPhaseStatus.Skipped;
            case RMContracts.TaskStatus.PartiallySucceeded:
                return RMContracts.DeployPhaseStatus.PartiallySucceeded;
            default:
                return RMContracts.DeployPhaseStatus.Undefined;
        }
    }

    private _getHeaderStatusClassName(status: RMContracts.DeployPhaseStatus): string {
        switch (status) {
            case RMContracts.DeployPhaseStatus.InProgress:
                return "state-inprogress";
            case RMContracts.DeployPhaseStatus.Succeeded:
                return "state-succeeded";
            case RMContracts.DeployPhaseStatus.PartiallySucceeded:
                return "state-partiallysucceeded";
            case RMContracts.DeployPhaseStatus.Failed:
                return "state-failed";
            case RMContracts.DeployPhaseStatus.Canceled:
                return "state-canceled";
            case RMContracts.DeployPhaseStatus.Cancelling:
                return "state-canceling";
            case RMContracts.DeployPhaseStatus.Skipped:
            case RMContracts.DeployPhaseStatus.NotStarted:
            default:
                return "state-notdeployed";
        }
    }

    private _getStatusString(status: RMContracts.DeployPhaseStatus): string {
        switch (status) {
            case RMContracts.DeployPhaseStatus.NotStarted:
                return Resources.NotStartedText;
            case RMContracts.DeployPhaseStatus.InProgress:
                return Resources.InProgressText;
            case RMContracts.DeployPhaseStatus.Succeeded:
                return Resources.SucceededText;
            case RMContracts.DeployPhaseStatus.PartiallySucceeded:
                return Resources.PartiallySucceededText;
            case RMContracts.DeployPhaseStatus.Failed:
                return Resources.FailedText;
            case RMContracts.DeployPhaseStatus.Canceled:
                return Resources.CanceledText;
            case RMContracts.DeployPhaseStatus.Cancelling:
                return Resources.JobStateCanceling;
            case RMContracts.DeployPhaseStatus.Skipped:
                return Resources.SkippedText;
            default:
                return null;
        }
    }

    private _getExecutionSummaryContent(instanceId: string, phase: RMContracts.ReleaseDeployPhase, deploymentJob: RMContracts.DeploymentJob, executionSummaryElementId: string): JSX.Element {
        const deployPhaseHelper = new ReleaseDeployPhaseHelper(phase);

        switch (phase.phaseType) {
            case RMContracts.DeployPhaseTypes.MachineGroupBasedDeployment:
                return this._getDeploymentGroupPhaseContent(phase, executionSummaryElementId);
            case RMContracts.DeployPhaseTypes.RunOnServer:
                return this._getServerPhaseJobContent(instanceId, phase.manualInterventions, deployPhaseHelper, deploymentJob);
            case RMContracts.DeployPhaseTypes.AgentBasedDeployment:
                return this._getAgentPhaseJobContent(instanceId, phase, deployPhaseHelper, deploymentJob);
            default:
                return null;
        }
    }

    private _getJobIssuesContent(phase: RMContracts.ReleaseDeployPhase, deploymentJob: RMContracts.DeploymentJob): JSX.Element {
        switch (phase.phaseType) {
            case RMContracts.DeployPhaseTypes.MachineGroupBasedDeployment:
                return this._getDeploymentGroupPhaseJobIssuesContent(phase);
            case RMContracts.DeployPhaseTypes.RunOnServer:
            case RMContracts.DeployPhaseTypes.AgentBasedDeployment:
                return (
                    <JobIssuesComponent
                        deploymentJob={deploymentJob}
                        environmentId={this._deploymentAttemptHelper.getReleaseEnvironment().id}
                        errorLog={phase.errorLog}
                        phaseId={phase.id}
                    />
                );
            default:
                return null;
        }
    }

    private _getAgentPhaseJobContent(
        instanceId: string,
        phase: RMContracts.ReleaseDeployPhase,
        deployPhaseHelper: ReleaseDeployPhaseHelper,
        deploymentJob: RMContracts.DeploymentJob
    ): JSX.Element {
        if (deploymentJob && deploymentJob.job) {
            switch (deploymentJob.job.status) {
                case RMContracts.TaskStatus.Pending:
                    return this._getQueuedForAgentContent(instanceId, phase, deploymentJob);
                case RMContracts.TaskStatus.InProgress:
                    return this._getTaskRunningContent(deployPhaseHelper, deploymentJob);
                case RMContracts.TaskStatus.Skipped:
                case RMContracts.TaskStatus.Unknown:
                    break;
                default:
                    return this._getTaskCompletedContent(deployPhaseHelper, deploymentJob);
            }
        }

        return null;
    }

    private _getQueuedForAgentContent(instanceId: string, phase: RMContracts.ReleaseDeployPhase, deploymentJob: RMContracts.DeploymentJob): JSX.Element {
        if (deploymentJob && deploymentJob.job) {
            return (
                <JobRequestsControllerView
                    instanceId={instanceId}
                    id={deploymentJob.job.timelineRecordId}
                    queueId={this._getQueueIdForPhaseRank(phase.rank)}
                    planId={phase.runPlanId}
                    agentName={deploymentJob.job.agentName}
                    hideHeader={true}
                    containerCssClass="agent-queue-container"
                    preRequisiteSectionCssClass="agent-prerequisite-section"
                    loadingCssClass="agent-loading"
                />
            );
        }

        return null;
    }

    private _getQueueIdForPhaseRank(rank: number): number {
        const phaseSnapshotForRank = this._deployPhaseListHelper.getPhaseSnapshotForRank(rank) as RMContracts.AgentBasedDeployPhase;
        if (phaseSnapshotForRank && phaseSnapshotForRank.deploymentInput) {
            return phaseSnapshotForRank.deploymentInput.queueId;
        }
        return -1;
    }

    private _getServerPhaseJobContent(
        instanceId: string,
        manualInterventions: RMContracts.ManualIntervention[],
        deployPhaseHelper: ReleaseDeployPhaseHelper,
        deploymentJob: RMContracts.DeploymentJob
    ): JSX.Element {
        if (deploymentJob && deploymentJob.job) {
            switch (deploymentJob.job.status) {
                case RMContracts.TaskStatus.InProgress:
                    if (this._deploymentStatus === ComputedDeploymentStatus.ManualInterventionPending && this._deploymentActionsMap) {
                        const firstPendingManualIntervention = manualInterventions.find(mi => mi.status === RMContracts.ManualInterventionStatus.Pending);
                        let waitingForDurationText: string = null;

                        if (firstPendingManualIntervention) {
                            waitingForDurationText = new FriendlyDate(
                                firstPendingManualIntervention.createdOn,
                                PastDateMode.since,
                                true, new Date(), false, true, null, null, false
                            ).toString();
                        }

                        return this._getPhaseMIContent(instanceId, waitingForDurationText);
                    }
                    else {
                        return this._getTaskRunningContent(deployPhaseHelper, deploymentJob);
                    }
                case RMContracts.TaskStatus.Skipped:
                case RMContracts.TaskStatus.Unknown:
                case RMContracts.TaskStatus.Pending:
                    break;
                default:
                    return this._getTaskCompletedContent(deployPhaseHelper, deploymentJob);
            }
        }

        return null;
    }

    private _getPhaseMIContent(instanceId: string, waitingForDurationText?: string): JSX.Element {
        const miActionInfo = this._deploymentActionsMap[ReleaseEnvironmentAction.ManualIntervention];

        const waitingForMIElement = (
            <FormatComponent format={Resources.WaitingForMIText} elementType="div" className="execution-status-text">
                <span className="text-highlight">{waitingForDurationText}</span>
            </FormatComponent>
        );

        if (miActionInfo && miActionInfo.isVisible) {
            return (
                <div>
                    {waitingForMIElement}
                    <div className="execution-action-button">
                        <PrimaryButton
                            onClick={curry(this._onMIClick, miActionInfo, instanceId)}
                            disabled={miActionInfo.isDisabled}>
                            {Resources.ResumeRejectText}
                        </PrimaryButton>
                    </div>
                </div>
            );
        }

        return (<span>{waitingForMIElement}</span>);
    }

    private _onMIClick = (miActionInfo: IReleaseEnvironmentActionInfo, instanceId?: string) => {
        miActionInfo.onExecute(instanceId, ActionClickTarget.environmentSummary);
    }

    private _getTaskRunningContent(deployPhaseHelper: ReleaseDeployPhaseHelper, deploymentJob: RMContracts.DeploymentJob): JSX.Element {
        let { taskStatus } = deployPhaseHelper.getLastTaskWithStatusInDeploymentJob(deploymentJob.job.rank, [RMContracts.TaskStatus.InProgress]);

        if (taskStatus && taskStatus.name) {
            return (
                <FormatComponent format={Resources.TimelineContent_Deployment_TaskRunningText} elementType="div" className="execution-status-text">
                    <span className="text-highlight">{taskStatus.name}</span>
                </FormatComponent>
            );
        }

        return null;
    }

    private _getTaskCompletedContent(deployPhaseHelper: ReleaseDeployPhaseHelper, deploymentJob: RMContracts.DeploymentJob): JSX.Element {
        const { totalTasks, successfulTasks, failedTasks, skippedTasks } = deployPhaseHelper.getTasksWithStatusCountFromPhase(deploymentJob.job.rank);

        const succeededTasksFractionString = localeFormat(Resources.XOutOfY, successfulTasks, totalTasks);

        let tasksStatusElement: JSX.Element = null;

        if (failedTasks > 0) {
            let { taskStatus } = deployPhaseHelper.getLastTaskWithStatusInDeploymentJob(
                deploymentJob.job.rank,
                [RMContracts.TaskStatus.Canceled, RMContracts.TaskStatus.Failed, RMContracts.TaskStatus.Failure]
            );

            if (taskStatus && taskStatus.name) {
                tasksStatusElement = (
                    <FormatComponent format={Resources.TimelineContent_Deployment_TaskFailedText} elementType="div" className="execution-status-text">
                        <span className="text-highlight">{taskStatus.name}</span>
                    </FormatComponent>
                );
            }
        }
        else if (skippedTasks > 0) {
            tasksStatusElement = (
                <FormatComponent format={Resources.TimelineContent_Deployment_Agent_TaskSucceededSkippedText} elementType="div" className="execution-status-text">
                    <span className="text-highlight">{succeededTasksFractionString}</span>
                    <span className="text-highlight">{skippedTasks}</span>
                </FormatComponent>
            );
        }
        else {
            tasksStatusElement = (
                <FormatComponent format={Resources.TimelineContent_Deployment_Agent_FractionTaskSucceededText} elementType="div" className="execution-status-text">
                    <span className="text-highlight">{succeededTasksFractionString}</span>
                </FormatComponent>
            );
        }

        return tasksStatusElement;
    }

    private _getDeploymentGroupPhaseContent(phase: RMContracts.ReleaseDeployPhase, executionSummaryElementId: string): JSX.Element {
        if (!(phase && phase.deploymentJobs && phase.deploymentJobs.length > 0 && phase.status !== RMContracts.DeployPhaseStatus.Skipped)) {
            return null;
        }

        const { totalTargets, successfulTargets, failedTargets, inProgressTargets, pendingTargets } = this._getDeploymentGroupStatusTargetsCounts(phase.deploymentJobs);

        if (phase.status === RMContracts.DeployPhaseStatus.Failed && totalTargets === 0) {
            return null;
        }

        let inProgressTextElement: JSX.Element = null;
        if (phase.status === RMContracts.DeployPhaseStatus.InProgress) {
            inProgressTextElement = (
                <FormatComponent format={Resources.TimelineContent_Deployment_DG_InProgressPendingText} elementType="div" className="inprogress-status-text execution-status-text">
                    <span className="text-highlight">{inProgressTargets}</span>
                    <span className="text-highlight">{pendingTargets}</span>
                </FormatComponent>
            );
        }

        return (
            <TooltipHost content={Resources.ViewLogsTooltip} hostClassName="cd-deployment-status-tooltip-container" directionalHint={DirectionalHint.topCenter}>
                <Link
                    className="dg-target-count-view"
                    role="link"
                    onClick={curry(this._onDGContentClick, phase.id.toString())}
                    onKeyDown={curry(this._onDGContentKeyDown, phase.id.toString())}
                    aria-labelledby={executionSummaryElementId}>

                    <div className="status-count-table">
                        <div className="status-count-container first">
                            <div className="text-highlight count-text state-undefined">{totalTargets}</div>
                            <div className="status-text">{Resources.DeploymentGroupsProgressTargetsText}</div>
                        </div>

                        <div className="status-count-container">
                            <div className="text-highlight count-text state-undefined">{successfulTargets}</div>
                            <div className="status-text">{Resources.DeploymentGroupsProgressSuccessfulText}</div>
                        </div>

                        <div className="status-count-container last">
                            <div className={css("text-highlight", "count-text", { "state-failed": (failedTargets > 0), "state-undefined": (failedTargets <= 0) })}>{failedTargets}</div>
                            <div className="status-text">{Resources.DeploymentGroupsProgressFailedText}</div>
                        </div>
                    </div>

                    {inProgressTextElement}
                </Link>
            </TooltipHost>
        );
    }

    private _getDeploymentGroupPhaseJobIssuesContent(phase: RMContracts.ReleaseDeployPhase): JSX.Element {
        if (!(phase && phase.deploymentJobs && phase.deploymentJobs.length > 0 && phase.status !== RMContracts.DeployPhaseStatus.Skipped)) {
            return null;
        }

        const { totalTargets } = this._getDeploymentGroupStatusTargetsCounts(phase.deploymentJobs);

        let errorString: string = phase.errorLog;

        if (phase.status === RMContracts.DeployPhaseStatus.Failed && totalTargets === 0) {
            errorString = this._getNoMachinesErrorText(phase.rank);
        }

        if (errorString) {
            return (
                <JobIssuesComponent
                    errorLog={errorString}
                    phaseId={phase.id}
                />
            );
        }
    }

    private _getDeploymentGroupStatusTargetsCounts(deploymentJobs: RMContracts.DeploymentJob[]) {
        let totalTargets = 0, successfulTargets = 0, failedTargets = 0, inProgressTargets = 0, pendingTargets = 0;

        deploymentJobs.forEach((deploymentJob: RMContracts.DeploymentJob) => {
            if (deploymentJob.job && deploymentJob.job.status && deploymentJob.job.agentName) {
                totalTargets++;
                switch (deploymentJob.job.status) {
                    case RMContracts.TaskStatus.Pending:
                        pendingTargets++;
                        break;

                    case RMContracts.TaskStatus.InProgress:
                        inProgressTargets++;
                        break;

                    case RMContracts.TaskStatus.Success:
                    case RMContracts.TaskStatus.Succeeded:
                    case RMContracts.TaskStatus.PartiallySucceeded:
                        successfulTargets++;
                        break;

                    case RMContracts.TaskStatus.Failure:
                    case RMContracts.TaskStatus.Canceled:
                    case RMContracts.TaskStatus.Skipped:
                    case RMContracts.TaskStatus.Failed:
                        failedTargets++;
                        break;
                }
            }
        });

        return {
            totalTargets: totalTargets,
            successfulTargets: successfulTargets,
            failedTargets: failedTargets,
            inProgressTargets: inProgressTargets,
            pendingTargets: pendingTargets
        };
    }

    private _getNoMachinesErrorText(rank: number): string {
        let tags: string[] = [];

        const phaseSnapshotForRank = this._deployPhaseListHelper.getPhaseSnapshotForRank(rank) as RMContracts.MachineGroupBasedDeployPhase;

        if (phaseSnapshotForRank && phaseSnapshotForRank.deploymentInput) {
            tags = phaseSnapshotForRank.deploymentInput.tags;
        }

        return (tags && tags.length > 0) ? localeFormat(Resources.NoMachineFoundWithGivenTags, tags.join(", ")) : Resources.NoMachineFound;
    }

    private _onDGContentClick = (deploymentGroupPhaseId: string) => {
        const environmentId = this._deploymentAttemptHelper.getReleaseEnvironment().id;
        NavigationService.getHistoryService().addHistoryPoint(
            ReleaseProgressNavigateStateActions.ReleaseEnvironmentDeploymentGroupLogs,
            {
                environmentId: environmentId,
                deploymentGroupPhaseId: deploymentGroupPhaseId
            },
            null, false, true
        );
    }

    private _onDGContentKeyDown = (deploymentGroupPhaseId: string, e: React.KeyboardEvent<HTMLDivElement>) => {
        if (e.keyCode === KeyCode.ENTER || e.keyCode === KeyCode.SPACE) {
            this._onDGContentClick(deploymentGroupPhaseId);
            e.stopPropagation();
            e.preventDefault();
        }
    }

    private _initializeDeploymentSnapshot = (resource: ReleaseDeploymentAttemptHelper, callback: (marker: Date) => void) => {
        const minStartTimeAcrossAllTasks = resource.getReleaseDeployPhaseListHelper().getMinStartTimeAcrossAllTasks();

        if (minStartTimeAcrossAllTasks) {
            callback(minStartTimeAcrossAllTasks);
            return;
        }

        const deploymentAttempt = resource.getDeploymentAttempt();
        if (deploymentAttempt.errorLog
            || (deploymentAttempt.issues && deploymentAttempt.issues.length > 0)
            || deploymentAttempt.operationStatus === RMContracts.DeploymentOperationStatus.PhaseFailed) {
            if (deploymentAttempt.lastModifiedOn) {
                callback(deploymentAttempt.lastModifiedOn);
                return;
            }
        }

        callback(null);
    }

    private _deployPhaseListHelper: ReleaseDeployPhaseListHelper;
}