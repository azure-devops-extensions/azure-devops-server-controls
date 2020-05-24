import { DiscussionAttachment } from "Presentation/Scripts/TFS/TFS.Discussion.Common";
import { Attachment } from "TFS/VersionControl/Contracts";

export abstract class IAttachmentSource {
    abstract queryAttachmentsAsync(): IPromise<IDictionaryStringTo<DiscussionAttachment>>;
    abstract createAttachment(content: File, fileName: string): IPromise<Attachment>;

    /**
     * Get the name of this interface so that it can be indexed by type name
     */
    static getServiceName(): string { return "IAttachmentSource"; }
}