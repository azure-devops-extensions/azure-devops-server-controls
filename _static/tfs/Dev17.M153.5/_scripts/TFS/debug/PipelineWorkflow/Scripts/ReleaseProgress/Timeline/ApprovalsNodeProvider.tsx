import * as React from "react";

import { FriendlyDate, PastDateMode } from "DistributedTaskControls/Common/FriendlyDate";

import { PrimaryButton } from "OfficeFabric/Button";
import { css } from "OfficeFabric/Utilities";

import { IReleaseApprovalItem } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleaseEnvironmentApprovalTypes";
import { ReleaseApprovalListHelper } from "PipelineWorkflow/Scripts/ReleaseProgress/ReleaseEnvironment/ReleaseApprovalListHelper";
import { ReleaseApprovalListHelperUtility } from "PipelineWorkflow/Scripts/ReleaseProgress/ReleaseEnvironment/ReleaseApprovalListHelperUtility";
import { ReleaseDeploymentAttemptHelper } from "PipelineWorkflow/Scripts/ReleaseProgress/ReleaseEnvironment/ReleaseDeploymentAttemptHelper";
import { ActionClickTarget, IDeploymentConditionData, IReleaseEnvironmentActionInfo, ReleaseEnvironmentAction } from "PipelineWorkflow/Scripts/ReleaseProgress/ReleaseEnvironment/ReleaseEnvironmentTypes";
import * as Types from "PipelineWorkflow/Scripts/ReleaseProgress/Timeline/Timeline.types";
import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";
import { DateTimeUtils } from "PipelineWorkflow/Scripts/Shared/Utils/DateTimeUtils";
import { IdentityHelper } from "PipelineWorkflow/Scripts/Shared/Utils/IdentityHelper";

import * as RMContracts from "ReleaseManagement/Core/Contracts";

import { empty, localeFormat } from "VSS/Utils/String";
import { VssIconType, IVssIconProps } from "VSSUI/VssIcon";

import { FormatComponent } from "VSSPreview/Flux/Components/Format";

export class ApprovalsNodeProvider implements Types.ITimelineSnapshotDetailsProvider {

    public constructor(
        private _type: RMContracts.ApprovalType,
        private _deploymentAttemptHelper: ReleaseDeploymentAttemptHelper,
        private _deploymentActionsMap: IDictionaryStringTo<IReleaseEnvironmentActionInfo>
    ) {
        switch (this._type) {
            case RMContracts.ApprovalType.PreDeploy:
                this._deploymentConditionsData = this._deploymentAttemptHelper.getReleasePreConditionsRuntimeData();
                this._approvalListHelper = this._deploymentAttemptHelper.getReleasePreDeploymentConditionsHelper().approvalListHelper;
                break;
            case RMContracts.ApprovalType.PostDeploy:
                this._deploymentConditionsData = this._deploymentAttemptHelper.getReleasePostConditionsRuntimeData();
                this._approvalListHelper = this._deploymentAttemptHelper.getReleasePostDeploymentConditionsHelper().approvalListHelper;
                break;
        }

        this._approvalStatus = this._deploymentConditionsData.approvalsData.overallApprovalsStatus
            ? this._deploymentConditionsData.approvalsData.overallApprovalsStatus.approvalStatus
            : null;
    }

    public getKey(): string {
        return "approvals-snapshot-" + this._type;
    }

    public getIconProps(): IVssIconProps {
        let iconProp = {iconType: VssIconType.fabric} as IVssIconProps;

        switch (this._approvalStatus) {
            case RMContracts.ApprovalStatus.Approved:
                iconProp.iconName = "UserFollowed";
                iconProp.className = "approval-approved";
                break;
            case RMContracts.ApprovalStatus.Canceled:
            case RMContracts.ApprovalStatus.Rejected:
                iconProp.iconName = "UserRemove";
                iconProp.className = "approval-rejected";
                break;
            default:
                iconProp.iconName = "Contact";
                iconProp.className = "approval-default";
                break;
        }

        return iconProp;
    }

    public getInitializeSnapshot(): Types.InitializeSnapshot {
        let initializeSnapshot = this._defaultInitializeSnapshot;

        switch (this._type) {
            case RMContracts.ApprovalType.PreDeploy:
                initializeSnapshot = this._initializePreApprovalsSnapshot;
                break;
            case RMContracts.ApprovalType.PostDeploy:
                initializeSnapshot = this._initializePostApprovalsSnapshot;
                break;
        }

        return initializeSnapshot;
    }

