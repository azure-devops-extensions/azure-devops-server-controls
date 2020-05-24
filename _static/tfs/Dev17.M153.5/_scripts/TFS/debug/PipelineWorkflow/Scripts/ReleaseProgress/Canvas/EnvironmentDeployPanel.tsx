/// <reference types="react" />
import * as React from "react";

import { MessageHandlerActionsCreator } from "DistributedTaskControls/Actions/MessageHandlerActionsCreator";
import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import * as Base from "DistributedTaskControls/Common/Components/Base";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { Component as ErrorComponent } from "DistributedTaskControls/Components/InformationBar";
import { StringInputComponent } from "DistributedTaskControls/SharedControls/InputControls/Components/StringInputComponent";
import { LoadableComponent } from "DistributedTaskControls/SharedControls/LoadableComponent/LoadableComponent";
import { LoadableComponentActionsCreator } from "DistributedTaskControls/SharedControls/LoadableComponent/LoadableComponentActionsCreator";

import {
    DeployEnvironmentsPanelActionCreator,
} from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/DeployEnvironmentsPanelActionCreator";
import {
    DeployEnvironmentsPanelActions,
    IEnvironmentDeployProgressState,
    IEnvironmentSkeleton
} from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/DeployEnvironmentsPanelActions";
import { CollapsibleDeploymentOptionSection } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/CollapsibleDeploymentOptionSection";
import { ConfigurationVariableValue } from "ReleaseManagement/Core/Contracts";
import { EnvironmentDeployPanelReleaseSection } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/EnvironmentDeployPanelReleaseSection";
import { DeployEnvironmentsPanelViewStore, IDeployEnvironmentsPanelItemViewState } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/DeployEnvironmentsPanelViewStore";
import { FeatureFlagUtils } from "PipelineWorkflow/Scripts/Shared/Utils/FeatureFlagUtils";
import { ReleaseDeploymentAttemptHelper } from "PipelineWorkflow/Scripts/ReleaseProgress/ReleaseEnvironment/ReleaseDeploymentAttemptHelper";
import { ReleaseTaskAttachmentActionCreator } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleaseTaskAttachmentActionCreator";
import { ReleaseArtifactsView } from "PipelineWorkflow/Scripts/ReleaseProgress/Release/ReleaseArtifactsView";
import { ReleaseStore } from "PipelineWorkflow/Scripts/ReleaseProgress/Release/ReleaseStore";
import { ReleaseSummaryViewHelper } from "PipelineWorkflow/Scripts/ReleaseProgress/Release/ReleaseSummaryViewHelper";
import { ReleaseEnvironmentStore } from "PipelineWorkflow/Scripts/ReleaseProgress/ReleaseEnvironment/ReleaseEnvironmentStore";
import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";
import * as RMContracts from "ReleaseManagement/Core/Contracts";
import * as  RMConstants from  "ReleaseManagement/Core/Constants";

import { DefaultButton, PrimaryButton } from "OfficeFabric/Button";
import { MessageBar, MessageBarType } from "OfficeFabric/MessageBar";
import { Spinner, SpinnerType } from "OfficeFabric/Spinner";
import { autobind } from "OfficeFabric/Utilities";

import * as Utils_String from "VSS/Utils/String";

import "VSS/LoaderPlugins/Css!RM:PipelineWorkflow/Scripts/ReleaseProgress/Canvas/EnvironmentDeployPanel";


export interface IEnvironmentDeployPanelProps extends Base.IProps {
    onActionComplete?: () => void;
}

export class EnvironmentDeployPanel extends Base.Component<IEnvironmentDeployPanelProps, IDeployEnvironmentsPanelItemViewState> {

    public componentWillMount() {

        this._releaseStore = StoreManager.GetStore<ReleaseStore>(ReleaseStore);
        this._actionsCreator = ActionCreatorManager.GetActionCreator<DeployEnvironmentsPanelActionCreator>(
            DeployEnvironmentsPanelActionCreator, this.props.instanceId + DeployEnvironmentsPanelActions.SOURCE_KEY_INDIVIDUAL);

        this._releaseTaskAttachmentActionCreator = ActionCreatorManager.GetActionCreator<ReleaseTaskAttachmentActionCreator>(ReleaseTaskAttachmentActionCreator, this.props.instanceId);

        this._releaseEnvironmentStore = StoreManager.GetStore<ReleaseEnvironmentStore>(ReleaseEnvironmentStore, this.props.instanceId);

        this._viewStore = this.getViewStore();
        this._viewStore.addChangedListener(this._onChange);
        this.setState(this._viewStore.getState());

        const environment = this._releaseEnvironmentStore.getEnvironment();
        const releaseDefinitionId = this._releaseStore.getReleaseDefinitionId();
        const releaseId = this._releaseStore.getReleaseId();
        const artifacts = this._releaseStore.getArtifacts();
        this._actionsCreator.initializeData(releaseDefinitionId, releaseId, [environment], artifacts);

        this._isDeploymentOptionPanelVisible = this._isDeploymentOptionSectionVisible(environment);
    }

