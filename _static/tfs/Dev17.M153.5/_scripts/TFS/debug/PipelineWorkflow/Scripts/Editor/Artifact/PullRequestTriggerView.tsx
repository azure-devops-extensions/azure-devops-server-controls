/// <reference types="react" />
import * as React from "react";

import "VSS/LoaderPlugins/Css!RM:PipelineWorkflow/Scripts/Editor/Artifact/PullRequestTriggerView";

import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import * as ComponentBase from "DistributedTaskControls/Common/Components/Base";
import { FormattedComponent } from "DistributedTaskControls/Common/Components/FormattedComponent";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { DtcUtils } from "DistributedTaskControls/Common/Utilities";
import { ICalloutContentProps } from "DistributedTaskControls/Components/CalloutComponent";
import { Component as InfoButton } from "DistributedTaskControls/Components/InfoButton";
import { LoadingComponent } from "DistributedTaskControls/Components/LoadingComponent";
import { MessageBarComponent } from "DistributedTaskControls/Components/MessageBarComponent";
import { OverlayPanelHeading } from "DistributedTaskControls/Components/OverlayPanelHeading";
import { MessageBarType } from "OfficeFabric/MessageBar";
import { Toggle } from "OfficeFabric/Toggle";
import { ArtifactStore } from "PipelineWorkflow/Scripts/Editor/Artifact/ArtifactStore";
import { ArtifactTriggerStrings } from "PipelineWorkflow/Scripts/Editor/Artifact/ArtifactTriggerStrings";
import { PullRequestTriggerActionsCreator } from "PipelineWorkflow/Scripts/Editor/Artifact/PullRequestTriggerActionsCreator";
import {
    IPullRequestTriggerStoreState,
    PullRequestTriggerStore,
} from "PipelineWorkflow/Scripts/Editor/Artifact/PullRequestTriggerStore";
import {
    PullRequestTriggerViewForBuildArtifactAndGithubSCM,
} from "PipelineWorkflow/Scripts/Editor/Artifact/PullRequestTriggerViewForBuildArtifactAndGithubSCM";
import {
    PullRequestTriggerViewForBuildArtifactAndTfsGitSCM,
} from "PipelineWorkflow/Scripts/Editor/Artifact/PullRequestTriggerViewForBuildArtifactAndTfsGitSCM";
import { PullRequestTriggerViewForTfsGit } from "PipelineWorkflow/Scripts/Editor/Artifact/PullRequestTriggerViewForTfsGit";
import { EnvironmentListStore } from "PipelineWorkflow/Scripts/Editor/Environment/EnvironmentListStore";
import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";
import { ArtifactTypes, WellKnownPullRequestVariables } from "ReleaseManagement/Core/Constants";
import { PullRequestFilter, PullRequestSystemType } from "ReleaseManagement/Core/Contracts";
import * as Utils_String from "VSS/Utils/String";

export interface IPullRequestTriggerViewState extends IPullRequestTriggerStoreState {
}

/**
 * View containing pull request trigger view
 */
export class PullRequestTriggerView extends ComponentBase.Component<ComponentBase.IProps, IPullRequestTriggerViewState> {

    public componentWillMount() {
        this._store = StoreManager.GetStore<PullRequestTriggerStore>(PullRequestTriggerStore, this.props.instanceId);
        this._artifactStore = StoreManager.GetStore<ArtifactStore>(ArtifactStore, this.props.instanceId);
        this._actionCreator = ActionCreatorManager.GetActionCreator<PullRequestTriggerActionsCreator>(PullRequestTriggerActionsCreator, this.props.instanceId);
        this._environmentListStore = StoreManager.GetStore<EnvironmentListStore>(EnvironmentListStore);
        this._store.addChangedListener(this._onChanged);
        this.setState(this._store.getState());
    }

    public componentDidMount() {
        this._initialize();
    }

