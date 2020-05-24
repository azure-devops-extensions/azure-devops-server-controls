/// <reference types="react" />
import * as React from "react";

import * as Base from "DistributedTaskControls/Common/Components/Base";
import { StringInputComponent } from "DistributedTaskControls/SharedControls/InputControls/Components/StringInputComponent";
import { BooleanInputComponent } from "DistributedTaskControls/SharedControls/InputControls/Components/BooleanInputComponent";
import { ContainerBoxLayoutComponent, IHeaderProps, IContainerBoxButtonProps, IHeadingIconProps } from "DistributedTaskControls/SharedControls/ContainerBoxLayoutComponent/ContainerBoxLayoutComponent";
import { PersonaActivityComponent } from "DistributedTaskControls/SharedControls/PersonaActivityComponent/PersonaActivityComponent";
import { MessageBarComponent } from "DistributedTaskControls/Components/MessageBarComponent";

import { autobind, css } from "OfficeFabric/Utilities";
import { DefaultButton, PrimaryButton, IButton, ActionButton } from "OfficeFabric/Button";
import { MessageBar, MessageBarType } from "OfficeFabric/MessageBar";
import { Link, ILink } from "OfficeFabric/Link";

import { IReleaseApprovalItem, IReleaseApprovalDeferDeploymentProps } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleaseEnvironmentApprovalTypes";
import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";
import { ReleaseApprovalsDeploymentTime } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleaseApprovalsDeploymentTime";
import { ReleaseApprovalReassignComponent } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleaseApprovalReassignComponent";
import { ReleaseApprovalReassignHistory } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleaseApprovalReassignHistory";

import { ReleaseApproval, ReleaseDefinitionApprovals } from "ReleaseManagement/Core/Contracts";

import { IdentityRef } from "VSS/WebApi/Contracts";
import * as Utils_String from "VSS/Utils/String";
import { IStatusProps } from "VSSUI/Status";

import "VSS/LoaderPlugins/Css!DistributedTaskControls/Styles/FabricStyleOverrides";
import "VSS/LoaderPlugins/Css!RM:PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleaseApprovalsListItem";

export interface IReleaseApprovalListItemState extends Base.IState {
    isListItemActionable: boolean;
    shouldFocusOnOverrideContext: boolean;
    enableReassignHistoryView: boolean;
}

export interface IReleaseApprovalListItemProps extends Base.IProps {
    item: IReleaseApprovalItem;
    environmentName: string;
    showIdentityRevalidationApprovalPolicyInfo?: boolean;
    onUpdateIsDeferDeploymentEnabled?: (approvalId: number, enabled: boolean) => void;
    onUpdateDeferDeploymentTime?: (approvalId: number, time: Date) => void;
    onUpdateComments?: (approvalId: number, comments: string) => void;
    onApprove?: (snapshot: ReleaseDefinitionApprovals, approval: ReleaseApproval, deferDeploymentProps: IReleaseApprovalDeferDeploymentProps, isOverrideModeEnabled: boolean) => void;
    onReject?: (snapshot: ReleaseDefinitionApprovals, approval: ReleaseApproval, isOverrideModeEnabled: boolean) => void;
    onErrorMessageDismiss?: (approvalID: number) => void;
    onWarningMessageDismiss?: (approvalID: number) => void;
    onUpdateOverrideModeEnabled?: (approvalId: number, isOverrideModeEnabled: boolean) => void;
    onEnableReassignMode?: (approvalId: number, enableReassign: boolean) => void;
    onReassign?: (snapshot: ReleaseDefinitionApprovals, approval: ReleaseApproval, selectedIdentity: IdentityRef, reassignComment: string, isOverrideModeEnabled: boolean) => void;
}

export class ReleaseApprovalListItem extends Base.Component<IReleaseApprovalListItemProps, IReleaseApprovalListItemState> {

