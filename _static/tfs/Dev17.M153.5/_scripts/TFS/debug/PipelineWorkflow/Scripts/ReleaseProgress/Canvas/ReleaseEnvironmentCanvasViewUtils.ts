import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";

import { LayoutConstants } from "PipelineWorkflow/Scripts/Common/Canvas/LayoutConstants";
import { ComputedDeploymentStatus } from "PipelineWorkflow/Scripts/Common/Types";
import { ReleaseEnvironmentsCanvasViewStore } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleaseEnvironmentsCanvasViewStore";
import { ReleaseProgressNavigateStateActions } from "PipelineWorkflow/Scripts/ReleaseProgress/Constants";
import { LogsTabActionsCreator } from "PipelineWorkflow/Scripts/ReleaseProgress/ContainerTabs/LogsTab/LogsTabActionsCreator";
import { ReleaseEnvironmentHelper } from "PipelineWorkflow/Scripts/ReleaseProgress/ReleaseEnvironment/ReleaseEnvironmentHelper";
import { ReleaseEnvironmentStore } from "PipelineWorkflow/Scripts/ReleaseProgress/ReleaseEnvironment/ReleaseEnvironmentStore";
import { IDeploymentIssues, IEnvironmentSubStatusInfo, IInprogressPhaseStatus, INodeDetailsInfo, IPhaseStatus, ITaskStatus, IJobInfo } from "PipelineWorkflow/Scripts/ReleaseProgress/ReleaseEnvironment/ReleaseEnvironmentTypes";
import { ReleaseEnvironmentIssuesHelper } from "PipelineWorkflow/Scripts/Shared/Environment/ReleaseEnvironmentIssuesHelper";

import { DeployPhaseStatus, TaskStatus } from "ReleaseManagement/Core/Contracts";

import * as NavigationService from "VSS/Navigation/Services";

export class ReleaseEnvironmentCanvasViewUtils {

    public static getCompletedPhasesCount(phaseStatusList: IPhaseStatus[], phasesCount: number): number {
        let completedPhasesCount = 0;
        const completedPhaseStatusArray: DeployPhaseStatus[] =
            [DeployPhaseStatus.Succeeded, DeployPhaseStatus.PartiallySucceeded, DeployPhaseStatus.Skipped, DeployPhaseStatus.Failed, DeployPhaseStatus.Canceled];

        if (phaseStatusList && phasesCount > 0) {
            phaseStatusList.forEach((phaseItem) => {
                if (completedPhaseStatusArray.indexOf(phaseItem.status) > -1) {
                    completedPhasesCount = completedPhasesCount + 1;
                }
            });
        }

        return completedPhasesCount;
    }

    public static getFirstTaskWithStatusFromPhaseInfo(phaseInfo: IInprogressPhaseStatus, taskStateArray: TaskStatus[]): ITaskStatus {
        let taskWithState: ITaskStatus;
        if (phaseInfo && phaseInfo.jobInfoList) {
            for (const job of phaseInfo.jobInfoList) {
                const taskList = job.taskStatusList;
                for (let index = 0; index < taskList.length; index++) {
                    let task = taskList[index];
                    if (taskStateArray.indexOf(task.status) > -1) {
                        taskWithState = task;
                        taskWithState.index = index;
                        break;
                    }
                }
                if (taskWithState) {
                    break;
                }
            }
        }
        return taskWithState;
    }

    public static getErrorCountForPhase(phase: IInprogressPhaseStatus): number {
        let noOfErrors: number = 0;
        const failedStatusArray: TaskStatus[] = [TaskStatus.PartiallySucceeded, TaskStatus.Failed, TaskStatus.Failure];

        if (phase.jobInfoList) {
            phase.jobInfoList.forEach((job) => {
                job.taskStatusList.forEach((task) => {
                    if (failedStatusArray.indexOf(task.status) > -1) {
                        noOfErrors += 1;
                    }
                });
            });
        }

        return noOfErrors;
    }

