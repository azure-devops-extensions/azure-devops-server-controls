import { BuildDefinition, BuildCompletionTrigger } from "TFS/Build/Contracts";
import * as BuildContracts from "TFS/Build/Contracts";

import { BuildDefinitionActions } from "CIWorkflow/Scripts/Scenarios/Definition/Actions/BuildDefinitionActions";
import * as Actions from "CIWorkflow/Scripts/Scenarios/Definition/Actions/TriggersActions";
import { Store } from "CIWorkflow/Scripts/Scenarios/Definition/Stores/Base";
import { BuildDefinitionSource } from "CIWorkflow/Scripts/Scenarios/Definition/Sources/BuildDefinitionSource";
import { BuildDefinitionStoreKeys } from "CIWorkflow/Scripts/Scenarios/Definition/Common";
import { SourcesSelectionStore } from "CIWorkflow/Scripts/Scenarios/Definition/Stores/SourcesSelectionStore";
import { CoreDefinitionStore } from "CIWorkflow/Scripts/Scenarios/Definition/Stores/CoreDefinitionStore";
import { SourceProvider } from "CIWorkflow/Scripts/Scenarios/Definition/SourceProvider";
import { SourceProvidersStore } from "CIWorkflow/Scripts/Scenarios/Definition/Stores/SourceProvidersStore";
import { SourcesSelectionActionsCreator, IChangeSourcesSelectionPayload } from "CIWorkflow/Scripts/Scenarios/Definition/Actions/SourcesSelectionActionsCreator";
import { ServiceClientFactory } from "CIWorkflow/Scripts/Service/ServiceClientFactory";
import { BuildServiceClient } from "CIWorkflow/Scripts/Service/Build/BuildServiceClient";

import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";

import * as Utils_Array from "VSS/Utils/Array";
import * as Utils_String from "VSS/Utils/String";

export interface IBuildCompletionTriggerInfo {
    trigger: BuildCompletionTrigger;
    title: string;
    defPathAndName: string;
    isValid: boolean;
    areBranchFiltersValid: boolean;
    repository: BuildContracts.BuildRepository;
    previousRepo?: BuildContracts.BuildRepository;
    isBranchFilterSupported: boolean;
}

export interface IBuildCompletionTriggerState {
    isBuildCompletionSupported: boolean;
    isBuildCompletionEnabled: boolean;
    definitionNames: string[];
    buildCompletionTriggers: IBuildCompletionTriggerInfo[];
}

export class BuildCompletionTriggerStore extends Store {
    constructor() {
        super();

        this._triggersState = { isBuildCompletionSupported: false, isBuildCompletionEnabled: false, buildCompletionTriggers: [] } as IBuildCompletionTriggerState;
        this._originalTriggersState = { isBuildCompletionSupported: false, isBuildCompletionEnabled: false, buildCompletionTriggers: [] } as IBuildCompletionTriggerState;

        this._clearState(this._triggersState);
        this._clearState(this._originalTriggersState);
        this._allDefinitions = [];
        this._allDefinitionsAvailable = false;
        this._repositoryRequests = {};
    }

    public static getKey(): string {
        return BuildDefinitionStoreKeys.StoreKey_BuildCompletionTriggerStore;
    }

