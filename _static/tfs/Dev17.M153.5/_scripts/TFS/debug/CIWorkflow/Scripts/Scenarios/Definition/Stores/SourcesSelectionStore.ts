import * as Q from "q";

import { RepositoryTypes, RepositoryProperties } from "Build.Common/Scripts/Generated/TFS.Build2.Common";

import { GitServiceConstants } from "CIWorkflow/Scripts/Common/Constants";
import * as Resources from "CIWorkflow/Scripts/Resources/TFS.Resources.CIWorkflow";
import { DefinitionUtils } from "CIWorkflow/Scripts/Common/DefinitionUtils";
import { SourceProvider, SourceProviderUtils } from "CIWorkflow/Scripts/Scenarios/Definition/SourceProvider";
import * as Actions from "CIWorkflow/Scripts/Scenarios/Definition/Actions/BuildDefinitionActions";
import { IChangeSourcesSelectionPayload, SourcesSelectionActionsCreator, IProjectUpdate } from "CIWorkflow/Scripts/Scenarios/Definition/Actions/SourcesSelectionActionsCreator";
import { YamlDefinitionActions, IPathContentsPayload } from "CIWorkflow/Scripts/Scenarios/Definition/Actions/YamlDefinitionActions";
import { BuildDefinitionStoreKeys } from "CIWorkflow/Scripts/Scenarios/Definition/Common";
import { ScmComponentProvider } from "CIWorkflow/Scripts/Scenarios/Definition/Components/SourceProviders/ScmComponentProvider";
import { DefaultRepositorySource } from "CIWorkflow/Scripts/Scenarios/Definition/Sources/DefaultRepositorySource";
import { IRepository } from "CIWorkflow/Scripts/Scenarios/Definition/Sources/VersionControlInterfaces";
import { VersionControlSource } from "CIWorkflow/Scripts/Scenarios/Definition/Sources/VersionControlSource";
import { Store as StoreBase } from "CIWorkflow/Scripts/Scenarios/Definition/Stores/Base";
import { SourceProvidersStore } from "CIWorkflow/Scripts/Scenarios/Definition/Stores/SourceProvidersStore";
import { IVersionControlState, VersionControlStore } from "CIWorkflow/Scripts/Scenarios/Definition/Stores/VersionControlStore";
import { VersionControlStoreBase } from "CIWorkflow/Scripts/Scenarios/Definition/Stores/VersionControlStoreBase";
import { YamlStore } from "CIWorkflow/Scripts/Scenarios/Definition/Stores/YamlStore";

import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { IEmptyActionPayload } from "DistributedTaskControls/Common/Actions/Base";
import * as Base from "DistributedTaskControls/Common/Components/Base";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { ISelectedPathNode } from "DistributedTasksCommon/TFS.Tasks.Types";

import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";

import { BuildDefinition, BuildRepository, DefinitionTriggerType } from "TFS/Build/Contracts";
import { SourceControlTypes, TeamProject, TeamProjectReference, ProjectVisibility } from "TFS/Core/Contracts";
import { CoreHttpClient } from "TFS/Core/RestClient";
import { GitRepository, VersionControlProjectInfo } from "TFS/VersionControl/Contracts";
import * as GitRestClient from "TFS/VersionControl/GitRestClient";

import { getRefFriendlyName } from "VersionControl/Scripts/GitRefUtility";

import { VssConnection } from "VSS/Service";
import * as Utils_String from "VSS/Utils/String";

export interface IState extends Base.IState {
    selectedRepositoryName: string;
    selectedBranchName: string;
    isTfvcDefault: boolean;
    isYaml: boolean;
    isDiscoveringYaml: boolean;
    discoveredYamlFilename?: string;
    isCreatingYamlDefinition: boolean;
    selectedTabItemKey?: string;
    showAdvancedSettings?: boolean;
}

export class SourcesSelectionStore extends StoreBase {
    private _isCreatingYamlDefinition: boolean;
    private _isYaml: boolean = false;
    private _savedStoreKey: string;
    private _selectedTabItemKey: string;
    private _selectedSourceProvider: SourceProvider;
    private _sourceProvidersStore: SourceProvidersStore;
    private _projectInfo: VersionControlProjectInfo;
    private _actionCreator: SourcesSelectionActionsCreator;
    private _buildDefinitionActions: Actions.BuildDefinitionActions;
    private _yamlStore: YamlStore;
    private _vcStore: VersionControlStore;
    private _getRepositoriesPromises: { [key: string]: IPromise<GitRepository> } = {};
    private _getProjectsPromises: IDictionaryStringTo<IPromise<TeamProject>> = {};

