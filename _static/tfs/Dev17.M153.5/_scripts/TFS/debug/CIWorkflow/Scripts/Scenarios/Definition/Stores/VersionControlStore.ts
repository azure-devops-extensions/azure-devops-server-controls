import * as Q from "q";

import { RepositoryProperties, RepositoryTypes } from "Build.Common/Scripts/Generated/TFS.Build2.Common";
import { GitServiceConstants } from "CIWorkflow/Scripts/Common/Constants";
import { NavigationUtils } from "CIWorkflow/Scripts/Common/NavigationUtils";
import { ISourceLabelProps, ScmUtils } from "CIWorkflow/Scripts/Common/ScmUtils";

import { SourceProvider } from "CIWorkflow/Scripts/Scenarios/Definition/SourceProvider";
import * as Resources from "CIWorkflow/Scripts/Resources/TFS.Resources.CIWorkflow";
import { BuildDefinitionActions } from "CIWorkflow/Scripts/Scenarios/Definition/Actions/BuildDefinitionActions";
import { SourcesSelectionActionsCreator, IChangeSourcesSelectionPayload } from "CIWorkflow/Scripts/Scenarios/Definition/Actions/SourcesSelectionActionsCreator";
import {
    IRepositoriesPayload, IRepositoryBranchesPayload, VersionControlActions,
    IVersionControlPropertyChangedPayload, IMappingPayload, IRepositoryPayload,
    IRepositoryWebhooksPayload, RepositoryListState
} from "CIWorkflow/Scripts/Scenarios/Definition/Actions/VersionControlActions";
import { VersionControlActionsCreator } from "CIWorkflow/Scripts/Scenarios/Definition/Actions/VersionControlActionsCreator";
import { YamlDefinitionActions, IBooleanPayload, IPathContentsPayload } from "CIWorkflow/Scripts/Scenarios/Definition/Actions/YamlDefinitionActions";
import { YamlDefinitionActionsCreator } from "CIWorkflow/Scripts/Scenarios/Definition/Actions/YamlDefinitionActionsCreator";
import { BuildDefinitionStoreKeys } from "CIWorkflow/Scripts/Scenarios/Definition/Common";
import { IRepository, IRepositoryWebhook, VersionControlProperties, MappingTypes } from "CIWorkflow/Scripts/Scenarios/Definition/Sources/VersionControlInterfaces";
import { VersionControlSource } from "CIWorkflow/Scripts/Scenarios/Definition/Sources/VersionControlSource";
import { SourceProvidersStore } from "CIWorkflow/Scripts/Scenarios/Definition/Stores/SourceProvidersStore";
import { Store } from "CIWorkflow/Scripts/Scenarios/Definition/Stores/Base";
import { ISubversionMappingItem } from "CIWorkflow/Scripts/Scenarios/Definition/Stores/SubversionStore";
import { ITfvcMappingItem } from "CIWorkflow/Scripts/Scenarios/Definition/Stores/TfvcMappingHelper";

import { ConnectedServiceEndpointActions, INewServiceEndpoint, IServiceEndpoints } from "DistributedTaskControls/Actions/ConnectedServiceEndpointActions";
import { ConnectedServiceActionsCreator } from "DistributedTaskControls/Actions/ConnectedServiceEndpointActionsCreator";
import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";

import { Boolean } from "DistributedTaskControls/Common/Primitives";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";

import { BuildDefinition, BuildResult, RepositoryCleanOptions, BuildRepository } from "TFS/Build/Contracts";
import { ServiceEndpoint } from "TFS/ServiceEndpoint/Contracts";

import * as Utils_Core from "VSS/Utils/Core";
import * as Utils_Number from "VSS/Utils/Number";
import * as Utils_String from "VSS/Utils/String";

// Whether the repository has been validated on the server
export enum RepositoryStatus {
    Unknown,
    Valid,
    Invalid,
}

export interface IVersionControlState {
    repositoryType: string;
    errorMessage: string;
    definitionId: number;

    // Repository information
    repositories: IRepository[];
    selectedRepository: IRepository;
    selectedRepositoryStatus: RepositoryStatus;
    repositoryListState: RepositoryListState;
    branches: string[];
    selectedBranchName: string;
    cleanRepository: boolean;
    cleanOption: string;
    supportsWebhookTriggers: boolean;
    manageSourceHref: string;
    manageSourceText: string;

    // Whether this definition is created by an external integration (such as GitHub Launch).
    // Some aspect of those definitions cannot be updated by the user.  For example,
    // we will not allow users to update the repository. If users update those,
    // they will likely break the integration.
    isManagedExternally: boolean;

    // Endpoint information
    connections: ServiceEndpoint[];
    endpointType: string;
    newConnectionName: string;
    selectedConnectionId: string;
    showAddConnection: boolean;
    showConnectionDialog: boolean;

    // Advanced properties
    checkoutSubmodules: boolean;
    checkoutNestedSubmodules: boolean;
    fetchDepth: number;
    largeFileSupport: boolean;
    reportBuildStatus: boolean;
    skipSyncSources: boolean;
    shallowFetchStatus: boolean;
    version: string;
    tfvcMappings?: ITfvcMappingItem[];
    svnMappings?: ISubversionMappingItem[];
    webhooks?: IRepositoryWebhook[];

    supportCreateLabel: boolean;
    sourceLabelFormat: string;
    sourceLabelOption: string;

    // YAML discovery during definition creation
    isDiscoveringYaml: boolean;
    discoveredYamlFilename?: string;

    // Ignore when comparing
    sourceProvider: SourceProvider;
}

/**
 * @brief Store for all version control attributes related to the build definition.
 */
export class VersionControlStore extends Store {
    // Internal state (list of provider states keyed by repo type and the selectected repo type)
    private _selectedRepositoryType: string;
    private _providerStates: { [key: string]: IVersionControlState; };
    private _originalState: IVersionControlState;
    private _shouldListUnusedYamlFiles: boolean;
    // Actions we are listening to
    private _sourcesSelectionActionsCreator: SourcesSelectionActionsCreator; // this creator has the actions as well
    private _connectionServiceEndpointActions: ConnectedServiceEndpointActions;
    private _definitionActions: BuildDefinitionActions;
    private _versionControlActions: VersionControlActions;
    private _yamlDefinitionActions: YamlDefinitionActions;
    // Actions we may trigger
    private _connectedServiceEndpointActionsCreator: ConnectedServiceActionsCreator;
    private _versionControlActionsCreator: VersionControlActionsCreator;
    private _yamlDefinitionActionsCreator: YamlDefinitionActionsCreator;
    private _sourceProvidersStore: SourceProvidersStore;

