import * as VCContracts from "TFS/VersionControl/Contracts";
import * as VSS_Events from "VSS/Events/Services";
import * as VSS from "VSS/VSS";

import { ActionsHub, IImportStatusUpdatedPayload } from "VersionControl/Scenarios/Import/ImportStatus/ActionsHub";
import { ImportSource } from "VersionControl/Scenarios/Import/ImportStatus/ImportSource";

const PollingIntervalInMS = 10000;
const CompletedStatusStayTimeInMs = 10000;

export class ActionCreator {
    private importSource: ImportSource;

    constructor(
        projectInfoId: string,
        repositoryId: string,
        private operationId: number,
        private actionsHub: ActionsHub) {

        this.importSource = new ImportSource(projectInfoId, repositoryId, this.operationId);
    }

    public startGitImportPolling() {
        setInterval(() => {
            this.updateImportStatus();
        }, PollingIntervalInMS);
    }

    public retryImportOperation() {
        this.actionsHub.patchRequestStarted.invoke({});

        this.importSource.retryImport().then(
            (createdRequest: VCContracts.GitImportRequest) => {
                this.actionsHub.importStatusUpdated.invoke({
                    statusDetail: createdRequest.detailedStatus,
                    status: createdRequest.status
                } as IImportStatusUpdatedPayload);
            },
            (error: Error) => {
                /* This will happen when import operation failed 
                and user clicked on Retry present on the import operation status view (which should show the import failed view)
                and then the AJAX request for patch on import operation also fails
                Experience: User will see an error on the screen and will have to refresh after which he will land in the initial state
                Telemetry: As patch is a request to TSF service if there is a failure we will get it in activity log*/
                VSS.handleError(error);
            });
    }

    public cancelImportOperation() {
        this.actionsHub.patchRequestStarted.invoke({});

        this.importSource.cancelImport().then(
            (createdRequest: VCContracts.GitImportRequest) => {
                // nothing to do except page reload as request is cancelled
                this._refreshPage();
            },
            (error: Error) => {
                /* This will happen when import operation failed 
                and user clicked on Cancel present on the import operation status view (which should show the import failed view)
                and then the AJAX request for patch on import operation also fails
                Experience: User will see an error on the screen and will have to refresh after which he will land in the initial state
                Telemetry: As patch is a request to TSF service if there is a failure we will get it in activity log*/
                VSS.handleError(error);
            });
    }

    private updateImportStatus(): void {
        this.importSource.getImport().then(
            (importRequest: VCContracts.GitImportRequest) => {
                this.actionsHub.importStatusUpdated.invoke({
                    statusDetail: importRequest.detailedStatus,
                    status: importRequest.status
                } as IImportStatusUpdatedPayload);

                if (importRequest.status === VCContracts.GitAsyncOperationStatus.Completed) {
                    this._refreshPageAfterInterval(CompletedStatusStayTimeInMs);
                }
            }
        );
    }

    private _refreshPageAfterInterval(delayInMs: number) {
        setTimeout(() => {
            this._refreshPage();
        }, delayInMs);
    }

    private _refreshPage() {
        window.location.reload();
    }
}