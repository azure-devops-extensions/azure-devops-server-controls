import { Action } from "VSS/Flux/Action";
import { GitImportStatusDetail, GitAsyncOperationStatus } from "TFS/VersionControl/Contracts";

export class ActionsHub {
    public importStatusUpdated = new Action<IImportStatusUpdatedPayload>();
    public patchRequestStarted = new Action();
}

export interface IImportStatusUpdatedPayload {
    statusDetail: GitImportStatusDetail;
    status: GitAsyncOperationStatus;
};