import { ComputedDeploymentStatus } from "PipelineWorkflow/Scripts/Common/Types";
import { ReleaseDeploymentAttemptHelper } from "PipelineWorkflow/Scripts/ReleaseProgress/ReleaseEnvironment/ReleaseDeploymentAttemptHelper";
import { IDeploymentConditionData, IReleaseEnvironmentActionInfo } from "PipelineWorkflow/Scripts/ReleaseProgress/ReleaseEnvironment/ReleaseEnvironmentTypes";
import { ApprovalsNodeProvider } from "PipelineWorkflow/Scripts/ReleaseProgress/Timeline/ApprovalsNodeProvider";
import { ArtifactNodeProvider } from "PipelineWorkflow/Scripts/ReleaseProgress/Timeline/ArtifactNodeProvider";
import { DeploymentNodeProvider } from "PipelineWorkflow/Scripts/ReleaseProgress/Timeline/DeploymentNodeProvider";
import { GatesNodeProvider } from "PipelineWorkflow/Scripts/ReleaseProgress/Timeline/GatesNodeProvider";
import { NowAtNodeProvider } from "PipelineWorkflow/Scripts/ReleaseProgress/Timeline/NowAtNodeProvider";
import { QueueNodeProvider } from "PipelineWorkflow/Scripts/ReleaseProgress/Timeline/QueueNodeProvider";
import * as Types from "PipelineWorkflow/Scripts/ReleaseProgress/Timeline/Timeline.types";
import { TriggerDefinitionNodeProvider } from "PipelineWorkflow/Scripts/ReleaseProgress/Timeline/TriggerDefinitionNodeProvider";
import { TriggerNodeProvider } from "PipelineWorkflow/Scripts/ReleaseProgress/Timeline/TriggerNodeProvider";

import * as RMContracts from "ReleaseManagement/Core/Contracts";

export class TimelineUtils {

    public static getTimelineSnapshotDetailsProvidersList(
        deploymentAttemptHelper: ReleaseDeploymentAttemptHelper,
        environmentExecutionPolicy: RMContracts.EnvironmentExecutionPolicy,
        deploymentActionsMap: IDictionaryStringTo<IReleaseEnvironmentActionInfo>,
        nowAtNodeProvider: NowAtNodeProvider,
        artifactNodeProvider: ArtifactNodeProvider,
        triggerDefinitionNodeProvider: TriggerDefinitionNodeProvider
    ): Types.ITimelineSnapshotDetailsProvider[] {

        let timelineSnapshotDetailsProvidersList: Types.ITimelineSnapshotDetailsProvider[] = [];

        if (deploymentAttemptHelper) {

            // post
            const postDeploymentConditionsData: IDeploymentConditionData = deploymentAttemptHelper.getReleasePostConditionsRuntimeData();
            if (postDeploymentConditionsData) {
                // gates
                if (postDeploymentConditionsData.gatesRuntimeData) {
                    const snapshotDetailsProvider = new GatesNodeProvider(RMContracts.ApprovalType.PostDeploy, deploymentAttemptHelper, deploymentActionsMap);
                    timelineSnapshotDetailsProvidersList.push(snapshotDetailsProvider);
                }

                // approvals
                if (postDeploymentConditionsData.approvalsData && postDeploymentConditionsData.approvalsData.approvalItems) {
                    const snapshotDetailsProvider = new ApprovalsNodeProvider(RMContracts.ApprovalType.PostDeploy, deploymentAttemptHelper, deploymentActionsMap);
                    timelineSnapshotDetailsProvidersList.push(snapshotDetailsProvider);
                }
            }

            // deployment
            let deploymentStatus: ComputedDeploymentStatus = deploymentAttemptHelper.getComputedStatus();
            let isDeploymentInQueuedState = ReleaseDeploymentAttemptHelper.isDeploymentInQueuedState(deploymentStatus);
            if (!isDeploymentInQueuedState || deploymentStatus === ComputedDeploymentStatus.QueuedForAgentDuringDeploy) {
                let inProgressStatus = deploymentAttemptHelper.getOverallInProgressStatus();
                if (inProgressStatus !== null) {
                    const deploymentSnapshotDetailsProvider = new DeploymentNodeProvider(deploymentAttemptHelper, inProgressStatus, deploymentActionsMap, deploymentStatus);
                    timelineSnapshotDetailsProvidersList.push(deploymentSnapshotDetailsProvider);
                }
            }

            // pre
            const preDeploymentConditionsData: IDeploymentConditionData = deploymentAttemptHelper.getReleasePreConditionsRuntimeData();
            if (preDeploymentConditionsData) {
                // gates
                if (preDeploymentConditionsData.gatesRuntimeData) {
                    const snapshotDetailsProvider = new GatesNodeProvider(RMContracts.ApprovalType.PreDeploy, deploymentAttemptHelper, deploymentActionsMap);
                    timelineSnapshotDetailsProvidersList.push(snapshotDetailsProvider);
                }

                // approvals
                if (preDeploymentConditionsData.approvalsData && preDeploymentConditionsData.approvalsData.approvalItems) {
                    const snapshotDetailsProvider = new ApprovalsNodeProvider(RMContracts.ApprovalType.PreDeploy, deploymentAttemptHelper, deploymentActionsMap);
                    timelineSnapshotDetailsProvidersList.push(snapshotDetailsProvider);
                }
            }

            // queue
            if (isDeploymentInQueuedState && deploymentStatus !== ComputedDeploymentStatus.QueuedForAgentDuringDeploy) {
                const queuedSnapshotDetailsProvider = new QueueNodeProvider(deploymentAttemptHelper, deploymentStatus, environmentExecutionPolicy);
                timelineSnapshotDetailsProvidersList.push(queuedSnapshotDetailsProvider);
            }

            // trigger
            let deploymentAttempt = deploymentAttemptHelper.getDeploymentAttempt();
            if (deploymentAttempt && deploymentAttempt.reason) {
                const triggerSnapshotDetailsProvider = new TriggerNodeProvider(deploymentAttempt);
                timelineSnapshotDetailsProvidersList.push(triggerSnapshotDetailsProvider);
            }
        }

        else if (triggerDefinitionNodeProvider) {
            timelineSnapshotDetailsProvidersList.push(triggerDefinitionNodeProvider);
        }

        if (artifactNodeProvider) {
            timelineSnapshotDetailsProvidersList.push(artifactNodeProvider);
        }

        if (nowAtNodeProvider) {
            timelineSnapshotDetailsProvidersList.push(nowAtNodeProvider);
        }

        return timelineSnapshotDetailsProvidersList;
    }

    public static getTimelineSnapshotDetailsFromProvider(provider: Types.ITimelineSnapshotDetailsProvider, instanceId?: string): Types.ITimelineSnapshotDetails {
        return {
            key: provider.getKey(),
            iconProps: provider.getIconProps ? provider.getIconProps() : null,
            onRenderIcon: provider.onRenderIcon,
            initializeSnapshot: provider.getInitializeSnapshot(),
            contentProps: {
                headerData: provider.getHeaderData(instanceId),
                descriptionData: provider.getDescriptionData(),
                children: provider.getAdditionalContent(instanceId)
            } as Types.IEnvironmentTimelineSnapshotProps
        } as Types.ITimelineSnapshotDetails;
    }
}