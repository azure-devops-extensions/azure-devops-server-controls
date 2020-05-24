import { SettingsSourceType } from "Build.Common/Scripts/Generated/TFS.Build2.Common";
import { RepositoryTypes } from "Build.Common/Scripts/Generated/TFS.Build2.Common";

import * as BuildContracts from "TFS/Build/Contracts";

import { BuildDefinitionActions } from "CIWorkflow/Scripts/Scenarios/Definition/Actions/BuildDefinitionActions";
import { IDropdownRowIndexPayload, InputIndexPayload } from "CIWorkflow/Scripts/Scenarios/Definition/Actions/Payloads";
import { PullRequestTriggerActions } from "CIWorkflow/Scripts/Scenarios/Definition/Actions/PullRequestTriggerActions";
import { IChangeSourcesSelectionPayload, SourcesSelectionActionsCreator } from "CIWorkflow/Scripts/Scenarios/Definition/Actions/SourcesSelectionActionsCreator";
import { IBooleanPayload } from "CIWorkflow/Scripts/Scenarios/Definition/Actions/TriggersActions";
import * as VersionControlActions from "CIWorkflow/Scripts/Scenarios/Definition/Actions/VersionControlActions";
import { BuildDefinitionStoreKeys, StoreChangedEvents } from "CIWorkflow/Scripts/Scenarios/Definition/Common";
import { SourceProvider, SourceProviderCapabilities, TriggerCapabilities, TriggerNotificationTypes } from "CIWorkflow/Scripts/Scenarios/Definition/SourceProvider";
import { Store } from "CIWorkflow/Scripts/Scenarios/Definition/Stores/Base";
import { SourceProvidersStore } from "CIWorkflow/Scripts/Scenarios/Definition/Stores/SourceProvidersStore";
import { SourcesSelectionStore } from "CIWorkflow/Scripts/Scenarios/Definition/Stores/SourcesSelectionStore";
import { VersionControlStore } from "CIWorkflow/Scripts/Scenarios/Definition/Stores/VersionControlStore";
import { YamlStore } from "CIWorkflow/Scripts/Scenarios/Definition/Stores/YamlStore";

import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";

import { FeatureAvailabilityFlags } from "Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants";

import { BuildDefinition, BuildRepository, BuildTrigger, DefinitionTriggerType, Forks, PullRequestTrigger, SupportedTrigger, SupportLevel } from "TFS/Build/Contracts";

import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";
import * as Utils_Array from "VSS/Utils/Array";
import * as Utils_String from "VSS/Utils/String";

export interface IPullRequestTriggerState {
    isSupported: boolean;
    isEnabled: boolean;
    isExpanded: boolean;
    settingsSourceType: number;
    isSettingsSourceTypeSupported: boolean;
    defaultSettingsSourceType: number;
    branchFilters: string[];
    pathFilters: string[];
    forks: Forks;
    enableSecretsForForks: boolean;
    isRemoteWebhookStatusSupported: boolean;
    isRemoteWebhookValid: boolean;
    isRestoringRemoteWebhooks: boolean;
    restoreWebhookErrorMessage: string;
    isCommentRequiredForPullRequest: boolean;
}

export class PullRequestTriggerStore extends Store {
    private _triggersState: IPullRequestTriggerState;
    private _originalTriggersState: IPullRequestTriggerState;
    private _isPullRequestTriggerSupported: boolean = false;
    private _isBuildForksSupported: boolean = false;
    private _isPathFilterSupported: boolean = false;
    private _buildDefinitionActions: BuildDefinitionActions;
    private _pullRequestActions: PullRequestTriggerActions;
    private _sourceProvidersStore: SourceProvidersStore;
    private _sourcesSelectionStore: SourcesSelectionStore;
    private _sourceSelectionActionCreator: SourcesSelectionActionsCreator;
    private _selectedRepositoryType: string;
    private _versionControlActions: VersionControlActions.VersionControlActions;
    private _buildDefinitionCreated: boolean;
    private _areWebhooksBeingRefreshed: boolean;
    private _originalBuildRepository: BuildRepository;
    private _versionControlStore: VersionControlStore;
    private _yamlStore: YamlStore;

