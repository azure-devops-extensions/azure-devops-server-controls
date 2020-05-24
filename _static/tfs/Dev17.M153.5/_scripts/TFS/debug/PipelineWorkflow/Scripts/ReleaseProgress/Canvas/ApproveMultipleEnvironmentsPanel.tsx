/// <reference types="react" />
import * as React from "react";

import { MessageHandlerActionsCreator } from "DistributedTaskControls/Actions/MessageHandlerActionsCreator";
import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import * as Base from "DistributedTaskControls/Common/Components/Base";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { Component as ErrorComponent } from "DistributedTaskControls/Components/InformationBar";
import { OverlayPanelHeading } from "DistributedTaskControls/Components/OverlayPanelHeading";
import { AccordionCustomRenderer } from "DistributedTaskControls/SharedControls/Accordion/AccordionCustomRenderer";
import { BooleanInputComponent } from "DistributedTaskControls/SharedControls/InputControls/Components/BooleanInputComponent";
import { StringInputComponent } from "DistributedTaskControls/SharedControls/InputControls/Components/StringInputComponent";
import { LoadableComponent } from "DistributedTaskControls/SharedControls/LoadableComponent/LoadableComponent";
import {
    LoadableComponentActionsCreator,
} from "DistributedTaskControls/SharedControls/LoadableComponent/LoadableComponentActionsCreator";
import { DefaultButton, PrimaryButton } from "OfficeFabric/Button";
import { MessageBar, MessageBarType } from "OfficeFabric/MessageBar";
import { Spinner, SpinnerType } from "OfficeFabric/Spinner";
import { autobind } from "OfficeFabric/Utilities";
import {
    ApproveMultipleEnvironmentsPanelActionCreator,
} from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ApproveMultipleEnvironmentsPanelActionCreator";
import {
    ApproveMultipleEnvironmentsPanelActions,
    IEnvironmentApproveProgressState,
} from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ApproveMultipleEnvironmentsPanelActions";
import {
    ApprovalMultipleEnvironmentsPanelViewStore,
    IApproveMultipleEnvironmentsPanelItemViewState,
} from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ApproveMultipleEnvironmentsPanelViewStore";
import {
    ApproveMultipleEnvironmentsList,
} from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ApproveMultipleEnvironmentsList";
import { ReleaseStore } from "PipelineWorkflow/Scripts/ReleaseProgress/Release/ReleaseStore";
import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";
import * as DTCResources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";
import * as ReleaseContracts from "ReleaseManagement/Core/Contracts";
import * as Utils_String from "VSS/Utils/String";
import { ReleaseApprovalsDeploymentTime } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleaseApprovalsDeploymentTime";

import "VSS/LoaderPlugins/Css!RM:PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ApproveMultipleEnvironmentsPanel";

export class ApproveMultipleEnvironmentsPanel extends Base.Component<Base.IProps, IApproveMultipleEnvironmentsPanelItemViewState> {

    constructor(props) {
        super(props);
        
        this._releaseStore = StoreManager.GetStore<ReleaseStore>(ReleaseStore);
        this._actionsCreator = ActionCreatorManager.GetActionCreator<ApproveMultipleEnvironmentsPanelActionCreator>(
            ApproveMultipleEnvironmentsPanelActionCreator, this.props.instanceId);

        this._viewStore = this._getViewStore();
        this._viewStore.addChangedListener(this._onChange);  
        this.state = this._viewStore.getState();

        let release = this._releaseStore.getRelease();
        let artifacts = this._releaseStore.getArtifacts();
        this._actionsCreator.initializeData(release.releaseDefinition.id, release.id, release.environments, release.projectReference.id);
    }

    public componentWillUnmount(): void {
        this._viewStore.removeChangedListener(this._onChange);
    }

    public render(): JSX.Element {
        return (<div className="multiple-approve-panel">
            {this._renderHeader()}
            {this._renderBody()}
            {this._renderFooter()}
        </div>);
    }
    
    private _getViewStore() {
        return StoreManager.GetStore(ApprovalMultipleEnvironmentsPanelViewStore, this.props.instanceId);
    }