    public componentWillUnmount() {
        this._store.removeChangedListener(this._onChanged);
    }

    public render(): JSX.Element {
        const ariaLabelIdForPRTrigger = "overlay-panel-heading-label-" + DtcUtils.getUniqueInstanceId();
        let descriptionForPRTrigger = Utils_String.format(ArtifactTriggerStrings.getTriggerDescription(this._artifactStore.getState().type), this._artifactStore.getState().alias);
        let artifactType = this._artifactStore.getState().type;

        // If we have the build definition and if the type is not supported, then don't show anything.
        if (this.state.isPullRequestTriggerSupported) {
            return (
                <div className="pullrequest-trigger">
                    <div className="pullrequest-trigger-heading-container">
                        <OverlayPanelHeading label={Resources.PullRequestTriggerLabel} labelId={ariaLabelIdForPRTrigger}
                            description={descriptionForPRTrigger} />
                    </div>

                    <div className="toggle-container">
                        <Toggle
                            checked={this.state.isToggleEnabled}
                            onText={Resources.EnabledText}
                            offText={Resources.DisabledText}
                            onAriaLabel={Resources.PullRequestTriggerEnabledText}
                            offAriaLabel={Resources.PullRequestTriggerDisabledText}
                            onChanged={this._handleToggleChange}
                            aria-labelledby={ariaLabelIdForPRTrigger} />
                        
                        {this.state.isToggleEnabled &&
                            <div className="toggle-help-text">{Resources.PullRequestToggleHelpText}</div>
                        }
                    </div>

                    {this.state.isToggleEnabled &&
                    <div className="pullrequest-trigger-branch-filter-header">
                        {Resources.TargetBranchFilters}
                        <InfoButton isIconFocusable={true} calloutContent={
                            {
                                calloutMarkdown: Resources.PullRequestTriggerTargetBranchCallout
                            } as ICalloutContentProps} />
                    </div>
                    }

                    {this.state.isToggleEnabled &&
                        this._getFilterComponent()
                    }
                    
                    
                    {this.state.isToggleEnabled &&
                    <div className="pullrequest-trigger-env-section">
                        <div className="pullrequest-trigger-env-header">
                            {Resources.EnvironmentsLabelText}
                            <InfoButton isIconFocusable={true} calloutContent={
                                {
                                    calloutMarkdown: Resources.PullRequestTriggerEnvironmentCallout
                                } as ICalloutContentProps} />
                        </div>
                        {this._getEnvironmentsSection()}
                    </div>
                    }

                    {!this.state.isToggleEnabled &&
                        <MessageBarComponent
                            className="artifact-trigger-disabled-message"
                            messageBarType={MessageBarType.info}>
                        {Resources.PullRequestTriggerDescription}
                        </MessageBarComponent>
                    }
                </div>
            );
        }

        return null;
    }

    private _initialize() {
        let buildDefinitionId = parseInt(this._artifactStore.getDefinitionId());
        let projectId = this._artifactStore.getProjectId();
        let artifactType = this._artifactStore.getState().type;
        if (artifactType === ArtifactTypes.BuildArtifactType && !this.state.codeRepositoryReference) {
            this._actionCreator.initializeBuildProperties(projectId, buildDefinitionId);
        } else if (artifactType === ArtifactTypes.GitArtifactType) {
            this._actionCreator.initializeTfsGitProperties();
        }
    }