    constructor() {
        super();

        // Initialize the triggers states
        this._triggersState = {
            isEnabled: false,
            branchFilters: [],
            pathFilters: [],
            forks: {
                enabled: false,
                allowSecrets: false,
            },
            enableSecretsForForks: false,
            isCommentRequiredForPullRequest: false
        } as IPullRequestTriggerState;

        this._originalTriggersState = {
            isEnabled: false,
            branchFilters: [],
            pathFilters: [],
            forks: {
                enabled: false,
                allowSecrets: false,
            },
            enableSecretsForForks: false,
            isCommentRequiredForPullRequest: false
        } as IPullRequestTriggerState;

        this._initializeTriggersState(this._triggersState);
        this._initializeTriggersState(this._originalTriggersState);

        this._selectedRepositoryType = Utils_String.empty;
        this._buildDefinitionCreated = false;
        this._areWebhooksBeingRefreshed = false;
    }

    public static getKey(): string {
        return BuildDefinitionStoreKeys.StoreKey_PullRequestTriggerStore;
    }

    public initialize(): void {
        this._sourceProvidersStore = StoreManager.GetStore<SourceProvidersStore>(SourceProvidersStore);
        this._sourcesSelectionStore = StoreManager.GetStore<SourcesSelectionStore>(SourcesSelectionStore);
        this._sourcesSelectionStore.addChangedListener(this._handleSourcesSelectionStoreChanged);

        // Listen to the VCStore change events as well and simply call the same handler as the SourcesSelectionStore handler.
        this._versionControlStore = StoreManager.GetStore<VersionControlStore>(VersionControlStore);
        this._versionControlStore.addChangedListener(this._handleSourcesSelectionStoreChanged);

        this._yamlStore = StoreManager.GetStore<YamlStore>(YamlStore);
        this._yamlStore.addChangedListener(this._handleYamlStoreChanged);

        this._buildDefinitionActions = ActionsHubManager.GetActionsHub<BuildDefinitionActions>(BuildDefinitionActions);
        this._buildDefinitionActions.updateBuildDefinition.addListener(this._handleUpdateBuildDefinition);
        this._buildDefinitionActions.createBuildDefinition.addListener(this._handleCreateBuildDefinition);

        this._sourceSelectionActionCreator = ActionCreatorManager.GetActionCreator<SourcesSelectionActionsCreator>(SourcesSelectionActionsCreator);
        this._sourceSelectionActionCreator.SelectSourceTab.addListener(this._handleChangeSelectedRepositoryType);

        this._pullRequestActions = ActionsHubManager.GetActionsHub<PullRequestTriggerActions>(PullRequestTriggerActions);
        this._pullRequestActions.ToggleEnabled.addListener(this._handleToggleEnabled);
        this._pullRequestActions.ToggleExpanded.addListener(this._handleToggleExpanded);
        this._pullRequestActions.AddBranchFilter.addListener(this._handleAddBranchFilter);
        this._pullRequestActions.ChangeBranchFilter.addListener(this._handleChangeBranchFilter);
        this._pullRequestActions.ChangeBranchFilterOption.addListener(this._handleChangeBranchFilterOption);
        this._pullRequestActions.ChangeSettingsSourceOption.addListener(this._handleChangeSettingsSourceOption);
        this._pullRequestActions.RemoveBranchFilter.addListener(this._handleRemoveBranchFilter);
        this._pullRequestActions.AddPathFilter.addListener(this._handleAddPathFilter);
        this._pullRequestActions.ChangePathFilter.addListener(this._handleChangePathFilter);
        this._pullRequestActions.ChangePathFilterOption.addListener(this._handleChangePathFilterOption);
        this._pullRequestActions.RemovePathFilter.addListener(this._handleRemovePathFilter);
        this._pullRequestActions.ToggleBuildingForks.addListener(this._handleBuildForks);
        this._pullRequestActions.ToggleAllowSecretsForForks.addListener(this._handleAllowSecretsForForks);
        this._pullRequestActions.ToggleIsCommentRequiredForPullRequest.addListener(this._handleToggleRequiredComment);

        this._versionControlActions = ActionsHubManager.GetActionsHub<VersionControlActions.VersionControlActions>(VersionControlActions.VersionControlActions);
        this._versionControlActions.webhooksRestorationStatusChanged.addListener(this._handleWebhooksRestorationStatusChanged);
        this._versionControlActions.updateSelectedRepository.addListener(this._handleUpdateSelectedRepository);
        this._versionControlActions.updateRemoteWebhooks.addListener(this._handleUpdateRemoteWebhooks);
    }

