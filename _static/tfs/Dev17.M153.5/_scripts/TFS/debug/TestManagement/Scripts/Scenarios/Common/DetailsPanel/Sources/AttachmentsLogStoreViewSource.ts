import * as Q from "q";
import * as Resources from "TestManagement/Scripts/Resources/TFS.Resources.TestManagement";
import TCM_Types = require("TestManagement/Scripts/TFS.TestManagement.Types");
import * as TCMContracts from "TFS/TestManagement/Contracts";
import * as TMService from "TestManagement/Scripts/TFS.TestManagement.Service";
import * as Diag from "VSS/Diag";
import * as AttachmentOM from "TestManagement/Scripts/Scenarios/LogStore/TestAttachmentModel";
import * as TMUtils from "TestManagement/Scripts/TFS.TestManagement.Utils";

export class AttachmentsLogStoreViewSource {

    public getLogStoreAttachments(testRunId: number, testResultId: number, subResultId: number,
        attachmentSource: string, type: TCMContracts.TestLogType): IPromise<TCMContracts.TestLog[]> {
        const deferred = Q.defer<TCMContracts.TestLog[]>();
        if (attachmentSource === TMUtils.AttachmentSource.testRun) {
            this.getTestRunLogs(testRunId, type).then(
                (attachments: TCMContracts.TestLog[]) => {
                    deferred.resolve(attachments);
                },
                (error) => {
                    deferred.reject(error);
                }
            );
        } else {
            if (subResultId > 0) {
                this.getTestSubResultLogs(testRunId, testResultId, subResultId, type).then(
                    (testSubResultAttachments) => {
                        deferred.resolve(testSubResultAttachments);
                    },
                    (error) => {
                        deferred.reject(error);
                    });
            } else {
                this.getTestResultLogs(testRunId, testResultId, type).then(
                    (testResultAttachments) => {
                        deferred.resolve(testResultAttachments);
                    },
                    (error) => {
                        deferred.reject(error);
                    });
            }
        }

        return deferred.promise;
    }

    public getTestRunLogs(runId: number, type: TCMContracts.TestLogType): IPromise<TCMContracts.TestLog[]> {
        const deferred = Q.defer<TCMContracts.TestLog[]>();

        if (TMService.ServiceManager.instance().tcmResultsService()) {
            TMService.ServiceManager.instance().tcmResultsService().getTestRunLogs(runId, type).then(
                (testRunAttachments: TCM_Types.ITestLogWithContinuationToken) => {
                    deferred.resolve(testRunAttachments.results);
                },
                (error) => {
                    Diag.logWarning(Resources.FailedToFetchAttachments);
                    deferred.reject(error);
                });
        }
        else {
            deferred.reject({ info: Resources.ServiceFailedToFetchAttachments });
        }

        return deferred.promise;
    }

    public getTestResultLogs(runId: number, resultId: number, type: TCMContracts.TestLogType): IPromise<TCMContracts.TestLog[]> {
        const deferred = Q.defer<TCMContracts.TestLog[]>();

        if (TMService.ServiceManager.instance().tcmResultsService()) {
            TMService.ServiceManager.instance().tcmResultsService().getTestResultLogs(runId, resultId, type).then(
                (testRunAttachments: TCM_Types.ITestLogWithContinuationToken) => {
                    deferred.resolve(testRunAttachments.results);
                },
                (error) => {
                    Diag.logWarning(Resources.FailedToFetchAttachments);
                    deferred.reject(error);
                });
        }
        else {
            deferred.reject({ info: Resources.ServiceFailedToFetchAttachments });
        }
        return deferred.promise;
    }

    public getTestSubResultLogs(runId: number, resultId: number, subResultId: number, type: TCMContracts.TestLogType): IPromise<TCMContracts.TestLog[]> {
        const deferred = Q.defer<TCMContracts.TestLog[]>();

        if (TMService.ServiceManager.instance().tcmResultsService()) {
            TMService.ServiceManager.instance().tcmResultsService().getTestSubResultLogs(runId, resultId, subResultId, type).then(
                (testRunAttachments: TCM_Types.ITestLogWithContinuationToken) => {
                    deferred.resolve(testRunAttachments.results);
                },
                (error) => {
                    Diag.logWarning(Resources.FailedToFetchAttachments);
                    deferred.reject(error);
                });
        }
        else {
            deferred.reject({ info: Resources.ServiceFailedToFetchAttachments });
        }
        return deferred.promise;
    }

