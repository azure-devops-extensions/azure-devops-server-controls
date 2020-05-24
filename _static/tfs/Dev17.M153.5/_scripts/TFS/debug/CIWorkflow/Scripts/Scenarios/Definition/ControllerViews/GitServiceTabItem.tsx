/// <reference types="react" />

import * as Q from "q";
import * as React from "react";

import * as Resources from "CIWorkflow/Scripts/Resources/TFS.Resources.CIWorkflow";
import { ScmUtils } from "CIWorkflow/Scripts/Common/ScmUtils";
import { BuildDefinitionActionsCreator } from "CIWorkflow/Scripts/Scenarios/Definition/Actions/BuildDefinitionActionsCreator";
import { SourcesSelectionActionsCreator } from "CIWorkflow/Scripts/Scenarios/Definition/Actions/SourcesSelectionActionsCreator";
import { VersionControlActionsCreator } from "CIWorkflow/Scripts/Scenarios/Definition/Actions/VersionControlActionsCreator";
import { Component as GitRepositoryBrowser } from "CIWorkflow/Scripts/Scenarios/Definition/Components/GitRepositoryBrowser";
import { ISourceTabItemProps } from "CIWorkflow/Scripts/Scenarios/Definition/ControllerViews/GetSourcesControllerView";
import { GitAdvancedSettings } from "CIWorkflow/Scripts/Scenarios/Definition/ControllerViews/GitAdvancedSettings";
import { Component as ServiceEndpointSelectionControl } from "CIWorkflow/Scripts/Scenarios/Definition/ControllerViews/ServiceEndpointSelectionControl";
import { IRepository } from "CIWorkflow/Scripts/Scenarios/Definition/Sources/VersionControlInterfaces";
import { VersionControlStore, IVersionControlState, RepositoryStatus } from "CIWorkflow/Scripts/Scenarios/Definition/Stores/VersionControlStore";

import { ConnectedServiceActionsCreator } from "DistributedTaskControls/Actions/ConnectedServiceEndpointActionsCreator";
import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import * as Base from "DistributedTaskControls/Common/Components/Base";
import * as SafeLink from "DistributedTaskControls/Components/SafeLink";
import * as DTCResources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";
import { ComboBoxInputComponent, ComboBoxType } from "DistributedTaskControls/SharedControls/InputControls/Components/ComboBoxInputComponent";

import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { FilePathInputComponent } from "DistributedTaskControls/SharedControls/InputControls/Components/FilePathInputComponent";
import { ISelectedPathNode } from "DistributedTasksCommon/TFS.Tasks.Types";

import { MessageBar, MessageBarType } from "OfficeFabric/MessageBar";

import { InputValue } from "VSS/Common/Contracts/FormInput";
import * as Utils_Number from "VSS/Utils/Number";
import * as Utils_String from "VSS/Utils/String";

import "VSS/LoaderPlugins/Css!CIWorkflow/Scripts/Scenarios/Definition/ControllerViews/GitServiceTabItem";

export class Component extends Base.Component<ISourceTabItemProps, IVersionControlState> {
    private _sourcesActionCreator: SourcesSelectionActionsCreator;
    private _connectedServiceEndpointActionsCreator: ConnectedServiceActionsCreator;
    private _buildDefinitionActionsCreator: BuildDefinitionActionsCreator;
    private _versionControlActionsCreator: VersionControlActionsCreator;
    private _versionControlStore: VersionControlStore;
    private _repoKeyValuePair: IDictionaryStringTo<string>;
    private _showDialog: boolean;
    private _validateRepository: Q.Deferred<string>;

    constructor(props: ISourceTabItemProps) {
        super(props);

        this._connectedServiceEndpointActionsCreator = ActionCreatorManager.GetActionCreator<ConnectedServiceActionsCreator>(ConnectedServiceActionsCreator);
        this._buildDefinitionActionsCreator = ActionCreatorManager.GetActionCreator<BuildDefinitionActionsCreator>(BuildDefinitionActionsCreator);
        this._sourcesActionCreator = ActionCreatorManager.GetActionCreator<SourcesSelectionActionsCreator>(SourcesSelectionActionsCreator);
        this._versionControlActionsCreator = ActionCreatorManager.GetActionCreator<VersionControlActionsCreator>(VersionControlActionsCreator);

        this._versionControlStore = StoreManager.GetStore<VersionControlStore>(VersionControlStore);
    }