    protected disposeInternal(): void {
        this._sourcesSelectionStore.removeChangedListener(this._handleSourcesSelectionStoreChanged);

        this._yamlStore.removeChangedListener(this._handleYamlStoreChanged);

        this._buildDefinitionActions.updateBuildDefinition.removeListener(this._handleUpdateBuildDefinition);
        this._buildDefinitionActions.createBuildDefinition.removeListener(this._handleCreateBuildDefinition);

        this._sourceSelectionActionCreator.SelectSourceTab.removeListener(this._handleChangeSelectedRepositoryType);

        this._pullRequestActions.ToggleEnabled.removeListener(this._handleToggleEnabled);
        this._pullRequestActions.ToggleExpanded.removeListener(this._handleToggleExpanded);
        this._pullRequestActions.AddBranchFilter.removeListener(this._handleAddBranchFilter);
        this._pullRequestActions.ChangeBranchFilter.removeListener(this._handleChangeBranchFilter);
        this._pullRequestActions.ChangeBranchFilterOption.removeListener(this._handleChangeBranchFilterOption);
        this._pullRequestActions.ChangeSettingsSourceOption.removeListener(this._handleChangeSettingsSourceOption);
        this._pullRequestActions.RemoveBranchFilter.removeListener(this._handleRemoveBranchFilter);
        this._pullRequestActions.AddPathFilter.removeListener(this._handleAddPathFilter);
        this._pullRequestActions.ChangePathFilter.removeListener(this._handleChangePathFilter);
        this._pullRequestActions.ChangePathFilterOption.removeListener(this._handleChangePathFilterOption);
        this._pullRequestActions.RemovePathFilter.removeListener(this._handleRemovePathFilter);
        this._pullRequestActions.ToggleBuildingForks.removeListener(this._handleBuildForks);
        this._pullRequestActions.ToggleAllowSecretsForForks.removeListener(this._handleAllowSecretsForForks);
        this._pullRequestActions.ToggleIsCommentRequiredForPullRequest.removeListener(this._handleToggleRequiredComment);

        this._versionControlActions.webhooksRestorationStatusChanged.removeListener(this._handleWebhooksRestorationStatusChanged);
        this._versionControlActions.updateSelectedRepository.removeListener(this._handleUpdateSelectedRepository);
        this._versionControlActions.updateRemoteWebhooks.removeListener(this._handleUpdateRemoteWebhooks);
    }

    public isDirty(): boolean {
        return (this._triggersState.isEnabled !== this._originalTriggersState.isEnabled ||
            (this._triggersState.settingsSourceType || SettingsSourceType.Definition) !== (this._originalTriggersState.settingsSourceType || SettingsSourceType.Definition) ||
            !Utils_Array.arrayEquals(this._triggersState.branchFilters, this._originalTriggersState.branchFilters, (s, t) => s === t) ||
            !Utils_Array.arrayEquals(this._triggersState.pathFilters, this._originalTriggersState.pathFilters, (s, t) => s === t) ||
            this._triggersState.forks.enabled !== this._originalTriggersState.forks.enabled ||
            this._triggersState.forks.allowSecrets !== this._originalTriggersState.forks.allowSecrets ||
            this._triggersState.isCommentRequiredForPullRequest !== this._originalTriggersState.isCommentRequiredForPullRequest);
    }

    public isValid(): boolean {
        return !this._isPullRequestTriggerSupported ||
        !this._triggersState.isEnabled ||
        this._triggersState.settingsSourceType == SettingsSourceType.Process ||
        this._triggersState.branchFilters.length > 0;
    }

