import { ActionsHub, IImportStatusUpdatedPayload } from "VersionControl/Scenarios/Import/ImportStatus/ActionsHub";
import { GitImportStatusDetail } from "TFS/VersionControl/Contracts";

import * as VSSStore from  "VSS/Flux/Store";

export interface IState {
    importStatus: IImportStatusUpdatedPayload;
    isPatchRequestInProgress: boolean;
}

export class Store extends VSSStore.Store {

    private state = {} as IState;

    public getState(): IState {
        return this.state;
    }

    constructor(actionsHub: ActionsHub, initialStatus: IImportStatusUpdatedPayload) {
        super();
        actionsHub.importStatusUpdated.addListener((importStatusUpdatedPayload) => {
            this.updateImportStatus(importStatusUpdatedPayload);
        });
        actionsHub.patchRequestStarted.addListener(() => {
            this.setPatchRequestInProgress();
        });

        this.state.importStatus = initialStatus;
        this.state.isPatchRequestInProgress = false;
    }

    private updateImportStatus(importStatus: IImportStatusUpdatedPayload) {
        this.state.importStatus.status = importStatus.status;
        this.state.importStatus.statusDetail = importStatus.statusDetail;
        this.state.isPatchRequestInProgress = false;
        this.emitChanged();
    }

    private setPatchRequestInProgress() {
        this.state.isPatchRequestInProgress = true;
        this.emitChanged();
    }
}
