import { RepositoryTypes } from "Build.Common/Scripts/Generated/TFS.Build2.Common";

import { BuildDefinitionActions } from "CIWorkflow/Scripts/Scenarios/Definition/Actions/BuildDefinitionActions";
import { SourcesSelectionActionsCreator, IChangeSourcesSelectionPayload } from "CIWorkflow/Scripts/Scenarios/Definition/Actions/SourcesSelectionActionsCreator";
import * as Actions from "CIWorkflow/Scripts/Scenarios/Definition/Actions/TriggersActions";
import { BuildDefinitionStoreKeys, TabKeyConstants } from "CIWorkflow/Scripts/Scenarios/Definition/Common";
import { SourceProvider } from "CIWorkflow/Scripts/Scenarios/Definition/SourceProvider";
import { Store } from "CIWorkflow/Scripts/Scenarios/Definition/Stores/Base";
import { SourceProvidersStore } from "CIWorkflow/Scripts/Scenarios/Definition/Stores/SourceProvidersStore";
import { SourcesSelectionStore } from "CIWorkflow/Scripts/Scenarios/Definition/Stores/SourcesSelectionStore";

import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";


import { BuildDefinition, BuildTrigger, DefinitionTriggerType, GatedCheckInTrigger, SupportedTrigger } from "TFS/Build/Contracts";

import * as Utils_Array from "VSS/Utils/Array";
import * as Utils_String from "VSS/Utils/String";

export interface ITriggersState {
    showGatedCheckIn: boolean;
    isGatedCheckInEnabled: boolean;
    runContinuousIntegration: boolean;
    useWorkspaceMappings: boolean;
    pathFilters: string[];
    triggerType: DefinitionTriggerType;
    basePathFilterIndex?: number;
}

export class GatedCheckInStore extends Store {
    private _triggersState: ITriggersState;
    private _originalTriggersState: ITriggersState;
    private _buildDefinitionActions: BuildDefinitionActions;
    private _triggerActions: Actions.TriggersActions;
    private _sourceProvidersStore: SourceProvidersStore;
    private _sourceSelectionActionCreator: SourcesSelectionActionsCreator;
    private _sourcesSelectionStore: SourcesSelectionStore;
    private _defaultPathFilter: string = Utils_String.empty;

    constructor() {
        super();

        // Initialize the triggers states
        this._triggersState = this._initializeTriggersState();
        this._originalTriggersState = this._initializeTriggersState();
    }

    public static getKey(): string {
        return BuildDefinitionStoreKeys.StoreKey_GatedCheckInStore;
    }

    public initialize(): void {
        this._sourceProvidersStore = StoreManager.GetStore<SourceProvidersStore>(SourceProvidersStore);
        this._sourcesSelectionStore = StoreManager.GetStore<SourcesSelectionStore>(SourcesSelectionStore);

        this._buildDefinitionActions = ActionsHubManager.GetActionsHub<BuildDefinitionActions>(BuildDefinitionActions);
        this._buildDefinitionActions.updateBuildDefinition.addListener(this._handleUpdateBuildDefinition);
        this._buildDefinitionActions.createBuildDefinition.addListener(this._handleCreateBuildDefinition);

        this._sourceSelectionActionCreator = ActionCreatorManager.GetActionCreator<SourcesSelectionActionsCreator>(SourcesSelectionActionsCreator);
        this._sourceSelectionActionCreator.SelectSourceTab.addListener(this._handleChangeSelectedRepositoryType);
        this._sourceSelectionActionCreator.TfSourceRepositoryChanged.addListener(this._handleTfSourcesChanged);

        this._triggerActions = ActionsHubManager.GetActionsHub<Actions.TriggersActions>(Actions.TriggersActions);
        this._triggerActions.ToggleGatedCheckIn.addListener(this._handleToggleGatedCheckIn);
        this._triggerActions.UseWorkSpaceMapping.addListener(this._useWorkspaceMapping);
        this._triggerActions.RunContinuousIntegration.addListener(this._runContinuousIntegartion);
        this._triggerActions.ChangeGatedPathFilterOption.addListener(this._handleChangePathFilterOption);
        this._triggerActions.ChangeGatedPathFilter.addListener(this._handleChangePathFlter);
        this._triggerActions.RemoveGatedPathFilter.addListener(this._handleRemovePathFilter);
        this._triggerActions.AddGatedPathFilter.addListener(this._handleAddPathFilter);
    }

