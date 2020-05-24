import * as Actions from "VersionControl/Scripts/Actions/PullRequestReview/ActionsHub";
import { DiscussionAttachment } from "Presentation/Scripts/TFS/TFS.Discussion.Common";

export interface IAttachmentValidation {
    valid: boolean;
    errorMsg?: string;
}

export abstract class IAttachmentsStore {
    /**
     * Get an attachment by name
     */
    abstract getAttachment(fileName: string): DiscussionAttachment;

    /**
     * Get all attachments on the page
     */
    abstract getAttachments(): IDictionaryStringTo<DiscussionAttachment>;

    /**
     * Get an array of attachments by fileName
     */
    abstract getAttachmentsByName(attachmentNames: string[]): DiscussionAttachment[];

    /**
     * Scan a piece of content to find if it references any attachment urls
     * return all attachments found to be referenced
     */
    abstract getAttachmentsForContent(content: string): DiscussionAttachment[];

    abstract getAttachmentErrors(): IDictionaryStringTo<string>;

    /**
     * Get the supported file types for attachments
     */
    abstract getAllowedAttachments(): string[];

    /**
     * Add a new set of attachments to the store. Called when we query attachments from the server
     */
    abstract onAttachmentsUpdated(payload: Actions.IAttachmentsUpdatedPayload);

    /**
     * Called when the user adds a new attachments
     */
    abstract onAttachmentCreated(payload: Actions.IAttachmentCreatedPayload);

    /**
     * Called when an attachment has been committed to the server.
     * The server will return with the real url instead of the placeholder blob url we were using before
     */
    abstract onAttachmentCommitted(payload: Actions.IAttachmentCommittedPayload);

    abstract onAttachmentError(payload: Actions.IAttachmentErrorPayload);

    abstract onAttachmentClearError(payload: Actions.IAttachmentClearErrorPayload);

    /**
     * Given a file name, returns a unique version that won't cause collissions with any other attachments
     * example, if thre is already an attachment called image.png and you pass in another image.png,
     * you will get back image (2).png
     */
    abstract getUniqueFileName;

    abstract validateFile(fileName: string, file: File): IAttachmentValidation;

    abstract addChangedListener(handler: IEventHandler);
    abstract removeChangedListener(handler: IEventHandler);

    static getServiceName(): string { return "IAttachmentsStore"; }
}