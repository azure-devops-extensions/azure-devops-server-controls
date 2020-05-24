/// <reference types="react" />

import * as React from "react";

import { ArtifactResourceTypes, BuildArtifactConstants } from "Build.Common/Scripts/Generated/TFS.Build2.Common";

import { BuildDefinitionStoreKeys } from "CIWorkflow/Scripts/Scenarios/Definition/Common";
import { SourceProvider } from "CIWorkflow/Scripts/Scenarios/Definition/SourceProvider";
import { RetentionPolicyActionsCreator, IInputActionPayload, IInputType, IBranchFilterPayload } from "CIWorkflow/Scripts/Scenarios/Definition/Retention/PolicyActionsCreator";
import { SourcesSelectionActionsCreator, IChangeSourcesSelectionPayload } from "CIWorkflow/Scripts/Scenarios/Definition/Actions/SourcesSelectionActionsCreator";
import { SourceProvidersStore } from "CIWorkflow/Scripts/Scenarios/Definition/Stores/SourceProvidersStore";

import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import { ItemOverviewState } from "DistributedTaskControls/Common/Item";
import { Boolean } from "DistributedTaskControls/Common/Primitives";
import * as StoreCommonBase from "DistributedTaskControls/Common/Stores/Base";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";

import * as BuildContracts from "TFS/Build/Contracts";

import * as Utils_Array from "VSS/Utils/Array";
import * as Utils_Number from "VSS/Utils/Number";
import * as Utils_String from "VSS/Utils/String";
import { DefinitionTriggerType } from "TFS/Build/Contracts";

export interface IRetentionPolicyItemOverviewState extends ItemOverviewState {
    subText: string;
    daysToKeep: string;
    minimumToKeep: string;
}

export interface IRetentionPolicyInputState {
    selectedRepositoryType: string;
    branchFilters: string[];
    daysToKeep: string;
    minimumToKeep: string;
    deleteBuildRecord: boolean;
    deleteSourceLabel: boolean;
    deleteFileShare: boolean;
    deleteSymbols: boolean;
    deleteTestResults: boolean;
    baseBranchFilterIndex: number;
}

export interface IRetentionPolicyStoreArgs {
    policy: BuildContracts.RetentionPolicy;
    maximumPolicy: BuildContracts.RetentionPolicy;
    selectedRepositoryType: string;
}

export class RetentionPolicyStore extends StoreCommonBase.DataStoreBase {

    private _currentState: IRetentionPolicyInputState;
    private _originalState: IRetentionPolicyInputState;
    private _actionCreator: RetentionPolicyActionsCreator;
    private _sourceSelectionActionCreator: SourcesSelectionActionsCreator;
    private _policy: BuildContracts.RetentionPolicy;
    private _maximumPolicy: BuildContracts.RetentionPolicy;
    private _selectedRepositoryType: string;
    private _sourceProvidersStore: SourceProvidersStore;

    constructor(args: IRetentionPolicyStoreArgs) {
        super();  
        this._policy = args.policy;
        this._selectedRepositoryType = args.selectedRepositoryType;
        this._maximumPolicy = args.maximumPolicy;

        if (this._policy) {
            this._currentState = this._getStateFromPolicy(this._policy, this._selectedRepositoryType);
            this._originalState = this._getStateFromPolicy(this._policy, this._selectedRepositoryType);
        }
        else {
            this._currentState = {} as IRetentionPolicyInputState;
            this._originalState = {} as IRetentionPolicyInputState;
        }
    }

