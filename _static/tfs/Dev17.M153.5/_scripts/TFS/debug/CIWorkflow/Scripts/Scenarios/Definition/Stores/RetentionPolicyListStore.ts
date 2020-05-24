import { ArtifactResourceTypes, BuildArtifactConstants } from "Build.Common/Scripts/Generated/TFS.Build2.Common";

import { BuildDefinitionActions } from "CIWorkflow/Scripts/Scenarios/Definition/Actions/BuildDefinitionActions";
import { IBuildDefinitionModel } from "CIWorkflow/Scripts/Scenarios/Definition/Actions/BuildDefinitionActionsCreator";
import { IActionRemoveRetentionPolicyPayload, IInsertPolicyPayload, RetentionPolicyListActions } from "CIWorkflow/Scripts/Scenarios/Definition/Actions/RetentionPolicyListActions";
import { IChangeSourcesSelectionPayload, SourcesSelectionActionsCreator } from "CIWorkflow/Scripts/Scenarios/Definition/Actions/SourcesSelectionActionsCreator";
import { BuildDefinitionStoreKeys, ItemKeys } from "CIWorkflow/Scripts/Scenarios/Definition/Common";
import { IRetentionPolicyStoreArgs, RetentionPolicyStore } from "CIWorkflow/Scripts/Scenarios/Definition/Retention/PolicyStore";
import { SourceProvider } from "CIWorkflow/Scripts/Scenarios/Definition/SourceProvider";
import { SourceProvidersStore } from "CIWorkflow/Scripts/Scenarios/Definition/Stores/SourceProvidersStore";

import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import * as ActionsBase from "DistributedTaskControls/Common/Actions/Base";
import { ListDataStoreBase } from "DistributedTaskControls/Common/Stores/ListDataStoreBase";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { DtcUtils } from "DistributedTaskControls/Common/Utilities";

import * as BuildContracts from "TFS/Build/Contracts";

import * as Utils_String from "VSS/Utils/String";

export interface IRetentionPolicyListState {
    canAddPolicy: boolean;
}

export class RetentionPolicyListStore extends ListDataStoreBase<RetentionPolicyStore> {
    private _currentState: IRetentionPolicyListState;
    private _originalState: IRetentionPolicyListState;
    private _defaultRetentionPolicy: BuildContracts.RetentionPolicy;
    private _maximumRetentionPolicy: BuildContracts.RetentionPolicy;
    private _buildDefinitionActions: BuildDefinitionActions;
    private _policyListActions: RetentionPolicyListActions;
    private _activePolicyStore: RetentionPolicyStore;
    private _maximumRetentionPolicyStore: RetentionPolicyStore;
    private _sourceSelectionActionCreator: SourcesSelectionActionsCreator;
    private _selectedRepositoryType: string;
    private _selectedSourceProvider: SourceProvider;
    private _sourceProvidersStore: SourceProvidersStore;
    
    constructor() {
        super(true);
        this._currentState = { } as IRetentionPolicyListState;
        this._originalState = { } as IRetentionPolicyListState;
    }

    /**
     * @returns Unique key to the store
     */
    public static getKey(): string {
        return BuildDefinitionStoreKeys.StoreKey_RetentionPolicyListStore;
    }

    public initialize(instanceId: string): void {
        super.initialize(instanceId);

        this._sourceProvidersStore = StoreManager.GetStore<SourceProvidersStore>(SourceProvidersStore);

        this._buildDefinitionActions = ActionsHubManager.GetActionsHub<BuildDefinitionActions>(BuildDefinitionActions);
        this._buildDefinitionActions.createBuildDefinition.addListener(this._handleCreateBuildDefinition);
        this._buildDefinitionActions.updateBuildDefinition.addListener(this._handleUpdateBuildDefinition);

        this._policyListActions = ActionsHubManager.GetActionsHub<RetentionPolicyListActions>(RetentionPolicyListActions, instanceId);
        this._policyListActions.addRetentionPolicy.addListener(this._handleAddRetentionPolicy);
        this._policyListActions.removeRetentionPolicy.addListener(this._handleRemoveRetentionPolicy);
        this._policyListActions.insertPolicy.addListener(this._handleInsertPolicy);

        this._sourceSelectionActionCreator = ActionCreatorManager.GetActionCreator<SourcesSelectionActionsCreator>(SourcesSelectionActionsCreator);
        this._sourceSelectionActionCreator.SelectSourceTab.addListener(this._handleRepositoryTypeChange);
        this._sourceSelectionActionCreator.TfSourceRepositoryChanged.addListener(this._handleTfSourcesChanged);
    }

