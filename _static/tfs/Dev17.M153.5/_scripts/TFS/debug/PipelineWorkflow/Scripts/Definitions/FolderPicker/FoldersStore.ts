import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { StoreBase } from "DistributedTaskControls/Common/Stores/Base";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";

import { DefinitionsActionsHub, IFoldersActionPayload } from "PipelineWorkflow/Scripts/Definitions/DefinitionsActions";
import { IFolderEntry } from "PipelineWorkflow/Scripts/Definitions/AllDefinitionsContent";
import { DefinitionsStoreKeys, AllDefinitionsContentKeys } from "PipelineWorkflow/Scripts/Definitions/Constants";
import { PipelineDefinitionFolder } from "PipelineWorkflow/Scripts/Common/Types";
import { FolderDialogActionsHub, ICreateFolderPayload, IUpdateFolderPayload } from "PipelineWorkflow/Scripts/Definitions/FolderDialog/FolderDialogActions";
import { FolderUtils } from "PipelineWorkflow/Scripts/Definitions/Utils/FolderUtils";
import { IPermissionCollection } from "PipelineWorkflow/Scripts/SharedComponents/Security/PermissionHelper";

import * as Utils_Array from "VSS/Utils/Array";
import * as Utils_String from "VSS/Utils/String";

export class FoldersStore extends StoreBase {
    constructor() {
        super();
    }

    public static getKey(): string {
        return DefinitionsStoreKeys.StoreKey_FoldersStoreKey;
    }

    public initialize(instanceId: string): void {
        super.initialize(instanceId);

        this._definitionsActionsHub = ActionsHubManager.GetActionsHub<DefinitionsActionsHub>(DefinitionsActionsHub, instanceId);
        this._definitionsActionsHub.foldersInitialized.addListener(this._setFolders);
        this._definitionsActionsHub.deleteFolder.addListener(this._deleteFolder);
        this._definitionsActionsHub.updateFolderPermissions.addListener(this._updatePermissions);

        this._folderDialogActionsHub = ActionsHubManager.GetActionsHub<FolderDialogActionsHub>(FolderDialogActionsHub);
        this._folderDialogActionsHub.renameFolder.addListener(this._updateFolder);
        this._folderDialogActionsHub.createFolder.addListener(this._createFolder);
    }

    public disposeInternal(): void {
        if (this._folderDialogActionsHub) {
            this._folderDialogActionsHub.renameFolder.removeListener(this._updateFolder);
            this._folderDialogActionsHub.createFolder.removeListener(this._createFolder);
        }

        if (this._definitionsActionsHub) {
            this._definitionsActionsHub.foldersInitialized.removeListener(this._setFolders);
            this._definitionsActionsHub.deleteFolder.removeListener(this._deleteFolder);
            this._definitionsActionsHub.updateFolderPermissions.removeListener(this._updatePermissions);
        }
    }

    public getFolders(): IFolderEntry[] {
        let result: IFolderEntry[] = [];

        Object.keys(this._folders).forEach((key) => {
            if (this._folders.hasOwnProperty(key)) {
                result.push(this._folders[key]);
            }
        });

        return result;
    }

    public getFolderPath(folderId: number): string {
        return this._folderIdToPathMapping[folderId];    
    }

    public getFolderId(folderPath: string): number {
        return this._folders[folderPath].id;
    }

    public getPermissions(): IPermissionCollection {
        return this._folderPermissions;
    }

    private _updatePermissions = (permissionCollection: IPermissionCollection): void => {
        if (!permissionCollection) {
            return;
        }

        for (const cacheKey in permissionCollection) {
            if (permissionCollection.hasOwnProperty(cacheKey) && permissionCollection[cacheKey]) {
                if (!this._folderPermissions[cacheKey]) {
                    this._folderPermissions[cacheKey] = permissionCollection[cacheKey];
                    continue;
                }

                for (const permission in permissionCollection[cacheKey]) {
                    if (permissionCollection[cacheKey].hasOwnProperty(permission)) {
                        this._folderPermissions[cacheKey][permission] = permissionCollection[cacheKey][permission];
                    }
                }
            }
        }
    }

    private _setFolders = (actionPayload: IFoldersActionPayload): void => {
        this._folders = {};
        if (actionPayload && actionPayload.folders && actionPayload.folders.length > 0) {
            actionPayload.folders.forEach((folder: PipelineDefinitionFolder) => {
                this._addNewFolder(folder);
            });
        }
    }

    private _addNewFolder(folder: PipelineDefinitionFolder): void {
        let folderId = this._createFolderId(folder.path);
        this._folderIdToPathMapping[folderId] = folder.path;
        this._folders[folder.path] = {
            id: folderId,
            path: folder.path,
            hasMoreChildItems: true,
        };
    }

    private _mergeFolder(oldFolderPath: string, folder: PipelineDefinitionFolder): void {
        let oldFolder = this._folders[oldFolderPath];
        
        this._folderIdToPathMapping[oldFolder.id] = folder.path;
        this._folders[folder.path] = {
            id: oldFolder.id,
            path: folder.path,
            hasMoreChildItems: oldFolder.hasMoreChildItems,
        };

        delete this._folders[oldFolderPath];
    }

    private _createFolder = (actionPayload: ICreateFolderPayload): void => {
        if (actionPayload && actionPayload.folder) {
            this._addNewFolder(actionPayload.folder);
        }
    }

    private _updateFolder = (actionPayload: IUpdateFolderPayload): void => {
        if (actionPayload && actionPayload.folder) {
            this._mergeFolder(actionPayload.oldFolderPath, actionPayload.folder);
            this._updateSubfoldersOnRename(actionPayload.oldFolderPath, actionPayload.folder.path);
        }
    }

    private _updateSubfoldersOnRename = (oldPath: string, newPath: string): void => {
        if (this._folders) {
            for (let key in this._folders) {
                if (this._folders.hasOwnProperty(key)) {
                    const updatedChildFolderPath: string = FolderUtils.createNewChildPathForUpdatedParentFolderPath(oldPath, newPath, this._folders[key].path);
                    // If the parent of current folder matches the renamed folder then update the parent path
                    if (updatedChildFolderPath !== Utils_String.empty) {
                        let oldFolder = this._folders[key];
                        this._folderIdToPathMapping[oldFolder.id] = updatedChildFolderPath;
                        this._folders[updatedChildFolderPath] = {
                            id: oldFolder.id,
                            path: updatedChildFolderPath,
                            hasMoreChildItems: oldFolder.hasMoreChildItems,
                        };
                        delete this._folders[key];
                    }
                }
            }
        }
    }

    private _deleteFolder = (deletedFolderPath: string): void => {
        if (this._folders) {
            for (let key in this._folders) {
                if (this._folders.hasOwnProperty(key)) {
                    const childFolderPathToDelete: string = FolderUtils.createNewChildPathForUpdatedParentFolderPath(deletedFolderPath, null, this._folders[key].path);
                    if (childFolderPathToDelete !== Utils_String.empty) {
                        delete this._folders[key];
                    }
                }
            }
        }
    }

    private _createFolderId(folderPath: string): number {
        if (FolderUtils.isRootPath(folderPath)) {
            return 1;    
        } else {
            return this._folderIdCounter++;
        }
    }

    private _definitionsActionsHub: DefinitionsActionsHub;
    private _folderDialogActionsHub: FolderDialogActionsHub;

    private _folders: IDictionaryStringTo<IFolderEntry> = {};
    private _folderIdToPathMapping: IDictionaryNumberTo<string> = {};
    private _folderPermissions: IPermissionCollection = {};
    private _folderIdCounter = 2; // reserve 1 for root folder
}