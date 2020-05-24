/// <reference types="react" />
import * as React from "react";

import * as Base from "DistributedTaskControls/Common/Components/Base";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import { MessageBarComponent } from "DistributedTaskControls/Components/MessageBarComponent";
import { StringInputComponent } from "DistributedTaskControls/SharedControls/InputControls/Components/StringInputComponent";

import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";
import { IReleaseManualInterventionDetailsViewStoreState, ReleaseManualInterventionDetailsViewStore } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleaseManualInterventionDetailsViewStore";
import { ReleaseManualInterventionActionCreator } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleaseManualInterventionActionCreator";
import { ReleaseManualInterventionStatusHelper } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleaseManualInterventionStatusHelper";
import { ApproversAndManualInterventionStatusMessageBar } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ApproversAndManualInterventionStatusMessageBar";
import { ReleaseStore } from "PipelineWorkflow/Scripts/ReleaseProgress/Release/ReleaseStore";
import { ReleaseEnvironmentCanvasViewUtils } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleaseEnvironmentCanvasViewUtils";
import { CustomOverlayPanelHeading } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/CustomOverlayPanelHeading";
import { ActionTelemetrySource } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleaseProgressCanvasTelemetryHelper";

import { DefaultButton, PrimaryButton } from "OfficeFabric/Button";
import { Label } from "OfficeFabric/Label";
import { MessageBarType } from "OfficeFabric/MessageBar";
import { TooltipHost, TooltipOverflowMode } from "VSSUI/Tooltip";
import { autobind, css } from "OfficeFabric/Utilities";

import { ManualInterventionStatus } from "ReleaseManagement/Core/Contracts";

import * as Utils_String from "VSS/Utils/String";
import { IdentityDetailsProvider } from "VSSPreview/Providers/IdentityDetailsProvider";
import { Status, StatusSize } from "VSSUI/Status";
import { VssPersona } from "VSSUI/VssPersona";

import "VSS/LoaderPlugins/Css!RM:PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleaseManualInterventionDetailsView";

export const MessageContainer = ({ label, infoText, className = "" }) => (
    <div className={"section-container"}>
        { label &&
            <Label>
                {label}
            </Label>
        }
        <div className={css("message-container", className)}>
            {infoText}
        </div>
    </div>
);

export interface IReleaseManualInterventionDetailsViewProps extends Base.IProps {
    hasManageDeploymentsPermissions: boolean;
    hideViewLogsAction?: boolean;
    invokedSource?: ActionTelemetrySource;
    environmentId: number;
    environmentName: string;
}

export class ReleaseManualInterventionDetailsView extends Base.Component<IReleaseManualInterventionDetailsViewProps, IReleaseManualInterventionDetailsViewStoreState> {

    public componentWillMount() {
        this._releaseManualInterventionDetailsViewStore = StoreManager.GetStore<ReleaseManualInterventionDetailsViewStore>(ReleaseManualInterventionDetailsViewStore, this.props.instanceId);
        this._releaseManualInterventionDetailsViewStore.addChangedListener(this._onStoreChange);

        this._releaseManualInterventionActionCreator = ActionCreatorManager.GetActionCreator<ReleaseManualInterventionActionCreator>(ReleaseManualInterventionActionCreator, this.props.instanceId);

        this.setState(this._releaseManualInterventionDetailsViewStore.getState());
    }

    public componentWillUnmount() {
        this._releaseManualInterventionDetailsViewStore.removeChangedListener(this._onStoreChange);
    }

    public render(): JSX.Element {
        return (
            <div className={"cd-release-progress-manual-intervention"}>
                {this._getHeaderElement()}
                {this._getMessageBarSection()}
                {this._getInstructionsSection()}
                {this._getStatusBasedComponent()}
            </div>
        );
    }

    private _getStatusBasedComponent(): JSX.Element {
        switch (this.state.status) {
            case ManualInterventionStatus.Approved:
            case ManualInterventionStatus.Rejected:
            case ManualInterventionStatus.Canceled:
                return this._getCompletedApprovalSection();

            case ManualInterventionStatus.Pending:
                return this._getPendingApprovalSection();

            default:
                return null;
        }
    }