    protected disposeInternal(): void {
        this._buildDefinitionActions.createBuildDefinition.removeListener(this._handleCreateBuildDefinition);
        this._buildDefinitionActions.updateBuildDefinition.removeListener(this._handleUpdateBuildDefinition);

        this._policyListActions.addRetentionPolicy.removeListener(this._handleAddRetentionPolicy);
        this._policyListActions.removeRetentionPolicy.removeListener(this._handleRemoveRetentionPolicy);
        this._policyListActions.insertPolicy.removeListener(this._handleInsertPolicy);

        this._sourceSelectionActionCreator.SelectSourceTab.removeListener(this._handleRepositoryTypeChange);
        this._sourceSelectionActionCreator.TfSourceRepositoryChanged.removeListener(this._handleTfSourcesChanged);
    }

    /**
     * @brief Updates the code fields of the Build definition contract
     * @param {BuildDefinition} buildDefinition
     * @returns BuildDefinition
     */
    public updateVisitor(buildDefinition: BuildContracts.BuildDefinition): BuildContracts.BuildDefinition {
        const dataStoreList = this.getDataStoreList();
        if (dataStoreList.length > 0) {

            buildDefinition.retentionRules = [];
            for (const store of dataStoreList) {
                let updatedPolicy = <BuildContracts.RetentionPolicy>{};
                store.updateVisitor(updatedPolicy);

                // Enforce maximum policy rule where applicable
                if (updatedPolicy && this._maximumRetentionPolicy) {
                    updatedPolicy.daysToKeep = updatedPolicy.daysToKeep > this._maximumRetentionPolicy.daysToKeep ?
                        this._maximumRetentionPolicy.daysToKeep : updatedPolicy.daysToKeep;

                    updatedPolicy.minimumToKeep = updatedPolicy.minimumToKeep > this._maximumRetentionPolicy.minimumToKeep ?
                        this._maximumRetentionPolicy.minimumToKeep : updatedPolicy.minimumToKeep;
                }

                buildDefinition.retentionRules.push(updatedPolicy);
            }
        }
        else {
            buildDefinition.retentionRules = null;
        }

        return buildDefinition;
    }

    public getState(): IRetentionPolicyListState {
        const dataStores = this.getDataStoreList();
        if (this._selectedSourceProvider && !this._selectedSourceProvider.isBranchFilterSupported() && dataStores.length > 0) {
            this._currentState.canAddPolicy = false;
        }
        else {
            this._currentState.canAddPolicy = true;
        }

        return this._currentState;
    }

    public getMaximumRetentionPolicyStore(): RetentionPolicyStore {
        if (!this._maximumRetentionPolicyStore) {
            this._maximumRetentionPolicyStore = this._createMaximumPolicyStore(this._maximumRetentionPolicy);
        }

        return this._maximumRetentionPolicyStore;
    }

    public getActivePolicyStore(): RetentionPolicyStore {
        return this._activePolicyStore || this.getMaximumRetentionPolicyStore();
    }

    public isActiveStoreAMaximumPolicyStore(): boolean {
        return this.getActivePolicyStore() === this.getMaximumRetentionPolicyStore();
    }

    public getSelectedRepositoryType(): string {
        return this._selectedRepositoryType;
    }

    private _handleAddRetentionPolicy = (payload: ActionsBase.IEmptyActionPayload) => {
        /* This is hard coded policy that gets added when clicking on Add button. Same behavior in old definition editor. */
        let newPolicy: BuildContracts.RetentionPolicy = {
            branches: ["+refs/heads/*"],
            daysToKeep: this._defaultRetentionPolicy.daysToKeep,
            minimumToKeep: this._defaultRetentionPolicy.minimumToKeep,
            deleteBuildRecord: true,
            deleteTestResults: true,
            artifacts: [BuildArtifactConstants.SourceLabel],
            artifactTypesToDelete: [ArtifactResourceTypes.SymbolStore, ArtifactResourceTypes.FilePath]
        };
        
        const newPolicyStore = this._createPolicyStore(newPolicy);
        this.insertDataStore(newPolicyStore, 0);
        this._activePolicyStore = newPolicyStore;
        this.emitChanged();
    }

    private _handleRemoveRetentionPolicy = (payload: IActionRemoveRetentionPolicyPayload) => {
        const { dataStore, index } = this.getDataStoreAndIndex(payload.policyId);
        this.removeFromDataStoreList(StoreManager.GetStore(RetentionPolicyStore, payload.policyId));

        this._activePolicyStore = this.getNextSelectableStoreAfterDelete(index);

        // Calling object cleanup after emitChanged() so that cleanup doesn't impact view change perf
        if (dataStore && payload.isPermanentRemoval) {
            StoreManager.DeleteStore<RetentionPolicyStore>(RetentionPolicyStore, dataStore.getInstanceId());
            this.emitChanged();
        }
    }