    public componentWillMount(): void {
        this._resolveIsItemActionable(this.props.item.showActionableItems);
    }

    public componentWillReceiveProps(nextProps: IReleaseApprovalListItemProps): void {
        this._resolveIsItemActionable(nextProps.item.showActionableItems);
    }

    public componentDidMount(): void {
        this._mounted = true;
    }

    public componentDidUpdate(): void {

        //  Check if toggling on override button or (X) button took place
        if (this.state.shouldFocusOnOverrideContext) {
            if (this.props.item.isOverrideModeEnabled && this._containerBoxLayout) {
                //  This means we need to focus on (X) button
                this._containerBoxLayout.focusHeaderButton();
            }
            else if (this._overrideButton) {
                //  This means we need to focus on override button
                this._overrideButton.focus();
            }

            //  Resetting the override context focus handler state
            this.setState({
                shouldFocusOnOverrideContext: false
            });
        }

        this._focusOnReassignHistoryLink();
    }

    public componentWillUnmount(): void {
        this._mounted = false;
    }

    public render(): JSX.Element {
        return (
            <div className="pipeline-approval-list-item" >
                {this.props.item.isOverrideModeEnabled ?
                    this._showOverrideBoxForApprovalItem() : this._getApprovalItemBaseUI()
                }
            </div>
        );
    }

    private _showOverrideBoxForApprovalItem(): JSX.Element {
        return (
            <ContainerBoxLayoutComponent
                ref={this._resolveRef("_containerBoxLayout")}
                headingProps={
                    {
                        ariaLevel: "4",
                        headingText: Resources.ApprovalOverrideHeader,
                        headingIconProps: {
                            headingIconClassName: "bowtie-icon bowtie-sync-user"
                        } as IHeadingIconProps
                    } as IHeaderProps
                }
                buttonProps={
                    {
                        iconName: "Cancel",
                        onButtonClick: this._overrideBoxCancelOnClick,
                        titleText: Resources.ApprovalOverrideCancelButtonAriaText,
                        ariaDescription: Resources.ApprovalOverrideCancelButtonAriaText // Change to a more understandable description when working with accessibility
                    } as IContainerBoxButtonProps
                }
                children={this._getApprovalItemBaseUI()}
            />
        );
    }

    @autobind
    private _overrideBoxCancelOnClick() {
        if (this.props.onUpdateOverrideModeEnabled) {
            this.props.onUpdateOverrideModeEnabled(this.props.item.approval.id, false);
            this.setState({
                shouldFocusOnOverrideContext: true
            } as IReleaseApprovalListItemState);
        }
    }

    private _getApprovalItemBaseUI(): JSX.Element {
        return (
            <div>
                {this._getErrorMessageBar()}
                {this._getApprovalDetailedInfo()}
                {this._getCommentsSection()}
                {this._getDeferDeploymentSection()}
                {this._getIdentityRevalidationApprovalPolicyInfoSection()}
                {this._getWarningMessageBar()}
                {this._getApprovalPolicyInfoBar()}
                {this._getActionButtonsSection()}
                {this._getReassignComponentSection()}
                {this._getReassignHistoryLink()}
                {this._getReassignHistoryView()}
            </div >
        );
    }

    private _getApprovalDetailedInfo(): JSX.Element {
        return (
            <div className="approval-detailed-info">
                <PersonaActivityComponent
                    personaActivityInfoContainerClassName="pipeline-approval-info"
                    personaTextContainerClassName="pipeline-approval-info-right"
                    personaProps={
                        {
                            displayName: this.props.item.name,
                            iconUrl: this.props.item.iconProps.url
                        }
                    }
                    personaTextProps={
                        {
                            personaText: this.props.item.name,
                            personaTextCss: this._getApprovalNameStyle()
                        }
                    }
                    activityProps={
                        {
                            activityText: this.props.item.approvalStatus ? this.props.item.approvalStatus.statusString : null,
                            activityStatusIconProps: this._getApprovalStatusIconProps(),
                            activityStatusCss: "pipeline-approval-status"
                        }
                    } />
                {this._getOverrideReassignButton()}

            </div>
        );
    }

