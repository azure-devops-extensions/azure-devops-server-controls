import Utils_String = require("VSS/Utils/String");
import Utils_Date = require("VSS/Utils/Date");

import * as StoreCommonBase from "DistributedTaskControls/Common/Stores/Base";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";

import Library_Actions = require("DistributedTask/Scripts/Actions/LibraryActions");
import { LibraryStoreKeys } from "DistributedTask/Scripts/Constants";
import { SecureFile, SecureFileProperty } from "DistributedTask/Scripts/DT.SecureFile.Model";
import * as Types from "DistributedTask/Scripts/DT.Types";
import Resources = require("DistributedTask/Scripts/Resources/TFS.Resources.DistributedTask");

export interface ISecureFileDetails {
    id: string;
    name: string;
    description: string;
}

export class SecureFileStore extends StoreCommonBase.StoreBase {

    public static getKey(): string {
        return LibraryStoreKeys.StoreKey_SecureFileStore;
    }

    public initialize(): void {
        Library_Actions.loadSecureFile.addListener(this.loadSecureFileDetails, this);
        Library_Actions.getSecureFile.addListener(this.loadSecureFileDetails, this);
    }

    protected disposeInternal(): void {
        Library_Actions.loadSecureFile.removeListener(this.loadSecureFileDetails);
        Library_Actions.getSecureFile.removeListener(this.loadSecureFileDetails);

        this._secureFileDetails = null;
    }

    public getSecureFileDetails(): ISecureFileDetails {
        if (!this._secureFileDetails) {
            return { id: "", name: "", description: "" };
        }

        return this._secureFileDetails;
    }

    public loadSecureFileDetails(sf: SecureFile): void {
        this._secureFileDetails = {
            id: sf.id,
            name: sf.name,
            description: "",
            properties: sf.properties
        }

        this.emitChanged();
    }

    private _secureFileDetails: ISecureFileDetails;
}