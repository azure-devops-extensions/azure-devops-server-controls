/// <reference types="react" />
/// <reference types="react-dom" />
/// <reference path='../Interfaces.d.ts' />

import Folder_Actions = require("Build/Scripts/Actions/FolderActions");
import { sanitizePath, updateChildrenOnParentPathChange } from "Build/Scripts/Folders";
import BuildModelsCommon = require("Build/Scripts/Constants");
import { raiseTfsError } from "Build/Scripts/Events/MessageBarEvents";
import { FolderSource } from "Build/Scripts/Sources/Folders";
import BuildStore = require("Build/Scripts/Stores/Builds");
import DefinitionStore = require("Build/Scripts/Stores/Definitions");
import TFS_Core_Contracts_NO_REQUIRE = require("TFS/Core/Contracts");
import { QueryResult } from "Build/Scripts/QueryResult";

import { StoredFolder } from "Build.Common/Scripts/ClientContracts"
import BuildClient = require("Build.Common/Scripts/ClientServices");
import { BuildCustomerIntelligenceInfo } from "Build.Common/Scripts/Generated/TFS.Build2.Common";
import { RootPath } from "Build.Common/Scripts/Security";

import TFS_React = require("Presentation/Scripts/TFS/TFS.React");

import BuildContracts = require("TFS/Build/Contracts");

import Performance = require("VSS/Performance");
import Service = require("VSS/Service");
import Telemetry = require("Build/Scripts/Telemetry");
import Utils_String = require("VSS/Utils/String");

import VSS = require("VSS/VSS");

export interface InitializeFolderStorePayload {
    folders: BuildContracts.Folder[];
}

export interface IFolderStoreOptions extends TFS_React.IStoreOptions {
    buildClient?: BuildClient.BuildClientService;
}

export var initializeFolderStore = new TFS_React.Action<InitializeFolderStorePayload>();

export class FolderStore extends TFS_React.Store {
    private _buildClient: BuildClient.BuildClientService;
    private _folderSource: FolderSource;
    private _initialized: boolean = false;
    private _hasFolders = false;
    private _pathsToFolders: IDictionaryStringTo<QueryResult<StoredFolder>> = {};
    private _folderDeletedMap: IDictionaryStringTo<boolean> = {};
    //reserve 1 for root
    private _folderIdCounter = 2;

    constructor(options?: IFolderStoreOptions) {
        super(BuildModelsCommon.StoreChangedEvents.FolderStoreUpdated, options);

        this._buildClient = (options && options.buildClient) ? options.buildClient : Service.getCollectionService(BuildClient.BuildClientService);
        this._folderSource = Service.getCollectionService(FolderSource);

        let performance = Performance.getScenarioManager().startScenario(BuildCustomerIntelligenceInfo.Area, "DefinitionFolderStore");

        initializeFolderStore.addListener((payload: InitializeFolderStorePayload) => {
            this._pathsToFolders = {};
            this._initialized = true;
            let folders: StoredFolder[] = [];
            payload.folders.forEach((folder) => {
                folders.push({
                    id: this._createFolderId(folder.path),
                    folder:folder
                })
            })
            this._updateFolders(folders);
        });

        Folder_Actions.foldersUpdated.addListener((payload: Folder_Actions.FoldersUpdatedPayload) => {
            if (payload.replace) {
                this._pathsToFolders = {};
            }

            let folders: StoredFolder[] = [];
            if (payload.folders) {
                payload.folders.forEach((f) => {
                    let id = 0;
                    let existingFolder = this._pathsToFolders[f.path];
                    if (existingFolder && existingFolder.result) {
                        id = existingFolder.result.id;
                    }
                    else {
                        id = this._createFolderId(f.path)
                    }
                    folders.push({
                        id: id,
                        folder: f
                    });
                })
            }

            this._updateFolders(folders);
        });

        Folder_Actions.createFolderRequested.addListener((payload: Folder_Actions.FolderCreateRequestedPayload) => {
            this._createFolder(payload.folder, payload.successCallBack, payload.errorCallBack);
        });

        Folder_Actions.folderUpdateRequested.addListener((payload: Folder_Actions.FolderUpdateRequestedPayload) => {
            this._updateFolder(payload, payload.successCallBack, payload.errorCallBack);
        });

        Folder_Actions.deleteFolderRequested.addListener((payload: Folder_Actions.FolderDeleteRequestedPayload) => {
            this._deleteFolder(payload.path, payload.successCallBack, payload.errorCallBack);
        });

        Folder_Actions.folderDeleted.addListener((path: string) => {
            path = sanitizePath(path).toLocaleLowerCase();
            delete this._pathsToFolders[path];

            // handle cases where folder that was deleted has subfolders
            Object.keys(this._pathsToFolders).forEach((existingPath) => {
                if (Utils_String.startsWith(existingPath, path + RootPath)) {
                    delete this._pathsToFolders[existingPath];
                }
            });

            this.emitChanged();
        });

        performance.end();
    }