    public initialize() {
        // Make sure the VC Store is initialized
        this._vcStore = StoreManager.GetStore<VersionControlStore>(VersionControlStore);
        this._vcStore.addChangedListener(this._handleVersionControlStoreChanged);

        this._sourceProvidersStore = StoreManager.GetStore<SourceProvidersStore>(SourceProvidersStore);

        this._actionCreator = ActionCreatorManager.GetActionCreator<SourcesSelectionActionsCreator>(SourcesSelectionActionsCreator);

        this._selectedTabItemKey = Utils_String.empty;

        this._actionCreator.SelectSourceTab.addListener(this._handleSelectSourceTab);
        this._actionCreator.TfSourceRepositoryChanged.addListener(this._handleTfSourcesChanged);
        this._actionCreator.SourceSelectionChanged.addListener(this._handleSourceSelectionChanged);
        this._actionCreator.TfSourceProjectChanged.addListener(this._handleTfProjectSelectionChanged);
        this._actionCreator.RefreshProjectInfo.addListener(this._handleRefreshProjectInfo);

        this._buildDefinitionActions = ActionsHubManager.GetActionsHub<Actions.BuildDefinitionActions>(Actions.BuildDefinitionActions);
        this._buildDefinitionActions.updateBuildDefinition.addListener(this._handleUpdateBuildDefinition);
        this._buildDefinitionActions.createBuildDefinition.addListener(this._handleCreateBuildDefinition);
        this._buildDefinitionActions.creatingYamlBuildDefinitionFromRepositoryFile.addListener(this._handleCreatingYamlBuildDefinitionFromRepositoryFile);

        this._yamlStore = StoreManager.GetStore<YamlStore>(YamlStore);
        this._yamlStore.addChangedListener(this._handleYamlState);
    }

    protected disposeInternal(): void {
        this._vcStore.removeChangedListener(this._handleVersionControlStoreChanged);

        this._actionCreator.SelectSourceTab.removeListener(this._handleSelectSourceTab);
        this._actionCreator.TfSourceRepositoryChanged.removeListener(this._handleTfSourcesChanged);
        this._actionCreator.SourceSelectionChanged.removeListener(this._handleSourceSelectionChanged);
        this._actionCreator.TfSourceProjectChanged.removeListener(this._handleTfProjectSelectionChanged);
        this._actionCreator.RefreshProjectInfo.removeListener(this._handleRefreshProjectInfo);

        this._buildDefinitionActions.updateBuildDefinition.removeListener(this._handleUpdateBuildDefinition);
        this._buildDefinitionActions.createBuildDefinition.removeListener(this._handleCreateBuildDefinition);
        this._buildDefinitionActions.creatingYamlBuildDefinitionFromRepositoryFile.removeListener(this._handleCreatingYamlBuildDefinitionFromRepositoryFile);

        this._yamlStore.removeChangedListener(this._handleYamlState);
    }

    public updateVisitor(buildDefinition: BuildDefinition): BuildDefinition {
        // For TFVC and TfGit use the specific store for that type
        const store: VersionControlStoreBase = this.getStore();
        if (store) {
            store.updateVisitor(buildDefinition);
            if (!this._projectInfo)
            {
                const tfsContextData = TfsContext.getDefault().contextData;
                const defaultSourceControlType = this._selectedTabItemKey === RepositoryTypes.TfsVersionControl ? SourceControlTypes.Tfvc : SourceControlTypes.Git;
                const project = { id: tfsContextData.project.id, name: tfsContextData.project.name } as TeamProjectReference;
                this._projectInfo = { project: project, defaultSourceControlType: defaultSourceControlType } as VersionControlProjectInfo;

                this._actionCreator.refreshProjectInfo(project.id);
            }
        }
        else {
            // For GitHub, GHE, Bitbucket, etc. use the common VCStore
            this._vcStore.updateVisitor(buildDefinition);
        }
        return buildDefinition;
    }

    public isDirty(): boolean {
        // For TFVC and TfGit use the specific store for that type
        const store: VersionControlStoreBase = this.getStore();
        if (store) {
            if (store.isDirty()) {
                return true;
            }
        }
        else if (this._vcStore.isDirty()) {
            // For GitHub, GHE, Bitbucket, etc. use the common VCStore
            return true;
        }

        return (!!this._savedStoreKey && (this._savedStoreKey !== this._selectedTabItemKey));
    }

