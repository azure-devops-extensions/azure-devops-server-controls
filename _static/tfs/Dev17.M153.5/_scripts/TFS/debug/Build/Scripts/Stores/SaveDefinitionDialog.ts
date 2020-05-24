import { Store } from "VSS/Flux/Store";

import { foldersUpdated } from "Build/Scripts/Actions/FolderActions";
import { FolderSource } from "Build/Scripts/Sources/Folders";

import { DefinitionReference, Folder } from "TFS/Build/Contracts";

import { getCollectionService } from "VSS/Service";

export interface IFolderItems {
    key: string;
    text: string;
}

export class SaveDefinitionDialogStore extends Store {
    private _folderSource: FolderSource;
    private _initialized = false;

    private _definition: DefinitionReference;
    private _folders: IFolderItems[] = [];

    constructor() {
        super();
        this._folderSource = getCollectionService(FolderSource);

        foldersUpdated.addListener((payload) => {
            this._initialized = true;
            this._updateFolders(payload.folders);
            this.emitChanged();
        });
    }

    public getDefinition(): DefinitionReference {
        return this._definition;
    }

    public getFolders(): IFolderItems[] {
        if (!this._initialized) {
            this._folderSource.getFolders();
        }
        return this._folders;
    }

    private _updateFolders(folders: Folder[]) {
        this._folders = folders.map((folder) => {
            return {
                key: folder.path,
                text: folder.path
            };
        });
    }
}

let _store: SaveDefinitionDialogStore = null;

export function getSaveDefinitionDialogStore(): SaveDefinitionDialogStore {
    if (!_store) {
        _store = new SaveDefinitionDialogStore();
    }
    return _store;
}