    public updateVisitor(buildDefinition: BuildDefinition): BuildDefinition {
        if (!buildDefinition.triggers) {
            buildDefinition.triggers = [];
        }

        let pullRequestTrigger = Utils_Array.first(buildDefinition.triggers, (trigger: BuildTrigger) => trigger.triggerType === DefinitionTriggerType.PullRequest) as PullRequestTrigger;
        if (!pullRequestTrigger) {
            // there is no existing trigger. add if necessary
            if (this._isPullRequestTriggerSupported && this._triggersState.isEnabled) {
                pullRequestTrigger = {
                    triggerType: DefinitionTriggerType.PullRequest,
                    settingsSourceType: this._triggersState.settingsSourceType,
                    branchFilters: Utils_Array.clone(this._triggersState.branchFilters),
                    pathFilters: Utils_Array.clone(this._triggersState.pathFilters),
                    forks:  {
                        enabled: this._triggersState.forks.enabled,
                        allowSecrets: this._triggersState.forks.allowSecrets
                    },
                    isCommentRequiredForPullRequest: this._triggersState.isCommentRequiredForPullRequest,
                    autoCancel: true
                };
                buildDefinition.triggers.push(pullRequestTrigger);
            }
        }
        else {
            // there is an existing trigger. update or remove
            // if pull request trigger is not supported remove it
            if (!this._triggersState.isEnabled || !this._isPullRequestTriggerSupported) {
                buildDefinition.triggers.splice(Utils_Array.indexOf(buildDefinition.triggers, pullRequestTrigger), 1);
            }
            else {
                pullRequestTrigger.settingsSourceType = this._triggersState.settingsSourceType;
                pullRequestTrigger.branchFilters = Utils_Array.clone(this._triggersState.branchFilters);
                pullRequestTrigger.pathFilters = Utils_Array.clone(this._triggersState.pathFilters);
                pullRequestTrigger.isCommentRequiredForPullRequest = this._triggersState.isCommentRequiredForPullRequest;
                pullRequestTrigger.forks = {
                    enabled: this._triggersState.forks.enabled,
                    allowSecrets: this._triggersState.forks.allowSecrets
                };
            }
        }

        return buildDefinition;
    }

    public getState(): IPullRequestTriggerState {
        return {
            ...this._triggersState,
            isSupported: this._isPullRequestTriggerSupported
        };
    }

    public get isPullRequestTriggerSupported(): boolean {
        return this._isPullRequestTriggerSupported;
    }

    private _handleSourcesSelectionStoreChanged = () => {
        const provider: SourceProvider = this._sourceProvidersStore.getProvider(this._selectedRepositoryType);
        if (!provider || !provider.isTriggerNotificationType(DefinitionTriggerType.PullRequest, TriggerNotificationTypes.webhook)) {
            return;
        }

        const webhookExists = this._sourcesSelectionStore.isWebhookPresent(DefinitionTriggerType.PullRequest);
        if (this._triggersState.isRemoteWebhookValid !== webhookExists) {
            this._triggersState.isRemoteWebhookValid = webhookExists;
            this.emitChanged();
        }
    }

    private _handleYamlStoreChanged = () => {
        const newSettings = {} as IPullRequestTriggerState;
        this._initializeTriggersState(newSettings);

        if (this._triggersState.defaultSettingsSourceType !== newSettings.defaultSettingsSourceType ||
            this._triggersState.isSettingsSourceTypeSupported !== newSettings.isSettingsSourceTypeSupported) {

            // Check if this is the first update to the YAML store (SettingSourceOptionsSupported going from false to true, if so, push default YAML values)
            if (!this._buildDefinitionCreated && !this._triggersState.isSettingsSourceTypeSupported && newSettings.isSettingsSourceTypeSupported)
            {
                // These values are checked under these conditions, because they otherwise can cause some weird behavior upon refresh or a page for a saved YAML definition
                this._triggersState.settingsSourceType = newSettings.settingsSourceType;
                this._triggersState.isEnabled = newSettings.isEnabled;
            }

            this._triggersState.defaultSettingsSourceType = newSettings.defaultSettingsSourceType;
            this._triggersState.isSettingsSourceTypeSupported = newSettings.isSettingsSourceTypeSupported;
            this.emitChanged();
        }
    }

    private _handleChangeSelectedRepositoryType = (payload: IChangeSourcesSelectionPayload): void => {
        // If the selected repo type and existing repo type doesn't match
        if (payload.selectedStoreKey &&
            !Utils_String.equals(payload.selectedStoreKey, this._selectedRepositoryType, true)) {
            this._updateSourcesCapabilities(payload.selectedStoreKey);
        }

        this.emitChanged();
    }