    public initialize(): void {
        this._sourceProvidersStore = StoreManager.GetStore<SourceProvidersStore>(SourceProvidersStore);

        this._sourcesSelectionStore = StoreManager.GetStore<SourcesSelectionStore>(SourcesSelectionStore);
        this._sourcesSelectionStore.addChangedListener(this._handleSourcesSelectionStoreChanged);

        this._coreDefinitionStore = StoreManager.GetStore<CoreDefinitionStore>(CoreDefinitionStore);

        this._triggerActions = ActionsHubManager.GetActionsHub<Actions.TriggersActions>(Actions.TriggersActions);
        this._triggerActions.AddBuildCompletionBranchFilter.addListener(this._handleAddBuildCompletionBranchFilter);
        this._triggerActions.RemoveBuildCompletionBranchFilter.addListener(this._handleRemoveBuildCompletionBranchFilter);
        this._triggerActions.UpdateBuildCompletionDefinition.addListener(this._handleUpdateBuildCompletionDefinition);
        this._triggerActions.ChangeBuildCompletionBranchFilterOption.addListener(this._handleChangeBuildCompletionBranchFilterOption);
        this._triggerActions.ChangeBuildCompletionBranchFilter.addListener(this._handleChangeBuildCompletionBranchFilter);
        this._triggerActions.AddBuildCompletionTrigger.addListener(this._handleAddBuildCompletionTrigger);
        this._triggerActions.RemoveBuildCompletionTrigger.addListener(this._handleRemoveBuildCompletionTrigger);

        this._buildDefinitionActions = ActionsHubManager.GetActionsHub<BuildDefinitionActions>(BuildDefinitionActions);
        this._buildDefinitionActions.updateBuildDefinition.addListener(this._handleUpdateBuildDefinition);

        this._sourceSelectionActionCreator = ActionCreatorManager.GetActionCreator<SourcesSelectionActionsCreator>(SourcesSelectionActionsCreator);
        this._sourceSelectionActionCreator.SelectSourceTab.addListener(this._handleChangeSelectedRepositoryType);

        BuildDefinitionSource.instance().getAllDefinitions(false).then((definitions: BuildContracts.BuildDefinitionReference[]) => {
            this.setAllDefinitions(definitions);
        });
    }

    protected disposeInternal(): void {
        this._sourcesSelectionStore.removeChangedListener(this._handleSourcesSelectionStoreChanged);

        this._triggerActions.AddBuildCompletionBranchFilter.removeListener(this._handleAddBuildCompletionBranchFilter);
        this._triggerActions.RemoveBuildCompletionBranchFilter.removeListener(this._handleRemoveBuildCompletionBranchFilter);
        this._triggerActions.UpdateBuildCompletionDefinition.removeListener(this._handleUpdateBuildCompletionDefinition);
        this._triggerActions.ChangeBuildCompletionBranchFilterOption.removeListener(this._handleChangeBuildCompletionBranchFilterOption);
        this._triggerActions.ChangeBuildCompletionBranchFilter.removeListener(this._handleChangeBuildCompletionBranchFilter);
        this._triggerActions.AddBuildCompletionTrigger.removeListener(this._handleAddBuildCompletionTrigger);
        this._triggerActions.RemoveBuildCompletionTrigger.removeListener(this._handleRemoveBuildCompletionTrigger);

        this._buildDefinitionActions.updateBuildDefinition.removeListener(this._handleUpdateBuildDefinition);

        this._sourceSelectionActionCreator.SelectSourceTab.removeListener(this._handleChangeSelectedRepositoryType);
    }

    public isDirty(): boolean {
        let triggersEqual: boolean = true;

        if (this._triggersState.isBuildCompletionEnabled !== this._originalTriggersState.isBuildCompletionEnabled) {
            triggersEqual = false;
        }
        else if (!this._triggersState.isBuildCompletionEnabled && !this._originalTriggersState.isBuildCompletionEnabled) {
            triggersEqual = true;
        }
        else {
            if (this._triggersState.buildCompletionTriggers.length === this._originalTriggersState.buildCompletionTriggers.length) {
                for (let i = 0; i < this._triggersState.buildCompletionTriggers.length; i++) {
                    if (this._triggersState.buildCompletionTriggers[i].trigger.definition && this._originalTriggersState.buildCompletionTriggers[i].trigger.definition) {
                        if (this._triggersState.buildCompletionTriggers[i].trigger.definition.id !== this._originalTriggersState.buildCompletionTriggers[i].trigger.definition.id) {
                            triggersEqual = false;
                            break;
                        }
                    }
                    else if (this._triggersState.buildCompletionTriggers[i].trigger.definition !== this._originalTriggersState.buildCompletionTriggers[i].trigger.definition) {
                        triggersEqual = false;
                        break;
                    }

                    if (this._triggersState.buildCompletionTriggers[i].trigger.branchFilters.length !== this._originalTriggersState.buildCompletionTriggers[i].trigger.branchFilters.length) {
                        triggersEqual = false;
                        break;
                    }
                    else {
                        for (let j = 0; j < this._triggersState.buildCompletionTriggers[i].trigger.branchFilters.length; j++) {
                            if (this._triggersState.buildCompletionTriggers[i].trigger.branchFilters[j] !== this._originalTriggersState.buildCompletionTriggers[i].trigger.branchFilters[j]) {
                                triggersEqual = false;
                                break;
                            }
                        }
                        if (!triggersEqual) {
                            break;
                        }
                    }
                }
            }
            else {
                triggersEqual = false;
            }
        }

        return !triggersEqual;
    }

