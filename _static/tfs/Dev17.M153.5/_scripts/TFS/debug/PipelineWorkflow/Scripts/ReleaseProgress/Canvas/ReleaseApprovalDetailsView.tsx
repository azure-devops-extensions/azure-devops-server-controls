/// <reference types="react" />
import * as React from "react";

import * as Base from "DistributedTaskControls/Common/Components/Base";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { OverlayPanelHeading } from "DistributedTaskControls/Components/OverlayPanelHeading";
import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import { OverlayPanelActions } from "DistributedTaskControls/Actions/OverlayPanelActions";
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";

import { List } from "OfficeFabric/List";
import { autobind, css } from "OfficeFabric/Utilities";
import { Icon } from "OfficeFabric/Icon";
import { ActionButton } from "OfficeFabric/Button";

import {
    IReleaseApprovalItemDetailsViewState,
    ReleaseApprovalDetailsViewStore
} from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleaseApprovalDetailsViewStore";
import { ReleaseProgressNavigateStateActions } from "PipelineWorkflow/Scripts/ReleaseProgress/Constants";
import { ApproversAndManualInterventionStatusMessageBar } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ApproversAndManualInterventionStatusMessageBar";
import { ReleaseApprovalListItem, IReleaseApprovalListItemProps } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleaseApprovalsListItem";
import { IReleaseApprovalItem, IReleaseApprovalDeferDeploymentProps } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleaseEnvironmentApprovalTypes";
import { ActionTelemetrySource } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleaseProgressCanvasTelemetryHelper";
import { ReleaseApprovalsActionCreator } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleaseApprovalsActionCreator";
import { LogsTabActionsCreator } from "PipelineWorkflow/Scripts/ReleaseProgress/ContainerTabs/LogsTab/LogsTabActionsCreator";

import { CanvasSelectorConstants } from "PipelineWorkflow/Scripts/ReleaseProgress/Constants";
import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";

import { ReleaseApproval, ReleaseDefinitionApprovals, ReleaseEnvironment, ApprovalType } from "ReleaseManagement/Core/Contracts";
import * as RMUtilsCore from "ReleasePipeline/Scripts/TFS.ReleaseManagement.Utils.Core";

import { IdentityRef } from "VSS/WebApi/Contracts";
import * as NavigationService from "VSS/Navigation/Services";
import * as Utils_Array from "VSS/Utils/Array";
import { HtmlNormalizer } from "VSS/Utils/Html";
import * as Utils_String from "VSS/Utils/String";

import "VSS/LoaderPlugins/Css!RM:PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleaseApprovalDetailsView";

export interface IReleaseApprovalDetailsViewProps extends Base.IProps {
    environmentName: string;
    telemetrySource?: ActionTelemetrySource;
    onApprovalActionCallback?(): void;
}

export abstract class ReleaseApprovalDetailsView extends Base.Component<IReleaseApprovalDetailsViewProps, IReleaseApprovalItemDetailsViewState> {

    public componentWillMount() {

        this._actionsCreator = ActionCreatorManager.GetActionCreator<ReleaseApprovalsActionCreator>(
            ReleaseApprovalsActionCreator, this.props.instanceId);

        this._viewStore = this.getViewStore();
        this._viewStore.addChangedListener(this._onChange);
        this.setState(this._viewStore.getState());
    }

    public componentWillUnmount(): void {
        this._viewStore.removeChangedListener(this._onChange);
    }

    public render(): JSX.Element {
        return (
            <div className="approval-list-items-container">
                {this._getApprovalListItemHeaderSection()}

                <List
                    className="release-approvals-list"
                    onRenderCell={this._onRenderListItem}
                    items={Utils_Array.clone(this.state.approvalsData.approvalItems)} />
            </div>
        );
    }

    private _getApprovalListItemHeaderSection(): JSX.Element {
        return (
            <div role="heading" aria-level={3}>
                {this.state.approvalsData &&
                    <div className="approval-list-items-subHeader">
                        {this._getApprovalInfoElement()}
                    </div>
                }
            </div>
        );
    }

    private _getApprovalInfoElement(): JSX.Element {
        const messageBarClass = css("approvers-message-bar", this.state.approvalsData.overallApprovalsStatus.approvalStatusClassName);
        return (
            <ApproversAndManualInterventionStatusMessageBar
                messageBarClassName={messageBarClass}
                statusIconProps={this.state.approvalsData.overallApprovalsStatus.statusIconProps}
                showTimeout={!!this.state.approvalsData.timeoutTime}
                timeoutTextFormat={Resources.TimeoutText}
                timeoutTimeText={this.state.approvalsData.timeoutTime}
                statusSubText={this.state.approvalsData.policyDescription}
                statusTitleFormat={this.state.approvalsData.overallApprovalsStatus.statusString}
                statusTitleSubText={this.state.approvalsData.overallApprovalsStatus.timeStamp}
                canceledByUserDisplayName={this.state.approvalsData.overallApprovalsStatus.cancelByDisplayName}
                canceledByUserImageUrl={this.state.approvalsData.overallApprovalsStatus.canceledByImageUrl}
            />
        );
    }

