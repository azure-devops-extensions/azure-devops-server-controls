/**
 * @brief Store for Deploy Pipeline Workflow Definition Editor
 */

import { DataStoreBase } from "DistributedTaskControls/Common/Stores/Base";
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { JQueryWrapper } from "DistributedTaskControls/Common/JQueryWrapper";
import { AggregatorDataStoreBase } from "DistributedTaskControls/Common/Stores/AggregatorStoreBase";
import { DeploymentGroupsStore } from "DistributedTaskControls/Stores/DeploymentGroupsStore";

import { ArtifactListStore } from "PipelineWorkflow/Scripts/Editor/Artifact/ArtifactListStore";
import { DeployPipelineStoreKeys } from "PipelineWorkflow/Scripts/Editor/Constants";
import { PipelineDefinition } from "PipelineWorkflow/Scripts/Common/Types";
import { IUpdateDefinitionActionPayload, DefinitionActionsHub, CreateReleaseStatus } from "PipelineWorkflow/Scripts/Editor/Definition/DefinitionActions";
import { DefinitionUtils } from "PipelineWorkflow/Scripts/Editor/Definition/DefinitionUtils";
import { CoreDefinitionStore } from "PipelineWorkflow/Scripts/Editor/Definition/CoreDefinitionStore";
import { EnvironmentListStore } from "PipelineWorkflow/Scripts/Editor/Environment/EnvironmentListStore";
import { DefinitionScheduleTriggerStore } from "PipelineWorkflow/Scripts/Editor/Definition/DefinitionScheduleTriggerStore";
import { DefinitionSettingsStore } from "PipelineWorkflow/Scripts/Editor/Definition/DefinitionSettingsStore";
import { GeneralOptionsStore } from "PipelineWorkflow/Scripts/Editor/ContainerTabs/OptionsTab/GeneralOptionsStore";
import { RetentionPolicyListStore } from "PipelineWorkflow/Scripts/Editor/ContainerTabs/RetentionTab/RetentionPolicyListStore";
import { EditorVariablesListStore } from "PipelineWorkflow/Scripts/Editor/ContainerTabs/VariablesTab/EditorVariablesListStore";

/**
 * @brief Main store for DeployPipeline definition
 */
export class DefinitionStore extends AggregatorDataStoreBase {

    constructor() {
        super();
        this._definitionActionsHub = ActionsHubManager.GetActionsHub<DefinitionActionsHub>(DefinitionActionsHub);
    }

    /**
     * @returns Unique key to the store
     */
    public static getKey(): string {
        return DeployPipelineStoreKeys.StoreKey_DeployPipelinDefinitionStoreKey;
    }

    /**
     * @brief Initializing the Store
     * - Creating and adding stores to store-list
     * - Initialize action listeners
     */
    public initialize(instanceId: string): void {
        super.initialize(instanceId);

        this.addToStoreList(this._coreDefinitionStore = StoreManager.GetStore<CoreDefinitionStore>(CoreDefinitionStore));
        this.addToStoreList(this._environmentStoreList = StoreManager.GetStore<EnvironmentListStore>(EnvironmentListStore));
        this.addToStoreList(this._variablesListStore = StoreManager.GetStore<EditorVariablesListStore>(EditorVariablesListStore));
        this.addToStoreList(this._artifactListStore = StoreManager.GetStore<ArtifactListStore>(ArtifactListStore));
        this.addToStoreList(this._definitionScheduleTriggerStore = StoreManager.GetStore<DefinitionScheduleTriggerStore>(DefinitionScheduleTriggerStore));
        this.addToStoreList(this._definitionSettingsStore = StoreManager.GetStore<DefinitionSettingsStore>(DefinitionSettingsStore));
        this.addToStoreList(this._generalOptionsStore = StoreManager.GetStore<GeneralOptionsStore>(GeneralOptionsStore));

        this._deploymentGroupsStore = StoreManager.GetStore<DeploymentGroupsStore>(DeploymentGroupsStore);
        this._retentionPolicyListStore = StoreManager.GetStore<RetentionPolicyListStore>(RetentionPolicyListStore);

        // Adding listeners to Actions
        this._definitionActionsHub.createDefinition.addListener(this._handleCreateDefinitionEditor);
        this._definitionActionsHub.updateDefinition.addListener(this._handleUpdateDefinitionEditor);
        this._definitionActionsHub.updateCreateReleaseStatus.addListener(this._handleUpdateCreateReleaseStatus);
    }

