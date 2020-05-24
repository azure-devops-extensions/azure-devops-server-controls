import { SettingsSourceType } from "Build.Common/Scripts/Generated/TFS.Build2.Common";
import { ProcessType } from "Build.Common/Scripts/Generated/TFS.Build2.Common";
import { RepositoryTypes } from "Build.Common/Scripts/Generated/TFS.Build2.Common";

import { SourceProvider, SourceProviderCapabilities, TriggerCapabilities, TriggerNotificationTypes } from "CIWorkflow/Scripts/Scenarios/Definition/SourceProvider";
import { BuildDefinitionActions } from "CIWorkflow/Scripts/Scenarios/Definition/Actions/BuildDefinitionActions";
import { IChangeSourcesSelectionPayload, SourcesSelectionActionsCreator } from "CIWorkflow/Scripts/Scenarios/Definition/Actions/SourcesSelectionActionsCreator";
import * as Actions from "CIWorkflow/Scripts/Scenarios/Definition/Actions/TriggersActions";
import * as VersionControlActions from "CIWorkflow/Scripts/Scenarios/Definition/Actions/VersionControlActions";
import * as Common from "CIWorkflow/Scripts/Scenarios/Definition/Common";
import { Store } from "CIWorkflow/Scripts/Scenarios/Definition/Stores/Base";
import { SourcesSelectionStore } from "CIWorkflow/Scripts/Scenarios/Definition/Stores/SourcesSelectionStore";
import { SourceProvidersStore } from "CIWorkflow/Scripts/Scenarios/Definition/Stores/SourceProvidersStore";
import { VersionControlStore } from "CIWorkflow/Scripts/Scenarios/Definition/Stores/VersionControlStore";
import { YamlStore } from "CIWorkflow/Scripts/Scenarios/Definition/Stores/YamlStore";

import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { DtcUtils } from "DistributedTaskControls/Common/Utilities";

import { BuildDefinition, BuildRepository, BuildTrigger, DefinitionTriggerType, ContinuousIntegrationTrigger, SupportedTrigger, SupportLevel } from "TFS/Build/Contracts";

import * as Utils_Array from "VSS/Utils/Array";
import * as Utils_Number from "VSS/Utils/Number";
import * as Utils_String from "VSS/Utils/String";
import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";

import { FeatureAvailabilityFlags } from "Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants";

export interface ITriggersState {
    isContinuousIntegrationEnabled: boolean;
    isRepoAdvancedShown: boolean;
    isBranchFilterSupported: boolean;
    isBranchFilterRequired: boolean;
    isPathFilterSupported: boolean;
    isPathFilterRequired: boolean;
    isBatchChangesSupported: boolean;
    isPollingSupported: boolean;
    maxConcurrentBuildPerBranch: string;
    pollingInterval: string;
    continuousIntegrationTrigger: IContinuousIntegrationTrigger;
    isRemoteWebhookStatusSupported: boolean;
    isRemoteWebhookValid: boolean;
    isRestoringRemoteWebhooks: boolean;
    restoreWebhookErrorMessage: string;
}

export interface IContinuousIntegrationTrigger extends ContinuousIntegrationTrigger {
    isSettingsSourceOptionSupported: boolean;
    defaultSettingsSourceType: number;
}

export class TriggersStore extends Store {
    private _triggersState: ITriggersState;
    private _originalTriggersState: ITriggersState;
    private _buildDefinitionActions: BuildDefinitionActions;
    private _triggerActions: Actions.TriggersActions;
    private _sourceSelectionActionCreator: SourcesSelectionActionsCreator;
    private _sourcesSelectionStore: SourcesSelectionStore;
    private _sourceProvidersStore: SourceProvidersStore;
    private _selectedRepositoryType: string;
    private _versionControlActions: VersionControlActions.VersionControlActions;
    private _buildDefinitionCreated: boolean;
    private _areWebhooksBeingRefreshed: boolean;
    private _originalBuildRepository: BuildRepository;
    private _versionControlStore: VersionControlStore;
    private _yamlStore: YamlStore;

    private static _defaultConcurrentBuildPerBranch: string = "1";

    constructor() {
        super();

        // Initialize the triggers states
        this._triggersState = {
            continuousIntegrationTrigger: {} as ContinuousIntegrationTrigger
        } as ITriggersState;

        this._originalTriggersState = {
            continuousIntegrationTrigger: {} as ContinuousIntegrationTrigger
        } as ITriggersState;

        this._triggersState = this._initializeTriggersState();
        this._originalTriggersState = this._initializeTriggersState();

        this._selectedRepositoryType = Utils_String.empty;
        this._buildDefinitionCreated = false;
        this._areWebhooksBeingRefreshed = false;
    }

    public static getKey(): string {
        return Common.BuildDefinitionStoreKeys.StoreKey_TriggersStore;
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
        this._sourceSelectionActionCreator.TfSourceRepositoryChanged.addListener(this._handleTfSourcesChanged);

        this._triggerActions = ActionsHubManager.GetActionsHub<Actions.TriggersActions>(Actions.TriggersActions);
        this._triggerActions.ToggleContinuousIntegration.addListener(this._handleToggleContinuousIntegration);
        this._triggerActions.ShowAdvancedContinuousIntegrationOptions.addListener(this._handleShowAdvancedContinuousIntegrationOptions);
        this._triggerActions.ChangeSettingsSourceOption.addListener(this._handleChangeSettingsSourceOption);
        this._triggerActions.BatchCheckbox.addListener(this._handleBatchChanges);
        this._triggerActions.ChangePathFilterOption.addListener(this._handleChangePathFilterOption);
        this._triggerActions.ChangePathFilter.addListener(this._handleChangePathFlter);
        this._triggerActions.RemovePathFilter.addListener(this._handleRemovePathFilter);
        this._triggerActions.AddPathFilter.addListener(this._handleAddPathFilter);
        this._triggerActions.ChangeBranchFilterOption.addListener(this._handleChangeBranchFilterOption);
        this._triggerActions.ChangeBranchFilter.addListener(this._handleChangeBranchFilter);
        this._triggerActions.RemoveBranchFilter.addListener(this._handleRemoveBranchFilter);
        this._triggerActions.AddBranchFilter.addListener(this._handleAddBranchFilter);
        this._triggerActions.ChangeMaxConcurrentBuildPerBranch.addListener(this._handleChangeMaxConcurrentBuildPerBranch);
        this._triggerActions.ChangePollingInterval.addListener(this._handleChangePollingInterval);

        this._versionControlActions = ActionsHubManager.GetActionsHub<VersionControlActions.VersionControlActions>(VersionControlActions.VersionControlActions);
        this._versionControlActions.webhooksRestorationStatusChanged.addListener(this._handleWebhooksRestorationStatusChanged);
        this._versionControlActions.updateSelectedRepository.addListener(this._handleUpdateSelectedRepository);
        this._versionControlActions.updateRemoteWebhooks.addListener(this._handleUpdateRemoteWebhooks);
    }

