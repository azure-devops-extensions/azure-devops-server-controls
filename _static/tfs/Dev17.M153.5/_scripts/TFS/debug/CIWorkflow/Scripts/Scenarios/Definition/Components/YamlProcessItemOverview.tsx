/// <reference types="react" />

import * as React from "react";

import { RepositoryTypes } from "Build.Common/Scripts/Generated/TFS.Build2.Common";

import { BuildDefinitionActionsCreator } from "CIWorkflow/Scripts/Scenarios/Definition/Actions/BuildDefinitionActionsCreator";
import * as Resources from "CIWorkflow/Scripts/Resources/TFS.Resources.CIWorkflow";
import { SourcesSelectionActionsCreator } from "CIWorkflow/Scripts/Scenarios/Definition/Actions/SourcesSelectionActionsCreator";
import { VersionControlActionsCreator } from "CIWorkflow/Scripts/Scenarios/Definition/Actions/VersionControlActionsCreator";
import * as YamlProcessAsync from "CIWorkflow/Scripts/Scenarios/Definition/Components/YamlProcess";
import { ScmComponentProvider } from "CIWorkflow/Scripts/Scenarios/Definition/Components/SourceProviders/ScmComponentProvider";
import { ResourcesControllerView } from "CIWorkflow/Scripts/Scenarios/Definition/ControllerViews/ResourcesControllerView";
import { CoreDefinitionStore } from "CIWorkflow/Scripts/Scenarios/Definition/Stores/CoreDefinitionStore";
import { ITfGitState, TfGitStore } from "CIWorkflow/Scripts/Scenarios/Definition/Stores/TfGitStore";
import { BuildDefinitionStore } from "CIWorkflow/Scripts/Scenarios/Definition/Stores/BuildDefinitionStore";
import { SourcesSelectionStore } from "CIWorkflow/Scripts/Scenarios/Definition/Stores/SourcesSelectionStore";
import { YamlDefinitionStore } from "CIWorkflow/Scripts/Scenarios/Definition/Stores/YamlDefinitionStore";
import { VersionControlStore } from "CIWorkflow/Scripts/Scenarios/Definition/Stores/VersionControlStore";
import { SourceProviderUtils } from "CIWorkflow/Scripts/Scenarios/Definition/SourceProvider";

import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import * as ComponentBase from "DistributedTaskControls/Common/Components/Base";
import { Item, ItemOverviewProps, ItemOverviewState } from "DistributedTaskControls/Common/Item";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { LoadingComponent } from "DistributedTaskControls/Components/LoadingComponent";
import { ProcessManagementStore } from "DistributedTaskControls/ProcessManagement/ProcessManagementStore";

import * as VersionSpecs from "VersionControl/Scripts/TFS.VersionControl.VersionSpecs";

import { CommandButton } from "OfficeFabric/Button";
import { css } from "OfficeFabric/Utilities";
import { Label } from "OfficeFabric/Label";

import { ServiceEndpoint } from "TFS/DistributedTask/Contracts";

import { BaseControl } from "VSS/Controls";
import { getAsyncLoadedComponent } from "VSS/Flux/AsyncLoadedComponent";

import "VSS/LoaderPlugins/Css!CIWorkflow/Scripts/Scenarios/Definition/Components/YamlProcessItemOverview";

const YamlProcess = getAsyncLoadedComponent(
    ["CIWorkflow/Scripts/Scenarios/Definition/Components/YamlProcess"],
    (m: typeof YamlProcessAsync) => m.YamlProcess,
    () => <LoadingComponent />);

export interface IProcessItemOverviewState extends ItemOverviewState {
    isYaml?: boolean;
}

export class YamlProcessItemOverview extends ComponentBase.Component<ComponentBase.IProps, ComponentBase.IState> {
    private _coreDefinitionStore: CoreDefinitionStore;
    private _yamlDefinitionStore: YamlDefinitionStore;
    private _processManagementStore: ProcessManagementStore;
    private _sourcesActionCreator: SourcesSelectionActionsCreator;
    private _versionControlActionsCreator: VersionControlActionsCreator;
    private _sourceSelectionStore: SourcesSelectionStore;
    private _buildDefinitionStore: BuildDefinitionStore;
    private _versionControlStore: VersionControlStore;
    private _tfGitStore: TfGitStore;
    private _isTfGit: boolean;
    private _isGitHub: boolean; 
    private _isReadOnly: boolean;
    private _repositoryType: string;