    public isValid(): boolean {
        let valid : boolean = true;
        if (this._triggersState.isBuildCompletionEnabled) {
            for (let i = 0; i < this._triggersState.buildCompletionTriggers.length; i++) {
                if (!this._isTriggerObjectValid(this._triggersState.buildCompletionTriggers[i].trigger, this._triggersState.buildCompletionTriggers[i].isBranchFilterSupported)) {
                    valid = false;
                }
            }
        }
        return valid;
    }

    private _isTriggerObjectValid(trigger: BuildCompletionTrigger, isBranchFilterSupported: boolean): boolean {
        let valid : boolean = true;
        if (this._triggersState.isBuildCompletionEnabled) {
            if (trigger == null || trigger.definition == null || trigger.definition.id == null) {
                valid = false;
            }
            else if (!this._areBranchFiltersValid(trigger, isBranchFilterSupported)) {
                valid = false;
            }
            else if (trigger.definition.id === this._coreDefinitionStore.getState().id) {
                valid = false;
            }
            else if (this._allDefinitionsAvailable && this._getDefinitionRef(trigger.definition.id) == null) {
                valid = false;
            }
            else {
                let count = 0;
                for (let i = 0; i < this._triggersState.buildCompletionTriggers.length; i++) {
                    if (this._triggersState.buildCompletionTriggers[i].trigger.definition && 
                        trigger.definition.id === this._triggersState.buildCompletionTriggers[i].trigger.definition.id) {
                        count++;
                    }
                }
                if (count > 1) {
                    valid = false;
                }
            }
        }
        return valid;
    }

    private _areBranchFiltersValid(trigger: BuildCompletionTrigger, isBranchFilterSupported: boolean): boolean {
        let valid : boolean = true;
        if (this._triggersState.isBuildCompletionEnabled && isBranchFilterSupported) {
            if (trigger && (trigger.branchFilters == null || trigger.branchFilters.length === 0)) {
                valid = false;
            }
        }
        return valid;
    }

    public updateVisitor(buildDefinition: BuildDefinition): BuildDefinition {
        if (!buildDefinition.triggers || (buildDefinition.triggers.length === 0) || !Utils_Array.first(buildDefinition.triggers, (trigger: BuildContracts.BuildTrigger) => trigger.triggerType === BuildContracts.DefinitionTriggerType.BuildCompletion)) {
            if (!buildDefinition.triggers || buildDefinition.triggers.length === 0) {
                buildDefinition.triggers = [];
            }

            if (this._triggersState.isBuildCompletionEnabled) {
                this._triggersState.buildCompletionTriggers.forEach((item : IBuildCompletionTriggerInfo) => {
                    buildDefinition.triggers.push(item.trigger);
                });
            }
        }
        else {
            let index: number = Utils_Array.findIndex(buildDefinition.triggers, (trigger: BuildContracts.BuildTrigger) => trigger.triggerType === BuildContracts.DefinitionTriggerType.BuildCompletion);
            while (index !== null && index >= 0) {
                buildDefinition.triggers.splice(index, 1);
                index = Utils_Array.findIndex(buildDefinition.triggers, (trigger: BuildContracts.BuildTrigger) => trigger.triggerType === BuildContracts.DefinitionTriggerType.BuildCompletion);
            }
            if (this._triggersState.isBuildCompletionEnabled) {
                this._triggersState.buildCompletionTriggers.forEach((item : IBuildCompletionTriggerInfo) => {
                    buildDefinition.triggers.push(item.trigger);
                });
            }
        }
        return buildDefinition;
    }

    public getState(): IBuildCompletionTriggerState {
        return this._triggersState;
    }