    protected disposeInternal(): void {
        this._sourcesSelectionStore.removeChangedListener(this._handleSourcesSelectionStoreChanged);

        this._versionControlStore.removeChangedListener(this._handleSourcesSelectionStoreChanged);

        this._yamlStore.removeChangedListener(this._handleYamlStoreChanged);

        this._buildDefinitionActions.updateBuildDefinition.removeListener(this._handleUpdateBuildDefinition);
        this._buildDefinitionActions.createBuildDefinition.removeListener(this._handleCreateBuildDefinition);

        this._sourceSelectionActionCreator.SelectSourceTab.removeListener(this._handleChangeSelectedRepositoryType);
        this._sourceSelectionActionCreator.TfSourceRepositoryChanged.removeListener(this._handleTfSourcesChanged);

        this._triggerActions.ToggleContinuousIntegration.removeListener(this._handleToggleContinuousIntegration);
        this._triggerActions.ShowAdvancedContinuousIntegrationOptions.removeListener(this._handleShowAdvancedContinuousIntegrationOptions);
        this._triggerActions.ChangeSettingsSourceOption.removeListener(this._handleChangeSettingsSourceOption);
        this._triggerActions.BatchCheckbox.removeListener(this._handleBatchChanges);
        this._triggerActions.ChangePathFilterOption.removeListener(this._handleChangePathFilterOption);
        this._triggerActions.ChangePathFilter.removeListener(this._handleChangePathFlter);
        this._triggerActions.RemovePathFilter.removeListener(this._handleRemovePathFilter);
        this._triggerActions.AddPathFilter.removeListener(this._handleAddPathFilter);
        this._triggerActions.ChangeBranchFilterOption.removeListener(this._handleChangeBranchFilterOption);
        this._triggerActions.ChangeBranchFilter.removeListener(this._handleChangeBranchFilter);
        this._triggerActions.RemoveBranchFilter.removeListener(this._handleRemoveBranchFilter);
        this._triggerActions.AddBranchFilter.removeListener(this._handleAddBranchFilter);
        this._triggerActions.ChangeMaxConcurrentBuildPerBranch.removeListener(this._handleChangeMaxConcurrentBuildPerBranch);
        this._triggerActions.ChangePollingInterval.removeListener(this._handleChangePollingInterval);

        this._versionControlActions.webhooksRestorationStatusChanged.removeListener(this._handleWebhooksRestorationStatusChanged);
        this._versionControlActions.updateSelectedRepository.removeListener(this._handleUpdateSelectedRepository);
        this._versionControlActions.updateRemoteWebhooks.removeListener(this._handleUpdateRemoteWebhooks);
    }

    /**
     * Check dirty state of the triggers state
     *
     * @returns {boolean}
     *
     * @memberof TriggersStore
     */
    public isDirty(): boolean {
        const isCITriggerDirty = this._areBranchFiltersDirty() ||
        this._arePathFiltersDirty() ||
        this._isBatchChangesDirty() ||
        this._isMaxConcurrentBuildsPerBranchDirty() ||
        this._isSettingsSourceDirty();
        
        return ((this._triggersState.isContinuousIntegrationEnabled && 
            isCITriggerDirty) ||
            this._isCIEnabledDirty() ||
            this._isPollingIntervalDirty());
    }

    /**
     * Check validity of the triggers store
     *
     * @returns {boolean}
     *
     * @memberof TriggersStore
     */
    public isValid(): boolean {
        return !this._triggersState.isContinuousIntegrationEnabled ||
            this._triggersState.continuousIntegrationTrigger.settingsSourceType == SettingsSourceType.Process ||
            (this._areBranchFiltersValid() &&
                this._arePathFiltersValid() &&
                this.isPollingIntervalValid(this._triggersState.pollingInterval) &&
                this._isMaxConcurrentBuildsPerBranchValid());
    }

    /**
     * Implementation of updateVisitor
     * Use this to update the buildDefinition
     *
     * @param {BuildDefinition} buildDefinition
     * @returns {BuildDefinition}
     *
     * @memberof TriggersStore
     */
    public updateVisitor(buildDefinition: BuildDefinition): BuildDefinition {

        // Check if the definition has CI trigger
        let ciTrigger = <ContinuousIntegrationTrigger>Utils_Array.first(
            buildDefinition.triggers,
            (trigger: BuildTrigger) => trigger.triggerType === DefinitionTriggerType.ContinuousIntegration);

        // If the CITrigger is enabled
        if (this._triggersState.isContinuousIntegrationEnabled) {

            // If no CITrigger exists in build definition
            if (!ciTrigger) {

                // Create triggers array if not existent
                if (!buildDefinition.triggers) {
                    buildDefinition.triggers = [];
                }

                // Create new ciTrigger and set the trigger to initial state
                ciTrigger = this._initializeTriggersState().continuousIntegrationTrigger;
                buildDefinition.triggers.push(ciTrigger);
            }

            // Update the existing ciTrigger or the newly added abover
            this._updateContinuousIntegrationTrigger(ciTrigger, this._triggersState.continuousIntegrationTrigger);
        }

        // If the CiTrigger is disabled
        else {

            // If there is already existing ciTrigger in build definition , we should remove it
            if (!!ciTrigger) {

                // Remove from the existing array
                buildDefinition.triggers.splice(buildDefinition.triggers.indexOf(ciTrigger), 1);
            }
        }
        return buildDefinition;
    }