    private _getOverrideReassignButton(): JSX.Element {
        const isOverrideReassignButtonDisabled = !!this.props.item.isApprovalItemDisabled;
        return (
            <span className="pipeline-approval-override-reassign-button">
                {this._canShowOverrideButton() &&
                    <DefaultButton
                        disabled={isOverrideReassignButtonDisabled}
                        componentRef={this._resolveRef("_overrideButton")}
                        iconProps={{ className: "bowtie-icon bowtie-sync-user" }}
                        className="override-reassign-button"
                        text={Resources.ReleaseApprovalOverrideButtonText}
                        ariaDescription={Resources.ReleaseApprovalOverrideButtonDescriptionText} //ToDo: Put more sensible string here
                        ariaLabel={Resources.ApprovalOverrideHeader}
                        onClick={this._onOverrideButtonClicked}
                    />
                }
                {
                    (this.state.isListItemActionable || this.props.item.isOverrideModeEnabled) &&
                    <ActionButton
                        disabled={isOverrideReassignButtonDisabled}
                        iconProps={{ iconName: "Contact" }}
                        className="fabric-style-overrides add-new-item-button override-reassign-button"
                        ariaLabel={Resources.ReleaseApprovalReassignButtonText}
                        onClick={this._onReassignButtonClicked} >
                        {Resources.ReleaseApprovalReassignButtonText}
                    </ActionButton>
                }
            </span>
        );
    }

    private _getReassignHistoryLink(): JSX.Element {
        const showReassignHistoryLink = (!!this.props.item.reassignHistoryData && this.props.item.reassignHistoryData.length > 0);
        if (showReassignHistoryLink) {
            return (
                <div className="reassign-history-section">
                    <Link
                        componentRef={this._resolveRef("_reassignHistoryLink")}
                        disabled={!!this.props.item.isApprovalItemDisabled}
                        className={"reassign-history-see-more"}
                        aria-expanded={!!this.state.enableReassignHistoryView}
                        onClick={this._toggleReassignHistory}>
                        {this._getLinkContent()}
                    </Link>
                </div>
            );
        }
        return null;
    }
    @autobind
    private _toggleReassignHistory(): void {
        let isHistoryViewOpen: boolean = !!this.state.enableReassignHistoryView;
        this.setState({
            enableReassignHistoryView: !isHistoryViewOpen
        } as IReleaseApprovalListItemState);
    }

    private _getLinkContent(): JSX.Element {
        let chevronStyle = !!this.state.enableReassignHistoryView ? "bowtie-chevron-up-light" : "bowtie-chevron-down-light";
        return (
            <div>
                <div className="reassign-history-link-text">
                    {Resources.ReassignHistoryTitleText}
                </div>
                <div className={css("chevron bowtie-icon", chevronStyle)} />
            </div>
        );
    }

    private _getReassignHistoryView(): JSX.Element {
        if (this.state.enableReassignHistoryView && this.props.item && this.props.item.reassignHistoryData) {
            return (
                <ReleaseApprovalReassignHistory
                    historyData={this.props.item.reassignHistoryData} />
            );
        }
        return null;
    }


    private _getReassignComponentSection(): JSX.Element {
        //  Component for reassign view
        if (this.props.item.showReassign) {
            //  Show the dialog box only when the state is enabled
            return (
                <ReleaseApprovalReassignComponent
                    isReassignmentInProgress={!!this.props.item.isReassignmentInProgress}
                    instanceId={this.props.item.approval.id.toString()}
                    errorMessage={this.props.item.reassignErrorMessage}
                    originalApproverId={this.props.item.approval.approver.id}
                    onCloseDialog={this._onCloseDialog}
                    onReassignClick={this._handleReassignClicked} />
            );
        }
        return null;
    }