    public static getNodeHeightHint(environmentInstanceId: string): number {
        // Get the latest copy of environment from environment store. 
        const releaseEnvironmentStore = StoreManager.GetStore(ReleaseEnvironmentStore, environmentInstanceId);
        const updatedEnvironment = releaseEnvironmentStore.getEnvironment();
        const helper = new ReleaseEnvironmentHelper(updatedEnvironment);
        const computedStatus = helper.getComputedStatus();
        const releaseCorePropertiesHeight = LayoutConstants.releaseCorePropertiesHeight;

        switch (computedStatus) {
            case ComputedDeploymentStatus.InProgress:
            case ComputedDeploymentStatus.ManualInterventionPending:
            case ComputedDeploymentStatus.EvaluatingGatesPhase:
                return LayoutConstants.inProgressPhaseContentHeight + releaseCorePropertiesHeight;

            case ComputedDeploymentStatus.EvaluatingPreDeploymentGates:
            case ComputedDeploymentStatus.EvaluatingPostDeploymentGates:
                return LayoutConstants.stabilizationPhaseGatesRendererHeight + releaseCorePropertiesHeight;

            case ComputedDeploymentStatus.Undefined:
                return releaseCorePropertiesHeight;

            default:
                {
                    let subStatusHeight = ReleaseEnvironmentCanvasViewUtils.getEnvironmentSubStatusHeight(helper, environmentInstanceId);
                    return (releaseCorePropertiesHeight + subStatusHeight);
                }
        }
    }

    public static getEnvironmentSubStatusHeight(helper: ReleaseEnvironmentHelper, environmentInstanceId: string): number {
        const releaseEnvironmentStore = StoreManager.GetStore(ReleaseEnvironmentStore, environmentInstanceId);
        let statusInfo = releaseEnvironmentStore.getStatusInfo();
        let noOfSubStatusLines = 0;

        //calucate number of sub status lines including artifacts conditions, issues text to give proper node height hint for the remaining states
        if (statusInfo.nodeDetailsInfo) {
            let nodeDetailsInfo = statusInfo.nodeDetailsInfo as IEnvironmentSubStatusInfo[];
            if (nodeDetailsInfo[0]) {
                noOfSubStatusLines += nodeDetailsInfo[0].data && nodeDetailsInfo[0].data.length;
            }
            else {
                let nodeDetailsInfoPromise = statusInfo.nodeDetailsInfo as IPromise<INodeDetailsInfo[]>;
                if (nodeDetailsInfoPromise) {
                    noOfSubStatusLines += 2;
                }
            }
        }

        let showArtifactConditionsNotMetMessage: boolean = helper.getArtifactConditionsNotMetStatus();
        if (showArtifactConditionsNotMetMessage) {
            noOfSubStatusLines += 1;
        }

        let deploymentIssues: IDeploymentIssues = helper.getIssues();
        let showIssues = false;

        if (deploymentIssues && ReleaseEnvironmentIssuesHelper.showIssues(statusInfo.status)) {
            let issuesCount = ReleaseEnvironmentIssuesHelper.combineIssuesCount(deploymentIssues.phaseLevelIssues.completedPhaseIssues,
                deploymentIssues.phaseLevelIssues.inProgressPhaseIssues,
                deploymentIssues.deploymentLevelIssues);
            if (issuesCount && (issuesCount.errorsCount > 0 || issuesCount.warningsCount > 0)) {
                showIssues = true;
            }
        }

        if (showIssues) {
            noOfSubStatusLines += 1;
        }

        return (noOfSubStatusLines * LayoutConstants.subStatusLineHeight) + (noOfSubStatusLines > 0 ? LayoutConstants.subStatusMargin : 0);
    }

    public static getApprovalsCircleTopMargin(): number {
        return ((LayoutConstants.releaseCorePropertiesHeight - (2 * LayoutConstants.postDeploymentIndicatorElementRadius)) / 2);
    }

    public static getVisibleContributionsCount(environmentInstanceId: string): number {
        const releaseEnvironmentsCanvasViewStore = StoreManager.GetStore(ReleaseEnvironmentsCanvasViewStore);
        return releaseEnvironmentsCanvasViewStore.getVisibleContributions(environmentInstanceId);
    }

    public static navigateToEnvironmentsView(environmentId: string | number, data: Object) {
        NavigationService.getHistoryService().addHistoryPoint(ReleaseProgressNavigateStateActions.ReleaseEnvironmentLogs, data, null, false, true);
    }
}