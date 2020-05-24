
import { StoreChangedEvents } from "Build/Scripts/Constants";
import { FolderStore, getFolderStore } from "Build/Scripts/Stores/Folders";
import { QueryResult } from "Build/Scripts/QueryResult";

import { IStoreOptions, Store } from "Presentation/Scripts/TFS/TFS.React";

import { Folder } from "TFS/Build/Contracts";

export interface IFolderManageDialogStoreOptions extends IStoreOptions {
    folderStore?: FolderStore;
}

export class FolderManageDialogStore extends Store {
    private _folderStore: FolderStore;

    private _folders: Folder[] = [];

    constructor(options?: IFolderManageDialogStoreOptions) {
        super(StoreChangedEvents.FolderManageStoreUpdated, options);

        this._folderStore = (options && options.folderStore) ? options.folderStore : new FolderStore();

        this._folderStore.addChangedListener(() => {
            this.emitChanged();
        });
    }

    public getFolders(): Folder[] {
        let folders: Folder[] = [];
        this._folderStore.getFolders().forEach((folderResult) => {
            if (folderResult.result) {
                folders.push(folderResult.result.folder);
            }
        });
        return folders;
    }
}

export function getFolderManageDialogStore(options?: IFolderManageDialogStoreOptions): FolderManageDialogStore {
    return new FolderManageDialogStore(options);
}