    constructor() {
        super();
        this._connectedServiceEndpointActionsCreator = ActionCreatorManager.GetActionCreator<ConnectedServiceActionsCreator>(ConnectedServiceActionsCreator);
    }

    public static getKey(): string {
        return BuildDefinitionStoreKeys.StoreKey_VersionControlStore;
    }

    public getSelectedRepositoryType(): string {
        return this._selectedRepositoryType;
    }

    private _setSelectedRepositoryType(newRepositoryType: string) {
        if (this._providerStates && !Utils_String.equals(newRepositoryType, this.getSelectedRepositoryType(), true)) {
            const state: IVersionControlState = this._providerStates[newRepositoryType];
            if (!state) {
                newRepositoryType = RepositoryTypes.TfsGit;
            }
            this._selectedRepositoryType = newRepositoryType;
        }
    }

    public initialize(): void {
        this._sourceProvidersStore = StoreManager.GetStore<SourceProvidersStore>(SourceProvidersStore);
        this._loadSourceProvidersStates(this._sourceProvidersStore.getProviders());

        this._sourcesSelectionActionsCreator = ActionCreatorManager.GetActionCreator<SourcesSelectionActionsCreator>(SourcesSelectionActionsCreator);
        this._versionControlActionsCreator = ActionCreatorManager.GetActionCreator<VersionControlActionsCreator>(VersionControlActionsCreator);
        this._yamlDefinitionActionsCreator = ActionCreatorManager.GetActionCreator<YamlDefinitionActionsCreator>(YamlDefinitionActionsCreator);
        this._connectionServiceEndpointActions = ActionsHubManager.GetActionsHub<ConnectedServiceEndpointActions>(ConnectedServiceEndpointActions);
        this._definitionActions = ActionsHubManager.GetActionsHub<BuildDefinitionActions>(BuildDefinitionActions);
        this._versionControlActions = ActionsHubManager.GetActionsHub<VersionControlActions>(VersionControlActions);
        this._yamlDefinitionActions = ActionsHubManager.GetActionsHub<YamlDefinitionActions>(YamlDefinitionActions);
        this._addListeners();
    }

    public updateVisitor(definition: BuildDefinition): BuildDefinition {
        if (!this._isSupported()) {
            return definition;
        }

        const state = this.getState();

        // Update the repository in the build definition
        definition.repository = {
            checkoutSubmodules: state.checkoutSubmodules,
            clean: state.cleanRepository.toString(),
            defaultBranch: state.selectedBranchName,
            id: state.selectedRepository.id,
            name: state.selectedRepository.name,
            properties: state.selectedRepository.data || {},
            rootFolder: definition.repository ? definition.repository.rootFolder : null,
            type: state.repositoryType,
            url: state.selectedRepository.url
        };

        definition.repository.properties[RepositoryProperties.CheckoutNestedSubmodules] = state.checkoutNestedSubmodules.toString();
        definition.repository.properties[RepositoryProperties.CleanOptions] = state.cleanOption;
        definition.repository.properties[RepositoryProperties.FetchDepth] = state.fetchDepth.toString();
        definition.repository.properties[RepositoryProperties.GitLfsSupport] = state.largeFileSupport.toString();
        definition.repository.properties[RepositoryProperties.ReportBuildStatus] = state.reportBuildStatus.toString();
        definition.repository.properties[RepositoryProperties.ConnectedServiceId] = state.selectedConnectionId;
        definition.repository.properties[RepositoryProperties.SkipSyncSource] = state.skipSyncSources.toString();
        definition.repository.properties[RepositoryProperties.LabelSourcesFormat] = state.sourceLabelFormat;
        definition.repository.properties[RepositoryProperties.LabelSources] = state.sourceLabelOption;

        if (ScmUtils.isFetchDepthEmpty(definition.repository.properties, state.shallowFetchStatus)) {
            definition.repository.properties[RepositoryProperties.FetchDepth] = "0";
        }

        return definition;
    }

    public isDirty(): boolean {
        if (!this._isSupported()) {
            return false;
        }

        if (!this._originalState) {
            // we haven't been initialized with the definition yet
            return false;
        }

        // Compare the current state with the original state
        const currentState = this._getComparableState();

        return !Utils_Core.equals(currentState, this._originalState);
    }

    public isValid(): boolean {
        if (!this._isSupported()) {
            return true;
        }

        const state = this.getState();

        // Make sure there is a selected endpoint
        if (!state.selectedConnectionId) {
            return false;
        }

        // Make sure there is a repository selected
        if (!state.selectedRepository || !state.selectedRepository.name || !state.selectedRepository.url) {
            return false;
        }

        if (state.repositories.length > 0) {
            // The selected repository should come from the list
            if (this._findRepository(state.repositories, state.selectedRepository) === null) {
                return false;
            }
        }

        // Make sure there is a branch selected
        if (!state.selectedBranchName) {
            return false;
        }
        if (state.branches.length > 0) {
            // The selected branch should come from the list
            if (!this._getBranch(state.branches, state.selectedBranchName)) {
                return false;
            }
        }

        // Check fetchDepth
        if (state.shallowFetchStatus && (!state.fetchDepth || !Utils_Number.isPositiveNumber(state.fetchDepth))) {
            return false;
        }

        // Check label format
        if (state.supportCreateLabel && !this._isLabelFormatValid(state)) {
            return false;
        }

        // Block while looking for YAML
        if (state.isDiscoveringYaml) {
            return false;
        }

        return true;
    }

    public getSelectedSourceLabel(): ISourceLabelProps {
        const state = this.getState();
        return {
            sourceLabelOption: state.sourceLabelOption,
            sourceLabelFormat: state.sourceLabelFormat,
            showSourceLabelFormat: (state.sourceLabelOption !== BuildResult.None.toString())
        } as ISourceLabelProps;
    }

