/// <reference types="react" />
import * as React from "react";

import "VSS/LoaderPlugins/Css!RM:PipelineWorkflow/Scripts/ReleaseProgress/Canvas/DeployMultipleEnvironmentsPanel";

import { MessageHandlerActionsCreator } from "DistributedTaskControls/Actions/MessageHandlerActionsCreator";
import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import * as Base from "DistributedTaskControls/Common/Components/Base";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { Component as ErrorComponent } from "DistributedTaskControls/Components/InformationBar";
import { OverlayPanelHeading } from "DistributedTaskControls/Components/OverlayPanelHeading";
import { AccordionCustomRenderer } from "DistributedTaskControls/SharedControls/Accordion/AccordionCustomRenderer";
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
    DeployMultipleEnvironmentsList,
} from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/DeployMultipleEnvironmentsList";
import {
    DeployMultipleEnvironmentsPanelActionCreator,
} from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/DeployMultipleEnvironmentsPanelActionCreator";
import {
    DeployEnvironmentsPanelActions,
    IEnvironmentDeployProgressState,
    IEnvironmentSkeleton
} from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/DeployEnvironmentsPanelActions";
import {
    DeployEnvironmentsPanelViewStore,
    IDeployEnvironmentsPanelItemViewState,
} from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/DeployEnvironmentsPanelViewStore";
import {
    EnvironmentDeployPanelReleaseSection,
} from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/EnvironmentDeployPanelReleaseSection";
import { ReleaseStore } from "PipelineWorkflow/Scripts/ReleaseProgress/Release/ReleaseStore";
import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";
import * as ReleaseContracts from "ReleaseManagement/Core/Contracts";
import * as Utils_String from "VSS/Utils/String";

export interface IDeployMultipleEnvironmentsPanelProps extends Base.IProps {
    onActionComplete?: () => void;
}

export class DeployMultipleEnvironmentsPanel extends Base.Component<IDeployMultipleEnvironmentsPanelProps, IDeployEnvironmentsPanelItemViewState> {

    public componentWillMount() {
        this._releaseStore = StoreManager.GetStore<ReleaseStore>(ReleaseStore);
        this._actionsCreator = ActionCreatorManager.GetActionCreator<DeployMultipleEnvironmentsPanelActionCreator>(
            DeployMultipleEnvironmentsPanelActionCreator, this.props.instanceId + DeployEnvironmentsPanelActions.SOURCE_KEY_MULTIPLE);

        this._viewStore = this.getViewStore();
        this._viewStore.addChangedListener(this._onChange);
        this.setState(this._viewStore.getState());

        let release = this._releaseStore.getRelease();
        let artifacts = this._releaseStore.getArtifacts();
        this._actionsCreator.initializeData(release.releaseDefinition.id, release.id, release.environments, artifacts);
    }

    public componentWillUnmount(): void {
        this._viewStore.removeChangedListener(this._onChange);
    }

    private getViewStore() {
        return StoreManager.GetStore<DeployEnvironmentsPanelViewStore>(DeployEnvironmentsPanelViewStore, this.props.instanceId + DeployEnvironmentsPanelActions.SOURCE_KEY_MULTIPLE);
    }

    private _initializeReleasesToCompare(release: ReleaseContracts.Release) {
        let artifacts = this._releaseStore.getArtifacts();
        this._actionsCreator.initializeReleasesToCompare(release.releaseDefinition.id, release.id, this.state.deployableEnvironments, artifacts);
    }

    public render(): JSX.Element {
        return (<div className="multiple-deploy-panel">
            {this._renderHeader()}
            {this._renderBody()}
        </div>);
    }

    private _renderBody() {
        return (<div className="multiple-deploy-panel-content-section">
            {this._renderEnvironmentList()}
            {this._getCommentBox()}
            {this._getDeployErrorMessage()}
            {this._getDeploySpinnerMessage()}       
            {this._renderFooter()}             
        </div>);
    }

    private _renderEnvironmentList(): JSX.Element {
        //TODO: replace with aon when variables come in
        return (<div>
            <div className="multiple-deploy-panel-environment-section-header-container">
                <div className="multiple-deploy-panel-environment-section-header">
                    {Resources.EnvironmentsText}
                </div>
                <div className="multiple-deploy-panel-environment-section-description">
                    {Resources.SelectEnvironmentDescription}
                </div>
            </div>
            <LoadableComponent
                instanceId={this.props.instanceId + DeployEnvironmentsPanelActions.SOURCE_KEY_MULTIPLE}
                label={Resources.Loading}
                wait={0}>
                <div className="multiple-deploy-panel-environments">
                    {this._getEnvironmentsSection()}
                </div>
            </LoadableComponent>
            <div className="multiple-deploy-panel-empty-separator"></div>
        </div>
        );
    }

    private _getEnvironmentsSection(): JSX.Element {
        let selectionDisabled = this._viewStore.isSelectionDisabled();
        return <div>
            {this._getFetchEnvironmentsErrorMessage()}
            {!this.state.fetchingReleasesError &&
                <DeployMultipleEnvironmentsList
                    instanceId={this.props.instanceId}
                    environments={this._getEnvironmentsSkeleton(this.state.deployableEnvironments)}
                    releaseToCompare={this.state.releaseToCompare}
                    demands={this._viewStore.getDemandWarnings()}
                    setSelectedEnvironments={this._setSelectedEnvironments.bind(this)}
                    disabled={selectionDisabled} />
            }
        </div>;
    }