    /**
     * Get the triggers state
     *
     * @returns {ITriggersState}
     *
     * @memberof TriggersStore
     */
    public getState(): ITriggersState {
        return this._triggersState;
    }

    /**
     * Check validity of polling interval
     *
     * @param {number} interval
     * @returns {boolean}
     *
     * @memberof TriggersStore
     */
    public isPollingIntervalValid(interval: string): boolean {

        // If we have a polling interval, then this is a polling CI trigger
        const provider: SourceProvider = this._sourceProvidersStore.getProvider(this._selectedRepositoryType);
        if (provider && provider.containsPollingIntervalTrigger()) {
            if (!interval) {
                return false;
            }

            // Check if Polling Interval is valid string
            // Polling Interval should also be between 60 and 86400 seconds, inclusive both ends.
            return Utils_Number.isPositiveNumber(interval) ?
                DtcUtils.isNumberInRange(parseInt(interval), Common.MinPollingIntervalInSeconds, Common.MaxPollingIntervalInSeconds, true) : false;
        }

        return true;
    }

    /**
     * Check if Maximum concurrent build per branch value is valid
     *
     * @param {string} maxConcurrentBuildPerBranch
     * @returns {boolean}
     *
     * @memberof TriggersStore
     */
    public isMaxConcurrentBuildPerBranchValid(maxConcurrentBuildPerBranch: string): boolean {
        let isValid: boolean = false;
        if (!this._triggersState.continuousIntegrationTrigger.batchChanges) {
            isValid = true;
        }
        else if (Utils_Number.isPositiveNumber(maxConcurrentBuildPerBranch)
            && DtcUtils.isNumberInRange(parseInt(maxConcurrentBuildPerBranch), Common.MinConcurrentBuildsPerBranch, Common.MaxConcurrentBuildsPerBranch, true)) {
            isValid = true;
        }

        return isValid;
    }

    /**
     * Handles the sources selection store changing.
     *
     * @memberof TriggersStore
     */
    private _handleSourcesSelectionStoreChanged = () => {
        const trigger: SupportedTrigger = this._getCITrigger();
        if (!trigger) {
            return;
        }

        const webhookExists = this._sourcesSelectionStore.isWebhookPresent(DefinitionTriggerType.ContinuousIntegration);
        if (this._triggersState.isRemoteWebhookValid !== webhookExists) {
            this._triggersState.isRemoteWebhookValid = webhookExists;
            this.emitChanged();
        }
    }

    /**
     * Handles the YAML store changing.
     *
     * @memberof TriggersStore
     */
    private _handleYamlStoreChanged = () => {
        const newSettings = this._initializeTriggersState();
        if (this._triggersState.continuousIntegrationTrigger.defaultSettingsSourceType !== newSettings.continuousIntegrationTrigger.defaultSettingsSourceType ||
            this._triggersState.continuousIntegrationTrigger.isSettingsSourceOptionSupported !== newSettings.continuousIntegrationTrigger.isSettingsSourceOptionSupported) {

            // Check if this is the first update to the YAML store (SettingSourceOptionsSupported going from false to true, if so, push default YAML values)
            if (!this._buildDefinitionCreated && !this._triggersState.continuousIntegrationTrigger.isSettingsSourceOptionSupported && newSettings.continuousIntegrationTrigger.isSettingsSourceOptionSupported)
            {
                // These values are checked under these conditions, because they otherwise can cause some weird behavior upon refresh or a page for a saved YAML definition
                this._triggersState.continuousIntegrationTrigger.settingsSourceType = newSettings.continuousIntegrationTrigger.settingsSourceType;
                this._triggersState.isContinuousIntegrationEnabled = newSettings.isContinuousIntegrationEnabled;
            }

            this._triggersState.continuousIntegrationTrigger.defaultSettingsSourceType = newSettings.continuousIntegrationTrigger.defaultSettingsSourceType;
            this._triggersState.continuousIntegrationTrigger.isSettingsSourceOptionSupported = newSettings.continuousIntegrationTrigger.isSettingsSourceOptionSupported;
            this.emitChanged();
        }
    }

    /**
     * Handle the toggle continous integration on/off scenario
     *
     * @private
     *
     * @memberof TriggersStore
     */
    private _handleToggleContinuousIntegration = (continuousIntegrationToggle: Actions.IToggleBranchPayload) => {
        this._triggersState.isContinuousIntegrationEnabled = continuousIntegrationToggle.toggleValue;
        this._selectedRepositoryType = continuousIntegrationToggle.repositoryType;

        // If CITrigger is turned OFF
        if (!continuousIntegrationToggle.toggleValue) {

            // We just reset the current state to the original state
            this._updateContinuousIntegrationTrigger(this._triggersState.continuousIntegrationTrigger, this._originalTriggersState.continuousIntegrationTrigger);

            // if we're disabling CI, the current CI source type should be the definition here, regardless of whether we're using a YAML definition or not, 
            // so we want to override the original state, in regards to the source type.
            this._triggersState.continuousIntegrationTrigger.settingsSourceType = SettingsSourceType.Definition;
        }

        // If CITrigger is turned ON
        else {
            this._onCIEnabled(continuousIntegrationToggle);
        }

        this.emitChanged();
    }

    private _onCIEnabled(continuousIntegrationToggle: Actions.IToggleBranchPayload): void {

        // If there are no branch filters currently, then add default branch filter based on repoType
        const provider: SourceProvider = this._sourceProvidersStore.getProvider(this._selectedRepositoryType);
        if (provider && provider.getBranchFilterSupportLevel() !== SupportLevel.Unsupported) {
            if (this._triggersState.continuousIntegrationTrigger.branchFilters.length === 0) {
                let defaultFilter = continuousIntegrationToggle.defaultBranchFilter ? continuousIntegrationToggle.defaultBranchFilter : Utils_String.empty;
                this._triggersState.continuousIntegrationTrigger.branchFilters.push("+" + defaultFilter);
            }
        }

        // If there are no path filters currently, then add default path filter based on repoType
        else if (provider && provider.getPathFilterSupportLevel() !== SupportLevel.Unsupported) {
            if (this._triggersState.continuousIntegrationTrigger.pathFilters.length === 0) {
                let defaultFilter = continuousIntegrationToggle.defaultPathFilter ? continuousIntegrationToggle.defaultPathFilter : Utils_String.empty;
                this._triggersState.continuousIntegrationTrigger.pathFilters.push("+" + defaultFilter);
            }
        }

        // update the source capabilities
        this._updateSourcesCapabilities(continuousIntegrationToggle.repositoryType);
    }