    public isValid(): boolean {
        const state = this.getState();

        // Block while creating a definition from YAML
        if (state.isCreatingYamlDefinition) {
            return false;
        }

        // For TFVC and TfGit use the specific store for that type
        const store: VersionControlStoreBase = this.getStore();
        if (store) {
            return store.isValid();
        }
        else {
            // For GitHub, GHE, Bitbucket, etc. use the common VCStore
            return this._vcStore.isValid();
        }
    }

    public isFileSystemBrowsable(): boolean {
        return this._selectedSourceProvider && this._selectedSourceProvider.canBrowsePath();
    }

    public showPathDialog(initialValue: string, callback: (selectedValue: ISelectedPathNode) => void) {
        const provider: SourceProvider = this._selectedSourceProvider;
        if (provider && provider.canBrowsePath()) {
            const store: VersionControlStoreBase = provider.getStore();
            const component: ScmComponentProvider = provider.getComponentProvider();

            if (component.canShowPathDialog()) {
                const repository: IRepository = this._vcStore.getState().selectedRepository;
                const state: IVersionControlState = this._vcStore.getState();
                repository.data[GitServiceConstants.definitionId] = state.definitionId.toString();
                repository.data[GitServiceConstants.branch] = state.selectedBranchName;
                component.showPathDialog(repository, initialValue, callback);
            }
            else if (store) {
                // TODO only use components, don't use stores
                store.showPathDialog(initialValue, callback);
            }
        }
    }

    public fetchRepositoryFileContent(path: string, callback: (content: any) => void, errorCallback: (error: any) => void) {
        const provider: SourceProvider = this._selectedSourceProvider;
        if (provider && provider.canViewFileContents()) {
            // For TFVC and TfGit use the specific store for that type
            const store: VersionControlStoreBase = provider.getStore();
            if (store) {
                store.fetchRepositoryFileContent(path, callback, errorCallback);
            }
            else {
                const source = new VersionControlSource();
                const state: IVersionControlState = this._vcStore.getState();

                // For GitHub, GHE, Bitbucket, etc. use the common VCStore - this is still not correct - we need to treat this like any other action
                // TODO don't use callbacks here
                source.getRepositoryFileContent(state.sourceProvider, state.selectedConnectionId, state.selectedRepository, state.selectedBranchName, path)
                    .then(callback, errorCallback);
            }
        }
        else if (errorCallback) {
            const selectedRepository: BuildRepository = this._getSelectedRepository();
            const errorMessage: string = Utils_String.format(Resources.RepositoryNotSupportedForFileContent, selectedRepository.name);
            errorCallback(errorMessage);
        }
    }

    public getSelectedConnectionId(): string {
        const buildRepository = this.getBuildRepository();
        let connectionId = buildRepository ? buildRepository.properties[RepositoryProperties.ConnectedServiceId] : null;
        if (!connectionId)
        {
            connectionId = this._vcStore.getState().selectedConnectionId;
        }

        return connectionId;
    }

    public static getKey(): string {
        return BuildDefinitionStoreKeys.StoreKey_SourcesSelectionStore;
    }

    public getState(): IState {
        const state: IState = {} as IState;
        state.selectedTabItemKey = this._selectedTabItemKey;
        state.isTfvcDefault = this._shouldSelectTfvc();

        const selectedRepository = state.selectedTabItemKey ? this._getSelectedRepository() : null;
        state.selectedRepositoryName = selectedRepository ? selectedRepository.name : Utils_String.empty;
        state.selectedBranchName = selectedRepository ? getRefFriendlyName(selectedRepository.defaultBranch) : Utils_String.empty;

        const store: VersionControlStoreBase = this.getStore();
        if (store) {
            // TFVC and TfGit do not support this yet
            state.discoveredYamlFilename = null;
            state.isDiscoveringYaml = false;
        }
        else {
            // For GitHub, GHE, Bitbucket, etc. use the common VCStore
            const vcState: IVersionControlState = this._vcStore.getState();
            state.discoveredYamlFilename = vcState.discoveredYamlFilename;
            state.isDiscoveringYaml = vcState.isDiscoveringYaml;
        }

        state.isCreatingYamlDefinition = this._isCreatingYamlDefinition;
        state.isYaml = this._isYaml;

        return state;
    }

    public getSelectedSourceProvider(): SourceProvider {
        return this._selectedSourceProvider;
    }

    public getProjectInfo(): VersionControlProjectInfo {
        return this._projectInfo;
    }

    public getStores(): StoreBase[] {
        const stores: StoreBase[] = [];
        for (const provider of this._sourceProvidersStore.getProviders()) {
            if (provider.getStore()) {
                stores.push(provider.getStore());
            }
        }
        return stores;
    }

