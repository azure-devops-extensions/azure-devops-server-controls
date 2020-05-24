import { SecureFileActions, ISecureFileUploadedPayload, IUpdateSecureFilesPayload } from "DistributedTaskControls/Actions/SecureFileActions";
import { ActionCreatorBase } from "DistributedTaskControls/Common/Actions/Base";
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { ActionCreatorKeys } from "DistributedTaskControls/Common/Common";
import { SecureFileSource } from "DistributedTaskControls/Sources/SecureFileSource";

import { SecureFile, SecureFileActionFilter } from "TFS/DistributedTask/Contracts";

import * as VSS from "VSS/VSS";
import * as Diag from "VSS/Diag";

import { FileInputResult } from "VSSUI/FileInput";

export class SecureFileActionsCreator extends ActionCreatorBase {
    private _actions: SecureFileActions;

    public static getKey(): string {
        return ActionCreatorKeys.SecureFileActionsCreator;
    }

    public initialize(): void {
        this._actions = ActionsHubManager.GetActionsHub<SecureFileActions>(SecureFileActions);
    }

    public getSecureFiles(actionFilter?: SecureFileActionFilter): void {
        SecureFileSource.instance().getSecureFiles().then((secureFiles: SecureFile[]) => {
            this._actions.updateSecureFiles.invoke({
                secureFiles: secureFiles
            } as IUpdateSecureFilesPayload);
        }, (err: any) => {
            Diag.logError(err);
            this._actions.updateSecureFiles.invoke({
                errorMessage: VSS.getErrorMessage(err)
            } as IUpdateSecureFilesPayload);
        });
    }

    /**
     * Uploads a SecureFile and invokes the secureFileUploaded action
     * @param file the file
     * @param onUploadComplete a callback to allow the caller to invoke additional actions after the upload is complete
     */
    public uploadSecureFile(file: FileInputResult, onUploadComplete?: (value: string) => void): void {
        SecureFileSource.instance().uploadSecureFile(file).then((secureFile: SecureFile) => {
            this._actions.secureFileUploaded.invoke({
                secureFile: secureFile
            } as ISecureFileUploadedPayload);

            if (onUploadComplete) {
                onUploadComplete(secureFile.id);
            }
        }, (err: any) => {
            Diag.logError(err);
            this._actions.secureFileUploaded.invoke({
                errorMessage: VSS.getErrorMessage(err)
            } as ISecureFileUploadedPayload);
        });
    }
}