    public getHeaderData(instanceId?: string): Types.ISnapshotHeaderData {
        let headerFormat = empty;

        switch (this._approvalStatus) {
            case RMContracts.ApprovalStatus.Approved:
            case RMContracts.ApprovalStatus.Skipped:
                headerFormat = Resources.TimelineHeaderApprovalSucceeded;
                break;
            case RMContracts.ApprovalStatus.Rejected:
                headerFormat = Resources.TimelineHeaderApprovalRejected;
                break;
            case RMContracts.ApprovalStatus.Canceled:
                headerFormat = Resources.TimelineHeaderApprovalCanceled;
                break;
            case RMContracts.ApprovalStatus.Pending:
            case RMContracts.ApprovalStatus.Reassigned:
            case RMContracts.ApprovalStatus.Undefined:
            default:
                headerFormat = Resources.TimelineHeaderApprovalPending;
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

        const approvalActionInfo = this._getApprovalActionInfo();
        const onClick = this._onApproveClick(approvalActionInfo, instanceId);

        return {
            name: localeFormat(headerFormat, typePrefix),
            tooltip: localeFormat(Resources.ViewApprovalsTooltipFormat, typePrefix.toLocaleLowerCase()),
            onClick: onClick
        } as Types.ISnapshotHeaderData;
    }

    public getDescriptionData(): Types.SnapshotDescriptionDataType {
        let descriptionData: Types.ISnapshotDescriptionData = null;
        let deploymentDeferredElement: JSX.Element = null;

        if (this._deploymentConditionsData.approvalsData.overallApprovalsStatus) {
            switch (this._deploymentConditionsData.approvalsData.overallApprovalsStatus.approvalStatus) {
                case RMContracts.ApprovalStatus.Approved:
                case RMContracts.ApprovalStatus.Skipped:
                    let approvers: Types.IDescriptionUser[] = [];
                    if (this._deploymentConditionsData.approvalsData.approvalItems) {
                        approvers = this._deploymentConditionsData.approvalsData.approvalItems.map((approvalItem: IReleaseApprovalItem) => {
                            return {
                                displayName: approvalItem.name,
                                imageUrl: approvalItem.iconProps.url
                            } as Types.IDescriptionUser;
                        });
                    }
                    descriptionData = {
                        timeStamp: this._deploymentConditionsData.approvalsData.overallApprovalsStatus.timeStamp,
                        timeStampDescriptionPrefix: Resources.TimelineDescriptionApprovedPrefix,
                        users: approvers
                    } as Types.ISnapshotDescriptionData;

                    const environment = this._deploymentAttemptHelper.getReleaseEnvironment();
                    if (environment && environment.scheduledDeploymentTime) {
                        // deferred approval scenario
                        const approvals = this._getReleaseApprovalsFromDeploymentData(this._deploymentConditionsData);
                        descriptionData.timeStamp = DateTimeUtils.getLocaleTimestamp(ReleaseApprovalListHelperUtility.getOverallMaxModifiedOnDate(approvals));

                        const deferredTimeString: string = DateTimeUtils.getLocaleTimestamp(environment.scheduledDeploymentTime);
                        deploymentDeferredElement = (
                            <FormatComponent format={Resources.TimelineDescriptionDeploymentDeferred} elementType="div">
                                <span className="text-highlight">{deferredTimeString}</span>
                            </FormatComponent>
                        );
                    }

                    break;
                case RMContracts.ApprovalStatus.Canceled:
                    descriptionData = {
                        text: Resources.TimelineDescriptionDeploymentCanceledPrefix
                    } as Types.ISnapshotDescriptionData;
                    break;
                case RMContracts.ApprovalStatus.Rejected:
                    descriptionData = {
                        users: [{
                            displayName: this._deploymentConditionsData.approvalsData.overallApprovalsStatus.cancelByDisplayName,
                            imageUrl: this._deploymentConditionsData.approvalsData.overallApprovalsStatus.canceledByImageUrl
                        }],
                        timeStamp: this._deploymentConditionsData.approvalsData.overallApprovalsStatus.timeStamp,
                        timeStampDescriptionPrefix: Resources.TimelineDescriptionRejectedPrefix
                    } as Types.ISnapshotDescriptionData;
                    break;
                case RMContracts.ApprovalStatus.Pending:
                case RMContracts.ApprovalStatus.Reassigned:
                    const approvalStartTime = this._getApprovalsStartTime(this._deploymentConditionsData);
                    if (approvalStartTime) {
                        const pendingApprovals = this._approvalListHelper.getAllActionablePendingApprovals();
                        if (pendingApprovals) {
                            const pendingApprovers: Types.IDescriptionUser[] = pendingApprovals.map((approval: RMContracts.ReleaseApproval) => {
                                return {
                                    displayName: approval.approver.displayName,
                                    imageUrl: IdentityHelper.getIdentityAvatarUrl(approval.approver)
                                } as Types.IDescriptionUser;
                            });
                            descriptionData = {
                                timeStamp: approvalStartTime,
                                format: (pendingApprovers.length > 1 ? Resources.TimelineDescriptionApprovalPendingOnMultipleSinceFormat : Resources.TimelineDescriptionApprovalPendingOnSinceFormat),
                                users: pendingApprovers
                            } as Types.ISnapshotDescriptionData;
                        }
                        else {
                            descriptionData = {
                                text: new FriendlyDate(new Date(approvalStartTime), PastDateMode.since, true).toString()
                            } as Types.ISnapshotDescriptionData;
                        }
                    }
                    break;
                case RMContracts.ApprovalStatus.Undefined:
                default:
                    const date = this._getApprovalsStartTime(this._deploymentConditionsData);
                    if (date) {
                        descriptionData = {
                            text: new FriendlyDate(new Date(date), PastDateMode.since, true).toString()
                        } as Types.ISnapshotDescriptionData;
                    }
                    break;
            }
        }

        return deploymentDeferredElement ? [descriptionData, ({ descriptionElement: deploymentDeferredElement } as Types.ISnapshotDescriptionData)] : descriptionData;
    }

    public getAdditionalContent(instanceId?: string): JSX.Element {
        switch (this._approvalStatus) {
            case RMContracts.ApprovalStatus.Rejected:
                let approvals = this._getReleaseApprovalsFromDeploymentData(this._deploymentConditionsData);
                let approvalWithMaxModifiedOnDate = ReleaseApprovalListHelperUtility.getApprovalWithMaxModifiedOnDate(approvals);
                if (!(approvalWithMaxModifiedOnDate.comments && approvalWithMaxModifiedOnDate.comments.trim())) {
                    return null;
                }
                return (
                    <div>
                        {approvalWithMaxModifiedOnDate.comments}
                    </div>
                );
            case RMContracts.ApprovalStatus.Pending:
            case RMContracts.ApprovalStatus.Reassigned:
            case RMContracts.ApprovalStatus.Undefined:
                if (this._deploymentActionsMap) {
                    let approvalActionInfo = this._getApprovalActionInfo();
                    if (approvalActionInfo && approvalActionInfo.isVisible) {
                        return (
                            <PrimaryButton
                                onClick={this._onApproveClick(approvalActionInfo, instanceId)}
                                disabled={approvalActionInfo.isDisabled}>
                                {approvalActionInfo.actionText}
                            </PrimaryButton>
                        );
                    }
                }
            default:
                return null;
        }
    }

    private _getApprovalActionInfo(): IReleaseEnvironmentActionInfo {
        let approvalAction = ReleaseEnvironmentAction.PreDeployApprove;

        switch (this._type) {
            case RMContracts.ApprovalType.PreDeploy:
                approvalAction = ReleaseEnvironmentAction.PreDeployApprove;
                break;
            case RMContracts.ApprovalType.PostDeploy:
                approvalAction = ReleaseEnvironmentAction.PostDeployApprove;
                break;
        }

        return this._deploymentActionsMap[approvalAction];
    }

    private _onApproveClick(approvalActionInfo: IReleaseEnvironmentActionInfo, instanceId?: string) {
        const envName = this._deploymentAttemptHelper.getReleaseEnvironment().name;
        return () => {
            approvalActionInfo.onExecute(instanceId, ActionClickTarget.environmentSummary, envName);
        };
    }

    private _defaultInitializeSnapshot = (resource: ReleaseDeploymentAttemptHelper, callback: (marker: Date) => void) => {
        callback(null);
    }

    private _initializePreApprovalsSnapshot = (resource: ReleaseDeploymentAttemptHelper, callback: (marker: Date) => void) => {
        callback(this._getApprovalsStartTime(resource.getReleasePreConditionsRuntimeData()));
    }

    private _initializePostApprovalsSnapshot = (resource: ReleaseDeploymentAttemptHelper, callback: (marker: Date) => void) => {
        callback(this._getApprovalsStartTime(resource.getReleasePostConditionsRuntimeData()));
    }

    private _getApprovalsStartTime(deploymentConditionsData: IDeploymentConditionData): Date {
        if (deploymentConditionsData && deploymentConditionsData.approvalsData && deploymentConditionsData.approvalsData.approvalItems) {
            return ReleaseApprovalListHelperUtility.getOverallMinCreatedOnDate(
                this._getReleaseApprovalsFromDeploymentData(deploymentConditionsData)
            );
        }

        return null;
    }

    private _getReleaseApprovalsFromDeploymentData(deploymentConditionsData: IDeploymentConditionData): RMContracts.ReleaseApproval[] {
        return deploymentConditionsData.approvalsData.approvalItems.map((approvalItem: IReleaseApprovalItem) => { return approvalItem.approval; });
    }

    private _approvalStatus: RMContracts.ApprovalStatus;
    private _deploymentConditionsData: IDeploymentConditionData;
    private _approvalListHelper: ReleaseApprovalListHelper;
}