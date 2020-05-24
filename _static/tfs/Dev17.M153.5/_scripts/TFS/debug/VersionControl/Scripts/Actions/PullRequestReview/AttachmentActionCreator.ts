import * as Q from "q";
import { autobind } from "OfficeFabric/Utilities";

import * as Actions from "VersionControl/Scripts/Actions/PullRequestReview/ActionsHub";

import VCResources = require("VersionControl/Scripts/Resources/TFS.Resources.VersionControl");
import { DiscussionAttachment } from "Presentation/Scripts/TFS/TFS.Discussion.Common";

import { IAttachmentSource } from "VersionControl/Scripts/Sources/IAttachmentSource";
import { ServiceRegistry } from "VersionControl/Scenarios/Shared/ServiceRegistry";
import { IAttachmentsStore } from "VersionControl/Scripts/Stores/PullRequestReview/IAttachmentsStore";
import { IAttachmentActionCreator } from "VersionControl/Scripts/Actions/PullRequestReview/IAttachmentActionCreator";

export class AttachmentActionCreator implements IAttachmentActionCreator {
    private _actionsHub: Actions.ActionsHub;

    constructor(
        actionsHub: Actions.ActionsHub) {
        this._actionsHub = actionsHub;
    }

    public queryAttachments() {
        const attachmentSource = ServiceRegistry.getService(IAttachmentSource);
        attachmentSource.queryAttachmentsAsync()
            .then(attachments => {
                this._actionsHub.attachmentsUpdated.invoke({
                    attachments: attachments
                });
            })
            .then(undefined, this.raiseError);
    }

    public addAttachment(attachment: DiscussionAttachment): void {
        //Begin uploading it immediately, and replace the attachment url with the real one once it is done
        const attachmentSource = ServiceRegistry.getService(IAttachmentSource);
        attachment.uploadPromise = attachmentSource.createAttachment(attachment.file, attachment.fileName).then(savedAttachment => {
            this._actionsHub.attachmentCommitted.invoke({
                fileName: attachment.fileName,
                url: savedAttachment.url
            });

            return savedAttachment.url;
        }).then(undefined, error => {
            this._actionsHub.attachmentError.invoke({
                fileName: attachment.fileName,
                error: error
            });

            //re-throw the error so that the promise is rejected
            throw error;
        });

        //Notify that an attachment has been created
        this._actionsHub.attachmentCreated.invoke({
            attachment: attachment
        });
    }

    public commitAttachments(content: string): IPromise<IDictionaryStringTo<string>> {
        const attachmentStore = ServiceRegistry.getService(IAttachmentsStore);
        const attachments = attachmentStore.getAttachmentsForContent(content);

        if (attachments && attachments.length > 0) {
            const unfinishedAttachmentPromises = attachments.filter(a => a.uploadPromise !== undefined && a.uploadFinished !== true).map(a => a.uploadPromise);

            //find all the attachments that have errors
            const attachmentsWithErrors = attachments.filter(a => a.error != undefined);

            //first, retry any attachments that have errors
            for (const failedAttachment of attachmentsWithErrors) {

                //clear the current error and retry the upload
                this._actionsHub.attachmentClearError.invoke({
                    fileName: failedAttachment.fileName
                });

                //if the attachment is still referenced, retry the upload, otherwise it should just be ignored
                if (content.indexOf(failedAttachment.url) >= 0) {
                    const attachmentSource = ServiceRegistry.getService(IAttachmentSource);
                    unfinishedAttachmentPromises.push(attachmentSource.createAttachment(failedAttachment.file, failedAttachment.fileName).then(savedAttachment => {
                        this._actionsHub.attachmentCommitted.invoke({
                            fileName: failedAttachment.fileName,
                            url: savedAttachment.url
                        });

                        return savedAttachment.url;
                    }).then(undefined, error => {
                        this._actionsHub.attachmentError.invoke({
                            fileName: failedAttachment.fileName,
                            error: error
                        });

                        //re-throw the error so that the promise is rejected
                        throw error;
                    }));
                }
            }

            //now wait for all attachments to make an attempt
            return Q.all(unfinishedAttachmentPromises).then(placeholder => {
                //re-get the attachment lists form the store to have up to date data after all promises have finished
                const attachments = attachmentStore.getAttachmentsForContent(content);

                const anyErrors = attachments.filter(a => a.error != undefined && content.indexOf(a.url) >= 0).length > 0;
                if (anyErrors) {
                    throw VCResources.AttachmentError;
                }

                const replacementMap: IDictionaryStringTo<string> = {};

                for (const attachment of attachments) {
                    const oldUrl = attachment.originalUrl;
                    const newUrl = attachment.url;
                    if (newUrl && oldUrl && attachment.error == undefined) {
                        replacementMap[oldUrl] = newUrl;
                    }
                }

                return replacementMap;
            });
        }
        else {
            return Q.resolve({});
        }
    }

    @autobind
    public raiseError(error: any): void {
        this._actionsHub.raiseError.invoke(error);
    }
}