    public initialize(instanceId: string): void {
        super.initialize(instanceId);
        this._sourceProvidersStore = StoreManager.GetStore<SourceProvidersStore>(SourceProvidersStore);
        this._actionCreator = ActionCreatorManager.GetActionCreator<RetentionPolicyActionsCreator>(RetentionPolicyActionsCreator, instanceId);
        this._actionCreator.updateInputAction.addListener(this._handleInputUpdate);
        this._actionCreator.addBranchFilterAction.addListener(this._handleAddBranchFilter);
        this._actionCreator.updateBranchFilterAction.addListener(this._handleUpdateBranchFilter);
        this._actionCreator.deleteBranchFilterAction.addListener(this._handleDeleteBranchFilter);

        this._sourceSelectionActionCreator = ActionCreatorManager.GetActionCreator<SourcesSelectionActionsCreator>(SourcesSelectionActionsCreator);
        this._sourceSelectionActionCreator.SelectSourceTab.addListener(this._handleRepositoryTypeChange);
        this._sourceSelectionActionCreator.TfSourceRepositoryChanged.addListener(this._handleTfSourcesChanged);
    }  

    public static getKey(): string {
        return BuildDefinitionStoreKeys.StoreKey_RetentionPolicyStore;
    }

    public isDirty(): boolean {
        let areBranchFiltersEqual = Utils_Array.arrayEquals(this._currentState.branchFilters, this._originalState.branchFilters,
            (currentFilter: string, originalFilter: string) => {
                return Utils_String.localeIgnoreCaseComparer(currentFilter, originalFilter) === 0;
            });

        return !(
            areBranchFiltersEqual &&
            this._currentState.daysToKeep === this._originalState.daysToKeep &&
            this._currentState.minimumToKeep === this._originalState.minimumToKeep &&
            this._currentState.deleteBuildRecord === this._originalState.deleteBuildRecord &&
            this._currentState.deleteSourceLabel === this._originalState.deleteSourceLabel &&
            this._currentState.deleteFileShare === this._originalState.deleteFileShare &&
            this._currentState.deleteSymbols === this._originalState.deleteSymbols &&
            this._currentState.deleteTestResults === this._originalState.deleteTestResults
        );
    }

    public isValid(): boolean {
        return (this._isBranchFiltersValid() &&
            this.isValidInput(this._currentState.daysToKeep, IInputType.DaysToKeep) &&
            this.isValidInput(this._currentState.minimumToKeep, IInputType.MinimumToKeep)
        );
    }

    public updateVisitor(visitor: BuildContracts.RetentionPolicy): void {
        const policy = this._getPolicyFromState(this._currentState);
        visitor.artifacts = policy.artifacts;
        visitor.artifactTypesToDelete = policy.artifactTypesToDelete;
        visitor.branches = policy.branches;
        visitor.daysToKeep = policy.daysToKeep;
        visitor.deleteBuildRecord = policy.deleteBuildRecord;
        visitor.deleteTestResults = policy.deleteTestResults;
        visitor.minimumToKeep = policy.minimumToKeep;
    }

    public getItemOverviewState(): IRetentionPolicyItemOverviewState {
        return {
            subText: this._getItemOverviewSubText(),
            daysToKeep: this.isValidInput(this._currentState.daysToKeep, IInputType.DaysToKeep) ? this._currentState.daysToKeep : Utils_String.empty,
            minimumToKeep: this.isValidInput(this._currentState.minimumToKeep, IInputType.MinimumToKeep) ? this._currentState.minimumToKeep : Utils_String.empty,
            isValid: this.isValid()
        } as IRetentionPolicyItemOverviewState;
    }

    public getInputState(): IRetentionPolicyInputState {
        return this._currentState;
    }

    public isValidInput(value: string, inputType: IInputType): boolean {
        let isValid: boolean = value && !Utils_String.equals(value.trim(), Utils_String.empty);

        switch (inputType) {
            case IInputType.DaysToKeep:
                isValid = isValid && Utils_Number.isPositiveNumber(value);
                break;
            case IInputType.MinimumToKeep:
                isValid = isValid && (Utils_Number.isPositiveNumber(value) || Utils_Number.defaultComparer(value, 0) === 0);
                break;
        }

        if (this._maximumPolicy) {
            isValid = isValid && Utils_Number.defaultComparer(value, this.getMaximumValue(inputType)) <= 0;
        }

        return isValid;
    }

