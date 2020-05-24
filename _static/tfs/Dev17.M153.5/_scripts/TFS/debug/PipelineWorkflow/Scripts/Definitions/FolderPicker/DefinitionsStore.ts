import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { StoreBase } from "DistributedTaskControls/Common/Stores/Base";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";

import { PipelineDefinition } from "PipelineWorkflow/Scripts/Common/Types";
import { DefinitionsActionsHub, IDefinitionsActionPayload } from "PipelineWorkflow/Scripts/Definitions/DefinitionsActions";
import { DefinitionsStoreKeys, AllDefinitionsContentKeys } from "PipelineWorkflow/Scripts/Definitions/Constants";
import { CommonDefinitionsStore } from "PipelineWorkflow/Scripts/Definitions/Stores/CommonDefinitionsStore";
import { FolderUtils } from "PipelineWorkflow/Scripts/Definitions/Utils/FolderUtils";
import { IPermissionCollection } from "PipelineWorkflow/Scripts/SharedComponents/Security/PermissionHelper";

import * as Utils_Array from "VSS/Utils/Array";
import * as Utils_String from "VSS/Utils/String";

export class DefinitionsStore extends StoreBase {

    public static getKey(): string {
        return DefinitionsStoreKeys.StoreKey_DefinitionsStoreKey;
    }

    public initialize(instanceId: string): void {
        super.initialize(instanceId);

        this._commonDefinitionsStore = StoreManager.GetStore<CommonDefinitionsStore>(CommonDefinitionsStore);

        this._definitionsActionsHub = ActionsHubManager.GetActionsHub<DefinitionsActionsHub>(DefinitionsActionsHub, instanceId);
        this._definitionsActionsHub.setDefinitions.addListener(this._setDefinitionsIds);
        this._definitionsActionsHub.deleteDefinition.addListener(this._deleteDefinition);
        this._definitionsActionsHub.deleteFolder.addListener(this._deleteDefinitionsInFolder);
    }

    public disposeInternal(): void {
        if (this._definitionsActionsHub) {
            this._definitionsActionsHub.deleteFolder.removeListener(this._deleteDefinitionsInFolder);
            this._definitionsActionsHub.deleteDefinition.removeListener(this._deleteDefinition);
        }
    }

    public getDefinitions(): PipelineDefinition[] {
        return this._commonDefinitionsStore.getDefinitions(this._definitionIds);
    }

    public getDefinitionById(definitionId: number): PipelineDefinition {
        return this._commonDefinitionsStore.getDefinitionById(definitionId);
    }

    public getDefinitionByName(name: string): PipelineDefinition {
        const definitions: PipelineDefinition[] = this.getDefinitions();
        if (definitions && name) {
            let definitionWithMatchingName = Utils_Array.first(definitions, def => Utils_String.localeIgnoreCaseComparer(def.name, name.trim()) === 0);
            return definitionWithMatchingName;
        }
        else {
            return null;
        }
    }

    public getPermissions(): IPermissionCollection {
        return this._commonDefinitionsStore.getPermissions();
    }

    private _setDefinitionsIds = (payload: IDefinitionsActionPayload): void => {
        if (payload && payload.releaseDefinitionsIds) {
            for (const id of payload.releaseDefinitionsIds) {
                Utils_Array.removeWhere(this._definitionIds, (currentId) => { return (id === currentId); });
                this._definitionIds.push(id);
            }
        }
    }

    private _deleteDefinition = (deletedDefinitionId: number): void => {
        Utils_Array.removeWhere(this._definitionIds, (currentId) => { return currentId === deletedDefinitionId; });
    }

    private _deleteDefinitionsInFolder = (deletedFolderPath: string): void => {
        const deletedIds: number[] = this._commonDefinitionsStore.getDeletedIds();
        if (this._definitionIds && deletedIds) {
            for (const id of deletedIds) {
                Utils_Array.removeWhere(this._definitionIds, (currentId) => { return currentId === id; });
            }
        }
    }

    private _definitionsActionsHub: DefinitionsActionsHub;
    private _commonDefinitionsStore: CommonDefinitionsStore;
    private _definitionIds: number[] = [];
}
