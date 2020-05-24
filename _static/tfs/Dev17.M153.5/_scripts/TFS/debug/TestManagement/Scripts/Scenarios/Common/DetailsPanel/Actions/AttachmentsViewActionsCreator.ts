import * as Q from "q";
import * as Resources from "TestManagement/Scripts/Resources/TFS.Resources.TestManagement";
import {
    AttachmentsViewActionsHub,
} from "TestManagement/Scripts/Scenarios/Common/DetailsPanel/Actions/AttachmentsViewActionsHub";
import { AttachmentsViewSource } from "TestManagement/Scripts/Scenarios/Common/DetailsPanel/Sources/AttachmentsViewSource";
import { TestTabTelemetryService } from "TestManagement/Scripts/Scenarios/TestTabExtension/Telemetry";
import * as TCMContracts from "TFS/TestManagement/Contracts";
import * as VCBuiltInExtensions from "VersionControl/Scripts/BuiltInExtensions";
import * as Diag from "VSS/Diag";
import * as Events_Action from "VSS/Events/Action";
import * as Utils_String from "VSS/Utils/String";
import * as AttachmentOM from "TestManagement/Scripts/Scenarios/LogStore/TestAttachmentModel";
import TCMLicenseAndFeatureFlagUtils = require("TestManagement/Scripts/Utils/TFS.TestManagement.LicenseAndFeatureFlagUtils");
import { AttachmentsLogStoreViewSource } from "TestManagement/Scripts/Scenarios/Common/DetailsPanel/Sources/AttachmentsLogStoreViewSource";

export class AttachmentsViewActionsCreator {
    constructor(private _actionsHub: AttachmentsViewActionsHub, private _source: AttachmentsViewSource, private _sourceLogStore: AttachmentsLogStoreViewSource) {
    }

    public setDefaultState(): void {
        this._actionsHub.setDefaultState.invoke(null);
    }

    public getAttachments(testRunId: number, testResultId: number, subResultId: number, attachmentSource: string): void {
        if (!TCMLicenseAndFeatureFlagUtils.LicenseAndFeatureFlagUtils.isLogStoreAttachmentsEnabled()) {
            // Legacy attachment flow
            this._source.getAttachments(testRunId, testResultId, subResultId, attachmentSource).then(
                (attachments: TCMContracts.TestAttachment[]) => {
                    this._loadAttachments(attachments, attachmentSource);
                },
                (error) => {
                    if (error !== null) {
                        this._actionsHub.onError.invoke(error.info || error.message || error.toString());
                    } else {
                        this._actionsHub.onError.invoke(error);
                    }
                }
            );
        }
        else {
            Q.all([this._source.getAttachments(testRunId, testResultId, subResultId, attachmentSource),
            this._sourceLogStore.getLogStoreAttachments(testRunId, testResultId, subResultId, attachmentSource, TCMContracts.TestLogType.GeneralAttachment)]).spread(
                (attachments: TCMContracts.TestAttachment[], logStoreAttachments: TCMContracts.TestLog[]) => {
                    if (attachments && attachments.length > 0) {
                        this._loadAttachments(attachments, attachmentSource);
                    }
                    else {
                        this._loadLogStoreAttachments(logStoreAttachments, attachmentSource);
                    }

                }, (error) => {
                    if (error !== null) {
                        this._actionsHub.onError.invoke(error.info || error.message || error.toString());
                    } else {
                        this._actionsHub.onError.invoke(error);
                    }
                });
        }
    }

    public downloadSelectedAttachments(attachments: TCMContracts.TestAttachment[], attachmentSource: string): void {
        attachments.forEach((attachment, index) => {
            this._launchUrl(attachment.url);
        });

        TestTabTelemetryService.getInstance().publishDetailsPaneEvents(TestTabTelemetryService.featureTestTab_AttachmentDownloadedCount, { "count": attachments.length });
    }

    public downloadSelectedLogStoreAttachments(attachments: TCMContracts.TestLog[], attachmentSource: string): void {
        attachments.forEach((attachment, index) => {
            this._sourceLogStore.getTestLogStoreEndpointDetailsForAttachment(attachment, attachmentSource).then(
                (endpoint: TCMContracts.TestLogStoreEndpointDetails) => {;
                    this._launchUrl(endpoint.endpointSASUri);
                },
                (error) => {
                    if (error !== null) {
                        this._actionsHub.onError.invoke(error.info || error.message || error.toString());
                    } else {
                        this._actionsHub.onError.invoke(error);
                    }
                }
            )
        });

        TestTabTelemetryService.getInstance().publishDetailsPaneEvents(TestTabTelemetryService.featureTestTab_AttachmentDownloadedCount, { "count": attachments.length });
    }

    public setExtensionHost(extHost: VCBuiltInExtensions.BuiltInExtensionHost): void {
        this._actionsHub.setExtensionHost.invoke(extHost);
    }

    public showAttachmentPreview(
        attachmentId: number,
        testRunId: number,
        testResultId: number,
        subResultId: number,
        attachmentSource: string
    ): void {
        this._source.loadAttachmentContent(attachmentId, testRunId, testResultId, subResultId, attachmentSource).then(
            (attachmentContent: ArrayBuffer) => {
                this._parseContentBuffer(attachmentContent, (result: string) => {
                    this._actionsHub.showAttachmentPreview.invoke(result);
                });
            },
            (error) => {
                // Error handling
            }
        );
    }

