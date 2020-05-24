import * as React from "react";

import { FriendlyDate, PastDateMode } from "DistributedTaskControls/Common/FriendlyDate";

import { css } from "OfficeFabric/Utilities";

import { ReleaseDeploymentAttemptHelper } from "PipelineWorkflow/Scripts/ReleaseProgress/ReleaseEnvironment/ReleaseDeploymentAttemptHelper";
import { ReleaseEnvironmentGatesViewType } from "PipelineWorkflow/Scripts/ReleaseProgress/ReleaseEnvironment/ReleaseEnvironmentGatesTypes";
import { ActionClickTarget, IDeploymentConditionData, IReleaseEnvironmentActionInfo, ReleaseEnvironmentAction } from "PipelineWorkflow/Scripts/ReleaseProgress/ReleaseEnvironment/ReleaseEnvironmentTypes";
import { IFailedGatesCount, ReleaseGateHelper } from "PipelineWorkflow/Scripts/ReleaseProgress/ReleaseEnvironment/ReleaseGateHelper";
import { IGatesStatusMessage, ReleaseGatesListHelper } from "PipelineWorkflow/Scripts/ReleaseProgress/ReleaseEnvironment/ReleaseGatesListHelper";
import * as Types from "PipelineWorkflow/Scripts/ReleaseProgress/Timeline/Timeline.types";
import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";

import * as RMContracts from "ReleaseManagement/Core/Contracts";

import { empty, localeFormat } from "VSS/Utils/String";
import { VssIconType, IVssIconProps } from "VSSUI/VssIcon";

export class GatesNodeProvider implements Types.ITimelineSnapshotDetailsProvider {

    public constructor(
        private _type: RMContracts.ApprovalType,
        private _deploymentAttemptHelper: ReleaseDeploymentAttemptHelper,
        private _deploymentActionsMap: IDictionaryStringTo<IReleaseEnvironmentActionInfo>
    ) {
        switch (this._type) {
            case RMContracts.ApprovalType.PreDeploy:
                this._deploymentConditionsData = this._deploymentAttemptHelper.getReleasePreConditionsRuntimeData();
                this._releaseGatesListHelper = this._deploymentAttemptHelper.getReleasePreDeploymentConditionsHelper().gatesListHelper;
                break;
            case RMContracts.ApprovalType.PostDeploy:
                this._deploymentConditionsData = this._deploymentAttemptHelper.getReleasePostConditionsRuntimeData();
                this._releaseGatesListHelper = this._deploymentAttemptHelper.getReleasePostDeploymentConditionsHelper().gatesListHelper;
                break;
        }

        this._latestCompletedDeploymentJob = this._releaseGatesListHelper.getLatestCompletedEvaluationJob();
        if (this._latestCompletedDeploymentJob) {
            this._releaseGateHelper = this._releaseGatesListHelper.getReleaseGateHelper(this._latestCompletedDeploymentJob);
        }
        this._gatesViewType = this._deploymentConditionsData.gatesRuntimeData.gatesStatus
            ? this._deploymentConditionsData.gatesRuntimeData.gatesStatus.gatesViewType
            : null;
    }

    public getKey(): string {
        return "gates-snapshot-" + this._type;
    }

    public getIconProps(): IVssIconProps {
        let iconProp = {iconType: VssIconType.fabric} as IVssIconProps;

        switch (this._gatesViewType) {
            case ReleaseEnvironmentGatesViewType.Succeeded:
                iconProp.iconName = "ReleaseGateCheck";
                iconProp.className = "gate-succeeded";
                break;
            case ReleaseEnvironmentGatesViewType.Canceled:
                iconProp.iconName = "ReleaseGateError";
                iconProp.className = "gate-canceled";
                break;
            case ReleaseEnvironmentGatesViewType.Failed:
                iconProp.iconName = "ReleaseGateError";
                iconProp.className = "gate-failed";
                break;
            default:
                iconProp.iconName = "ReleaseGate";
                iconProp.className = "gate-default";
                break;
        }

        return iconProp;
    }