    private _getFilterComponent(): JSX.Element {
        let artifactType = this._artifactStore.getState().type;

        switch (artifactType) {
            case ArtifactTypes.BuildArtifactType:
                return this._getComponentForBuild();

            case ArtifactTypes.GitArtifactType:
                return this._getComponentForTfsGitArtifact();

            default:
                return null;
        }
    }
    private _getComponentForBuild(): JSX.Element {
        if (this.state.codeRepositoryReference) {
            if (this.state.codeRepositoryReference.systemType === PullRequestSystemType.TfsGit) {
                return (
                    <PullRequestTriggerViewForBuildArtifactAndTfsGitSCM
                        filters={this.state.filters}
                        onAddFilterClick={this._onAddFilterClick}
                        onFilterChange={this._onFilterChange}
                        onFilterDelete={this._onFilterDelete}
                        allTags={this.state.allTags}
                        repositoryId={this.state.codeRepositoryReference.repositoryReference[WellKnownPullRequestVariables.TfsGitRepositoryId].value}
                    />
                );
            } else if (this.state.codeRepositoryReference.systemType === PullRequestSystemType.GitHub) {
                return (
                    <PullRequestTriggerViewForBuildArtifactAndGithubSCM
                        filters={this.state.filters}
                        onAddFilterClick={this._onAddFilterClick}
                        onFilterChange={this._onFilterChange}
                        onFilterDelete={this._onFilterDelete}
                        connectedService={this.state.codeRepositoryReference.repositoryReference[WellKnownPullRequestVariables.GitHubConnection].value}
                        repositoryName={this.state.codeRepositoryReference.repositoryReference[WellKnownPullRequestVariables.GitHubRepositoryName].value}
                        allTags={this.state.allTags}
                    />
                );
            }
        } else {
            return <LoadingComponent />;
        }
    }

    private _getComponentForTfsGitArtifact(): JSX.Element {
        let repoId = this._artifactStore.getDefinitionId();
        return (
            <PullRequestTriggerViewForTfsGit
                filters={this.state.filters}
                onAddFilterClick={this._onAddFilterClick}
                onFilterChange={this._onFilterChange}
                onFilterDelete={this._onFilterDelete}
                repositoryId={repoId}
            />);
    }

    private _getEnvironmentsSection(): JSX.Element {
        let envs = this._environmentListStore.getCurrentState();
        let enabledEnvNames = envs.filter((env) => env.environmentOptions.pullRequestDeploymentEnabled).map((env) => env.name);     
        let enabledEnvMessage = (<span> <b>{Utils_String.localeFormat(Resources.XOfY, enabledEnvNames.length, envs.length)} </b> {Resources.PullRequestTriggerEnabledEnvironmentsMessage} </span>);
        
        
        Utils_String.localeFormat(Resources.PullRequestTriggerEnabledEnvironmentsMessage, enabledEnvNames.length, envs.length );
        if (enabledEnvNames.length === 0){
            // warning bar
            return (<MessageBarComponent messageBarType={MessageBarType.warning}>
                {enabledEnvMessage} {}
            </MessageBarComponent>);
        }else{
            let envNames = enabledEnvNames.join(",");
            let envNamesMessage = (
                <FormattedComponent format={Resources.PullRequestTriggerFollowingEnvironmentsEnabledMessage}>
                    <b> {envNames} </b>
                </FormattedComponent>
            );
            return (<MessageBarComponent messageBarType={MessageBarType.info}>
                {enabledEnvMessage} <br/>
                {envNamesMessage}
            </MessageBarComponent>);
        }
    }

    private _onFilterDelete = (rowIndex: number) => {
        this._actionCreator.deleteFilter(rowIndex);
    }

    private _onAddFilterClick = (event?: React.MouseEvent<HTMLButtonElement>) => {
        this._actionCreator.addFilter();
    }

    private _onChanged = () => {
        let storeState = this._store.getState();
        this.setState(storeState);
    }

    private _handleToggleChange = (checked: boolean) => {
        //Raise an action to change the toggle state
        this._actionCreator.toggleChanged(checked);
    }

    private _onFilterChange = (index: number, filter: PullRequestFilter) => {
        this._actionCreator.changeFilter(index, filter);
    }

    private _artifactStore: ArtifactStore;
    private _actionCreator: PullRequestTriggerActionsCreator;
    private _store: PullRequestTriggerStore;
    private _environmentListStore: EnvironmentListStore;
}