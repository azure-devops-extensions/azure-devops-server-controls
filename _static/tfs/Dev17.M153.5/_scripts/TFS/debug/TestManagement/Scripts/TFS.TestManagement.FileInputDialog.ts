// Copyright (c) Microsoft Corporation.  All rights reserved.

import Controls_Dialogs = require("VSS/Controls/Dialogs");
import Controls_FileInput = require("VSS/Controls/FileInput");
import VSS = require("VSS/VSS");
import TMUtils = require("TestManagement/Scripts/TFS.TestManagement.Utils");

export interface IFileInputDialogOptions extends Controls_Dialogs.IModalDialogOptions {
    attachedEvent: (attachmentDetails: any) => void;
    title: string;
    runId: number;
    resultId: number;
    iterationId: number;
    actionPath: string;
}

export class FileInputDialog extends Controls_Dialogs.ModalDialogO<IFileInputDialogOptions> {
    private _fileInputControl: Controls_FileInput.FileInputControl;
    private _importedDefinition: string;
    private max_size: number = 25 * 1024 * 1024; /* 25 MB */

    public initializeOptions(options?: IFileInputDialogOptions): void {
        super.initializeOptions($.extend({
            title: options.title,
            useBowtieStyle: true
        }, options));
    }

    public initialize(): void {
        super.initialize();
        this._fileInputControl = Controls_FileInput.FileInputControl.createControl(this._element, {
            maximumNumberOfFiles: 1,
            maximumTotalFileSize: this.max_size,
            resultContentType: Controls_FileInput.FileInputControlContentType.Base64EncodedText,
            updateHandler: (updateEvent: Controls_FileInput.FileInputControlUpdateEventData) => {
                if (updateEvent.loading) {
                    this.updateOkButton(false);
                } else {
                    if (updateEvent.files.length > 0 && updateEvent.files[0].content) {
                        this.updateOkButton(true);
                    }
                    else {
                        this.updateOkButton(false);
                    }
                }
            }
        });
    }

    public onOkClick() {
        this.updateOkButton(false);
        this.getElement().trigger(Controls_Dialogs.ModalDialog.EVENT_BUTTON_STATUS_CHANGE, { enabled: false, button: "cancel" });
        let files: Controls_FileInput.FileInputControlResult[]  = this._fileInputControl.getFiles();
        if (this._options && this._options.attachedEvent && files.length == 1) {
            let attachmentDetails = { attachmentType: "GeneralAttachment", comment: "", fileName: files[0].name, stream: files[0].content };
            TMUtils.getTestResultManager().createTestIterationResultAttachment(attachmentDetails, 
                this._options.runId,
                this._options.resultId,
                this._options.iterationId,
                this._options.actionPath,
                (uploadAttachment) => {
                    let attachment = { Id: uploadAttachment.id, Name: files[0].name, Size: files[0].size };
                    this._options.attachedEvent(attachment);
                    this.closeDialog();
                },
                (error) => {
                    alert(VSS.getErrorMessage(error));
                    this.closeDialog();
                });
        }
    }

    private closeDialog() {
        this.setDialogResult(true);
        this.close();
    }
}