    public componentWillUnmount(): void {
        this._viewStore.removeChangedListener(this._onChange);
    }

    private getViewStore() {
        return StoreManager.GetStore<DeployEnvironmentsPanelViewStore>(DeployEnvironmentsPanelViewStore, this.props.instanceId + DeployEnvironmentsPanelActions.SOURCE_KEY_INDIVIDUAL);
    }

    public render(): JSX.Element {
        return (
            <div className="deploy-panel overview-tab">
                <div className="deploy-panel-section overview content">
                    <div className="deploy-panel-section overview demands container">
                        {this._getDemandsMessage()}
                    </div>
                    <div className="deploy-panel-section overview artifacts container">
                        <LoadableComponent
                            instanceId={this.props.instanceId + DeployEnvironmentsPanelActions.SOURCE_KEY_INDIVIDUAL}
                            label={Resources.Loading}
                            wait={0}>
                            <div className="deploy-panel overview artifacts">
                                {this._getArtifactsAndReleaseSection()}
                            </div>
                        </LoadableComponent>
                    </div>                    
                    {this._getDeploymentOptionSection()}                    
                    <div className="deploy-panel-section overview deploy-panel-comment">
                        {this._getCommentBox()}
                    </div>
                    <div className="deploy-panel-section overview deploy-actions">
                        {this._getDeployErrorMessage()}
                        {this._getDeploySpinnerMessage()}
                        {this._getActionButtons()}
                    </div>
                </div>
            </div>
        );
    }

    private _initializeReleasesToCompare() {
        let artifacts = this._releaseStore.getArtifacts();
        const releaseDefinitionId = this._releaseStore.getReleaseDefinitionId();
        const releaseId = this._releaseStore.getReleaseId();
        this._actionsCreator.initializeReleasesToCompare(releaseDefinitionId, releaseId, this.state.deployableEnvironments, artifacts);
    }

    private _getArtifactsAndReleaseSection(): JSX.Element {
        return <div>
            {this._getFetchReleaseErrorMessage()}
            {!this.state.fetchingReleasesError && <div>
                {this._getRollbackMessage()}
                {this._getReleaseSection()}
                {this._getArtifactsSection()}
            </div>
            }
        </div>;
    }

    private _getDemandsMessage(): JSX.Element {
        let environmentId = this._releaseEnvironmentStore.getEnvironmentId();
        let demandsBar = null;
        let demandWarning = this._viewStore.getDemandWarnings();
        if (demandWarning[environmentId]) {
            demandsBar = <div className="deploy-panel deploy-action demands-warning-message"><MessageBar
                messageBarType={MessageBarType.severeWarning}
                truncated={true}
                isMultiline={false}
                overflowButtonAriaLabel={Resources.MessageBarOverflowButtonAriaLabel}>
                <span>{demandWarning[environmentId]}</span>
            </MessageBar></div>;
        }
        return demandsBar;
    }

    private _getFetchReleaseErrorMessage(): JSX.Element {
        return <div className="deploy-panel current-release error-message">
            <ErrorComponent
                parentKey={this.props.instanceId + DeployEnvironmentsPanelActions.SOURCE_KEY_INDIVIDUAL}
                showRetry={true}
                onRetryClick={this._onRetryClick}
                hideDismiss={true}>
            </ErrorComponent>
        </div>;
    }

    private _onRetryClick = (): void => {
        let loadableComponentForCommitsActionCreator: LoadableComponentActionsCreator =
            ActionCreatorManager.GetActionCreator<LoadableComponentActionsCreator>(LoadableComponentActionsCreator, this.props.instanceId + DeployEnvironmentsPanelActions.SOURCE_KEY_INDIVIDUAL);
        let messageHandlerForCommitsActionCreator: MessageHandlerActionsCreator =
            ActionCreatorManager.GetActionCreator<MessageHandlerActionsCreator>(MessageHandlerActionsCreator);

        // Take focus to next focusable element when "RETRY" is clicked
        if (this._commentBox) {
            this._commentBox.setFocus();
        }

        loadableComponentForCommitsActionCreator.showLoadingExperience();
        messageHandlerForCommitsActionCreator.dismissMessage(this.props.instanceId + DeployEnvironmentsPanelActions.SOURCE_KEY_INDIVIDUAL);
        this._initializeReleasesToCompare();
    }