    constructor(props: ItemOverviewProps) {
        super(props);

        this._buildDefinitionStore = StoreManager.GetStore<BuildDefinitionStore>(BuildDefinitionStore);
        this._coreDefinitionStore = StoreManager.GetStore<CoreDefinitionStore>(CoreDefinitionStore);
        this._yamlDefinitionStore = StoreManager.GetStore<YamlDefinitionStore>(YamlDefinitionStore);
        this._sourceSelectionStore = StoreManager.GetStore<SourcesSelectionStore>(SourcesSelectionStore);
        this._sourcesActionCreator = ActionCreatorManager.GetActionCreator<SourcesSelectionActionsCreator>(SourcesSelectionActionsCreator);
        this._versionControlActionsCreator = ActionCreatorManager.GetActionCreator<VersionControlActionsCreator>(VersionControlActionsCreator);
        this._versionControlStore = StoreManager.GetStore<VersionControlStore>(VersionControlStore);
        this._tfGitStore = StoreManager.GetStore<TfGitStore>(TfGitStore);
        this._repositoryType = this._buildDefinitionStore.getBuildDefinition().repository.type;
        this._isTfGit = this._repositoryType === RepositoryTypes.TfsGit;
        this._isGitHub = this._repositoryType === RepositoryTypes.GitHub;
        this._processManagementStore = StoreManager.GetStore<ProcessManagementStore>(ProcessManagementStore, props.instanceId);
        this._isReadOnly = !this._processManagementStore.canEditProcess();
    }

    public render(): JSX.Element {
        return (
            <div className="constrained-width yaml-process-container">
                <div className="yaml-file-title">{this._getTitle()}</div>
                <div className="tfgit-branch-selector">
                    <Label className="tfgit-branch-label required-indicator">{Resources.DefaultBranchLabelForDefinitions}</Label>
                    {this._getBranchFilter()}
                </div>
                <YamlProcess isReadOnly={!!this._isReadOnly} onYamlContentChange={this._onYamlContentChanges} />
                <div>
                    <ResourcesControllerView />
                </div>
            </div>);
    }

    private _getTitle(): JSX.Element {
        if (this._repositoryType === RepositoryTypes.TfsGit)
        {
            return this._getTfGitTitle();
        }
        else
        {
            return this._getGithubGitTitle();
        }
    }

    private _getTfGitTitle(): JSX.Element {
        return <span><span className="bowtie-icon left bowtie-brand-visualstudio"/><span className="yaml-file-title-focus-info">{this._getBuildRepositoryName()}</span></span>;
    }

    private _getGithubGitTitle(): JSX.Element {
        let selectedConnection: string = "";
        const versionControlState = this._versionControlStore.getState();
        const connections = versionControlState.connections || [];

        connections.some((connection: ServiceEndpoint) => {
            const matchedConnection = connection && versionControlState.selectedConnectionId === connection.id;
            if (matchedConnection) {
                selectedConnection = connection.name;
                return matchedConnection;
            }
        });
        return <span><span className="bowtie-icon left bowtie-brand-github"/><span className="yaml-file-title-focus-info">{this._getBuildRepositoryName()}</span>{Resources.YamlGitHubFileContentTitle + " "}<span className="yaml-file-title-focus-info">{selectedConnection}</span></span>;
    }

    private _getBuildRepositoryName(): string {
        const buildDefinition = this._buildDefinitionStore.getBuildDefinition();
        const repository = buildDefinition ? buildDefinition.repository : undefined;
        return repository ? repository.name : ""; 
    }

    private _getBranchFilter(): JSX.Element {
        const componentProvider: ScmComponentProvider = SourceProviderUtils.getComponentProvider(this._repositoryType);

        return componentProvider && componentProvider.getBranchFilter(
            this._buildDefinitionStore.getBuildDefinition().repository,
            this._getSelectedVersion(),
            this._handleSelectedBranchChanged,
            true,
            this._versionControlStore.getState().branches,
            Resources.DefaultBranchLabelForDefinitions,
            this._isReadOnly);
    }

    private _getBranches(): string[] {
        const branches = this._versionControlStore.getState().branches;
        return (branches || []);
    }

    private _handleSelectedBranchChanged = (selectedBranch: string) => {
        if (this._isTfGit)
        {
            const selectedVersionSpec = this._tfGitStore.getVersionSpec(selectedBranch);
            this._onSelectedtfGitBranchChanged(selectedVersionSpec);
        }
        else {
            this._onSelectedGitHubBranchChanged(selectedBranch);
        }
    }

    private _getSelectedVersion(): string {
        if (this._isTfGit)
        {
            var version = this._tfGitStore.getState().version;
            if (!version)
            {
                version = this._tfGitStore.getVersionSpec(this._buildDefinitionStore.getBuildDefinition().repository.defaultBranch);
            }
            return version.toDisplayText();
        }
        else {
            return this._versionControlStore.getState().selectedBranchName;
        }
    }

    private _onSelectedGitHubBranchChanged = (selectedBranchName: string): void => {
        this._versionControlActionsCreator.updateSelectedBranch(selectedBranchName);
        this._updateYaml();
    }
    
    private _onSelectedtfGitBranchChanged = (selectedVersion: VersionSpecs.VersionSpec): void => {
        this._sourcesActionCreator.changeTfGitSource({
            version: selectedVersion
        });

        this._updateYaml();
    }

    private _updateYaml() {
        this._yamlDefinitionStore.updateYamlFileContent();
        this._yamlDefinitionStore.updateYamlFileEditLink();
        this._onYamlContentChanges();
    }

    private _onYamlContentChanges = () => {
        const buildDefinitionActionCreator =  ActionCreatorManager.GetActionCreator<BuildDefinitionActionsCreator>(BuildDefinitionActionsCreator);
        buildDefinitionActionCreator.validateBuildDefinition(this._buildDefinitionStore.getBuildDefinition());
    }
}

