import { ProcessType, RepositoryTypes, RepositoryProperties } from "Build.Common/Scripts/Generated/TFS.Build2.Common";

import { BuildDefinitionActions } from "CIWorkflow/Scripts/Scenarios/Definition/Actions/BuildDefinitionActions";

import { SourcesSelectionActionsCreator } from "CIWorkflow/Scripts/Scenarios/Definition/Actions/SourcesSelectionActionsCreator";
import { BuildDefinitionStoreKeys } from "CIWorkflow/Scripts/Scenarios/Definition/Common";
import { initializeYamlProcess, initializeDesignerProcess } from "CIWorkflow/Scripts/Scenarios/Definition/DefinitionProcess";
import { Store } from "CIWorkflow/Scripts/Scenarios/Definition/Stores/Base";
import { SourcesSelectionStore } from "CIWorkflow/Scripts/Scenarios/Definition/Stores/SourcesSelectionStore";
import { TfGitStore } from "CIWorkflow/Scripts/Scenarios/Definition/Stores/TfGitStore";
import { YamlStore } from "CIWorkflow/Scripts/Scenarios/Definition/Stores/YamlStore";
import { YamlConstants } from "CIWorkflow/Scripts/Scenarios/Definition/Yaml";
import { ServiceClientFactory } from "CIWorkflow/Scripts/Service/ServiceClientFactory";
import { SourceProvider, YamlFileInfo } from "CIWorkflow/Scripts/Scenarios/Definition/SourceProvider";

import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { IProcessManagementStoreArgs, ProcessManagementStore } from "DistributedTaskControls/ProcessManagement/ProcessManagementStore";
import { ProcessManagementCapabilities } from "DistributedTaskControls/ProcessManagement/Types";

import { BuildDefinition, YamlProcess, SourceRepositoryItem, SourceRepository } from "TFS/Build/Contracts";

import { GitRepository } from "TFS/VersionControl/Contracts";
import { VersionControlStore } from "CIWorkflow/Scripts/Scenarios/Definition/Stores/VersionControlStore";
import { FeatureAvailabilityFlags } from "Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants";

import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";
import { VersionSpec } from "VersionControl/Scripts/TFS.VersionControl.VersionSpecs";

export interface IYamlDefinitionStoreState {
    yamlPath: string;
    yamlFileContent: string;
    yamlFileEditLink: string;
    warnings: string[];
    isYamlEditorEnabled: boolean;
    process: YamlProcess;
}

/**
 * @brief This store contains data related to Yaml definition
 * @returns
 */
export class YamlDefinitionStore extends Store {
    private _isYamlDefinition: boolean = false;
    private _buildDefinitionActions: BuildDefinitionActions;
    private _actionCreator: SourcesSelectionActionsCreator;
    private _sourceSelectionStore: SourcesSelectionStore;
    private _tfGitStore: TfGitStore;
    private _yamlStore: YamlStore;
    private _currentState: IYamlDefinitionStoreState;
    private _originalState: IYamlDefinitionStoreState;
    private _buildDefinition: BuildDefinition;

    constructor() {
        super();
        this._currentState = {} as IYamlDefinitionStoreState;
        this._originalState = {} as IYamlDefinitionStoreState;
    }

    /**
     * @returns Unique key to the store
     */
    public static getKey(): string {
        return BuildDefinitionStoreKeys.StoreKey_YamlDefinitionStore;
    }

    public initialize(): void {
        this._buildDefinitionActions = ActionsHubManager.GetActionsHub<BuildDefinitionActions>(BuildDefinitionActions);
        this._actionCreator = ActionCreatorManager.GetActionCreator<SourcesSelectionActionsCreator>(SourcesSelectionActionsCreator);
        this._actionCreator.SourceSelectionChanged.addListener(this.updateYaml);
        this._buildDefinitionActions.updateBuildDefinition.addListener(this._initializeStates);
        this._buildDefinitionActions.createBuildDefinition.addListener(this._initializeStates);
        this._buildDefinitionActions.changeYamlPath.addListener(this._handleYamlPathChange);
        this._buildDefinitionActions.refreshYamlContent.addListener(this._updateYamlErrors);

        this._sourceSelectionStore = StoreManager.GetStore<SourcesSelectionStore>(SourcesSelectionStore);
        this._tfGitStore = StoreManager.GetStore<TfGitStore>(TfGitStore);
        this._yamlStore = StoreManager.GetStore<YamlStore>(YamlStore);
        this._yamlStore.addChangedListener(this._updateYamlState);

        // initialize the process management store
        StoreManager.CreateStore<ProcessManagementStore, IProcessManagementStoreArgs>(ProcessManagementStore, this.getInstanceId(),
            { 
                processManagementCapabilities: ProcessManagementCapabilities.All
            } as IProcessManagementStoreArgs
        );
    }

    protected disposeInternal(): void {
        this._buildDefinitionActions.updateBuildDefinition.removeListener(this._initializeStates);
        this._buildDefinitionActions.createBuildDefinition.removeListener(this._initializeStates);
        this._buildDefinitionActions.changeYamlPath.removeListener(this._handleYamlPathChange);
        this._yamlStore.removeChangedListener(this._updateYamlState);
        this._actionCreator.SourceSelectionChanged.removeListener(this.updateYaml);
    }