    /**
     * Handle scenario when the selected repo is changed
     *
     * @private
     *
     * @memberof TriggersStore
     */
    private _handleChangeSelectedRepositoryType = (payload: IChangeSourcesSelectionPayload): void => {

        // If CI is enabled
        if (this._triggersState.isContinuousIntegrationEnabled) {

            // If the selected repo type and existing repo type doesn't match
            if (payload.selectedStoreKey &&
                !Utils_String.equals(payload.selectedStoreKey, this._selectedRepositoryType, true)) {
                this._handleSelectedRepositoryChanged(payload.selectedStoreKey);
            }
        }

        this.emitChanged();
    }

    /**
     * Handle the TfSources changed scenario
     *
     * @private
     *
     * @memberof TriggersStore
     */
    private _handleTfSourcesChanged = (selectedRepositoryType: string) => {
        if (selectedRepositoryType) {
            this._handleSelectedRepositoryChanged(selectedRepositoryType);
        }

        this.emitChanged();
    }

    /**
     * Handle the scenario when properties of the selected repo is changed
     *
     * @private
     * @param {string} selectedRepositoryType
     *
     * @memberof TriggersStore
     */
    private _handleSelectedRepositoryChanged(selectedRepositoryType: string): void {

        // update the selected repo type
        this._selectedRepositoryType = selectedRepositoryType;

        // update the source capabilities according to the selected repo type
        this._updateSourcesCapabilities(selectedRepositoryType);

        // set default path/branch filters if no filters exists already
        this._addDefaultFiltersIfRequired();
    }

    /**
     * Update the source capabilites
     * UI uses them to show/hide the components
     *
     * @private
     * @param {string} selectedRepositoryType
     *
     * @memberof TriggersStore
     */
    private _updateSourcesCapabilities(selectedRepositoryType: string): void {
        const trigger: SupportedTrigger = this._getCITrigger();

        this._triggersState.isBatchChangesSupported = trigger && trigger.supportedCapabilities[TriggerCapabilities.batchChanges] !== SupportLevel.Unsupported;
        this._triggersState.isBranchFilterSupported = trigger && trigger.supportedCapabilities[TriggerCapabilities.branchFilters] !== SupportLevel.Unsupported;
        this._triggersState.isBranchFilterRequired = trigger && trigger.supportedCapabilities[TriggerCapabilities.branchFilters] === SupportLevel.Required;
        this._triggersState.isPathFilterSupported = trigger && trigger.supportedCapabilities[TriggerCapabilities.pathFilters] !== SupportLevel.Unsupported;
        this._triggersState.isPathFilterRequired = trigger && trigger.supportedCapabilities[TriggerCapabilities.pathFilters] === SupportLevel.Required;
        this._triggersState.isPollingSupported = trigger && trigger.notificationType === TriggerNotificationTypes.polling;
        if (this._triggersState.isPollingSupported && !this._triggersState.pollingInterval) {
            this._triggersState.continuousIntegrationTrigger.pollingInterval = trigger.defaultPollingInterval;
            this._triggersState.pollingInterval = this._triggersState.continuousIntegrationTrigger.pollingInterval.toString();
        }

        this._updateIsRemoteWebhookSupported();
    }

    private _updateIsRemoteWebhookSupported() {
        const provider: SourceProvider = this._sourceProvidersStore.getProvider(this._selectedRepositoryType);
        const trigger: SupportedTrigger = this._getCITrigger();
        if (provider && trigger && trigger.notificationType === TriggerNotificationTypes.webhook) {

            let hasRepositoryChanged = true;
            if (this._originalBuildRepository) {
                const currentRepository = this._sourcesSelectionStore.getBuildRepository();
                if (currentRepository) {
                    hasRepositoryChanged = this._originalBuildRepository.url !== currentRepository.url;
                }
            }

            // Only should be supported if the build definition was already saved with a CI trigger and the repository hasn't changed
            const isSupported = provider.canQueryWebhooks() &&
                this._buildDefinitionCreated &&
                this._originalTriggersState.isContinuousIntegrationEnabled &&
                !this._areWebhooksBeingRefreshed &&
                !hasRepositoryChanged;

            if (isSupported !== this._triggersState.isRemoteWebhookStatusSupported) {
                this._triggersState.isRemoteWebhookStatusSupported = isSupported;
                this.emitChanged();
            }
        }
        else if (this._triggersState.isRemoteWebhookStatusSupported) {
            this._triggersState.isRemoteWebhookStatusSupported = false;
            this.emitChanged();
        }
    }

    /**
     * Handle the create build definition scenario
     *
     * @private
     *
     * @memberof TriggersStore
     */
    private _handleCreateBuildDefinition = (definition: BuildDefinition) => {
        if (definition) {
            this._buildDefinitionCreated = definition.id > 0;
            // update our state from the build definition
            this._updateStateFromBuildDefinition(definition, true);
            this.emitChanged();
        }
    }

    /**
     * Handle the update of build definition scenario
     *
     * @private
     *
     * @memberof TriggersStore
     */
    private _handleUpdateBuildDefinition = (definition: BuildDefinition) => {
        this._buildDefinitionCreated = definition.id > 0;

        // When saving the build, we're going to refresh webhooks.  So while that's
        // happening, hide the webhooks warning
        this._areWebhooksBeingRefreshed = true;
        this._updateStateFromBuildDefinition(definition);
        this.emitChanged();
    }

    /**
     * Handle show advanced CI options check
     *
     * @private
     *
     * @memberof TriggersStore
     */
    private _handleShowAdvancedContinuousIntegrationOptions = (isRepoAdvancedShown: Actions.IBooleanPayload) => {
        this._triggersState.isRepoAdvancedShown = isRepoAdvancedShown.value;
        this.emitChanged();
    }