    private _getEnvironmentsSkeleton(environments: ReleaseContracts.ReleaseEnvironment[]): IEnvironmentSkeleton[] {
        return environments.map((environment: ReleaseContracts.ReleaseEnvironment) => {
            return {
                id: environment.id,
                name: environment.name
            } as IEnvironmentSkeleton;
        });
    }

    private _setSelectedEnvironments(selectedEnvironments: IEnvironmentSkeleton[]) {
        this.setState({
            selectedEnvironments: selectedEnvironments
        });
    }

    private _getFetchEnvironmentsErrorMessage(): JSX.Element {
        return <div className="multiple-deploy-panel-current-release error-message">
            <ErrorComponent
                parentKey={this.props.instanceId + DeployEnvironmentsPanelActions.SOURCE_KEY_MULTIPLE}
                showRetry={true}
                onRetryClick={this._onRetryClick}
                hideDismiss={true}>
            </ErrorComponent>
        </div>;
    }

    private _onRetryClick = (): void => {
        const loadableComponentActionCreator: LoadableComponentActionsCreator =
            ActionCreatorManager.GetActionCreator<LoadableComponentActionsCreator>(LoadableComponentActionsCreator, this.props.instanceId + DeployEnvironmentsPanelActions.SOURCE_KEY_MULTIPLE);
        const messageHandlerActionCreator: MessageHandlerActionsCreator =
            ActionCreatorManager.GetActionCreator<MessageHandlerActionsCreator>(MessageHandlerActionsCreator);

        loadableComponentActionCreator.showLoadingExperience();
        messageHandlerActionCreator.dismissMessage(this.props.instanceId + DeployEnvironmentsPanelActions.SOURCE_KEY_MULTIPLE);
        let release = this._releaseStore.getRelease();
        this._initializeReleasesToCompare(release);
    }

    private _renderHeader(): JSX.Element {
        return (<div className="multiple-deploy-panel-header-section">
            <OverlayPanelHeading
                label={Resources.DeployRelease}
                infoButtonRequired={false}
                description={Resources.MultipleEnvironments}>
            </OverlayPanelHeading>
        </div>);
    }

    private _renderFooter(): JSX.Element {
        return (<div className="multiple-deploy-panel-section-footer-section">
            {this._getActionButtons()}
        </div>);
    }

    private _getCommentBox(): JSX.Element {
        return (
            <StringInputComponent
                cssClass={"multiple-deploy-comment-text"}
                inputClassName={"multiple-deploy-comment-input"}
                label={Resources.Comment}
                value={this.state.deployComment}
                onValueChanged={this.onCommentChange}
                isMultilineExpandable={true}
                rows={4}
                disabled={this.state.deployProgressState === IEnvironmentDeployProgressState.InProgress}
            />
        );
    }

    private _getActionButtons(): JSX.Element {
        let canPerformAction = this.state.deployProgressState !== IEnvironmentDeployProgressState.InProgress;
        let canDeploy = canPerformAction
            && this.state.selectedEnvironments.length > 0
            && this.state.deployProgressState !== IEnvironmentDeployProgressState.Error;

        return <div className="multiple-deploy-panel-multiple-deploy-action-buttons">
            <PrimaryButton className="multiple-deploy-button" disabled={!canDeploy} onClick={this.onDeployClick.bind(this)}>
                {Resources.DeployAction}
            </PrimaryButton>
            <DefaultButton className="cancel-multiple-deploy-button" disabled={!canPerformAction} onClick={this.onCancelClick.bind(this)}>
                {Resources.CancelText}
            </DefaultButton>
        </div>;
    }

    private _getDeployErrorMessage(): JSX.Element {
        let errorMessage = null;
        if (this.state.deployErrorMessage &&
            this.state.deployProgressState === IEnvironmentDeployProgressState.Error) {
            errorMessage = <div className="multiple-deploy-panel-multiple-deploy-action error-message"><MessageBar
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
            spinner = <div className="multiple-deploy-progress-spinner">
                <Spinner
                    type={SpinnerType.normal}
                    label={Resources.Deploying}
                    ariaLabel={Resources.Deploying} />
            </div>;
        }
        return spinner;
    }

    @autobind
    private onDeployClick(): void {
        let release = this._releaseStore.getRelease();
        this._actionsCreator.deployEnvironments(release.id, release.releaseDefinition.id, this.state.selectedEnvironments,
            this.state.deployComment ? this.state.deployComment.trim() : Utils_String.empty, this.state.deployableEnvironments.length).then((succeeded: boolean) => {
                if (succeeded && this.props.onActionComplete) {
                    this.props.onActionComplete();
                }
            });
    }

    @autobind
    private onCancelClick(): void {
        if (this.props.onActionComplete) {
            this.props.onActionComplete();
        }
    }

    @autobind
    private onCommentChange(newValue: string): void {
        let valueToSet: string = newValue;
        this.setState({ deployComment: valueToSet } as IDeployEnvironmentsPanelItemViewState);
    }

    private _onChange = () => {
        this.setState(this._viewStore.getState());
    }

    private _viewStore: DeployEnvironmentsPanelViewStore;
    private _actionsCreator: DeployMultipleEnvironmentsPanelActionCreator;
    private _releaseStore: ReleaseStore;
}