    public updateVisitor(buildDefinition: BuildDefinition): BuildDefinition {
        if (this._isYamlDefinition) {
            initializeYamlProcess(buildDefinition);
            let process = buildDefinition.process as YamlProcess;
            process.yamlFilename = this._currentState.yamlPath;
        }
        else {
            // Nullify any yaml types if exists, we need this since yaml can be opted out as of now, remove this when yaml cannot be opted out
            initializeDesignerProcess(buildDefinition);
        }

        return buildDefinition;
    }

    public isDirty(): boolean {
        return !this._isYamlDefinition ? false :
            (this._currentState.yamlPath !== this._originalState.yamlPath);
    }

    public isValid(): boolean {
        return !this._isYamlDefinition ? true
            : (!!this._currentState.yamlPath);
    }

    public isYaml(): boolean {
        return this._isYamlDefinition;
    }

    public isYamlFeatureAvailable(): boolean {
        return this._yamlStore.getState().isYamlFeatureAvailable;
    }

    public hasWarnings(): boolean {
        return !this._isYamlDefinition ? false
            : ((this._currentState.warnings && this._currentState.warnings.length > 0));
    }

    public getState(): IYamlDefinitionStoreState {
        return !this._isYamlDefinition ? {} as IYamlDefinitionStoreState : this._currentState;
    }

    private _initializeStates = (definition: BuildDefinition) => {
        // Update yaml path from definition
        let process = definition.process as YamlProcess;
        if (process) {
            this._updateStates(this._currentState, process);
            this._updateStates(this._originalState, process);
            this._buildDefinition = definition;
            if (definition.repository)
            {
                this._sourceSelectionStore.getRepositoryProject(definition.repository).then((projectId: string) => {
                    if (projectId)
                    {
                        this.updateYaml(definition.repository.id, projectId, definition);
                    }
                });
            }
        }
        this.emitChanged();
    }

    private _handleYamlPathChange = (value: string) => {
        if (this._currentState.yamlPath !== value) {
            this._currentState.yamlPath = value;

            // When path is changed, we should clear out any existing warnings, since warnings are set after save
            // this also means, if they switch back to the same path as before, we still won't show any errors, that's fine, may be the file is changed, we don't know
            this._currentState.warnings = [];
            this.updateYaml();

            this.emitChanged();
        }
    }

    private _updateYamlState = () => {
        const isYamlDefinition = this._yamlStore.getState().isYaml;
        if (this._isYamlDefinition !== isYamlDefinition) {
            this._isYamlDefinition = isYamlDefinition;
            this.emitChanged();
        }
    }

    private _updateStates(state: IYamlDefinitionStoreState, process: YamlProcess) {
        state.yamlPath = process.yamlFilename;
        state.isYamlEditorEnabled = this._isYamlEditorEnabled();
        state.warnings = state.isYamlEditorEnabled ? process.errors : [];
        state.process = process;
    }

    public updateYamlFileContent(repositoryId?: string, projectId?: string, buildDefinition?: BuildDefinition): IPromise<void> {
        if (!this._currentState || !this._currentState.yamlPath)
        {
            return;
        }

        if (!buildDefinition)
        {
            buildDefinition = this._buildDefinition;
        }
        const isRepositoryDefined = buildDefinition && buildDefinition.repository;
        const serviceEndPoint = isRepositoryDefined && buildDefinition.repository.properties ? buildDefinition.repository.properties[RepositoryProperties.ConnectedServiceId] : "";
        const commitOrBranch =isRepositoryDefined ? buildDefinition.repository.defaultBranch : "";
        const repositoryType = isRepositoryDefined ? buildDefinition.repository.type : "";
        var yamlFileInfo = {repositoryId: repositoryId, projectId: projectId, serviceEndPoint: serviceEndPoint, commitOrBranch: commitOrBranch, repositoryType: repositoryType} as YamlFileInfo;
        return this._getYamlFileContent(yamlFileInfo).then((content) => {
            if (content !== this._currentState.yamlFileContent)
            {
                this._currentState.yamlFileContent = content;
            }
        });
    }

    public _isYamlEditorEnabled(): boolean
    {
        return FeatureAvailabilityService.isFeatureEnabled(FeatureAvailabilityFlags.WebAccessBuild2ShowYamlView, false);
    }

    private _updateYamlErrors = (process: YamlProcess) => {
        this._currentState.process = process;
        this._currentState.warnings = this._isYamlEditorEnabled() ? process.errors : [];
        this.emitChanged();
    }