    /**
     * Handle the change of the settings-source option [Definition|Process]
     *
     * @private
     *
     * @memberof TriggersStore
     */
    private _handleChangeSettingsSourceOption = (settingsSourceOption: Actions.ISettingsSourceOptionPayload) => {
        this._triggersState.continuousIntegrationTrigger.settingsSourceType = settingsSourceOption.settingsSourceType;
        this.emitChanged();
    }

    /**
     * Handle the batch changes
     *
     * @private
     *
     * @memberof TriggersStore
     */
    private _handleBatchChanges = (isChecked: Actions.IBooleanPayload) => {
        this._triggersState.continuousIntegrationTrigger.batchChanges = isChecked.value;
        this.emitChanged();
    }

    /**
     * Handle a change in the status of webhook restoration.
     *
     * @private
     *
     * @memberof TriggersStore
     */
    private _handleWebhooksRestorationStatusChanged = (payload: VersionControlActions.IRepositoryWebhookRestorationStatusChangedPayload) => {
        if (!Utils_Array.contains(payload.triggerTypes, DefinitionTriggerType.ContinuousIntegration)) {
            return;
        }

        this._triggersState.restoreWebhookErrorMessage = payload.errorMessage;
        this._triggersState.isRestoringRemoteWebhooks = payload.isRestoring;
        this.emitChanged();
    }

    private _handleUpdateRemoteWebhooks = (payload: VersionControlActions.IRepositoryWebhooksPayload) => {
        const provider: SourceProvider = this._sourceProvidersStore.getProvider(this._selectedRepositoryType);
        if (!provider || !provider.isTriggerNotificationType(DefinitionTriggerType.ContinuousIntegration, TriggerNotificationTypes.webhook)) {
            return;
        }

        // This method is invoked when the webhooks are refreshed in the SCM store
        this._areWebhooksBeingRefreshed = false;
        this._updateIsRemoteWebhookSupported();
    }

    private _handleUpdateSelectedRepository = (payload: VersionControlActions.IRepositoryPayload) => {
        const provider: SourceProvider = this._sourceProvidersStore.getProvider(this._selectedRepositoryType);
        if (!provider || !provider.isTriggerNotificationType(DefinitionTriggerType.ContinuousIntegration, TriggerNotificationTypes.webhook)) {
            return;
        }

        this._updateIsRemoteWebhookSupported();
    }

    private _addDefaultFiltersIfRequired(): void {
        if (this._triggersState.isContinuousIntegrationEnabled) {
            const provider: SourceProvider = this._sourceProvidersStore.getProvider(this._selectedRepositoryType);
            const trigger: SupportedTrigger = provider && provider.getTriggerByType(DefinitionTriggerType.ContinuousIntegration);

            // If there are no branch filters currently, then add default branch filter for the selected repo
            if (trigger && trigger.supportedCapabilities[TriggerCapabilities.branchFilters] !== SupportLevel.Unsupported) {
                if (this._triggersState.continuousIntegrationTrigger.branchFilters &&
                   this._triggersState.continuousIntegrationTrigger.branchFilters.length === 0) {
                    var repo = this._sourcesSelectionStore.getBuildRepository();
                    if (repo) {
                       this._handleAddBranchFilter(repo.defaultBranch);
                    }
                }
            }

            // If there are no path filters currently, then add default path filter for the selected repo
            else if (trigger && trigger.supportedCapabilities[TriggerCapabilities.pathFilters] !== SupportLevel.Unsupported &&
                this._triggersState.continuousIntegrationTrigger.pathFilters &&
                this._triggersState.continuousIntegrationTrigger.pathFilters.length === 0) {
                this._handleAddPathFilter(provider.getDefaultPathFilter(this._sourcesSelectionStore.getBuildRepository()));
            }
        }
    }

    /** PATH FILTERS SECTION START   */

    /**
     * Show error for path filter or not
     *
     * @returns {boolean}
     *
     * @memberof TriggersStore
     */
    public showPathFilterError(): boolean {
        let showError: boolean = false;
        // Path filters are only required if branch filters are not supported for this trigger
        if (this._triggersState.continuousIntegrationTrigger.pathFilters.length === 0 && !!this._triggersState.isPathFilterRequired) {
            showError = true;
        }
        return showError;
    }

    /**
     * Handle the change of path filter option [Include/Exclude]
     *
     * @private
     *
     * @memberof TriggersStore
     */
    private _handleChangePathFilterOption = (dropdownIndexRowPair: Actions.IDropdownIndexRowPair) => {
        let dropdownString: string = (dropdownIndexRowPair.dropdownIndex === 0 ? "+" : "-");
        let newPathFilter: string = dropdownString + this._triggersState.continuousIntegrationTrigger.pathFilters[dropdownIndexRowPair.rowIndex].substring(1);
        this._triggersState.continuousIntegrationTrigger.pathFilters[dropdownIndexRowPair.rowIndex] = newPathFilter;
        this.emitChanged();
    }

    /**
     * Handle the change of path filter
     *
     * @private
     *
     * @memberof TriggersStore
     */
    private _handleChangePathFlter = (inputIndexPair: Actions.InputIndexPair) => {
        let pathFilterString: string = this._triggersState.continuousIntegrationTrigger.pathFilters[inputIndexPair.index][0] + inputIndexPair.input;
        this._triggersState.continuousIntegrationTrigger.pathFilters[inputIndexPair.index] = pathFilterString;
        this.emitChanged();
    }

    /**
     * Handle the deletion of path filter
     *
     * @private
     *
     * @memberof TriggersStore
     */
    private _handleRemovePathFilter = (rowIndex: Actions.IFilterRowIndex) => {
        this._triggersState.continuousIntegrationTrigger.pathFilters.splice(rowIndex.index, 1);
        this.emitChanged();
    }

    /**
     * Handle the addition of path filter
     *
     * @private
     *
     * @memberof TriggersStore
     */
    private _handleAddPathFilter = (defaultPath: string) => {
        let defaultFilter = defaultPath ? defaultPath : Utils_String.empty;
        this._triggersState.continuousIntegrationTrigger.pathFilters.push("+" + defaultFilter);
        this.emitChanged();
    }

    /* PATH FILTERS SECTION END */

    /* BRANCH FILTERS SECTION START */