    public getCurrentBuildRepository(repositoryType: string, repositoryName: string): IPromise<BuildRepository> {
        const buildRepository = this._getSelectedRepository(repositoryType);
        if (buildRepository && buildRepository.name)
        {
            return Q.resolve(buildRepository);
        }
        else
        {
            const store = this.getStore();
            if (store)
            {
                return store.getCurrentBuildRepository(repositoryName);
            }
            else
            {
                return this._vcStore.getCurrentRepository(repositoryType);
            }
        }
    }

    public getBuildRepository(repositoryType?: string): BuildRepository {
        return this._getSelectedRepository(repositoryType);
    }

    public initializeStores(): void {
        this.getStores();
    }

    public isWebhookPresent(type: DefinitionTriggerType): boolean {
        // For TFVC and TfGit use the specific store for that type
        const store: VersionControlStoreBase = this.getStore();
        if (store) {
            return store.isWebhookPresent(type);
        }
        else {
            // For GitHub, GHE, Bitbucket, etc. use the common VCStore
            const state: IVersionControlState = this._vcStore.getState();
            return state.webhooks && state.webhooks.some(h => h.types.indexOf(type) >= 0);
        }
    }

    public getBranches(): string[] {
        if (this._selectedSourceProvider && this._selectedSourceProvider.canBrowsePath()) {
            const store: VersionControlStoreBase = this._selectedSourceProvider.getStore();
            if (store) {
                // For TFVC and TfGit use the specific store for that type
                return store.getBranches();
            }
            else {
                // For GitHub, GHE, Bitbucket, etc. use the common VCStore
                const state: IVersionControlState = this._vcStore.getState();
                return state.branches;
            }
        }
        return [];
    }

    private _getSelectedRepository(selectedTabKey?: string): BuildRepository {
        if (!selectedTabKey) {
            this._ensureSelectedTabKeySet();
        }
        const repositoryType = this._selectedTabItemKey ? this._selectedTabItemKey : selectedTabKey;
        // For TFVC and TfGit use the specific store for that type
        const store: VersionControlStoreBase = this.getStore(repositoryType);
        if (store) {
            return store.getBuildRepository();
        }
        else if (repositoryType) {
            // For GitHub, GHE, Bitbucket, etc. use the common VCStore
            const state: IVersionControlState = this._vcStore.getState();
            if (state.selectedRepository) {
                const buildRepository: BuildRepository = {
                    id: state.selectedRepository.id,
                    name: state.selectedRepository.name,
                    defaultBranch: state.selectedBranchName,
                    url: state.selectedRepository.url,
                    checkoutSubmodules: state.checkoutSubmodules,
                    clean: state.cleanRepository.toString(),
                    properties: state.selectedRepository.data,
                    rootFolder: null,
                    type: state.repositoryType
                };
                return buildRepository;
            }
        }
        return null;
    }

    private _handleCreateBuildDefinition = (payload: BuildDefinition) => {
        if (payload && payload.repository) {
            this._isCreatingYamlDefinition = false;
            this._setSelectedTabItemKey(payload.repository.type || Utils_String.empty);
            this.emitChanged();
        }
    }

    private _handleRefreshProjectInfo = (payload: VersionControlProjectInfo) => {
        if (payload) {
            this._projectInfo = payload;
        }

        // On refresh, make sure the selected tab key is set
        this._ensureSelectedTabKeySet();

        this.emitChanged();
    }

    private _handleTfProjectSelectionChanged = (projectUpdate: IProjectUpdate) => {
        this._projectInfo = projectUpdate.projectInfo;
        this._ensureSelectedTabKeySet();
        this.emitChanged();
    }

    private _ensureSelectedTabKeySet() {
        if (!this._selectedTabItemKey) {
            let repositoryType = this._sourceProvidersStore.getSelectedRepositoryTypeFromUrl();
            if (!repositoryType) {
                // If it's not in the URL then default it to TFGit or TFVC
                repositoryType = this._shouldSelectTfvc() ? RepositoryTypes.TfsVersionControl : RepositoryTypes.TfsGit;
            }
            this._setSelectedTabItemKey(repositoryType);
        }
    }

    private _handleYamlState = () => {
        const isYaml = this._yamlStore.getState().isYaml;
        if (this._isYaml !== isYaml) {
            this._isYaml = isYaml;
            this.emitChanged();
        }
    }

    private _shouldSelectTfvc(): boolean {
        if (this._projectInfo && this._projectInfo.supportsTFVC && (this._projectInfo.defaultSourceControlType === SourceControlTypes.Tfvc)) {
            return true;
        }

        return false;
    }

