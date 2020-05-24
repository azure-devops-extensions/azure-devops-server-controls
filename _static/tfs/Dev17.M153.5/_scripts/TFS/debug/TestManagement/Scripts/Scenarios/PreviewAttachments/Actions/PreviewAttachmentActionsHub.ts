import VCBuiltInExtensions = require("VersionControl/Scripts/BuiltInExtensions");
import { Action } from "VSS/Flux/Action";

export interface IAttachmentsLoadedOptions {
    selectedAttachmentId: number;
    attachments: any[];
    extensionHost: VCBuiltInExtensions.BuiltInExtensionHost;
}

export interface IAttachmentsInfo {
    attachmentId: number;
    filename: string;
    url: string;
}

export class PreviewAttachmentActionsHub{
    public closeDialog = new Action<void>();
    public onError = new Action<string>();
    public onErrorMessageClose = new Action<void>();
    public downloadAttachment = new Action<void>();
    public attachmentsLoaded = new Action<IAttachmentsLoadedOptions>();
    public beforeAttachmentContentFetched = new Action<IAttachmentsInfo>();
    public afterAttachmentContentFetched = new Action<IAttachmentsInfo>();
    public setLoadingState = new Action<boolean>();
    public setUnableToPreviewState = new Action<boolean>();
    public updateUnableToPreviewErrorMessage = new Action<string>();
    public setExtensionHostConfiguration = new Action<string>();
    public updateCurrentIndex = new Action<number>();
}