    private _isLabelFormatValid(state: IVersionControlState): boolean {
        if (Utils_String.equals(BuildResult.None.toString(), state.sourceLabelOption, true) ||
            !ScmUtils.validateLabelSourcesFormat(state.sourceLabelFormat)) {
            return true;
        }
        return false;
    }

    private _getDefaultSourceLabelFormat(): string {
        return ScmUtils.getDefaultSourceLabelFormat();
    }

    private _addListeners() {
        this._sourcesSelectionActionsCreator.SelectSourceTab.addListener(this._handleSelectSourceTab);
        this._sourcesSelectionActionsCreator.TfSourceRepositoryChanged.addListener(this._handleTfSourcesChanged);
        this._sourcesSelectionActionsCreator.SourceSelectionChanged.addListener(this._handleSourceSelectionChanged);

        this._connectionServiceEndpointActions.UpdateServiceEndpoints.addListener(this._handleUpdateServiceEndpoints);
        this._connectionServiceEndpointActions.AddedNewServiceEndpoint.addListener(this._handleNewServiceEndpoint);
        this._definitionActions.createBuildDefinition.addListener(this._handleCreateBuildDefinition);
        this._definitionActions.updateBuildDefinition.addListener(this._handleUpdateBuildDefinition);
        this._versionControlActions.addMapping.addListener(this._handleAddMapping);
        this._versionControlActions.updateBranches.addListener(this._handleUpdateBranches);
        this._versionControlActions.updateMapping.addListener(this._handleUpdateMapping);
        this._versionControlActions.updateProperty.addListener(this._handleUpdateProperty);
        this._versionControlActions.updateRepositories.addListener(this._handleUpdateRepositories);
        this._versionControlActions.updateSelectedBranch.addListener(this._handleUpdateSelectedBranch);
        this._versionControlActions.updateSelectedConnection.addListener(this._handleUpdateSelectedConnection);
        this._versionControlActions.updateSelectedRepository.addListener(this._handleUpdateSelectedRepository);
        this._versionControlActions.clearError.addListener(this._handleClearError);
        this._versionControlActions.updateRemoteWebhooks.addListener(this._handleUpdateRemoteWebhooks);
        this._versionControlActions.webhooksRestored.addListener(this._handleWebhooksRestored);
        this._versionControlActions.requestAllRepositories.addListener(this._handleRequestAllRepositories);
        this._yamlDefinitionActions.setListUnusedYamlFilesEnabled.addListener(this._handleSetListUnusedYamlFilesEnabled);
        this._yamlDefinitionActions.listUnusedYamlFiles.addListener(this._handleListUnusedYamlFiles);
    }

    protected disposeInternal(): void {
        this._sourcesSelectionActionsCreator.SelectSourceTab.removeListener(this._handleSelectSourceTab);
        this._sourcesSelectionActionsCreator.TfSourceRepositoryChanged.removeListener(this._handleTfSourcesChanged);
        this._sourcesSelectionActionsCreator.SourceSelectionChanged.removeListener(this._handleSourceSelectionChanged);

        this._connectionServiceEndpointActions.UpdateServiceEndpoints.removeListener(this._handleUpdateServiceEndpoints);
        this._connectionServiceEndpointActions.AddedNewServiceEndpoint.removeListener(this._handleNewServiceEndpoint);
        this._definitionActions.createBuildDefinition.removeListener(this._handleCreateBuildDefinition);
        this._definitionActions.updateBuildDefinition.removeListener(this._handleUpdateBuildDefinition);
        this._versionControlActions.addMapping.removeListener(this._handleAddMapping);
        this._versionControlActions.updateBranches.removeListener(this._handleUpdateBranches);
        this._versionControlActions.updateMapping.removeListener(this._handleUpdateMapping);
        this._versionControlActions.updateProperty.removeListener(this._handleUpdateProperty);
        this._versionControlActions.updateRepositories.removeListener(this._handleUpdateRepositories);
        this._versionControlActions.updateSelectedBranch.removeListener(this._handleUpdateSelectedBranch);
        this._versionControlActions.updateSelectedConnection.removeListener(this._handleUpdateSelectedConnection);
        this._versionControlActions.updateSelectedRepository.removeListener(this._handleUpdateSelectedRepository);
        this._versionControlActions.clearError.removeListener(this._handleClearError);
        this._versionControlActions.updateRemoteWebhooks.removeListener(this._handleUpdateRemoteWebhooks);
        this._versionControlActions.webhooksRestored.removeListener(this._handleWebhooksRestored);
        this._versionControlActions.requestAllRepositories.removeListener(this._handleRequestAllRepositories);
        this._yamlDefinitionActions.setListUnusedYamlFilesEnabled.removeListener(this._handleSetListUnusedYamlFilesEnabled);
        this._yamlDefinitionActions.listUnusedYamlFiles.removeListener(this._handleListUnusedYamlFiles);
    }

    public getState(): IVersionControlState {
        return this._getState(this._selectedRepositoryType);
    }

    public getCurrentRepository(repositoryType: string): IPromise<BuildRepository> {
        if (this._providerStates && this._providerStates[repositoryType]) {
            const state: IVersionControlState = this._providerStates[repositoryType];
            const connectionId = NavigationUtils.getConnectionIdFromUrl();

            if (state.repositories.length === 0 && connectionId) {
                const repositoryName = NavigationUtils.getRepositoryNameFromUrl();
                const branchName = NavigationUtils.getBranchNameFromUrl();
                return this._connectedServiceEndpointActionsCreator.getServiceEndpoints(repositoryType, connectionId).then(() => {
                    state.selectedConnectionId = connectionId;
                    const provider = this._sourceProvidersStore.getProvider(repositoryType);
                    const source = new VersionControlSource();
                    this._selectedRepositoryType = repositoryType;
                    return source.getRepository(provider, connectionId, repositoryName).then((repository: IRepository) => {
                        if (repository) {
                            repository.data[RepositoryProperties.ConnectedServiceId] = connectionId;
                            return {
                                id: repository.id,
                                name: repository.name,
                                defaultBranch: branchName,
                                url: repository.url,
                                checkoutSubmodules: state.checkoutSubmodules,
                                clean: state.cleanRepository.toString(),
                                properties: repository.data,
                                rootFolder: null,
                                type: state.repositoryType
                            } as BuildRepository;
                        }
                    });
                });
            }
        }

        const buildRepository = {
            type: repositoryType
        } as BuildRepository;

        return Q.resolve(buildRepository);
    }