    @autobind
    private _onCloseDialog(): void {
        if (this.props.onEnableReassignMode) {
            this.props.onEnableReassignMode(this.props.item.approval.id, false);
        }
    }

    @autobind
    private _handleReassignClicked(selectedIdentity: IdentityRef, reassignComment: string): void {
        if (this.props.onReassign) {
            //  Call on reassign callback to invoke patch call for reassign action
            this.props.onReassign(this.props.item.snapshot, this.props.item.approval, selectedIdentity, reassignComment, !!this.props.item.isOverrideModeEnabled);
        }
    }

    @autobind
    private _onReassignButtonClicked() {
        if (this.props.onEnableReassignMode) {
            this.props.onEnableReassignMode(this.props.item.approval.id, true);
        }
    }

    @autobind
    private _onOverrideButtonClicked() {
        if (this.props.onUpdateOverrideModeEnabled) {
            this.props.onUpdateOverrideModeEnabled(this.props.item.approval.id, true);
            this.setState({
                shouldFocusOnOverrideContext: true
            } as IReleaseApprovalListItemState);
        }
    }

    private _focusOnReassignHistoryLink() {
        if (!!this.props.item.focusReassignHistoryLink && this._reassignHistoryLink) {
            this._reassignHistoryLink.focus();
        }
    }

    private _getApprovalNameStyle(): string {
        const doesApprovalStatusExists = !!(this.props.item.approvalStatus && this.props.item.approvalStatus.statusIconProps && this.props.item.approvalStatus.statusString);
        if (!doesApprovalStatusExists) {
            return "pipeline-approval-name-center";
        }
        return null;
    }

    private _resolveIsItemActionable(isItemActionable: IPromise<boolean>) {
        if (isItemActionable) {
            isItemActionable.then((isItemActionable) => {
                if (this._mounted) {
                    this.setState({
                        isListItemActionable: isItemActionable
                    } as IReleaseApprovalListItemState);
                }
            });
        }
        return null;
    }

    private _getApprovalStatusIconProps(): IStatusProps {
        const approvalStatus = this.props.item.approvalStatus;
        if (approvalStatus) {
            return approvalStatus.statusIconProps;
        }
        return null;
    }

    private _getCommentsSection(): JSX.Element {
        const isApprovalAllowedForCurrentUser = !!this.props.item.isApprovalAllowedForCurrentUser;
        const isOverrideModeEnabled = !!this.props.item.isOverrideModeEnabled;
        const showEditableCommentsBox = (!!this.state.isListItemActionable || isOverrideModeEnabled) && isApprovalAllowedForCurrentUser;
        const doesCommentAlreadyExists = !!this.props.item.comments;
        const isCommentsSectionDisabled = !!this.props.item.isApprovalItemDisabled;


        const showCommentsSection = showEditableCommentsBox || doesCommentAlreadyExists;

        if (showCommentsSection) {
            return (
                <div className="pipeline-approval-comment-section">
                    {showEditableCommentsBox &&
                        <div>
                            {Resources.Comment}
                        </div>
                    }
                    <div className="pipeline-approval-comment-section-comment">
                        {
                            showEditableCommentsBox &&
                            <StringInputComponent
                                disabled={isCommentsSectionDisabled}
                                ariaLabel={Resources.Comment}
                                value={this.props.item.comments}
                                onValueChanged={this._onUpdateComments}
                                isMultilineExpandable={true} />
                        }
                        {
                            doesCommentAlreadyExists && !showEditableCommentsBox &&
                            <div className="pipeline-approval-comment">
                                {this.props.item.comments}
                            </div>
                        }
                    </div>
                </div>
            );
        }

        return null;
    }