    public getInitializeSnapshot(): Types.InitializeSnapshot {
        let initializeSnapshot = this._defaultInitializeSnapshot;

        switch (this._type) {
            case RMContracts.ApprovalType.PreDeploy:
                initializeSnapshot = this._initializePreGatesSnapshot;
                break;
            case RMContracts.ApprovalType.PostDeploy:
                initializeSnapshot = this._initializePostGatesSnapshot;
                break;
        }

        return initializeSnapshot;
    }

    public getHeaderData(instanceId?: string): Types.ISnapshotHeaderData {
        let headerFormat = empty;

        switch (this._gatesViewType) {
            case ReleaseEnvironmentGatesViewType.Succeeded:
                headerFormat = Resources.GatesSucceededTooltipFormat;
                break;
            case ReleaseEnvironmentGatesViewType.Failed:
                headerFormat = Resources.GatesFailedTooltipFormat;
                break;
            case ReleaseEnvironmentGatesViewType.Canceled:
                headerFormat = Resources.GatesCanceledTooltipFormat;
                break;
            case ReleaseEnvironmentGatesViewType.Evaluating:
            case ReleaseEnvironmentGatesViewType.Stabilizing:
            case ReleaseEnvironmentGatesViewType.WaitingOnExitConditions:
                headerFormat = Resources.TimelineHeaderGatesProcessing;
                break;
            case ReleaseEnvironmentGatesViewType.NotStarted:
            default:
                headerFormat = Resources.TimelineHeaderGatesPending;
                break;
        }

        let typePrefix = empty;

        switch (this._type) {
            case RMContracts.ApprovalType.PreDeploy:
                typePrefix = Resources.PreDeploymentText;
                break;
            case RMContracts.ApprovalType.PostDeploy:
                typePrefix = Resources.PostDeploymentText;
                break;
        }

        const gateActionInfo = this._getGateActionInfo();
        const onClick = this._onGateClick(gateActionInfo, instanceId);

        return {
            name: localeFormat(headerFormat, typePrefix),
            tooltip: localeFormat(Resources.ViewGatesTooltipFormat, typePrefix.toLocaleLowerCase()),
            onClick: onClick
        } as Types.ISnapshotHeaderData;
    }

    public getDescriptionData(): Types.SnapshotDescriptionDataType {
        let descriptionData: Types.ISnapshotDescriptionData = null;

        switch (this._gatesViewType) {
            case ReleaseEnvironmentGatesViewType.Succeeded:
                descriptionData = {
                    timeStampDescriptionPrefix: Resources.TimelineDescriptionGatesSucceededPrefix,
                    timeStamp: this._deploymentConditionsData.gatesRuntimeData.gatesCompleteTime
                } as Types.ISnapshotDescriptionData;
                break;
            case ReleaseEnvironmentGatesViewType.Failed:
                descriptionData = {
                    timeStampDescriptionPrefix: localeFormat(Resources.TimelineDescriptionGatesFailedTimeoutPrefix, this._getFailedGatesFraction()),
                    timeStamp: this._deploymentConditionsData.gatesRuntimeData.gatesCompleteTime
                } as Types.ISnapshotDescriptionData;
                break;
            case ReleaseEnvironmentGatesViewType.Canceled:
                descriptionData = {
                    text: Resources.TimelineDescriptionDeploymentCanceledPrefix
                } as Types.ISnapshotDescriptionData;
                break;
            case ReleaseEnvironmentGatesViewType.WaitingOnExitConditions:
            // todo: design not final for this state. currently showing same as evaluating
            case ReleaseEnvironmentGatesViewType.Evaluating:
                const nextSampleInText = localeFormat(Resources.GatesNextSampleTimeText, this._releaseGatesListHelper.getNextSampleDetails(new Date()).text).toLocaleLowerCase();
                if (this._releaseGateHelper) {
                    descriptionData = {
                        timeStampDescriptionPrefix: localeFormat(Resources.TimelineDescriptionGatesFailedPrefix, this._getFailedGatesFraction()),
                        timeStamp: this._latestCompletedDeploymentJob.job.startTime,
                        timeStampDescriptionSuffix: nextSampleInText
                    } as Types.ISnapshotDescriptionData;
                }
                else {
                    descriptionData = {
                        text: localeFormat(Resources.TimelineDescriptionWithSuffixFormat, Resources.GatesNoSamplesYet, nextSampleInText)
                    } as Types.ISnapshotDescriptionData;
                }
                break;
            case ReleaseEnvironmentGatesViewType.Stabilizing:
                const estimatedStabilizationEndTimeDetails: IGatesStatusMessage = this._releaseGatesListHelper.getEstimatedStabilizationCompletionTimeDetails(new Date());
                descriptionData = {
                    text: estimatedStabilizationEndTimeDetails.subText ? estimatedStabilizationEndTimeDetails.subText : Resources.GatesDelayInProgress
                } as Types.ISnapshotDescriptionData;
                break;
            case ReleaseEnvironmentGatesViewType.NotStarted:
            default:
                descriptionData = {
                    text: new FriendlyDate(new Date(this._deploymentConditionsData.gatesRuntimeData.gatesStartTime), PastDateMode.since, true).toString()
                } as Types.ISnapshotDescriptionData;
                break;
        }

        return descriptionData;
    }