    /**
     * Show the error for branch filter or not
     *
     * @returns {boolean}
     *
     * @memberof TriggersStore
     */
    public showBranchFilterError(): boolean {
        let showError: boolean = false;
        if (!!this._triggersState.isBranchFilterRequired && this._triggersState.continuousIntegrationTrigger.branchFilters.length === 0) {
            showError = true;
        }
        return showError;
    }

    /**
     * Handle the change of branch filter option [Include / Exclude]
     *
     * @private
     *
     * @memberof TriggersStore
     */
    private _handleChangeBranchFilterOption = (dropdownIndexRowPair: Actions.IDropdownIndexRowPair) => {
        let dropdownString: string = (dropdownIndexRowPair.dropdownIndex === 0 ? "+" : "-");
        let newBranchFilter: string = dropdownString + this._triggersState.continuousIntegrationTrigger.branchFilters[dropdownIndexRowPair.rowIndex].substring(1);
        this._triggersState.continuousIntegrationTrigger.branchFilters[dropdownIndexRowPair.rowIndex] = newBranchFilter;
        this.emitChanged();
    }

    /**
     * Handle the change of branch filter
     *
     * @private
     *
     * @memberof TriggersStore
     */
    private _handleChangeBranchFilter = (branchIndexPair: Actions.InputIndexPair) => {
        let branchFilterString: string = this._triggersState.continuousIntegrationTrigger.branchFilters[branchIndexPair.index][0] + branchIndexPair.input;
        this._triggersState.continuousIntegrationTrigger.branchFilters[branchIndexPair.index] = branchFilterString;
        this.emitChanged();
    }

    /**
     * Handle remove branch filter
     *
     * @private
     *
     * @memberof TriggersStore
     */
    private _handleRemoveBranchFilter = (rowIndex: Actions.IFilterRowIndex) => {
        this._triggersState.continuousIntegrationTrigger.branchFilters.splice(rowIndex.index, 1);
        this.emitChanged();
    }

    /**
     * Handle the add branch filter
     *
     * @private
     *
     * @memberof TriggersStore
     */
    private _handleAddBranchFilter = (defaultBranch: string) => {
        let defaultFilter = defaultBranch ? defaultBranch : Utils_String.empty;
        this._triggersState.continuousIntegrationTrigger.branchFilters.push("+" + defaultFilter);
        this.emitChanged();
    }

    /* BRANCH FILTERS SECTION END */

    /**
     * Hanlde the changes in maximum concurrent build per branch
     *
     * @private
     *
     * @memberof TriggersStore
     */
    private _handleChangeMaxConcurrentBuildPerBranch = (maxConcurrentBuildPerBranch: Actions.IContinuousConcurrentBuildPayload) => {

        // Update the value in the property [string]
        this._triggersState.maxConcurrentBuildPerBranch = maxConcurrentBuildPerBranch.maxConcurrentBuildPerBranch;

        // Update the value in the ciTrigger object in state
        if (this.isMaxConcurrentBuildPerBranchValid(maxConcurrentBuildPerBranch.maxConcurrentBuildPerBranch)) {
            this._triggersState.continuousIntegrationTrigger.maxConcurrentBuildsPerBranch = parseInt(maxConcurrentBuildPerBranch.maxConcurrentBuildPerBranch);
        }
        this.emitChanged();
    }

    /**
     * Handle the changes in the polling interval
     *
     * @private
     *
     * @memberof TriggersStore
     */
    private _handleChangePollingInterval = (pollingIntervalPayload: Actions.IPollingIntervalPayload) => {
        // Update the value in the property [string]
        this._triggersState.pollingInterval = pollingIntervalPayload.pollingInterval;

        // Update the value in the ciTrigger object in state
        if (this.isPollingIntervalValid(pollingIntervalPayload.pollingInterval)) {
            this._triggersState.continuousIntegrationTrigger.pollingInterval = parseInt(pollingIntervalPayload.pollingInterval);
        }
        this.emitChanged();
    }

    /**
     * Update the state from the build definition
     *
     * @private
     * @param {BuildDefinition} buildDefinition
     * @returns
     *
     * @memberof TriggersStore
     */
    private _updateStateFromBuildDefinition(buildDefinition: BuildDefinition, isCreate: boolean = false): void {

        if (buildDefinition && buildDefinition.repository) {
            this._selectedRepositoryType = buildDefinition.repository.type || Utils_String.empty;

            if (!isCreate) {
                // Only update the original state if this is an existing definition
                this._originalBuildRepository = buildDefinition.repository;
            }
        }

        // If no triggers exist in the definition return after setting them to default values
        if (!buildDefinition.triggers) {
            this._triggersState = this._initializeTriggersState();
             
            // Update the source capabilities (ex. IsBranchFilterSupported, IsPathFilterSupported)
            this._updateSourcesCapabilities(this._selectedRepositoryType);

            if (!isCreate) {
                // Only update the original state if this is an existing definition
                this._originalTriggersState = this._initializeTriggersState();
            }

            // in this case, CI triggers have been disabled, set source type to definition, so UI won't get confused
            this._triggersState.continuousIntegrationTrigger.defaultSettingsSourceType = SettingsSourceType.Definition;
            this._triggersState.continuousIntegrationTrigger.settingsSourceType = this._yamlStore.getState().isYaml ?  SettingsSourceType.Process : SettingsSourceType.Definition;
            if (!isCreate) {
                // Only update the original state if this is an existing definition
                this._originalTriggersState.continuousIntegrationTrigger.defaultSettingsSourceType = SettingsSourceType.Definition;
                this._originalTriggersState.continuousIntegrationTrigger.settingsSourceType = this._yamlStore.getState().isYaml ?  SettingsSourceType.Process : SettingsSourceType.Definition;
            }
            return;
        }

        // Check for CI Trigger
        let ciTrigger = <ContinuousIntegrationTrigger>Utils_Array.first(buildDefinition.triggers, (trigger: BuildTrigger) =>
            trigger.triggerType === DefinitionTriggerType.ContinuousIntegration);

        // Update the current and original state based on the ciTrigger present in the build definition
        if (!isCreate) {
            // Only update the original state if this is an existing definition
            this._updateStateWithCIMetadata(this._originalTriggersState, ciTrigger);
        }
        this._updateStateWithCIMetadata(this._triggersState, ciTrigger);

         // Update the source capabilities (ex. IsBranchFilterSupported, IsPathFilterSupported)
         this._updateSourcesCapabilities(this._selectedRepositoryType);
    }

