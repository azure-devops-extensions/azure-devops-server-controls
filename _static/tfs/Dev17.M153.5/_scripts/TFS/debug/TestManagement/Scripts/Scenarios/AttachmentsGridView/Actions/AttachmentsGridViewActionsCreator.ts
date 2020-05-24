import { IColumn } from "OfficeFabric/DetailsList";
import * as Resources from "TestManagement/Scripts/Resources/TFS.Resources.TestManagement";
import {
    AttachmentsGridViewActionsHub,
    IAttachmentDetails,
} from "TestManagement/Scripts/Scenarios/AttachmentsGridView/Actions/AttachmentsGridViewActionsHub";
import {
    AttachmentsGridViewSource,
} from "TestManagement/Scripts/Scenarios/AttachmentsGridView/Sources/AttachmentsGridViewSource";
import PreviewAttachmentHelper_LAZY_LOAD = require("TestManagement/Scripts/TFS.TestManagement.PreviewAttachmentHelper");
import { TelemetryHelper, TelemetryService } from "TestManagement/Scripts/TFS.TestManagement.Telemetry";
import * as TMUtils from "TestManagement/Scripts/TFS.TestManagement.Utils";
import * as Diag from "VSS/Diag";
import Events_Action = require("VSS/Events/Action");
import { announce } from "VSS/Utils/Accessibility";
import * as Utils_String from "VSS/Utils/String";
import VSS = require("VSS/VSS");

export class AttachmentsGridViewActionsCreator {

    constructor(private _actionsHub: AttachmentsGridViewActionsHub, private _source: AttachmentsGridViewSource) {
    }

    public getAttachments(testRunId: number, testResultId: number, attachmentSource: string, subResultId: number): void {
        this._source.loadAttachments(testRunId, testResultId, attachmentSource, subResultId).then((attachments: IAttachmentDetails[]) => {
            this._actionsHub.attachmentsLoaded.invoke(attachments);
        }, (error) => {
            this._handleError(error);
        });
    }

    public initializeColums(columns: IColumn[]): void {
        this._actionsHub.initializeColumns.invoke(columns);
    }

    public openPreviewDialog(testRunId: number, testResultId: number, subResultId: number, attachmentSource: string, attachment: IAttachmentDetails): void {
        let fileNameExtension: string = this.getFilenameExtension(attachment.name);

        VSS.using(["TestManagement/Scripts/TFS.TestManagement.PreviewAttachmentHelper"], (
            PreviewAttachmentHelperModule: typeof PreviewAttachmentHelper_LAZY_LOAD
        ) => {
            if (!this._previewAttachmentHelper) {
                this._previewAttachmentHelper = new PreviewAttachmentHelperModule.PreviewAttachmentHelper();
            }
            let options: PreviewAttachmentHelper_LAZY_LOAD.PreviewAttachmentDialogOptions = {
                attachmentSource: attachmentSource,
                testRunId: testRunId,
                testResultId: testResultId,
                subResultId: subResultId,
                filename: attachment.name,
                selectedAttachmentId: attachment.id
            };
            this._previewAttachmentHelper.openPreviewAttachmentDialog(options);
            TelemetryHelper.logTelemetryForPreviewAttachments(attachmentSource, TelemetryService.featurePreviewAttachment_DialogOpened, fileNameExtension, attachment.size);
        },
            (error) => {
                Diag.logWarning(Resources.FailedToOpenPreviewDialog);
                this._handleError(error);
                TelemetryHelper.logTelemetryForPreviewAttachments(attachmentSource, TelemetryService.featurePreviewAttachment_DialogOpenFailed, fileNameExtension, attachment.size);
            }
        );
    }

    public deleteResultAttachments(testRunId: number, testResultId: number, attachmentSource: string, attachments: IAttachmentDetails[]): void {
        this._source.deleteResultAttachments(testRunId, testResultId, attachmentSource, attachments).then((deletedAttachments) => {
            this._actionsHub.afterAttachmentDeleted.invoke(deletedAttachments);
            if (deletedAttachments.length > 0) {
                announce(Utils_String.format(Resources.AnnounceAttachmentsDeleted, deletedAttachments.length));
            }
            if (deletedAttachments.length !== attachments.length) {
                let undeletedAttachments: IAttachmentDetails[] = attachments.filter((x) => { return deletedAttachments.indexOf(x) < 0; });
                let errorMessage: string = Utils_String.format(Resources.UnableToDeleteText, undeletedAttachments.map(x => x.name).join(Resources.CommaSeparator));
                this._handleCustomError(errorMessage);
            }
        }, (error) => {
            this._handleError(error);
        });
    }

    public downloadSelectedAttachments(attachments: IAttachmentDetails[], attachmentSource: string): void {
        attachments.forEach((attachment, index) => {
            const url: string = attachment.url;
            Events_Action.getService().performAction(Events_Action.CommonActions.ACTION_WINDOW_OPEN, {
                url: url,
                target: "_blank"
            });

            // Logging telemetry
            let fileNameExtension: string = this.getFilenameExtension(attachment.name);
            TelemetryService.publishEvents(TelemetryService.featureAttachmentsGridView_DownloadAttachment,
                {
                    "AttachmentSource": attachmentSource,
                    "DownloadAction": "ContextMenuAndDownload",
                    "AttachmentType": fileNameExtension,
                    "SizeInKB": Math.ceil(attachment.size / 1024)
                });
        });

        if (attachments.length > 1) {
            TelemetryService.publishEvents(TelemetryService.featureAttachmentsGridView_MultipleAttachmentsDownloaded,
                {
                    "AttachmentSource": attachmentSource,
                    "NumberOfAttachments": attachments.length
                });
        }
    }

    public clearState(): void {
        this._actionsHub.clearState.invoke(null);
    }

    public getFilenameExtension(filename: string): string {
        let fileNameExtension: string = Utils_String.empty;
        if (filename.indexOf(".") !== -1) {
            fileNameExtension = filename.substring(filename.lastIndexOf("."));
        }
        return fileNameExtension;
    }

    public afterSortAttachments(attachments: IAttachmentDetails[]): void {
        this._actionsHub.afterSort.invoke(attachments);
    }

    public dismissContextualMenu(columns: IColumn[]): void {
        this._actionsHub.dismissContextMenu.invoke(columns);
    }

    public updateContextMenuOpenIndex(openIndex: number): void {
        this._actionsHub.updateContextMenuOpenIndex.invoke(openIndex);
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

    private _previewAttachmentHelper: PreviewAttachmentHelper_LAZY_LOAD.PreviewAttachmentHelper;
}