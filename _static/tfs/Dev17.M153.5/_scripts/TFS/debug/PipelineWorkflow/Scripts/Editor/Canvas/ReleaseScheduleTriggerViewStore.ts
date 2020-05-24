import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { StoreBase, IStoreState } from "DistributedTaskControls/Common/Stores/Base";

import { DeployPipelineStoreKeys } from "PipelineWorkflow/Scripts/Editor/Constants";
import { CoreDefinitionStore, ICoreDefinition } from "PipelineWorkflow/Scripts/Editor/Definition/CoreDefinitionStore";
import { DefinitionScheduleTriggerStore } from "PipelineWorkflow/Scripts/Editor/Definition/DefinitionScheduleTriggerStore";


export interface IReleaseScheduleTriggerViewState extends IStoreState {
    definitionId: number;
    isValid: boolean;
    isEnabled: boolean;
}

export class ReleaseScheduleTriggerViewStore extends StoreBase {

    public static getKey(): string {
        return DeployPipelineStoreKeys.StoreKey_DeployPipelineScheduleTriggerStoreKey;
    }

    public initialize(instanceId: string): void {
        this._coreDefinitionStore = StoreManager.GetStore<CoreDefinitionStore>(CoreDefinitionStore);
        this._dataStore = StoreManager.GetStore<DefinitionScheduleTriggerStore>(DefinitionScheduleTriggerStore);
        this._dataStore.addChangedListener(this._onDataStoreChanged);
        this._onDataStoreChanged();
    }

    public disposeInternal(): void {
        this._dataStore.removeChangedListener(this._onDataStoreChanged);
    }

    public getState(): IReleaseScheduleTriggerViewState {
        return this._state;
    }

    public isValid(): boolean {
        let isValid: boolean = this._dataStore.isValid();
        return isValid;
    }

    private _onDataStoreChanged = (): void => {
        let coreProperties: ICoreDefinition = this._coreDefinitionStore.getState();
        let isValid: boolean = this._dataStore.isValid();
        let isEnabled: boolean = this._dataStore.getState().isScheduleEnabled;
        this._state = {
            definitionId: coreProperties.id,
            isValid: isValid,
            isEnabled: isEnabled
        };

        this.emitChanged();
    }

    private _coreDefinitionStore: CoreDefinitionStore;
    private _dataStore: DefinitionScheduleTriggerStore;
    private _state: IReleaseScheduleTriggerViewState;
}