    public getMaximumValue(inputType: IInputType): number {
        if (this._maximumPolicy) {
            switch (inputType) {
                case IInputType.DaysToKeep:
                    return this._maximumPolicy.daysToKeep;
                case IInputType.MinimumToKeep:
                    return this._maximumPolicy.minimumToKeep;
            }
        }
    }

    /*
    * Warning: This is the only place where we are breaking the flux pattern by allowing store to be updated outside of actions.
    * This is similar to what is done in Task store.
    */
    public updatePolicy(updatedPolicy: BuildContracts.RetentionPolicy, repositoryType: string) {
        if (updatedPolicy) {
            this._currentState = this._getStateFromPolicy(updatedPolicy, repositoryType);
            this._originalState = this._getStateFromPolicy(updatedPolicy, repositoryType);

            this.emitChanged();
        }
    }

    public showBranchFiltersError(): boolean {
        let showError: boolean = false;
        const provider: SourceProvider = this._sourceProvidersStore.getProvider(this._selectedRepositoryType);
        if (provider && provider.isBranchFilterSupported() && this._currentState.branchFilters.length === 0) {
            showError = true;
        }
        return showError;
    }

    protected disposeInternal(): void {
        this._actionCreator.updateInputAction.removeListener(this._handleInputUpdate);
        this._actionCreator.addBranchFilterAction.removeListener(this._handleAddBranchFilter);
        this._actionCreator.updateBranchFilterAction.removeListener(this._handleUpdateBranchFilter);
        this._actionCreator.deleteBranchFilterAction.removeListener(this._handleDeleteBranchFilter);

        this._sourceSelectionActionCreator.SelectSourceTab.removeListener(this._handleRepositoryTypeChange);
        this._sourceSelectionActionCreator.TfSourceRepositoryChanged.removeListener(this._handleTfSourcesChanged);

        this._currentState = null;
        this._originalState = null;
        this._actionCreator = null;
    } 

    private _getItemOverviewSubText(): string {
        let subText: string = Utils_String.empty;

        if (this._currentState.branchFilters && this._currentState.branchFilters.length > 0) {
            subText = this._currentState.branchFilters.join(",");
        }

        return subText;
    }

    private _isBranchFiltersValid(): boolean {
        let isBranchFiltersValid: boolean = true;
        if (!this._currentState.branchFilters || this._currentState.branchFilters.length === 0) {
            isBranchFiltersValid = false;
        }
        else if (this._currentState.branchFilters.length > 0) {
            this._currentState.branchFilters.forEach((branchFilter) => {
                if (branchFilter.length < 2) {
                    isBranchFiltersValid = false;
                }
            });
        }
        return isBranchFiltersValid;
    }

    private _getStateFromPolicy(policy: BuildContracts.RetentionPolicy, repositoryType: string): IRetentionPolicyInputState {
        let deleteSourceLabel = false;
        if (policy.artifacts && policy.artifacts.length > 0) {
            deleteSourceLabel = policy.artifacts.filter((value) => Utils_String.equals(value, BuildArtifactConstants.SourceLabel, true)).length > 0;
        }
            
        return {
            branchFilters: Utils_Array.clone( policy.branches),
            daysToKeep: policy.daysToKeep.toString(),
            minimumToKeep: policy.minimumToKeep.toString(),
            deleteBuildRecord: policy.deleteBuildRecord,
            deleteSourceLabel: deleteSourceLabel,
            deleteFileShare: policy.artifactTypesToDelete && policy.artifactTypesToDelete.indexOf(ArtifactResourceTypes.FilePath) > -1,
            deleteSymbols: policy.artifactTypesToDelete && policy.artifactTypesToDelete.indexOf(ArtifactResourceTypes.SymbolStore) > -1,
            deleteTestResults: policy.deleteTestResults,
            selectedRepositoryType: repositoryType
        } as IRetentionPolicyInputState;
    }