    private _getDeployErrorMessage(): JSX.Element {
        let errorMessage = null;
        if (this.state.deployErrorMessage &&
            this.state.deployProgressState === IEnvironmentDeployProgressState.Error) {
            errorMessage = <div className="deploy-panel deploy-action error-message"><MessageBar
                messageBarType={MessageBarType.error}
                truncated={true}
                isMultiline={false}
                overflowButtonAriaLabel={Resources.MessageBarOverflowButtonAriaLabel}>
                <span>{this.state.deployErrorMessage}</span>
            </MessageBar></div>;
        }
        return errorMessage;
    }

    private _getDeploySpinnerMessage(): JSX.Element {
        let spinner = null;
        if (this.state.deployProgressState === IEnvironmentDeployProgressState.InProgress) {
            spinner = <div className="deploy-progress-spinner">
                <Spinner
                    type={SpinnerType.normal}
                    label={Resources.Deploying}
                    ariaLabel={Resources.Deploying} />
            </div>;
        }
        return spinner;
    }

    private _getRollbackMessage(): JSX.Element {
        const environment = this._releaseEnvironmentStore.getEnvironment();
        const isRollback = this.state.releaseToCompare
            && this.state.releaseToCompare[environment.id]
            && this.state.releaseToCompare[environment.id].isRollback;
        let rollbackMessage = null;
        if (isRollback) {
            rollbackMessage = <div className="deploy-panel rollback-message"><MessageBar
                messageBarType={MessageBarType.warning}
                truncated={true}
                isMultiline={false}
                overflowButtonAriaLabel={Resources.MessageBarOverflowButtonAriaLabel}>
                <span>{Resources.RollbackDeployMessage}</span>
            </MessageBar></div>;
        }
        return rollbackMessage;
    }

    private _getReleaseSection(): JSX.Element {
        const environment = this._releaseEnvironmentStore.getEnvironment();
        return (
            <EnvironmentDeployPanelReleaseSection
                showDetailedReleaseSection={true}
                releaseToCompare={this.state.releaseToCompare[environment.id]}
                toBeDeployedReleaseId={this._releaseStore.getReleaseId()}
                toBeDeployedReleaseName={this._releaseStore.getReleaseName()} />
        );
    }

    private _getArtifactsSection(): JSX.Element {
        let artifacts = this._releaseStore.getArtifacts();

        //TODO: need to add the commits and workitems count to artifacts. Waiting for the design.
        return <div className="deploy-panel artifacts-section">
            <div className="deploy-panel artifacts-section-header">
                {Resources.Artifacts}
            </div>
            <div className="deploy-panel-artifacts-list">
                <ReleaseArtifactsView artifacts={ReleaseSummaryViewHelper.getReleaseSummaryArtifacts(artifacts)} />
            </div>
        </div>;
    }

    private _getCommentBox(): JSX.Element {
        return (
            <StringInputComponent
                cssClass={"deploy-comment-text"}
                ref={this._resolveRef("_commentBox")}
                inputClassName={"deploy-comment-text-input"}
                label={Resources.Comment}
                value={this.state.deployComment}
                onValueChanged={this.onTextChange}
                isMultilineExpandable={true}
                rows={4}
                disabled={this.state.deployProgressState === IEnvironmentDeployProgressState.InProgress}
            />
        );
    }

    private _getDeploymentOptionSection(): JSX.Element {
        return this._isDeploymentOptionPanelVisible
             ? (                
                <div className="deploy-panel-section overview deploy-panel-deploymentoption">
                    <CollapsibleDeploymentOptionSection
                        label={Resources.DeploymentOptionSectionHeading}
                        headingLevel={2}
                        description={Resources.DeploymentOptionSectionDescription}
                        releaseDefinitionFolderPath={this._releaseStore.getReleaseDefinitionFolderPath()}
                        releaseDefinitionId={this._releaseStore.getReleaseDefinitionId()}
                        definitionEnvironmentId={this._releaseEnvironmentStore.getEnvironment().definitionEnvironmentId}
                        instanceId={this.props.instanceId}
                        deploymentOption={this.state.deploymentOption} />
                </div>
               ) : null;
    }