    private setState(newState: IVersionControlState, repositoryType: string) {
        if (this._providerStates) {
            this._providerStates[repositoryType] = newState;
        }
    }

    private _getEmptyState(): IVersionControlState {
        return {
            sourceProvider: null,
            repositoryType: Utils_String.empty,
            errorMessage: Utils_String.empty,
            definitionId: -1,
            cleanRepository: false,
            cleanOption: RepositoryCleanOptions.Source.toString(),
            repositories: [],
            selectedRepository: this._getEmptyRepository(),
            selectedRepositoryStatus: RepositoryStatus.Unknown,
            repositoryListState: RepositoryListState.Uninitialized,
            supportsWebhookTriggers: false,
            branches: [],
            selectedBranchName: null,
            connections: [],
            endpointType: Utils_String.empty,
            newConnectionName: Utils_String.empty,
            selectedConnectionId: Utils_String.empty,
            showAddConnection: false,
            showConnectionDialog: false,
            checkoutSubmodules: false,
            checkoutNestedSubmodules: false,
            fetchDepth: 0,
            largeFileSupport: false,
            reportBuildStatus: false,
            skipSyncSources: false,
            shallowFetchStatus: false,
            sourceLabelFormat: this._getDefaultSourceLabelFormat(),
            sourceLabelOption: BuildResult.None.toString(),
            isDiscoveringYaml: false,
            discoveredYamlFilename: null,
            svnMappings: null,
            tfvcMappings: null,
            version: Utils_String.empty,
            supportCreateLabel: false,
            isManagedExternally: false,
            manageSourceHref: Utils_String.empty,
            manageSourceText: Utils_String.empty

        };
    }

    private _getState(repositoryType: string): IVersionControlState {
        if (this._providerStates && this._providerStates[repositoryType]) {
            // return a clone/copy of the selected repository's state
            // This is not exactly a deep copy but it is sufficiently deep to make this state immutable
            const state: IVersionControlState = this._providerStates[repositoryType];
            // Make a new copy of the state and the first level of objects/arrays
            const newState: IVersionControlState = { ...state };
            newState.repositories = state.repositories ? state.repositories.slice(0) : [];
            newState.repositoryListState = state.repositoryListState;
            newState.branches = state.branches ? state.branches.slice(0) : [];
            newState.connections = state.connections ? state.connections.slice(0) : [];
            newState.svnMappings = state.svnMappings ? state.svnMappings.slice(0) : undefined;
            newState.tfvcMappings = state.tfvcMappings ? state.tfvcMappings.slice(0) : undefined;
            newState.selectedRepository = { ...state.selectedRepository };
            newState.selectedRepositoryStatus = state.selectedRepositoryStatus;
            newState.reportBuildStatus = state.reportBuildStatus;
            newState.supportCreateLabel = state.supportCreateLabel;
            newState.sourceLabelOption = state.sourceLabelOption || BuildResult.None.toString();
            newState.sourceLabelFormat = state.sourceLabelFormat || this._getDefaultSourceLabelFormat();
            newState.isManagedExternally = state.isManagedExternally;
            newState.manageSourceHref = state.manageSourceHref;
            newState.manageSourceText = state.manageSourceText;

            // Calculate any fields that require processing
            state.supportsWebhookTriggers = this._getSupportsWebhookTriggers(state);
            // Get the newConnectionName in case anyone needs it
            newState.newConnectionName = this._getNewConnectionName(newState.connections.length, this._selectedRepositoryType);

            return newState;
        }
        return this._getEmptyState();
    }

    private _handleSelectSourceTab = (payload: IChangeSourcesSelectionPayload) => {
        this._setSelectedRepositoryType(payload.selectedTabItemKey);

        if (!this._isSupported()) {
            return;
        }

        this.emitChanged();
    }

    private _handleSourceSelectionChanged = () => {
        // TODO this event has no data. Not sure if we should do anything here
        // this.emitChanged();
    }

    private _loadSourceProvidersStates = (providers: SourceProvider[]) => {
        // Initialize all the provider states based on the SourceProviders
        let firstRepositoryType;
        this._providerStates = {};
        for (const provider of providers) {
            if (provider.getTabOrder() >= 0) { // only for valid tab-states
                this._providerStates[provider.getRepositoryType()] = {
                    sourceProvider: provider,
                    repositoryType: provider.getRepositoryType(),
                    errorMessage: Utils_String.empty,
                    definitionId: -1,
                    cleanRepository: false,
                    cleanOption: RepositoryCleanOptions.Source.toString(),
                    repositories: [],
                    repositoryListState: RepositoryListState.Uninitialized,
                    selectedRepository: this._getEmptyRepository(),
                    selectedRepositoryStatus: RepositoryStatus.Unknown,
                    supportsWebhookTriggers: provider.containsWebhookTrigger(),
                    branches: [],
                    selectedBranchName: null,
                    connections: [],
                    endpointType: provider.getServiceEndpointType() || Utils_String.empty,
                    newConnectionName: Utils_String.empty,
                    selectedConnectionId: Utils_String.empty,
                    showAddConnection: false,
                    showConnectionDialog: false,
                    checkoutSubmodules: false,
                    checkoutNestedSubmodules: false,
                    fetchDepth: 0,
                    largeFileSupport: false,
                    reportBuildStatus: true,
                    skipSyncSources: false,
                    shallowFetchStatus: false,
                    svnMappings: null,
                    tfvcMappings: null,
                    version: Utils_String.empty,
                    supportCreateLabel: provider.canCreateLabel(),
                    sourceLabelFormat: this._getDefaultSourceLabelFormat(),
                    sourceLabelOption: BuildResult.None.toString(),
                    isDiscoveringYaml: false,
                    discoveredYamlFilename: null,
                    isManagedExternally: false,
                    manageSourceHref: Utils_String.empty,
                    manageSourceText: Utils_String.format(Resources.ManageOnExternal, provider.getTitle())
                };

                if (!firstRepositoryType) {
                    firstRepositoryType = provider.getRepositoryType();
                }
            }
        }

        // Initilize the selected repo type to the first one in the list (or get it from the URL)
        let repositoryType = this._sourceProvidersStore.getSelectedRepositoryTypeFromUrl();
        if (!repositoryType) {
            repositoryType = firstRepositoryType;
        }

        this._setSelectedRepositoryType(repositoryType);
    }