    private _getPolicyFromState(state: IRetentionPolicyInputState): BuildContracts.RetentionPolicy {
        let policy = {
            branches: Utils_Array.clone(state.branchFilters),
            daysToKeep: !isNaN(Number(state.daysToKeep)) ? Number(state.daysToKeep) : this._policy.daysToKeep,
            minimumToKeep: !isNaN(Number(state.minimumToKeep)) ? Number(state.minimumToKeep) : this._policy.minimumToKeep,
            deleteBuildRecord: state.deleteBuildRecord,
            deleteTestResults: state.deleteTestResults,
            artifacts: [],
            artifactTypesToDelete: []
        } as BuildContracts.RetentionPolicy;

        if (state.deleteSourceLabel) {
            policy.artifacts.push(BuildArtifactConstants.SourceLabel);
        }

        if (state.deleteFileShare) {
            policy.artifactTypesToDelete.push(ArtifactResourceTypes.FilePath);
        }

        if (state.deleteSymbols) {
            policy.artifactTypesToDelete.push(ArtifactResourceTypes.SymbolStore);
        }

        return policy;
    }

    private _handleInputUpdate = (updatedInput: IInputActionPayload) => {
        if (updatedInput && this._currentState) {
            switch (updatedInput.inputType) {
                case IInputType.DaysToKeep:
                    this._currentState.daysToKeep = updatedInput.value;
                    break;
                case IInputType.MinimumToKeep:
                    this._currentState.minimumToKeep = updatedInput.value;
                    break;
                case IInputType.BuildRecord:
                    this._currentState.deleteBuildRecord = Boolean.isTrue(updatedInput.value);
                    break;
                case IInputType.SourceLabel:
                    this._currentState.deleteSourceLabel = Boolean.isTrue(updatedInput.value);
                    break;
                case IInputType.FileShare:
                    this._currentState.deleteFileShare = Boolean.isTrue(updatedInput.value);
                    break;
                case IInputType.Symbols:
                    this._currentState.deleteSymbols = Boolean.isTrue(updatedInput.value);
                    break;
                case IInputType.TestResults:
                    this._currentState.deleteTestResults = Boolean.isTrue(updatedInput.value);
                    break;
            }
            this.emitChanged();
        }        
    }

    private _handleAddBranchFilter = (branchFilter: string) => {
        if (this._currentState && this._currentState.branchFilters) {
            this._currentState.branchFilters.push(branchFilter);

            this.emitChanged();
        }
    }

    private _handleUpdateBranchFilter = (branchFilterPayload: IBranchFilterPayload) => {
        if (this._currentState && this._currentState.branchFilters) {
            this._currentState.branchFilters[branchFilterPayload.index] = branchFilterPayload.filter;

            this.emitChanged();
        }
    }

    private _handleDeleteBranchFilter = (index: number) => {
        if (this._currentState && this._currentState.branchFilters && this._currentState.branchFilters.length > index) {

            if (!this._currentState.baseBranchFilterIndex) {
                this._currentState.baseBranchFilterIndex = this._currentState.branchFilters.length;
            }
            else {
                this._currentState.baseBranchFilterIndex += this._currentState.branchFilters.length;
            }

            Utils_Array.removeAtIndex(this._currentState.branchFilters, index);

            this.emitChanged();
        }
    }

    private _handleRepositoryTypeChange = (payload: IChangeSourcesSelectionPayload) => {
        this._currentState.selectedRepositoryType = this._selectedRepositoryType = payload.selectedStoreKey;

        this.emitChanged();
    }

    private _handleTfSourcesChanged = (selectedRepositoryType: string) => {
        this._currentState.selectedRepositoryType = this._selectedRepositoryType = selectedRepositoryType;
        this.emitChanged();
    }
}

