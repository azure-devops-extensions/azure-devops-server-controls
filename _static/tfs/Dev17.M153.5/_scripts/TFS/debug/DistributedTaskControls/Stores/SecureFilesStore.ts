import { SecureFileActions, IUpdateSecureFilesPayload, ISecureFileUploadedPayload } from "DistributedTaskControls/Actions/SecureFileActions";
import { StoreKeys } from "DistributedTaskControls/Common/Common";
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { ViewStoreBase } from "DistributedTaskControls/Common/Stores/Base";

import { SecureFile } from "TFS/DistributedTask/Contracts";

import * as Utils_String from "VSS/Utils/String";

export class SecureFilesStore extends ViewStoreBase {
    private _actionHub: SecureFileActions;
    private _secureFiles: SecureFile[] = [];
    private _errorMessage: string;

    public static getKey(): string {
        return StoreKeys.SecureFilesStore;
    }

    public getSecureFiles(): SecureFile[] {
        return this._secureFiles;
    }

    public getErrorMessage(): string {
        return this._errorMessage || Utils_String.empty;
    }

    public initialize(instanceId?: string): void {
        this._actionHub = ActionsHubManager.GetActionsHub<SecureFileActions>(SecureFileActions, instanceId);
        this._actionHub.updateSecureFiles.addListener(this._onUpdateSecureFiles);
        this._actionHub.secureFileUploaded.addListener(this._onSecureFileUploaded);
    }

    protected disposeInternal(): void {
        if (this._actionHub) {
            this._actionHub.updateSecureFiles.removeListener(this._onUpdateSecureFiles);
            this._actionHub.secureFileUploaded.removeListener(this._onSecureFileUploaded);
        }
    }

    private _onUpdateSecureFiles = (payload: IUpdateSecureFilesPayload): void => {
        this._secureFiles = payload.secureFiles || [];
        this._errorMessage = payload.errorMessage;
        this.emitChanged();
    }

    private _onSecureFileUploaded = (payload: ISecureFileUploadedPayload): void => {
        this._errorMessage = payload.errorMessage;

        if (!!payload.secureFile) {
            // find index
            let index: number = 0;
            let length: number = this._secureFiles.length;
            for (; index < length; ++index) {
                if (Utils_String.localeComparer(this._secureFiles[index].name, payload.secureFile.name) > 0) {
                    break;
                }
            }

            this._secureFiles.splice(index, 0, payload.secureFile);
        }

        this.emitChanged();
    }
}