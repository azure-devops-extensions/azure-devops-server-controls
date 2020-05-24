/// <reference types="jquery" />

import { CIOptinConstants, ImportConstants } from "Build/Scripts/Constants";
import * as BuildResources from "Build/Scripts/Resources/TFS.Resources.Build";
import * as Utils from "Build/Scripts/Utilities/Utils";

import { BuildDefinition as ContractsBuildDefinition } from "TFS/Build/Contracts";

import Dialogs = require("VSS/Controls/Dialogs");
import Controls_FileInput = require("VSS/Controls/FileInput");
import VSS = require("VSS/VSS");
import * as Utils_Url from "VSS/Utils/Url";

export class ImportDefinitionDialog extends Dialogs.ModalDialog {
    private _fileInputControl: Controls_FileInput.FileInputControl;
    private _importedDefinition: string;

    public initializeOptions(options?: any): void {
        super.initializeOptions($.extend({
            title: BuildResources.ImportDefinitionDialogTitle,
            useBowtieStyle: true,
            okText: BuildResources.ImportDefinitionDialogOkText
        }, options));
    }

    public initialize(): void {
        super.initialize();
        $("<div class='instructions'/> <br/>").html(BuildResources.ImportDefinitionDialogInstruction).appendTo(this._element);
        this._fileInputControl = Controls_FileInput.FileInputControl.createControl(this._element, {
            maximumNumberOfFiles: 1,
            maximumTotalFileSize: 25 * 1024 * 1024,
            resultContentType: Controls_FileInput.FileInputControlContentType.RawText,
            updateHandler: (updateEvent: Controls_FileInput.FileInputControlUpdateEventData) => {
                if (updateEvent.loading) {
                    this.updateOkButton(false);
                }
                else {
                    if (updateEvent.files.length > 0 && updateEvent.files[0].content) {
                        this._importedDefinition = updateEvent.files[0].content;
                        this.updateOkButton(true);
                    }
                    else {
                        this.updateOkButton(false);
                    }
                }
            }
        });
    }

    public onOkClick(e?: JQueryEventObject): void {
        try {
            let jsonDefinition = JSON.parse(this._importedDefinition);
            sessionStorage.setItem(ImportConstants.ImportStorageKey, JSON.stringify(jsonDefinition));
            let path = "";
            var url: Utils_Url.Uri = new Utils_Url.Uri(CIOptinConstants.ImportDefinitionRelativeUrl);
            if (jsonDefinition && jsonDefinition.path)
            {
                url.addQueryParam("path", jsonDefinition.path, true);
            }
            Utils.openRelativeUrl(url.absoluteUri);
            this.setDialogResult(true);
            this._fileInputControl.clear();
        }
        catch (ex) {
            Dialogs.showMessageDialog(BuildResources.ImportErrorContent, {
                title: BuildResources.ImportErrorTitle,
                useBowtieStyle: false,
                bowtieVersion: 0,
                dialogClass: "bowtie",
                buttons: [{
                    id: "OK",
                    text: "OK"
                }]
            } as Dialogs.IShowMessageDialogOptions);
        }
    }
}

// TFS plugin model requires this call for each tfs module.
VSS.tfsModuleLoaded("Controls.ImportDefinitionDialog", exports);
