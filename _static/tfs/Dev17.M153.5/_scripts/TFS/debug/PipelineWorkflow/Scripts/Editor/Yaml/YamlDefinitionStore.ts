import { HistoryStore } from "DistributedTaskControls/SharedViews/ContainerTabs/HistoryTab/HistoryStore";
import { AggregatorDataStoreBase } from "DistributedTaskControls/Common/Stores/AggregatorStoreBase";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { CoreDefinitionStore } from "PipelineWorkflow/Scripts/Editor/Definition/CoreDefinitionStore";
import { YamlPipelineProcessStore } from "PipelineWorkflow/Scripts/Editor/Yaml/PipelineProcessStore";
import { PipelineDefinition } from "PipelineWorkflow/Scripts/Editor/Common/Types";
import { YamlUtils } from "PipelineWorkflow/Scripts/Editor/Yaml/YamlUtils";
import { EditorVariablesListStore } from "PipelineWorkflow/Scripts/Editor/ContainerTabs/VariablesTab/EditorVariablesListStore";

export class YamlDefinitionStore extends AggregatorDataStoreBase {
    
    constructor() {
        super();
    }

    /**
     * @returns Unique key to the store
     */
    public static getKey(): string {
        return "YAML-Definition-Store";
    }

    public getState(): PipelineDefinition {
        let definition: PipelineDefinition = YamlUtils.getEmptyYamlDefinition();
        this.updateVisitor(definition);
        return definition;
    }

    /**
     * @brief Initializing the Store
     * - Creating and adding stores to store-list
     * - Initialize action listeners
     */
    public initialize(instanceId: string): void {
        super.initialize(instanceId);
        this.addToStoreList(this._coreDefinitionStore = StoreManager.GetStore<CoreDefinitionStore>(CoreDefinitionStore));
        this.addToStoreList(this._yamlPipelineProcessStore = StoreManager.GetStore<YamlPipelineProcessStore>(YamlPipelineProcessStore));
        this.addToStoreList(this._variablesListStore = StoreManager.GetStore<EditorVariablesListStore>(EditorVariablesListStore));
    }

    public updateVisitor(definition: PipelineDefinition) {
        this._coreDefinitionStore.updateVisitor(definition);
        this._yamlPipelineProcessStore.updateVisitor(definition);
        this._variablesListStore.updateVisitor(definition);
    }

    private _coreDefinitionStore: CoreDefinitionStore;
    private _yamlPipelineProcessStore: YamlPipelineProcessStore;
    private _variablesListStore: EditorVariablesListStore;
    private _historyStore: HistoryStore;
}