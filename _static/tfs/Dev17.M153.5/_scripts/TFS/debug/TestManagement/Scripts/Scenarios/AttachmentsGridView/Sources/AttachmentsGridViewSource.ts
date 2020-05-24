import * as Q from "q";
import * as Resources from "TestManagement/Scripts/Resources/TFS.Resources.TestManagement";
import {
    IAttachmentDetails
} from "TestManagement/Scripts/Scenarios/AttachmentsGridView/Actions/AttachmentsGridViewActionsHub";
import * as TMUtils from "TestManagement/Scripts/TFS.TestManagement.Utils";
import * as Diag from "VSS/Diag";

export class AttachmentsGridViewSource {

    public loadAttachments(testRunId: number,
        testResultId: number,
        attachmentSource: string,
        subResultId: number): IPromise<IAttachmentDetails[]> {
        let deferred = Q.defer<IAttachmentDetails[]>();
        let attachments: IAttachmentDetails[] = [];
        let restAPI = null;
        if (attachmentSource === TMUtils.AttachmentSource.testRun) {
            restAPI = TMUtils.getTestRunManager().getTestRunAttachments2(testRunId);
        }
        else {
            if (subResultId > 0){
                restAPI = TMUtils.getTestResultManager().getTestSubResultsAttachments(testRunId, testResultId, subResultId);
            } else {
                restAPI = TMUtils.getTestResultManager().getTestResultAttachments2(testRunId, testResultId);
            }
        }

        restAPI.then(
                (testResultAttachments) => {
                    for (let i = 0; i < testResultAttachments.length; i++) {
                        attachments.push({
                            id: testResultAttachments[i].id,
                            name: testResultAttachments[i].fileName,
                            size: testResultAttachments[i].size ? testResultAttachments[i].size : 0,
                            creationDate: testResultAttachments[i].createdDate,
                            comment: testResultAttachments[i].comment,
                            url: testResultAttachments[i].url
                        });
                    }
                    deferred.resolve(attachments);
                },
                (error) => {
                    Diag.logWarning(Resources.FailedToFetchAttachments);
                    deferred.reject(error);
                });
        return deferred.promise;
    }

    public deleteResultAttachments(testRunId: number, testResultId: number, attachmentSource: string, attachments: IAttachmentDetails[]): IPromise<IAttachmentDetails[]> {
        let count = attachments.length;
        let deferred = Q.defer<IAttachmentDetails[]>();
        let deletedAttachments: IAttachmentDetails[] = [];
        attachments.forEach((attachment, index) => {
            TMUtils.getTestResultManager().deleteAttachment(attachment.id, testRunId, testResultId, () => {
                deletedAttachments.push(attachment);
                count--;
                if (count === 0) {
                    deferred.resolve(deletedAttachments);
                }
            }, (error) => {
                count--;
                if (count === 0) {
                    deferred.resolve(deletedAttachments);
                }
                Diag.logWarning(error);
            });
        });

        return deferred.promise;
    }
}