    private _handleTfSourcesChanged = (selectedRepositoryType: string) => {
        // This event exists because TFGit and TFVC share a tab, make sure this is called appropriately from the tab
        this._setSelectedRepositoryType(selectedRepositoryType);

        if (!this._isSupported()) {
            return;
        }
        this.emitChanged();
    }

    private _handleAddMapping = (payload: IMappingPayload) => {
        if (!this._isSupported()) {
            return;
        }

        this._updateStateFromMapping(payload, true);
    }

    private _handleUpdateMapping = (payload: IMappingPayload) => {
        if (!this._isSupported()) {
            return;
        }

        this._updateStateFromMapping(payload, false);
    }

    private _handleUpdateServiceEndpoints = (payload: IServiceEndpoints) => {
        if (!this._isSupported()) {
            return;
        }

        const state = this.getState();
        if (Utils_String.equals(payload.type, state.endpointType, true)) {
            // This payload matches our endpoint type, so update our endpoint information
            this._updateStateFromConnections(state, payload);
            this.emitChanged();
        }
    }

    private _handleNewServiceEndpoint = (payload: INewServiceEndpoint) => {
        if (!this._isSupported()) {
            return;
        }

        const state = this.getState();
        state.errorMessage = payload.errorMessage || state.errorMessage;
        if (payload.endpoint && Utils_String.equals(payload.endpoint.type, state.endpointType, true)) {
            state.selectedConnectionId = payload.endpoint.id;
            this.setState(state, this._selectedRepositoryType);
            this.emitChanged();

            // Trigger the action to query for the service endpoints
            this._connectedServiceEndpointActionsCreator.getServiceEndpoints(state.endpointType);
        }
    }

    private _handleWebhooksRestored = (payload: IRepositoryWebhooksPayload) => {
        if (!this.isValid()) {
            return;
        }

        if (payload.errorMessage) {
            return;
        }

        // Refresh the list of webhooks that are present
        const state = this._getState(payload.repositoryType);
        this._fetchWebhooks(state);
    }

    private _handleCreateBuildDefinition = (definition: BuildDefinition) => {
        this._originalState = this._getEmptyState();
        this._setSelectedRepositoryType(definition.repository ? definition.repository.type : this._selectedRepositoryType);
        this._updateStateFromBuildDefinition(definition);
        this.emitChanged();
    }

    private _handleUpdateBuildDefinition = (definition: BuildDefinition) => {
        this._setSelectedRepositoryType(definition.repository ? definition.repository.type : this._selectedRepositoryType);
        this._updateStateFromBuildDefinition(definition);

        // Keep a copy of this state for comparisons
        this._originalState = this._getComparableState();
        this.emitChanged();
    }

    private _handleUpdateRepositories = (payload: IRepositoriesPayload) => {
        if (!this._isSupported()) {
            return;
        }

        this._updateStateFromRepositories(payload);
        this.emitChanged();
    }

    private _handleUpdateBranches = (payload: IRepositoryBranchesPayload) => {
        if (!this._isSupported()) {
            return;
        }

        this._updateStateFromBranches(payload);
        this.emitChanged();
    }

    private _handleUpdateProperty = (payload: IVersionControlPropertyChangedPayload) => {
        if (!this._isSupported()) {
            return;
        }

        this._updateStateFromPropertyChanged(payload);
        this.emitChanged();
    }

    private _handleUpdateSelectedRepository = (payload: IRepositoryPayload) => {
        if (!this._isSupported()) {
            return;
        }

        // Get a copy of the state, update it and call set state to update it
        const state = this.getState();
        // Overwrite any error message since getting a new list of branches, etc
        state.errorMessage = payload.errorMessage;
        // If the user is done entering the value change the selection, otherwise just update the name
        if (payload.isComplete) {
            this._updateSelectedRepository(state, payload.repository, true);
        }
        else {
            // Double check to see if the one typed is in our list
            const typedRepository = this._findRepository(state.repositories, payload.repository);
            if (typedRepository) {
                // Found the repo that was typed, so update to that one right away
                this._updateSelectedRepository(state, typedRepository, true);
            }
            else {
                // Not in the list, so wait for the user to complete typing
                state.selectedRepository.name = payload.repository ? payload.repository.name : Utils_String.empty;
                state.selectedRepositoryStatus = RepositoryStatus.Unknown;
            }
        }
        this.setState(state, this._selectedRepositoryType);
        this.emitChanged();
    }

    private _handleUpdateSelectedBranch = (payload: string) => {
        if (!this._isSupported()) {
            return;
        }

        // Get a copy of the state, update it and call set state to update it
        const state = this.getState();
        this._updateSelectedBranch(state, payload, Utils_String.empty);
        this.setState(state, this._selectedRepositoryType);
        this.emitChanged();
    }

    private _handleUpdateSelectedConnection = (payload: string) => {
        if (!this._isSupported()) {
            return;
        }

        // Get a copy of the state, update it and call set state to update it
        const state = this.getState();
        this._updateSelectedConnection(state, payload);
        // Overwrite any error message since getting a new list of repos, branches, etc
        state.errorMessage = Utils_String.empty;
        this.setState(state, this._selectedRepositoryType);
        this.emitChanged();
    }

