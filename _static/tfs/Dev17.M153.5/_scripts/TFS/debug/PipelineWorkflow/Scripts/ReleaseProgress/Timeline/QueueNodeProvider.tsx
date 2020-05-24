import * as React from "react";

import { FriendlyDate, PastDateMode } from "DistributedTaskControls/Common/FriendlyDate";
import { ICalloutContentProps } from "DistributedTaskControls/Components/CalloutComponent";
import { Component as InfoButton } from "DistributedTaskControls/Components/InfoButton";

import { ComputedDeploymentStatus } from "PipelineWorkflow/Scripts/Common/Types";
import { ReleaseEnvironmentCanvasViewUtils } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleaseEnvironmentCanvasViewUtils";
import { JobRequestsControllerView } from "PipelineWorkflow/Scripts/ReleaseProgress/JobRequests/JobRequestsControllerView";
import { ReleaseDeploymentAttemptHelper } from "PipelineWorkflow/Scripts/ReleaseProgress/ReleaseEnvironment/ReleaseDeploymentAttemptHelper";
import * as Types from "PipelineWorkflow/Scripts/ReleaseProgress/Timeline/Timeline.types";
import { ReleaseUrlUtils } from "PipelineWorkflow/Scripts/ReleaseProgress/Utilities/ReleaseUrlUtils";
import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";

import * as RMContracts from "ReleaseManagement/Core/Contracts";

import { first } from "VSS/Utils/Array";
import * as Utils_HTML from "VSS/Utils/Html";
import { empty, localeFormat } from "VSS/Utils/String";
import { VssIconType, IVssIconProps } from "VSSUI/VssIcon";
import { Status, StatusSize, IStatusProps, Statuses } from "VSSUI/Status";

export class QueueNodeProvider implements Types.ITimelineSnapshotDetailsProvider {

    public constructor(
        private _deploymentAttemptHelper: ReleaseDeploymentAttemptHelper,
        private _deploymentStatus: ComputedDeploymentStatus,
        private _environmentExecutionPolicy: RMContracts.EnvironmentExecutionPolicy
    ) {
    }

    public getKey(): string {
        return "queued-snapshot";
    }

    public onRenderIcon = (): JSX.Element => {
        let statusProps: IStatusProps = Statuses.Queued;

        return <Status {...statusProps} size={StatusSize.s} />;
    }

    public getInitializeSnapshot(): Types.InitializeSnapshot {
        return this._initializeQueuedSnapshot;
    }