    public getAdditionalContent(): JSX.Element {
        if (this._releaseGateHelper && this._gatesViewType === ReleaseEnvironmentGatesViewType.Failed) {
            const failedGatesList: string[] = this._releaseGateHelper.getFailedGatesNames();

            if (failedGatesList && failedGatesList.length > 0) {
                const failedGatesElement: JSX.Element[] = failedGatesList.map((gate: string, index: number) => {
                    return (<span key={index}>{gate}</span>);
                });
                return (
                    <div>
                        <span className="content-header">{Resources.FailedGatesText}</span>
                        <br />
                        {failedGatesElement}
                    </div>
                );
            }
        }
        return null;
    }

    private _getFailedGatesFraction(): string {
        if (this._releaseGateHelper) {
            let failedGatesCount: IFailedGatesCount = this._releaseGateHelper.getFailedGatesCount();
            if (failedGatesCount) {
                const failedGatesFractionString = localeFormat(Resources.XOutOfY, failedGatesCount.failedGates, failedGatesCount.totalGates);
                return failedGatesFractionString;
            }
        }

        return null;
    }

    private _getGateActionInfo(): IReleaseEnvironmentActionInfo {
        let gateAction = ReleaseEnvironmentAction.PreDeployGate;

        switch (this._type) {
            case RMContracts.ApprovalType.PreDeploy:
                gateAction = ReleaseEnvironmentAction.PreDeployGate;
                break;
            case RMContracts.ApprovalType.PostDeploy:
                gateAction = ReleaseEnvironmentAction.PostDeployGate;
                break;
        }

        return this._deploymentActionsMap[gateAction];
    }

    private _onGateClick(gateActionInfo: IReleaseEnvironmentActionInfo, instanceId?: string) {
        const envName = this._deploymentAttemptHelper.getReleaseEnvironment().name;
        return () => {
            gateActionInfo.onExecute(instanceId, ActionClickTarget.environmentSummary, envName);
        };
    }

    private _defaultInitializeSnapshot = (resource: ReleaseDeploymentAttemptHelper, callback: (marker: Date) => void) => {
        callback(null);
    }

    private _initializePreGatesSnapshot = (resource: ReleaseDeploymentAttemptHelper, callback: (marker: Date) => void) => {
        callback(this._getGatesStartTime(resource.getReleasePreConditionsRuntimeData()));
    }

    private _initializePostGatesSnapshot = (resource: ReleaseDeploymentAttemptHelper, callback: (marker: Date) => void) => {
        callback(this._getGatesStartTime(resource.getReleasePostConditionsRuntimeData()));
    }

    private _getGatesStartTime(deploymentConditionsData: IDeploymentConditionData): Date {
        if (deploymentConditionsData && deploymentConditionsData.gatesRuntimeData) {
            return deploymentConditionsData.gatesRuntimeData.gatesStartTime;
        }
        return null;
    }

    private _gatesViewType: ReleaseEnvironmentGatesViewType;
    private _deploymentConditionsData: IDeploymentConditionData;
    private _releaseGatesListHelper: ReleaseGatesListHelper;
    private _latestCompletedDeploymentJob: RMContracts.DeploymentJob;
    private _releaseGateHelper: ReleaseGateHelper;
}