    private _handleUpdateRemoteWebhooks = (payload: IRepositoryWebhooksPayload) => {
        if (!this._isSupported()) {
            return;
        }

        // Get a copy of the state, update it and call set state to update it
        const state = this._getState(payload.repositoryType);
        if (state.selectedConnectionId === payload.connectionId) {
            state.errorMessage = payload.errorMessage || state.errorMessage;
            state.webhooks = payload.webhooks;
            this.setState(state, payload.repositoryType);
            this.emitChanged();
        }
    }

    private _handleRequestAllRepositories = (repositoryType: string) => {
        if (!this._isSupported()) {
            return;
        }

        const state: IVersionControlState = this.getState();
        this._fetchRepositories(state, false);
        this.setState(state, state.repositoryType);
        this.emitChanged();
    }

    private _handleClearError = () => {
        const state: IVersionControlState = this.getState();
        state.errorMessage = Utils_String.empty;
        this.setState(state, this._selectedRepositoryType);
    }

    private _handleSetListUnusedYamlFilesEnabled = (payload: IBooleanPayload) => {
        this._shouldListUnusedYamlFiles = payload.value;
    }

    private _updateStateFromConnections(state: IVersionControlState, payload: IServiceEndpoints): void {
        // Use the copy of the state passed in, update it and call set state to update it
        // Overwrite any error message since getting a new list of connections resets repos, branches, etc
        state.errorMessage = payload.errorMessage;
        state.connections = payload.endpoints ? payload.endpoints.slice(0) : [];
        this._updateSelectedConnection(state, state.selectedConnectionId);
        this.setState(state, this._selectedRepositoryType);
    }

    private _updateStateFromBuildDefinition(definition: BuildDefinition) {
        // Get a copy of the state, update it and call set state to update it
        const state = this.getState();
        state.definitionId = definition.id;
        state.errorMessage = Utils_String.empty;

        // disable modifying repo selection if this is a external launch build definition
        state.isManagedExternally = this._isExternalLaunchBuildDefinition(definition);

        if (definition.repository && this._isSupported()) {
            state.cleanRepository = (definition.repository.clean === Boolean.trueString);
            state.sourceProvider = this._providerStates[definition.repository.type] && this._providerStates[definition.repository.type].sourceProvider;
            state.checkoutSubmodules = definition.repository.checkoutSubmodules;
            state.selectedBranchName = definition.repository.defaultBranch;

            const properties = definition.repository.properties || {};
            state.cleanOption = properties[RepositoryProperties.CleanOptions] || "0";
            state.checkoutNestedSubmodules = (properties[RepositoryProperties.CheckoutNestedSubmodules] === Boolean.trueString);
            state.fetchDepth = properties[RepositoryProperties.FetchDepth]
                ? Utils_Number.parseInvariant(properties[RepositoryProperties.FetchDepth])
                : 0;
            state.largeFileSupport = (properties[RepositoryProperties.GitLfsSupport] === Boolean.trueString);
            state.reportBuildStatus = (properties[RepositoryProperties.ReportBuildStatus] === Boolean.trueString);
            state.selectedConnectionId = properties[RepositoryProperties.ConnectedServiceId];
            state.shallowFetchStatus = ScmUtils.getShallowFetchStatus(properties);
            state.skipSyncSources = (properties[RepositoryProperties.SkipSyncSource] === Boolean.trueString);
            state.sourceLabelOption = properties[RepositoryProperties.LabelSources] || BuildResult.None.toString();

            state.manageSourceHref = properties[RepositoryProperties.ManageUrl];

            // When user selected "Never" tag source, we hide the label format input, but do not clear out the value so user could
            // freely explore between the options but doesn't have to re-enter the format repeatedly.
            // We should reset the selection to default value when user load this build definition and the tagging option is "Never"
            state.sourceLabelFormat = properties[RepositoryProperties.LabelSources] === BuildResult.None.toString()
                ? this._getDefaultSourceLabelFormat()
                : properties[RepositoryProperties.LabelSourcesFormat];
            // TODO as needed
            // state.svnMappings
            // state.tfvcMappings
            // state.version

            this._updateSelectedRepository(state, {
                    id: definition.repository.id,
                    url: definition.repository.url,
                    name: definition.repository.name,
                    data: definition.repository.properties
                },
                // Don't fetch branches here since the call to fetch repos will also trigger it
                false);
            this._updateSelectedBranch(state, state.selectedBranchName, definition.repository.defaultBranch);
        }

        this.setState(state, this._selectedRepositoryType);
    }

    private _isExternalLaunchBuildDefinition(definition: BuildDefinition): boolean {
        return definition && definition.tags && (definition.tags.indexOf("XLaunch") > -1);
    }

    private _updateStateFromRepositories(payload: IRepositoriesPayload) {
        // Get a copy of the state, update it and call set state to update it
        // Because payloads may arrive asynchronously, the payload received may be from a different state
        const state = this._getState(payload.repositoryType);
        if (state.selectedConnectionId === payload.connectionId) {
            state.repositories = payload.repositories ? payload.repositories.slice(0) : [];
            // Overwrite any error message since getting a new list of branches, etc
            state.errorMessage = payload.errorMessage;
            state.repositoryListState = payload.listState;

            if (!state.sourceProvider.canQueryRepositories() && (state.repositories.length === 1)) {
                // For the External Git and Subversion connections the repository is always defined in the endpoint's URL.
                // We always should use it regardless the definition is new or exists already.
                state.selectedRepository = state.repositories[0];
            }

            this._updateSelectedRepository(state, state.selectedRepository, true);
            this.setState(state, payload.repositoryType);
        }
    }

    private _updateStateFromBranches(payload: IRepositoryBranchesPayload) {
        // Get a copy of the state, update it and call set state to update it
        // Because payloads may arrive asynchronously, the payload received may be from a different state
        const state = this._getState(payload.repositoryType);
        if (state.selectedConnectionId === payload.connectionId &&
            (payload.repository && state.selectedRepository && Utils_String.equals(payload.repository.url, state.selectedRepository.url))) {
            state.errorMessage = payload.errorMessage || state.errorMessage;
            state.branches = payload.branches ? payload.branches.slice(0) : [];

            let defaultBranch = state.selectedBranchName ? state.selectedBranchName : "master";
            if (state.selectedRepository && state.selectedRepository.data[GitServiceConstants.defaultBranch]) {
                defaultBranch = state.selectedRepository.data[GitServiceConstants.defaultBranch];
            }

            this._updateSelectedBranch(state, state.selectedBranchName, defaultBranch);
            this.setState(state, payload.repositoryType);
        }
    }