    public deleteAttachments(testRunId: number, testResultId: number, subResultId: number, attachmentSource: string, attachments: TCMContracts.TestAttachment[]) {
        this._source.deleteResultAttachments(testRunId, testResultId, attachmentSource, attachments).then(
            (deletedAttachments) => {
                this._source.getAttachments(testRunId, testResultId, subResultId, attachmentSource).then(
                    (updatedAttachments: TCMContracts.TestAttachment[]) => {
                        // Merge logic here. - shaiku
                        let attachmentsOM = new AttachmentOM.TestAttachmentModel();
                        attachmentsOM.setLegacyAttachments(updatedAttachments);
                        this._actionsHub.attachmentsLoaded.invoke(attachmentsOM);
                    },
                    (error) => {
                        if (error !== null) {
                            this._actionsHub.onError.invoke(error.info || error.message || error.toString());
                        } else {
                            this._actionsHub.onError.invoke(error);
                        }
                    }
                );
            },
            (error) => {
                // Error handling
            }
        );

        TestTabTelemetryService.getInstance().publishDetailsPaneEvents(TestTabTelemetryService.featureTestTab_AttachmentDeletedCount, { "count": attachments.length });
    }

    public updateContextMenuOpenIndex(openIndex: number): void {
        this._actionsHub.updateContextMenuOpenIndex.invoke(openIndex);
    }

    public setLastSelectedAttachment(attachment: TCMContracts.TestAttachment): void {
        this._actionsHub.setLastSelectedAttachment.invoke(attachment);
    }

    public setAttachmentContentLoading(showAttachmentContentLoadingSpinner: boolean): void {
        this._actionsHub.setAttachmentContentLoading.invoke(showAttachmentContentLoadingSpinner);
    }

    public closeErrorMessage(): void {
        this._actionsHub.closeErrorMessage.invoke(null);
    }

    private _sendAttachmentFileExtensionTypeTelementry(attachments: TCMContracts.TestAttachment[], attachmentSource: string): void {
        // Send telemetry for counts of each attachment type
        if (attachments.length > 0) {
            let fileNameExtensionDictionary: IDictionaryStringTo<number> = {};
            attachments.forEach(attachment => {
                const fileExtension: string = this._getFilenameExtension(attachment.fileName);
                fileNameExtensionDictionary[fileExtension] = fileNameExtensionDictionary[fileExtension]
                    ? fileNameExtensionDictionary[fileExtension] + 1
                    : 1;
            });
            TestTabTelemetryService.getInstance().publishEvents(TestTabTelemetryService.featureTestTab_AttachmentsExtensionType, fileNameExtensionDictionary);
        }

        // Telemetry for attachment count and if it is for test results or test run
        TestTabTelemetryService.getInstance().publishEvents(TestTabTelemetryService.featureTestTab_AttachmentsCount, {
            "count": attachments.length,
            "source": attachmentSource
        });
    }

    private _sendAttachmentFileExtensionTypeTelementryForLogStore(attachments: TCMContracts.TestLog[], attachmentSource: string): void {
        // Send telemetry for counts of each attachment type
        if (attachments.length > 0) {
            let fileNameExtensionDictionary: IDictionaryStringTo<number> = {};
            attachments.forEach(attachment => {
                const fileExtension: string = this._getFilenameExtension(attachment.logReference.filePath);
                fileNameExtensionDictionary[fileExtension] = fileNameExtensionDictionary[fileExtension]
                    ? fileNameExtensionDictionary[fileExtension] + 1
                    : 1;
            });
            TestTabTelemetryService.getInstance().publishEvents(TestTabTelemetryService.featureTestTab_AttachmentsExtensionType, fileNameExtensionDictionary);
        }

        // Telemetry for attachment count and if it is for test results or test run
        TestTabTelemetryService.getInstance().publishEvents(TestTabTelemetryService.featureTestTab_AttachmentsCount, {
            "count": attachments.length,
            "source": attachmentSource
        });
    }

    private _getFilenameExtension(filename: string): string {
        let fileNameExtension: string = Utils_String.empty;
        if (filename.indexOf(".") !== -1) {
            fileNameExtension = filename.substring(filename.lastIndexOf("."));
        }
        return fileNameExtension;
    }

    private _parseContentBuffer(content: ArrayBuffer, callback): void {
        let readChunk = null;

        const readEventHandler = (evt) => {
            if (evt.target.error === null) {
                callback(evt.target.result);
                return;
            } else {
                Diag.logWarning(Resources.FailedToReadFile);
                return;
            }
        };

        readChunk = (_content: ArrayBuffer) => {
            const reader = new FileReader();
            const blob = new Blob([new Uint8Array(_content)]);
            reader.onload = readEventHandler;
            reader.readAsText(blob);
        };

        readChunk(content);
    }

    private _loadAttachments(attachments: TCMContracts.TestAttachment[], attachmentSource: string) {
        let attachmentsOM = new AttachmentOM.TestAttachmentModel();
        attachmentsOM.setLegacyAttachments(attachments);
        this._actionsHub.attachmentsLoaded.invoke(attachmentsOM);
        // Send telemetry
        this._sendAttachmentFileExtensionTypeTelementry(attachments, attachmentSource);
    }

    private _loadLogStoreAttachments(attachments: TCMContracts.TestLog[], attachmentSource: string) {
        let attachmentsOM = new AttachmentOM.TestAttachmentModel();
        attachmentsOM.setLogStoreAttachments(attachments);
        this._actionsHub.attachmentsLoaded.invoke(attachmentsOM);
        // Send telemetry
        this._sendAttachmentFileExtensionTypeTelementryForLogStore(attachments, attachmentSource);
    }

    private _launchUrl(url: string): void {
        Events_Action.getService().performAction(Events_Action.CommonActions.ACTION_WINDOW_OPEN, {
            url: url,
            target: "_blank"
        });
    }
}