    public getHeaderData(instanceId?: string): Types.ISnapshotHeaderData {
        let header = empty;
        switch (this._deploymentStatus) {
            case ComputedDeploymentStatus.QueuedForAgentBeforeDeploy:
            case ComputedDeploymentStatus.QueuedForAgentDuringDeploy:
                header = Resources.TimelineStatus_QueuedForAgent;
                break;

            case ComputedDeploymentStatus.QueuedForPipelineBeforeDeploy:
            case ComputedDeploymentStatus.QueuedForPipelineDuringDeploy:
                header = Resources.TimelineStatus_QueuedForPipeline;
                break;

            default:
                header = Resources.TimelineStatus_QueuedForDeployment;
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
        const lastModifiedOn: Date = this._deploymentAttemptHelper.getDeploymentAttempt().lastModifiedOn;
        const duration = new FriendlyDate(lastModifiedOn, PastDateMode.since, true).toString();

        const descriptionData = {
            text: duration
        } as Types.ISnapshotDescriptionData;

        return descriptionData;
    }

    public getAdditionalContent(instanceId?: string): JSX.Element {
        switch (this._deploymentStatus) {
            case ComputedDeploymentStatus.Queued:
                const queueLinkUrl = this._getDeploymentQueueUrl(this._deploymentAttemptHelper);
                const normalizedMessage = Utils_HTML.HtmlNormalizer.normalize(localeFormat(Resources.TimelineQueueContentText, queueLinkUrl));
                const environmentExecutionPolicyString = this._getEnvironmentExecutionPolicyString();
                return (
                    /* tslint:disable:react-no-dangerous-html */
                    <div className="snapshot-queue-content">
                        {environmentExecutionPolicyString &&
                            <div>
                                {environmentExecutionPolicyString}
                                <InfoButton
                                    iconAriaLabel={Resources.TimelineQueueInfoButtonAriaLabel}
                                    calloutContent={{
                                        calloutDescription: Resources.TimelineContent_Queue_InfoText
                                    } as ICalloutContentProps}
                                    isIconFocusable={true} />
                            </div>
                        }
                        <div
                            dangerouslySetInnerHTML={this._renderHtml(normalizedMessage)}
                        />
                    </div>
                    /* tslint:enable:react-no-dangerous-html */
                );

            case ComputedDeploymentStatus.QueuedForAgentBeforeDeploy:
            case ComputedDeploymentStatus.QueuedForAgentDuringDeploy:
                return this._getQueuedForAgentContent(instanceId);

            case ComputedDeploymentStatus.QueuedForPipelineBeforeDeploy:
            case ComputedDeploymentStatus.QueuedForPipelineDuringDeploy:
            default:
                return null;
        }
    }

    private _getEnvironmentExecutionPolicyString() {
        if (!this._environmentExecutionPolicy) {
            return null;
        }
        if (this._environmentExecutionPolicy.concurrencyCount > 1 && this._environmentExecutionPolicy.queueDepthCount === 0) {
            return localeFormat(Resources.TimelineContent_Queue_NInSequenceText, this._environmentExecutionPolicy.concurrencyCount);
        }
        else if (this._environmentExecutionPolicy.concurrencyCount > 1 && this._environmentExecutionPolicy.queueDepthCount !== 0) {
            return localeFormat(Resources.TimelineContent_Queue_NLatestText, this._environmentExecutionPolicy.concurrencyCount);
        }
        else if (this._environmentExecutionPolicy.concurrencyCount === 1 && this._environmentExecutionPolicy.queueDepthCount === 0) {
            return Resources.TimelineContent_Queue_OneInSequenceText;
        }
        else if (this._environmentExecutionPolicy.concurrencyCount === 1 && this._environmentExecutionPolicy.queueDepthCount !== 0) {
            return Resources.TimelineContent_Queue_OneLatestText;
        }
    }

    private _getDeploymentQueueUrl(deploymentAttemptHelper: ReleaseDeploymentAttemptHelper): string {
        const releaseId = deploymentAttemptHelper.getReleaseId(),
            releaseDefinitionId = deploymentAttemptHelper.getReleaseDefinitionId(),
            environmentDefinitionId = deploymentAttemptHelper.getEnvironmentDefinitionId();

        let deploymentQueueUrl: string = ReleaseUrlUtils.getDeploymentQueueUrl(releaseId, releaseDefinitionId, environmentDefinitionId);

        return deploymentQueueUrl;
    }

    private _getQueuedForAgentContent(instanceId: string): JSX.Element {
        const deploymentAttempt = this._deploymentAttemptHelper.getDeploymentAttempt();

        if (deploymentAttempt && deploymentAttempt.releaseDeployPhases && deploymentAttempt.releaseDeployPhases.length > 0) {
            let firstQueuedForAgentPhase: RMContracts.ReleaseDeployPhase = null;
            let firstQueuedForAgentJob: RMContracts.ReleaseTask = null;

            first(deploymentAttempt.releaseDeployPhases, ((phase: RMContracts.ReleaseDeployPhase) => {
                if (phase.status === RMContracts.DeployPhaseStatus.NotStarted && phase.phaseType === RMContracts.DeployPhaseTypes.AgentBasedDeployment) {
                    if (phase && phase.deploymentJobs && phase.deploymentJobs.length > 0) {
                        first(phase.deploymentJobs, ((deploymentJob: RMContracts.DeploymentJob) => {
                            if (deploymentJob) {
                                firstQueuedForAgentJob = deploymentJob.job;
                                firstQueuedForAgentPhase = phase;
                                return true;
                            }
                        }));
                    }
                }
                if (firstQueuedForAgentJob) {
                    return true;
                }
            }));

            if (firstQueuedForAgentJob) {
                return (
                    <JobRequestsControllerView
                        instanceId={instanceId}
                        id={firstQueuedForAgentJob.timelineRecordId}
                        queueId={this._deploymentAttemptHelper.getQueueIdForWaitingPhase()}
                        planId={firstQueuedForAgentPhase.runPlanId}
                        agentName={firstQueuedForAgentJob.agentName}
                        hideHeader={true}
                        containerCssClass="agent-queue-container"
                        preRequisiteSectionCssClass="agent-prerequisite-section"
                        loadingCssClass="agent-loading"
                    />
                );
            }
        }

        return null;
    }

    private _renderHtml(html: string) {
        return {
            __html: html
        };
    }

    private _initializeQueuedSnapshot = (resource: ReleaseDeploymentAttemptHelper, callback: (marker: Date) => void) => {
        callback(resource.getDeploymentAttempt().lastModifiedOn);
    }
}