    public combinePathAndName(definition: BuildContracts.DefinitionReference): string {
        let combined: string = null;
        if (definition) {
            if (definition.path == null || definition.name == null) {
                let updatedDefinition = this._getDefinitionRef(definition.id);
                if (updatedDefinition && updatedDefinition.path && updatedDefinition.name) {
                    combined = updatedDefinition.path.length > 1 ? updatedDefinition.path.substring(1) + "/" + updatedDefinition.name : updatedDefinition.name;
                }
            }
            else {
                combined = definition.path.length > 1 ? definition.path.substring(1) + "/" + definition.name : definition.name;
            }
        }
        return combined;
    }

    private _getDefinitionId(definitionName: string): number {
        if (this._allDefinitions) {
            for (let i = 0; i < this._allDefinitions.length; i++) {
                if (this.combinePathAndName(this._allDefinitions[i]) === definitionName) {
                    return this._allDefinitions[i].id;
                }
            }
        }
        return null;
    }

    private _getDefinitionName(definitionId: number): string {
        if (this._allDefinitions) {
            for (let i = 0; i < this._allDefinitions.length; i++) {
                if (this._allDefinitions[i].id === definitionId) {
                    return this._allDefinitions[i].name;
                }
            }
        }
        return null;
    }

    private _getDefinitionRef(definitionId: number): BuildContracts.DefinitionReference {
        if (this._allDefinitions) {
            for (let i = 0; i < this._allDefinitions.length; i++) {
                if (this._allDefinitions[i].id === definitionId) {
                    return this._allDefinitions[i];
                }
            }
        }
        return null;
    }

    private _getAllDefinitionNames(): string[] {
        let rv: string[] = [];
        if (this._allDefinitions) {
            this._allDefinitions.forEach((ref: BuildContracts.BuildDefinitionReference) => {
                if (ref.id !== this._coreDefinitionStore.getState().id) {
                    rv.push(this.combinePathAndName(ref));
                }
            });
        }
        return rv;
    }

    private _handleAddBuildCompletionBranchFilter = (option: Actions.IUpdateBuildCompletionBranchFilter) => {
        this._triggersState.buildCompletionTriggers[option.triggerId].trigger.branchFilters.push("+" + option.branchFilter);
        this._updateTriggerValidity(this._triggersState, option.triggerId);
        this.emitChanged();
    }

    private _handleRemoveBuildCompletionBranchFilter = (option: Actions.IUpdateBuildCompletionBranchFilter) => {
        this._triggersState.buildCompletionTriggers[option.triggerId].trigger.branchFilters.splice(option.filterIndex, 1);
        this._updateTriggerValidity(this._triggersState, option.triggerId);
        this.emitChanged();
    }

    private _handleUpdateBuildCompletionDefinition = (option: Actions.IUpdateBuildCompletionDefinition) => {
        const definitionId = this._getDefinitionId(option.definition);
        const definitionRef = this._getDefinitionRef(definitionId);
        const currentTriggerInfo = this._triggersState.buildCompletionTriggers[option.triggerId];
        if (definitionRef) {
            currentTriggerInfo.trigger.definition = definitionRef;
            currentTriggerInfo.title = definitionRef.name;
            currentTriggerInfo.defPathAndName = this.combinePathAndName(definitionRef);

            if ((definitionRef as BuildDefinition).repository) {
                const repo = (definitionRef as BuildDefinition).repository;
                currentTriggerInfo.previousRepo = currentTriggerInfo.repository;
                currentTriggerInfo.repository = repo;
                this._updateTriggeringRepoCapabilities(option.triggerId, (definitionRef as BuildDefinition).repository.type || Utils_String.empty);
                this._triggersState.buildCompletionTriggers[option.triggerId].trigger.branchFilters = [repo ? "+" + repo.defaultBranch : Utils_String.empty];
            }
            else {
                currentTriggerInfo.previousRepo = currentTriggerInfo.repository;
                currentTriggerInfo.repository = null;
                currentTriggerInfo.isBranchFilterSupported = false;
                this._fetchDefinitionRepository(definitionId, true);
            }
        }
        else {
            currentTriggerInfo.defPathAndName = option.definition;
            currentTriggerInfo.trigger.definition = {id: 0} as BuildContracts.DefinitionReference;
        }
        this._updateTriggerValidity(this._triggersState, option.triggerId);
        this.emitChanged();
    }

