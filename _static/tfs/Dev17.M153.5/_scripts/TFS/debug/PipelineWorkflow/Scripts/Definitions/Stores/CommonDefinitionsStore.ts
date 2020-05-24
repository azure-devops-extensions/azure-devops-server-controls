import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { StoreBase } from "DistributedTaskControls/Common/Stores/Base";

import { DefinitionsStoreKeys } from "PipelineWorkflow/Scripts/Definitions/Constants";
import { PipelineDefinition } from "PipelineWorkflow/Scripts/Common/Types";
import { CommonDefinitionsActionsHub, ICommonDefinitionsActionPayload } from "PipelineWorkflow/Scripts/Definitions/CommonDefinitionsActions";
import { FolderDialogActionsHub, IUpdateFolderPayload } from "PipelineWorkflow/Scripts/Definitions/FolderDialog/FolderDialogActions";
import { FolderUtils } from "PipelineWorkflow/Scripts/Definitions/Utils/FolderUtils";
import { IPermissionCollection } from "PipelineWorkflow/Scripts/SharedComponents/Security/PermissionHelper";

import * as Utils_String from "VSS/Utils/String";

export class CommonDefinitionsStore extends StoreBase {
    public static getKey(): string {
        return DefinitionsStoreKeys.StoreKey_CommonDefinitionsStoreKey;
    }

    public initialize(instanceId: string): void {
        super.initialize(instanceId);

        this._commonDefinitionsActionsHub = ActionsHubManager.GetActionsHub<CommonDefinitionsActionsHub>(CommonDefinitionsActionsHub, instanceId);
        this._commonDefinitionsActionsHub.setDefinitions.addListener(this._setDefinitions);
        this._commonDefinitionsActionsHub.deleteDefinition.addListener(this._deleteDefinition);
        this._commonDefinitionsActionsHub.updateDefinition.addListener(this._updateDefinition);
        this._commonDefinitionsActionsHub.deleteFolder.addListener(this._deleteDefinitionsInFolder);
        this._commonDefinitionsActionsHub.updateDefinitionsPermissions.addListener(this._updatePermissions);

        this._folderDialogActionshub = ActionsHubManager.GetActionsHub<FolderDialogActionsHub>(FolderDialogActionsHub);
        // ToDo: Have actions in commonDefinitionActionCreator to be invoked by folderDialogActionCreator  for the below actions
        this._folderDialogActionshub.moveDefinition.addListener(this._updateDefinition);
        this._folderDialogActionshub.renameAndMoveDefinition.addListener(this._updateDefinition);
        this._folderDialogActionshub.renameFolder.addListener(this._updateDefinitionsOnFolderRename);
    }

    public disposeInternal(): void {
        this._commonDefinitionsActionsHub.setDefinitions.removeListener(this._setDefinitions);
        this._commonDefinitionsActionsHub.deleteDefinition.removeListener(this._deleteDefinition);
        this._commonDefinitionsActionsHub.updateDefinition.removeListener(this._updateDefinition);
        this._commonDefinitionsActionsHub.deleteFolder.removeListener(this._deleteDefinitionsInFolder);
        this._commonDefinitionsActionsHub.updateDefinitionsPermissions.removeListener(this._updatePermissions);
        
        this._folderDialogActionshub.moveDefinition.removeListener(this._updateDefinition);
        this._folderDialogActionshub.renameAndMoveDefinition.removeListener(this._updateDefinition);
        this._folderDialogActionshub.renameFolder.removeListener(this._updateDefinitionsOnFolderRename);
    }

    public getDefinitions(ids: number[]): PipelineDefinition[] {
        let result: PipelineDefinition[] = [];
        if (this._definitions && ids) {
            for (const id of ids) {
                if (this._definitions.hasOwnProperty(id)) {
                    result.push(this._definitions[id]);
                }
            }
        }
        if (result && result.length > 0) {
            result.sort((a: PipelineDefinition, b: PipelineDefinition) => {
                return Utils_String.localeIgnoreCaseComparer(a.name, b.name);
            });
        }
        return result;
    }

    public getDefinitionById(id: number): PipelineDefinition {
        if (this._definitions && id && this._definitions.hasOwnProperty(id)) {
            return this._definitions[id];
        }
        else {
            return null;
        }
    }

    public getDeletedIds(): number[] {
        return this._deletedDefinitionsIds;
    }

    public getPermissions(): IPermissionCollection {
        return this._definitionPermissions;
    }

    private _updatePermissions = (permissionCollection: IPermissionCollection): void => {
        if (!permissionCollection) {
            return;
        }

        for (const cacheKey in permissionCollection) {
            if (permissionCollection.hasOwnProperty(cacheKey) && permissionCollection[cacheKey]) {
                if (!this._definitionPermissions[cacheKey]) {
                    this._definitionPermissions[cacheKey] = permissionCollection[cacheKey];
                    continue;
                }

                for (const permission in permissionCollection[cacheKey]) {
                    if (permissionCollection[cacheKey].hasOwnProperty(permission)) {
                        this._definitionPermissions[cacheKey][permission] = permissionCollection[cacheKey][permission];
                    }
                }
            }
        }
    }

    private _setDefinitions = (actionPayload: ICommonDefinitionsActionPayload): void => {
        if (actionPayload.releaseDefinitions && actionPayload.releaseDefinitions.length > 0) {
            actionPayload.releaseDefinitions.forEach((rd: PipelineDefinition) => {
                this._definitions[rd.id] = rd;
            });
        }
    }

    private _updateDefinition = (definition: PipelineDefinition): void => {
        if (this._definitions && definition && this._definitions.hasOwnProperty(definition.id)) {
            this._definitions[definition.id] = definition;
        }
    }

    private _deleteDefinition = (id: number): void => {
        if (this._definitions && id && this._definitions.hasOwnProperty(id)) {
            delete this._definitions[id];
        }
    }

    private _deleteDefinitionsInFolder = (deletedFolderPath: string): void => {
        if (this._definitions && deletedFolderPath) {
            this._deletedDefinitionsIds = [];
            for (let key in this._definitions) {
                if (this._definitions.hasOwnProperty(key)) {
                    const definitionPathToDelete: string = FolderUtils.createNewChildPathForUpdatedParentFolderPath(deletedFolderPath, null, this._definitions[key].path);
                    if (definitionPathToDelete !== Utils_String.empty) {
                        this._deletedDefinitionsIds.push(this._definitions[key].id);
                        delete this._definitions[key];
                    }
                }
            }
        }
    }

    private _updateDefinitionsOnFolderRename = (payload: IUpdateFolderPayload): void => {
        if (payload.oldFolderPath && payload.folder && this._definitions) {
            for (let key in this._definitions) {
                if (this._definitions.hasOwnProperty(key)) {
                    const definitionPathToUpdate: string = FolderUtils.createNewChildPathForUpdatedParentFolderPath(payload.oldFolderPath, payload.folder.path, this._definitions[key].path);
                    // If the parent of current definition matches the renamed folder then update the parent path
                    if (definitionPathToUpdate !== Utils_String.empty) {
                        this._definitions[key].path = definitionPathToUpdate;
                    }
                }
            }
        }
    }

    private _definitions: IDictionaryNumberTo<PipelineDefinition> = {};
    private _deletedDefinitionsIds: number[];
    private _definitionPermissions: IPermissionCollection = {};       
    private _commonDefinitionsActionsHub: CommonDefinitionsActionsHub;
    private _folderDialogActionshub: FolderDialogActionsHub;
}