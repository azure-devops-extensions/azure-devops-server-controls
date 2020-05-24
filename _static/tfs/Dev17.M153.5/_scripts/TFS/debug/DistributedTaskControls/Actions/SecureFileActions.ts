import { ActionsHubBase, IEmptyActionPayload } from "DistributedTaskControls/Common/Actions/Base";
import { ActionsKeys } from "DistributedTaskControls/Common/Common";

import { SecureFile } from "TFS/DistributedTask/Contracts";

import { Action } from "VSS/Flux/Action";

export interface IUpdateSecureFilesPayload {
    secureFiles: SecureFile[];
    errorMessage: string;
}

export interface ISecureFileUploadedPayload {
    secureFile: SecureFile;
    errorMessage: string;
}

export class SecureFileActions extends ActionsHubBase {
    public initialize(): void {
        this._updateSecureFiles = new Action<IUpdateSecureFilesPayload>();
        this._secureFileUploaded = new Action<ISecureFileUploadedPayload>();
    }

    public get updateSecureFiles(): Action<IUpdateSecureFilesPayload> {
        return this._updateSecureFiles;
    }

    public get secureFileUploaded(): Action<ISecureFileUploadedPayload> {
        return this._secureFileUploaded;
    }

    public static getKey(): string {
        return ActionsKeys.SecureFileActions;
    }

    private _updateSecureFiles: Action<IUpdateSecureFilesPayload>;
    private _secureFileUploaded: Action<ISecureFileUploadedPayload>;
}