    protected disposeInternal(): void {
        this._buildDefinitionActions.updateBuildDefinition.removeListener(this._handleUpdateBuildDefinition);
        this._buildDefinitionActions.createBuildDefinition.removeListener(this._handleCreateBuildDefinition);

        this._sourceSelectionActionCreator.SelectSourceTab.removeListener(this._handleChangeSelectedRepositoryType);
        this._sourceSelectionActionCreator.TfSourceRepositoryChanged.removeListener(this._handleTfSourcesChanged);

        this._triggerActions.ToggleGatedCheckIn.removeListener(this._handleToggleGatedCheckIn);
        this._triggerActions.UseWorkSpaceMapping.removeListener(this._useWorkspaceMapping);
        this._triggerActions.RunContinuousIntegration.removeListener(this._runContinuousIntegartion);
        this._triggerActions.ChangeGatedPathFilterOption.removeListener(this._handleChangePathFilterOption);
        this._triggerActions.ChangeGatedPathFilter.removeListener(this._handleChangePathFlter);
        this._triggerActions.RemoveGatedPathFilter.removeListener(this._handleRemovePathFilter);
        this._triggerActions.AddGatedPathFilter.removeListener(this._handleAddPathFilter);
    }

    public isDirty(): boolean {
        return (this._triggersState.showGatedCheckIn &&
            (this._triggersState.isGatedCheckInEnabled !== this._originalTriggersState.isGatedCheckInEnabled || this._isGatedCheckInSettingsDirty()));
    }

    public isValid(): boolean {
        return !this._triggersState.showGatedCheckIn || this._arePathFiltersValid();
    }

    public updateVisitor(buildDefinition: BuildDefinition): BuildDefinition {
        // Check if the definition has gated check-in trigger
        let gatedCheckIn: GatedCheckInTrigger = <GatedCheckInTrigger>Utils_Array.first(
            buildDefinition.triggers,
            (trigger: BuildTrigger) => trigger.triggerType === DefinitionTriggerType.GatedCheckIn);

        if (this._triggersState.isGatedCheckInEnabled && this._triggersState.showGatedCheckIn) {
            if (!gatedCheckIn) {
                // Create new and push in the triggers array
                if (!buildDefinition.triggers) {
                    buildDefinition.triggers = [];
                }

                gatedCheckIn = this._getGatedCheckInSettings();
                buildDefinition.triggers.push(gatedCheckIn);
            }

            // Update the existing object
            this._updateGatedCheckInTrigger(gatedCheckIn);
        }
        else if (!!gatedCheckIn) {
            // Remove from the existing array
            buildDefinition.triggers.splice(buildDefinition.triggers.indexOf(gatedCheckIn), 1);
        }
        return buildDefinition;
    }

    public getState(): ITriggersState {
        return this._triggersState;
    }

    public showPathFiltersError(): boolean {
        let showError: boolean = false;
        if (!this._triggersState.useWorkspaceMappings && this._triggersState.pathFilters.length === 0) {
            showError = true;
        }
        return showError;
    }

    public updateShowGatedCheckIn(selectedRepositoryType: string): void {
        this._triggersState.showGatedCheckIn = this._isGatedCheckinSupported(selectedRepositoryType);
    }

    private _isGatedCheckInSettingsDirty(): boolean {
        let isDirty: boolean = false;
        if (this._triggersState.isGatedCheckInEnabled) {
            isDirty = (this._triggersState.runContinuousIntegration !== this._originalTriggersState.runContinuousIntegration ||
                this._triggersState.useWorkspaceMappings !== this._originalTriggersState.useWorkspaceMappings ||
                (!this._triggersState.useWorkspaceMappings && !Utils_Array.arrayEquals(this._triggersState.pathFilters, this._originalTriggersState.pathFilters, (s, t) => s === t)));
        }
        return isDirty;
    }