    private _handleInsertPolicy = (payload: IInsertPolicyPayload) => {
        if (payload && payload.policyToInsert) {
            this.insertStoreAtTarget(payload.policyToInsert, payload.targetPolicyInstanceId, payload.shouldInsertBefore);
            this._activePolicyStore = payload.policyToInsert as RetentionPolicyStore;
            this.emitChanged();
        }
    }

    private _handleCreateBuildDefinition = (definition: BuildContracts.BuildDefinition) => {
        // Update repo type.
        this._updateRepositoryType(definition && definition.repository ? definition.repository.type : Utils_String.empty);

        this._updateStates(definition, true);

        this.emitChanged();
    }

    private _handleUpdateBuildDefinition = (definition: BuildContracts.BuildDefinition) => {
        if (!this._currentState || !definition || !definition.repository) {
            return;
        }

        // Update repo type.
        this._updateRepositoryType(definition && definition.repository ? definition.repository.type : Utils_String.empty);
        
        // If length of items matches then we refresh the items rather creating new. Else we create new items.
        // This is mostly save case. Also can be applicable for undo.
        const dataStores = this.getDataStoreList();
        if (!!definition.retentionRules && dataStores.length === definition.retentionRules.length) {
            dataStores.forEach((store, index) => {
                store.updatePolicy(definition.retentionRules[index], this._selectedRepositoryType);
            });

            this.handleUpdate(dataStores);
        }
        else {
            this._updateStates(definition, false);
        }

        this.emitChanged();
    }

    private _updateStates(definition: BuildContracts.BuildDefinition, isCreateBuildDefinition: boolean) {
        this._updateDefaultAndMaxRetentionPolicy(definition);
        let policyStores: RetentionPolicyStore[];

        if (!definition.retentionRules || definition.retentionRules.length === 0) {
            if (isCreateBuildDefinition) {
                // If no retention policy at time of create then add default policy.
                policyStores = this._defaultRetentionPolicy ? [this._createPolicyStore(this._defaultRetentionPolicy)] : [];
            }
            else {
                policyStores = [];
            }
        }
        else {
            policyStores = definition.retentionRules.map((policy: BuildContracts.RetentionPolicy) => {
                return this._createPolicyStore(policy);
            });
        }

        // Remove all previous stores. 
        const currentStores = this.getDataStoreList();
        for (const store of currentStores) {
            StoreManager.DeleteStore(RetentionPolicyStore, store.getInstanceId());
        }

        this.handleUpdate(policyStores, true);
        this._activePolicyStore = null;
    }

    private _updateDefaultAndMaxRetentionPolicy(definition: BuildContracts.BuildDefinition) {
        let definitionModel = definition as IBuildDefinitionModel;
        if (definitionModel && definitionModel.retentionSettings) {
            this._defaultRetentionPolicy = definitionModel.retentionSettings.defaultRetentionPolicy;
            this._maximumRetentionPolicy = definitionModel.retentionSettings.maximumRetentionPolicy;
        }
    }

    private _handleRepositoryTypeChange = (payload: IChangeSourcesSelectionPayload) => {
        this._selectedSourceProvider = this._sourceProvidersStore.getProvider(payload.selectedStoreKey);
        
        this._updateRepositoryType(payload.selectedStoreKey);
        this.emitChanged();
    }

    private _handleTfSourcesChanged = (selectedRepositoryType: string) => {
        this._updateRepositoryType(selectedRepositoryType);
        this.emitChanged();
    }

    private _updateRepositoryType(selectedRepositoryType: string) {
        this._selectedRepositoryType = selectedRepositoryType;
    }

    private _createPolicyStore(policy: BuildContracts.RetentionPolicy): RetentionPolicyStore {
        return StoreManager.CreateStore<RetentionPolicyStore, IRetentionPolicyStoreArgs>(
            RetentionPolicyStore, 
            ItemKeys.RetentionPolicyItemPrefix + DtcUtils.getUniqueInstanceId(), 
            {
                policy: policy, 
                maximumPolicy: this._maximumRetentionPolicy, 
                selectedRepositoryType: this._selectedRepositoryType
            });
    }

    private _createMaximumPolicyStore(policy: BuildContracts.RetentionPolicy): RetentionPolicyStore {
        return StoreManager.CreateStore<RetentionPolicyStore, IRetentionPolicyStoreArgs>(
            RetentionPolicyStore, 
            ItemKeys.MaxRetentionPolicyItemPrefix + DtcUtils.getUniqueInstanceId(), 
            {
                policy: policy, 
                maximumPolicy: policy, 
                selectedRepositoryType: null
            });
    }
 }