    private _getActionButtons(): JSX.Element {
        //TODO - bind onClick
        let buttonsDisabled = this.state.deployProgressState === IEnvironmentDeployProgressState.InProgress;
        return <div className="deploy-panel action-buttons">
            <PrimaryButton className="deploy-button" disabled={buttonsDisabled} onClick={this._onDeployClick}>
                {Resources.DeployAction}
            </PrimaryButton>
            <DefaultButton className="cancel-deploy-button" disabled={buttonsDisabled} onClick={this.onCancelClick}>
                {Resources.CancelText}
            </DefaultButton>
        </div>;
    }

    @autobind
    private _onDeployClick(): void {
        const environment = this._releaseEnvironmentStore.getEnvironment();
        const releaseDefinitionId = this._releaseStore.getReleaseDefinitionId();

        const environmentSkeleton = {
            id: environment.id,
            name: environment.name
        } as IEnvironmentSkeleton;

        let deployTimeOverrideVariables: IDictionaryStringTo<RMContracts.ConfigurationVariableValue> = {};        

        if (this.state.deploymentOption && this.state.deploymentOption === RMConstants.RedeploymentDeploymentGroupTargetFilter.FailedTargets) {

            deployTimeOverrideVariables[RMConstants.WellKnownReleaseVariables.ReleaseEnvironmentRedeploymentWithDeploymentGroupTargetFilter] =         
                        { value: RMConstants.RedeploymentDeploymentGroupTargetFilter.FailedTargets, isSecret: false, allowOverride: true };
        }

        const isRollback = this.state.releaseToCompare
            && this.state.releaseToCompare[environment.id]
            && this.state.releaseToCompare[environment.id].isRollback;
        this._actionsCreator.publishSingleDeployClickTelemetry(environment.releaseId, releaseDefinitionId, environment,
            this.state.deployComment ? true : false, isRollback);
        this._actionsCreator.deployEnvironments(environment.releaseId, releaseDefinitionId, [environmentSkeleton],
            this.state.deployComment ? this.state.deployComment.trim() : Utils_String.empty, 1, deployTimeOverrideVariables).then((succeeded: boolean) => {
                if (succeeded && this.props.onActionComplete) {
                    this.props.onActionComplete();

                    //default the deployment option back to target filter none
                    this._actionsCreator.updateDeploymentOption(RMConstants.RedeploymentDeploymentGroupTargetFilter.None);
                }
            });
        this._releaseTaskAttachmentActionCreator.clearCache();        
    }

    @autobind
    private onCancelClick(): void {
        if (this.props.onActionComplete) {
            this.props.onActionComplete();
        }
    }

    @autobind
    private onTextChange(newValue: string): void {
        let valueToSet: string = newValue;
        this.setState({ deployComment: valueToSet } as IDeployEnvironmentsPanelItemViewState);
    }

    private _onChange = () => {
        this.setState(this._viewStore.getState());
    }

    private _isDeploymentOptionSectionVisible(environment: RMContracts.ReleaseEnvironment): boolean {
        if (FeatureFlagUtils.isDeploymentOnDeploymentGroupFailedTargetsEnabled()) {
            // environment must be PartiallySucceeded or Rejected
            if (environment.status === RMContracts.EnvironmentStatus.PartiallySucceeded || environment.status === RMContracts.EnvironmentStatus.Rejected ) {
                if (environment.deploySteps && environment.deploySteps.length > 0) {

                    let latestDeploymentAttempt = ReleaseDeploymentAttemptHelper.getLatestDeploymentAttempt(environment.deploySteps);
                    if (latestDeploymentAttempt && latestDeploymentAttempt.releaseDeployPhases &&  latestDeploymentAttempt.releaseDeployPhases.length > 0) {

                        return latestDeploymentAttempt.releaseDeployPhases.some(phase => phase.phaseType === RMContracts.DeployPhaseTypes.MachineGroupBasedDeployment
                                                                                        && (phase.status === RMContracts.DeployPhaseStatus.PartiallySucceeded || phase.status === RMContracts.DeployPhaseStatus.Failed ));
                    }
                }
            }
        }          

        return false;
    }

    private _viewStore: DeployEnvironmentsPanelViewStore;
    private _actionsCreator: DeployEnvironmentsPanelActionCreator;
    private _releaseEnvironmentStore: ReleaseEnvironmentStore;
    private _releaseStore: ReleaseStore;
    private _releaseTaskAttachmentActionCreator: ReleaseTaskAttachmentActionCreator;
    private _commentBox: StringInputComponent;
    private _isDeploymentOptionPanelVisible: boolean;
    
}