    public updateYamlFileEditLink = (repositoryId?: string, projectId?: string, buildDefinition?: BuildDefinition): IPromise<void> => {
        const isRepositoryDefined = buildDefinition && buildDefinition.repository;
        const serviceEndPoint = isRepositoryDefined && buildDefinition.repository.properties ? buildDefinition.repository.properties[RepositoryProperties.ConnectedServiceId] : "";
        const commitOrBranch = isRepositoryDefined ? buildDefinition.repository.defaultBranch : "";
        const repositoryType = isRepositoryDefined ? buildDefinition.repository.type : "";
        var yamlFileInfo = {repositoryId: repositoryId, projectId: projectId, serviceEndPoint: serviceEndPoint, branchString: commitOrBranch, repositoryType: repositoryType} as YamlFileInfo;
        return this._getYamlFileEditLink(yamlFileInfo).then((link) => {
            if (link !== this._currentState.yamlFileEditLink)
            {
                this._currentState.yamlFileEditLink = link;
            }
        });
    }

    public updateYaml(repositoryId?: string, projectId?: string, buildDefinition?: BuildDefinition): IPromise<void> {
        if (this._currentState && this._currentState.isYamlEditorEnabled)
        {
            return Promise.all([this.updateYamlFileContent(repositoryId, projectId, buildDefinition), this.updateYamlFileEditLink(repositoryId, projectId, buildDefinition)]).then(() => {
                this.emitChanged();
            });
        }

        return Promise.resolve();
    }

    private _getYamlFileEditLink(yamlFileInfo: YamlFileInfo): IPromise<string> {
        this._populateYamlFileInfo(yamlFileInfo);
        
        if (!yamlFileInfo.projectId || !yamlFileInfo.repositoryId || !this._currentState.yamlPath)
        {
            return Promise.resolve("");
        }

        const sourceProvider = this._sourceSelectionStore.getSelectedSourceProvider();
        return sourceProvider ? sourceProvider.getYamlEditFileLink(yamlFileInfo) : Promise.resolve("");
    }

    public _getYamlFileContent(yamlFileInfo: YamlFileInfo): IPromise<string> {
        this._populateYamlFileInfo(yamlFileInfo);

        if (!yamlFileInfo.projectId || !yamlFileInfo.repositoryId || !this._currentState.yamlPath)
        {
            return Promise.resolve("");
        }

        return this._getYamlFileContentInternal(yamlFileInfo);
    }

    private _populateYamlFileInfo(yamlFileInfo: YamlFileInfo) {
        const repository = this._sourceSelectionStore.getBuildRepository();

        yamlFileInfo.yamlPath = this._currentState.yamlPath;

        if (!yamlFileInfo.repositoryId)
        {  
            yamlFileInfo.repositoryId = repository ? repository.id : "";
        }

        if (!yamlFileInfo.repositoryType)
        {
            yamlFileInfo.repositoryType = repository ? repository.type : "";
        }

        if (!yamlFileInfo.serviceEndPoint)
        {
            yamlFileInfo.serviceEndPoint = this._sourceSelectionStore.getSelectedConnectionId();
        }

        if (!yamlFileInfo.projectId)
        {
            const project = this._sourceSelectionStore.getProjectInfo();
            yamlFileInfo.projectId = project ? project.project.id : "";
        }

        if(!yamlFileInfo.branchString || (!yamlFileInfo.branchOrCommit && yamlFileInfo.repositoryType === RepositoryTypes.TfsGit))
        {
            if(yamlFileInfo.repositoryType === RepositoryTypes.TfsGit)
            {
                if (!yamlFileInfo.branchOrCommit)
                {
                    const tfGitStore = StoreManager.GetStore<TfGitStore>(TfGitStore);
                    yamlFileInfo.branchOrCommit = tfGitStore.getState().version;
                }
                //This if is needed just for the tests, we should not need to get there
                if (!yamlFileInfo.branchOrCommit || !yamlFileInfo.branchOrCommit.toDisplayText())
                {
                    yamlFileInfo.branchOrCommit = yamlFileInfo.branchString ? VersionSpec.parse("GB"+yamlFileInfo.branchString) : null;
                }
                else
                {
                    yamlFileInfo.branchString = yamlFileInfo.branchOrCommit.toDisplayText();
                }
            } 
            else if (yamlFileInfo.repositoryType === RepositoryTypes.GitHub)
            {
                const versionControlStore = StoreManager.GetStore<VersionControlStore>(VersionControlStore);
                yamlFileInfo.branchString = versionControlStore.getState().selectedBranchName;
            }
        }

        if (yamlFileInfo.repositoryType === RepositoryTypes.GitHub)
        {
            const sourceSelectionStore = StoreManager.GetStore<SourcesSelectionStore>(SourcesSelectionStore);
            var link = sourceSelectionStore.getBuildRepository().url;
            const indexOfExtension = link ? link.lastIndexOf(".git") : -1;
            
            // check if the url ends with '.git' and EndsWith not supported in IE11
            if (indexOfExtension === (link.length - 4) )
            {
                yamlFileInfo.repositoryUrl = link.substr(0, indexOfExtension);
            }
        }
    }

    private _getYamlFileContentInternal(yamlFileInfo: YamlFileInfo) : IPromise<string> {
        const buildClient = ServiceClientFactory.getServiceClient();
        
        return buildClient.getFileContents(yamlFileInfo.serviceEndPoint, yamlFileInfo.repositoryType, this._currentState.yamlPath, yamlFileInfo.repositoryId, yamlFileInfo.branchString).then((content: string) => {
            return content;
        }, () => {
            return "";
        });
    }
}