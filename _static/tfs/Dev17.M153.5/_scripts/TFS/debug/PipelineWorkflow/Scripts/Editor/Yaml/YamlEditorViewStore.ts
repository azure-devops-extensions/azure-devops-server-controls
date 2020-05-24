import { ViewStoreBase } from "DistributedTaskControls/Common/Stores/Base";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { PipelineDefinition } from "PipelineWorkflow/Scripts/Editor/Common/Types";
import {
    EditorVariablesListStore,
} from "PipelineWorkflow/Scripts/Editor/ContainerTabs/VariablesTab/EditorVariablesListStore";
import { YamlDefinitionStore } from "PipelineWorkflow/Scripts/Editor/Yaml/YamlDefinitionStore";
import { YamlPipelineProcess } from "ReleaseManagement/Core/Contracts";

export interface IYamlEditorViewState {
    definition: PipelineDefinition;
    variablesTabIsValid: boolean;
    isDirty: boolean; 
    isValid: boolean;
    teamProjectName: string;
    repositoryName: string;
    branchName: string;
    yamlPath: string;
}

export class YamlEditorViewStore extends ViewStoreBase {
    public _onChange = (): void  => {
        this.emitChanged();
    }

    public static getKey() {
        return "YamlEditorViewStore";
    }
    
    public initialize(instanceId?: string): void {
        super.initialize(instanceId);
        this._definitionStore = StoreManager.GetStore<YamlDefinitionStore>(YamlDefinitionStore);
        this._definitionStore.addChangedListener(this._onChange);
    }

    protected disposeInternal(): void {
        this._definitionStore.removeChangedListener(this._onChange);
    }

    public getState(): IYamlEditorViewState {
        let process = this._getYamlPipelineProcess();
        return {
            definition: this._definitionStore.getState(),
            variablesTabIsValid: StoreManager.GetStore<EditorVariablesListStore>(EditorVariablesListStore).isValid(),
            isValid: this._definitionStore.isValid(),
            isDirty: this._definitionStore.isDirty(),
            yamlPath: process.filename,
            teamProjectName: process.fileSource.sourceReference["ProjectId"].name,
            branchName: process.fileSource.sourceReference["Branch"].name,
            repositoryName: process.fileSource.sourceReference["RepositoryId"].name,
        };
    }

    private _getYamlPipelineProcess(){
        return this._definitionStore.getState().pipelineProcess as YamlPipelineProcess;
    }

    private _definitionStore: YamlDefinitionStore;
}