    private _renderBody(){
        return (<div className="multiple-approve-panel-content-section">
            {this._renderEnvironmentList()}
            {this._getCommentBox()}
            {this._getDeferDeploymentBox()}
            {this._getApproveErrorMessage()}            
            {this._getApproveSpinner()}
        </div>);
    }

    private _renderEnvironmentList(): JSX.Element {
        return ( <div>
            <div className="multiple-approve-panel-environment-section-header-container">
                <div className="multiple-approve-panel-environment-section-header">
                    {Resources.EnvironmentsText}
                </div>
                <div className="multiple-approve-panel-environment-section-description">
                    {Resources.SelectApproveEnvironmentDescription}
                </div>
            </div>
            <LoadableComponent
                instanceId={this.props.instanceId + ApproveMultipleEnvironmentsPanelActions.SOURCE_KEY}
                label={Resources.Loading}
                wait={0}>
                <div className="multiple-approve-panel-environments">
                    {this._getEnvironmentsSection()}
                </div>
            </LoadableComponent>
            <div className="multiple-approve-panel-empty-separator"></div>
        </div>);
    }

    private _getEnvironmentsSection(): JSX.Element {
        let approvalData = this._viewStore.getApprovalDataForEnvironmentList();
        return <div>
                {this._getFetchEnvironmentsErrorMessage()}
                {!this.state.fetchingApprovalsError && 
                    <ApproveMultipleEnvironmentsList 
                        instanceId={this.props.instanceId}
                        environments={this.state.approvableEnvironments} 
                        approvalData={approvalData}
                        initialSelectedEnvironmentIds={this.state.selectedEnvironmentIds}
                        setSelectedEnvironmentIds={this._setSelectedEnvironments} />
                }
            </div>;
    }

    @autobind
    private _setSelectedEnvironments(selectedEnvironmentIds: number[]) {
        this._actionsCreator.updateSelectedEnvironment(selectedEnvironmentIds);
    }

    private _getFetchEnvironmentsErrorMessage(): JSX.Element {
        return <div className="multiple-approve-panel-approvals error-message">
            <ErrorComponent
                parentKey={this.props.instanceId + ApproveMultipleEnvironmentsPanelActions.SOURCE_KEY}
                showRetry={true}
                onRetryClick={this._onRetryClick}
                hideDismiss={true}>
            </ErrorComponent>
        </div>;
    }

    private _onRetryClick = (): void => {
        let release = this._releaseStore.getRelease();
        this._actionsCreator.fetchApprovalsRetry(release.releaseDefinition.id, release.id, release.environments, release.projectReference.id);
    }

    private _renderHeader(): JSX.Element {
        return (<div className="multiple-approve-panel-header-section">
            <OverlayPanelHeading
                label={this._viewStore.isPreDeployApprovalPresent() ? Resources.PreDeploymentApproval : Resources.PostDeploymentApproval}
                infoButtonRequired={false}
                description={Resources.MultipleEnvironments}>
            </OverlayPanelHeading>
        </div>);
    }


    private _renderFooter(): JSX.Element {
        return (<div className="multiple-approve-panel-section-footer-section">
                    {this._getActionButtons()}
                </div>);
    }

    private _getCommentBox(): JSX.Element {
        return (
            <StringInputComponent
                cssClass={"multiple-approve-comment-text"}
                inputClassName={"multiple-approve-comment-input"}
                label={Resources.Comment}
                value={this.state.approveComment}
                onValueChanged={this._onCommentChange}
                isMultilineExpandable={true}
                rows={4}
                disabled={this.state.approveProgressState === IEnvironmentApproveProgressState.InProgress}
            />
        );
    }

    private _getDeferDeploymentBox(): JSX.Element {
        let isDeferDeploymentEnabled = this.state.isDeferDeploymentEnabled;
        let isDeferDeploymentSectionDisabled = this.state.approveProgressState === IEnvironmentApproveProgressState.InProgress;

        if (this._viewStore.isPreDeployApprovalPresent()) {
            return <div className="multiple-approve-defer-deployment-section">
                    <BooleanInputComponent
                        disabled={isDeferDeploymentSectionDisabled}
                        onValueChanged={this._onUpdateIsDeferDeploymentEnabled}
                        cssClass="multiple-approve-defer-deployment-checkbox"
                        label={Resources.ApprovalDeferDeploymentTitle}
                        value={isDeferDeploymentEnabled} />
                    {
                        isDeferDeploymentEnabled &&
                        <div className="multiple-approve-defer-deployment-time">
                            <ReleaseApprovalsDeploymentTime
                                isDisabled={isDeferDeploymentSectionDisabled}
                                time={this.state.deploymentDeferredTiming}
                                onUpdateTime={this._onUpdateDeferDeploymentTime} />
                        </div>
                    }
                </div>;
        }
        else {
            return null;
        }
    }