    protected _updateStateFromPropertyChanged(payload: IVersionControlPropertyChangedPayload): void {
        // Get a copy of the state, update it and call set state to update it
        const state = this.getState();
        switch (payload.propertyName) {
            case VersionControlProperties.cleanRepository:
                state.cleanRepository = ((payload.value as string) === Boolean.trueString);
                break;
            case VersionControlProperties.cleanOption:
                state.cleanOption = payload.value as string;
                break;
            case VersionControlProperties.showAddConnection:
                state.showAddConnection = Boolean.fromString(payload.value as string);
                break;
            case VersionControlProperties.checkoutSubmodules:
                state.checkoutSubmodules = Boolean.fromString(payload.value as string);
                break;
            case VersionControlProperties.checkoutNestedSubmodules:
                state.checkoutNestedSubmodules = Boolean.fromString(payload.value as string);
                break;
            case VersionControlProperties.fetchDepth:
                const depth = Number.parseInt(payload.value as string);
                state.fetchDepth = Number.isNaN(depth) ? 0 : depth;
                break;
            case VersionControlProperties.largeFileSupport:
                state.largeFileSupport = Boolean.fromString(payload.value as string);
                break;
            case VersionControlProperties.reportBuildStatus:
                state.reportBuildStatus = Boolean.fromString(payload.value as string);
                break;
            case VersionControlProperties.skipSyncSources:
                state.skipSyncSources = Boolean.fromString(payload.value as string);
                break;
            case VersionControlProperties.shallowFetchStatus:
                state.shallowFetchStatus = Boolean.fromString(payload.value as string);
                break;
            case VersionControlProperties.sourceLabelFormat:
                state.sourceLabelFormat = payload.value as string;
                break;
            case VersionControlProperties.sourceLabelOption:
                state.sourceLabelOption = payload.value as string;
                break;
            case VersionControlProperties.version:
                // TODO remove this and just use Branch?
                state.version = payload.value as string;
                break;
            default:
                throw new Error(`Argument Error: unknown property name: ${payload.propertyName}`);
        }
        this.setState(state, this._selectedRepositoryType);
    }

    private _updateSelectedConnection(state: IVersionControlState, connectionId: string) {
        if (state.connections && state.connections.length > 0) {
            let selectedConnection = this._getConnection(state.connections, connectionId);
            if (!selectedConnection) {
                selectedConnection = state.connections[0];
            }
            state.selectedConnectionId = selectedConnection.id;
            state.showAddConnection = false;
            this._fetchRepositories(state, state.sourceProvider.canQueryTopRepositories());
            this.setState(state, state.repositoryType);
        }
        else {
            state.selectedConnectionId = null;
            state.showAddConnection = true;
        }
    }

    private _updateSelectedRepository(state: IVersionControlState, newRepository: IRepository, fetchBranches: boolean) {
        if (!newRepository) {
            // the repository was checked against the server and invalid or there's no access.
            state.selectedRepositoryStatus = RepositoryStatus.Invalid;
            state.selectedRepository = undefined;
            return;
        }

        let selectedRepo: IRepository = null;
        if (state.repositories && state.repositories.length > 0) {
            selectedRepo = this._findRepository(state.repositories, newRepository);
            if (!selectedRepo) {
                // Either the user typed in a value, the repo was deleted, or it just isn't in our current list.
                // We need to fetch the repo, which will eventually refire this event or show the error.
                state.selectedRepositoryStatus = RepositoryStatus.Unknown;
                this._fetchRepository(state, newRepository.name);
                return;
            }
            state.selectedRepositoryStatus = RepositoryStatus.Valid;
            state.manageSourceHref = selectedRepo.data && selectedRepo.data[RepositoryProperties.ManageUrl];
        }
        else {
            selectedRepo = newRepository;
            if (state.repositoryListState === RepositoryListState.AllRepositories || state.repositoryListState === RepositoryListState.TopRepositories) {
                state.selectedRepositoryStatus = RepositoryStatus.Invalid;
            }
            else {
                state.selectedRepositoryStatus = RepositoryStatus.Unknown;
            }
        }

        const updateBranchSelection: boolean = state.selectedRepository && (state.selectedRepository.name !== selectedRepo.name);
        state.selectedRepository = selectedRepo;
        if (state.selectedRepository.name && fetchBranches) {
            // refresh the list of branches and webhooks
            if (updateBranchSelection) {
                // Setting empty will update the branch selection after the branches list is fetched.
                state.selectedBranchName = Utils_String.empty;
            }
            this._fetchBranches(state);
            this._fetchWebhooks(state);
        }
    }

    private _updateSelectedBranch(state: IVersionControlState, newBranch: string, defaultBranch: string) {
        let branchName = newBranch ? newBranch : defaultBranch;
        if (!branchName && state.branches && state.branches.length > 0) {
            branchName = state.branches[0];
        }

        if (state.selectedBranchName !== branchName) {
            state.selectedBranchName = branchName;
            if (this._shouldListUnusedYamlFiles &&
                state.sourceProvider &&
                state.sourceProvider.canDiscoverExistingYamlDefinitions()) {
                state.isDiscoveringYaml = true;
                this._yamlDefinitionActionsCreator.listUnusedYamlFiles(
                    state.selectedConnectionId,
                    state.sourceProvider,
                    state.selectedRepository,
                    state.selectedBranchName);
            }
        }
    }

    private _updateStateFromMapping = (payload: IMappingPayload, isAdd: boolean) => {
        const state = this.getState();
        state.errorMessage = payload.errorMessage || state.errorMessage;
        if (Utils_String.equals(payload.type, MappingTypes.tfvc, true)) {
            // Update the TFVC mappings
            this._updateStateFromTfvcMapping(state, payload.tfvcMapping, isAdd);
        }
        else {
            // Update the TFVC mappings
            this._updateStateFromSvnMapping(state, payload.svnMapping, isAdd);
        }
        this.setState(state, this._selectedRepositoryType);
        this.emitChanged();
    }