    private _getPendingApprovalSection(): JSX.Element {
        return (<div className="manual-intervention-pending-section">
            {this._getCommentSection()}
            {this._getErrorComponent()}
            {this._getActionButtons()}
        </div>);
    }

    private _getCompletedApprovalSection(): JSX.Element {
        return (<div className="manual-intervention-completed-approval-section">
            {this._getUserDetailsView()}
            {this._getApprovalComment()}
        </div>);
    }

    private _getUserDetailsView(): JSX.Element {
        const statusStyle = ReleaseManualInterventionStatusHelper.getStatusStyle(this.state.status);
        const statusIconProps = ReleaseManualInterventionStatusHelper.getStatusIconProps(this.state.status);
        const statusText: string = ReleaseManualInterventionStatusHelper.getStatusText(this.state.status);
        const statusTextStyle: string = css("manual-intervention-status-text", statusStyle);

        return this.state.approverIdentity && (<div className="manual-intervention-approval-info">
            {
                !this.state.imageError && this.state.approverIdentity.imageUrl &&
                <VssPersona
                    cssClass="manual-intervention-approval-info-left"
                    onImageError={this._onImageError}
                    identityDetailsProvider={new IdentityDetailsProvider(this.state.approverIdentity, this.state.manualInterventionId.toString())} />
            }
            <div className="manual-intervention-approval-info-right">
                <TooltipHost content={this.state.approverIdentity.displayName} overflowMode={TooltipOverflowMode.Parent}>
                    {this.state.approverIdentity.displayName}
                </TooltipHost>
                <div className="manual-intervention-approval-status">
                    <Status {...statusIconProps} className="manual-intervention-status-icon" size={StatusSize.s} />
                    <span className={statusTextStyle}>{statusText}</span>
                </div>
            </div>
        </div>);
    }

    private _onImageError = (): void => {
        this.setState({ imageError: true });
    }

    private _getApprovalComment(): JSX.Element {
        return this.state.comment &&
            <div className={"section-container"}>
                <Label>{Resources.Comment}</Label>
                {this.state.comment}
            </div>;
    }

    private _getHeaderElement(): JSX.Element {
        return (
            <CustomOverlayPanelHeading
                header={this.props.environmentName}
                descriptionLabel={this.state.manualInterventionName}
                hideDotIcon={true}
                showActions={!this.props.hideViewLogsAction}
                actionIconName={"ReplyMirrored"}
                actionLabel={Resources.ViewLogsButtonText}
                onClick={this._onViewLogsClick}
            />
        );
    }

    private _getInstructionsSection(): JSX.Element {
        return this.state.instructions &&
            <MessageContainer
                infoText={this.state.instructions}
                label={Resources.Instructions}
                className={"display-line-break"} />;
    }

    private _getCommentSection(): JSX.Element {
        return this.props.hasManageDeploymentsPermissions &&
            (<div className={"section-container"}>
                <Label>
                    {Resources.Comment}
                </Label>
                <StringInputComponent
                    value={this.state.comment}
                    onValueChanged={this._onUpdateComment}
                    ariaLabel={Resources.Comment}
                    isMultilineExpandable={true}
                    inputClassName={"manual-intervention-comment-text-input"}
                    disabled={this._isInProgressState()} />
            </div>
            );
    }

    private _getErrorComponent(): JSX.Element {
        return (this.state.error &&
            <MessageBarComponent
                className={"manual-intervention-error-component"}
                messageBarType={MessageBarType.error}>
                {this.state.error}
            </MessageBarComponent>
        );
    }

    private _getActionButtons(): JSX.Element {
        const resumeIconClassName: string = css({ "bowtie-icon bowtie-spinner": this.state.isResumeInProgress });
        const rejectIconClassName: string = css({ "bowtie-icon bowtie-spinner": this.state.isRejectInProgress });
        return this.props.hasManageDeploymentsPermissions &&
            (<div className="manual-intervention-action-buttons">
                <PrimaryButton
                    className={"manual-intervention-action-button"}
                    text={this.state.isResumeInProgress ? Resources.ResumingButton : Resources.Resume}
                    disabled={this._isInProgressState()}
                    onClick={this._onResumeClick}
                    iconProps={{ className: resumeIconClassName }} />
                <DefaultButton
                    className={"manual-intervention-action-button"}
                    text={this.state.isRejectInProgress ? Resources.RejectingButton : Resources.RejectAction}
                    disabled={this._isInProgressState()}
                    onClick={this._onRejectClick}
                    iconProps={{ className: rejectIconClassName }} />
            </div>
            );
    }

