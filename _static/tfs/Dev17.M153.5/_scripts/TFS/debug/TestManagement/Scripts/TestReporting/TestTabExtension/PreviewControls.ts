import Resources = require("TestManagement/Scripts/Resources/TFS.Resources.TestManagement");
import TestsOM = require("TestManagement/Scripts/TFS.TestManagement");
import TMUtils = require("TestManagement/Scripts/TFS.TestManagement.Utils");
import Dialogs = require("VSS/Controls/Dialogs");
import { RichContentTooltip } from "VSS/Controls/PopupContent";

import Utils_String = require("VSS/Utils/String");
import Utils_UI = require("VSS/Utils/UI");
import Diag = require("VSS/Diag");
import VSS = require("VSS/VSS");

export interface PreviewAttachmentsOptions {
    selectedAttachment: TestsOM.AttachmentInfo;
    runId: number;
    resultId: number;
}

export class PreviewAttachments extends Dialogs.ModalDialogO<any>{

    constructor(options?: PreviewAttachmentsOptions) {
        super(options);
    }

    public initialize() {
        super.initialize();
        this._element.addClass("testresults-attachment-preview-dialog");
        this._selectedAttachment = this._options.selectedAttachment;
        this.setTitle(Utils_String.format(Resources.PreviewAttachment, this._options.selectedAttachment.getName()));
        this._urlForAttachmentDownload = this._getAttachmentDownloadURI();
        this.decorate();
    }

    private _getAttachmentDownloadURI(): string {
        let params = {
            attachmentId: this._selectedAttachment.getId()
        };
        let url: string = TMUtils.getTestResultManager().getApiLocation("DownloadAttachment", params);
        return url;
    }

    private decorate(): void {
        this._header = $(
            `<div class='controls-section' >
            <div class='right-section right' />
            </div>`
        ).appendTo(this._element);

        this._preview = $(
            `<div class='preview-section'>
            <div class='content'>
            <div class='data' />
            </div>
            </div>`
        ).appendTo(this._element);

        this._load();
    }

    private _load(): void {
        this._loadControls();
        this._loadData();
    }

    private _loadControls(): void {
        let $downloadButton = $(`<span role="button" tabindex="0" class='bowtie-icon bowtie-transfer-download' />`);
        $downloadButton.attr("aria-label", Resources.Download);
        RichContentTooltip.add(Resources.Download, $downloadButton);
        let $controls: JQuery = this._header.find(".right-section").append($downloadButton);
        $controls.on("click", () => {
            window.open(this._urlForAttachmentDownload);
        });
        $controls.on("keydown", (e) => {
            if (e.which && e.which === Utils_UI.KeyCode.ENTER) {
                window.open(this._urlForAttachmentDownload);
            }
        });
    }

    private _loadData(): void {
        let $data: JQuery = this._preview.find(".data");
        if (this._options.selectedAttachment.getSize() > PreviewAttachments.FILESIZELIMIT_BYTES) {
            let $sizeExceeds = $(`<div class='test-result-attachment-size-exceeds' />`);
            let data: string = Utils_String.format(Resources.FileSizeTooLargeForPreview, this._urlForAttachmentDownload);
            $sizeExceeds.append(data);
            $sizeExceeds.appendTo($data);
        }
        else {
            TMUtils.getTestResultManager().getTestResultAttachmentContent(this._options.runId, this._options.resultId, this._options.selectedAttachment.getId()).then((dataString: ArrayBuffer) => {
                let uint8 = new Uint8Array(dataString);
                let data: string = String.fromCharCode.apply(null, uint8);
                $data.text(data);
            },
                (error) => {
                    let errorData: string = Utils_String.format(Resources.UnableToFetchLog, this._urlForAttachmentDownload);
                    $data.append(errorData);
                    Diag.logWarning("[Error: FAILED fetching Data for this attachment");
                });
        }
    }

    public static FILESIZELIMIT_BYTES: number = 100000;
    private _urlForAttachmentDownload: string;
    private _header: JQuery;
    private _preview: JQuery;
    private _selectedAttachment: TestsOM.AttachmentInfo;
}

// TFS plug-in model requires this call for each TFS module.
VSS.tfsModuleLoaded("TestTabExtension/PreviewControls", exports);