    public render(): JSX.Element {
        return (
            <div className="ci-github-tab-item">
                {
                    this.state.errorMessage &&
                    <MessageBar
                        messageBarType={MessageBarType.error}
                        onDismiss={this._onDismissMessage}
                        dismissButtonAriaLabel={DTCResources.CloseButtonText}>
                        {this.state.errorMessage}
                    </MessageBar>
                }
                <ServiceEndpointSelectionControl {...this.props} />
                {
                    // we'll show the details if we're read-only. the connections check is not valid in this case.
                    (!!this.props.isReadOnly || (this.state.connections && this.state.connections.length > 0)) ?
                        <div className="ci-github-tab-content">
                            <RepositoryLabel
                                id={"ci-github-tab-item-repository-label"}
                                required={true}
                                manageSourceText={this.state.manageSourceText}
                                manageSourceHref={this.state.manageSourceHref}
                            />
                            {<div>
                                <div onBlur={this._onSelectedRepositoryBlur}>
                                    <FilePathInputComponent
                                        disabled={!!this.props.isReadOnly || this.state.isManagedExternally}
                                        readOnly={false}
                                        ariaLabelledBy={"ci-github-tab-item-repository-label"}
                                        label={Utils_String.empty}
                                        isFileSystemBrowsable={() => true}
                                        onValueChanged={this._onSelectedRepositoryTyped}
                                        filePathProviderDelegate={this._onShowRepositoryBrowser}
                                        value={this.state.selectedRepository.name}
                                        required={true}
                                        getErrorMessage={this._getRepositoryErrorMessage} />
                                </div>
                                <GitRepositoryBrowser
                                    showDialog={this._showDialog}
                                    onSave={this._onSelectedRepositoryChanged}
                                    onCloseDialog={this._onCloseRepositoryBrowser} />
                            </div>
                            }
                            {
                                this.state.isManagedExternally &&
                                <div className="ci-github-xlaunch-repo-warning">
                                    <MessageBar
                                        messageBarType={MessageBarType.warning}
                                        onDismiss={null}
                                        dismissButtonAriaLabel={DTCResources.CloseButtonText}>
                                        {Resources.BlockSelectRepoForXLaunchBuild}
                                    </MessageBar>
                                </div>
                            }
                            <ComboBoxInputComponent
                                label={Resources.DefaultBranchLabelForDefinitions}
                                source={this._getBranches()}
                                onValueChanged={this._onSelectedBranchChanged}
                                comboBoxType={ComboBoxType.Searchable}
                                value={this.state.selectedBranchName}
                                required={true}
                                errorMessage={Resources.SettingsRequired}
                                disabled={!!this.props.isReadOnly} />

                            <GitAdvancedSettings
                                id={this.props.id}
                                showAdvancedSettings={this.props.showAdvancedSettings}
                                showReportStatusOption={true}
                                reportBuildStatus={this.state.reportBuildStatus}
                                cleanRepository={this.state.cleanRepository.toString()}
                                isCleanRepositoryEnabled={this.state.cleanRepository}
                                cleanOptions={this.state.cleanOption}
                                checkoutSubmodules={this.state.checkoutSubmodules}
                                checkoutNestedSubmodules={this.state.checkoutNestedSubmodules}
                                gitLfsSupportStatus={this.state.largeFileSupport}
                                skipSyncSourcesStatus={this.state.skipSyncSources}
                                shallowFetch={this.state.shallowFetchStatus}
                                shallowFetchDepth={this.state.fetchDepth.toString()}
                                showLabelSourcesOption={this.state.supportCreateLabel}
                                sourceLabelOption={ScmUtils.getSourceLabelOptions()}
                                validateLabelSourcesFormat={ScmUtils.validateLabelSourcesFormat}
                                sourceLabel={this._versionControlStore.getSelectedSourceLabel()}
                                getErrorMessage={this._getShallowDepthErrorMessage}
                                isReadOnly={!!this.props.isReadOnly}>
                            </GitAdvancedSettings>
                        </div>
                        : null
                }
            </div>
        );
    }

    public componentWillMount(): void {
        // When we switch tabs, the component is mounted again. In that case,
        // we should be using the state saved in the store. Otherwise, we
        // should just let the UI initialize based on the current project.
        // TODO change the class to use IVersionControlState instead of GitState
        const state: IVersionControlState = this._versionControlStore.getState();
        this._updateState(false);
        this._connectedServiceEndpointActionsCreator.getServiceEndpoints(state.endpointType, state.selectedConnectionId, state.selectedRepository.name);
        this._versionControlStore.addChangedListener(this._onChange);
    }

    public componentWillUnmount(): void {
        this._versionControlStore.removeChangedListener(this._onChange);
    }