    public getTestLogStoreEndpointDetailsForAttachment(attachment: TCMContracts.TestLog, attachmentSource: string): IPromise<TCMContracts.TestLogStoreEndpointDetails> {
        const deferred = Q.defer<TCMContracts.TestLogStoreEndpointDetails>();
        if (attachmentSource === TMUtils.AttachmentSource.testRun) {
            this.getTestLogStoreEndpointDetailsForRunLog(attachment.logReference.runId, attachment.logReference.type, attachment.logReference.filePath).then(
                (endpoint: TCMContracts.TestLogStoreEndpointDetails) => {
                    deferred.resolve(endpoint);
                },
                (error) => {
                    deferred.reject(error);
                }
            );
        } else {
            if (attachment.logReference.subResultId <= 0) {
                this.getTestLogStoreEndpointDetailsForResultLog(attachment.logReference.runId, attachment.logReference.resultId, attachment.logReference.type, attachment.logReference.filePath).then(
                    (endpoint: TCMContracts.TestLogStoreEndpointDetails) => {
                        deferred.resolve(endpoint);
                    },
                    (error) => {
                        deferred.reject(error);
                    }
                );
            } else {
                this.getTestLogStoreEndpointDetailsForSubResultLog(attachment.logReference.runId, attachment.logReference.resultId, attachment.logReference.subResultId, attachment.logReference.type, attachment.logReference.filePath).then(
                    (endpoint: TCMContracts.TestLogStoreEndpointDetails) => {
                        deferred.resolve(endpoint);
                    },
                    (error) => {
                        deferred.reject(error);
                    }
                );
            }
        }
        return deferred.promise;
    }

    public getTestLogStoreEndpointDetailsForRunLog(runId: number, type: TCMContracts.TestLogType, filePath: string): IPromise<TCMContracts.TestLogStoreEndpointDetails> {
        const deferred = Q.defer<TCMContracts.TestLogStoreEndpointDetails>();
        if (TMService.ServiceManager.instance().tcmResultsService()) {
            TMService.ServiceManager.instance().tcmResultsService().getTestLogStoreEndpointDetailsForRunLog(runId, type, filePath).then(
                (endPoint: TCMContracts.TestLogStoreEndpointDetails) => {
                    deferred.resolve(endPoint);
                },
                (error) => {
                    Diag.logWarning(Resources.FailedToFetchAttachments);
                    deferred.reject(error);
                });
        }
        else {
            deferred.reject({ info: Resources.ServiceFailedToFetchAttachments });
        }
        return deferred.promise;
    }

    public getTestLogStoreEndpointDetailsForResultLog(runId: number, resultId: number, type: TCMContracts.TestLogType, filePath: string): IPromise<TCMContracts.TestLogStoreEndpointDetails> {
        const deferred = Q.defer<TCMContracts.TestLogStoreEndpointDetails>();
        if (TMService.ServiceManager.instance().tcmResultsService()) {
            TMService.ServiceManager.instance().tcmResultsService().getTestLogStoreEndpointDetailsForResultLog(runId, resultId, type, filePath).then(
                (endPoint: TCMContracts.TestLogStoreEndpointDetails) => {
                    deferred.resolve(endPoint);
                },
                (error) => {
                    Diag.logWarning(Resources.FailedToFetchAttachments);
                    deferred.reject(error);
                });
        }
        else {
            deferred.reject({ info: Resources.ServiceFailedToFetchAttachments });
        }
        return deferred.promise;
    }

    public getTestLogStoreEndpointDetailsForSubResultLog(runId: number, resultId: number, subResultId: number, type: TCMContracts.TestLogType, filePath: string): IPromise<TCMContracts.TestLogStoreEndpointDetails> {
        const deferred = Q.defer<TCMContracts.TestLogStoreEndpointDetails>();
        if (TMService.ServiceManager.instance().tcmResultsService()) {
            TMService.ServiceManager.instance().tcmResultsService().getTestLogStoreEndpointDetailsForSubResultLog(runId, resultId, subResultId, type, filePath).then(
                (endPoint: TCMContracts.TestLogStoreEndpointDetails) => {
                    deferred.resolve(endPoint);
                },
                (error) => {
                    Diag.logWarning(Resources.FailedToFetchAttachments);
                    deferred.reject(error);
                });
        }
        else {
            deferred.reject({ info: Resources.ServiceFailedToFetchAttachments });
        }
        return deferred.promise;
    }
}
