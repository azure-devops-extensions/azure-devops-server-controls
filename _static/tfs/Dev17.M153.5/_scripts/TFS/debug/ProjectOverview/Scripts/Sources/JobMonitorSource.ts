import * as Q from "q";
import { Operation, OperationStatus } from "VSS/Operations/Contracts";
import { OperationsHttpClient } from "VSS/Operations/RestClient";
import { ProjectCollection } from "Presentation/Scripts/TFS/TFS.OM.Common";
import * as ProjectOverviewResources from "ProjectOverview/Scripts/Resources/TFS.Resources.ProjectOverview";

const JobStatusPollTimeout: number = 500;

export class JobMonitorSource {
    private _httpClient: OperationsHttpClient;

    /**
     * Polls for job result and executes SuccessCallback and FailureCallback on Job Success and Failure respectively
     * @param jobId - The id of the job to be polled
     */
    public pollJobResult(jobId: string): IPromise<void> {
        let deferred = Q.defer<void>();
        this._pollJobStatusToCompletion(jobId, deferred);
        return deferred.promise;
    }

    /**
     * Fetches the job status and monitors further if required, and resolve/rejects the deferredJobResult once we get the job result
     * @param jobId - The id of the job to be polled
     * @param deferredJobResult - Deferred object to resolve/reject
     */
    private _pollJobStatusToCompletion(jobId: string, deferredJobResult: Q.Deferred<void>): void {
        this._getHttpClient().getOperation(jobId).then(
            (data) => {
                this._handleOperationStatus(data, deferredJobResult, jobId);
            },
            deferredJobResult.reject
        );
    }

    /**
     * Resolves the deferredJobResult based on the job status received.
     * @param data - Operation data which has job status
     * @param deferredJobResult - Deferred object to resolve/reject
     * @param jobId - The id of the job to be polled
     */
    private _handleOperationStatus(
        data: Operation,
        deferredJobResult: Q.Deferred<void>,
        jobId: string
    ): void {
        switch (data.status) {
            case OperationStatus.NotSet:
            case OperationStatus.Queued:
            case OperationStatus.InProgress:
                this._checkStatusAfterTimeOut(jobId, deferredJobResult);
                break;

            case OperationStatus.Succeeded:
                deferredJobResult.resolve(undefined);
                break;

            case OperationStatus.Failed:
                deferredJobResult.reject(new Error(ProjectOverviewResources.JobMonitor_JobFailed));
                break;

            case OperationStatus.Cancelled:
                deferredJobResult.reject(new Error(ProjectOverviewResources.JobMonitor_JobCancelled));
                break;

            default:
                break;
        }
    }

    /**
     * Added this function to stub setTimeOut for tests.
     * @param jobId - The id of the job to be polled
     * @param deferredJobResult - Deferred object to resolve/reject
     */
    private _checkStatusAfterTimeOut(jobId: string, deferredJobResult: Q.Deferred<void>): void {
        setTimeout(() => { this._pollJobStatusToCompletion(jobId, deferredJobResult) }, JobStatusPollTimeout);
    }

    /**
     * Lazy load function for initializing _httpClient
     * @returns OperatinsHttpClient
     */
    private _getHttpClient(): OperationsHttpClient {
        if (!this._httpClient) {
            this._httpClient = ProjectCollection.getConnection().getHttpClient<OperationsHttpClient>(OperationsHttpClient);
        }
        return this._httpClient;
    }
}