    public getFolders(path?: string): QueryResult<StoredFolder>[] {
        let results: QueryResult<StoredFolder>[] = [];

        if (!this._initialized) {
            // if store wasn't initialized, let's refresh folders
            this._initialized = true;
            this._folderSource.getFolders();
            return results;
        }
        if (path) {
            results = getFoldersFromPath(path, this._pathsToFolders);
        }
        else {
            for (var folderPath in this._pathsToFolders) {
                if (folderPath != RootPath) {
                    results.push(this._pathsToFolders[folderPath]);
                }
            }
        }
        return results;
    }

    public getId(path: string):number {
        let id: number;
        let folder = this._pathsToFolders[sanitizePath(path).toLocaleLowerCase()];
        if (folder && folder.result) {
            id = folder.result.id;
        }
        return id;
    }

    public hasFolders(): boolean {
        return this._hasFolders;
    }

    private _deleteFolder(path: string, successCallBack: (path: string) => void, errorCallBack: (error: Error) => void) {
        var progressId = VSS.globalProgressIndicator.actionStarted(BuildModelsCommon.StoreChangedEvents.FolderStoreUpdated + "deleteFolder", true);
        this._buildClient.deleteFolder(path).then(() => {
            Folder_Actions.folderDeleted.invoke(path);
            VSS.globalProgressIndicator.actionCompleted(progressId);
            if (successCallBack) {
                successCallBack(path);
            }
        }, (error) => {
            if (errorCallBack) {
                errorCallBack(error);
            }
            else {
                raiseTfsError(error);
            }

            VSS.globalProgressIndicator.actionCompleted(progressId);
        });
    }

    private _createFolder(folder: BuildContracts.Folder, successCallBack: (path: string) => void, errorCallBack: (error: Error) => void) {
        var progressId = VSS.globalProgressIndicator.actionStarted(BuildModelsCommon.StoreChangedEvents.FolderStoreUpdated + "createFolder", true);
        this._buildClient.createFolder(folder.path, folder).then((folder: BuildContracts.Folder) => {

            let splitFolders = getAllCreatedFolders(folder);
            let storedFolders: StoredFolder[] = [];

            splitFolders.forEach((f) => {
                let id = this._createFolderId(f.path);
                storedFolders.push({
                    id: id,
                    folder: f
                })
            })

            this._updateFolders(storedFolders);
            VSS.globalProgressIndicator.actionCompleted(progressId);

            let telemetryProperties = {};
            telemetryProperties[Telemetry.Properties.NewFolder] = folder.project + folder.path;
            Telemetry.publishEvent(Telemetry.Features.Folder, "FolderStore", telemetryProperties);
            if (successCallBack) {
                successCallBack(folder.path);
            }

        }, (error: Error) => {
            if (errorCallBack) {
                errorCallBack(error);
            }
            else {
                raiseTfsError(error);
            }

            VSS.globalProgressIndicator.actionCompleted(progressId);
        });
    }

    private _updateFolder(payload: Folder_Actions.FolderUpdateRequestedPayload, successCallBack: (path: string) => void, errorCallBack: (error: Error) => void) {
        var progressId = VSS.globalProgressIndicator.actionStarted(BuildModelsCommon.StoreChangedEvents.FolderStoreUpdated + "updateFolder", true);
        this._buildClient.updateFolder(payload.path, payload.folder).then((folder: BuildContracts.Folder) => {
            let existingFolder = this._pathsToFolders[sanitizePath(payload.path).toLocaleLowerCase()];
            if (existingFolder && !existingFolder.pending) {
                //modifying an existing folder, need to keep id
                let newFolder: StoredFolder = {
                    id: existingFolder.result.id,
                    folder: folder
                };

                let oldPath: string = existingFolder.result.folder ? existingFolder.result.folder.path : "";
                if (!Utils_String.equals(folder.path, existingFolder.result.folder.path, false)) {
                    // folder is renamed, so removed the old folder
                    this._folderDeletedMap[oldPath] = true;
                    //update paths of descendant folders
                    this._updateChildrenOnRename(folder.path, oldPath);
                }
  
                
                this._updateFolders([newFolder]);
            }
       
            
            VSS.globalProgressIndicator.actionCompleted(progressId);
            if (successCallBack) {
                successCallBack(folder.path);
            }

        }, (error) => {
            if (errorCallBack) {
                errorCallBack(error);
            }
            else {
                raiseTfsError(error);
            }

            VSS.globalProgressIndicator.actionCompleted(progressId);
        });
    }

