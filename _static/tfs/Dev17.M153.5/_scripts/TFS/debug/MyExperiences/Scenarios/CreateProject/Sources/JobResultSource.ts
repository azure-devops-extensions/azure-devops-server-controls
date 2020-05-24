import * as Q from "q";
import * as Utils_Core from "VSS/Utils/Core";
import * as VSS_Error from "VSS/Error";
import * as VSS_Locations from "VSS/Locations";
import * as TFS_Core_Ajax from "Presentation/Scripts/TFS/TFS.Legacy.Ajax";
import { INewProjectParameters } from "MyExperiences/Scenarios/CreateProject/Contracts";

export interface IJobResult {
    isJobResultSuccess: boolean;
    resultMessage?: string;
}

export interface IJobStatus {
    State: number;
    ResultMessage?: string;
}

export class JobResultSource {

    public jobStatusPollTimeout: number = 2000;

    /**
     * Polls for job result and executes SuccessCallback and FailureCallback on Job Success and Failure respectively
     * @param jobId - The id of the job to be polled
     */
    public pollJobResult(
        jobId: string): IPromise<IJobResult> {

        var deferred = Q.defer<IJobResult>();
        this._pollJobStatusToCompletion(jobId, deferred);
        return deferred.promise;
    }

    /**
     * Fetches the job status and monitors further if required, and resolve/rejects the deferredJobResult once we get the job result
     * @param jobId - The id of the job to be polled
     * @param deferredJobResult - Deferred object to resolve/reject
     */
    private _pollJobStatusToCompletion(
        jobId: string,
        deferredJobResult: Q.Deferred<IJobResult>): void {

        let mvcOptions: VSS_Locations.MvcRouteOptions = {
            area: "api",
            controller: "job",
            action: "MonitorJobProgress"
        }
        let url: string = VSS_Locations.urlHelper.getMvcUrl(mvcOptions);

        TFS_Core_Ajax.getMSJSON(
            url,
            {
                jobId: jobId
            },
            (data: IJobStatus) => {
                // Polling the job status succeeded
                switch (data.State) {
                    case 0: // NotStarted
                    case 1: // InProgress
                        setTimeout(() => { this._pollJobStatusToCompletion(jobId, deferredJobResult) }, this.jobStatusPollTimeout);
                        break;
                    case 2: // Complete
                        deferredJobResult.resolve({
                            isJobResultSuccess: true,
                        });
                        break;
                    case 3: // Failed
                        deferredJobResult.resolve({
                            isJobResultSuccess: false,
                            resultMessage: data.ResultMessage
                        });
                        break;
                    default:
                        break;
                }
            },
            (error: any) => {
                VSS_Error.publishErrorToTelemetry(
                    {
                        name: "MyExperiences.JobResultSource.PollJobResult.Failed",
                        message: error.message
                    } as TfsError);

                // Polling the job status failed
                deferredJobResult.reject(error);
            }
        );
    }
}