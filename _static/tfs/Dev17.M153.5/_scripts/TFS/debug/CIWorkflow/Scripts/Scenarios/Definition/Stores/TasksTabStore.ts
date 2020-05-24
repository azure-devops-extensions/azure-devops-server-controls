import { AgentsConstants, BuildTasksVisibilityFilter } from "CIWorkflow/Scripts/Common/Constants";
import { BuildDefinitionStoreKeys } from "CIWorkflow/Scripts/Scenarios/Definition/Common";
import { isPhaseDependenciesFeatureEnabled } from "CIWorkflow/Scripts/Scenarios/Definition/DefinitionProcess";
import { CoreDefinitionStore } from "CIWorkflow/Scripts/Scenarios/Definition/Stores/CoreDefinitionStore";
import { SourcesSelectionStore } from "CIWorkflow/Scripts/Scenarios/Definition/Stores/SourcesSelectionStore";
import { YamlDefinitionStore } from "CIWorkflow/Scripts/Scenarios/Definition/Stores/YamlDefinitionStore";
import { YamlStore } from "CIWorkflow/Scripts/Scenarios/Definition/Stores/YamlStore";

import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { DeployPhaseListStore, IDeployPhaseListStoreArgs } from "DistributedTaskControls/Phase/Stores/DeployPhaseListStore";
import { IDeployPhase } from "DistributedTaskControls/Phase/Types";
import { IProcessManagementStoreArgs, ProcessManagementStore } from "DistributedTaskControls/ProcessManagement/ProcessManagementStore";
import { ProcessManagementCapabilities } from "DistributedTaskControls/ProcessManagement/Types";
import { ITaskDelegates } from "DistributedTaskControls/SharedControls/InputControls/Common";
import { ContainerTabStoreBase } from "DistributedTaskControls/SharedViews/ContainerTabs/ContainerTabStoreBase";
import { AgentsStore } from "DistributedTaskControls/Stores/AgentsStore";
import { ProcessParameterStore } from "DistributedTaskControls/Stores/ProcessParameterStore";

import { autobind } from "OfficeFabric/Utilities";

export class TasksTabStore extends ContainerTabStoreBase {
    private _phaseListStore: DeployPhaseListStore;
    private _sourcesSelectionStore: SourcesSelectionStore;
    private _agentsStore: AgentsStore;
    private _coreDefinitionStore: CoreDefinitionStore;
    private _processParameterStore: ProcessParameterStore;
    private _yamlDefinitionStore: YamlDefinitionStore;
    private _yamlStore: YamlStore;

    constructor() {
        super();
    }

    public static getKey(): string {
        return BuildDefinitionStoreKeys.StoreKey_TasksTabStore;
    }

    public initialize(instanceId?: string): void {
        super.initialize(instanceId);
        instanceId = this.getInstanceId();

        this._sourcesSelectionStore = StoreManager.GetStore<SourcesSelectionStore>(SourcesSelectionStore);
        this._yamlStore = StoreManager.GetStore<YamlStore>(YamlStore);
        this._agentsStore = StoreManager.GetStore<AgentsStore>(AgentsStore, AgentsConstants.instance);
        this._coreDefinitionStore = StoreManager.GetStore<CoreDefinitionStore>(CoreDefinitionStore);
        this._processParameterStore = StoreManager.GetStore<ProcessParameterStore>(ProcessParameterStore, instanceId);
        this._yamlDefinitionStore = StoreManager.GetStore<YamlDefinitionStore>(YamlDefinitionStore);

        // initialize the process management store
        StoreManager.CreateStore<ProcessManagementStore, IProcessManagementStoreArgs>(ProcessManagementStore, instanceId,
            {
                processManagementCapabilities: ProcessManagementCapabilities.All
            } as IProcessManagementStoreArgs
        );

        let phaseModels: IDeployPhase[] = [];

        let taskDelegates: ITaskDelegates = {
            filePathPickerDelegate: this._sourcesSelectionStore.showPathDialog.bind(this._sourcesSelectionStore),
            fileContentProviderDelegate: this._sourcesSelectionStore.fetchRepositoryFileContent.bind(this._sourcesSelectionStore)
        };

        const showPhaseDependencies = isPhaseDependenciesFeatureEnabled();
        this._phaseListStore = StoreManager.CreateStore<DeployPhaseListStore, IDeployPhaseListStoreArgs>(
            DeployPhaseListStore,
            instanceId,
            {
                phaseList: phaseModels,
                itemSelectionInstanceId: instanceId,
                taskDelegates: taskDelegates,
                addTaskVisibilityFilter: BuildTasksVisibilityFilter,
                processParametersNotSupported: false,
                allowInheritAgentQueues: true,
                isPipelineOrchestration: true,
                showPhaseDependencies: showPhaseDependencies,
                hideSkipArtifactDownload: true,
                minJobCancelTimeout: 0
            });
        this.addToStoreList(this._phaseListStore);

        this._phaseListStore.addChangedListener(this._storeChanged);
        this._agentsStore.addChangedListener(this._storeChanged);
        this._coreDefinitionStore.addChangedListener(this._storeChanged);
        this._processParameterStore.addChangedListener(this._storeChanged);
        if (!this.isYamlEditorFeatureAvailable())
        {
            this._yamlStore.addChangedListener(this._yamlStoreChanged);
            this._yamlDefinitionStore.addChangedListener(this._storeChanged);
        }
    }

    public isYaml(): boolean {
        return this._yamlStore.getState().isYaml;
    }

    public isYamlFeatureAvailable(): boolean {
        return this._yamlStore.getState().isYamlFeatureAvailable;
    }

    public isYamlEditorFeatureAvailable(): boolean {
        return this._yamlDefinitionStore.getState().isYamlEditorEnabled;
    }

    public isValidProcess(): boolean {
        return this._processParameterStore.isValid()
            && this._coreDefinitionStore.isValid()
            && this._agentsStore.isValid()
            && this._yamlDefinitionStore.isValid()
            && this._phaseListStore.isValid();
    }

    public getPhaseListStore(): DeployPhaseListStore {
        return this._phaseListStore;
    }

    public disposeInternal(): void {
        super.disposeInternal();
        this._phaseListStore.removeChangedListener(this._storeChanged);
        this._yamlStore.removeChangedListener(this._yamlStoreChanged);
        this._agentsStore.removeChangedListener(this._storeChanged);
        this._coreDefinitionStore.removeChangedListener(this._storeChanged);
        this._processParameterStore.removeChangedListener(this._storeChanged);
        this._yamlDefinitionStore.removeChangedListener(this._storeChanged);
    }

    @autobind
    private _storeChanged(): void {
        this.emitChanged();
    }

    @autobind
    private _yamlStoreChanged(): void {
        this.emitChanged();
    }
}