    private _getDeferDeploymentSection(): JSX.Element {
        const isApprovalAllowedForCurrentUser = !!this.props.item.isApprovalAllowedForCurrentUser;
        const deferDeploymentProps = this.props.item.deferDeploymentProps;
        const showDeferDeploymentSection = !!(deferDeploymentProps && (this.state.isListItemActionable || !!this.props.item.isOverrideModeEnabled) && isApprovalAllowedForCurrentUser);
        const isDeferDeploymentSectionDisabled = !!this.props.item.isApprovalItemDisabled;

        if (showDeferDeploymentSection) {

            const isDeferDeploymentEnabled = !!deferDeploymentProps.isDeferDeploymentEnabled;

            return (
                <div className="pipeline-approval-defer-deployment-section">
                    <BooleanInputComponent
                        disabled={isDeferDeploymentSectionDisabled}
                        onValueChanged={this._onUpdateIsDeferDeploymentEnabled}
                        cssClass="pipeline-approval-defer-deployment-checkbox"
                        label={Resources.ApprovalDeferDeploymentTitle}
                        value={isDeferDeploymentEnabled} />
                    {
                        isDeferDeploymentEnabled &&
                        <div className="pipeline-approval-defer-deployment-time">
                            <ReleaseApprovalsDeploymentTime
                                isDisabled={isDeferDeploymentSectionDisabled}
                                time={deferDeploymentProps.scheduledDeploymentTime}
                                onUpdateTime={this._onUpdateDeferDeploymentTime} />
                            {
                                !!deferDeploymentProps.errorMessage &&
                                <MessageBar
                                    dismissButtonAriaLabel={Resources.CloseText}
                                    className="pipeline-approval-defer-deployment-error-message"
                                    messageBarType={MessageBarType.error} >
                                    {deferDeploymentProps.errorMessage}
                                </MessageBar>
                            }
                        </div>
                    }
                </div>
            );
        }

        return null;
    }

    private _getIdentityRevalidationApprovalPolicyInfoSection(): JSX.Element {
        const showPolicyInfoSection = (!!this.state.isListItemActionable || !!this.props.item.isOverrideModeEnabled) && !!this.props.showIdentityRevalidationApprovalPolicyInfo;

        if (showPolicyInfoSection) {
            return (
                <div className={"identity-revalidation-approval-policy-info-message-bar"}>
                    <MessageBarComponent
                        messageBarType={MessageBarType.info} >
                        {Resources.ApprovalIdentityRevalidationInfoMessage}
                    </MessageBarComponent>
                </div>
            );
        }

        return null;
    }

    private _getActionButtonsSection(): JSX.Element {
        const isApprovalAllowedForCurrentUser = !!this.props.item.isApprovalAllowedForCurrentUser;
        const showActionButtons = (!!this.state.isListItemActionable || !!this.props.item.isOverrideModeEnabled) && isApprovalAllowedForCurrentUser;
        const isApprovalItemDisabled = !!this.props.item.isApprovalItemDisabled;
        const isDeferEnabled = this.props.item.deferDeploymentProps ? this.props.item.deferDeploymentProps.isDeferDeploymentEnabled : false;
        const approveButtonText = this.props.item.isApprovalInProgress ? Resources.ApprovingButton : Resources.ApproveNowAction;
        const rejectButtonText = this.props.item.isRejectionInProgress ? Resources.RejectingButton : Resources.RejectAction;

        if (showActionButtons) {
            return (
                <div className="pipeline-approval-action-buttons-section">
                    <PrimaryButton
                        disabled={isApprovalItemDisabled}
                        className="pipeline-approval-approve-button"
                        text={approveButtonText}
                        onClick={this._onApprove} />

                    <DefaultButton
                        disabled={isApprovalItemDisabled || isDeferEnabled}
                        className="pipeline-approval-reject-button"
                        text={rejectButtonText}
                        onClick={this._onReject} />
                </div>
            );
        }

        return null;
    }