    private _getRepositories(): string[] {
        const repositoriesDropdownOptions: string[] = [];
        this._repoKeyValuePair = {};

        const repositories = this.state.repositories || [];
        repositories.forEach((repository: IRepository) => {
            repositoriesDropdownOptions.push(repository.name);
        });

        return repositoriesDropdownOptions;
    }

    private _onSelectedRepositoryTyped = (selectedRepoKey: string): void => {
        // Fire an event letting the store know that the user is typing or changing the value
        this._versionControlActionsCreator.updateSelectedRepositoryFromName(selectedRepoKey, false);
    }

    private _onSelectedRepositoryChanged = (selectedRepoKey: string): void => {
        // Fire an event letting the store know that the user is typing or changing the value
        this._versionControlActionsCreator.updateSelectedRepositoryFromName(selectedRepoKey, true);
        this._showDialog = false;
        this.forceUpdate();
    }

    private _onCloseRepositoryBrowser = (): void => {
        this._showDialog = false;
        this.forceUpdate();
    }

    private _onSelectedRepositoryBlur = (): void => {
        // Update the selected repository from the text that the user entered
        // This will query the endpoint for the repository information if needed
        const repoName: string = this.state.selectedRepository.name.trim();
        this._versionControlActionsCreator.updateSelectedRepositoryFromName(repoName, true);
    }

    private _onSelectedBranchChanged = (selectedBranchName: string): void => {
        this._versionControlActionsCreator.updateSelectedBranch(selectedBranchName);
    }

    private _onShowRepositoryBrowser = (currentValue: string, callback: (node: ISelectedPathNode) => void) => {
        this._showDialog = true;
        this.forceUpdate();
    }

    private _getBranches(): string[] {
        return (this.state.branches || []);
    }

    private _getShallowDepthErrorMessage = (value: string): string => {
        const state = this._versionControlStore.getState();
        if (state.shallowFetchStatus && (!value || !Utils_Number.isPositiveNumber(value))) {
            return Resources.PositiveNumberTextFieldValidationErrorMessage;
        }
        return Utils_String.empty;
    }

    private _getRepositoryErrorMessage = (value: string): string | IPromise<string> => {
        if (!value) {
            return Resources.EnterRepositoryOrBrowse;
        }

        const state = this._versionControlStore.getState();
        if (state.selectedRepository && state.selectedRepository.name === value.trim()) {
            if (state.selectedRepositoryStatus === RepositoryStatus.Valid) {
                return Utils_String.empty;
            }
            if (state.selectedRepositoryStatus === RepositoryStatus.Invalid) {
                return Resources.SettingsRequired;
            }
        }

        // This needs to be done because validation doesn't happen when a render happens,
        // so this returns a promise that resolves when the VersionControlStore's state
        // is updated.
        this._validateRepository = Q.defer<string>();
        return this._validateRepository.promise;
    }

    private _onChange = (): void => {
        this._updateState(false);
    }

    private _onDismissMessage = () => {
        this._updateState(true);
    }

    private _updateState(clearError: boolean) {
        const state: IVersionControlState = this._versionControlStore.getState();
        if (clearError) {
            state.errorMessage = Utils_String.empty;
        }
        if (this._validateRepository && state.selectedRepositoryStatus !== RepositoryStatus.Unknown) {
            const message: string = state.selectedRepositoryStatus === RepositoryStatus.Valid ? Utils_String.empty : Resources.SettingsRequired;
            this._validateRepository.resolve(message);
            this._validateRepository = null;
        }
        this.setState(state);
    }

    private _convertRepositories(repositories: IRepository[]): InputValue[] {
        const result: InputValue[] = [];
        for (const repo of repositories) {
            result.push({
                displayValue: repo.name,
                value: repo.url,
                data: repo.data
            });
        }
        return result;
    }
}

interface IRepositoryLabelProps {
    manageSourceHref: string;
    manageSourceText: string;
    required?: boolean;
    id: string;
}
const RepositoryLabel = (props: IRepositoryLabelProps) => {
    return (<div>
        <span id={props.id}
            {...props.required ? { className: "required-indicator" } : {}}>
            {Resources.Repository}
        </span>
        {props.manageSourceHref &&  <span className="manage-link" >
            <span className="seperator">{"|"} </span>
            <SafeLink.SafeLink
                href={props.manageSourceHref}
                aria-label={props.manageSourceText}
                target="_blank" >
                {props.manageSourceText}
                <span className="bowtie-icon bowtie-navigate-external" />
            </SafeLink.SafeLink>
            </span >
        }
    </div>);
};
