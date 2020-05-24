// Copyright (c) Microsoft Corporation.  All rights reserved.
import * as StoreCommonBase from "DistributedTaskControls/Common/Stores/Base";

import Model = require("DistributedTask/Scripts/DT.SecureFile.Model");
import Library_Actions = require("DistributedTask/Scripts/Actions/LibraryActions");
import { LibraryStoreKeys } from "DistributedTask/Scripts/Constants";

export class SecureFileListStore extends StoreCommonBase.StoreBase {

    public static getKey(): string {
        return LibraryStoreKeys.StoreKey_SecureFileListStore;
    }

    public initialize(): void {
        Library_Actions.getSecureFiles.addListener(this.onGetSecureFiles, this);
        Library_Actions.deleteSecureFile.addListener(this.onDeleteSecureFile, this);
		Library_Actions.uploadSecureFile.addListener(this.onUploadSecureFile, this);
    }

    protected disposeInternal(): void {
        Library_Actions.getSecureFiles.removeListener(this.onGetSecureFiles);
        Library_Actions.deleteSecureFile.removeListener(this.onDeleteSecureFile);
		Library_Actions.uploadSecureFile.removeListener(this.onUploadSecureFile);

        this._data = null;
    }

    public getData(): Model.SecureFile[] {
        return this._data;
    }

    public setData(secureFiles: Model.SecureFile[]): void {
        this._data = secureFiles;
        this.emitChanged();
    }

    private onGetSecureFiles(secureFiles: Model.SecureFile[]): void {
        this._data = secureFiles;
        this.emitChanged();
    }

	private onUploadSecureFile(secureFile: Model.SecureFile): void {
        this._data = this._data ? this._data.concat([secureFile]) : [secureFile];
		this.emitChanged();
    }

    private onDeleteSecureFile(secureFileId: string): void {
        if (!this._data) {
            this._data = [];
        }

        this._data = this._data.filter(secureFile => secureFile.id !== secureFileId);
        this.emitChanged();
    }

    private _data: Model.SecureFile[];
}