    private _updateTriggerStateToOriginalState(): void {
        this._triggersState.settingsSourceType = this._originalTriggersState.settingsSourceType;
        this._triggersState.branchFilters = Utils_Array.clone(this._originalTriggersState.branchFilters);
        this._triggersState.pathFilters = Utils_Array.clone(this._originalTriggersState.pathFilters);
        this._triggersState.forks = {
            enabled: this._originalTriggersState.forks.enabled,
            allowSecrets: this._originalTriggersState.forks.allowSecrets
        };
        this._triggersState.enableSecretsForForks = this._originalTriggersState.enableSecretsForForks;
        this._triggersState.isCommentRequiredForPullRequest = this._originalTriggersState.isCommentRequiredForPullRequest;
    }

    private _clearState(state: IPullRequestTriggerState, buildDefinition: BuildDefinition) {
        state.isEnabled = false;
        state.settingsSourceType = SettingsSourceType.Definition;
        state.branchFilters = [];
        state.pathFilters = [];

        let buildForksDefault = false;
        let passForkSecretsDefault = false;
        if (buildDefinition.repository) {
            const repositoryType = buildDefinition.repository.type || Utils_String.empty;
            const provider: SourceProvider = this._sourceProvidersStore.getProvider(repositoryType);
            if (provider) {
                buildForksDefault = provider.isBuildForksDefault();
                passForkSecretsDefault = provider.isPassForkSecretsDefault();
            }
        }

        state.forks = {
            enabled: buildForksDefault,
            allowSecrets: passForkSecretsDefault
        };
        state.enableSecretsForForks = buildForksDefault;
        state.isCommentRequiredForPullRequest = false;
    }

    private _updateStateFromBuildDefinition(buildDefinition: BuildDefinition, isCreate: boolean = false) {
        if (buildDefinition) {
            const triggers = buildDefinition.triggers || [];
            const existingTrigger = Utils_Array.first(triggers, (trigger) => (trigger.triggerType === DefinitionTriggerType.PullRequest)) as PullRequestTrigger;
            if (!existingTrigger) {
                if (isCreate) {
                    this._initializeTriggersState(this._triggersState);
                    this._initializeTriggersState(this._originalTriggersState);
                }
                else {
                    this._clearState(this._triggersState, buildDefinition);
                    this._clearState(this._originalTriggersState, buildDefinition);
                }
            }
            else {
                if (!isCreate) {
                    // Only update the original state if this is an existing definition
                    this._updateState(existingTrigger, this._originalTriggersState);
                }
                this._updateState(existingTrigger, this._triggersState);
            }

            // doing this after setting this._triggersState so that we only add the default branch if there are no existing branch filters
            if (buildDefinition.repository) {
                this._selectedRepositoryType = buildDefinition.repository.type || Utils_String.empty;
                if (!isCreate) {
                    // Only update the original state if this is an existing definition
                    this._originalBuildRepository = buildDefinition.repository;
                }
                this._updateSourcesCapabilities(this._selectedRepositoryType);
            }
        }
    }

    private _updateState(trigger: PullRequestTrigger, state: IPullRequestTriggerState) {
        state.isEnabled = true;
        state.settingsSourceType = trigger.settingsSourceType;
        state.branchFilters = Utils_Array.clone(trigger.branchFilters);
        state.pathFilters = Utils_Array.clone(trigger.pathFilters);
        state.forks = {
            enabled: (trigger.forks ? trigger.forks.enabled : false),
            allowSecrets: (trigger.forks ? trigger.forks.allowSecrets : false)
        };
        state.enableSecretsForForks = (trigger.forks ? trigger.forks.enabled : false);
        state.isCommentRequiredForPullRequest = trigger.isCommentRequiredForPullRequest;
    }

    private _initializeTriggersState(triggersState: IPullRequestTriggerState): void {
        let isYamlTriggerSupported: boolean;
        let initializingYamlDef: boolean = false;
        if (this._yamlStore) {
            isYamlTriggerSupported = this._yamlStore.getState().isYaml &&
                FeatureAvailabilityService.isFeatureEnabled(FeatureAvailabilityFlags.DistributedTaskYamlTriggers, false);
            initializingYamlDef = !this._buildDefinitionCreated && this._yamlStore.getState().isYaml;
        }

        triggersState.isEnabled = initializingYamlDef ? isYamlTriggerSupported : false;
        triggersState.isExpanded = true;
        triggersState.defaultSettingsSourceType = isYamlTriggerSupported ? SettingsSourceType.Process : SettingsSourceType.Definition;
        triggersState.isSettingsSourceTypeSupported = isYamlTriggerSupported;
        triggersState.settingsSourceType = isYamlTriggerSupported ? SettingsSourceType.Process : SettingsSourceType.Definition;
        triggersState.branchFilters = [];
        triggersState.pathFilters = [];
        triggersState.forks = {
            enabled: false,
            allowSecrets: false
        };
        triggersState.enableSecretsForForks = false;
        triggersState.isCommentRequiredForPullRequest = false;
        triggersState.isRemoteWebhookStatusSupported = false;
        triggersState.isRemoteWebhookValid = false;
        triggersState.isRestoringRemoteWebhooks = false;
        triggersState.restoreWebhookErrorMessage = null;
    }