    private _getGatedCheckInSettings(): GatedCheckInTrigger {
        let gatedCheckIn: GatedCheckInTrigger = {
            triggerType: DefinitionTriggerType.GatedCheckIn,
            runContinuousIntegration: this._triggersState.runContinuousIntegration,
            useWorkspaceMappings: this._triggersState.useWorkspaceMappings,
            pathFilters: this._triggersState.pathFilters
        };

        return gatedCheckIn;
    }

    private _updateGatedCheckInTrigger(state: GatedCheckInTrigger): void {
        state.runContinuousIntegration = this._triggersState.runContinuousIntegration;
        state.pathFilters = Utils_Array.clone(this._triggersState.pathFilters);
        state.useWorkspaceMappings = this._triggersState.useWorkspaceMappings;
    }

    private _handleUpdateBuildDefinition = (definition: BuildDefinition) => {
        this._updateStateFromBuildDefinition(definition);
        this.emitChanged();
    }

    private _handleToggleGatedCheckIn = (gatedCheckInToggle: Actions.IToggleGatedCheckInPayload) => {
        this._triggersState.isGatedCheckInEnabled = gatedCheckInToggle.toggleValue;
        if (!gatedCheckInToggle.toggleValue) {
            this._updateTriggerStateToOriginalState();
        }
        this.emitChanged();
    }

    private _updateTriggerStateToOriginalState(): void {
        this._triggersState.pathFilters = Utils_Array.clone(this._originalTriggersState.pathFilters);
        this._triggersState.runContinuousIntegration = this._originalTriggersState.runContinuousIntegration;
        this._triggersState.useWorkspaceMappings = this._originalTriggersState.useWorkspaceMappings;
    }

    private _useWorkspaceMapping = (gatedCheckInPayload: Actions.IUpdateGatedCheckInPayload) => {
        this._triggersState.useWorkspaceMappings = gatedCheckInPayload.useWorkSpaceMapping;
        if (!gatedCheckInPayload.useWorkSpaceMapping && this._triggersState.pathFilters.length === 0) {
            this._triggersState.pathFilters = ["+" + this._defaultPathFilter];
        }
        this.emitChanged();
    }

    private _runContinuousIntegartion = (gatedCheckInPayload: Actions.IUpdateGatedCheckInPayload) => {
        this._triggersState.runContinuousIntegration = gatedCheckInPayload.runContinuousIntegration;
        this.emitChanged();
    }

    private _handleChangeSelectedRepositoryType = (payload: IChangeSourcesSelectionPayload): void => {
        this._defaultPathFilter = this._sourcesSelectionStore.getBuildRepository().rootFolder || Utils_String.empty;
        let selectedStoreKey: string = payload.selectedTabItemKey;
        if (payload.selectedTabItemKey === RepositoryTypes.TfsVersionControl && this._isGatedCheckinSupported(selectedStoreKey)) {
            this._triggersState.showGatedCheckIn = true;
        }
        else {
            this._triggersState.showGatedCheckIn = false;
        }
        this.emitChanged();
    }

    private _handleTfSourcesChanged = (selectedRepositoryType: string) => {
        this._defaultPathFilter = this._sourcesSelectionStore.getBuildRepository().rootFolder || Utils_String.empty;
        this.updateShowGatedCheckIn(selectedRepositoryType);
        this.emitChanged();
    }

    private _handleCreateBuildDefinition = (payload: BuildDefinition) => {
        if (payload && payload.repository) {
            this._defaultPathFilter = payload.repository.rootFolder || Utils_String.empty;
            this.updateShowGatedCheckIn(payload.repository.type);
        }
    }

    private _handleChangePathFilterOption = (dropdownIndexRowPair: Actions.IDropdownIndexRowPair) => {
        let dropdownString: string = (dropdownIndexRowPair.dropdownIndex === 0 ? "+" : "-");
        let newPathFilter: string = dropdownString + this._triggersState.pathFilters[dropdownIndexRowPair.rowIndex].substring(1);
        this._triggersState.pathFilters[dropdownIndexRowPair.rowIndex] = newPathFilter;
        this.emitChanged();
    }

    private _handleChangePathFlter = (inputIndexPair: Actions.InputIndexPair) => {
        let pathFilterString: string = this._triggersState.pathFilters[inputIndexPair.index][0] + inputIndexPair.input;
        this._triggersState.pathFilters[inputIndexPair.index] = pathFilterString;
        this.emitChanged();
    }