    @autobind
    private _onRenderListItem(approvalItem: IReleaseApprovalItem, index: number) {

        return (
            <ReleaseApprovalListItem
                environmentName={this.props.environmentName}
                item={approvalItem}
                showIdentityRevalidationApprovalPolicyInfo={this.state.approvalsData.enforceIdentityRevalidation}
                onApprove={this._onApprove}
                onReject={this._onReject}
                onUpdateOverrideModeEnabled={this._onUpdateOverrideModeEnabled}
                onEnableReassignMode={this._onEnableReassignMode}
                onUpdateIsDeferDeploymentEnabled={this._onUpdateIsDeferDeploymentEnabled}
                onUpdateDeferDeploymentTime={this._onUpdateDeferDeploymentTime}
                onUpdateComments={this._onUpdateComments}
                onErrorMessageDismiss={this._onErrorMessageDismiss}
                onWarningMessageDismiss={this._onWarningMessageDismiss}
                onReassign={this._onReassignClick} />
        );
    }

    @autobind
    private _onEnableReassignMode(approvalId: number, isEnabled: boolean) {
        this._actionsCreator.enableReassignMode(approvalId, isEnabled);
        this._actionsCreator.updateApprovalComments(approvalId, Utils_String.empty);
    }

    @autobind
    private _onReassignClick(snapshot: ReleaseDefinitionApprovals, approval: ReleaseApproval, selectedIdentity: IdentityRef, reassignComment: string, isOverrideModeEnabled: boolean) {
        if (this.props.onApprovalActionCallback) {
            this.props.onApprovalActionCallback();
        }
        let releaseId = this._viewStore.getReleaseId();
        this._actionsCreator.reassign(snapshot, approval, releaseId, selectedIdentity, reassignComment, !!isOverrideModeEnabled, this.props.telemetrySource);
    }

    @autobind
    private _onUpdateOverrideModeEnabled(approvalId: number, isOverrideModeEnabled: boolean): void {
        this._actionsCreator.updateOverrideModeEnabledState(approvalId, isOverrideModeEnabled);
    }

    @autobind
    private _onWarningMessageDismiss(approvalId: number): void {
        this._actionsCreator.dismissWarningMessage(approvalId);
    }

    @autobind
    private _onErrorMessageDismiss(approvalId: number): void {
        this._actionsCreator.dismissErrorMessage(approvalId);
    }

    @autobind
    private _onUpdateIsDeferDeploymentEnabled(approvalId: number, enabled: boolean): void {
        this._actionsCreator.updateIsDeferDeploymentEnabled(approvalId, enabled);
    }

    @autobind
    private _onUpdateDeferDeploymentTime(approvalId: number, time: Date): void {
        this._actionsCreator.updateDeferDeploymentTime(approvalId, time);
    }

    @autobind
    private _onApprove(snapshot: ReleaseDefinitionApprovals, approval: ReleaseApproval, deferDeploymentProps: IReleaseApprovalDeferDeploymentProps, isApprovalOverriden: boolean): void {
        let releaseId = this._viewStore.getReleaseId();
        let environment = this._viewStore.getReleaseEnvironment();
        let isFirstPreDeploymentApprover = this.state.approvalsData.isFirstPreDeploymentApprover;

        if (this.props.onApprovalActionCallback) {
            this.props.onApprovalActionCallback();
        }

        if (approval.approvalType === ApprovalType.PreDeploy) {

            let isDeferDeploymentEnabled = !!(deferDeploymentProps && deferDeploymentProps.isDeferDeploymentEnabled);

            let scheduledDeploymentTime = null;
            if (isDeferDeploymentEnabled) {
                scheduledDeploymentTime = deferDeploymentProps.scheduledDeploymentTime;
            }

            // defer and approve is only pre approval scenario
            this._actionsCreator.deferAndApprove(scheduledDeploymentTime, environment, snapshot, approval, releaseId, isFirstPreDeploymentApprover, !!isApprovalOverriden, this.props.telemetrySource);
        }
        else {
            this._actionsCreator.approve(snapshot, approval, releaseId, environment, isFirstPreDeploymentApprover, false, !!isApprovalOverriden, this.props.telemetrySource);
        }
    }

    @autobind
    private _onReject(snapshot: ReleaseDefinitionApprovals, approval: ReleaseApproval, isApprovalOverriden: boolean): void {
        if (this.props.onApprovalActionCallback) {
            this.props.onApprovalActionCallback();
        }

        let releaseId = this._viewStore.getReleaseId();
        this._actionsCreator.reject(snapshot, approval, releaseId, !!isApprovalOverriden, this.props.telemetrySource);
    }

    @autobind
    private _onUpdateComments(approvalId: number, comments: string): void {
        this._actionsCreator.updateApprovalComments(approvalId, comments);
    }

    private _onChange = () => {
        this.setState(this._viewStore.getState());
    }

    protected abstract getViewStore(): ReleaseApprovalDetailsViewStore;
    private _viewStore: ReleaseApprovalDetailsViewStore;
    private _actionsCreator: ReleaseApprovalsActionCreator;
}