    private _handleSelectSourceTab = (payload: IChangeSourcesSelectionPayload) => {
        this._setSelectedTabItemKey(payload.selectedTabItemKey);

        if (this._projectInfo)
        {
            // If the current team project is not supported by the new selected source provider then pick another supported project
            if (!this._selectedSourceProvider.isProjectSupported(this._projectInfo))
            {
                const projects = this._selectedSourceProvider.getProjects();
                if (projects && projects.length > 0)
                {
                    this._actionCreator.changeTfProject(projects[0].project.id, false);
                }
            }
        }

        // If the current provider does not support public repos and we are in a public project, switch to tfsGit because it supports public repos
        if (this._selectedSourceProvider && !this._selectedSourceProvider.usableInPublicProjects() && DefaultRepositorySource.instance().getProjectVisibility(TfsContext.getDefault().contextData.project.id) === ProjectVisibility.Public)
        {
            this._actionCreator.changeTfRepositoryType(RepositoryTypes.TfsGit);
        }

        this.emitChanged();
    }

    private _handleSourceSelectionChanged = () => {
        this.emitChanged();
    }

    private _handleUpdateBuildDefinition = (definition: BuildDefinition) => {
        this._isCreatingYamlDefinition = false;
        this._savedStoreKey = definition.repository.type;
        this._setSelectedTabItemKey(definition.repository.type);

        this.getRepositoryProject(definition.repository).then((projectId: string) => {
            if (projectId && this._projectInfo && projectId !== this._projectInfo.project.id)
            {
                // before updating to the build definition project check to make sure there is no visibility conflict
                if (!DefinitionUtils.IsThereVisibilityConflict(TfsContext.getDefault().contextData.project.id, projectId))
                {
                    this._actionCreator.refreshProjectInfo(projectId);
                }
            }

            this.emitChanged();
        });
    }

    public getRepositoryProject(buildRepository: BuildRepository): IPromise<string> {
        if (buildRepository.type === RepositoryTypes.TfsGit)
        {
            return this._getGitRepositoryProject(buildRepository.id);
        }
        else
        {
            if (buildRepository.type === RepositoryTypes.TfsVersionControl)
            {
               return this._getTfvcRepositoryProject(buildRepository.id, buildRepository.name);
            }
            else
            {
                return Promise.resolve(Utils_String.empty);
            }
        }
    }

    private _getGitRepositoryProject(repositoryId: string): IPromise<string> {
        if (!this._getRepositoriesPromises[repositoryId])
        {
            const gitRestClient = GitRestClient.getClient();
            this._getRepositoriesPromises[repositoryId] = gitRestClient.getRepository(repositoryId);
        }

        return this._getRepositoriesPromises[repositoryId].then((repository: GitRepository) => {
            return (repository && repository.project && repository.project.id) || Utils_String.empty;
        });
    }

    private _getTfvcRepositoryProject(repositoryId: string, repositoryName: string): IPromise<string> {
        if (!this._getProjectsPromises[repositoryId])
        {
            const connection = new VssConnection(TfsContext.getDefault().contextData);
            const coreClient = connection.getHttpClient<CoreHttpClient>(CoreHttpClient);
            this._getProjectsPromises[repositoryId] = coreClient.getProject(repositoryName);
        }

        return this._getProjectsPromises[repositoryId].then((project: TeamProject) => {
            return (project && project.id) || Utils_String.empty;
        });
    }

    private _handleTfSourcesChanged = (selectedRepositoryType: string) => {
        this._setSelectedTabItemKey(selectedRepositoryType);
        this.emitChanged();
    }

    private _setSelectedTabItemKey(selectedRepositoryType: string): void {
        this._selectedTabItemKey = selectedRepositoryType;
        this._selectedSourceProvider = this._sourceProvidersStore.getProvider(this._selectedTabItemKey);
    }

    private _handleVersionControlStoreChanged = () => {
        // If the vc store is updated we need to trigger our own changed event to make sure our listeners know
        this.emitChanged();
    }

    public getStore(repositoryType?: string): VersionControlStoreBase {
        // initialize the source provider if there is not one
        if (!this._selectedSourceProvider)
        {
            let sourceProvidersStore = StoreManager.GetStore<SourceProvidersStore>(SourceProvidersStore);
            this._selectedSourceProvider = sourceProvidersStore.getProvider(repositoryType);
        }

        return this._selectedSourceProvider ? this._selectedSourceProvider.getStore() : null;
    }

    private _handleCreatingYamlBuildDefinitionFromRepositoryFile = (payload: IEmptyActionPayload) => {
        this._isCreatingYamlDefinition = true;
        this.emitChanged();
    }
}