    private _getMessageBarSection(): JSX.Element {
        const miName = this.state.manualInterventionName;
        const miWithJobName = this.state.jobNameWithMultiplier ? Utils_String.localeFormat("{0} \\ {1}", this.state.jobNameWithMultiplier, miName) : miName;
        const messagebarStyle = ReleaseManualInterventionStatusHelper.getMessageBarStyle(this.state.status);
        const messageBarClassName = css("manual-intervention-message-bar", messagebarStyle);
        
        return (
            <ApproversAndManualInterventionStatusMessageBar
                canceledByUserDisplayName={ReleaseManualInterventionStatusHelper.getCanceledByUserDisplayName(this.state.approverIdentity, this.state.status)}
                canceledByUserImageUrl={ReleaseManualInterventionStatusHelper.getCanceledByUserImageUrl(this.state.approverIdentity, this.state.status)}
                statusIconProps={ReleaseManualInterventionStatusHelper.getStatusIconProps(this.state.status)}
                messageBarClassName={messageBarClassName}
                statusSubText={ReleaseManualInterventionStatusHelper.getStatusSubText(this.state.status, this.state.timeoutPolicy, this.state.timeout, this.props.hasManageDeploymentsPermissions)}
                showTimeout={ReleaseManualInterventionStatusHelper.showTimeout(this.state.status, this.state.timeout)}
                statusTitleFormat={ReleaseManualInterventionStatusHelper.getStatusTitleFormat(this.state.status, miWithJobName)}
                statusTitleSubText={ReleaseManualInterventionStatusHelper.getStatusTitle(this.state.status, this.state.lastModifiedDate)}
                timeoutTextFormat={Resources.TimeoutText}
                timeoutTimeText={ReleaseManualInterventionStatusHelper.getTimeoutString(this.state.lastModifiedDate, this.state.timeout)} />
        );
    }

    private _onStoreChange = (): void => {
        this.setState(this._releaseManualInterventionDetailsViewStore.getState());
    }

    @autobind
    private _onUpdateComment(comment: string): void {
        this._releaseManualInterventionActionCreator.updateComment(comment);
    }

    @autobind
    private _onResumeClick() {
        const releaseStore: ReleaseStore = StoreManager.GetStore<ReleaseStore>(ReleaseStore);
        this._releaseManualInterventionActionCreator.resumeManualIntervention(this.state.comment, this.state.manualInterventionId, releaseStore.getReleaseId(), this._getInvokedSource());
    }

    @autobind
    private _onRejectClick() {
        const releaseStore: ReleaseStore = StoreManager.GetStore<ReleaseStore>(ReleaseStore);
        this._releaseManualInterventionActionCreator.rejectManualIntervention(this.state.comment, this.state.manualInterventionId, releaseStore.getReleaseId(), this._getInvokedSource());
    }

    @autobind
    private _onViewLogsClick(): void {
        this._releaseManualInterventionActionCreator.publishViewLogsActionTelemetry();

        //  Add history point using navigation services while navigating to Logs tab
        const environmentId = this.props.environmentId;
        ReleaseEnvironmentCanvasViewUtils.navigateToEnvironmentsView(environmentId, { environmentId: environmentId });
    }

    private _isInProgressState(): boolean {
        return this.state.isResumeInProgress || this.state.isRejectInProgress;
    }

    private _getInvokedSource(): ActionTelemetrySource {
        if (this.props.invokedSource === ActionTelemetrySource.LogsTab) {
            return ActionTelemetrySource.LogsTab;
        }

        return ActionTelemetrySource.Canvas;
    }

    private _releaseManualInterventionDetailsViewStore: ReleaseManualInterventionDetailsViewStore;
    private _releaseManualInterventionActionCreator: ReleaseManualInterventionActionCreator;
}