    private _getErrorMessageBar(): JSX.Element {

        const doesErrorMessageExists = !!this.props.item.errorMessage;

        if (doesErrorMessageExists) {
            return (
                <MessageBar
                    dismissButtonAriaLabel={Resources.CloseText}
                    className="pipeline-approval-message-bar"
                    messageBarType={MessageBarType.error}
                    onDismiss={this._onDismissErrorMessage}>
                    {this.props.item.errorMessage}
                </MessageBar>
            );
        }
        return null;
    }

    @autobind
    private _onDismissErrorMessage(): void {
        if (this.props.onErrorMessageDismiss) {
            this.props.onErrorMessageDismiss(this.props.item.approval.id);
        }
    }

    private _getWarningMessageBar(): JSX.Element {
        const doesWarningMessageExists = !!this.props.item.warningMessage;
        if (doesWarningMessageExists) {
            return (
                <MessageBar
                    dismissButtonAriaLabel={Resources.CloseText}
                    className="pipeline-approval-warning-message-bar"
                    messageBarType={MessageBarType.warning}
                    onDismiss={this._onDismissWarningMessage}>
                    {this.props.item.warningMessage}
                </MessageBar>
            );
        }
        return null;
    }

    private _getApprovalPolicyInfoBar(): JSX.Element {
        const showPolicyBasedInfoMessageBar = (!!this.state.isListItemActionable || !!this.props.item.isOverrideModeEnabled) && !this.props.item.isApprovalAllowedForCurrentUser;

        if (!!showPolicyBasedInfoMessageBar) {
            return (
                <MessageBar
                    className="pipeline-approval-policy-info-message-bar"
                    messageBarType={MessageBarType.info} >
                    {Utils_String.format(Resources.NotValidReleaseApprover, this.props.environmentName)}
                </MessageBar>
            );
        }
        return null;
    }

    @autobind
    private _onDismissWarningMessage(): void {
        if (this.props.onWarningMessageDismiss) {
            this.props.onWarningMessageDismiss(this.props.item.approval.id);
        }
    }

    @autobind
    private _onUpdateIsDeferDeploymentEnabled(enabled: boolean) {
        if (this.props.onUpdateIsDeferDeploymentEnabled) {
            this.props.onUpdateIsDeferDeploymentEnabled(this.props.item.approval.id, enabled);
        }
    }

    @autobind
    private _onUpdateDeferDeploymentTime(time: Date) {
        if (this.props.onUpdateDeferDeploymentTime) {
            this.props.onUpdateDeferDeploymentTime(this.props.item.approval.id, time);
        }
    }

    @autobind
    private _onUpdateComments(comments: string) {
        if (this.props.onUpdateComments) {
            this.props.onUpdateComments(this.props.item.approval.id, comments);
        }
    }

    @autobind
    private _onApprove() {
        if (this.props.onApprove) {

            let { approval, snapshot, comments, deferDeploymentProps } = this.props.item;

            approval.comments = comments;
            this.props.onApprove(snapshot, approval, deferDeploymentProps, !!this.props.item.isOverrideModeEnabled);
        }
    }

    @autobind
    private _onReject() {
        if (this.props.onReject) {

            let { approval, snapshot, comments } = this.props.item;

            approval.comments = comments;
            this.props.onReject(snapshot, approval, !!this.props.item.isOverrideModeEnabled);
        }
    }

    private _canShowOverrideButton(): boolean {
        const isApprovalActionableForCurrentUser = !!this.state.isListItemActionable;
        //  1.) Not actionable for current user
        //  2.) Override allowed
        return !isApprovalActionableForCurrentUser && this.props.item.showOverrideButtonForApprovalItem;
    }

    private _containerBoxLayout: ContainerBoxLayoutComponent;
    private _overrideButton: IButton;
    private _reassignHistoryLink: ILink;
    private _mounted: boolean;
    static readonly ApproverImageHeight = 36;
    static readonly ApproverImageWidth = 36;
}