    private _fetchDefinitionRepository(definitionId: number, resetBranchFilters: boolean) {
        if (this._repositoryRequests[definitionId] == null) {
            this._repositoryRequests[definitionId] = BuildDefinitionSource.instance().get(definitionId).then((fullDefinition: BuildDefinition) => {
                let updated: boolean = false;
                if (fullDefinition && fullDefinition.repository) {
                    this._triggersState.buildCompletionTriggers.forEach((triggerInfo: IBuildCompletionTriggerInfo, index: number) => {
                        if (triggerInfo.trigger && triggerInfo.trigger.definition && triggerInfo.trigger.definition.id === definitionId) {
                            triggerInfo.repository = fullDefinition.repository;
                            this._updateTriggeringRepoCapabilities(index, fullDefinition.repository.type || Utils_String.empty);
                            if (resetBranchFilters && fullDefinition.repository) {
                                if (triggerInfo.previousRepo == null || triggerInfo.previousRepo.id != fullDefinition.repository.id) {
                                    triggerInfo.trigger.branchFilters = ["+" + fullDefinition.repository.defaultBranch];
                                }
                            }
                            updated = true;
                        }
                    });
                }
                this._repositoryRequests[definitionId] = null;
                if (updated) {
                    this.emitChanged();
                }
            });
        }
    }

    private _handleUpdateBuildDefinition = (definition: BuildDefinition) => {
        this._updateStateFromBuildDefinition(definition);
        this.emitChanged();
    }

    private _handleChangeBuildCompletionBranchFilterOption = (option: Actions.IUpdateBuildCompletionBranchFilter) => {
        const dropdownString: string = option.branchFilter;
        const newBranchFilter: string = dropdownString + this._triggersState.buildCompletionTriggers[option.triggerId].trigger.branchFilters[option.filterIndex].substring(1);
        this._triggersState.buildCompletionTriggers[option.triggerId].trigger.branchFilters[option.filterIndex] = newBranchFilter;
        this._updateTriggerValidity(this._triggersState, option.triggerId);
        this.emitChanged();
    }

    private _handleChangeBuildCompletionBranchFilter = (option: Actions.IUpdateBuildCompletionBranchFilter) => {
        const branchFilterString: string = this._triggersState.buildCompletionTriggers[option.triggerId].trigger.branchFilters[option.filterIndex][0] + option.branchFilter;
        this._triggersState.buildCompletionTriggers[option.triggerId].trigger.branchFilters[option.filterIndex] = branchFilterString;
        this._updateTriggerValidity(this._triggersState, option.triggerId);
        this.emitChanged();
    }

    private _handleAddBuildCompletionTrigger = (triggerInfo: Actions.IAddBuildCompletionTrigger) => {
        const repo = this._sourcesSelectionStore.getBuildRepository();
        let trigger: BuildCompletionTrigger = {
            branchFilters: [repo ? "+" + repo.defaultBranch : Utils_String.empty], 
            definition: {id: triggerInfo.definitionId}  as BuildContracts.DefinitionReference,
            requiresSuccessfulBuild: true,
            triggerType: BuildContracts.DefinitionTriggerType.BuildCompletion
        };

        if (!this._triggersState.isBuildCompletionEnabled) {
            this._triggersState.buildCompletionTriggers = [];
        }

        this._triggersState.isBuildCompletionEnabled = true;
        this._triggersState.buildCompletionTriggers.push({
            trigger: trigger, 
            title: this._getDefinitionName(triggerInfo.definitionId), 
            defPathAndName: this.combinePathAndName(this._getDefinitionRef(triggerInfo.definitionId)),
            isValid: this._isTriggerObjectValid(trigger, false), 
            areBranchFiltersValid: this._areBranchFiltersValid(trigger, false),
            repository: null,
            isBranchFilterSupported: false
        } as IBuildCompletionTriggerInfo);
        this.emitChanged();
    }