    private _updateFolders(folders: StoredFolder[]) {
        for (const path in this._folderDeletedMap) {
            delete this._pathsToFolders[path];
        }

        this._folderDeletedMap = {};
        (folders || []).forEach((wrapper: StoredFolder) => {
            if (!this._hasFolders && wrapper.folder.path != RootPath) {
                // root folder is not considered as folders existence
                this._hasFolders = true;
            }

            this._pathsToFolders[sanitizePath(wrapper.folder.path).toLocaleLowerCase()] = {
                pending: false,
                result: wrapper
            };
        });
        this.emitChanged();
    }

    private _updateChildrenOnRename(newPath: string, oldPath: string): void {
        let newFolders: StoredFolder[] = [];
        for (var folderPath in this._pathsToFolders) {
            const updatedChildFolderPath: string = updateChildrenOnParentPathChange(oldPath, newPath, folderPath);
            // If the parent of current folder matches the renamed folder then update the parent path
            if (updatedChildFolderPath !== Utils_String.empty) {
                let oldFolderQR = this._pathsToFolders[folderPath];
                if (oldFolderQR && oldFolderQR.result) {
                    let oldFolder = oldFolderQR.result;
                    oldFolder.folder.path = updatedChildFolderPath;
                    newFolders.push(oldFolder);
                }
                this._folderDeletedMap[folderPath] = true;
            }
        }
            this._updateFolders(newFolders);
    }

    private _createFolderId(folderPath: string): number {
        if (folderPath === RootPath) {
            return 1;
        } else {
            return this._folderIdCounter++;
        }
    }

}
var _folderStore: FolderStore = null;

export function getFolderStore(options?: IFolderStoreOptions): FolderStore {
    if (!_folderStore) {
        _folderStore = new FolderStore(options);
    }
    return _folderStore;
}

export function getAllCreatedFolders(createdFolder: BuildContracts.Folder): BuildContracts.Folder[] {
    let folders: BuildContracts.Folder[] = [];
    const path = createdFolder.path;
    let pathParts = path.split(RootPath);
    if (pathParts.length > 2) {
        // this means a folder is created with something like "\folder\subfolder"
        // note that path is always rooted, so there wouldn't be a case where path is "folder\subfolder"
        // pathParts would be "","folder","subfolder"
        // we should leave the very last part as we add the original folder at the end, so "< length-1" and start from 1
        let currentPath = "";
        for (let i = 1; i < pathParts.length - 1; i++) {
            const pathPart = pathParts[i];
            let folderCopy = { ...createdFolder };
            currentPath += RootPath + pathPart;
            folderCopy.path = currentPath;
            folders.push(folderCopy);
        }
    }

    // add the original created folder
    folders.push(createdFolder);
    return folders;
}

export function getFoldersFromPath(path: string, pathToFoldersMap: IDictionaryStringTo<QueryResult<StoredFolder>>): QueryResult<StoredFolder>[] {
    let results: QueryResult<StoredFolder>[] = [];
    // strip off trailing slash if exists
    path = sanitizePath(path).toLocaleLowerCase();
    let pathParts = path.split(RootPath);
    // return only one level down
    for (var folderPath in pathToFoldersMap) {
        if (folderPath == RootPath) {
            // don't include root node
            continue;
        }

        var pushResult = false;
        var folderParts = folderPath.split(RootPath);

        // for root folder
        if (path == RootPath) {
            if (folderParts.length === 2) {
                results.push(pathToFoldersMap[folderPath]);
            }
            continue;
        }

        // and the rest
        if (folderParts.length === pathParts.length + 1) {
            pushResult = true;
            // check for consecutive match
            pathParts.forEach((part, index) => {
                if (part != folderParts[index]) {
                    pushResult = false;
                    return;
                }
            });
        }
        if (pushResult) {
            results.push(pathToFoldersMap[folderPath]);
        }
    }

    return results;
}