    private _updateSourcesCapabilities(selectedRepositoryType: string): void {
        // update the selected repo type
        this._selectedRepositoryType = selectedRepositoryType;

        this._updateIsRemoteWebhookSupported();

        const provider: SourceProvider = this._sourceProvidersStore.getProvider(selectedRepositoryType);
        const isTriggerSupported = provider && provider.isTriggerSupported(DefinitionTriggerType.PullRequest);
        if (isTriggerSupported !== this._isPullRequestTriggerSupported) {
            this._isPullRequestTriggerSupported = isTriggerSupported;
            this.emitChanged();
        }

        const isBuildForksSupported = provider && provider.isBuildForksSupported(DefinitionTriggerType.PullRequest);
        if (isBuildForksSupported !== this._isBuildForksSupported) {
            this._isBuildForksSupported = isBuildForksSupported;
            this.emitChanged();
        }

        const isPathFilterSupported = provider && provider.isPathFilterSupported(DefinitionTriggerType.PullRequest);
        if (isPathFilterSupported !== this._isPathFilterSupported) {
            this._isPathFilterSupported = isPathFilterSupported;
            this.emitChanged();
        }
    }

    private _updateIsRemoteWebhookSupported() {
        const provider: SourceProvider = this._sourceProvidersStore.getProvider(this._selectedRepositoryType);
        if (provider && provider.isTriggerNotificationType(DefinitionTriggerType.PullRequest, TriggerNotificationTypes.webhook) &&
            provider.isTriggerSupported(DefinitionTriggerType.PullRequest)) {
            let hasRepositoryChanged = true;
            if (this._originalBuildRepository) {
                const currentRepository = this._sourcesSelectionStore.getBuildRepository();
                if (currentRepository) {
                    hasRepositoryChanged = this._originalBuildRepository.url !== currentRepository.url;
                }
            }

            const isSupported = provider.canQueryWebhooks() &&
                this._buildDefinitionCreated &&
                this._originalTriggersState.isEnabled &&
                !this._areWebhooksBeingRefreshed &&
                !hasRepositoryChanged;

            if (isSupported !== this._triggersState.isRemoteWebhookStatusSupported) {
                this._triggersState.isRemoteWebhookStatusSupported = isSupported;
                this.emitChanged();
            }
            else if (this._triggersState.isRemoteWebhookStatusSupported) {
                this._triggersState.isRemoteWebhookStatusSupported = false;
                this.emitChanged();
            }
        }
    }

    private _handleUpdateBuildDefinition = (definition: BuildDefinition) => {
        this._buildDefinitionCreated = definition.id > 0;

        // When saving the build, we're going to refresh webhooks.  So while that's
        // happening, hide the webhooks warning
        this._areWebhooksBeingRefreshed = true;
        this._updateStateFromBuildDefinition(definition);
        this.emitChanged();
    }

    private _handleChangeSettingsSourceOption = (settingsSourceType: number) => {
        this._triggersState.settingsSourceType = settingsSourceType;
        this.emitChanged();
    }

    private _handleCreateBuildDefinition = (definition: BuildDefinition) => {
        if (definition) {
            this._buildDefinitionCreated = definition.id > 0;
            this._updateStateFromBuildDefinition(definition, true);
            this.emitChanged();
        }
    }

    private _handleToggleEnabled = (newValue: boolean) => {
        this._triggersState.isEnabled = newValue;

        if (!newValue) {
            this._updateTriggerStateToOriginalState();
            this._triggersState.settingsSourceType = SettingsSourceType.Definition;
        }
        else if (this._triggersState.branchFilters.length === 0) {
            // add a default branch
            this._handleAddBranchFilter(this._sourcesSelectionStore.getBuildRepository().defaultBranch);
        }
        
        this.emitChanged();
    }