    private _handleRemoveBuildCompletionTrigger = (triggerInfo: Actions.IRemoveBuildCompletionTrigger) => {
        this._triggersState.buildCompletionTriggers.splice(triggerInfo.triggerId, 1);
        if (this._triggersState.buildCompletionTriggers.length === 0) {
            this._triggersState.isBuildCompletionEnabled = false;
        }
        this.emitChanged();
    }

    private _updateStateFromBuildDefinition(buildDefinition: BuildDefinition) {

        if (!buildDefinition.triggers) {
            this._clearState(this._triggersState);
            this._clearState(this._originalTriggersState);
        }

        let bcTriggers : BuildCompletionTrigger[] = [];
        if (buildDefinition.triggers) {
            buildDefinition.triggers.forEach((item: BuildContracts.BuildTrigger) => {
                if (item.triggerType === BuildContracts.DefinitionTriggerType.BuildCompletion) {
                    bcTriggers.push(item as BuildCompletionTrigger);
                }
            });
        }

        if (bcTriggers.length > 0) {
            this._setState(this._triggersState, bcTriggers);
            this._setState(this._originalTriggersState, bcTriggers);
        }
        else {
            this._clearState(this._triggersState);
            this._clearState(this._originalTriggersState);
        }

        this._updateSourcesCapabilities(buildDefinition.repository.type || Utils_String.empty);
    }

    private _clearState(state: IBuildCompletionTriggerState) {
            state.isBuildCompletionEnabled = false;
            state.buildCompletionTriggers = [{
                trigger: {branchFilters: [], definition: null, triggerType: BuildContracts.DefinitionTriggerType.BuildCompletion} as BuildCompletionTrigger,
                title: null,
                defPathAndName: null,
                isValid: false,
                areBranchFiltersValid: false
            } as IBuildCompletionTriggerInfo];
            state.definitionNames = this._getAllDefinitionNames();
    }

    private _setState(state: IBuildCompletionTriggerState, triggers: BuildCompletionTrigger[]) {
        state.isBuildCompletionSupported = true;
        state.isBuildCompletionEnabled = true;
        state.buildCompletionTriggers = [];
        state.definitionNames = this._getAllDefinitionNames();
        let repo = this._sourcesSelectionStore.getBuildRepository();
        if (triggers == null) {
            let trigger = {
                branchFilters: [repo ? "+" + repo.defaultBranch : Utils_String.empty], 
                definition: null, 
                triggerType: BuildContracts.DefinitionTriggerType.BuildCompletion
            } as BuildCompletionTrigger;

            state.buildCompletionTriggers = [{
                trigger: trigger,
                title: null,
                defPathAndName: null,
                isValid: false,
                areBranchFiltersValid: this._areBranchFiltersValid(trigger, false),
                repository: null,
                isBranchFilterSupported: false
            } as IBuildCompletionTriggerInfo];
        }
        else {
            triggers.forEach((item: BuildCompletionTrigger, index: number) => {
                const retrievedDef: BuildContracts.DefinitionReference = (item.definition && item.definition.id > 0 && this._allDefinitions.length > 0) ? this._getDefinitionRef(item.definition.id) : null;

                let trigger = {
                    definition: retrievedDef ? retrievedDef : item.definition,
                    branchFilters: item.branchFilters.slice(0),
                    isEnabled: true,
                    requiresSuccessfulBuild: true,
                    triggerType: BuildContracts.DefinitionTriggerType.BuildCompletion
                } as BuildCompletionTrigger;

                state.buildCompletionTriggers.push({
                    trigger: trigger,
                    title: trigger.definition && trigger.definition.name ? trigger.definition.name : null,
                    defPathAndName: trigger.definition && trigger.definition.name ? this.combinePathAndName(trigger.definition) : null,
                    isValid: this._isTriggerObjectValid(trigger, false),
                    areBranchFiltersValid: this._areBranchFiltersValid(trigger, false),
                    repository: null,
                    isBranchFilterSupported: false
                } as IBuildCompletionTriggerInfo);

                if (trigger.definition) {
                    if ((trigger.definition as BuildDefinition).repository) {
                        state.buildCompletionTriggers[index].repository = (trigger.definition as BuildDefinition).repository;
                        this._updateTriggeringRepoCapabilities(index, (trigger.definition as BuildDefinition).repository.type || Utils_String.empty);
                    }
                    else {
                        this._fetchDefinitionRepository(trigger.definition.id, false);
                    }
                }
            });
        }
    }