    @autobind
    private _onUpdateIsDeferDeploymentEnabled(enabled: boolean) {
        this._actionsCreator.updateDeferDeploymentEnabled(enabled);
    }

    @autobind
    private _onUpdateDeferDeploymentTime(time: Date) {
        this._actionsCreator.updateDeferDeploymentTime(time);
    }

    private _getActionButtons(): JSX.Element {
        let buttonsDisabled = this.state.approveProgressState === IEnvironmentApproveProgressState.InProgress 
        || !this.state.selectedEnvironmentIds || this.state.selectedEnvironmentIds.length === 0;
        return <div className="multiple-approve-action-buttons">
            <PrimaryButton className="multiple-approve-button" disabled={buttonsDisabled} onClick={this.onApproveClick}>
                {Resources.ApproveNowAction}
            </PrimaryButton>
            <DefaultButton className="cancel-multiple-approve-button" disabled={buttonsDisabled} onClick={this.onRejectClick}>
                {Resources.RejectAction}
            </DefaultButton>
        </div>;
    }

    private _getApproveErrorMessage(): JSX.Element {
        let errorMessage = null;
        if (this.state.approveErrorMessage && 
        this.state.approveProgressState === IEnvironmentApproveProgressState.Error) {
            errorMessage = (<div className="multiple-approve-action error-message">
                <MessageBar
                    overflowButtonAriaLabel={DTCResources.ErrorTruncateMessageBarText}
                    messageBarType={MessageBarType.error}
                    truncated={true}
                    isMultiline={false}>
                        <span>{this.state.approveErrorMessage}</span>
                </MessageBar>
            </div>);
        }
        return errorMessage;
    }

    private _getApproveSpinner(): JSX.Element {
        let spinner = null;
        if (this.state.approveProgressState === IEnvironmentApproveProgressState.InProgress) {
            spinner = <div className="multiple-approve-progress-spinner">
                <Spinner 
                    type={SpinnerType.normal}
                    label={Resources.ApprovingButton} 
                    ariaLabel={Resources.ApprovingButton} />
            </div>;
        }
        return spinner;
    }

    @autobind
    private onApproveClick (): void {
        let release = this._releaseStore.getRelease();
        let approveComment = this.state.approveComment ? this.state.approveComment.trim() : Utils_String.empty;
        if (this.state.isDeferDeploymentEnabled){
            this._actionsCreator.deferAndApproveEnvironments(release, this.state.selectedEnvironmentIds, this.state.deploymentDeferredTiming, this.state.approvalData,
                approveComment, this.state.approvableEnvironments.length);
        }
        else{
            this._actionsCreator.approveEnvironments(release, this.state.selectedEnvironmentIds, this.state.approvalData,
                approveComment, this.state.approvableEnvironments.length);
        }
        
    }

    @autobind
    private onRejectClick (): void {
        const release = this._releaseStore.getRelease();
        this._actionsCreator.rejectEnvironments(release, this.state.selectedEnvironmentIds, this.state.approvalData,
            this.state.approveComment ? this.state.approveComment.trim() : Utils_String.empty, this.state.approvableEnvironments.length);
    }

    @autobind
    private _onCommentChange (newValue: string): void {
        const valueToSet: string = newValue;
        this.setState({ approveComment: valueToSet} as IApproveMultipleEnvironmentsPanelItemViewState);
    }

    private _onChange = () => {
        this.setState(this._viewStore.getState());
    }

    private _viewStore: ApprovalMultipleEnvironmentsPanelViewStore;
    private _actionsCreator: ApproveMultipleEnvironmentsPanelActionCreator;
    private _releaseStore: ReleaseStore;
}