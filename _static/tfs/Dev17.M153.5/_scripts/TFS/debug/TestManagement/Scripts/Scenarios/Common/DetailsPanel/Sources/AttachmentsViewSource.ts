import * as Q from "q";
import * as Resources from "TestManagement/Scripts/Resources/TFS.Resources.TestManagement";
import * as TMUtils from "TestManagement/Scripts/TFS.TestManagement.Utils";
import * as TCMContracts from "TFS/TestManagement/Contracts";
import * as Diag from "VSS/Diag";

export class AttachmentsViewSource {

    public getAttachments(testRunId: number, testResultId: number, subResultId: number, attachmentSource: string): IPromise<TCMContracts.TestAttachment[]> {
        const deferred = Q.defer<TCMContracts.TestAttachment[]>();
        if (attachmentSource === TMUtils.AttachmentSource.testRun) {
            TMUtils.getTestRunManager().getTestRunAttachments2(testRunId).then(
                (testRunAttachments: TCMContracts.TestAttachment[]) => {
                    deferred.resolve(testRunAttachments);
                },
                (error) => {
                    Diag.logWarning(Resources.FailedToFetchAttachments);
                    deferred.reject(error);
                });
        } else {
            if (subResultId > 0) {
                TMUtils.getTestResultManager().getTestSubResultsAttachments(testRunId, testResultId, subResultId).then(
                    (testSubResultAttachments) => {
                        deferred.resolve(testSubResultAttachments);
                    },
                    (error) => {
                        Diag.logWarning(Resources.FailedToFetchAttachments);
                        deferred.reject(error);
                    });
            } else {
                TMUtils.getTestResultManager().getTestResultAttachments2(testRunId, testResultId).then(
                    (testResultAttachments) => {
                        deferred.resolve(testResultAttachments);
                    },
                    (error) => {
                        Diag.logWarning(Resources.FailedToFetchAttachments);
                        deferred.reject(error);
                    });
            }
        }

        return deferred.promise;
    }

    public loadAttachmentContent(attachmentId: number, testRunId: number, testResultId: number, subResultId: number, attachmentSource: string): IPromise<ArrayBuffer> {
        if (attachmentSource === TMUtils.AttachmentSource.testRun) {
            return TMUtils.getTestRunManager().getTestRunAttachmentContent(testRunId, attachmentId);
        } else {
            if (subResultId > 0) {
                return TMUtils.getTestResultManager().getTestSubResultsAttachmentContent(testRunId, testResultId, attachmentId, subResultId);
            } else {
                return TMUtils.getTestResultManager().getTestResultAttachmentContent(testRunId, testResultId, attachmentId);
            }
        }
    }

    public deleteResultAttachments(
        testRunId: number, testResultId: number,
        attachmentSource: string,
        attachments: TCMContracts.TestAttachment[]
    ): IPromise<TCMContracts.TestAttachment[]> {
        let count = attachments.length;
        const deferred = Q.defer<TCMContracts.TestAttachment[]>();
        const deletedAttachments: TCMContracts.TestAttachment[] = [];
        attachments.forEach((attachment, index) => {
            TMUtils.getTestResultManager().deleteAttachment(
                attachment.id,
                testRunId,
                testResultId,
                () => {
                    deletedAttachments.push(attachment);
                    count--;
                    if (count === 0) {
                        deferred.resolve(deletedAttachments);
                    }
                },
                (error) => {
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