    private _updateAllDefinitionsState(state: IBuildCompletionTriggerState) {
        state.definitionNames = this._getAllDefinitionNames();
        state.buildCompletionTriggers.forEach((triggerInfo: IBuildCompletionTriggerInfo, index: number) => {
            if (triggerInfo.trigger.definition && triggerInfo.trigger.definition.name == null && triggerInfo.trigger.definition.id) {
                const definition: BuildContracts.DefinitionReference = this._getDefinitionRef(triggerInfo.trigger.definition.id);
                if (definition) {
                    triggerInfo.title = definition.name;
                    triggerInfo.defPathAndName = this.combinePathAndName(definition);
                    triggerInfo.trigger.definition = definition;
                    this._updateTriggerValidity(state, index);
                }
            }
        });
    }

    private _updateTriggerValidity(state: IBuildCompletionTriggerState, index: number) {
        let trigger = state.buildCompletionTriggers[index].trigger;
        state.buildCompletionTriggers[index].isValid = this._isTriggerObjectValid(trigger, state.buildCompletionTriggers[index].isBranchFilterSupported);
        state.buildCompletionTriggers[index].areBranchFiltersValid = this._areBranchFiltersValid(trigger, state.buildCompletionTriggers[index].isBranchFilterSupported);
    }

    private _handleChangeSelectedRepositoryType = (payload: IChangeSourcesSelectionPayload): void => {
        this._updateSourcesCapabilities(payload.selectedStoreKey);
        this.emitChanged();
    }

    private _updateSourcesCapabilities(repositoryType: string): void {
        const provider: SourceProvider = this._sourceProvidersStore.getProvider(repositoryType);
        this._triggersState.isBuildCompletionSupported = true;
    }

    private _updateTriggeringRepoCapabilities(index: number, repositoryType: string): void {
        const provider: SourceProvider = this._sourceProvidersStore.getProvider(repositoryType);
        this._triggersState.buildCompletionTriggers[index].isBranchFilterSupported = !!(provider && provider.isBranchFilterSupported());
    }

    private _handleSourcesSelectionStoreChanged = () => {
        let repo = this._sourcesSelectionStore.getBuildRepository();
        if (repo) {
            this._updateSourcesCapabilities(repo.type || Utils_String.empty);
            this.emitChanged();
        }
    }

    public setAllDefinitions(allDefinitions: BuildContracts.BuildDefinitionReference[]) {
        allDefinitions = allDefinitions || [];
        
        for (let i = 0; i < allDefinitions.length; i++) {
            if (allDefinitions[i].quality === BuildContracts.DefinitionQuality.Definition) {
                this._allDefinitions.push(allDefinitions[i]);
            }
        }
        this._allDefinitions.sort((inputOptionA: BuildContracts.BuildDefinitionReference, inputOptionB: BuildContracts.BuildDefinitionReference) => {
            return Utils_String.localeIgnoreCaseComparer(this.combinePathAndName(inputOptionA), this.combinePathAndName(inputOptionB));
        });
        this._updateAllDefinitionsState(this._triggersState);
        this._allDefinitionsAvailable = true;
        this.emitChanged();
    }

    private _triggersState: IBuildCompletionTriggerState;
    private _originalTriggersState: IBuildCompletionTriggerState;
    private _triggerActions: Actions.TriggersActions;
    private _buildDefinitionActions: BuildDefinitionActions;
    private _sourceSelectionActionCreator: SourcesSelectionActionsCreator;
    private _sourcesSelectionStore: SourcesSelectionStore;
    private _coreDefinitionStore: CoreDefinitionStore;
    private _allDefinitions: BuildContracts.BuildDefinitionReference[];
    private _allDefinitionsAvailable: boolean;
    private _sourceProvidersStore: SourceProvidersStore;
    private _repositoryRequests: object;
}