    private _handleToggleExpanded = (newValue: boolean) => {
        this._triggersState.isExpanded = newValue;
        this.emitChanged();
    }

    private _handleChangeBranchFilterOption = (payload: IDropdownRowIndexPayload) => {
        let dropdownString: string = (payload.dropdownIndex === 0 ? "+" : "-");
        let newBranchFilter: string = dropdownString + this._triggersState.branchFilters[payload.rowIndex].substring(1);
        this._triggersState.branchFilters[payload.rowIndex] = newBranchFilter;
        this.emitChanged();
    }

    private _handleChangeBranchFilter = (payload: InputIndexPayload) => {
        let branchFilterString: string = this._triggersState.branchFilters[payload.index][0] + payload.input;
        this._triggersState.branchFilters[payload.index] = branchFilterString;
        this.emitChanged();
    }

    private _handleRemoveBranchFilter = (rowIndex: number) => {
        this._triggersState.branchFilters.splice(rowIndex);
        this.emitChanged();
    }

    private _handleAddBranchFilter = (branch: string) => {
        if (branch) {
            this._triggersState.branchFilters.push("+" + branch);
            this.emitChanged();
        }
    }

    private _handleChangePathFilterOption = (payload: IDropdownRowIndexPayload) => {
        let dropdownString: string = (payload.dropdownIndex === 0 ? "+" : "-");
        let newPathFilter: string = dropdownString + this._triggersState.pathFilters[payload.rowIndex].substring(1);
        this._triggersState.pathFilters[payload.rowIndex] = newPathFilter;
        this.emitChanged();
    }

    private _handleChangePathFilter = (payload: InputIndexPayload) => {
        let pathFilterString: string = this._triggersState.pathFilters[payload.index][0] + payload.input;
        this._triggersState.pathFilters[payload.index] = pathFilterString;
        this.emitChanged();
    }

    private _handleRemovePathFilter = (rowIndex: number) => {
        this._triggersState.pathFilters.splice(rowIndex);
        this.emitChanged();
    }

    private _handleAddPathFilter = (path: string) => {
        if (path) {
            this._triggersState.pathFilters.push("+" + path);
        }
        else{
            this._triggersState.pathFilters.push("+");
        }

        this.emitChanged();
    }

    private _handleBuildForks = (isChecked: IBooleanPayload) => {
        this._triggersState.forks.enabled = isChecked.value;
        this._triggersState.enableSecretsForForks = isChecked.value;
        this.emitChanged();
    }

    private _handleAllowSecretsForForks = (isChecked: IBooleanPayload) => {
        this._triggersState.forks.allowSecrets = isChecked.value;
        this.emitChanged();
    }

    private _handleToggleRequiredComment = (isChecked: IBooleanPayload) => {
        this._triggersState.isCommentRequiredForPullRequest = isChecked.value;
        this.emitChanged();
    }

    private _handleWebhooksRestorationStatusChanged = (payload: VersionControlActions.IRepositoryWebhookRestorationStatusChangedPayload) => {
        if (!Utils_Array.contains(payload.triggerTypes, DefinitionTriggerType.PullRequest)) {
            return;
        }

        this._triggersState.restoreWebhookErrorMessage = payload.errorMessage;
        this._triggersState.isRestoringRemoteWebhooks = payload.isRestoring;
        this.emitChanged();
    }

    private _handleUpdateRemoteWebhooks = (payload: VersionControlActions.IRepositoryWebhooksPayload) => {
        const provider: SourceProvider = this._sourceProvidersStore.getProvider(this._selectedRepositoryType);
        if (!provider || !provider.isTriggerNotificationType(DefinitionTriggerType.PullRequest, TriggerNotificationTypes.webhook)) {
            return;
        }

        // This method is invoked when the webhooks are refreshed in the SCM store
        this._areWebhooksBeingRefreshed = false;
        this._updateIsRemoteWebhookSupported();
    }

    private _handleUpdateSelectedRepository = (payload: VersionControlActions.IRepositoryPayload) => {
        const provider: SourceProvider = this._sourceProvidersStore.getProvider(this._selectedRepositoryType);
        if (!provider || !provider.isTriggerNotificationType(DefinitionTriggerType.PullRequest, TriggerNotificationTypes.webhook)) {
            return;
        }

        this._updateIsRemoteWebhookSupported();
    }
}