    private _updateStateFromTfvcMapping = (state: IVersionControlState, mapping: ITfvcMappingItem, isAdd: boolean) => {
        if (!state.tfvcMappings) {
            state.tfvcMappings = [];
        }
        if (isAdd) {
            state.tfvcMappings.push(mapping);
        }
        else {
            // TODO update tfvc mappings
        }
    }

    private _updateStateFromSvnMapping = (state: IVersionControlState, mapping: ISubversionMappingItem, isAdd: boolean) => {
        if (!state.svnMappings) {
            state.svnMappings = [];
        }
        if (isAdd) {
            state.svnMappings.push(mapping);
        }
        else {
            // TODO update svnMappings
        }
    }

    private _fetchRepositories = (state: IVersionControlState, top: boolean) => {
        if (state.selectedConnectionId) {
            // Don't clear any lists here because it leads to validation errors that briefly show up in the UI
            this._versionControlActionsCreator.updateRepositories(state.sourceProvider, state.selectedConnectionId, top);
            state.repositoryListState = top ? RepositoryListState.FetchingTopRepositories : RepositoryListState.FetchingAllRepositories;
        }
        else {
            state.repositories = [];
            state.branches = [];
            state.webhooks = [];
        }
    }

    private _fetchRepository = (state: IVersionControlState, repoName: string) => {
        if (state.selectedConnectionId && repoName) {
            const top: boolean = state.repositoryListState === RepositoryListState.TopRepositories ||
                                 state.repositoryListState === RepositoryListState.FetchingTopRepositories;
            this._versionControlActionsCreator.addRepository(state.sourceProvider, state.selectedConnectionId, repoName, state.repositories, top);
        }
    }

    private _fetchBranches = (state: IVersionControlState) => {
        if (state.selectedRepository && state.selectedRepository.id) {
            // Don't clear any lists here because it leads to validation errors that briefly show up in the UI
            this._versionControlActionsCreator.updateBranches(state.sourceProvider, state.selectedConnectionId, state.selectedRepository);
        }
        else {
            state.branches = [];
        }
    }

    private _fetchWebhooks = (state: IVersionControlState) => {
        if (state.selectedRepository && state.selectedRepository.id) {
            // Don't clear any lists here because it leads to validation errors that briefly show up in the UI
            // Make sure there is something to fetch
            if (state.supportsWebhookTriggers) {
                this._versionControlActionsCreator.updateRemoteWebhooks(state.sourceProvider, state.selectedConnectionId, state.selectedRepository);
            }
        }
        else {
            state.webhooks = [];
        }
    }

    private _getConnection(connections: ServiceEndpoint[], connectionId: string): ServiceEndpoint {
        if (connections && connectionId) {
            for (const conn of connections) {
                if (Utils_String.equals(conn.id, connectionId, true)) {
                    return conn;
                }
            }
        }
        return null;
    }

    private _findRepository(repositories: IRepository[], repoToFind: IRepository): IRepository {
        if (repositories && repoToFind) {
            for (const repo of repositories) {
                if (Utils_String.equals(repo.url, repoToFind.url, true) ||
                    Utils_String.equals(repo.name, repoToFind.name, true)) {
                    return repo;
                }
            }
        }
        return null;
    }

    private _getBranch(branches: string[], branchName: string): string {
        if (branches && branchName) {
            for (const b of branches) {
                if (Utils_String.equals(b, branchName, false)) {
                    return branchName;
                }
            }
        }
        return null;
    }
    private _getEmptyRepository(): IRepository {
        return {
            id: Utils_String.empty,
            url: Utils_String.empty,
            name: Utils_String.empty,
            data: {}
        };
    }

    // TODO remove once all types are supported
    private _isSupported() {
        return this._selectedRepositoryType === RepositoryTypes.GitHubEnterprise ||
            this._selectedRepositoryType === RepositoryTypes.GitHub ||
            this._selectedRepositoryType === RepositoryTypes.Git ||
            this._selectedRepositoryType === RepositoryTypes.Bitbucket;
    }

    private _getNewConnectionName(connectionsCount: number, repositoryType: string): string {
        return Utils_String.format(Resources.SourcesConnectionNameFormat, repositoryType, connectionsCount + 1);
    }

    private _getSupportsWebhookTriggers(state: IVersionControlState): boolean {
        if (state.sourceProvider) {
            // get the current connection
            const selectedConnection = this._getConnection(state.connections, state.selectedConnectionId);

            // return the value that the provider has
            return state.sourceProvider.canQueryWebhooks(selectedConnection);
        }

        // return the last known value
        return state.supportsWebhookTriggers;
    }

    private _getComparableState(): IVersionControlState {
        // Get the current state and clear out any temporary (UI only) information
        const state = this.getState();
        state.repositories = null;
        state.repositoryListState = null;
        state.selectedRepositoryStatus = null;
        state.branches = null;
        state.connections = null;
        state.errorMessage = null;
        state.newConnectionName = null;
        state.showAddConnection = false;
        state.showConnectionDialog = false;
        state.webhooks = null;
        state.sourceProvider = null;
        state.manageSourceHref = null;
        state.manageSourceText = null;
        state.supportsWebhookTriggers = false;

        if (state.selectedRepository) {
            state.selectedRepository.data = null;

            // The ID is not consistent between BuildDefinition.repository.id and IRepository.id (from the VersionControlSource)
            state.selectedRepository.id = null;
        }

        return state;
    }

    private _handleListUnusedYamlFiles = (payload: IPathContentsPayload) => {
        const state = this._getState(payload.repositoryType);
        if (state.selectedConnectionId === payload.connectionId) {
            state.isDiscoveringYaml = false;

            // Here, "unused" means yaml files that exist in a repository but a build definition that uses
            // it does not exist in the project.

            // We only support a single file right now
            const yamlFile = payload.items && payload.items[0];
            if (yamlFile) {
                state.discoveredYamlFilename = yamlFile.path;
            }
            else {
                state.discoveredYamlFilename = null;
            }

            this.setState(state, payload.repositoryType);
            this.emitChanged();
        }
    }
}