    /**
     * Update the state propeties based on the ciTrigger
     * It should be used to update the state based on values saved in definition
     *
     * @private
     * @param {ITriggersState} state
     * @param {ContinuousIntegrationTrigger} ciTrigger
     *
     * @memberof TriggersStore
     */
    private _updateStateWithCIMetadata(state: ITriggersState, ciTrigger: ContinuousIntegrationTrigger): void {

        if (!!ciTrigger) {

            // UI centric properties
            state.isContinuousIntegrationEnabled = true;
            state.maxConcurrentBuildPerBranch = ciTrigger.maxConcurrentBuildsPerBranch ?
                ciTrigger.maxConcurrentBuildsPerBranch.toString() : this._getMaxConcurrentBuildsPerBranchFromTriggersState();
            state.pollingInterval = ciTrigger.pollingInterval ?
                ciTrigger.pollingInterval.toString() : this._getPollingIntervalFromTriggerState();

            // continuousIntegrationTrigger model properties
            this._updateContinuousIntegrationTrigger(state.continuousIntegrationTrigger, ciTrigger);
        }
        else {
            state.isContinuousIntegrationEnabled = false;
        }
    }

    private _getPollingIntervalFromTriggerState(): string {
        if (this._triggersState.continuousIntegrationTrigger.pollingInterval) {
            return this._triggersState.continuousIntegrationTrigger.pollingInterval.toString();
        }
        const trigger: SupportedTrigger = this._getCITrigger();

        return (trigger && trigger.defaultPollingInterval) ? trigger.defaultPollingInterval.toString() : "";
    }

    private _getMaxConcurrentBuildsPerBranchFromTriggersState(): string {
        if (this._triggersState.continuousIntegrationTrigger.maxConcurrentBuildsPerBranch) {
            return this._triggersState.continuousIntegrationTrigger.maxConcurrentBuildsPerBranch.toString();
        }
        return TriggersStore._defaultConcurrentBuildPerBranch;
    }

    /**
     * Updates the properties of state by properties of newstate
     *
     * @private
     * @param {ContinuousIntegrationTrigger} state
     * @param {ContinuousIntegrationTrigger} newState
     *
     * @memberof TriggersStore
     */
    private _updateContinuousIntegrationTrigger(state: ContinuousIntegrationTrigger, newState: ContinuousIntegrationTrigger): void {
        const trigger: SupportedTrigger = this._getCITrigger();
        if (!state || !newState) {
            return;
        }
        if (trigger && trigger.supportedCapabilities[TriggerCapabilities.branchFilters] !== SupportLevel.Unsupported) {
            state.branchFilters = Utils_Array.clone(newState.branchFilters);

            // if branch filters is still empty, this is not valid, try to grab the default branch filters of the repository.
            if (state.branchFilters && state.branchFilters.length === 0) {
                const repository = this._sourcesSelectionStore.getBuildRepository();
                if (repository) {
                    const defaultFilter = repository.defaultBranch || Utils_String.empty;
                    state.branchFilters.push("+" + defaultFilter);
                }
            }
        }
        else {
            state.branchFilters = [];
        }

        if (trigger && trigger.supportedCapabilities[TriggerCapabilities.pathFilters] !== SupportLevel.Unsupported) {
            state.pathFilters = Utils_Array.clone(newState.pathFilters);
        }
        else {
            state.pathFilters = [];
        }
        state.batchChanges = newState.batchChanges;
        state.triggerType = newState.triggerType;
        state.maxConcurrentBuildsPerBranch = newState.maxConcurrentBuildsPerBranch;
        state.pollingInterval = newState.pollingInterval;
        state.settingsSourceType = newState.settingsSourceType;

        if (newState.pollingJobId) {
            state.pollingJobId = newState.pollingJobId;
        }
    }

    /**
     * Initialize Trigger State with Default Values
     *
     * @private
     * @returns {ITriggersState}
     *
     * @memberof TriggersStore
     */
    private _initializeTriggersState(): ITriggersState {

        let isYamlTriggerSupported: boolean;
        let initializingYamlDef: boolean = false;
        if (this._yamlStore) {
            isYamlTriggerSupported = this._yamlStore.getState().isYaml &&
                FeatureAvailabilityService.isFeatureEnabled(FeatureAvailabilityFlags.DistributedTaskYamlTriggers, false);
                initializingYamlDef = !this._buildDefinitionCreated && this._yamlStore.getState().isYaml;
        }
        return <ITriggersState>{
            isContinuousIntegrationEnabled: initializingYamlDef ? isYamlTriggerSupported: false,
            isRepoAdvancedShown: true,
            continuousIntegrationTrigger: <IContinuousIntegrationTrigger>{
                batchChanges: false,
                maxConcurrentBuildsPerBranch: 1,
                pollingJobId: null,
                pollingInterval: 0,
                pathFilters: [],
                branchFilters: [],
                defaultSettingsSourceType: isYamlTriggerSupported ? SettingsSourceType.Process : SettingsSourceType.Definition,
                isSettingsSourceOptionSupported: isYamlTriggerSupported,
                settingsSourceType: isYamlTriggerSupported ? SettingsSourceType.Process : SettingsSourceType.Definition,
                triggerType: DefinitionTriggerType.ContinuousIntegration
            },
            maxConcurrentBuildPerBranch: TriggersStore._defaultConcurrentBuildPerBranch,
            pollingInterval: Utils_String.empty,
            isRemoteWebhookValid: false,
            isRemoteWebhookStatusSupported: false,
            isRestoringRemoteWebhooks: false,
            restoreWebhookErrorMessage: null
        };
    }

    /** VALID HELPER FUNCTIONS START */

    /**
     * Check if path filers are valid
     *
     * @private
     * @returns {boolean}
     *
     * @memberof TriggersStore
     */
    private _arePathFiltersValid(): boolean {
        const trigger: SupportedTrigger = this._getCITrigger();
        const supportLevel: SupportLevel = trigger ? trigger.supportedCapabilities[TriggerCapabilities.pathFilters] : SupportLevel.Unsupported;
        if (!this._triggersState.isContinuousIntegrationEnabled || supportLevel === SupportLevel.Unsupported) {
            return true;
        }
        return this._noPathFilterIsEmpty() &&
            (supportLevel !== SupportLevel.Required || this._triggersState.continuousIntegrationTrigger.pathFilters.length !== 0);
    }

