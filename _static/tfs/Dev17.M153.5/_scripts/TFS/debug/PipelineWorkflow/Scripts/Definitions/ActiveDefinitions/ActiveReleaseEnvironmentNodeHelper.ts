import { ComputedDeploymentStatus, PipelineEnvironment, PipelineReleaseApproval } from "PipelineWorkflow/Scripts/Common/Types";
import { IActiveReleaseEnvironmentNodeProps } from "PipelineWorkflow/Scripts/Definitions/ActiveDefinitions/ActiveReleaseEnvironmentNode";
import { IEnvironmentSubStatusInfo, ReleaseEnvironmentStatusHelper, ReleaseEnvironmentStatusIndicator } from "PipelineWorkflow/Scripts/Shared/Utils/ReleaseEnvironmentStatusHelper";
import { ManualInterventionHelper } from "PipelineWorkflow/Scripts/Shared/ReleaseEnvironment/ManualInterventionHelper";

import { ApprovalStatus, ReleaseEnvironment, DeploymentStatus, DeploymentOperationStatus } from "ReleaseManagement/Core/Contracts";

import { publishErrorToTelemetry } from "VSS/Error";

export enum ReleaseEnvironmentTileSize {
    Small = 0,
    Large = 1
}

export interface IActiveFriendlyStatus {
    iconName: string;
}

export class ActiveReleaseEnvironmentNodeHelper {

    public static getStatusText(environment: ReleaseEnvironment): string {
        const computedStatus = this.getComputedStatus(environment);
        return ReleaseEnvironmentStatusHelper.getStatusInfo(computedStatus).statusText as string;
    }

    public static getSubStatusDetailsInfo(environment: ReleaseEnvironment): IEnvironmentSubStatusInfo[] {
        if (!environment || !environment.deploySteps || environment.deploySteps.length <= 0) {
            return [];
        }

        const computedStatus = this.getComputedStatus(environment);
        let deploySteps = environment.deploySteps;
        let latestDeployment = deploySteps.sort((a, b) => {
            return b.attempt - a.attempt;
        })[0];

        const nodeDetailsInfoEvaluator = ReleaseEnvironmentStatusHelper.getStatusInfo(computedStatus).nodeDetailsInfoEvaluator;

        if (!nodeDetailsInfoEvaluator) {
            return [];
        }

        try {
            const nodeDetailsInfo = ReleaseEnvironmentStatusHelper.getStatusInfo(computedStatus).nodeDetailsInfoEvaluator(computedStatus, environment, latestDeployment) as IEnvironmentSubStatusInfo[];

            return nodeDetailsInfo || [];
        }
        catch (exception) {
            publishErrorToTelemetry({
                name: "getStatusInfo",
                message: exception.message || ("Could not get reason text for status: " + computedStatus),
                stack: exception.stack
            });
        }

        return [];
    }

    public static getIcon(statusIndicator: ReleaseEnvironmentStatusIndicator): string {
        const statusInfo = this._statusMap[statusIndicator];
        return statusInfo ? statusInfo.iconName : "";
    }

    public static getBorderColorCssPrefix(environment: ReleaseEnvironment): string {
        const computedStatus = this.getComputedStatus(environment);
        return ReleaseEnvironmentStatusHelper.getStatusInfo(computedStatus).statusIndicator as string;
    }

    public static getNodeProps(releaseEnvironment: PipelineEnvironment, definitionEnvironmentCurrentReleaseMap?: IDictionaryNumberTo<number>, onReleaseFoundCallback?: () => void): IActiveReleaseEnvironmentNodeProps {
        let pendingApprovals: PipelineReleaseApproval[] = [];

        pendingApprovals.push(...releaseEnvironment.preDeployApprovals.filter(app => app.status === ApprovalStatus.Pending));
        pendingApprovals.push(...releaseEnvironment.postDeployApprovals.filter(app => app.status === ApprovalStatus.Pending));

        return {
            environment: releaseEnvironment,
            pendingApprovals: pendingApprovals,
            isLastDeployed: definitionEnvironmentCurrentReleaseMap && definitionEnvironmentCurrentReleaseMap[releaseEnvironment.definitionEnvironmentId] === releaseEnvironment.releaseId,
            onReleaseFound: onReleaseFoundCallback
        } as IActiveReleaseEnvironmentNodeProps;
    }

    public static getComputedStatus(environment: ReleaseEnvironment): ComputedDeploymentStatus {
        if (!environment || !environment.deploySteps || environment.deploySteps.length <= 0) {
            return ComputedDeploymentStatus.NotDeployed;
        }

        const latestDeploymentAttempt = ManualInterventionHelper.getLatestDeploymentAttempt(environment.deploySteps);
        return ReleaseEnvironmentStatusHelper.getComputedStatus(latestDeploymentAttempt.status || DeploymentStatus.Undefined,
            latestDeploymentAttempt.operationStatus || DeploymentOperationStatus.Undefined, environment.status);
    }

    private static _initializeStatusMap(): IDictionaryStringTo<IActiveFriendlyStatus> {
        let statusMap: IDictionaryStringTo<IActiveFriendlyStatus> = {};
        statusMap[ReleaseEnvironmentStatusIndicator.NotDeployed] = { iconName: "Clock" };
        statusMap[ReleaseEnvironmentStatusIndicator.InProgress] = { iconName: "ProgressLoopOuter" };
        statusMap[ReleaseEnvironmentStatusIndicator.PreApprovalPending] = { iconName: "Clock" };
        statusMap[ReleaseEnvironmentStatusIndicator.PostApprovalPending] = { iconName: "Clock" };
        statusMap[ReleaseEnvironmentStatusIndicator.PreEvaluatingGates] = { iconName: "ProgressLoopOuter" };
        statusMap[ReleaseEnvironmentStatusIndicator.PostEvaluatingGates] = { iconName: "ProgressLoopOuter" };
        statusMap[ReleaseEnvironmentStatusIndicator.Succeeded] = { iconName: "SkypeCircleCheck" };
        statusMap[ReleaseEnvironmentStatusIndicator.Canceled] = { iconName: "Blocked" };
        statusMap[ReleaseEnvironmentStatusIndicator.Canceling] = { iconName: "Blocked" };
        statusMap[ReleaseEnvironmentStatusIndicator.Deferred] = { iconName: "Clock" };
        statusMap[ReleaseEnvironmentStatusIndicator.Failed] = { iconName: "StatusErrorFull" };
        statusMap[ReleaseEnvironmentStatusIndicator.Rejected] = { iconName: "StatusErrorFull" };
        statusMap[ReleaseEnvironmentStatusIndicator.Queued] = { iconName: "StatusCircleRing" };
        statusMap[ReleaseEnvironmentStatusIndicator.Scheduled] = { iconName: "Clock" };
        statusMap[ReleaseEnvironmentStatusIndicator.PartiallySucceeded] = { iconName: "AlertSolid" };
        statusMap[ReleaseEnvironmentStatusIndicator.Undefined] = { iconName: "Clock" };
        statusMap[ReleaseEnvironmentStatusIndicator.Pending] = { iconName: "Clock" };
        return statusMap;
    }

    private static _statusMap: IDictionaryStringTo<IActiveFriendlyStatus> = ActiveReleaseEnvironmentNodeHelper._initializeStatusMap();
}