    private _handleRemovePathFilter = (rowIndex: Actions.IFilterRowIndex) => {
        if (!this._triggersState.basePathFilterIndex) {
            this._triggersState.basePathFilterIndex = this._triggersState.pathFilters.length;
        }
        else {
            this._triggersState.basePathFilterIndex += this._triggersState.pathFilters.length;
        }
        this._triggersState.pathFilters.splice(rowIndex.index, 1);
        this.emitChanged();
    }

    private _handleAddPathFilter = (defaultPath: string) => {
        let defaultFilter: string = defaultPath ? defaultPath : Utils_String.empty;
        this._triggersState.pathFilters.push("+" + defaultFilter);
        this.emitChanged();
    }

    private _updateStateFromBuildDefinition(buildDefinition: BuildDefinition) {
        if (buildDefinition && buildDefinition.repository) {
            if (this._isGatedCheckinSupported(buildDefinition.repository.type)) {
                this._triggersState.showGatedCheckIn = true;
                this._defaultPathFilter = buildDefinition.repository.rootFolder || Utils_String.empty;
            }
            else {
                this._triggersState.showGatedCheckIn = false;
            }
        }

        // If no triggers exist in the definition return after setting them to default values
        if (!buildDefinition.triggers) {
            this._triggersState = this._initializeTriggersState();
            this._originalTriggersState = this._initializeTriggersState();
            if (this._isGatedCheckinSupported(buildDefinition.repository.type)) {
                this._triggersState.showGatedCheckIn = true;
            }
            return;
        }

        // Check for Gated check-in Trigger
        let gatedCheckIn = <GatedCheckInTrigger>Utils_Array.first(buildDefinition.triggers, (trigger: BuildTrigger) => trigger.triggerType === DefinitionTriggerType.GatedCheckIn);
        if (gatedCheckIn) {
            this._updateStateWithMetadata(this._originalTriggersState, gatedCheckIn);
            this._updateStateWithMetadata(this._triggersState, gatedCheckIn);
        }
        else {
            this._triggersState = this._initializeTriggersState();
            this._originalTriggersState = this._initializeTriggersState();
            if (this._isGatedCheckinSupported(buildDefinition.repository.type)) {
                this._triggersState.showGatedCheckIn = true;
            }
        }
    }

    private _updateStateWithMetadata(state: ITriggersState, gatedCheckIn: GatedCheckInTrigger): void {
        if (!!gatedCheckIn) {
            state.isGatedCheckInEnabled = true;
            state.showGatedCheckIn = true;
            state.runContinuousIntegration = !!gatedCheckIn.runContinuousIntegration;
            state.useWorkspaceMappings = !!gatedCheckIn.useWorkspaceMappings;
            state.triggerType = DefinitionTriggerType.GatedCheckIn;
            state.pathFilters = Utils_Array.clone(gatedCheckIn.pathFilters);
        }
    }

    private _arePathFiltersValid(): boolean {
        let pathFiltersValid: boolean = false;
        if (this._triggersState.useWorkspaceMappings) {
            pathFiltersValid = true;
        }
        else if (this._triggersState.pathFilters.length > 0) {
            pathFiltersValid = true;
            this._triggersState.pathFilters.forEach((pathFilter) => {
                if (pathFilter.length < 2) {
                    pathFiltersValid = false;
                }
            });
        }

        return pathFiltersValid;
    }

    private _initializeTriggersState(): ITriggersState {
        return <ITriggersState>{
            showGatedCheckIn: false,
            isGatedCheckInEnabled: false,
            triggerType: DefinitionTriggerType.GatedCheckIn,
            runContinuousIntegration: false,
            useWorkspaceMappings: true,
            basePathFilterIndex: 100,
            pathFilters: []
        };
    }

    private _isGatedCheckinSupported(selectedRepositoryType: string): boolean {
        const provider: SourceProvider = this._sourceProvidersStore.getProvider(selectedRepositoryType);
        const trigger: SupportedTrigger = provider && provider.getTriggerByType(DefinitionTriggerType.GatedCheckIn);
        return !!trigger;
    }
}
