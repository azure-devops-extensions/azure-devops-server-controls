// Copyright (c) Microsoft Corporation.  All rights reserved.
import * as StoreCommonBase from "DistributedTaskControls/Common/Stores/Base";

import Types = require("DistributedTask/Scripts/DT.Types");

import { LibraryItem } from "DistributedTask/Scripts/DT.LibraryItem.Model";
import { VariableGroup, VariableGroupType } from "DistributedTask/Scripts/DT.VariableGroup.Model";
import { SecureFile } from "DistributedTask/Scripts/DT.SecureFile.Model";
import { VariableGroupListStore } from "DistributedTask/Scripts/Stores/VariableGroupListStore";
import { SecureFileListStore } from "DistributedTask/Scripts/Stores/SecureFileListStore";
import { LibraryStoreKeys } from "DistributedTask/Scripts/Constants";

import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";

export class LibraryItemsStore extends StoreCommonBase.StoreBase {

    public static getKey(): string {
        return LibraryStoreKeys.StoreKey_LibraryItemsStore;
    }

    public initialize(): void {
        this._variableGroupListStore = StoreManager.GetStore<VariableGroupListStore>(VariableGroupListStore);
        this._variableGroupListStore.addChangedListener(this._handleLibraryItemsChange);
        this._secureFileListStore = StoreManager.GetStore<SecureFileListStore>(SecureFileListStore);
        this._secureFileListStore.addChangedListener(this._handleLibraryItemsChange);
    }

    protected disposeInternal(): void {
        this._variableGroupListStore.removeChangedListener(this._handleLibraryItemsChange);
        this._secureFileListStore.removeChangedListener(this._handleLibraryItemsChange);

        StoreManager.DeleteStore<VariableGroupListStore>(VariableGroupListStore);
        StoreManager.DeleteStore<SecureFileListStore>(SecureFileListStore);
    }

    public getData(itemType: Types.LibraryItemType = Types.LibraryItemType.Library): LibraryItem[] {
        let libraryItems: LibraryItem[];

        if (itemType == Types.LibraryItemType.Library || itemType == Types.LibraryItemType.VariableGroup) {
            let variableGroups: VariableGroup[] = this._variableGroupListStore.getData();

            if (variableGroups != null) {
                libraryItems = []

                for (var i = 0; i < variableGroups.length; i++) {
                    libraryItems.push(this.getLibraryItemForVariableGroup(variableGroups[i]));
                }
            }
        }

        if (itemType == Types.LibraryItemType.Library || itemType == Types.LibraryItemType.SecureFile) {
            let secureFiles: SecureFile[] = this._secureFileListStore.getData();

            if (secureFiles != null) {
                if (!libraryItems) {
                    libraryItems = []
                }

                for (var i = 0; i < secureFiles.length; i++) {
                    libraryItems.push(this.getLibraryItemForSecureFile(secureFiles[i]));
                }
            }
        }

        return libraryItems;
    }

    private getLibraryItemForSecureFile(secureFile: SecureFile): LibraryItem {
        let libraryItem: LibraryItem = new LibraryItem();
        libraryItem.id = secureFile.id;
        libraryItem.name = secureFile.name;
        libraryItem.modifiedBy = secureFile.modifiedBy;
        libraryItem.modifiedOn = secureFile.modifiedOn;
        libraryItem.itemType = Types.LibraryItemType.SecureFile;
        libraryItem.description = "";
        return libraryItem;
    }

    public getLastDeletedRowIndex(): number {
        return this._variableGroupListStore.getLastDeletedRowIndex();
    }

    private getLibraryItemForVariableGroup(variableGroup: VariableGroup): LibraryItem {
        let libraryItem: LibraryItem = new LibraryItem();
        libraryItem.id = variableGroup.id.toString();
        libraryItem.name = variableGroup.name;
        libraryItem.modifiedBy = variableGroup.modifiedBy;
        libraryItem.modifiedOn = variableGroup.modifiedOn;
        libraryItem.itemType = Types.LibraryItemType.VariableGroup;
        libraryItem.description = variableGroup.description;

        if (VariableGroupType.isKeyVaultVariableGroupType(variableGroup.type)) {
            libraryItem.iconClassName = "bowtie-azure-key-vault";
        }
        else {
            libraryItem.iconClassName = "bowtie-variable-group";
        }
        
        return libraryItem;
    }

    private _handleLibraryItemsChange = () => {
        this.emitChanged();
    }

    private _variableGroupListStore: VariableGroupListStore;

    private _secureFileListStore: SecureFileListStore;
}
