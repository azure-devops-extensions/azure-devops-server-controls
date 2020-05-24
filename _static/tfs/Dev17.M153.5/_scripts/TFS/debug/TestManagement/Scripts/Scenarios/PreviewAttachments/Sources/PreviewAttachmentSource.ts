import * as Q from "q";
import * as Resources from "TestManagement/Scripts/Resources/TFS.Resources.TestManagement";
import * as TMUtils from "TestManagement/Scripts/TFS.TestManagement.Utils";
import * as CommonUtils from "TestManagement/Scripts/Scenarios/Common/CommonUtils";
import TCMContracts = require("TFS/TestManagement/Contracts");
import * as Diag from "VSS/Diag";

export class PreviewAttachmentSource {

    public loadAttachments(testRunId: number,
        testResultId: number,
        subResultId: number,
        attachmentSource: string): IPromise<CommonUtils.IExtendedComboBoxOption[]> {
        let deferred = Q.defer<CommonUtils.IExtendedComboBoxOption[]>();
        let attachments: CommonUtils.IExtendedComboBoxOption[] = [];
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

        restAPI.then((testAttachments: TCMContracts.TestAttachment[]) => {
            for (let i = 0; i < testAttachments.length; i++) {
                attachments.push({
                    key: testAttachments[i].id,
                    text: testAttachments[i].fileName,
                    url: testAttachments[i].url
                });
            }
            deferred.resolve(attachments);
        }, (error) => {
            Diag.logWarning(Resources.FailedToFetchAttachments);
            deferred.reject(null);
        });

        return deferred.promise;
}

    public loadAttachmentContent(attachmentId: number,
        testRunId: number,
        testResultId: number,
        subResultId: number,
        attachmentSource: string): IPromise<ArrayBuffer> {
        if (attachmentSource === TMUtils.AttachmentSource.testRun) {
            return TMUtils.getTestRunManager().getTestRunAttachmentContent(testRunId, attachmentId);
        } else {
            if (subResultId > 0){
                return TMUtils.getTestResultManager().getTestSubResultsAttachmentContent(testRunId, testResultId, attachmentId, subResultId);
            } else {
                return TMUtils.getTestResultManager().getTestResultAttachmentContent(testRunId, testResultId, attachmentId);
            }
        }
    }
}
