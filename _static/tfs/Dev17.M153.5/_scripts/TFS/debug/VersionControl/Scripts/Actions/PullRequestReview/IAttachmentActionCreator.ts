import { DiscussionAttachment } from "Presentation/Scripts/TFS/TFS.Discussion.Common";

export abstract class IAttachmentActionCreator {
    /**
     * query the server for all attachments and populate the server
     */
    abstract queryAttachments();

    /**
     * add a new attachment to the store and begin uploading the file to the server
     */
    abstract addAttachment(attachment: DiscussionAttachment): void;

    /**
     * This is used by other action creators that depend on attachments succeeding before committing their own stuff
     * It returns a url replacement map blobUrl -> real url or throws an error if any attachments failed
     *
     * This does not take in a list of expected attachments. It instead scans the content to see if they contain urls pointing to known attachments
     * The reason for this is so that if you copy/paste text from one unsaved comment to another and that copied text contains the temporary blob url
     * of an attachment, that we block on that attachment from the first comment finishing its upload and do url conversion before saving the comment to
     * enforce that it ends up in a good state.
     *
     * There is a remaining flaw here, which is that the error messaging system is based on the pendingAttachment properties of the various components
     * Consider the situation where you start writing comment A where you pase an image. You then, without saving the comment, cut and paste the text
     * including the temporary blob url for the pasted image into the description of the PR. You then save the new description and cancel the original
     * comment. Let's also assume that the upload of the image failed for some reason. Ideally, we would detect this situation and post an error to
     * the description saying that the attachment failed. But I don't see a way to do that without continually scanning all of the text entered into comments
     * and description all the time. That would be a perf bottleneck and I expect this would be a rather rare situation not worth optimizing around.
     * So instead I opted to knowingly accept a potentially missing error message in these more obscure scenarios and just make sure that when comitting
     * content to the server, it is always in a good place.
     */
    abstract commitAttachments(content: string): IPromise<IDictionaryStringTo<string>>;

    /**
     * Raise an application error. This could be a typical JS error or some text.
     */
    abstract raiseError(error: any): void;

    /**
     * Get the name of this interface so that it can be indexed by type name
     */
    static getServiceName(): string { return "IAttachmentActionCreator"; }
}