import { findIndex } from "OfficeFabric/Utilities";
import * as Resources from "TestManagement/Scripts/Resources/TFS.Resources.TestManagement";
import {
    IAttachmentsInfo,
    IAttachmentsLoadedOptions,
    PreviewAttachmentActionsHub,
} from "TestManagement/Scripts/Scenarios/PreviewAttachments/Actions/PreviewAttachmentActionsHub";
import {
    PreviewAttachmentSource,
} from "TestManagement/Scripts/Scenarios/PreviewAttachments/Sources/PreviewAttachmentSource";
import { TelemetryService } from "TestManagement/Scripts/TFS.TestManagement.Telemetry";
import * as TMUtils from "TestManagement/Scripts/TFS.TestManagement.Utils";
import * as VCBuiltInExtensions from "VersionControl/Scripts/BuiltInExtensions";
import * as Diag from "VSS/Diag";
import Events_Action = require("VSS/Events/Action");
import * as Utils_String from "VSS/Utils/String";
import * as CommonUtils from "TestManagement/Scripts/Scenarios/Common/CommonUtils";

export class PreviewAttachmentActionsCreator {

    constructor(private _actionsHub: PreviewAttachmentActionsHub, private _source: PreviewAttachmentSource) {
    }

    public downloadAttachment(url: string): void {
        Events_Action.getService().performAction(Events_Action.CommonActions.ACTION_WINDOW_OPEN, {
            url: url,
            target: "_blank"
        });
    }

    public getAttachments(testRunId: number, testResultId: number, subResultId: number, selectedAttachmentId: number,
        attachmentSource: string, filename: string, extensionHost: VCBuiltInExtensions.BuiltInExtensionHost): void {
        this._actionsHub.setLoadingState.invoke(true);
        this._source.loadAttachments(testRunId, testResultId, subResultId, attachmentSource).then((attachments) => {
            let attachmentsLoadedOptions: IAttachmentsLoadedOptions = {
                selectedAttachmentId: selectedAttachmentId,
                attachments: attachments,
                extensionHost: extensionHost
            };
            this._actionsHub.attachmentsLoaded.invoke(attachmentsLoadedOptions);
            let index: number = findIndex(attachments, attachment => attachment.key === selectedAttachmentId);
            this._actionsHub.updateCurrentIndex.invoke(index);
            this.updatePreviewContent(index, testRunId, testResultId, subResultId, attachmentSource, attachments, filename);
        });
    }

    public updatePreviewContent(index: number, testRunId: number, testResultId: number, subResultId: number,
        attachmentSource: string, attachments: CommonUtils.IExtendedComboBoxOption[], attachmentName?: string): void {
        this.closeErrorMessage();
        if (index === -1) {
            this._actionsHub.setUnableToPreviewState.invoke(true);
            this._actionsHub.setExtensionHostConfiguration.invoke(Utils_String.empty);
            this._handleCustomError(Utils_String.format(Resources.AttachmentDoesNotExist, attachmentName));
        }
        let attachmentId: number = parseInt(attachments[index].key.toString());
        let filename: string = attachments[index].text;
        let url: string = attachments[index].url;
        let attachmentInfo: IAttachmentsInfo = {
            attachmentId: attachmentId,
            filename: filename,
            url: url
        };
        
        this._actionsHub.beforeAttachmentContentFetched.invoke(attachmentInfo);

        let startTime: number;
        let endTime: number;
        let timeElapsedInMs: number;
        let fileNameExtension: string = filename.substring(filename.lastIndexOf("."));

        if (TMUtils.getTestResultManager().isAttachmentPreviewable(filename)) {
            startTime = new Date().getTime();
            this._actionsHub.setUnableToPreviewState.invoke(false);
            this._source.loadAttachmentContent(attachmentId, testRunId, testResultId, subResultId, attachmentSource).then((content: ArrayBuffer) => {
                if (content.byteLength <= PreviewAttachmentActionsCreator.FILESIZELIMIT_BYTES) {
                    this._parseContentBuffer(content, (result: string) => {
                        this._actionsHub.setExtensionHostConfiguration.invoke(result);
                    });
                } else {
                    let sizeInMB = PreviewAttachmentActionsCreator.FILESIZELIMIT_BYTES / (1024 * 1024);
                    this._actionsHub.setUnableToPreviewState.invoke(true);
                    this._actionsHub.updateUnableToPreviewErrorMessage.invoke(Utils_String.format(Resources.UnableToPreviewDueToLargeFileSize, sizeInMB, url));
                    this._actionsHub.setExtensionHostConfiguration.invoke(Utils_String.empty);
                }
                this._actionsHub.updateCurrentIndex.invoke(findIndex(attachments, attachment => attachment.key === attachmentId));
                this._actionsHub.afterAttachmentContentFetched.invoke(attachmentInfo);
                endTime = new Date().getTime();
                timeElapsedInMs = endTime - startTime;
                TelemetryService.publishEvents(TelemetryService.featurePreviewAttachment_AttachmentLoadTime, {
                    "FilenameExtension": fileNameExtension,
                    "SizeInKB": content.byteLength,
                    "LoadTimeInMs ": timeElapsedInMs
                });
            },
                (error) => {
                    Diag.logWarning(Resources.FailedFetchingAttachment);
                });

        } else {
            this._actionsHub.setUnableToPreviewState.invoke(true);
            this._actionsHub.updateUnableToPreviewErrorMessage.invoke(Utils_String.format(Resources.UnableToPreviewErrorMessage, url));
            this._actionsHub.setExtensionHostConfiguration.invoke(Utils_String.empty);
            this._actionsHub.afterAttachmentContentFetched.invoke(attachmentInfo);
            this._actionsHub.updateCurrentIndex.invoke(findIndex(attachments, attachment => attachment.key === attachmentId));
        }
    }

    private _parseContentBuffer(content: ArrayBuffer, callback) {
        let readChunk = null;

        let readEventHandler = (evt) => {
            if (evt.target.error == null) {
                callback(evt.target.result);
                return;
            } else {
                Diag.logWarning(Resources.FailedToReadFile);
                return;
            }
        };

        readChunk = (_content: ArrayBuffer) => {
            let reader = new FileReader();
            let blob = new Blob([new Uint8Array(_content)]);
            reader.onload = readEventHandler;
            reader.readAsText(blob);
        };
        
        readChunk(content);
}

    public updateCurrentIndex(newIndex: number): void {
        this._actionsHub.updateCurrentIndex.invoke(newIndex);
    }

    public closeDialog(): void {
        this._actionsHub.closeDialog.invoke(null);
    }

    private _handleError(error: Error) {
        this._actionsHub.onError.invoke(error.message || error.toString());
    }

    private _handleCustomError(error: string) {
        this._actionsHub.onError.invoke(error);
    }

    public closeErrorMessage(): void {
        this._actionsHub.onErrorMessageClose.invoke(null);
    }

    public static FILESIZELIMIT_BYTES: number = 100 * 1024 * 1024;  //100 MB
}