    /**
     * Check if branch filters are valid
     *
     * @private
     * @returns {boolean}
     *
     * @memberof TriggersStore
     */
    private _areBranchFiltersValid(): boolean {
        const trigger: SupportedTrigger = this._getCITrigger();
        const supportLevel: SupportLevel = trigger ? trigger.supportedCapabilities[TriggerCapabilities.branchFilters] : SupportLevel.Unsupported;
        if (!this._triggersState.isContinuousIntegrationEnabled || supportLevel === SupportLevel.Unsupported) {
            return true;
        }
        return this._noBranchFilterIsEmpty() &&
            (supportLevel !== SupportLevel.Required ||
                this._triggersState.continuousIntegrationTrigger.branchFilters.length !== 0);
    }

    /**
     * Check validity of Max concurrent build per branch
     * Valid -> Number of builds to be run concurrently should be more than or equal to 1
     *
     * @private
     * @returns {boolean}
     *
     * @memberof TriggersStore
     */
    private _isMaxConcurrentBuildsPerBranchValid(): boolean {
        const trigger: SupportedTrigger = this._getCITrigger();
        const supportLevel: SupportLevel = trigger ? trigger.supportedCapabilities[TriggerCapabilities.batchChanges] : SupportLevel.Unsupported;

        if (supportLevel !== SupportLevel.Unsupported &&
            (!this.isMaxConcurrentBuildPerBranchValid(this._triggersState.maxConcurrentBuildPerBranch))) {
            return false;
        }
        else {
            return true;
        }
    }

    /**
     * Check validity of branch filter
     * Valid -> Build definition branch filter should have length greater than 1
     *
     * @private
     * @returns {boolean}
     *
     * @memberof TriggersStore
     */
    private _noBranchFilterIsEmpty(): boolean {

        return this._triggersState.continuousIntegrationTrigger.branchFilters.every((branchFilter: string) => {
            return this._isFilterValid(branchFilter);
        });
    }

    /**
     * Check validity of path filer
     * Valid -> Build definition path filter should have length greater than 1
     *
     * @private
     * @returns {boolean}
     *
     * @memberof TriggersStore
     */
    private _noPathFilterIsEmpty(): boolean {

        return this._triggersState.continuousIntegrationTrigger.pathFilters.every((pathFilter: string) => {
            return this._isFilterValid(pathFilter);
        });
    }

    private _isFilterValid(filter: string): boolean {
        if (filter) {
            filter = filter.trim();
            return filter.length > 1;
        }
        return false;
    }

    /** VALID HELPER FUNCTIONS END */

    /** DIRTY HELPER FUNCTIONS START */

    /**
     * Check if the branch filters are dirty
     *
     * @private
     * @returns {boolean}
     *
     * @memberof TriggersStore
     */
    private _areBranchFiltersDirty(): boolean {
        return !Utils_Array.arrayEquals(
            this._triggersState.continuousIntegrationTrigger.branchFilters,
            this._originalTriggersState.continuousIntegrationTrigger.branchFilters,
            (s: string, t: string) => s === t);
    }

    /**
     * Check if the path filters are dirty
     *
     * @private
     * @returns {boolean}
     *
     * @memberof TriggersStore
     */
    private _arePathFiltersDirty(): boolean {
        return !Utils_Array.arrayEquals(
            this._triggersState.continuousIntegrationTrigger.pathFilters,
            this._originalTriggersState.continuousIntegrationTrigger.pathFilters,
            (s: string, t: string) => s === t);
    }

    /**
     * Check if batch changes is dirty
     *
     * @private
     * @returns {boolean}
     *
     * @memberof TriggersStore
     */
    private _isBatchChangesDirty(): boolean {
        return this._triggersState.continuousIntegrationTrigger.batchChanges !== this._originalTriggersState.continuousIntegrationTrigger.batchChanges;
    }

    /**
     * Check if max concurrent builds per branch is dirty
     *
     * @private
     * @returns {boolean}
     *
     * @memberof TriggersStore
     */
    private _isMaxConcurrentBuildsPerBranchDirty(): boolean {
        return this._triggersState.continuousIntegrationTrigger.maxConcurrentBuildsPerBranch !==
            this._originalTriggersState.continuousIntegrationTrigger.maxConcurrentBuildsPerBranch;
    }

    /**
     * Check if settings source type is dirty
     *
     * @private
     * @returns {boolean}
     *
     * @memberof TriggersStore
     */
    private _isSettingsSourceDirty(): boolean {
        return (this._triggersState.continuousIntegrationTrigger.settingsSourceType || SettingsSourceType.Definition) !==
            (this._originalTriggersState.continuousIntegrationTrigger.settingsSourceType || SettingsSourceType.Definition);
    }

    /**
     * Check if CIEnabled is dirty
     *
     * @private
     * @returns {boolean}
     *
     * @memberof TriggersStore
     */
    private _isCIEnabledDirty(): boolean {
        return this._triggersState.isContinuousIntegrationEnabled !== this._originalTriggersState.isContinuousIntegrationEnabled;
    }

    /**
     * Check if polling interval is dirty
     *
     * @private
     * @returns {boolean}
     *
     * @memberof TriggersStore
     */
    private _isPollingIntervalDirty(): boolean {
        const trigger: SupportedTrigger = this._getCITrigger();
        return !!(trigger && trigger.notificationType === TriggerNotificationTypes.polling && this._triggersState.isContinuousIntegrationEnabled &&
            (this._triggersState.pollingInterval !== this._originalTriggersState.pollingInterval));
    }

    private _getCITrigger(): SupportedTrigger {
        const provider: SourceProvider = this._sourceProvidersStore.getProvider(this._selectedRepositoryType);
        const trigger: SupportedTrigger = provider && provider.getTriggerByType(DefinitionTriggerType.ContinuousIntegration);
        return trigger;
    }

    /** DIRTY HELPER FUNCTIONS END */
}