    /**
     * @brief Cleanup on dispose
     */
    public disposeInternal(): void {

        // Removing Action listeners
        this._definitionActionsHub.createDefinition.removeListener(this._handleCreateDefinitionEditor);
        this._definitionActionsHub.updateDefinition.removeListener(this._handleUpdateDefinitionEditor);
        this._definitionActionsHub.updateCreateReleaseStatus.removeListener(this._handleUpdateCreateReleaseStatus);

        super.disposeInternal();
    }

    // This method is used by ToolbarControllerView render method, ideally we should not call get definition multiple times from render method
    // but we have other issue in code which forces us to have this method. There is cleanup story #1340241 in backlog
    public getDefinition(): PipelineDefinition {
        return this._extractDefinition();
    }

    // Use this method to get the defintion object with environment rank fixed, currently this is used while saving definition and sending
    // definition context for toolbar contribution 
    public getUpdatedDefinition(): PipelineDefinition {
        let definition = this.getDefinition();
        // Fix environment rank as per layout
        const haveRanksChanged = this._environmentStoreList.fixEnvironmentRanks(definition.environments, true);
        if (haveRanksChanged) {
            DefinitionUtils.setV2EnvironmentRankLogic(definition);
        }

        return definition;
    }

    public getDefinitionId(): number {
        return this._coreDefinitionStore.getState().id;
    }

    public getDefinitionName(): string {
        return this._coreDefinitionStore.getState().name || "";
    }

    public getPath(): string {
        return this._coreDefinitionStore.getState().folderPath;
    }

    public isCreateReleaseInProgress(): boolean {
        return this._createReleaseStatus === CreateReleaseStatus.InProgress;
    }

    public getChangeTelemetryData(changes: IDictionaryStringTo<any>) {

        this._generalOptionsStore.getChangeTelemetryData(changes);

        const retentionPolicyListStore = StoreManager.GetStore<RetentionPolicyListStore>(RetentionPolicyListStore);
        retentionPolicyListStore.getChangeTelemetryData(changes);

        this._variablesListStore.getChangeTelemetryData(changes);
    }

    public updateVisitor(visitor: any): void {
    }

    private _handleCreateDefinitionEditor = (definition: PipelineDefinition) => {
        this._pipelineDefinition = definition;
    }

    /**
     * @brief Handle update action
     */
    private _handleUpdateDefinitionEditor = (actionPayload: IUpdateDefinitionActionPayload) => {
        this._pipelineDefinition = actionPayload.definition;
    }

    private _handleUpdateCreateReleaseStatus = (status: CreateReleaseStatus) => {
        if (this._createReleaseStatus !== status) {
            this._createReleaseStatus = status;
            this.emitChanged();
        }
    }

    private _extractDefinition(): PipelineDefinition {
        this._pipelineDefinition = JQueryWrapper.extendDeep({}, this._pipelineDefinition);
        this.getDataStoreList().forEach((store: DataStoreBase) => {
            store.updateVisitor(this._pipelineDefinition);
        });

        return this._pipelineDefinition;
    }

    private _pipelineDefinition: PipelineDefinition;
    private _createReleaseStatus: CreateReleaseStatus;

    private _coreDefinitionStore: CoreDefinitionStore;
    private _variablesListStore: EditorVariablesListStore;
    private _environmentStoreList: EnvironmentListStore;
    private _artifactListStore: ArtifactListStore;
    private _definitionScheduleTriggerStore: DefinitionScheduleTriggerStore;
    private _deploymentGroupsStore: DeploymentGroupsStore;
    private _definitionSettingsStore: DefinitionSettingsStore;
    private _generalOptionsStore: GeneralOptionsStore;
    private _retentionPolicyListStore: RetentionPolicyListStore;

    private _definitionActionsHub: DefinitionActionsHub;
}