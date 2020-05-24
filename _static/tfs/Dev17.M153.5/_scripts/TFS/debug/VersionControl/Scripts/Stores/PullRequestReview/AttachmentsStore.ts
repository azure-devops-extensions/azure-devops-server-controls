import { RemoteStore } from "VSS/Flux/Store";
import * as Utils_Array from "VSS/Utils/Array";
import * as Utils_String from "VSS/Utils/String";

import * as VCContracts from "TFS/VersionControl/Contracts";

import * as ServerConstants from "Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants";
import { DiscussionAttachment } from "Presentation/Scripts/TFS/TFS.Discussion.Common";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";

import { AllowedAttachmentExtensions } from "Discussion/Scripts/CommonConstants";
import * as Actions from "VersionControl/Scripts/Actions/PullRequestReview/ActionsHub";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import { IAttachmentsStore, IAttachmentValidation } from "VersionControl/Scripts/Stores/PullRequestReview/IAttachmentsStore";

/**
 * All attachments available on the page. Currently linked by both pr description and comments
 * Attachments are given a unique name that serves as their identifier
 */
export class AttachmentsStore extends RemoteStore implements IAttachmentsStore {
    private _attachments: IDictionaryStringTo<DiscussionAttachment>;
    private static ATTACHMENT_ALLOWED_FILES = AllowedAttachmentExtensions;
    private static MAX_ATTACHMENT_SIZEMB = 25;
    private static MAX_ATTACHMENT_SIZE = AttachmentsStore.MAX_ATTACHMENT_SIZEMB * 1024 * 1024;
    private _accountRenameReplacementMap: IDictionaryStringTo<string> = {};

    // used to test account migration
    public _testOrigin: string;

    constructor() {
        super();

        this._attachments = {};
    }

    public getAttachment(fileName: string): DiscussionAttachment {
        return this._attachments[fileName];
    }

    public getAttachments(): IDictionaryStringTo<DiscussionAttachment> {
        return this._attachments;
    }

    public getAttachmentsByName(attachmentNames: string[]): DiscussionAttachment[] {
        const attachments: DiscussionAttachment[] = [];
        for (const attachmentName of attachmentNames || []) {
            if (this._attachments[attachmentName]) {
                attachments.push(this._attachments[attachmentName]);
            }
        }
        return attachments;
    }

    public getAttachmentsForContent(content: string): DiscussionAttachment[] {
        const attachments: DiscussionAttachment[] = [];
        if (content) {
            for (const attachmentName in this._attachments) {
                const attachment = this._attachments[attachmentName];
                const attachmentUrl = attachment.originalUrl || attachment.url;
                if (content.indexOf(attachmentUrl) >= 0) {
                    attachments.push(attachment);
                }
            }
        }
        return attachments;
    }

    public getAttachmentErrors(): IDictionaryStringTo<string> {
        const attachmentErrorMap: IDictionaryStringTo<string> = {};

        for (const attachmentName in this._attachments) {
            if (this._attachments[attachmentName] && this._attachments[attachmentName].error) {
                attachmentErrorMap[attachmentName] = this._attachments[attachmentName].error;
            }
        }

        return attachmentErrorMap;
    }

    public getAllowedAttachments(): string[] {
        return AttachmentsStore.ATTACHMENT_ALLOWED_FILES;
    }

    public onAttachmentsUpdated(payload: Actions.IAttachmentsUpdatedPayload) {
        for (const attachmentId in payload.attachments) {
            let attachment = payload.attachments[attachmentId];
            this._attachments[attachmentId] = attachment;
        }

        this.emitChanged();
    }

    public onAttachmentCreated(payload: Actions.IAttachmentCreatedPayload) {
        this._attachments[payload.attachment.fileName] = payload.attachment;
        this.emitChanged();
    }

    public onAttachmentCommitted(payload: Actions.IAttachmentCommittedPayload) {
        const originalUrl = this._attachments[payload.fileName] ? this._attachments[payload.fileName].url : undefined;
        this._attachments[payload.fileName] = {
            fileName: payload.fileName,
            url: payload.url,
            originalUrl: originalUrl,
            file: null,
            uploadPromise: undefined,
            uploadFinished: true
        }

        this.emitChanged();
    }

    public onAttachmentError(payload: Actions.IAttachmentErrorPayload) {
        if (this._attachments[payload.fileName]) {
            this._attachments[payload.fileName].error = payload.error;
            this._attachments[payload.fileName].uploadFinished = true;
            this.emitChanged();
        }
    }

    public onAttachmentClearError(payload: Actions.IAttachmentClearErrorPayload) {
        if (this._attachments[payload.fileName]) {
            this._attachments[payload.fileName].error = undefined;
            this.emitChanged();
        }
    }

    public getUniqueFileName = (fileName: string) => {
        fileName = this._stripBadCharacters(fileName);

        let conflict = this._attachments[fileName] != undefined;
        if (!conflict) {
            return fileName;
        }

        let baseName = fileName;
        let ext = "";
        const lastDot = fileName.lastIndexOf('.');
        if (lastDot >= 0) {
            baseName = fileName.substring(0, lastDot);
            ext = fileName.substring(lastDot);
        }

        let count = 2;
        let uniqueName = "";
        while (conflict) {
            uniqueName = baseName + " (" + count + ")" + ext;
            conflict = this._attachments[uniqueName] != undefined;
            ++count;
        }

        return uniqueName;
    }

    public validateFile(fileName: string, file: File): IAttachmentValidation {
        const lastDot = fileName.lastIndexOf('.');
        if (lastDot < 0) {
            return {
                valid: false,
                errorMsg: Utils_String.format(VCResources.AttachmentTypeValidationError, "")
            }
        }
        const ext = fileName.substring(lastDot);

        if (!Utils_Array.contains(AttachmentsStore.ATTACHMENT_ALLOWED_FILES, ext, Utils_String.ignoreCaseComparer)) {
            return {
                valid: false,
                errorMsg: Utils_String.format(VCResources.AttachmentTypeValidationError, ext)
            }
        }

        if (file.size > AttachmentsStore.MAX_ATTACHMENT_SIZE) {
            return {
                valid: false,
                errorMsg: Utils_String.format(VCResources.AttachmentSizeValidationError, AttachmentsStore.MAX_ATTACHMENT_SIZEMB)
            }
        }

        return {
            valid: true
        };
    }

    private _stripBadCharacters(fileName: string): string {
        // based on https://mseng.visualstudio.com/VSOnline/_git/VSO?path=%2FTfs%2FService%2FAdmin%2FWeb%2Fweb.config.template&version=GBmaster&_a=contents&line=191&lineStyle=plain&lineEnd=191&lineStartColumn=48&lineEndColumn=67
        // but also I added $, [, ] because those were messing with markdown
        return fileName.replace(/[\<\>\*\%\&\:\\\?\$\[\]]/g, '.');
    }

}